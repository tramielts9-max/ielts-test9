/**
 * diagnostic/js-diag/diag-writing.js
 * BỘ ĐIỀU KHIỂN WRITING KHẢO THÍ CHUYÊN BIỆT (TEST 1, TEST 2, TEST 3)
 * BẢN FULL ĐẦY ĐỦ 100% - RENDER BIỂU ĐỒ TASK 1, BRAINSTORM TIẾNG VIỆT,
 * DỊCH CÂU / VIẾT TỪ KHÓA / VIẾT PEEL BODY, ĐẾM TỪ REALTIME & LIGHTBOX ẢNH
 */

export class DiagWritingEngine {
  constructor(options = {}) {
    this.containerId = options.containerId || 'writingMountContainer';
    this.testMeta = {};
    this.data = null;

    // Bộ nhớ bài làm của học sinh: { [fieldId]: "text" }
    this.userAnswers = {};
    this.isReviewMode = false;
  }

  // =========================================================================
  // 1. NẠP DỮ LIỆU ĐỀ WRITING TỪ FILE JSON RIÊNG BIỆT
  // =========================================================================
  async loadTestFromJson(jsonUrl) {
    try {
      const res = await fetch(jsonUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}: Không thể tải ${jsonUrl}`);
      this.data = await res.json();

      this.testMeta = {
        testId: this.data.testId || "test_01",
        set: this.data.set || 1,
        level: this.data.level || "Nền tảng"
      };

      this.userAnswers = {};
      return true;
    } catch (err) {
      console.warn("[DiagWritingEngine] Không thể nạp JSON Writing ngoài:", err);
      return false;
    }
  }

  // =========================================================================
  // 2. RENDER GIAO DIỆN BÀI THI WRITING RA MÀN HÌNH
  // =========================================================================
  render() {
    const mount = document.getElementById(this.containerId) || document.getElementById('section_writing');
    if (!mount || !this.data) return;

    const t1 = this.data.task1;
    const t2 = this.data.task2;
    const isTest3 = this.testMeta.testId === 'test_03';

    let html = `
      <div style="border-bottom: 2px solid #F4EFEB; padding-bottom: 12px; margin-bottom: 20px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
        <div>
          <h3 style="margin: 0; color: #2563EB; font-size: 18px; font-weight: 900;">
            <i class="fa-solid fa-pen-nib"></i> PHẦN 4: KHẢO SÁT NĂNG LỰC VIẾT (WRITING)
          </h3>
          <p style="margin: 4px 0 0 0; font-size: 13px; font-weight: 700; color: #64748B;">
            Cấp độ: <b>${this.data.level}</b> • Thực hiện đầy đủ các chặng tư duy và viết câu tiếng Anh. Toàn bộ chữ viết sẽ được AI phân tích chi tiết.
          </p>
        </div>
        <span style="font-size: 12px; font-weight: 900; background: #DBEAFE; color: #1E40AF; padding: 4px 12px; border-radius: 12px; border: 1px solid #BFDBFE;">
          Đề Set ${this.testMeta.set}
        </span>
      </div>

      <!-- KHUNG BÀI LÀM TASK 1 -->
      ${this.renderTask1Card(t1, isTest3)}

      <!-- KHUNG BÀI LÀM TASK 2 -->
      ${this.renderTask2Card(t2, isTest3)}

      <!-- POPUP LIGHTBOX PHÓNG TO ẢNH BIỂU ĐỒ TASK 1 -->
      <div id="diagImageModal" style="display:none; position:fixed; inset:0; background:rgba(15,23,42,0.8); z-index:9999; align-items:center; justify-content:center; padding:20px;" onclick="window.diagWritingEngine.closeImageModal()">
        <div style="position:relative; max-width:900px; max-height:90vh; background:#FFFFFF; border-radius:18px; padding:12px; box-shadow:0 10px 30px rgba(0,0,0,0.5);" onclick="event.stopPropagation()">
          <button type="button" onclick="window.diagWritingEngine.closeImageModal()" style="position:absolute; top:10px; right:12px; background:#EF4444; color:white; border:none; border-radius:50%; width:28px; height:28px; font-weight:bold; cursor:pointer;">✕</button>
          <img id="modalChartImg" src="" alt="Biểu đồ phóng to" style="max-width:100%; max-height:80vh; border-radius:10px; display:block; margin:0 auto;">
        </div>
      </div>
    `;

    mount.innerHTML = html;
    this.restoreUserInputs();
  }

  // =========================================================================
  // 3. RENDER TASK 1 (HỖ TRỢ ẢNH, BRAINSTORM VÀ VIẾT TIẾNG ANH)
  // =========================================================================
  renderTask1Card(t1, isTest3) {
    if (!t1) return '';

    return `
      <div class="q-item-box" style="margin-bottom:24px; border:2.5px solid #BFDBFE; background:#F8FAFC;">
        
        <!-- HEADER TASK 1 & ĐỀ BÀI -->
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:8px;">
          <b style="font-size:16px; color:#1E40AF; text-transform:uppercase;">
            📊 ${t1.title} (${t1.type})
          </b>
          <button type="button" class="btn-3d btn-3d-white" style="padding:6px 12px; font-size:12px;" onclick="window.diagWritingEngine.openImageModal('${t1.imageUrl}')">
            🔍 Bấm để phóng to biểu đồ
          </button>
        </div>

        <!-- HÌNH ẢNH BIỂU ĐỒ VÀ ĐỀ BÀI GỐC -->
        <div style="display:flex; gap:16px; margin-bottom:16px; flex-wrap:wrap; align-items:flex-start;">
          <div style="flex:1; min-width:260px; max-width:380px; background:#FFFFFF; border:2px solid #CBD5E1; border-radius:14px; padding:10px; text-align:center; cursor:pointer;" onclick="window.diagWritingEngine.openImageModal('${t1.imageUrl}')">
            <img src="${t1.imageUrl}" alt="Biểu đồ Task 1" style="max-width:100%; height:auto; border-radius:8px; display:block; margin:0 auto;">
            <div style="font-size:11px; font-weight:800; color:#64748B; margin-top:6px;">(Bấm vào hình để phóng to toàn màn hình)</div>
          </div>
          <div style="flex:1.5; min-width:280px; font-size:14px; line-height:1.6; color:#334155;">
            <div style="background:#FFFFFF; border:1.5px solid #CBD5E1; border-left:4px solid #1E40AF; border-radius:12px; padding:12px 14px; margin-bottom:10px;">
              <b>Đề bài gốc:</b> "${t1.promptEn}"
            </div>
            ${t1.instructions ? `<div style="font-size:13px; font-weight:700; color:#1E40AF; margin-bottom:8px;">📌 <b>Yêu cầu:</b> ${t1.instructions}</div>` : ''}
            
            ${isTest3 ? `
              <!-- HƯỚNG DẪN CHIẾN THUẬT NHÓM SỐ LIỆU CHO TEST 3 -->
              <div style="background:#EFF6FF; border:1.5px solid #BAE6FD; border-radius:12px; padding:10px 14px; font-size:12.5px; line-height:1.6;">
                <b style="color:#0369A1; display:block; margin-bottom:4px;">🎯 Chiến thuật phân chia 2 đoạn Body:</b>
                <div>• <b>Body 1:</b> ${t1.dataGroupingStrategy?.body1Focus || ''}</div>
                <div>• <b>Body 2:</b> ${t1.dataGroupingStrategy?.body2Focus || ''}</div>
              </div>
            ` : ''}
          </div>
        </div>

        <!-- TEST 1 & TEST 2: CÓ CHẶNG 1 BRAINSTORM TIẾNG VIỆT -->
        ${t1.stage1 ? `
          <div style="background:#FFFFFF; border:2px solid #E2E8F0; border-radius:14px; padding:16px; margin-bottom:18px;">
            <div style="font-size:14px; font-weight:900; color:#059669; margin-bottom:6px; display:flex; align-items:center; gap:6px;">
              <i class="fa-solid fa-brain"></i> ${t1.stage1.title}
            </div>
            <p style="font-size:12.5px; font-weight:700; color:#64748B; margin:0 0 12px 0;">${t1.stage1.guide}</p>

            ${(t1.stage1.questions || []).map(q => `
              <div style="background:#FAF7F2; border:1.5px solid #E8E2D8; border-radius:10px; padding:12px; margin-bottom:10px;">
                <b style="font-size:13.5px; color:#1E293B; display:block; margin-bottom:4px;">${q.label}</b>
                <div style="font-size:12px; color:#78350F; background:#FEF3C7; padding:6px 10px; border-radius:6px; margin-bottom:8px; white-space:pre-line;">
                  <i>Ví dụ mẫu:</i>\n${q.example}
                </div>
                <div style="display:flex; flex-direction:column; gap:6px;">
                  ${(q.fields || []).map(f => `
                    <input type="text" 
                           id="${q.id}_${f.key}" 
                           class="diag-input" 
                           style="padding:8px 12px; font-size:13px;" 
                           placeholder="${f.placeholder}" 
                           oninput="window.diagWritingEngine.recordInput('${q.id}_${f.key}', this.value)">
                  `).join('')}
                </div>
              </div>
            `).join('')}
          </div>
        ` : ''}

        <!-- CHẶNG 2: VIẾT TIẾNG ANH (DỊCH CÂU / TỪ KHÓA / HOẶC 2 BODY TEST 3) -->
        <div style="background:#FFFFFF; border:2px solid #BFDBFE; border-radius:14px; padding:16px;">
          <div style="font-size:14px; font-weight:900; color:#1E40AF; margin-bottom:8px; display:flex; align-items:center; gap:6px;">
            <i class="fa-solid fa-pen"></i> ${isTest3 ? 'Viết 2 Đoạn Thân Bài (Body 1 & Body 2)' : (t1.stage2?.title || 'Viết Câu Overview Tiếng Anh')}
          </div>

          <!-- Nếu là Test 1: Có câu tiếng Việt để dịch -->
          ${t1.stage2?.viSentence ? `
            <div style="background:#EFF6FF; border:1.5px solid #BAE6FD; border-radius:10px; padding:10px 14px; font-size:13px; color:#1E40AF; margin-bottom:10px;">
              <b>Gợi ý câu tóm tắt tiếng Việt:</b><br>${t1.stage2.viSentence}
            </div>
          ` : ''}

          <!-- Nếu là Test 2: Có cụm từ khóa định hướng -->
          ${t1.stage2?.keywords ? `
            <div style="background:#EFF6FF; border:1.5px solid #BAE6FD; border-radius:10px; padding:10px 14px; font-size:13px; color:#1E40AF; margin-bottom:10px;">
              <b>Các cụm từ khóa định hướng:</b>
              <ul style="margin:4px 0 0 0; padding-left:20px;">
                ${t1.stage2.keywords.map(kw => `<li>${kw}</li>`).join('')}
              </ul>
            </div>
          ` : ''}

          <!-- Gợi ý cấu trúc Band 7.5+ nếu có -->
          ${(t1.stage2?.academicVocabSuggestions || t1.band7Formulas) ? `
            <div style="background:#F0FDF4; border:1.5px solid #86EFAC; border-radius:10px; padding:8px 12px; font-size:12.5px; color:#166534; margin-bottom:12px;">
              <b>💡 Cấu trúc / Từ vựng ăn điểm:</b>
              <div style="margin-top:3px; line-height:1.5;">
                ${(t1.stage2?.academicVocabSuggestions || t1.band7Formulas || []).map(v => `• ${v}`).join('<br>')}
              </div>
            </div>
          ` : ''}

          <!-- Vùng nhập bài viết Task 1 -->
          ${isTest3 ? `
            <!-- TEST 3: CÓ 2 Ô BODY CHO TASK 1 -->
            ${(t1.sections || []).map(sec => `
              <div style="margin-bottom:12px;">
                <label style="font-size:13px; font-weight:800; color:#1E293B; display:block; margin-bottom:4px;">${sec.title}:</label>
                <textarea id="${sec.id}" 
                          class="diag-textarea" 
                          style="height:90px;" 
                          placeholder="${sec.placeholder}" 
                          oninput="window.diagWritingEngine.handleTextareaInput('${sec.id}', 'count_${sec.id}')"></textarea>
                <div style="text-align:right; font-size:12px; font-weight:800; color:#64748B; margin-top:2px;" id="count_${sec.id}">0 từ</div>
              </div>
            `).join('')}
          ` : `
            <!-- TEST 1 & TEST 2: CÓ 1 Ô OVERVIEW HOÀN CHỈNH -->
            <label style="font-size:13px; font-weight:800; color:#1E293B; display:block; margin-bottom:4px;">
              ✍️ Bản viết tiếng Anh của em (Không đưa số liệu chi tiết):
            </label>
            <textarea id="diag_wt1_input" 
                      class="diag-textarea" 
                      style="height:80px;" 
                      placeholder="${t1.stage2?.placeholder || 'Viết 1 câu Overview hoàn chỉnh bằng tiếng Anh tại đây...'}" 
                      oninput="window.diagWritingEngine.handleTextareaInput('diag_wt1_input', 'wt1WordCount')"></textarea>
            <div style="text-align:right; font-size:12px; font-weight:800; color:#64748B; margin-top:4px;" id="wt1WordCount">0 từ</div>
          `}
        </div>

      </div>
    `;
  }

  // =========================================================================
  // 4. RENDER TASK 2 (BRAINSTORM Ý & VIẾT PEEL TIẾNG ANH)
  // =========================================================================
  renderTask2Card(t2, isTest3) {
    if (!t2) return '';

    return `
      <div class="q-item-box" style="border:2.5px solid #DDD6FE; background:#FAF5FF;">
        
        <!-- HEADER TASK 2 -->
        <b style="font-size:16px; color:#7C3AED; text-transform:uppercase; display:block; margin-bottom:10px;">
          📝 ${t2.title}
        </b>

        <!-- ĐỀ BÀI TASK 2 -->
        <div style="background:#FFFFFF; border:1.5px solid #CBD5E1; border-left:4px solid #7C3AED; border-radius:12px; padding:12px 14px; margin-bottom:16px; font-size:14px; line-height:1.6; color:#334155;">
          <b>Đề bài Task 2:</b> "${t2.promptEn}"<br>
          <i style="color:#64748B;">${t2.promptVi || ''}</i>
          ${t2.instructions ? `<div style="font-size:13px; font-weight:700; color:#6D28D9; margin-top:6px;">📌 <b>Yêu cầu:</b> ${t2.instructions}</div>` : ''}
        </div>

        <!-- TEST 1 & TEST 2: CHẶNG 1 BRAINSTORM TIẾNG VIỆT -->
        ${t2.stage1 ? `
          <div style="background:#FFFFFF; border:2px solid #E2E8F0; border-radius:14px; padding:16px; margin-bottom:18px;">
            <div style="font-size:14px; font-weight:900; color:#059669; margin-bottom:6px; display:flex; align-items:center; gap:6px;">
              <i class="fa-solid fa-lightbulb"></i> ${t2.stage1.title}
            </div>
            <p style="font-size:12.5px; font-weight:700; color:#64748B; margin:0 0 10px 0;">${t2.stage1.guide}</p>

            ${(t2.stage1.questions || []).map(q => `
              <div style="margin-bottom:10px;">
                <label style="font-size:13px; font-weight:800; color:#1E293B; display:block; margin-bottom:4px;">${q.label}</label>
                <input type="text" 
                       id="${q.id}" 
                       class="diag-input" 
                       style="padding:8px 12px; font-size:13px;" 
                       placeholder="${q.placeholder}" 
                       oninput="window.diagWritingEngine.recordInput('${q.id}', this.value)">
              </div>
            `).join('')}
          </div>
        ` : ''}

        <!-- TEST 3: KHUNG PEEL FRAMEWORK GỢI Ý ĐA CHIỀU -->
        ${isTest3 && t2.peelFramework ? `
          <div style="background:#FFFFFF; border:2px solid #DDD6FE; border-radius:14px; padding:16px; margin-bottom:18px;">
            <div style="font-size:14px; font-weight:900; color:#6D28D9; margin-bottom:8px;">
              🎯 Dàn ý Luận điểm chuẩn PEEL (Point - Explanation - Example - Link):
            </div>
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:12px; font-size:12.5px; line-height:1.55;">
              <div style="background:#F5F3FF; border:1px solid #C4B5FD; padding:10px 12px; border-radius:10px;">
                <b style="color:#6D28D9; display:block; margin-bottom:4px;">📌 Đoạn 1: ${t2.peelFramework.body1?.theme}</b>
                <div>• <b>Point:</b> ${t2.peelFramework.body1?.p_point}</div>
                <div>• <b>Explain:</b> ${t2.peelFramework.body1?.e_explanation}</div>
                <div>• <b>Example:</b> ${t2.peelFramework.body1?.e_example}</div>
                <div>• <b>Link:</b> ${t2.peelFramework.body1?.l_link}</div>
              </div>
              <div style="background:#F5F3FF; border:1px solid #C4B5FD; padding:10px 12px; border-radius:10px;">
                <b style="color:#6D28D9; display:block; margin-bottom:4px;">📌 Đoạn 2: ${t2.peelFramework.body2?.theme}</b>
                <div>• <b>Point:</b> ${t2.peelFramework.body2?.p_point}</div>
                <div>• <b>Explain:</b> ${t2.peelFramework.body2?.e_explanation}</div>
                <div>• <b>Example:</b> ${t2.peelFramework.body2?.e_example}</div>
                <div>• <b>Link:</b> ${t2.peelFramework.body2?.l_link}</div>
              </div>
            </div>
          </div>
        ` : ''}

        <!-- CHẶNG 2: VIẾT TIẾNG ANH (CÂU TOPIC + EXPLANATION HOẶC BODY PEEL) -->
        <div style="background:#FFFFFF; border:2px solid #DDD6FE; border-radius:14px; padding:16px;">
          <div style="font-size:14px; font-weight:900; color:#7C3AED; margin-bottom:12px; display:flex; align-items:center; gap:6px;">
            <i class="fa-solid fa-pen-fancy"></i> ${isTest3 ? 'Viết 2 Đoạn Thân Bài PEEL Hoàn Chỉnh' : (t2.stage2?.title || 'Viết Câu Tiếng Anh Cho 2 Đoạn')}
          </div>

          <!-- Render các đoạn viết của Task 2 -->
          ${(t2.stage2?.sections || t2.sections || []).map((sec, idx) => `
            <div style="background:#FAF5FF; border:1.5px solid #E9D5FF; border-radius:12px; padding:14px; margin-bottom:14px;">
              <b style="font-size:13.5px; color:#6D28D9; display:block; margin-bottom:6px;">
                ${sec.sectionTitle || sec.title || `Đoạn ${idx + 1}`}
              </b>

              <!-- Gợi ý tiếng Việt (Test 1) -->
              ${sec.hints ? `
                <div style="background:#FFFFFF; border:1px solid #CBD5E1; padding:8px 12px; border-radius:8px; font-size:12.5px; color:#334155; margin-bottom:8px; line-height:1.5;">
                  ${sec.hints.map(h => `• ${h}`).join('<br>')}
                </div>
              ` : ''}

              <!-- Gợi ý từ khóa định hướng (Test 2) -->
              ${sec.keywordPrompts ? `
                <div style="background:#FFFFFF; border:1px solid #CBD5E1; padding:8px 12px; border-radius:8px; font-size:12.5px; color:#334155; margin-bottom:8px; line-height:1.5;">
                  ${sec.keywordPrompts.map(kp => `• ${kp}`).join('<br>')}
                </div>
              ` : ''}

              <!-- Textarea viết bài -->
              <textarea id="${sec.id || `diag_wt2_part_${idx + 1}`}" 
                        class="diag-textarea" 
                        style="height:85px;" 
                        placeholder="${sec.placeholder || 'Viết tiếng Anh tại đây...'}" 
                        oninput="window.diagWritingEngine.handleTextareaInput('${sec.id || `diag_wt2_part_${idx + 1}`}', 'count_wt2_${idx + 1}')"></textarea>
              <div style="text-align:right; font-size:12px; font-weight:800; color:#64748B; margin-top:2px;" id="count_wt2_${idx + 1}">0 từ</div>
            </div>
          `).join('')}
        </div>

      </div>
    `;
  }

  // =========================================================================
  // 5. CÁC HÀM XỬ LÝ SỰ KIỆN: ĐẾM TỪ, LƯU TRỮ VÀ PHÓNG TO ẢNH
  // =========================================================================
  handleTextareaInput(textareaId, counterId) {
    if (this.isReviewMode) return;
    const el = document.getElementById(textareaId);
    if (!el) return;

    const val = el.value.trim();
    this.userAnswers[textareaId] = el.value;

    // Đếm từ tự động
    const words = val.length === 0 ? 0 : val.split(/\s+/).filter(Boolean).length;
    const counterEl = document.getElementById(counterId);
    if (counterEl) {
      counterEl.innerText = `${words} từ`;
    }
  }

  recordInput(fieldId, value) {
    if (this.isReviewMode) return;
    this.userAnswers[fieldId] = value;
  }

  restoreUserInputs() {
    Object.entries(this.userAnswers).forEach(([fieldId, val]) => {
      const el = document.getElementById(fieldId);
      if (el) {
        el.value = val;
        // Kích hoạt cập nhật lại số từ
        const counterMatch = document.getElementById(`count_${fieldId}`);
        if (counterMatch) {
          const words = val.trim().length === 0 ? 0 : val.trim().split(/\s+/).filter(Boolean).length;
          counterMatch.innerText = `${words} từ`;
        }
      }
    });
  }

  // Phóng to ảnh biểu đồ Task 1
  openImageModal(imgSrc) {
    const modal = document.getElementById('diagImageModal');
    const img = document.getElementById('modalChartImg');
    if (modal && img) {
      img.src = imgSrc;
      modal.style.display = 'flex';
    }
  }

  closeImageModal() {
    const modal = document.getElementById('diagImageModal');
    if (modal) modal.style.display = 'none';
  }

  // =========================================================================
  // 6. TỔNG HỢP NỘI DUNG GỬI AI VÀ BỘ NHỚ LƯU TRỮ
  // =========================================================================
  getWritingSubmissionData() {
    // Thu thập tất cả các ô chữ của Task 1 và Task 2
    let task1Text = '';
    let task2Text = '';

    // Task 1
    if (document.getElementById('diag_wt1_input')) {
      task1Text = document.getElementById('diag_wt1_input').value.trim();
    } else {
      const b1 = document.getElementById('wt1_body1')?.value.trim() || '';
      const b2 = document.getElementById('wt1_body2')?.value.trim() || '';
      task1Text = `Body 1: ${b1}\n\nBody 2: ${b2}`;
    }

    // Task 2
    const wt2Inputs = document.querySelectorAll('textarea[id^="diag_wt2_"], textarea[id^="wt2_body"]');
    if (wt2Inputs.length > 0) {
      task2Text = Array.from(wt2Inputs).map(el => el.value.trim()).filter(Boolean).join('\n\n');
    }

    return {
      task1Text,
      task2Text,
      answersSnapshot: this.userAnswers
    };
  }

  // =========================================================================
  // 7. REVIEW MODE: KHÔI PHỤC BÀI VÀ KHÓA CHỈNH SỬA
  // =========================================================================
  renderReviewMode(savedData) {
    this.isReviewMode = true;
    this.userAnswers = savedData.answersSnapshot || savedData || {};
    this.restoreUserInputs();

    // Khóa tất cả các ô input và textarea
    document.querySelectorAll('#section_writing input, #section_writing textarea').forEach(el => {
      el.disabled = true;
      el.style.backgroundColor = '#F8FAFC';
    });
  }
}

// Khởi tạo đối tượng toàn cục
export const diagWritingEngine = new DiagWritingEngine();
window.diagWritingEngine = diagWritingEngine;
