/**
 * diagnostic/js-diag/diag-listening.js
 * BỘ ĐIỀU KHIỂN LISTENING KHẢO THÍ CHẨN ĐOÁN (TEST 2: PART 1+2 | TEST 3: PART 3+4)
 * - Tự động nhảy giây theo Part (startTime) & theo câu hỏi (question.time)
 * - Render đầy đủ 100%: Điền từ (Gap-fill), Trắc nghiệm (MCQ), Kéo thả (Matching), Bản đồ (Map)
 * - Quản lý State câu trả lời và chấm điểm chuẩn Cambridge
 */

export class DiagListeningEngine {
  constructor(options = {}) {
    this.containerId = options.containerId || 'listeningQuestionsMount';
    this.audioPlayerId = options.audioPlayerId || 'diagAudioPlayer';
    this.audioLabelId = options.audioLabelId || 'currentAudioLabel';

    this.testMeta = {};
    this.parts = [];
    this.currentPartIndex = 0; // 0: Part đầu (P1 hoặc P3), 1: Part sau (P2 hoặc P4)

    // Lưu câu trả lời của học sinh theo từng mã câu: { q1: "weather", q11: "A", ... }
    this.userAnswers = {};
    this.isReviewMode = false;

    // Kéo thả & click-to-place
    this.draggedData = null;
    this.selectedOptionForPlacement = null;
  }

  // =========================================================================
  // 1. NẠP DỮ LIỆU ĐỀ THI LISTENING TỪ FILE JSON NGOÀI
  // =========================================================================
  async loadTestFromJson(jsonUrl) {
    try {
      const res = await fetch(`${jsonUrl}?t=${Date.now()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}: Không thể tải file ${jsonUrl}`);
      const data = await res.json();

      this.testMeta = {
        testId: data.testId || "test_02",
        set: data.set || 1,
        title: data.title || "Listening Diagnostic",
        audioUrl: data.audioUrl || ""
      };

      this.parts = data.parts || [];
      this.currentPartIndex = 0;
      this.userAnswers = {};

      // Cập nhật nguồn Audio cho Audio Player
      const audioEl = document.getElementById(this.audioPlayerId);
      if (audioEl && this.testMeta.audioUrl) {
        audioEl.src = this.testMeta.audioUrl;
      }

      return true;
    } catch (err) {
      console.error("[DiagListeningEngine] Lỗi nạp dữ liệu bài nghe:", err);
      const mount = document.getElementById(this.containerId);
      if (mount) {
        mount.innerHTML = `<div style="text-align:center; padding:30px; color:#DC2626; font-weight:800;">
          ⚠️ Không thể tải dữ liệu bài nghe (${err.message}). Vui lòng kiểm tra lại đường dẫn JSON!
        </div>`;
      }
      return false;
    }
  }

  // =========================================================================
  // 2. GIAO DIỆN & THANH ĐIỀU HƯỚNG CHUYỂN PART + NHẢY GIÂY AUDIO
  // =========================================================================
  render() {
    const mount = document.getElementById(this.containerId);
    if (!mount || !this.parts || this.parts.length === 0) return;

    const currentPart = this.parts[this.currentPartIndex];
    if (!currentPart) return;

    // Cập nhật nhãn Audio
    const labelEl = document.getElementById(this.audioLabelId);
    if (labelEl) {
      labelEl.innerText = `${currentPart.title || `Part ${currentPart.partNum}`} • ${this.testMeta.title}`;
    }

    let html = '';

    // THANH CHỌN PART (Part 1 - Part 2 hoặc Part 3 - Part 4)
    html += `
      <div style="display:flex; justify-content:space-between; align-items:center; background:#FFFFFF; border:2px solid #E8E2D8; border-bottom:4px solid #D3CBC0; border-radius:16px; padding:10px 16px; margin-bottom:18px; flex-wrap:wrap; gap:10px;">
        <div style="display:flex; gap:8px;">
          ${this.parts.map((p, idx) => `
            <button type="button" 
                    class="btn-3d ${this.currentPartIndex === idx ? 'btn-3d-blue' : 'btn-3d-white'}" 
                    style="padding:8px 16px; font-size:13.5px;"
                    onclick="window.diagListeningEngine.switchPart(${idx})">
              Part ${p.partNum} (Câu ${this.getQuestionRange(p)})
            </button>
          `).join('')}
        </div>
        <div style="font-size:12.5px; font-weight:800; color:#0284C7;">
          <i class="fa-solid fa-circle-info"></i> Bấm chuyển Part sẽ tự động nhảy audio đến đoạn nghe tương ứng
        </div>
      </div>
    `;

    // NỘI DUNG CÂU HỎI CỦA PART HIỆN TẠI
    html += this.buildPartQuestionsHtml(currentPart);

    mount.innerHTML = html;
    this.restorePartInputsUI();
  }

