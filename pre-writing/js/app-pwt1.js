/**
 * pre-writing/js/app-pwt1.js - Điều khiển Pre-Writing Task 1 Duolingo 3D
 * BẢN FULL ĐẦY ĐỦ 100% - AUTO-SAVE THỜI GIAN THỰC, NÚT LƯU TẠM DRAFT,
 * FIX DEEP-LINK XEM LẠI TỪ TRANG CHỦ & FIX HIỂN THỊ CÂU GỐC TRONG AI SỬA BÀI
 */

import { streamGeminiPWT1 } from './api-pwt1.js';

let manifestData = [];
let currentExercise = null;
let currentCategory = "ALL";
let activeExerciseId = null;

const CATEGORIES = ["ALL", "Line", "Bar", "Pie", "Table", "Mixed", "Map", "Floor Plan", "Process"];
const CLOUD_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyNErQQFdciAQM0k9KUrACtpX7rxKkopjChYAC2Ubwj5MGzFOeekDEGs8C1n7P9cNR6vg/exec";

window.addEventListener('DOMContentLoaded', async () => {
  setupWorkspaceListeners();
  injectSaveDraftButtonPWT1();
  await loadManifestAndInitPortal();
  handleUrlDeepLinkPWT1();
});

// =========================================================================
// 1. QUẢN LÝ LƯU TRỮ BẢN NHÁP (DRAFT AUTO-SAVE & RESUME)
// =========================================================================
function getPWT1DraftKey(exId) {
  return `ielts_pwt1_draft_${exId}`;
}

function savePWT1Draft(exId, text) {
  if (!exId) return;
  const draftData = {
    text: text,
    updatedAt: new Date().toISOString()
  };
  localStorage.setItem(getPWT1DraftKey(exId), JSON.stringify(draftData));
}

function loadPWT1Draft(exId) {
  if (!exId) return null;
  try {
    const raw = localStorage.getItem(getPWT1DraftKey(exId));
    return raw ? JSON.parse(raw) : null;
  } catch(e) {
    return null;
  }
}

function clearPWT1Draft(exId) {
  if (!exId) return;
  localStorage.removeItem(getPWT1DraftKey(exId));
}

// Tự động chèn nút "💾 Lưu Tạm Bài Dịch" cạnh nút Chấm bài
function injectSaveDraftButtonPWT1() {
  const gradeBtn = document.getElementById('btnGrading');
  if (!gradeBtn || document.getElementById('btnSaveDraftPWT1')) return;

  const draftBtn = document.createElement('button');
  draftBtn.id = 'btnSaveDraftPWT1';
  draftBtn.type = 'button';
  draftBtn.className = 'btn-3d btn-3d-white';
  draftBtn.style.cssText = 'padding: 12px 18px; font-size: 13.5px; font-weight: 900; margin-right: 10px; border-color: #93C5FD; color: #1E40AF;';
  draftBtn.innerHTML = '💾 Lưu Tạm Bài Dịch';
  draftBtn.onclick = () => {
    const text = document.getElementById('studentEnglishInput')?.value || '';
    savePWT1Draft(activeExerciseId, text);
    alert("✅ Đã lưu tạm câu dịch của em thành công! Lần sau mở bài này em sẽ được dịch tiếp.");
  };

  gradeBtn.parentNode.insertBefore(draftBtn, gradeBtn);
}

// =========================================================================
// 2. QUẢN LÝ LƯU TRỮ TỪNG LẦN LÀM (ATTEMPTS: LẦN 1, LẦN 2...)
// =========================================================================
function getPWT1StorageKey(exId) {
  return `ielts_pwt1_attempts_${exId}`;
}

