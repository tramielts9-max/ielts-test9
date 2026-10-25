/**
 * diagnostic/js-diag/diag-listening.js
 * BỘ ĐIỀU KHIỂN LISTENING KHẢO THÍ CHUYÊN BIỆT (TEST 1, 2, 3)
 * BẢN FULL ĐẦY ĐỦ 100% - CHUYỂN PART TỰ ĐỘNG NHẢY GIÂY STARTTIME,
 * NÚT NGHE TỪNG CÂU, KÉO THẢ MATCHING, BẢN ĐỒ MAP LABELLING, ĐIỀN TỪ & REVIEW TRANSCRIPT
 */

export class DiagListeningEngine {
  constructor(options = {}) {
    this.containerId = options.containerId || 'listeningQuestionsMount';
    this.audioElementId = options.audioElementId || 'diagAudioPlayer';
    this.audioLabelId = options.audioLabelId || 'currentAudioLabel';

    this.testMeta = {};
    this.parts = [];
    this.audioUrl = "";
    this.activePartIndex = 0;

    // Bộ nhớ đáp án học sinh: { [qId]: "A" | "text" }
    this.userAnswers = {};

    // Bộ đo phản xạ Telemetry
    this.metrics = {};
    this.isReviewMode = false;
  }

  // =========================================================================
  // 1. NẠP DỮ LIỆU BÀI NGHE TỪ FILE JSON RIÊNG BIỆT
  // =========================================================================
  async loadTestFromJson(jsonUrl) {
    try {
      const res = await fetch(jsonUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}: Không thể tải ${jsonUrl}`);
      const data = await res.json();

      this.testMeta = {
        testId: data.testId || "unknown_test",
        set: data.set || 1,
        title: data.title || "Listening Diagnostic"
      };

      this.audioUrl = data.audioUrl || "";
      this.parts = data.parts || [];
      this.activePartIndex = 0;
      this.userAnswers = {};
      this.metrics = {};

      return true;
    } catch (err) {
      console.warn("[DiagListeningEngine] Không thể nạp JSON ngoài:", err);
      return false;
    }
  }

  // =========================================================================
  // 2. RENDER GIAO DIỆN BÀI THI LISTENING RA MÀN HÌNH
  // =========================================================================
  render() {
    const mount = document.getElementById(this.containerId);
    const audioEl = document.getElementById(this.audioElementId);
    if (!mount || this.parts.length === 0) return;

    // Gán file âm thanh chung vào Audio Player
    if (audioEl && this.audioUrl) {
      audioEl.src = this.audioUrl;
      audioEl.preload = "auto";
    }

    let html = `
      <!-- THANH SUB-TAB CHUYỂN PART VỚI MỐC THỜI GIAN STARTTIME -->
      <div style="display:flex; gap:10px; margin-bottom:18px; flex-wrap:wrap; align-items:center; background:#FFFFFF; border:2px solid #E8E2D8; border-radius:16px; padding:8px 12px;">
        <span style="font-size:12.5px; font-weight:900; color:#0369A1; text-transform:uppercase; margin-right:4px;">
          Chọn Phần Nghe:
        </span>
        ${this.parts.map((p, idx) => `
          <button type="button" 
                  id="btnPartTab_${idx}" 
                  class="btn-3d ${idx === this.activePartIndex ? 'btn-3d-blue' : 'btn-3d-white'}" 
                  style="padding:8px 16px; font-size:13px;"
                  onclick="window.diagListeningEngine.switchPart(${idx}, true)">
            Part ${p.partNum} (Từ ${this.formatSecondsToTime(p.startTime)})
          </button>
        `).join('')}
      </div>

      <!-- VÙNG RENDER NỘI DUNG CÂU HỎI CỦA PART HIỆN TẠI -->
      <div id="activePartContainer"></div>

      <!-- KHUNG BĂNG KÝ ÂM TRANSCRIPT (TỰ MỞ KHI XEM LẠI BÀI) -->
      <div id="listeningTranscriptContainer" style="display:none; margin-top:24px; background:#FFFFFF; border:2px solid #BAE6FD; border-left:6px solid #0284C7; border-radius:16px; padding:18px 22px; max-height:450px; overflow-y:auto; line-height:1.75; font-size:14px;">
        <h4 style="margin:0 0 10px 0; color:#0284C7; font-size:16px; font-weight:900;">
          📜 BĂNG KÝ ÂM TRANSCRIPT (BẤM VÀO TỪNG CÂU ĐỂ TUA AUDIO ĐẾN ĐÚNG ĐOẠN ĐÓ):
        </h4>
        <div id="transcriptLinesMount"></div>
      </div>
    `;

    mount.innerHTML = html;
    this.switchPart(this.activePartIndex, false);
  }

  // =========================================================================
  // 3. CHUYỂN PART & CƠ CHẾ NHẢY GIÂY AUDIO (SEEK TO STARTTIME)
  // =========================================================================
  switchPart(partIndex, shouldSeekAndPlay = true) {
    if (!this.parts[partIndex]) return;

    this.activePartIndex = partIndex;
    const part = this.parts[partIndex];

    // Cập nhật trạng thái Active trên nút Sub-tab
    this.parts.forEach((_, idx) => {
      const btn = document.getElementById(`btnPartTab_${idx}`);
      if (btn) {
        btn.className = `btn-3d ${idx === partIndex ? 'btn-3d-blue' : 'btn-3d-white'}`;
      }
    });

    // Cập nhật tiêu đề audio và nhảy giây
    const audioEl = document.getElementById(this.audioElementId);
    const labelEl = document.getElementById(this.audioLabelId);
    if (labelEl) {
      labelEl.innerText = `${part.title} (Từ ${this.formatSecondsToTime(part.startTime)})`;
    }

    if (audioEl && shouldSeekAndPlay && part.startTime !== undefined) {
      audioEl.currentTime = parseFloat(part.startTime);
      audioEl.play().catch(() => {});
    }

    // Render danh sách câu hỏi của Part
    const container = document.getElementById('activePartContainer');
    if (container) {
      container.innerHTML = this.buildPartQuestionsHtml(part);
      this.restoreUserInputsUI(part);
    }

    // Nạp Transcript nếu đang ở Review Mode
    const tMount = document.getElementById('transcriptLinesMount');
    if (tMount && part.transcriptHtml) {
      tMount.innerHTML = part.transcriptHtml;
      this.bindTranscriptClickEvents();
    }
  }

  buildPartQuestionsHtml(part) {
    let html = `
      <div style="border-bottom:2px solid #E8E2D8; padding-bottom:10px; margin-bottom:16px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
        <b style="font-size:16px; color:#0C4A6E;">${part.title}</b>
        <button type="button" class="btn-3d btn-3d-white" style="padding:6px 12px; font-size:12px;" onclick="window.diagListeningEngine.seekAudio(${part.startTime})">
          ▶ Phát lại từ đầu Part này (${this.formatSecondsToTime(part.startTime)})
        </button>
      </div>
    `;

    (part.groups || []).forEach(group => {
      html += `<div style="font-size:15px; font-weight:900; color:#1E293B; margin:16px 0 6px 0;">${group.title}</div>`;
      if (group.instructions) {
        html += `<div style="background:#FAF7F2; border:1.5px solid #E8E2D8; border-radius:10px; padding:8px 12px; font-size:13px; font-weight:700; color:#475569; margin-bottom:12px;">${group.instructions}</div>`;
      }

      // A. Điền từ dạng Bảng (Table) hoặc Ghi chú (Notes)
      if (group.type === 'table' || group.type === 'notes' || group.tableHtml || group.template) {
        let contentBody = group.tableHtml || group.template || '';
        (group.questionIds || []).forEach(qId => {
          const q = part.questions[qId];
          const width = q?.inputWidth || "120px";
          const audioTimeBtn = q?.time ? `<button type="button" class="btn-3d btn-3d-white" style="padding:2px 7px; font-size:11px; margin-left:4px;" onclick="window.diagListeningEngine.seekAudio(${q.time})">▶ ${this.formatSecondsToTime(q.time)}</button>` : '';

          const inputHtml = `
            <span style="display:inline-block; vertical-align:middle; margin:2px 0;">
              <input type="text" 
                     id="inp_${qId}" 
                     class="diag-input" 
                     style="width:${width}; padding:5px 8px; text-align:center; font-weight:800; color:#0284C7; display:inline-block;" 
                     placeholder="[Câu ${q?.num || qId}]"
                     oninput="window.diagListeningEngine.recordAnswer('${qId}', this.value)">
              ${audioTimeBtn}
              <div id="fb_${qId}" style="display:none; font-size:12px; font-weight:800; padding:2px 6px; border-radius:4px; margin-top:2px;"></div>
            </span>
          `;
          contentBody = contentBody.replace(new RegExp(`{{${qId}}}`, 'g'), inputHtml);
        });
        html += `<div style="margin-bottom:18px; font-size:14px; line-height:1.8;">${contentBody}</div>`;

      // B. Dạng Bản đồ (Map Labelling)
      } else if (group.type === 'map' || group.imageUrl) {
        const optsLetters = ['A','B','C','D','E','F','G','H','I'].slice(0, group.optionsCount || 9);
        const imgPath = group.imageUrl || '../listening/data-l/images/cam21-t2-p2-map.png';

        html += `
          <div style="background:#FFFFFF; border:2px solid #E8E2D8; border-radius:14px; padding:12px; text-align:center; margin-bottom:14px;">
            <img src="${imgPath}" alt="Map" style="max-width:100%; height:auto; border-radius:8px; border:1px solid #CBD5E1;">
          </div>
          <table style="width:100%; border-collapse:collapse; background:#FFFFFF; border:2px solid #E8E2D8; border-radius:12px; overflow:hidden; margin-bottom:18px;">
            <thead>
              <tr style="background:#FAF7F2;">
                <th style="padding:8px 12px; text-align:left; font-size:13px;">Địa điểm cần xác định</th>
                ${optsLetters.map(l => `<th style="padding:8px 4px; text-align:center; font-size:12.5px;">${l}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${(group.questionIds || []).map(qId => {
                const q = part.questions[qId];
                return `
                  <tr style="border-top:1px solid #E8E2D8;" id="row_${qId}">
                    <td style="padding:8px 12px; font-weight:800; font-size:13px;">
                      Câu ${q?.num || qId}: ${q?.text || ''}
                      ${q?.time ? `<button type="button" class="btn-3d btn-3d-white" style="padding:2px 6px; font-size:11px; margin-left:4px;" onclick="window.diagListeningEngine.seekAudio(${q.time})">▶</button>` : ''}
                      <div id="fb_${qId}" style="display:none; font-size:12px; font-weight:800; margin-top:2px;"></div>
                    </td>
                    ${optsLetters.map(letter => `
                      <td style="text-align:center; padding:4px;">
                        <input type="radio" name="ans_${qId}" value="${letter}" onchange="window.diagListeningEngine.recordAnswer('${qId}', '${letter}')" style="cursor:pointer; width:16px; height:16px;">
                      </td>
                    `).join('')}
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        `;

      // C. Dạng Nối thông tin (Matching 2 cột)
      } else if (group.type === 'matching' && Array.isArray(group.options)) {
        html += `
          <div style="display:flex; gap:16px; margin-bottom:18px; flex-wrap:wrap;">
            <div style="flex:1.4; min-width:280px; display:flex; flex-direction:column; gap:8px;">
              ${(group.questionIds || []).map(qId => {
                const q = part.questions[qId];
                return `
                  <div class="q-item-box" id="box_${qId}" style="margin-bottom:0; padding:12px 14px;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                      <b style="font-size:13.5px; color:#1E293B;">Câu ${q?.num || qId}: ${q?.text || ''}</b>
                      ${q?.time ? `<button type="button" class="btn-3d btn-3d-white" style="padding:2px 6px; font-size:11px;" onclick="window.diagListeningEngine.seekAudio(${q.time})">▶ ${this.formatSecondsToTime(q.time)}</button>` : ''}
                    </div>
                    <div style="display:flex; gap:8px; align-items:center; margin-top:8px;">
                      <span style="font-size:12.5px; font-weight:800; color:#64748B;">Đáp án chọn:</span>
                      <select id="sel_${qId}" class="diag-input" style="width:auto; min-width:180px; padding:6px 10px; font-size:13px;" onchange="window.diagListeningEngine.recordAnswer('${qId}', this.value)">
                        <option value="">-- Chọn đáp án A-H --</option>
                        ${group.options.map(opt => `<option value="${opt.key}">${opt.key}. ${opt.text}</option>`).join('')}
                      </select>
                    </div>
                    <div id="fb_${qId}" style="display:none; font-size:12px; font-weight:800; margin-top:4px;"></div>
                  </div>
                `;
              }).join('')}
            </div>

            <!-- Ngân hàng đáp án bên phải -->
            <div style="flex:1; min-width:240px; background:#FFFFFF; border:2px solid #E8E2D8; border-radius:14px; padding:12px; align-self:flex-start;">
              <b style="font-size:13px; color:#0369A1; display:block; margin-bottom:8px;">📋 ${group.optionsTitle || 'Danh mục lựa chọn'}:</b>
              <div style="display:flex; flex-direction:column; gap:6px;">
                ${group.options.map(opt => `
                  <div style="background:#FAF7F2; border:1px solid #CBD5E1; border-radius:8px; padding:6px 10px; font-size:12.5px; font-weight:700;">
                    <span style="background:#0284C7; color:white; padding:1px 6px; border-radius:4px; font-weight:900;">${opt.key}</span>
                    <span style="color:#1E293B; margin-left:4px;">${opt.text}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
        `;

      // D. Dạng Trắc nghiệm Multiple Choice (MCQ)
      } else {
        (group.questionIds || []).forEach(qId => {
          const q = part.questions[qId];
          if (!q) return;

          html += `
            <div class="q-item-box" id="box_${qId}">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                <b style="font-size:14px; color:#1E293B;">Câu ${q.num || qId}: ${q.text || ''}</b>
                ${q.time ? `<button type="button" class="btn-3d btn-3d-white" style="padding:2px 7px; font-size:11px;" onclick="window.diagListeningEngine.seekAudio(${q.time})">▶ ${this.formatSecondsToTime(q.time)}</button>` : ''}
              </div>
              <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:8px;">
                ${(q.options || []).map(opt => {
                  const letter = opt.charAt(0);
                  return `
                    <label class="option-label" onclick="window.diagListeningEngine.recordAnswer('${qId}', '${letter}')">
                      <input type="radio" name="ans_${qId}" value="${letter}">
                      <span>${opt}</span>
                    </label>
                  `;
                }).join('')}
              </div>
              <div id="fb_${qId}" style="display:none; font-size:12px; font-weight:800; margin-top:6px;"></div>
            </div>
          `;
        });
      }
    });

    return html;
  }

  // Ghi nhận đáp án học sinh nhập
  recordAnswer(qId, val) {
    if (this.isReviewMode) return;
    this.userAnswers[qId] = String(val).trim();
  }

  restoreUserInputsUI(part) {
    Object.entries(this.userAnswers).forEach(([qId, val]) => {
      const inp = document.getElementById(`inp_${qId}`);
      if (inp) inp.value = val;

      const sel = document.getElementById(`sel_${qId}`);
      if (sel) sel.value = val;

      const radio = document.querySelector(`input[name="ans_${qId}"][value="${val}"]`);
      if (radio) radio.checked = true;
    });
  }

  seekAudio(seconds) {
    const audio = document.getElementById(this.audioElementId);
    if (audio && seconds !== undefined) {
      audio.currentTime = parseFloat(seconds);
      audio.play().catch(() => {});
    }
  }

  bindTranscriptClickEvents() {
    document.querySelectorAll('#transcriptLinesMount .transcript-line[data-time]').forEach(line => {
      line.style.cursor = 'pointer';
      line.title = 'Bấm để nghe từ đoạn này';
      line.onclick = () => {
        const t = line.getAttribute('data-time');
        if (t) this.seekAudio(parseFloat(t));
      };
    });
  }

  formatSecondsToTime(sec) {
    if (!sec && sec !== 0) return "00:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  }

  // =========================================================================
  // 4. CHẤM ĐIỂM TỔNG HỢP (EVALUATE 20 CÂU 2 PARTS)
  // =========================================================================
  evaluate() {
    let score = 0;
    let total = 0;
    const wrongList = [];
    const details = [];

    this.parts.forEach(part => {
      const answersMap = part.answers || {};
      const qKeys = Object.keys(answersMap);
      total += qKeys.length;

      qKeys.forEach(qId => {
        const expected = answersMap[qId];
        const userVal = (this.userAnswers[qId] || '').trim();
        let isCorrect = false;

        if (userVal && expected) {
          if (Array.isArray(expected)) {
            isCorrect = expected.map(a => a.toLowerCase().trim()).includes(userVal.toLowerCase());
          } else {
            isCorrect = userVal.toLowerCase() === String(expected).toLowerCase().trim();
          }
        }

        const expStr = Array.isArray(expected) ? expected.join(' / ') : expected;
        const qTitle = part.questions[qId]?.text || part.questions[qId]?.q || `Câu ${part.questions[qId]?.num || qId}`;

        if (isCorrect) {
          score++;
        } else {
          wrongList.push({
            num: part.questions[qId]?.num || qId,
            q: `${part.title} - ${qTitle}`,
            chosen: userVal || "Bỏ trống",
            expected: expStr
          });
        }

        details.push({
          questionId: qId,
          partNum: part.partNum,
          userAnswer: userVal || "Bỏ trống",
          expectedAnswer: expStr,
          isCorrect: isCorrect
        });
      });
    });

    return {
      score,
      total,
      wrongList,
      details,
      answersSnapshot: this.userAnswers
    };
  }

  // =========================================================================
  // 5. REVIEW MODE (XEM LẠI BÀI THI & TÔ MÀU ĐÚNG SAI)
  // =========================================================================
  renderReviewMode(evalResult) {
    this.isReviewMode = true;
    this.userAnswers = evalResult.answersSnapshot || this.userAnswers;

    // Mở khung Transcript
    const tBox = document.getElementById('listeningTranscriptContainer');
    if (tBox) tBox.style.display = 'block';

    // Mở Part đầu tiên
    this.switchPart(0, false);

    // Tô viền xanh/đỏ cho các câu hỏi
    (evalResult.details || []).forEach(item => {
      const fb = document.getElementById(`fb_${item.questionId}`);
      const inp = document.getElementById(`inp_${item.questionId}`);
      const box = document.getElementById(`box_${item.questionId}`);
      const row = document.getElementById(`row_${item.questionId}`);

      if (inp) {
        inp.style.borderColor = item.isCorrect ? '#22C55E' : '#EF4444';
        inp.style.backgroundColor = item.isCorrect ? '#F0FDF4' : '#FEF2F2';
        inp.disabled = true;
      }

      if (box) {
        box.style.borderColor = item.isCorrect ? '#22C55E' : '#EF4444';
      }

      if (row) {
        row.style.backgroundColor = item.isCorrect ? '#F0FDF4' : '#FEF2F2';
      }

      if (fb) {
        fb.style.display = 'block';
        fb.style.color = item.isCorrect ? '#166534' : '#DC2626';
        fb.innerText = item.isCorrect ? '✓ Đúng' : `✗ Sai (Đáp án: ${item.expectedAnswer})`;
      }
    });
  }
}

// Khởi tạo đối tượng toàn cục
export const diagListeningEngine = new DiagListeningEngine();
window.diagListeningEngine = diagListeningEngine;