  // Chuyển Part và nhảy audio tới mốc giây của Part đó
  switchPart(index) {
    if (index < 0 || index >= this.parts.length) return;
    this.currentPartIndex = index;
    const targetPart = this.parts[index];

    // NHẢY AUDIO ĐẾN MỐC GIÂY CỦA PART
    if (targetPart.startTime !== undefined) {
      this.seekAudioTo(targetPart.startTime);
    }

    this.render();
  }

  seekAudioTo(seconds) {
    const audio = document.getElementById(this.audioPlayerId);
    if (audio && seconds !== undefined && seconds !== null) {
      audio.currentTime = parseFloat(seconds);
      audio.play().catch(() => {});
    }
  }

  getQuestionRange(part) {
    const qIds = Object.keys(part.questions || {});
    if (!qIds.length) return "";
    const first = part.questions[qIds[0]]?.num || qIds[0].replace(/\D/g, '');
    const last = part.questions[qIds[qIds.length - 1]]?.num || qIds[qIds.length - 1].replace(/\D/g, '');
    return `${first}–${last}`;
  }

  formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  }

  // =========================================================================
  // 3. RENDER NỘI DUNG CÂU HỎI (HỌC 100% CẤU TRÚC RUNNER-LISTENING.HTML)
  // =========================================================================
  buildPartQuestionsHtml(partData) {
    if (!partData.groups || !partData.questions) return "<p>Chưa có câu hỏi.</p>";
    let html = '';

    partData.groups.forEach(group => {
      html += `
        <div style="margin-top:16px; margin-bottom:8px; font-size:16px; font-weight:900; color:#0284C7; border-left:4px solid #0284C7; padding-left:10px;">
          ${group.title}
        </div>
      `;
      if (group.instructions) {
        html += `
          <div style="background:#FAF7F2; border:1.5px solid #E8E2D8; border-radius:12px; padding:10px 14px; font-size:13.5px; font-weight:700; color:#64748B; margin-bottom:14px;">
            ${group.instructions}
          </div>
        `;
      }

      const isGapFill = group.type === 'table' || group.type === 'notes' || group.tableHtml || (group.template && !group.options);
      const isMatching = (group.type === 'matching' || group.type === 'flowchart') && Array.isArray(group.options);
      const isMap = group.type === 'map' || group.imageUrl;

      // 1. DẠNG BẢN ĐỒ MAP LABELLING
      if (isMap) {
        const optsLetters = ['A','B','C','D','E','F','G','H','I','J'].slice(0, group.optionsCount || 9);
        const imgPath = group.imageUrl || '../listening/data-l/images/cam21-t2-p2-map.png';

        html += `
          <div style="margin: 16px 0;">
            <div style="background:#FFFFFF; border:2px solid #E8E2D8; border-radius:14px; padding:10px; text-align:center; margin-bottom:12px;">
              <img src="${imgPath}" alt="Map" style="max-width:100%; height:auto; border-radius:8px;">
            </div>
            <table style="width:100%; border-collapse:collapse; background:#FFFFFF; border:2px solid #E8E2D8; border-radius:14px; overflow:hidden;">
              <thead>
                <tr style="background:#FAF7F2;">
                  <th style="padding:8px 12px; text-align:left; font-size:13.5px;">Địa điểm / Câu hỏi</th>
                  ${optsLetters.map(l => `<th style="padding:8px 4px; text-align:center; font-size:13px;">${l}</th>`).join('')}
                </tr>
              </thead>
              <tbody>
                ${group.questionIds.map(qId => {
                  const q = partData.questions[qId];
                  return `
                    <tr style="border-top:1px solid #E8E2D8;" id="${qId}_row">
                      <td style="padding:8px 12px; font-weight:800; font-size:13.5px;">
                        Câu ${q?.num || qId.replace('q','')}. ${q?.text || ''}
                        ${q?.time ? `<button type="button" class="btn-3d btn-3d-white" style="padding:2px 8px; font-size:11px; margin-left:6px;" onclick="window.diagListeningEngine.seekAudioTo(${q.time})">▶ ${this.formatTime(q.time)}</button>` : ''}
                      </td>
                      ${optsLetters.map(letter => `
                        <td style="text-align:center; padding:4px;">
                          <input type="radio" name="${qId}" value="${letter}" onchange="window.diagListeningEngine.onSelectAnswer('${qId}', '${letter}')" style="width:16px; height:16px; cursor:pointer;">
                        </td>
                      `).join('')}
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        `;
      } 
      // 2. DẠNG KÉO THẢ MATCHING 2 CỘT
      else if (isMatching) {
        let leftRows = '';
        group.questionIds.forEach(qId => {
          const q = partData.questions[qId];
          leftRows += `
            <div style="display:flex; justify-content:space-between; align-items:center; background:#FAF7F2; border:1.5px solid #E8E2D8; border-radius:10px; padding:8px 12px; margin-bottom:8px;" id="${qId}_card">
              <div style="flex:1;">
                <b style="font-size:13.5px; color:#1E293B;">Câu ${q?.num || qId.replace('q','')}. ${q?.text || ''}</b>
                ${q?.time ? `<button type="button" class="btn-3d btn-3d-white" style="padding:2px 6px; font-size:11px; margin-left:6px;" onclick="window.diagListeningEngine.seekAudioTo(${q.time})">▶ ${this.formatTime(q.time)}</button>` : ''}
              </div>
              <div id="dropzone_${qId}" style="min-width:180px; padding:6px 10px; background:#FFFFFF; border:2px dashed #CBD5E1; border-radius:8px; cursor:pointer; text-align:center;" 
                   onclick="window.diagListeningEngine.handleDropzoneClick('${qId}')">
                <span style="color:#94A3B8; font-style:italic; font-size:12px;">Bấm chọn đáp án gắn vào đây</span>
              </div>
            </div>
            <div id="${qId}_feedback" style="display:none; margin-bottom:8px;"></div>
          `;
        });

        const rightBank = `
          <div style="background:#F0F9FF; border:1.5px solid #BAE6FD; border-radius:12px; padding:12px; width:280px; flex-shrink:0;">
            <b style="display:block; margin-bottom:8px; font-size:13px; color:#0369A1;">Lựa chọn khả dụng:</b>
            <div style="display:flex; flex-direction:column; gap:6px;">
              ${group.options.map(opt => `
                <div style="display:flex; align-items:center; gap:8px; background:#FFFFFF; border:1.5px solid #CBD5E1; padding:6px 10px; border-radius:8px; cursor:pointer; font-size:12.5px; font-weight:700;"
                     id="opt_card_${opt.key}"
                     onclick="window.diagListeningEngine.selectOptionCard('${opt.key}', '${opt.text.replace(/'/g, "\\'")}', this)">
                  <span style="background:#0284C7; color:white; font-weight:900; padding:1px 6px; border-radius:4px; font-size:11px;">${opt.key}</span>
                  <span>${opt.text}</span>
                </div>
              `).join('')}
            </div>
          </div>
        `;

        html += `
          <div style="display:flex; gap:16px; align-items:flex-start; margin-bottom:16px; flex-wrap:wrap;">
            <div style="flex:1; min-width:280px;">${leftRows}</div>
            ${rightBank}
          </div>
        `;
      }
      // 3. DẠNG ĐIỀN TỪ GAP-FILL
      else if (isGapFill) {
        let contentBody = group.tableHtml || group.template || '';
        group.questionIds.forEach(qId => {
          const q = partData.questions[qId];
          const width = q?.inputWidth || "120px";
          const audioBtn = q?.time ? `<button type="button" class="btn-3d btn-3d-white" style="padding:2px 6px; font-size:10.5px; margin:0 3px;" onclick="window.diagListeningEngine.seekAudioTo(${q.time})">▶</button>` : '';

          const inputHtml = `
            <span style="display:inline-block; vertical-align:middle; margin:2px 0;">
              <input type="text" class="diag-input" id="${qId}_input" style="width:${width}; padding:4px 8px; font-size:13.5px; display:inline-block; margin:0 2px;"
                     placeholder="[Câu ${q?.num || qId.replace('q','')}]"
                     oninput="window.diagListeningEngine.onSelectAnswer('${qId}', this.value)">
              ${audioBtn}
              <div id="${qId}_feedback" style="display:none; font-size:11.5px; font-weight:800; padding:2px 6px; border-radius:4px;"></div>
            </span>
          `;
          contentBody = contentBody.replace(new RegExp(`{{${qId}}}`, 'g'), inputHtml);
        });

        html += `<div style="background:#FFFFFF; border:1.5px solid #E8E2D8; border-radius:14px; padding:16px; margin-bottom:16px; line-height:1.8; font-size:14px;">${contentBody}</div>`;
      }
      // 4. DẠNG TRẮC NGHIỆM MCQ
      else {
        group.questionIds.forEach(qId => {
          const q = partData.questions[qId];
          if (!q) return;

          let optionsList = '';
          if (q.options && Array.isArray(q.options)) {
            optionsList = q.options.map(opt => {
              const letter = opt.charAt(0);
              return `
                <label class="option-label" onclick="window.diagListeningEngine.onSelectAnswer('${qId}', '${letter}')">
                  <input type="radio" name="${qId}" value="${letter}">
                  <span>${opt}</span>
                </label>
              `;
            }).join('');
          }

          html += `
            <div class="q-item-box" id="${qId}_card" style="margin-bottom:12px;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                <b style="font-size:14px; color:#1E293B;">
                  Câu ${q.num || qId.replace('q','')}. ${q.text || ''}
                </b>
                ${q.time ? `<button type="button" class="btn-3d btn-3d-white" style="padding:2px 6px; font-size:11px;" onclick="window.diagListeningEngine.seekAudioTo(${q.time})">▶ ${this.formatTime(q.time)}</button>` : ''}
              </div>
              <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:8px;">${optionsList}</div>
              <div id="${qId}_feedback" style="display:none; margin-top:6px;"></div>
            </div>
          `;
        });
      }
    });

    return html;
  }

  // =========================================================================
  // 4. TƯƠNG TÁC LƯU STATE ĐÁP ÁN (GIỮ ĐÁP ÁN KHI ĐỔI PART)
  // =========================================================================
  onSelectAnswer(qId, val) {
    if (this.isReviewMode) return;
    this.userAnswers[qId] = (val || '').trim();
  }

  selectOptionCard(key, text, el) {
    document.querySelectorAll('[id^="opt_card_"]').forEach(c => c.style.borderColor = '#CBD5E1');
    if (this.selectedOptionForPlacement && this.selectedOptionForPlacement.key === key) {
      this.selectedOptionForPlacement = null;
    } else {
      this.selectedOptionForPlacement = { key, text };
      if (el) el.style.borderColor = '#0284C7';
    }
  }

  handleDropzoneClick(qId) {
    if (this.selectedOptionForPlacement) {
      const { key, text } = this.selectedOptionForPlacement;
      this.onSelectAnswer(qId, key);

      const dz = document.getElementById(`dropzone_${qId}`);
      if (dz) {
        dz.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <b style="color:#0284C7; font-size:13px;">[${key}] ${text}</b>
            <button type="button" onclick="window.diagListeningEngine.clearDropAnswer('${qId}', event)" style="background:#FEE2E2; color:#DC2626; border:none; border-radius:50%; width:18px; height:18px; font-size:11px; cursor:pointer;">&times;</button>
          </div>
        `;
      }
      document.querySelectorAll('[id^="opt_card_"]').forEach(c => c.style.borderColor = '#CBD5E1');
      this.selectedOptionForPlacement = null;
    }
  }

  clearDropAnswer(qId, e) {
    if (e) e.stopPropagation();
    delete this.userAnswers[qId];
    const dz = document.getElementById(`dropzone_${qId}`);
    if (dz) dz.innerHTML = `<span style="color:#94A3B8; font-style:italic; font-size:12px;">Bấm chọn đáp án gắn vào đây</span>`;
  }

  restorePartInputsUI() {
    Object.entries(this.userAnswers).forEach(([qId, val]) => {
      // 1. Text input
      const inp = document.getElementById(`${qId}_input`);
      if (inp) inp.value = val;

      // 2. Radio input
      const r = document.querySelector(`input[name="${qId}"][value="${val}"]`);
      if (r) r.checked = true;

      // 3. Dropzone
      const dz = document.getElementById(`dropzone_${qId}`);
      if (dz && val) {
        dz.innerHTML = `<b style="color:#0284C7; font-size:13px;">[${val}] Đã chọn</b>`;
      }
    });
  }

  // =========================================================================
  // 5. CHẤM ĐIỂM TOÀN BỘ CÁC PART (20 CÂU)
  // =========================================================================
  evaluate() {
    let score = 0;
    let total = 0;
    const wrongList = [];

    this.parts.forEach(part => {
      const partAnswers = part.answers || {};
      const questionsMap = part.questions || {};

      Object.entries(partAnswers).forEach(([qKey, expected]) => {
        total++;
        const userVal = (this.userAnswers[qKey] || '').trim();
        const qMeta = questionsMap[qKey] || {};

        let isCorrect = false;

        if (userVal && expected) {
          // Trắc nghiệm 1 chữ cái
          if (String(expected).trim().length === 1 && /^[A-Z]$/i.test(String(expected).trim())) {
            isCorrect = userVal.toUpperCase() === String(expected).trim().toUpperCase();
          } else if (Array.isArray(expected)) {
            // Danh sách đáp án chấp nhận
            isCorrect = expected.map(a => a.toLowerCase().trim()).includes(userVal.toLowerCase());
          } else {
            // Điền từ đơn lẻ
            isCorrect = userVal.toLowerCase() === String(expected).toLowerCase().trim();
          }
        }

        if (isCorrect) {
          score++;
        } else {
          wrongList.push({
            num: qMeta.num || qKey.replace(/\D/g, ''),
            qKey: qKey,
            qTitle: qMeta.text || qMeta.summaryTitle || `Câu ${qMeta.num || qKey}`,
            chosen: userVal || "(Bỏ trống)",
            expected: Array.isArray(expected) ? expected.join(' / ') : expected,
            partNum: part.partNum
          });
        }
      });
    });

    return {
      score,
      total,
      scorePercent: Math.round((score / (total || 1)) * 100),
      wrongList,
      userAnswers: this.userAnswers
    };
  }

  // =========================================================================
  // 6. CHẾ ĐỘ XEM LẠI REVIEW MODE
  // =========================================================================
  renderReviewMode(evalResult) {
    this.isReviewMode = true;
    const wrongKeys = new Set((evalResult.wrongList || []).map(w => w.qKey));

    this.parts.forEach(part => {
      const answersMap = part.answers || {};

      Object.keys(answersMap).forEach(qKey => {
        const isWrong = wrongKeys.has(qKey);
        const exp = answersMap[qKey];
        const expStr = Array.isArray(exp) ? exp.join(' / ') : exp;

        // Feedback cho Input
        const fb = document.getElementById(`${qKey}_feedback`);
        if (fb) {
          fb.style.display = 'block';
          fb.style.color = isWrong ? '#991B1B' : '#166534';
          fb.style.background = isWrong ? '#FEF2F2' : '#DCFCE7';
          fb.innerText = isWrong ? `✗ Sai (Đáp án: ${expStr})` : `✓ ĐÚNG`;
        }

        // Tô màu ô Text Input
        const inp = document.getElementById(`${qKey}_input`);
        if (inp) {
          inp.style.borderColor = isWrong ? '#EF4444' : '#22C55E';
          inp.style.background = isWrong ? '#FEF2F2' : '#F0FDF4';
          inp.disabled = true;
        }

        // Radio inputs
        document.querySelectorAll(`input[name="${qKey}"]`).forEach(r => r.disabled = true);
      });
    });
  }
}

export const diagListeningEngine = new DiagListeningEngine();
window.diagListeningEngine = diagListeningEngine;