function getExerciseAttempts(exId) {
  try {
    const raw = localStorage.getItem(getPWT1StorageKey(exId));
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveExerciseAttempt(exId, attemptData) {
  try {
    const attempts = getExerciseAttempts(exId);
    attempts.unshift(attemptData); // Lần mới nhất lên đầu
    localStorage.setItem(getPWT1StorageKey(exId), JSON.stringify(attempts));
  } catch (e) {
    console.warn("Lỗi lưu lần làm PWT1:", e);
  }
}

function getCompletedRecord(fileOrTitle) {
  try {
    const list = JSON.parse(localStorage.getItem('ielts_local_history') || '[]');
    return list.find(item => item.testTitle && item.testTitle.includes(fileOrTitle));
  } catch (e) {
    return null;
  }
}

// =========================================================================
// 3. XỬ LÝ DEEP-LINK NÚT "XEM LẠI" TỪ TRANG CHỦ
// =========================================================================
function handleUrlDeepLinkPWT1() {
  const urlParams = new URLSearchParams(window.location.search);
  const attemptId = urlParams.get('attemptId');
  const testParam = urlParams.get('test') || urlParams.get('id');

  // Trường hợp 1: Có attemptId từ nút Xem lại của trang chủ
  if (attemptId) {
    try {
      const localHist = JSON.parse(localStorage.getItem('ielts_local_history') || '[]');
      const foundAttempt = localHist.find(a => a.id === attemptId);

      if (foundAttempt) {
        const matchedItem = manifestData.find(item => 
          foundAttempt.testTitle.includes(item.id) || 
          foundAttempt.testTitle.includes(item.title)
        ) || manifestData[0];

        if (matchedItem) {
          window.startLessonPWT1(matchedItem.file, matchedItem.title, matchedItem.id).then(() => {
            restoreAttemptToWorkspacePWT1(foundAttempt);
          });
          return;
        }
      }
    } catch(e) {
      console.warn("Lỗi deep-link PWT1 attemptId:", e);
    }
  }

  // Trường hợp 2: Có test/id trực tiếp trên URL
  if (testParam) {
    const matchedItem = manifestData.find(item => item.id === testParam || item.file.includes(testParam));
    if (matchedItem) {
      window.startLessonPWT1(matchedItem.file, matchedItem.title, matchedItem.id);
    }
  }
}

function restoreAttemptToWorkspacePWT1(attempt) {
  const inputEl = document.getElementById('studentEnglishInput');
  const resultBox = document.getElementById('result-box');
  const resultContent = document.getElementById('result-content');
  const statusBar = document.getElementById('status-bar');

  let studentText = '';
  let aiText = '';

  if (attempt.details && attempt.details.includes('BẢN DỊCH HỌC VIÊN:')) {
    const parts = attempt.details.split('BẢN DỊCH HỌC VIÊN:');
    if (parts[1]) {
      const subParts = parts[1].split('ĐÁNH GIÁ 2 TẦNG:');
      studentText = subParts[0].trim();
      aiText = subParts[1] ? subParts[1].trim() : '';
    }
  } else if (attempt.studentText) {
    studentText = attempt.studentText;
    aiText = attempt.aiFeedback || '';
  }

  if (inputEl) {
    inputEl.value = studentText;
    updateWordCount();
  }

  if (resultBox && resultContent) {
    resultBox.style.display = 'block';
    statusBar.innerHTML = `📜 ĐANG XEM LẠI BÀI LÀM: <b>${attempt.testTitle}</b> (${attempt.timestamp}) — Điểm: <b>${attempt.score}</b>`;
    resultContent.innerHTML = marked.parse(aiText || '<i>Chưa có dữ liệu bài sửa chi tiết.</i>');
    resultBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
    renderExportPdfButton();
  }
}

// ==================== MÀN HÌNH 1: PORTAL LOGIC ====================
async function loadManifestAndInitPortal() {
  try {
    const res = await fetch('data/pwt1-manifest.json');
    manifestData = await res.json();
    renderTabs();
    renderCards();
  } catch (err) {
    console.error("Lỗi đọc pwt1-manifest.json:", err);
  }
}

function renderTabs() {
  const container = document.getElementById('categoryTabsContainer');
  if (!container) return;
  container.innerHTML = CATEGORIES.map(cat => {
    const isActive = cat === currentCategory;
    return `
      <button onclick="window.switchPWT1Category('${cat}')" class="pwt1-tab-btn ${isActive ? 'active' : ''}">
        ${cat === 'ALL' ? 'Tất cả dạng bài' : cat}
      </button>
    `;
  }).join('');
}

window.switchPWT1Category = (cat) => {
  currentCategory = cat;
  renderTabs();
  renderCards();
};

function renderCards() {
  const container = document.getElementById('portalCardsGrid');
  const search = (document.getElementById('portalSearchInput')?.value || '').toLowerCase().trim();
  if (!container) return;

  let completedCount = 0;
  manifestData.forEach(item => {
    const attempts = getExerciseAttempts(item.id);
    if (attempts.length > 0 || getCompletedRecord(item.title)) completedCount++;
  });
  
  const progBadge = document.getElementById('portalProgressBadge');
  if (progBadge) {
    progBadge.innerText = `${completedCount}/${manifestData.length} Đã xong`;
  }

  const filtered = manifestData.filter(item => {
    const matchCat = (currentCategory === "ALL") || item.title.toLowerCase().includes(currentCategory.toLowerCase());
    const matchSearch = item.title.toLowerCase().includes(search);
    return matchCat && matchSearch;
  });

  if (filtered.length === 0) {
    container.innerHTML = `<div style="grid-column: 1 / -1; padding: 40px; text-align: center; color: var(--text-muted); font-weight: 800; font-size: 16px; background: #FFFFFF; border-radius: 22px; border: 2.5px dashed var(--border-color);">Không tìm thấy bài tập nào!</div>`;
    return;
  }

  container.innerHTML = filtered.map(item => {
    const attempts = getExerciseAttempts(item.id);
    const rec = getCompletedRecord(item.title);
    const draft = loadPWT1Draft(item.id);
    const isDone = attempts.length > 0 || !!rec;
    const count = attempts.length > 0 ? attempts.length : (isDone ? 1 : 0);
    const latestScore = attempts.length > 0 ? attempts[0].score : (rec?.score || 'Đã nộp');

    return `
      <div class="pwt1-card-item ${isDone ? 'is-done' : ''}">
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <span class="pwt1-tag-id" style="background: ${isDone ? '#DCFCE7' : '#DBEAFE'}; color: ${isDone ? '#166534' : '#1E40AF'};">
              ID: ${item.id}
            </span>
            ${isDone 
              ? `<span style="font-size: 12.5px; font-weight: 900; background: #DCFCE7; color: #166534; padding: 2px 8px; border-radius: 6px; border: 1px solid #86EFAC;">
                   ✓ Đã làm ${count} lần (${latestScore})
                 </span>` 
              : (draft ? `<span style="font-size: 12px; font-weight: 800; background: #FEF3C7; color: #92400E; padding: 2px 6px; border-radius: 6px;">● Đang làm dở</span>` : `<span style="font-size: 13px; font-weight: 800; color: var(--text-muted);">● Chưa làm</span>`)
            }
          </div>
          <h4 class="pwt1-card-title" title="${item.title}">
            ${item.title}
          </h4>
        </div>

        <div style="display: flex; gap: 8px; margin-top: 10px;">
          <button onclick="window.startLessonPWT1('${item.file}', '${item.title.replace(/'/g, "\\'")}', '${item.id}')" class="btn-3d ${isDone ? 'btn-3d-green' : 'btn-3d-blue'}" style="flex: 1; padding: 10px 14px; font-size: 13px;">
            ${isDone ? `+ Làm tiếp lần ${count + 1}` : (draft ? 'Dịch tiếp bài dở →' : 'Vào làm bài →')}
          </button>
          ${isDone ? `
            <button onclick="window.openPastAttemptsPWT1('${item.id}', '${item.title.replace(/'/g, "\\'")}')" class="btn-3d btn-3d-white" style="padding: 10px 12px; font-size: 13px;" title="Xem lại các lần làm trước">
              👁️ Xem (${count})
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');
}

window.filterPWT1Cards = () => renderCards();

// ==================== WORKSPACE LOGIC ====================
window.startLessonPWT1 = async (filePath, title, exId) => {
  activeExerciseId = exId;
  document.getElementById('portalScreen').classList.add('hidden');
  document.getElementById('workspaceScreen').classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Khôi phục bản nháp nếu có
  const draft = loadPWT1Draft(activeExerciseId);
  const inputEl = document.getElementById('studentEnglishInput');
  if (draft && inputEl) {
    inputEl.value = draft.text || '';
    updateWordCount();
  } else {
    if (inputEl) inputEl.value = '';
    updateWordCount();
  }

  try {
    const res = await fetch(filePath);
    currentExercise = await res.json();
    currentExercise.title = title;
    currentExercise.id = exId;
    updateExerciseView();

    renderWorkspacePastAttemptsBar();
    resetQAChatBox();
  } catch (err) {
    console.error("Lỗi nạp bài tập:", err);
  }
};

window.backToPortalPWT1 = () => {
  // Tự lưu nháp khi thoát
  const text = document.getElementById('studentEnglishInput')?.value || '';
  if (text.trim()) {
    savePWT1Draft(activeExerciseId, text);
  }

  document.getElementById('workspaceScreen').classList.add('hidden');
  document.getElementById('portalScreen').classList.remove('hidden');
  renderCards();
};

function setupWorkspaceListeners() {
  document.getElementById('bandTargetSelect')?.addEventListener('change', updateExerciseView);
  
  const inputEl = document.getElementById('studentEnglishInput');
  let autoSaveTimeout = null;

  inputEl?.addEventListener('input', () => {
    updateWordCount();
    clearTimeout(autoSaveTimeout);
    autoSaveTimeout = setTimeout(() => {
      savePWT1Draft(activeExerciseId, inputEl.value);
    }, 1500);
  });

  document.getElementById('btnGrading')?.addEventListener('click', runEvaluation);
}

function updateExerciseView() {
  if (!currentExercise) return;
  const targetBand = document.getElementById('bandTargetSelect').value;

  document.getElementById('chartTypeBadge').innerText = currentExercise.type || 'Task 1';
  const promptText = `ĐỀ BÀI (ENGLISH PROMPT):\n${currentExercise.prompt}\n\n--- BẢN MẪU TIẾNG VIỆT ĐỐI ỨNG (${targetBand.toUpperCase()}): ---\n\n${currentExercise[targetBand] || currentExercise.band8}`;
  document.getElementById('vietnameseSourceText').innerText = promptText;

  const imgElement = document.getElementById('chartImage');
  const fallback = document.getElementById('imageFallback');
  const pathDisplay = document.getElementById('expectedImgName');

  const fileName = currentExercise.image.split('/').pop();
  const relativeImagePath = `prewt12images/${fileName}`;
  pathDisplay.innerText = relativeImagePath;

  imgElement.style.display = 'none';
  fallback.style.display = 'block';

  const tester = new Image();
  tester.src = relativeImagePath;
  tester.onload = () => {
    imgElement.src = relativeImagePath;
    imgElement.style.display = 'inline-block';
    fallback.style.display = 'none';
  };
  tester.onerror = () => {
    imgElement.style.display = 'none';
    fallback.style.display = 'block';
  };
}

function updateWordCount() {
  const text = document.getElementById('studentEnglishInput').value.trim();
  const words = text ? text.split(/\s+/).length : 0;
  document.getElementById('wordCountDisplay').innerText = `${words} từ`;
}

// =========================================================================
// 4. THANH HIỂN THỊ CÁC LẦN NỘP BÀI CŨ
// =========================================================================
function renderWorkspacePastAttemptsBar() {
  let bar = document.getElementById('pwt1PastAttemptsBar');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'pwt1PastAttemptsBar';
    const grid = document.querySelector('.pwt1-workspace-grid');
    if (grid) grid.parentNode.insertBefore(bar, grid);
  }

  const attempts = getExerciseAttempts(activeExerciseId);
  if (attempts.length === 0) {
    bar.innerHTML = '';
    return;
  }

  let html = `
    <div style="background: #F0FDF4; border: 2px solid #86EFAC; border-radius: 16px; padding: 12px 18px; margin-bottom: 18px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
      <div>
        <b style="color: #166534; font-size: 14px;">📜 Bài này Em đã làm ${attempts.length} lần trước đây:</b>
        <div style="display: flex; gap: 8px; margin-top: 6px; flex-wrap: wrap;">
  `;

  attempts.forEach((att, idx) => {
    html += `
      <button type="button" onclick="window.viewPastAttemptDetailPWT1(${idx})" style="background: #FFFFFF; border: 1.5px solid #86EFAC; border-bottom: 3px solid #22C55E; padding: 4px 10px; border-radius: 8px; font-weight: 800; font-size: 12.5px; cursor: pointer; color: #166534;">
        Lần ${att.attemptNum || (attempts.length - idx)}: <b>${att.score}</b> (${att.timestamp.split(' - ')[0]})
      </button>
    `;
  });

  html += `
        </div>
      </div>
      <span style="font-size: 12px; color: #15803D; font-weight: 700;">Nhấp vào lần làm để xem lại bản sửa cũ</span>
    </div>
  `;

  bar.innerHTML = html;
}

window.viewPastAttemptDetailPWT1 = (idx) => {
  const attempts = getExerciseAttempts(activeExerciseId);
  const att = attempts[idx];
  if (!att) return;

  document.getElementById('studentEnglishInput').value = att.studentText || '';
  updateWordCount();

  const resultBox = document.getElementById('result-box');
  const resultContent = document.getElementById('result-content');
  const statusBar = document.getElementById('status-bar');

  resultBox.style.display = 'block';
  statusBar.innerHTML = `📜 ĐANG XEM LẠI BẢN SỬA: <b>LẦN ${att.attemptNum || 1}</b> (${att.timestamp}) — Điểm: <b>${att.score}</b>`;
  resultContent.innerHTML = marked.parse(att.aiFeedback || '');
  resultBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
  renderExportPdfButton();
};

window.openPastAttemptsPWT1 = (exId, title) => {
  const item = manifestData.find(m => m.id === exId);
  if (item) {
    window.startLessonPWT1(item.file, title, exId);
    setTimeout(() => {
      window.viewPastAttemptDetailPWT1(0);
    }, 400);
  }
};

// =========================================================================
// 5. CHẤM ĐIỂM AI 2 TẦNG (BẮT BUỘC TRÍCH DẪN NGUYÊN VĂN CÂU HỌC SINH DỊCH)
// =========================================================================
async function runEvaluation() {
  const studentText = document.getElementById('studentEnglishInput').value.trim();
  const sourceVN = document.getElementById('vietnameseSourceText').innerText.trim();

  if (!studentText) {
    alert("⚠️ Em hãy viết hoặc gõ câu dịch của mình trước khi bấm chấm nhé!");
    return;
  }

  const btn = document.getElementById('btnGrading');
  const resultBox = document.getElementById('result-box');
  const resultContent = document.getElementById('result-content');
  const statusBar = document.getElementById('status-bar');

  btn.disabled = true;
  resultBox.style.display = 'block';
  resultContent.innerHTML = '';
  statusBar.innerHTML = "⏳ Thầy đang đối chiếu số liệu biểu đồ & sửa bài 2 tầng cho em...";

  const systemInstruction = `
Bạn là Giám khảo IELTS Writing Task 1 cự phách và là Thầy dạy dịch thuật học thuật.
QUY TẮC BẮT BUỘC: Xưng "Anh" và gọi học sinh là "Em".
QUY TẮC ĐỊNH DẠNG: Dùng cú pháp Markdown chuẩn (#, ##, ###, ####). Dùng thẻ inline:
<del class="err">từ sai</del>
<ins class="fix">từ sửa đúng</ins>
<mark class="vocab">từ vựng C1-C2 Task 1</mark>
<span class="teacher-note">💬 (lời dặn của Anh)</span>

QUY TẮC BẮT BUỘC TRONG PHẦN 1:
- KHÔNG ĐƯỢC NUỐT CÂU GỐC CỦA HỌC SINH.
- MỖI CÂU ĐỀU PHẢI TRÍCH DẪN RÕ RÀNG:
  "### 📌 Câu [Số]: [CÂU GỐC CỦA EM ĐÃ DỊCH - BẮT BUỘC TRÍCH DẪN NGUYÊN VĂN]"
  "*Đối chiếu tiếng Việt: [Câu tiếng Việt]*"
  trước khi tiến hành Bước 1 (Tầng 1) và Bước 2 (Tầng 2).

XUẤT THEO CẤU TRÚC:
# PHẦN 1: MỔ XẺ TỪNG CÂU DỊCH (SỬA BÀI 2 TẦNG TASK 1)
---
### 📌 Câu [Số]: "[CÂU GỐC CỦA EM ĐÃ DỊCH - TRÍCH DẪN NGUYÊN VĂN]"
*Đối chiếu tiếng Việt: "[Câu tiếng Việt tương ứng]"*
#### TẦNG 1: SỬA LỖI NGỮ PHÁP, SỐ LIỆU & DIỄN ĐẠT (Band 6.5 - 7.0)
- **Anh sửa trực tiếp:** [Câu sửa]
- **Các điểm cần sửa ngay:** [Lỗi sai]
- **Bản sửa sạch lỗi:** "[Câu hoàn chỉnh sạch lỗi]"

#### TẦNG 2: NÂNG TẦM ACADEMIC TASK 1 (Band 8.0 - 8.5)
- **Biến hóa với cấu trúc và Collocations học thuật:** [Câu Band 8+]
- **Từ vựng & cấu trúc ăn điểm:** [Cụm tầng 1 ➔ Cụm Band 8]
- **Bản nâng cấp:** "[Câu đỉnh cao chuẩn band 8+]"
---

# PHẦN 2: BẢNG ĐÁNH GIÁ 4 TIÊU CHÍ TASK 1
| Task Achievement | Coherence & Cohesion | Lexical Resource | Grammatical Range & Accuracy |
|---|---|---|---|
| Band [X] | Band [X] | Band [X] | Band [X] |

> ### OVERALL BAND DỰ KIẾN: [X]/9.0

# PHẦN 3: LỜI DẶN DÒ CHIẾN LƯỢC CỦA ANH
[Nêu 2-3 lỗi cố hữu cần khắc phục]

# PHẦN 4: BẢN DỊCH HOÀN CHỈNH SẠCH LỖI (BAND 7.0)
> [Tổng hợp các câu sửa tầng 1]

# PHẦN 5: BẢN DỊCH ĐẲNG CẤP BẢN XỨ (BAND 8.5)
> [Tổng hợp các câu tầng 2]
`;

  const payload = [
    { text: systemInstruction + `\n\nĐề bài: ${currentExercise.prompt}\nDạng bài: ${currentExercise.type}\nTiếng Việt:\n${sourceVN}\n\nBài học sinh:\n${studentText}` }
  ];

  let fullText = "";
  try {
    const usedModel = await streamGeminiPWT1(payload, (chunk) => {
      fullText += chunk;
      resultContent.innerHTML = marked.parse(fullText);
    });
    statusBar.innerHTML = `✅ Thầy đã chấm xong bằng model [${usedModel}]. Em học kỹ các cấu trúc Tầng 2 nhé!`;
    btn.disabled = false;

    // Xóa nháp vì đã nộp bài thành công
    clearPWT1Draft(activeExerciseId);

    // LƯU KẾT QUẢ VÀO ATTEMPTS RIÊNG BIỆT
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')} - ${String(now.getDate()).padStart(2,'0')}/${String(now.getMonth()+1).padStart(2,'0')}/${now.getFullYear()}`;
    const sName = localStorage.getItem('ielts_student_name') || 'Học viên';
    const sEmail = localStorage.getItem('ielts_student_email') || '';

    const bandMatch = fullText.match(/OVERALL BAND DỰ KIẾN:\s*([0-9.]+)/i) || fullText.match(/Band\s*([0-9.]+)/i);
    const bandScore = bandMatch ? `Band ${bandMatch[1]}` : "Đã dịch xong";

    const attempts = getExerciseAttempts(activeExerciseId);
    const newAttemptNum = attempts.length + 1;

    const newAttemptRecord = {
      attemptNum: newAttemptNum,
      timestamp: timeStr,
      score: bandScore,
      studentText: studentText,
      aiFeedback: fullText
    };

    saveExerciseAttempt(activeExerciseId, newAttemptRecord);
    renderWorkspacePastAttemptsBar();

    // LƯU LỊCH SỬ CHUNG TRANG CHỦ & BẮN LÊN DRIVE
    const attemptSnapshot = {
      id: "attempt_pwt1_" + Date.now(),
      timestamp: `${timeStr} (Lần ${newAttemptNum})`,
      testTitle: `Pre-Writing T1: ${currentExercise?.title || 'Dịch biểu đồ'} (Lần ${newAttemptNum})`,
      studentName: sName,
      studentEmail: sEmail,
      score: bandScore,
      timeSpent: "N/A",
      details: `BẢN DỊCH HỌC VIÊN:\n${studentText}\n\nĐÁNH GIÁ 2 TẦNG:\n${fullText}`,
      pageUrl: `pre-writing/index-pwt1.html?test=${activeExerciseId}`,
      moduleType: "pre_writing_t1"
    };

    const localHist = JSON.parse(localStorage.getItem('ielts_local_history') || '[]');
    localHist.unshift(attemptSnapshot);
    localStorage.setItem('ielts_local_history', JSON.stringify(localHist));

    fetch(CLOUD_SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "save_attempt", attempt: attemptSnapshot })
    }).catch(() => {});

    renderExportPdfButton();

  } catch (e) {
    statusBar.innerHTML = `❌ Lỗi: ${e.message}. Em bấm thử lại nhé!`;
    btn.disabled = false;
  }
}

