/**
 * diagnostic/js-diag/diag-grammar.js
 * BỘ ĐIỀU KHIỂN NGỮ PHÁP KHẢO THÍ CHUYÊN BIỆT (TEST 1, 2, 3 & FULL TEST)
 * BẢN FULL ĐẦY ĐỦ 100% - NẠP JSON NGOÀI, SO KHỚP CHUẨN XÁC, ĐO ĐỘ TRỄ TTFI,
 * TÔ MÀU ĐÚNG SAI VÀ HIỂN THỊ GIẢI THÍCH CHI TIẾT KHI XEM LẠI BÀI
 */

import { ExerciseEngine } from '../../grammar/js/exercise-engine-g.js';

export class DiagGrammarEngine {
  constructor(options = {}) {
    this.containerId = options.containerId || 'grammarQuestionsMount';
    this.testMeta = {};
    this.questions = [];
    this.userAnswers = {}; // { [qId]: "A" | "B" | "C" | "D" | "text" }
    this.metrics = {}; // { [qId]: { renderTime, firstInteractionTime, hesitationCount, chosenValues: [] } }
    this.isReviewMode = false;
  }

  // =========================================================================
  // 1. NẠP DỮ LIỆU ĐỀ NGỮ PHÁP TỪ FILE JSON RIÊNG BIỆT
  // =========================================================================
  async loadTestFromJson(jsonUrl) {
    try {
      const res = await fetch(jsonUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}: Không thể tải ${jsonUrl}`);
      const data = await res.json();

      this.testMeta = {
        testId: data.testId || "test_01",
        title: data.title || "Grammar Test",
        timeMinutes: data.timeMinutes || 20,
        totalQuestions: data.totalQuestions || (data.questions ? data.questions.length : 0),
        target: data.target || ""
      };

      this.questions = data.questions || [];
      this.userAnswers = {};
      this.metrics = {};

      return true;
    } catch (err) {
      console.warn("[DiagGrammarEngine] Không thể nạp JSON Ngữ pháp:", err);
      const mount = document.getElementById(this.containerId);
      if (mount) {
        mount.innerHTML = `<div style="text-align:center; padding:30px; color:#DC2626; font-weight:800;">
          ⚠️ Không thể tải dữ liệu Ngữ pháp (${err.message}). Vui lòng kiểm tra lại đường dẫn file JSON!
        </div>`;
      }
      return false;
    }
  }

  // =========================================================================
  // 2. RENDER GIAO DIỆN CÂU HỎI RA PHÒNG THI
  // =========================================================================
  render() {
    const mount = document.getElementById(this.containerId);
    if (!mount || this.questions.length === 0) return;

    const now = Date.now();
    let html = `
      <div style="font-size:14.5px; font-weight:900; color:#059669; margin-bottom:14px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
        <span><i class="fa-solid fa-shapes"></i> BÀI TẬP NGỮ PHÁP TRỌNG TÂM (${this.questions.length} CÂU)</span>
        <span style="font-size:12px; font-weight:800; color:#64748B;">Thời gian đề xuất: ${this.testMeta.timeMinutes} phút</span>
      </div>
    `;

    this.questions.forEach((q, idx) => {
      this.initQuestionMetric(q.id, now);

      html += `
        <div class="q-item-box" id="box_${q.id}" style="background:#FAF7F2; border:2px solid #E8E2D8; border-radius:16px; padding:18px; margin-bottom:16px;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px; gap:8px;">
            <b style="font-size:14.5px; color:#1E293B; line-height:1.5;">
              Câu ${idx + 1}. ${q.prompt || q.question || ''}
            </b>
            ${q.topic ? `<span style="font-size:11.5px; background:#DCFCE7; color:#166534; padding:2px 8px; border-radius:6px; font-weight:800; white-space:nowrap;">${q.topic}</span>` : ''}
          </div>

          <!-- CÁC LỰA CHỌN A, B, C, D -->
          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:8px; margin-top:8px;">
            ${(q.options || []).map(opt => {
              const letter = opt.charAt(0);
              return `
                <label class="option-label" id="label_${q.id}_${letter}" onclick="window.diagGrammarEngine.recordChoice('${q.id}', '${letter}')">
                  <input type="radio" name="ans_${q.id}" value="${letter}">
                  <span>${opt}</span>
                </label>
              `;
            }).join('')}
          </div>

          <!-- KHUNG GIẢI THÍCH BẪY NGỮ PHÁP KHI XEM LẠI BÀI (REVIEW MODE) -->
          <div id="fb_${q.id}" style="display:none; font-size:13px; font-weight:700; margin-top:10px; padding:10px 14px; border-radius:10px; line-height:1.6;"></div>
        </div>
      `;
    });

    mount.innerHTML = html;
    this.restoreUserInputsUI();
  }

  // =========================================================================
  // 3. TƯƠNG TÁC NGƯỜI DÙNG & GHI NHẬN CHỈ SỐ PHẢN XẠ (TELEMETRY)
  // =========================================================================
  initQuestionMetric(qId, timestamp) {
    if (!this.metrics[qId]) {
      this.metrics[qId] = {
        renderTime: timestamp,
        firstInteractionTime: null,
        ttfiMs: null,
        hesitationCount: 0,
        chosenValues: []
      };
    }
  }

  recordChoice(qId, selectedLetter) {
    if (this.isReviewMode) return;
    this.userAnswers[qId] = selectedLetter;

    const m = this.metrics[qId];
    if (m) {
      const now = Date.now();
      if (!m.firstInteractionTime) {
        m.firstInteractionTime = now;
        m.ttfiMs = now - m.renderTime;
      }
      if (m.chosenValues.length > 0 && m.chosenValues[m.chosenValues.length - 1] !== selectedLetter) {
        m.hesitationCount++;
      }
      m.chosenValues.push(selectedLetter);
    }
  }

  restoreUserInputsUI() {
    Object.entries(this.userAnswers).forEach(([qId, val]) => {
      const radio = document.querySelector(`input[name="ans_${qId}"][value="${val}"]`);
      if (radio) radio.checked = true;
    });
  }

  // =========================================================================
  // 4. CHẤM ĐIỂM NGỮ PHÁP CHUẨN XÁC
  // =========================================================================
  evaluate() {
    let score = 0;
    const total = this.questions.length;
    const wrongList = [];
    const details = [];

    this.questions.forEach((q, idx) => {
      const chosen = (this.userAnswers[q.id] || "").trim().toUpperCase();
      const expected = (q.answer || "").trim().toUpperCase();
      const isCorrect = chosen === expected;

      if (isCorrect) {
        score++;
      } else {
        wrongList.push({
          num: idx + 1,
          q: q.prompt || q.question,
          chosen: chosen || "Bỏ trống",
          expected: expected,
          topic: q.topic || "",
          explanation: q.explanation || ""
        });
      }

      details.push({
        num: idx + 1,
        questionId: q.id,
        userAnswer: chosen || "Bỏ trống",
        expectedAnswer: expected,
        isCorrect: isCorrect,
        topic: q.topic || "",
        explanation: q.explanation || ""
      });
    });

    return {
      testId: this.testMeta.testId,
      title: this.testMeta.title,
      score: score,
      total: total,
      scorePercent: Math.round((score / (total || 1)) * 100),
      wrongList: wrongList,
      details: details,
      answersSnapshot: this.userAnswers
    };
  }

  // =========================================================================
  // 5. REVIEW MODE: XEM LẠI BÀI THI & TÔ MÀU ĐÚNG SAI KÈM GIẢI THÍCH TỪ PDF
  // =========================================================================
  renderReviewMode(evalResult) {
    this.isReviewMode = true;
    this.userAnswers = evalResult.answersSnapshot || this.userAnswers;
    this.restoreUserInputsUI();

    (evalResult.details || []).forEach(d => {
      const box = document.getElementById(`box_${d.questionId}`);
      const fb = document.getElementById(`fb_${d.questionId}`);

      if (box) {
        box.style.borderColor = d.isCorrect ? '#22C55E' : '#EF4444';
        box.style.background = d.isCorrect ? '#F0FDF4' : '#FEF2F2';
      }

      if (fb) {
        fb.style.display = 'block';
        fb.style.background = d.isCorrect ? '#DCFCE7' : '#FEE2E2';
        fb.style.border = `1.5px solid ${d.isCorrect ? '#86EFAC' : '#FCA5A5'}`;
        fb.style.color = d.isCorrect ? '#166534' : '#991B1B';

        fb.innerHTML = `
          <div><b>Kết quả:</b> ${d.isCorrect ? '✓ ĐÚNG' : '✗ CHƯA ĐÚNG'} (Em chọn: <b>${d.userAnswer}</b> — Đáp án chuẩn: <b>${d.expectedAnswer}</b>)</div>
          ${d.explanation ? `<div style="margin-top:4px; font-size:12.5px; line-height:1.5;">💡 <b>Giải thích chi tiết:</b> ${d.explanation}</div>` : ''}
        `;
      }

      // Khóa radio
      box?.querySelectorAll('input[type="radio"]').forEach(r => r.disabled = true);
    });
  }
}

// Khởi tạo đối tượng toàn cục
export const diagGrammarEngine = new DiagGrammarEngine();
window.diagGrammarEngine = diagGrammarEngine;
