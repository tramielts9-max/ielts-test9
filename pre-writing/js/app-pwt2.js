/**
 * pre-writing/js/app-pwt2.js - Điều khiển Pre-Writing Task 2 Duolingo 3D
 * BẢN FULL ĐẦY ĐỦ 100% - AUTO-SAVE THỜI GIAN THỰC, NÚT LƯU TẠM DRAFT,
 * FIX DEEP-LINK XEM LẠI TỪ TRANG CHỦ & FIX HIỂN THỊ CÂU GỐC TRONG AI SỬA BÀI
 */

import { streamGeminiPWT2 } from './api-pwt2.js';

let manifestData = [];
let currentEssay = null;
let activeEssayIdx = 0;
let activeEssayId = null;

const CLOUD_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyNErQQFdciAQM0k9KUrACtpX7rxKkopjChYAC2Ubwj5MGzFOeekDEGs8C1n7P9cNR6vg/exec";

window.addEventListener('DOMContentLoaded', async () => {
  setupWorkspaceListeners();
  injectSaveDraftButtonPWT2();
  await initEssayList();
  handleUrlDeepLinkPWT2();
});

// =========================================================================
// 1. QUẢN LÝ LƯU TRỮ BẢN NHÁP (DRAFT AUTO-SAVE & RESUME)
// =========================================================================
function getPWT2DraftKey(essayId) {
  return `ielts_pwt2_draft_${essayId}`;
}

function savePWT2Draft(essayId, text) {
  if (!essayId) return;
  const draftData = {
    text: text,
    updatedAt: new Date().toISOString()
  };
  localStorage.setItem(getPWT2DraftKey(essayId), JSON.stringify(draftData));
}

function loadPWT2Draft(essayId) {
  if (!essayId) return null;
  try {
    const raw = localStorage.getItem(getPWT2DraftKey(essayId));
    return raw ? JSON.parse(raw) : null;
  } catch(e) {
    return null;
  }
}

function clearPWT2Draft(essayId) {
  if (!essayId) return;
  localStorage.removeItem(getPWT2DraftKey(essayId));
}

// Tự động chèn nút "💾 Lưu Tạm Bài Luận" cạnh nút Chấm bài
function injectSaveDraftButtonPWT2() {
  const gradeBtn = document.getElementById('btnGrading');
  if (!gradeBtn || document.getElementById('btnSaveDraftPWT2')) return;

  const draftBtn = document.createElement('button');
  draftBtn.id = 'btnSaveDraftPWT2';
  draftBtn.type = 'button';
  draftBtn.className = 'btn-3d btn-3d-white';
  draftBtn.style.cssText = 'padding: 12px 18px; font-size: 13.5px; font-weight: 900; margin-right: 10px; border-color: #FECDD3; color: #BE123C;';
  draftBtn.innerHTML = '💾 Lưu Tạm Bài Luận';
  draftBtn.onclick = () => {
    const text = document.getElementById('studentEssayInput')?.value || '';
    savePWT2Draft(activeEssayId, text);
    alert("✅ Đã lưu tạm câu luận của em thành công! Lần sau mở bài này em sẽ được viết tiếp.");
  };

  gradeBtn.parentNode.insertBefore(draftBtn, gradeBtn);
}

// =========================================================================
// 2. QUẢN LÝ LƯU TRỮ TỪNG LẦN LÀM (ATTEMPTS: LẦN 1, LẦN 2...)
// =========================================================================
function getPWT2StorageKey(essayId) {
  return `ielts_pwt2_attempts_${essayId}`;
}