// =========================================================================
// 6. XUẤT BÀI LÀM VÀ BÀI SỬA RA FILE PDF IN ẤN
// =========================================================================
function renderExportPdfButton() {
  if (document.getElementById('btnExportPdfPWT1')) return;
  const statusBar = document.getElementById('status-bar');
  if (!statusBar) return;

  const btnPdf = document.createElement('button');
  btnPdf.id = 'btnExportPdfPWT1';
  btnPdf.type = 'button';
  btnPdf.className = 'btn-3d btn-3d-white';
  btnPdf.style.cssText = 'margin-left: 14px; padding: 6px 14px; font-size: 13px; font-weight: 900;';
  btnPdf.innerHTML = '🖨️ Xuất PDF Bài Làm & AI Sửa';
  btnPdf.onclick = () => window.exportPWT1ToPDF();
  statusBar.appendChild(btnPdf);
}

window.exportPWT1ToPDF = () => {
  const studentText = document.getElementById('studentEnglishInput').value.trim();
  const resultContent = document.getElementById('result-content').innerHTML;
  const title = currentExercise?.title || 'Pre-Writing Task 1';
  const targetBand = document.getElementById('bandTargetSelect').value.toUpperCase();

  const printWin = window.open('', '_blank');
  printWin.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title} - Trạm IELTS</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 30px; line-height: 1.6; color: #1e293b; }
        h1, h2, h3 { color: #1e40af; }
        .box { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 16px; margin: 16px 0; }
        table { width: 100%; border-collapse: collapse; margin: 14px 0; }
        th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; }
        th { background: #f1f5f9; }
        del.err { background: #fee2e2; color: #b91c1c; text-decoration: line-through; }
        ins.fix { background: #dcfce7; color: #15803d; text-decoration: none; font-weight: bold; }
        mark.vocab { background: #fef3c7; color: #b45309; }
        @media print { button { display: none; } }
      </style>
    </head>
    <body>
      <h2>Trạm IELTS - Báo Cáo Sửa Bài Pre-Writing Task 1</h2>
      <h3>Đề bài: ${title} (Mục tiêu: ${targetBand})</h3>
      <hr>
      <div class="box">
        <h4>✍️ Bản Dịch Của Học Viên:</h4>
        <p style="white-space: pre-wrap;">${studentText}</p>
      </div>
      <div>
        <h4>🎯 Chi Tiết Sửa 2 Tầng Từ AI Gemini:</h4>
        ${resultContent}
      </div>
      <script>window.onload = function() { window.print(); }</script>
    </body>
    </html>
  `);
  printWin.document.close();
};

// =========================================================================
// 7. TRỢ GIẢNG AI STACKING Q&A
// =========================================================================
function resetQAChatBox() {
  const container = document.getElementById('qaChatContainer');
  if (container) container.innerHTML = '';
}

window.askPWT1Assistant = async () => {
  const inputEl = document.getElementById('qaInputText');
  const chatContainer = document.getElementById('qaChatContainer');
  const question = inputEl?.value.trim();
  if (!question || !currentExercise) return;

  inputEl.value = '';

  const qBubble = document.createElement('div');
  qBubble.style.cssText = 'background:#EFF6FF; border:1.5px solid #BFDBFE; border-radius:12px; padding:10px 14px; margin-bottom:10px; font-weight:800; font-size:13.5px; color:#1E40AF;';
  qBubble.innerHTML = `🙋 <b>Em hỏi:</b> ${question}`;
  chatContainer.appendChild(qBubble);

  const aBubble = document.createElement('div');
  aBubble.style.cssText = 'background:#FFFFFF; border:1.5px solid #E8E2D8; border-left:4px solid #2563EB; border-radius:12px; padding:12px 16px; margin-bottom:14px; font-size:14px; line-height:1.6; color:#261F1D;';
  aBubble.innerHTML = `<i>⏳ Trợ giảng AI đang suy nghĩ câu trả lời...</i>`;
  chatContainer.appendChild(aBubble);
  chatContainer.scrollTop = chatContainer.scrollHeight;

  const targetBand = document.getElementById('bandTargetSelect').value;
  const promptVN = currentExercise[targetBand] || currentExercise.band8;

  const prompt = `
Bạn là Trợ giảng IELTS Writing Task 1 thân thiện, xưng "Anh" và gọi học sinh là "Em".
ĐỀ BÀI: ${currentExercise.prompt}
DÀN Ý GỢI Ý TIẾNG VIỆT: ${promptVN}
CÂU HỎI CỦA HỌC SINH: "${question}"

YÊU CẦU:
1. Giải thích ngắn gọn, đi thẳng vào câu hỏi của Em.
2. Nếu Em hỏi về cách dịch hoặc bí từ, hãy hướng dẫn từng bước cấu trúc câu.
3. Nếu Em yêu cầu hạ độ khó từ vựng, hãy cho ví dụ đơn giản (Band 5.5 - 6.0) trước, sau đó mới nâng lên từ Band 7.0 để Em hiểu bản chất.
`;

  let responseText = '';
  try {
    await streamGeminiPWT1([{ text: prompt }], (chunk) => {
      responseText += chunk;
      aBubble.innerHTML = marked.parse(responseText);
      chatContainer.scrollTop = chatContainer.scrollHeight;
    });
  } catch (err) {
    aBubble.innerHTML = `⚠️ Lỗi trả lời: ${err.message}. Em thử hỏi lại nhé!`;
  }
};
