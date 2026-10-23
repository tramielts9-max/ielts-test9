/**
 * diagnostic/js-diag/diag-reading.js
 * BỘ ĐIỀU KHIỂN READING KHẢO THÍ ĐA NĂNG DÙNG CHUNG CHO MỌI PHIÊN BẢN (TEST 1, 2, 3)
 * BẢN FULL ĐẦY ĐỦ 100% - HỖ TRỢ TWO-TIER CHỐNG ĐOÁN MÒ, Ô GÕ GIẢI THÍCH CAM 21,
 * ĐO PHẢN XẠ TTFI/HESITATION, CHẾ ĐỘ XEM LẠI REVIEW MODE & AUTO-SAVE
 */

export class DiagReadingEngine {
  constructor(options = {}) {
    this.containerId = options.containerId || 'readingQuestionsMount';
    this.onStateChange = options.onStateChange || null;

    this.testMeta = {};
    this.questions = [];
    this.passageText = "";

    // Dữ liệu làm bài của học sinh
    // { qId: { t1Val: "", t2Val: "", explanationText: "" } }
    this.userAnswers = {};

    // Bộ đo phản xạ Telemetry Metrics
    // { qId: { renderTime, firstInteractionTime, hesitationCount, interactionHistory: [] } }
    this.metrics = {};

    this.isReviewMode = false;
  }