function getPWT2Attempts(essayId) {
  try {
    const raw = localStorage.getItem(getPWT2StorageKey(essayId));
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function savePWT2Attempt(essayId, attemptData) {
  try {
    const attempts = getPWT2Attempts(essayId);
    attempts.unshift(attemptData);
    localStorage.setItem(getPWT2StorageKey(essayId), JSON.stringify(attempts));
  } catch (e) {
    console.warn("Lỗi lưu lần làm PWT2:", e);
  }
}

// =========================================================================
// 3. XỬ LÝ DEEP-LINK NÚT "XEM LẠI" TỪ TRANG CHỦ
// =========================================================================
function handleUrlDeepLinkPWT2() {
  const urlParams = new URLSearchParams(window.location.search);
  const attemptId = urlParams.get('attemptId');
  const testParam = urlParams.get('test') || urlParams.get('file');

  // Trường hợp 1: Có attemptId từ trang chủ
  if (attemptId) {
    try {
      const localHist = JSON.parse(localStorage.getItem('ielts_local_history') || '[]');
      const foundAttempt = localHist.find(a => a.id === attemptId);

      if (foundAttempt) {
        const foundIdx = manifestData.findIndex(item => 
          foundAttempt.testTitle.includes(item.id) || 
          foundAttempt.testTitle.includes(item.title)
        );
        const idxToLoad = foundIdx !== -1 ? foundIdx : 0;
        const selectBox = document.getElementById('essaySelect');
        if (selectBox) selectBox.value = idxToLoad;

        activeEssayIdx = idxToLoad;
        loadEssayDetail(manifestData[idxToLoad].file).then(() => {
          restoreAttemptToWorkspacePWT2(foundAttempt);
        });
        return;
      }
    } catch(e) {
      console.warn("Lỗi deep-link PWT2 attemptId:", e);
    }
  }

  // Trường hợp 2: Có test/file trực tiếp trên URL
  if (testParam) {
    const foundIdx = manifestData.findIndex(item => item.file.includes(testParam) || item.id === testParam);
    if (foundIdx !== -1) {
      activeEssayIdx = foundIdx;
      const selectBox = document.getElementById('essaySelect');
      if (selectBox) selectBox.value = foundIdx;
      loadEssayDetail(manifestData[foundIdx].file);
    }
  }
}

function restoreAttemptToWorkspacePWT2(attempt) {
  const inputEl = document.getElementById('studentEssayInput');
  const resultBox = document.getElementById('result-box');
  const resultContent = document.getElementById('result-content');
  const statusBar = document.getElementById('status-bar');

  let essayText = '';
  let aiText = '';

  if (attempt.details && attempt.details.includes('BẢN VIẾT HỌC VIÊN:')) {
    const parts = attempt.details.split('BẢN VIẾT HỌC VIÊN:');
    if (parts[1]) {
      const subParts = parts[1].split('ĐÁNH GIÁ 2 TẦNG:');
      essayText = subParts[0].trim();
      aiText = subParts[1] ? subParts[1].trim() : '';
    }
  } else if (attempt.studentText) {
    essayText = attempt.studentText;
    aiText = attempt.aiFeedback || '';
  }

  if (inputEl) {
    inputEl.value = essayText;
    updateWordCount();
  }

  if (resultBox && resultContent) {
    resultBox.style.display = 'block';
    statusBar.innerHTML = `📜 ĐANG XEM LẠI BÀI LUẬN: <b>${attempt.testTitle}</b> (${attempt.timestamp}) — Điểm: <b>${attempt.score}</b>`;
    resultContent.innerHTML = marked.parse(aiText || '<i>Chưa có dữ liệu bài sửa chi tiết.</i>');
    resultBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
    renderExportPdfButtonPWT2();
  }
}

async function initEssayList() {
  try {
    const res = await fetch('data/pwt2-manifest.json');
    manifestData = await res.json();
    renderEssaySelectOptions();
    if (manifestData.length > 0 && !activeEssayId) {
      activeEssayIdx = 0;
      await loadEssayDetail(manifestData[0].file);
    }
  } catch (err) {
    console.error("Lỗi đọc danh mục Task 2:", err);
  }
}

function renderEssaySelectOptions() {
  const selectBox = document.getElementById('essaySelect');
  if (!selectBox) return;
  selectBox.innerHTML = '';

  manifestData.forEach((item, idx) => {
    const attempts = getPWT2Attempts(item.id || item.file);
    const count = attempts.length;
    const draft = loadPWT2Draft(item.id || item.file);
    const opt = document.createElement('option');
    opt.value = idx;
    opt.innerText = `${count > 0 ? `✓ [Đã làm ${count} lần] ` : (draft ? `● [Dở] ` : '')}${item.title}`;
    selectBox.appendChild(opt);
  });
}

async function onEssaySelected(e) {
  activeEssayIdx = e.target.value;
  const item = manifestData[activeEssayIdx];
  if (item) {
    await loadEssayDetail(item.file);
  }
}

async function loadEssayDetail(filePath) {
  try {
    const res = await fetch(filePath);
    currentEssay = await res.json();
    activeEssayId = currentEssay.id || manifestData[activeEssayIdx]?.id || filePath;
    currentEssay.id = activeEssayId;

    // Phục hồi nháp nếu có
    const draft = loadPWT2Draft(activeEssayId);
    const inputEl = document.getElementById('studentEssayInput');
    if (draft && inputEl) {
      inputEl.value = draft.text || '';
      updateWordCount();
    } else {
      if (inputEl) inputEl.value = '';
      updateWordCount();
    }

    updateEssayView();
    renderWorkspacePastAttemptsBar();
    resetQAChatBox();
  } catch (err) {
    console.error("Lỗi tải chi tiết bài Task 2:", err);
  }
}

function updateEssayView() {
  if (!currentEssay) return;
  const targetBand = document.getElementById('bandTargetSelect').value;

  document.getElementById('essayTypeBadge').innerText = currentEssay.type || 'Task 2 Essay';

  const promptText = `TOPIC:\n${currentEssay.prompt}\n\n--- BẢN MẪU DỊCH Ý TƯỞNG (${targetBand.toUpperCase()}): ---\n\n${currentEssay[targetBand] || currentEssay.band8}`;
  document.getElementById('vietnameseSourceText').innerText = promptText;
}

function updateWordCount() {
  const text = document.getElementById('studentEssayInput').value.trim();
  const words = text ? text.split(/\s+/).length : 0;
  document.getElementById('wordCountDisplay').innerText = `${words} từ`;
}

function setupWorkspaceListeners() {
  document.getElementById('essaySelect')?.addEventListener('change', onEssaySelected);
  document.getElementById('bandTargetSelect')?.addEventListener('change', updateEssayView);
  
  const inputEl = document.getElementById('studentEssayInput');
  let autoSaveTimeout = null;

  inputEl?.addEventListener('input', () => {
    updateWordCount();
    clearTimeout(autoSaveTimeout);
    autoSaveTimeout = setTimeout(() => {
      savePWT2Draft(activeEssayId, inputEl.value);
    }, 1500);
  });

  document.getElementById('btnGrading')?.addEventListener('click', runEvaluation);
}

// =========================================================================
// 4. THANH HIỂN THỊ CÁC LẦN NỘP BÀI CŨ
// =========================================================================
function renderWorkspacePastAttemptsBar() {
  let bar = document.getElementById('pwt2PastAttemptsBar');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'pwt2PastAttemptsBar';
    const workspace = document.querySelector('.pwt2-workspace');
    if (workspace) workspace.parentNode.insertBefore(bar, workspace);
  }

  const attempts = getPWT2Attempts(activeEssayId);
  if (attempts.length === 0) {
    bar.innerHTML = '';
    return;
  }

  let html = `
    <div style="background: #FFF1F2; border: 2px solid #FECDD3; border-radius: 16px; padding: 12px 18px; margin-bottom: 18px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
      <div>
        <b style="color: #9F1239; font-size: 14px;">📜 Bài luận này Em đã làm ${attempts.length} lần trước đây:</b>
        <div style="display: flex; gap: 8px; margin-top: 6px; flex-wrap: wrap;">
  `;

  attempts.forEach((att, idx) => {
    html += `
      <button type="button" onclick="window.viewPastAttemptDetailPWT2(${idx})" style="background: #FFFFFF; border: 1.5px solid #FDA4AF; border-bottom: 3px solid #E11D48; padding: 4px 10px; border-radius: 8px; font-weight: 800; font-size: 12.5px; cursor: pointer; color: #9F1239;">
        Lần ${att.attemptNum || (attempts.length - idx)}: <b>${att.score}</b> (${att.timestamp.split(' - ')[0]})
      </button>
    `;
  });

  html += `
        </div>
      </div>
      <span style="font-size: 12px; color: #BE123C; font-weight: 700;">Nhấp vào lần làm để xem lại bản sửa cũ</span>
    </div>
  `;

  bar.innerHTML = html;
}

window.viewPastAttemptDetailPWT2 = (idx) => {
  const attempts = getPWT2Attempts(activeEssayId);
  const att = attempts[idx];
  if (!att) return;

  document.getElementById('studentEssayInput').value = att.studentText || '';
  updateWordCount();

  const resultBox = document.getElementById('result-box');
  const resultContent = document.getElementById('result-content');
  const statusBar = document.getElementById('status-bar');

  resultBox.style.display = 'block';
  statusBar.innerHTML = `📜 ĐANG XEM LẠI BẢN SỬA: <b>LẦN ${att.attemptNum || 1}</b> (${att.timestamp}) — Điểm: <b>${att.score}</b>`;
  resultContent.innerHTML = marked.parse(att.aiFeedback || '');
  resultBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
  renderExportPdfButtonPWT2();
};

// =========================================================================
// 5. CHẤM ĐIỂM AI 2 TẦNG (BẮT BUỘC TRÍCH DẪN NGUYÊN VĂN CÂU HỌC SINH VIẾT)
// =========================================================================
async function runEvaluation() {
  const studentText = document.getElementById('studentEssayInput').value.trim();
  const sourceVN = document.getElementById('vietnameseSourceText').innerText.trim();

  if (!studentText) {
    alert("⚠️ Em hãy viết câu hoặc bài luận trước khi bấm chấm nhé!");
    return;
  }

  const btn = document.getElementById('btnGrading');
  const resultBox = document.getElementById('result-box');
  const resultContent = document.getElementById('result-content');
  const statusBar = document.getElementById('status-bar');

  btn.disabled = true;
  resultBox.style.display = 'block';
  resultContent.innerHTML = '';
  statusBar.innerHTML = "⏳ Thầy đang phân tích lập luận & nâng cấp từ vựng C1-C2 cho bài luận Task 2 của em...";

  const systemInstruction = `
Bạn là Chuyên gia IELTS Writing Task 2 khắt khe nhưng tận tình.
QUY TẮC BẮT BUỘC: Xưng "Anh" và gọi học sinh là "Em".
QUY TẮC ĐỊNH DẠNG: Dùng cú pháp Markdown chuẩn (#, ##, ###, ####). Dùng thẻ inline:
<del class="err">từ sai/gượng</del>
<ins class="fix">từ sửa chuẩn</ins>
<mark class="vocab">Collocation C1-C2 Task 2</mark>
<span class="teacher-note">💬 (lời dặn của Anh)</span>

QUY TẮC BẮT BUỘC TRONG PHẦN 1:
- KHÔNG ĐƯỢC NUỐT CÂU GỐC CỦA HỌC SINH.
- MỖI CÂU ĐỀU PHẢI TRÍCH DẪN RÕ RÀNG:
  "### 📌 Câu [Số]: [CÂU GỐC CỦA EM ĐÃ VIẾT - BẮT BUỘC TRÍCH DẪN NGUYÊN VĂN]"
  "*Đối chiếu ý tưởng: [Ý tưởng tiếng Việt]*"
  trước khi tiến hành Bước 1 (Tầng 1) và Bước 2 (Tầng 2).

XUẤT THEO CẤU TRÚC:
# PHẦN 1: SỬA TỪNG CÂU THEO NGUYÊN LÝ 2 TẦNG (TASK 2 ESSAY)
---
### 📌 Câu [Số]: "[CÂU GỐC CỦA EM ĐÃ VIẾT - TRÍCH DẪN NGUYÊN VĂN]"
*Đối chiếu ý tưởng: "[Ý tưởng tiếng Việt tương ứng]"*
#### TẦNG 1: SỬA LỖI NGỮ PHÁP, VĂN PHONG VÀ CHINGLISH (Band 6.5 - 7.0)
- **Anh sửa trực tiếp:** [Câu sửa]
- **Giải thích lỗi sai:** [Word-by-word, collocation chưa tự nhiên, sai mệnh đề quan hệ...]
- **Bản sạch lỗi:** "[Câu chuẩn xác]"

#### TẦNG 2: NÂNG TẦM ACADEMIC BAND 8.0+
- **Biến hóa với lập luận đanh thép & Collocations C1-C2:** [Câu Band 8.0+]
- **Từ vựng & Cấu trúc ăn điểm:** [Cụm tầng 1 ➔ Cụm Band 8]
- **Bản nâng cấp:** "[Câu đỉnh cao]"
---

# PHẦN 2: BẢNG ĐÁNH GIÁ 4 TIÊU CHÍ TASK 2
| Task Response | Coherence & Cohesion | Lexical Resource | Grammatical Range & Accuracy |
|---|---|---|---|
| Band [X] | Band [X] | Band [X] | Band [X] |

> ### OVERALL BAND DỰ KIẾN: [X]/9.0

# PHẦN 3: NHẬN XÉT TƯ DUY PHẢN BIỆN (CRITICAL THINKING)
[Chỉ rõ cách triển khai luận điểm, dẫn chứng, phân tích nguyên nhân - kết quả]

# PHẦN 4: BÀI LUẬN HOÀN CHỈNH SẠCH LỖI (BAND 7.0)
> [Tổng hợp các câu sửa tầng 1]

# PHẦN 5: BÀI LUẬN BẢN XỨ ĐẲNG CẤP (BAND 8.5)
> [Tổng hợp các câu nâng cấp tầng 2]
`;

  const payload = [
    { text: systemInstruction + `\n\nĐề bài: ${currentEssay.prompt}\nThể loại: ${currentEssay.type}\nDàn ý tiếng Việt:\n${sourceVN}\n\nBài học sinh:\n${studentText}` }
  ];

  let fullText = "";
  try {
    const usedModel = await streamGeminiPWT2(payload, (chunk) => {
      fullText += chunk;
      resultContent.innerHTML = marked.parse(fullText);
    });
    statusBar.innerHTML = `✅ Thầy đã chấm xong bằng model [${usedModel}]. Em nghiền ngẫm các Collocations Tầng 2 nhé!`;

    // Xóa nháp vì đã nộp bài thành công
    clearPWT2Draft(activeEssayId);

    // LƯU KẾT QUẢ VÀO ATTEMPTS RIÊNG BIỆT
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')} - ${String(now.getDate()).padStart(2,'0')}/${String(now.getMonth()+1).padStart(2,'0')}/${now.getFullYear()}`;
    const sName = localStorage.getItem('ielts_student_name') || 'Học viên';
    const sEmail = localStorage.getItem('ielts_student_email') || '';

    const bandMatch = fullText.match(/OVERALL BAND DỰ KIẾN:\s*([0-9.]+)/i) || fullText.match(/Band\s*([0-9.]+)/i);
    const bandScore = bandMatch ? `Band ${bandMatch[1]}` : "Đã dịch xong";

    const attempts = getPWT2Attempts(activeEssayId);
    const newAttemptNum = attempts.length + 1;

    const newAttemptRecord = {
      attemptNum: newAttemptNum,
      timestamp: timeStr,
      score: bandScore,
      studentText: studentText,
      aiFeedback: fullText
    };

    savePWT2Attempt(activeEssayId, newAttemptRecord);
    renderWorkspacePastAttemptsBar();
    renderEssaySelectOptions();

    // LƯU LỊCH SỬ CHUNG TRANG CHỦ & BẮN LÊN DRIVE
    const attemptSnapshot = {
      id: "attempt_pwt2_" + Date.now(),
      timestamp: `${timeStr} (Lần ${newAttemptNum})`,
      testTitle: `Pre-Writing T2: ${currentEssay?.title || manifestData[activeEssayIdx]?.title || 'Dịch luận'} (Lần ${newAttemptNum})`,
      studentName: sName,
      studentEmail: sEmail,
      score: bandScore,
      timeSpent: "N/A",
      details: `BẢN VIẾT HỌC VIÊN:\n${studentText}\n\nĐÁNH GIÁ 2 TẦNG:\n${fullText}`,
      pageUrl: `pre-writing/index-pwt2.html?test=${activeEssayId}`,
      moduleType: "pre_writing_t2"
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

    renderExportPdfButtonPWT2();
    btn.disabled = false;

  } catch (e) {
    statusBar.innerHTML = `❌ Lỗi: ${e.message}. Em bấm thử lại nhé!`;
    btn.disabled = false;
  }
}

// =========================================================================
// 6. XUẤT PDF IN ẤN CHO TASK 2
// =========================================================================
function renderExportPdfButtonPWT2() {
  if (document.getElementById('btnExportPdfPWT2')) return;
  const statusBar = document.getElementById('status-bar');
  if (!statusBar) return;

  const btnPdf = document.createElement('button');
  btnPdf.id = 'btnExportPdfPWT2';
  btnPdf.type = 'button';
  btnPdf.className = 'btn-3d btn-3d-white';
  btnPdf.style.cssText = 'margin-left: 14px; padding: 6px 14px; font-size: 13px; font-weight: 900;';
  btnPdf.innerHTML = '🖨️ Xuất PDF Bài Luận & AI Sửa';
  btnPdf.onclick = () => window.exportPWT2ToPDF();
  statusBar.appendChild(btnPdf);
}

window.exportPWT2ToPDF = () => {
  const studentText = document.getElementById('studentEssayInput').value.trim();
  const resultContent = document.getElementById('result-content').innerHTML;
  const title = currentEssay?.title || manifestData[activeEssayIdx]?.title || 'Pre-Writing Task 2';
  const targetBand = document.getElementById('bandTargetSelect').value.toUpperCase();

  const printWin = window.open('', '_blank');
  printWin.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title} - Trạm IELTS</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 30px; line-height: 1.6; color: #1e293b; }
        h1, h2, h3 { color: #be123c; }
        .box { background: #fff1f2; border: 1px solid #fecdd3; border-radius: 8px; padding: 16px; margin: 16px 0; }
        table { width: 100%; border-collapse: collapse; margin: 14px 0; }
        th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; }
        th { background: #f1f5f9; }
        del.err { background: #fee2e2; color: #b91c1c; text-decoration: line-through; }
        ins.fix { background: #dcfce7; color: #15803d; text-decoration: none; font-weight: bold; }
        mark.vocab { background: #fef3c7; color: #92400e; }
        @media print { button { display: none; } }
      </style>
    </head>
    <body>
      <h2>Trạm IELTS - Báo Cáo Sửa Bài Pre-Writing Task 2</h2>
      <h3>Đề bài: ${title} (Mục tiêu: ${targetBand})</h3>
      <hr>
      <div class="box">
        <h4>✍️ Bài Viết / Luận Của Học Viên:</h4>
        <p style="white-space: pre-wrap;">${studentText}</p>
      </div>
      <div>
        <h4>🎯 Chi Tiết Đánh Giá 2 Tầng & Collocations:</h4>
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

window.askPWT2Assistant = async () => {
  const inputEl = document.getElementById('qaInputText');
  const chatContainer = document.getElementById('qaChatContainer');
  const question = inputEl?.value.trim();
  if (!question || !currentEssay) return;

  inputEl.value = '';

  const qBubble = document.createElement('div');
  qBubble.style.cssText = 'background:#FFF1F2; border:1.5px solid #FECDD3; border-radius:12px; padding:10px 14px; margin-bottom:10px; font-weight:800; font-size:13.5px; color:#9F1239;';
  qBubble.innerHTML = `🙋 <b>Em hỏi:</b> ${question}`;
  chatContainer.appendChild(qBubble);

  const aBubble = document.createElement('div');
  aBubble.style.cssText = 'background:#FFFFFF; border:1.5px solid #E8E2D8; border-left:4px solid #E11D48; border-radius:12px; padding:12px 16px; margin-bottom:14px; font-size:14px; line-height:1.6; color:#261F1D;';
  aBubble.innerHTML = `<i>⏳ Trợ giảng AI đang phân tích luận điểm...</i>`;
  chatContainer.appendChild(aBubble);
  chatContainer.scrollTop = chatContainer.scrollHeight;

  const targetBand = document.getElementById('bandTargetSelect').value;
  const promptVN = currentEssay[targetBand] || currentEssay.band8;

  const prompt = `
Bạn là Trợ giảng IELTS Writing Task 2 chuyên nghiệp, xưng "Anh" và gọi học sinh là "Em".
ĐỀ BÀI TASK 2: ${currentEssay.prompt}
DÀN Ý Ý TƯỞNG GỢI Ý: ${promptVN}
CÂU HỎI CỦA HỌC SINH: "${question}"

YÊU CẦU:
1. Giải thích trọng tâm cách phát triển luận điểm hoặc ví dụ chứng minh.
2. Nếu Em yêu cầu hạ độ khó từ vựng hoặc viết câu đơn giản, hãy hướng dẫn câu từ đơn giản, sau đó mới nâng cấp lên C1-C2.
`;

  let responseText = '';
  try {
    await streamGeminiPWT2([{ text: prompt }], (chunk) => {
      responseText += chunk;
      aBubble.innerHTML = marked.parse(responseText);
      chatContainer.scrollTop = chatContainer.scrollHeight;
    });
  } catch (err) {
    aBubble.innerHTML = `⚠️ Lỗi trả lời: ${err.message}. Em thử hỏi lại nhé!`;
  }
};