  // =========================================================================
  // 1. NẠP DỮ LIỆU ĐỀ THI TỪ BẤT KỲ FILE JSON NÀO
  // =========================================================================
  async loadTestFromJson(jsonUrl) {
    try {
      const res = await fetch(jsonUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}: Không thể tải file ${jsonUrl}`);
      const data = await res.json();

      this.testMeta = {
        testId: data.testId || "unknown_test",
        version: data.version || 1,
        title: data.title || "Reading Diagnostic",
        formatType: data.formatType || "TWO_TIER", // 'TWO_TIER' | 'CAM_STANDARD'
        passageTitle: data.passageTitle || "",
        totalQuestions: data.questions ? data.questions.length : 0
      };

      this.passageText = data.passageText || "";
      this.questions = data.questions || [];
      this.userAnswers = {};
      this.metrics = {};

      return true;
    } catch (err) {
      console.error("[DiagReadingEngine] Lỗi nạp dữ liệu đề thi:", err);
      const mount = document.getElementById(this.containerId);
      if (mount) {
        mount.innerHTML = `<div style="text-align:center; padding:30px; color:#DC2626; font-weight:800;">
          ⚠️ Không thể tải dữ liệu bài đọc (${err.message}). Vui lòng kiểm tra lại đường dẫn file JSON!
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

    const isTwoTier = this.testMeta.formatType === "TWO_TIER";
    const now = Date.now();

    let html = '';

    // Nếu là bài thi Cam 21 (có bài đọc dài passageText) thì render khung bài đọc trước
    if (this.passageText) {
      html += `
        <div class="reading-passage-box" style="background:#FFFFFF; border:2px solid #E8E2D8; border-left:6px solid #8B1518; border-radius:18px; padding:22px 24px; margin-bottom:24px; max-height:420px; overflow-y:auto; line-height:1.7; font-size:14.5px; color:#1E293B; box-shadow:0 4px 14px rgba(0,0,0,0.03);">
          <h3 style="margin:0 0 12px 0; color:#8B1518; font-size:18px; font-weight:900;">
            📖 ${this.testMeta.passageTitle || 'READING PASSAGE'}
          </h3>
          <div style="white-space:pre-wrap;">${this.passageText}</div>
        </div>
      `;
    }

    // Render danh sách câu hỏi
    this.questions.forEach((q, idx) => {
      this.initQuestionMetric(q.id, now);

      if (isTwoTier) {
        html += this.renderTwoTierQuestionCard(q, idx);
      } else {
        html += this.renderStandardCamQuestionCard(q, idx);
      }
    });

    mount.innerHTML = html;
    this.restoreUserInputsUI();
  }

  // A. Render thẻ câu hỏi Two-Tier (Dành cho Test 1)
  renderTwoTierQuestionCard(q, idx) {
    const snippetHtml = q.passageSnippet ? `
      <div style="background:#FFFFFF; border:1px solid #CBD5E1; border-left:4px solid #8B1518; padding:12px 14px; border-radius:10px; font-size:13.5px; line-height:1.6; color:#334155; margin-bottom:12px; font-style:italic;">
        ${q.passageSnippet}
      </div>
    ` : '';

    return `
      <div class="q-item-box" id="box_${q.id}" style="background:#FAF7F2; border:2px solid #E8E2D8; border-radius:18px; padding:20px; margin-bottom:18px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <span style="font-size:12px; font-weight:900; color:#8B1518; text-transform:uppercase;">
            CÂU ${idx + 1} (${q.level || 'A2'}) — ${q.type || 'Xác thực thông tin'}
          </span>
          <span id="badge_status_${q.id}" style="display:none; font-size:11.5px; font-weight:800; padding:2px 8px; border-radius:6px;"></span>
        </div>

        ${snippetHtml}

        <b style="font-size:15px; color:#1E293B; display:block; margin-bottom:10px; line-height:1.45;">
          ${q.statement || q.questionText}
        </b>

        <!-- TẦNG 1: LỰA CHỌN CỦA HỌC SINH -->
        <div style="font-size:12px; font-weight:900; color:#0284C7; margin-bottom:4px; text-transform:uppercase; letter-spacing:0.3px;">
          Tầng 1: Lựa chọn của em
        </div>
        <div style="display:flex; gap:10px; flex-wrap:wrap;">
          ${(q.tier1Options || []).map(opt => {
            const optLetter = opt.charAt(0);
            return `
              <label class="option-label" style="flex:1; min-width:140px; background:#FFFFFF; border:1.5px solid #CBD5E1; border-radius:10px; padding:10px 14px; cursor:pointer; font-weight:700; font-size:13.5px;" onclick="window.diagReadingEngine.onSelectTier1('${q.id}', '${optLetter}')">
                <input type="radio" name="t1_${q.id}" value="${optLetter}" style="margin-right:6px;">
                <span>${opt}</span>
              </label>
            `;
          }).join('')}
        </div>

        <!-- TẦNG 2: BẬT RA ĐỦ 4 LỰA CHỌN CĂN CỨ TƯƠNG ỨNG -->
        <div id="tier2_box_${q.id}" class="tier-2-box" style="display:none; margin-top:14px; padding:14px 16px; background:#FFFBEB; border:2px dashed #F59E0B; border-radius:14px;">
          <div style="font-size:12px; font-weight:900; color:#92400E; margin-bottom:8px; text-transform:uppercase;">
            🔍 Tầng 2: Chọn câu trích dẫn chứng minh cho lựa chọn của em:
          </div>
          <div id="tier2_options_${q.id}" style="display:flex; flex-direction:column; gap:6px;"></div>
        </div>

        <!-- KHUNG KẾT QUẢ KHI XEM LẠI (REVIEW MODE) -->
        <div id="review_feedback_${q.id}" style="display:none; margin-top:12px; padding:10px 14px; border-radius:10px; font-size:13px; line-height:1.5;"></div>
      </div>
    `;
  }

  // B. Render thẻ câu hỏi chuẩn Cam 21 (Dành cho Test 2 & Test 3)
  renderStandardCamQuestionCard(q, idx) {
    let optionsHtml = '';

    if (q.options && Array.isArray(q.options)) {
      // Dạng trắc nghiệm Multiple Choice / Summary Box
      optionsHtml = `
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:8px; margin-top:8px;">
          ${q.options.map(opt => {
            const letter = opt.charAt(0);
            return `
              <label class="option-label" style="background:#FFFFFF; border:1.5px solid #CBD5E1; border-radius:10px; padding:10px 12px; cursor:pointer; font-weight:700; font-size:13.5px;" onclick="window.diagReadingEngine.onSelectCamChoice('${q.id}', '${letter}')">
                <input type="radio" name="cam_${q.id}" value="${letter}" style="margin-right:6px;">
                <span>${opt}</span>
              </label>
            `;
          }).join('')}
        </div>
      `;
    } else {
      // Dạng điền từ tự luận
      optionsHtml = `
        <div style="margin-top:8px;">
          <input type="text" id="cam_input_${q.id}" class="diag-input" placeholder="Gõ câu trả lời của em tại đây..." oninput="window.diagReadingEngine.onInputCamText('${q.id}', this.value)" style="width:100%; padding:10px 14px; border:2px solid #CBD5E1; border-radius:10px; font-family:inherit; font-weight:700;">
        </div>
      `;
    }

    return `
      <div class="q-item-box" id="box_${q.id}" style="background:#FAF7F2; border:2px solid #E8E2D8; border-radius:18px; padding:20px; margin-bottom:18px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
          <span style="font-size:12px; font-weight:900; color:#8B1518; text-transform:uppercase;">
            CÂU ${idx + 1}: ${q.type || 'Cambridge Question'}
          </span>
          <span style="font-size:11px; background:#E2E8F0; padding:2px 8px; border-radius:6px; font-weight:800; color:#475569;">
            ${q.group || 'Mid-tier'}
          </span>
        </div>

        <b style="font-size:15px; color:#1E293B; display:block; margin-bottom:8px; line-height:1.45;">
          ${q.questionText}
        </b>

        ${optionsHtml}

        <!-- Ô BẮT BUỘC TỰ GÕ CÂU TRÍCH DẪN / GIẢI THÍCH NGẮN (ĐỂ AI CHẤM RUBRIC) -->
        <div style="margin-top:14px; padding-top:12px; border-top:1px dashed #CBD5E1;">
          <label style="font-size:12.5px; font-weight:800; color:#92400E; display:block; margin-bottom:4px;">
            ✍️ Câu trích dẫn bằng chứng trong bài hoặc lý do em chọn đáp án này (Bắt buộc để AI chấm):
          </label>
          <input type="text" id="cam_explain_${q.id}" class="diag-input" placeholder="Ví dụ: Ở đoạn 2 có câu '...' / Dựa vào từ khóa..." oninput="window.diagReadingEngine.onInputCamExplanation('${q.id}', this.value)" style="width:100%; padding:8px 12px; border:1.5px solid #FCD34D; background:#FFFDF5; border-radius:8px; font-family:inherit; font-size:13px; font-weight:600;">
        </div>

        <div id="review_feedback_${q.id}" style="display:none; margin-top:12px; padding:10px 14px; border-radius:10px; font-size:13px; line-height:1.5;"></div>
      </div>
    `;
  }

  // =========================================================================
  // 3. TƯƠNG TÁC NGƯỜI DÙNG & GHI NHẬN CHỈ SỐ PHẢN XẠ (TELEMETRY METRICS)
  // =========================================================================
  initQuestionMetric(qId, timestamp) {
    if (!this.metrics[qId]) {
      this.metrics[qId] = {
        renderTime: timestamp,
        firstInteractionTime: null,
        ttfiMs: null,
        hesitationCount: 0,
        interactionHistory: []
      };
    }
  }

  recordAction(qId, actionType, value) {
    if (this.isReviewMode) return;
    const m = this.metrics[qId];
    if (!m) return;

    const now = Date.now();
    if (!m.firstInteractionTime) {
      m.firstInteractionTime = now;
      m.ttfiMs = now - m.renderTime; // Độ trễ phản xạ TTFI tính bằng mili-giây
    }

    if (m.interactionHistory.length > 0) {
      const last = m.interactionHistory[m.interactionHistory.length - 1];
      if (last.actionType === actionType && last.value !== value) {
        m.hesitationCount++; // Đổi lựa chọn -> tăng chỉ số đắn đo
      }
    }

    m.interactionHistory.push({ actionType, value, time: now });
    this.triggerStateChange();
  }

  // Xử lý khi chọn Tầng 1 (Two-tier)
  onSelectTier1(qId, selectedLetter) {
    if (!this.userAnswers[qId]) this.userAnswers[qId] = {};
    this.userAnswers[qId].t1Val = selectedLetter;
    this.recordAction(qId, "select_tier1", selectedLetter);

    const q = this.questions.find(item => item.id === qId);
    if (!q || !q.tier2Options) return;

    const tier2Container = document.getElementById(`tier2_box_${qId}`);
    const tier2Mount = document.getElementById(`tier2_options_${qId}`);
    if (!tier2Container || !tier2Mount) return;

    // LẤY ĐỦ 4 LỰA CHỌN CĂN CỨ TƯƠNG ỨNG VỚI PHƯƠNG ÁN ĐÃ CHỌN (A1..A4 hoặc B1..B4...)
    const optionsForThisChoice = q.tier2Options[selectedLetter] || [];

    tier2Mount.innerHTML = optionsForThisChoice.map(opt => `
      <label class="option-label" style="background:#FFFFFF; border:1.5px solid #FCD34D; border-radius:10px; padding:8px 12px; cursor:pointer; font-weight:700; font-size:13px;" onclick="window.diagReadingEngine.onSelectTier2('${qId}', '${opt.code}')">
        <input type="radio" name="t2_${qId}" value="${opt.code}" style="margin-right:6px;">
        <span style="color:#1E293B; line-height:1.45;">${opt.text}</span>
      </label>
    `).join('');

    tier2Container.style.display = 'block';

    // Nếu trước đó đã chọn căn cứ thì khôi phục lại
    if (this.userAnswers[qId].t2Val && this.userAnswers[qId].t2Val.startsWith(selectedLetter)) {
      const r = tier2Mount.querySelector(`input[value="${this.userAnswers[qId].t2Val}"]`);
      if (r) r.checked = true;
    }
  }

  // Xử lý khi chọn Tầng 2 (Two-tier)
  onSelectTier2(qId, selectedCode) {
    if (!this.userAnswers[qId]) this.userAnswers[qId] = {};
    this.userAnswers[qId].t2Val = selectedCode;
    this.recordAction(qId, "select_tier2", selectedCode);
  }

  // Xử lý đề Cam 21
  onSelectCamChoice(qId, selectedLetter) {
    if (!this.userAnswers[qId]) this.userAnswers[qId] = {};
    this.userAnswers[qId].t1Val = selectedLetter;
    this.recordAction(qId, "select_cam_choice", selectedLetter);
  }

  onInputCamText(qId, text) {
    if (!this.userAnswers[qId]) this.userAnswers[qId] = {};
    this.userAnswers[qId].t1Val = text.trim();
    this.recordAction(qId, "input_cam_text", text);
  }

  onInputCamExplanation(qId, text) {
    if (!this.userAnswers[qId]) this.userAnswers[qId] = {};
    this.userAnswers[qId].explanationText = text.trim();
    this.recordAction(qId, "input_cam_explanation", text);
  }

  triggerStateChange() {
    if (typeof this.onStateChange === 'function') {
      this.onStateChange(this.getSnapshot());
    }
  }

  // =========================================================================
  // 4. CHẤM ĐIỂM TOÀN DIỆN & PHÂN TÍCH HÀNH VI (SCORING LOGIC)
  // =========================================================================
  evaluate() {
    const isTwoTier = this.testMeta.formatType === "TWO_TIER";
    let score = 0;
    const total = this.questions.length;
    const details = [];

    let totalTTFI = 0;
    let totalHesitation = 0;
    let metricCount = 0;

    let guessingCount = 0; // Đếm số câu đoán mò (T1 đúng nhưng T2 sai)
    let matchingTrapCount = 0; // Dính bẫy từ khóa

    this.questions.forEach((q, idx) => {
      const userAns = this.userAnswers[q.id] || {};
      const m = this.metrics[q.id] || {};

      if (m.ttfiMs) {
        totalTTFI += m.ttfiMs;
        totalHesitation += m.hesitationCount || 0;
        metricCount++;
      }

      if (isTwoTier) {
        // CƠ CHẾ CHẤM TWO-TIER ALL-OR-NOTHING
        const t1Chosen = (userAns.t1Val || "").toUpperCase().trim();
        const t2Chosen = (userAns.t2Val || "").toUpperCase().trim();

        const isT1Correct = t1Chosen === (q.correctTier1 || "").toUpperCase().trim();
        const isT2Correct = t2Chosen === (q.correctTier2 || "").toUpperCase().trim();

        let behaviorTag = "Sai đáp án";
        let isFullCorrect = false;

        if (isT1Correct && isT2Correct) {
          isFullCorrect = true;
          behaviorTag = "Hiểu bản chất";
          score++;
        } else if (isT1Correct && !isT2Correct) {
          behaviorTag = "Đoán mò / Hiểu sai căn cứ";
          guessingCount++;
        } else if (!isT1Correct && t2Chosen) {
          behaviorTag = "Dính bẫy Matching Trap";
          matchingTrapCount++;
        }

        details.push({
          questionNum: idx + 1,
          questionId: q.id,
          level: q.level || "N/A",
          type: q.type || "Two-Tier",
          userTier1: t1Chosen || "Trống",
          userTier2: t2Chosen || "Trống",
          expectedTier1: q.correctTier1,
          expectedTier2: q.correctTier2,
          isCorrect: isFullCorrect,
          behaviorTag: behaviorTag,
          hesitationCount: m.hesitationCount || 0,
          ttfiSec: m.ttfiMs ? (m.ttfiMs / 1000).toFixed(1) : "N/A"
        });

      } else {
        // CƠ CHẾ CHẤM CAMBRIDGE CHUẨN
        const chosen = (userAns.t1Val || "").toUpperCase().trim();
        const expected = String(q.correctAnswer || "").toUpperCase().trim();
        const isCorrect = chosen === expected;
        if (isCorrect) score++;

        details.push({
          questionNum: idx + 1,
          questionId: q.id,
          type: q.type || "Cam Standard",
          userAnswer: chosen || "Trống",
          expectedAnswer: expected,
          userExplanation: userAns.explanationText || "",
          isCorrect: isCorrect,
          hesitationCount: m.hesitationCount || 0,
          ttfiSec: m.ttfiMs ? (m.ttfiMs / 1000).toFixed(1) : "N/A"
        });
      }
    });

    const avgTTFISec = metricCount > 0 ? ((totalTTFI / metricCount) / 1000).toFixed(1) : 8.0;

    return {
      testId: this.testMeta.testId,
      title: this.testMeta.title,
      score: score,
      total: total,
      scorePercent: Math.round((score / (total || 1)) * 100),
      avgTTFISec: parseFloat(avgTTFISec),
      totalHesitation: totalHesitation,
      guessingCount: guessingCount,
      matchingTrapCount: matchingTrapCount,
      details: details,
      answersSnapshot: this.userAnswers
    };
  }

  // =========================================================================
  // 5. HIỂN THỊ CHẾ ĐỘ XEM LẠI CHI TIẾT (REVIEW MODE ĐÚNG/SAI TÔ MÀU)
  // =========================================================================
  renderReviewMode(evalResult) {
    this.isReviewMode = true;
    const isTwoTier = this.testMeta.formatType === "TWO_TIER";

    (evalResult.details || []).forEach(d => {
      const box = document.getElementById(`box_${d.questionId}`);
      const fbBox = document.getElementById(`review_feedback_${d.questionId}`);
      const badge = document.getElementById(`badge_status_${d.questionId}`);

      if (box) {
        box.style.borderWidth = '2px';
        box.style.borderColor = d.isCorrect ? '#22C55E' : '#EF4444';
        box.style.background = d.isCorrect ? '#F0FDF4' : '#FEF2F2';
      }

      if (badge) {
        badge.style.display = 'inline-block';
        badge.style.background = d.isCorrect ? '#DCFCE7' : '#FEE2E2';
        badge.style.color = d.isCorrect ? '#166534' : '#991B1B';
        badge.innerText = d.isCorrect ? '✓ ĐÚNG' : '✗ SAI';
      }

      if (fbBox) {
        fbBox.style.display = 'block';
        if (isTwoTier) {
          fbBox.style.background = d.isCorrect ? '#DCFCE7' : '#FEE2E2';
          fbBox.style.border = `1.5px solid ${d.isCorrect ? '#86EFAC' : '#FCA5A5'}`;
          fbBox.style.color = d.isCorrect ? '#166534' : '#991B1B';

          fbBox.innerHTML = `
            <div><b>Kết quả:</b> ${d.isCorrect ? 'ĐÚNG TRỌN VẸN 2 TẦNG' : 'CHƯA ĐẠT CHUẨN'} (${d.behaviorTag})</div>
            <div style="font-size:12.5px; margin-top:3px;">
              • Tầng 1: Em chọn <b>${d.userTier1}</b> (Chuẩn: <b>${d.expectedTier1}</b>)<br>
              • Tầng 2: Em chọn <b>${d.userTier2}</b> (Căn cứ đúng: <b>${d.expectedTier2}</b>)<br>
              • Độ trễ phản xạ: <b>${d.ttfiSec}s</b> • Đổi đáp án: <b>${d.hesitationCount} lần</b>
            </div>
          `;
        } else {
          fbBox.style.background = d.isCorrect ? '#DCFCE7' : '#FEE2E2';
          fbBox.style.border = `1.5px solid ${d.isCorrect ? '#86EFAC' : '#FCA5A5'}`;
          fbBox.style.color = d.isCorrect ? '#166534' : '#991B1B';

          fbBox.innerHTML = `
            <div><b>Đáp án của em:</b> <b>${d.userAnswer}</b> (Đáp án chuẩn: <b>${d.expectedAnswer}</b>)</div>
            ${d.userExplanation ? `<div style="font-size:12.5px; margin-top:3px;"><i>Căn cứ em ghi:</i> "${d.userExplanation}"</div>` : ''}
          `;
        }
      }

      // Vô hiệu hóa chỉnh sửa
      const inputs = box?.querySelectorAll('input');
      inputs?.forEach(inp => inp.disabled = true);
    });
  }

  // Khôi phục lựa chọn vào form
  restoreUserInputsUI() {
    Object.entries(this.userAnswers).forEach(([qId, ans]) => {
      if (ans.t1Val) {
        const r1 = document.querySelector(`input[name="t1_${qId}"][value="${ans.t1Val}"]`) ||
                   document.querySelector(`input[name="cam_${qId}"][value="${ans.t1Val}"]`);
        if (r1) {
          r1.checked = true;
          if (this.testMeta.formatType === "TWO_TIER") {
            this.onSelectTier1(qId, ans.t1Val);
          }
        }
        const textInp = document.getElementById(`cam_input_${qId}`);
        if (textInp) textInp.value = ans.t1Val;
      }

      if (ans.t2Val) {
        const r2 = document.querySelector(`input[name="t2_${qId}"][value="${ans.t2Val}"]`);
        if (r2) r2.checked = true;
      }

      if (ans.explanationText) {
        const expInp = document.getElementById(`cam_explain_${qId}`);
        if (expInp) expInp.value = ans.explanationText;
      }
    });
  }

  getSnapshot() {
    return {
      testMeta: this.testMeta,
      userAnswers: this.userAnswers,
      metrics: this.metrics
    };
  }

  restoreSnapshot(snapshot) {
    if (!snapshot) return;
    this.userAnswers = snapshot.userAnswers || {};
    this.metrics = snapshot.metrics || {};
    this.restoreUserInputsUI();
  }
}

// Khởi tạo và gắn biến toàn cục
export const diagReadingEngine = new DiagReadingEngine();
window.diagReadingEngine = diagReadingEngine;
