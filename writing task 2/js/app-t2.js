/**
 * writing task 2/js/app-t2.js
 * BỘ ĐIỀU KHIỂN TASK 2 THEO PHONG CÁCH DUOLINGO X TRẠM IELTS
 * BẢN FULL ĐẦY ĐỦ 100% - AUTO-SAVE THỜI GIAN THỰC, NÚT LƯU TẠM DRAFT,
 * FIX DEEP-LINK XEM LẠI TỪ TRANG CHỦ & FIX HIỂN THỊ CÂU GỐC TRONG AI SỬA BÀI
 */

import { streamGeminiTask2 } from './api-t2.js';

let manifestData = [];
let currentItemJson = null;
let currentCategory = "ALL";
let activeExerciseKey = null;

// Bộ đếm thời gian xem gợi ý dàn ý
let guideTimerInterval = null;
let guideTotalOpenSeconds = 0;
let isGuideOpen = false;

// Đồng hồ bấm giờ làm bài (Stopwatch)
let stopwatchInterval = null;
let stopwatchSeconds = 0;
let isStopwatchRunning = false;

const CATEGORIES = ["ALL", "Opinion (Agree/Disagree)", "Discuss Both Views", "Advantage & Disadvantage", "Cause & Effect / Solution", "Two-part Questions"];
const CLOUD_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyNErQQFdciAQM0k9KUrACtpX7rxKkopjChYAC2Ubwj5MGzFOeekDEGs8C1n7P9cNR6vg/exec";

marked.setOptions({ breaks: true, gfm: true });

document.addEventListener('DOMContentLoaded', async () => {
  setupWorkspaceListeners();
  injectSaveDraftButton();
  await loadManifestAndInitPortal();
  handleUrlDeepLink();
});

// =========================================================================
// 1. QUẢN LÝ LƯU TRỮ BẢN NHÁP (DRAFT AUTO-SAVE & RESUME)
// =========================================================================
function getWT2DraftKey(key) {
  return `ielts_wt2_draft_${key}`;
}

function saveWT2Draft(key, text, elapsedSec = 0) {
  if (!key) return;
  const draftData = {
    text: text,
    stopwatchSeconds: elapsedSec,
    guideSeconds: guideTotalOpenSeconds,
    updatedAt: new Date().toISOString()
  };
  localStorage.setItem(getWT2DraftKey(key), JSON.stringify(draftData));
}

function loadWT2Draft(key) {
  if (!key) return null;
  try {
    const raw = localStorage.getItem(getWT2DraftKey(key));
    return raw ? JSON.parse(raw) : null;
  } catch(e) {
    return null;
  }
}

function clearWT2Draft(key) {
  if (!key) return;
  localStorage.removeItem(getWT2DraftKey(key));
}

// Tự động chèn nút "💾 Lưu Tạm Bài Làm" vào cạnh nút Nộp Bài
function injectSaveDraftButton() {
  const submitBtn = document.getElementById('btnSubmitGrading');
  if (!submitBtn || document.getElementById('btnSaveDraftWT2')) return;

  const draftBtn = document.createElement('button');
  draftBtn.id = 'btnSaveDraftWT2';
  draftBtn.type = 'button';
  draftBtn.className = 'btn-3d btn-3d-white';
  draftBtn.style.cssText = 'padding: 12px 18px; font-size: 13.5px; font-weight: 900; margin-right: 10px; border-color: #D8B4FE; color: #6D28D9;';
  draftBtn.innerHTML = '💾 Lưu Tạm (Làm Tiếp Sau)';
  draftBtn.onclick = () => {
    const essay = document.getElementById('studentEssayInput')?.value || '';
    saveWT2Draft(activeExerciseKey, essay, stopwatchSeconds);
    alert(`✅ Đã lưu tạm bài luận thành công (${formatTime(stopwatchSeconds)} thời gian viết). Lần sau mở bài này em sẽ được viết tiếp!`);
  };

  submitBtn.parentNode.insertBefore(draftBtn, submitBtn);
}

// =========================================================================
// 2. QUẢN LÝ LƯU TRỮ TỪNG LẦN LÀM (ATTEMPTS: LẦN 1, LẦN 2...)
// =========================================================================
function getWT2StorageKey(key) {
  return `ielts_wt2_attempts_${key}`;
}

function getWT2Attempts(key) {
  try {
    const raw = localStorage.getItem(getWT2StorageKey(key));
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveWT2Attempt(key, attemptData) {
  try {
    const attempts = getWT2Attempts(key);
    attempts.unshift(attemptData);
    localStorage.setItem(getWT2StorageKey(key), JSON.stringify(attempts));
  } catch (e) {
    console.warn("Lỗi lưu lần làm WT2:", e);
  }
}

function getCompletedRecord(title) {
  try {
    const list = JSON.parse(localStorage.getItem('ielts_local_history') || '[]');
    return list.find(item => item.testTitle && item.testTitle.includes(title));
  } catch (e) {
    return null;
  }
}

// =========================================================================
// 3. XỬ LÝ DEEP-LINK NÚT "XEM LẠI" TỪ TRANG CHỦ
// =========================================================================
function handleUrlDeepLink() {
  const urlParams = new URLSearchParams(window.location.search);
  const attemptId = urlParams.get('attemptId');
  const testParam = urlParams.get('test') || urlParams.get('file');

  // Trường hợp 1: Nhấp "Xem lại" có attemptId từ trang chủ
  if (attemptId) {
    try {
      const localHist = JSON.parse(localStorage.getItem('ielts_local_history') || '[]');
      const foundAttempt = localHist.find(a => a.id === attemptId);

      if (foundAttempt) {
        // Tìm bài tương ứng trong manifest
        const matchedItem = manifestData.find(item => 
          foundAttempt.testTitle.includes(item.id) || 
          foundAttempt.testTitle.includes(item.title) ||
          (foundAttempt.details && foundAttempt.details.includes(item.title))
        ) || manifestData[0];

        if (matchedItem) {
          const itemKey = matchedItem.id || matchedItem.title;
          window.startLessonTask2(matchedItem.file, matchedItem.type, itemKey).then(() => {
            restoreAttemptToWorkspace(foundAttempt);
          });
          return;
        }
      }
    } catch(e) {
      console.warn("Lỗi xử lý deep-link Task 2 attemptId:", e);
    }
  }

  // Trường hợp 2: Có test/file trực tiếp trên URL
  if (testParam) {
    const matchedItem = manifestData.find(item => item.file.includes(testParam) || item.id === testParam);
    if (matchedItem) {
      const itemKey = matchedItem.id || matchedItem.title;
      window.startLessonTask2(matchedItem.file, matchedItem.type, itemKey);
    }
  }
}

function restoreAttemptToWorkspace(attempt) {
  const essayInput = document.getElementById('studentEssayInput');
  const resultBox = document.getElementById('resultBox');
  const resultMarkdown = document.getElementById('resultMarkdown');
  const statusBar = document.getElementById('statusBar');

  let essayText = '';
  let aiText = '';

  if (attempt.details && attempt.details.includes('BÀI VIẾT:')) {
    const parts = attempt.details.split('BÀI VIẾT:');
    if (parts[1]) {
      const subParts = parts[1].split('NHẬN XÉT AI:');
      essayText = subParts[0].trim();
      aiText = subParts[1] ? subParts[1].trim() : '';
    }
  } else if (attempt.studentEssay) {
    essayText = attempt.studentEssay;
    aiText = attempt.aiFeedback || '';
  }

  if (essayInput) {
    essayInput.value = essayText;
    document.getElementById('wordCounter').innerText = `${essayText ? essayText.split(/\s+/).length : 0} từ`;
  }

  if (resultBox && resultMarkdown) {
    resultBox.style.display = 'block';
    statusBar.innerHTML = `📜 ĐANG XEM LẠI BÀI LUẬN: <b>${attempt.testTitle}</b> (Nộp lúc: ${attempt.timestamp}) — Điểm: <b>${attempt.score}</b>`;
    resultMarkdown.innerHTML = marked.parse(aiText || '<i>Chưa có dữ liệu bài chấm chi tiết.</i>');
    resultBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

// ==================== MÀN HÌNH 1: PORTAL LOGIC ====================
async function loadManifestAndInitPortal() {
  try {
    const res = await fetch('data/manifest-t2.json');
    manifestData = await res.json();
    renderTabs();
    renderCards();
  } catch (err) {
    console.error("Lỗi manifest Task 2:", err);
  }
}

function renderTabs() {
  const container = document.getElementById('categoryTabsContainer');
  if (!container) return;
  const labels = {
    "ALL": "Tất cả 116 đề",
    "Opinion (Agree/Disagree)": "1. Opinion",
    "Discuss Both Views": "2. Discussion",
    "Advantage & Disadvantage": "3. Adv & Disadv",
    "Cause & Effect / Solution": "4. Cause & Solution",
    "Two-part Questions": "5. Two-part"
  };

  container.innerHTML = CATEGORIES.map(cat => {
    const isActive = cat === currentCategory;
    return `
      <button onclick="window.switchTask2Category('${cat}')" class="t2-tab-btn ${isActive ? 'active' : ''}">
        ${labels[cat] || cat}
      </button>
    `;
  }).join('');
}

window.switchTask2Category = (cat) => {
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
    const attempts = getWT2Attempts(item.id || item.title);
    if (attempts.length > 0 || getCompletedRecord(item.title)) completedCount++;
  });
  
  const progBadge = document.getElementById('portalProgressBadge');
  if (progBadge) {
    progBadge.innerText = `${completedCount}/${manifestData.length} Đã viết`;
  }

  const filtered = manifestData.filter(item => {
    const matchCat = (currentCategory === "ALL") || item.type === currentCategory;
    const matchSearch = item.title.toLowerCase().includes(search) || item.id.toLowerCase().includes(search);
    return matchCat && matchSearch;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; padding: 40px; text-align: center; color: var(--text-muted); font-weight: 800; font-size: 16px; background: #FFFFFF; border-radius: 22px; border: 2.5px dashed var(--border-color);">
        Không tìm thấy bài luận phù hợp!
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(item => {
    const itemKey = item.id || item.title;
    const attempts = getWT2Attempts(itemKey);
    const rec = getCompletedRecord(item.title);
    const draft = loadWT2Draft(itemKey);
    const isDone = attempts.length > 0 || !!rec;
    const count = attempts.length > 0 ? attempts.length : (isDone ? 1 : 0);
    const latestScore = attempts.length > 0 ? attempts[0].score : (rec?.score || 'Đã viết');

    return `
      <div class="t2-lesson-card ${isDone ? 'is-done' : ''}">
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 10px;">
            <span class="badge" style="background: ${isDone ? '#DCFCE7' : '#F3E8FF'}; color: ${isDone ? '#166534' : '#7E22CE'};">
              ${item.type.split(' ')[0]}
            </span>
            ${isDone 
              ? `<span style="font-size: 12.5px; font-weight: 900; background: #DCFCE7; color: #166534; padding: 2px 8px; border-radius: 6px; border: 1px solid #86EFAC;">
                   ✓ Đã viết ${count} lần (${latestScore})
                 </span>` 
              : (draft ? `<span style="font-size: 12px; font-weight: 800; background: #FEF3C7; color: #92400E; padding: 2px 6px; border-radius: 6px;">● Đang viết dở</span>` : `<span style="font-size: 12.5px; font-weight: 800; color: var(--text-muted);">● Chưa làm</span>`)
            }
          </div>
          <h4 style="font-size: 16.5px; font-weight: 900; color: var(--text-main); margin: 6px 0 16px 0; line-height: 1.4;" title="${item.title}">
            ${item.title}
          </h4>
        </div>

        <div style="display: flex; gap: 8px; margin-top: 10px;">
          <button onclick="window.startLessonTask2('${item.file}', '${item.type}', '${itemKey}')" class="btn-3d ${isDone ? 'btn-3d-green' : 'btn-3d-violet'}" style="flex: 1; padding: 10px 14px; font-size: 13px;">
            ${isDone ? `+ Viết tiếp lần ${count + 1}` : (draft ? 'Viết tiếp bài dở →' : 'Vào phòng luyện viết →')}
          </button>
          ${isDone ? `
            <button onclick="window.openPastAttemptsTask2('${item.file}', '${item.type}', '${itemKey}')" class="btn-3d btn-3d-white" style="padding: 10px 12px; font-size: 13px;" title="Xem lại bài viết và nhận xét AI">
              👁️ Xem (${count})
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');
}

window.filterTask2Cards = () => renderCards();

// ==================== CHUYỂN QUA LẠI WORKSPACE ====================
window.startLessonTask2 = async (filePath, essayType, itemKey) => {
  activeExerciseKey = itemKey || filePath;
  document.getElementById('portalScreen').classList.add('hidden');
  document.getElementById('workspaceScreen').classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });

  document.getElementById('essayTypeBadge').innerText = essayType;

  // Khôi phục bản nháp dở dang nếu có
  const draft = loadWT2Draft(activeExerciseKey);
  const essayInput = document.getElementById('studentEssayInput');
  if (draft && essayInput) {
    essayInput.value = draft.text || '';
    resetStopwatch(draft.stopwatchSeconds || 0);
    guideTotalOpenSeconds = draft.guideSeconds || 0;
    updateGuideTimerBadge();
    const count = draft.text.trim() ? draft.text.trim().split(/\s+/).length : 0;
    document.getElementById('wordCounter').innerText = `${count} từ (Bản nháp)`;
  } else {
    if (essayInput) essayInput.value = '';
    resetStopwatch(0);
    resetGuideTimer();
    document.getElementById('wordCounter').innerText = `0 từ`;
  }

  try {
    const res = await fetch(filePath);
    currentItemJson = await res.json();
    document.getElementById('promptDisplayText').innerText = currentItemJson.prompt || "Writing Prompt...";
    renderGuideContent(currentItemJson.guide);
    renderWorkspacePastAttemptsBar();
    resetQAChatBox();
  } catch (err) {
    console.warn("Lỗi tải chi tiết:", err.message);
    renderGuideContent(null);
  }
};

window.openPastAttemptsTask2 = async (filePath, essayType, itemKey) => {
  await window.startLessonTask2(filePath, essayType, itemKey);
  setTimeout(() => {
    window.viewPastAttemptDetailWT2(0);
  }, 400);
};

window.backToPortalTask2 = () => {
  // Tự lưu nháp khi thoát
  const essay = document.getElementById('studentEssayInput')?.value || '';
  if (essay.trim()) {
    saveWT2Draft(activeExerciseKey, essay, stopwatchSeconds);
  }
  pauseStopwatch();

  document.getElementById('workspaceScreen').classList.add('hidden');
  document.getElementById('portalScreen').classList.remove('hidden');
  renderCards();
};

// ==================== WORKSPACE LISTENERS & AUTO-SAVE ====================
function setupWorkspaceListeners() {
  const essayInput = document.getElementById('studentEssayInput');
  let autoSaveTimeout = null;

  essayInput?.addEventListener('input', () => {
    const text = essayInput.value;
    const count = text.trim() ? text.trim().split(/\s+/).length : 0;
    document.getElementById('wordCounter').innerText = `${count} từ`;

    // Tự động bấm giờ khi học viên gõ từ đầu tiên
    if (count > 0 && !isStopwatchRunning && stopwatchSeconds === 0) {
      startStopwatch();
    }

    // Auto-save bản nháp sau 1.5 giây dừng gõ
    clearTimeout(autoSaveTimeout);
    autoSaveTimeout = setTimeout(() => {
      saveWT2Draft(activeExerciseKey, text, stopwatchSeconds);
    }, 1500);
  });

  document.getElementById('btnToggleGuide')?.addEventListener('click', toggleGuide);
  document.getElementById('btnSubmitGrading')?.addEventListener('click', submitEssay);
  document.getElementById('btnJumpToResult')?.addEventListener('click', () => {
    document.getElementById('resultBox')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  document.getElementById('btnStartStopwatch')?.addEventListener('click', startStopwatch);
  document.getElementById('btnPauseStopwatch')?.addEventListener('click', pauseStopwatch);
  document.getElementById('btnResetStopwatch')?.addEventListener('click', () => resetStopwatch(0));
}

// =========================================================================
// 4. THANH HIỂN THỊ CÁC LẦN NỘP BÀI CŨ
// =========================================================================
function renderWorkspacePastAttemptsBar() {
  let bar = document.getElementById('wt2PastAttemptsBar');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'wt2PastAttemptsBar';
    const workspace = document.querySelector('.workspace-t2');
    if (workspace) workspace.parentNode.insertBefore(bar, workspace);
  }

  const attempts = getWT2Attempts(activeExerciseKey);
  if (attempts.length === 0) {
    bar.innerHTML = '';
    return;
  }

  let html = `
    <div style="background: #FAF5FF; border: 2px solid #D8B4FE; border-radius: 16px; padding: 12px 18px; margin-bottom: 18px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
      <div>
        <b style="color: #6D28D9; font-size: 14px;">📜 Đề này Em đã viết ${attempts.length} lần trước đây:</b>
        <div style="display: flex; gap: 8px; margin-top: 6px; flex-wrap: wrap;">
  `;

  attempts.forEach((att, idx) => {
    html += `
      <button type="button" onclick="window.viewPastAttemptDetailWT2(${idx})" style="background: #FFFFFF; border: 1.5px solid #D8B4FE; border-bottom: 3px solid #7C3AED; padding: 4px 10px; border-radius: 8px; font-weight: 800; font-size: 12.5px; cursor: pointer; color: #6D28D9;">
        Lần ${att.attemptNum || (attempts.length - idx)}: <b>${att.score}</b> (${att.timestamp.split(' - ')[0]})
      </button>
    `;
  });

  html += `
        </div>
      </div>
      <span style="font-size: 12px; color: #7C3AED; font-weight: 700;">Nhấp vào lần làm để xem lại bản chấm cũ</span>
    </div>
  `;

  bar.innerHTML = html;
}

window.viewPastAttemptDetailWT2 = (idx) => {
  const attempts = getWT2Attempts(activeExerciseKey);
  const att = attempts[idx];
  if (!att) return;

  document.getElementById('studentEssayInput').value = att.studentEssay || '';
  const text = att.studentEssay || '';
  document.getElementById('wordCounter').innerText = `${text.trim() ? text.trim().split(/\s+/).length : 0} từ`;

  const resultBox = document.getElementById('resultBox');
  const resultMarkdown = document.getElementById('resultMarkdown');
  const statusBar = document.getElementById('statusBar');

  resultBox.style.display = 'block';
  statusBar.innerHTML = `📜 ĐANG XEM LẠI BÀI CHẤM: <b>LẦN ${att.attemptNum || 1}</b> (${att.timestamp}) — Điểm: <b>${att.score}</b>`;
  resultMarkdown.innerHTML = marked.parse(att.aiFeedback || '');
  resultBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

function formatTime(totalSecs) {
  const hrs = String(Math.floor(totalSecs / 3600)).padStart(2, '0');
  const mins = String(Math.floor((totalSecs % 3600) / 60)).padStart(2, '0');
  const secs = String(totalSecs % 60).padStart(2, '0');
  return `${hrs}:${mins}:${secs}`;
}

function startStopwatch() {
  if (isStopwatchRunning) return;
  isStopwatchRunning = true;
  document.getElementById('btnStartStopwatch').style.display = 'none';
  document.getElementById('btnPauseStopwatch').style.display = 'inline-block';
  stopwatchInterval = setInterval(() => {
    stopwatchSeconds++;
    document.getElementById('stopwatchDisplay').innerText = formatTime(stopwatchSeconds);
  }, 1000);
}

function pauseStopwatch() {
  if (!isStopwatchRunning) return;
  isStopwatchRunning = false;
  clearInterval(stopwatchInterval);
  document.getElementById('btnStartStopwatch').style.display = 'inline-block';
  document.getElementById('btnPauseStopwatch').style.display = 'none';
}

function resetStopwatch(initialSeconds = 0) {
  pauseStopwatch();
  stopwatchSeconds = initialSeconds;
  document.getElementById('stopwatchDisplay').innerText = formatTime(stopwatchSeconds);
}

function renderGuideContent(guideMarkdown) {
  const box = document.getElementById('guideContentBox');
  if (guideMarkdown) {
    box.innerHTML = marked.parse(guideMarkdown);
  } else {
    box.innerHTML = `<p>Đề bài này chưa có phần hướng dẫn chi tiết. Em hãy chủ động lập dàn ý và viết bài nhé!</p>`;
  }
}

function toggleGuide() {
  const box = document.getElementById('guideCollapsibleBox');
  const toggleText = document.getElementById('guideToggleText');
  const icon = document.getElementById('guideIcon');
  isGuideOpen = !isGuideOpen;

  if (isGuideOpen) {
    box.style.display = 'block';
    toggleText.innerText = 'THU GỌN HƯỚNG DẪN VIẾT';
    icon.innerText = '▲';
    startGuideTimer();
  } else {
    box.style.display = 'none';
    toggleText.innerText = 'MỞ HƯỚNG DẪN CHI TIẾT (TRẠM IELTS)';
    icon.innerText = '📖';
    stopGuideTimer();
  }
}

function startGuideTimer() {
  if (guideTimerInterval) clearInterval(guideTimerInterval);
  guideTimerInterval = setInterval(() => {
    guideTotalOpenSeconds++;
    updateGuideTimerBadge();
  }, 1000);
}

function stopGuideTimer() {
  if (guideTimerInterval) {
    clearInterval(guideTimerInterval);
    guideTimerInterval = null;
  }
}

function resetGuideTimer() {
  stopGuideTimer();
  guideTotalOpenSeconds = 0;
  isGuideOpen = false;
  document.getElementById('guideCollapsibleBox').style.display = 'none';
  document.getElementById('guideToggleText').innerText = 'MỞ HƯỚNG DẪN CHI TIẾT (TRẠM IELTS)';
  document.getElementById('guideIcon').innerText = '📖';
  updateGuideTimerBadge();
}

function updateGuideTimerBadge() {
  const badge = document.getElementById('guideTimerBadge');
  if (!badge) return;
  if (guideTotalOpenSeconds > 30) {
    badge.className = 'timer-tag assisted';
    badge.innerHTML = `⚠️ Có trợ giúp (${guideTotalOpenSeconds}s > 30s)`;
  } else {
    badge.className = 'timer-tag independent';
    badge.innerHTML = `🛡️ Tự lực (${guideTotalOpenSeconds}s / tối đa 30s)`;
  }
}

// =========================================================================
// 5. CHẤM BÀI AI (BẮT BUỘC TRÍCH DẪN CÂU GỐC CỦA HỌC SINH)
// =========================================================================
async function submitEssay() {
  const essay = document.getElementById('studentEssayInput').value.trim();
  if (!essay) {
    alert("⚠️ Em vui lòng viết bài Task 2 trước khi nộp nhé!");
    return;
  }

  stopGuideTimer();
  pauseStopwatch();

  const isAssisted = guideTotalOpenSeconds > 30;
  const modeStatus = isAssisted 
    ? `Có trợ giúp từ gợi ý mẫu (${guideTotalOpenSeconds}s xem tài liệu)`
    : `Tự lực làm bài (${guideTotalOpenSeconds}s)`;
  const timeSpentFormatted = formatTime(stopwatchSeconds);

  const prompt = currentItemJson?.prompt || document.getElementById('promptDisplayText').innerText;
  const submitBtn = document.getElementById('btnSubmitGrading');
  const resultBox = document.getElementById('resultBox');
  const resultMarkdown = document.getElementById('resultMarkdown');
  const statusBar = document.getElementById('statusBar');
  const signalBar = document.getElementById('scrollSignalBar');

  submitBtn.disabled = true;
  resultBox.style.display = 'block';
  if (signalBar) signalBar.style.display = 'block';
  resultMarkdown.innerHTML = '';
  statusBar.innerHTML = `⏳ Thầy đang phân tích và sửa bài Task 2 cho em... (Thời gian viết: <b>${timeSpentFormatted}</b> | Chế độ: <b>${modeStatus}</b>)`;

  resultBox.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const promptPayload = [{
    text: `
Bạn là Giám khảo IELTS & Chuyên gia luyện thi Writing Task 2 kỳ cựu.
QUY TẮC XƯNG HÔ: Bắt buộc xưng "Thầy" và gọi học sinh là "Em".
THÔNG TIN BÀI THI:
- Thời gian viết: ${timeSpentFormatted}.
- Trạng thái: ${modeStatus}.

QUY TẮC BẮT BUỘC TRONG PHẦN 1:
- KHÔNG ĐƯỢC NUỐT CÂU GỐC CỦA HỌC SINH.
- MỖI CÂU ĐỀU PHẢI TRÍCH DẪN NGUYÊN VĂN: "Câu [Số]: [CÂU GỐC HỌC SINH VIẾT]" trước khi tiến hành Bước 1 và Bước 2.

HÃY XUẤT TOÀN BỘ BÀI CHẤM THEO ĐÚNG CẤU TRÚC 6 PHẦN SAU (DÙNG 100% MARKDOWN):
# PHẦN 1: MỔ XẺ 2 TẦNG CHI TIẾT TỪNG CÂU
---
### 📌 Câu [Số]: "[CÂU GỐC CỦA EM ĐÃ VIẾT - BẮT BUỘC TRÍCH DẪN NGUYÊN VĂN]" — Điểm gốc: Band [Điểm/9]
#### 🛠️ BƯỚC 1: SỬA LỖI HIỂN NHIÊN (Band 6.0 - 6.5)
- **Thầy sửa trực tiếp:** [Câu sửa]
- **🔄 Từ sửa:** <del class="err">[Từ sai]</del> ➔ <ins class="fix">[Từ đúng]</ins>
- **👉 Câu sạch lỗi:** "[Viết lại câu hoàn chỉnh sạch lỗi]"

#### ✨ BƯỚC 2: NÂNG CẤP HOÀN MỸ (Band 8.0+)
- **Bơm từ vựng C1-C2 & cấu trúc lập luận:** [Viết câu với <mark class="vocab">từ C1-C2</mark>]
- **👉 Chốt câu hoàn mỹ:** "[Câu đỉnh cao chuẩn band 8+]"
---
# PHẦN 2: BẢNG TỔNG HỢP ĐIỂM TỪNG CÂU
| Câu số | Điểm gốc (/9) | Điểm sau sửa lỗi (/9) | Điểm hoàn mỹ (/9) | Lỗi cốt lõi |
|---|---|---|---|---|

# PHẦN 3: ĐÁNH GIÁ 4 TIÊU CHÍ (IELTS TASK 2 RUBRIC)
| Task Response | Coherence & Cohesion | Lexical Resource | Grammatical Range & Accuracy |
|---|---|---|---|
| Band [Điểm] | Band [Điểm] | Band [Điểm] | Band [Điểm] |

> ### 🎯 OVERALL BAND SCORE: [Band tổng]

# PHẦN 4: LỜI DẶN DÒ CHIẾN LƯỢC CỦA THẦY
# PHẦN 5: BẢN SẠCH LỖI HIỂN NHIÊN (CLEAN VERSION)
# PHẦN 6: BẢN NÂNG CẤP HOÀN MỸ (BAND 8.0+ MASTER ESSAY)

Đề bài: ${prompt}
Bài làm của học sinh:
${essay}
    `
  }];

  let fullOutput = "";
  try {
    const usedModel = await streamGeminiTask2(promptPayload, (chunk) => {
      fullOutput += chunk;
      resultMarkdown.innerHTML = marked.parse(fullOutput);
    });

    statusBar.innerHTML = `✅ Thầy đã chấm xong bằng model [<b>${usedModel}</b>]! (Thời gian viết: <b>${timeSpentFormatted}</b> | Chế độ: <b>${modeStatus}</b>)`;
    submitBtn.disabled = false;

    // Xóa nháp vì đã nộp bài thành công
    clearWT2Draft(activeExerciseKey);

    // --- LƯU VÀO ATTEMPTS RIÊNG BIỆT ---
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')} - ${String(now.getDate()).padStart(2,'0')}/${String(now.getMonth()+1).padStart(2,'0')}/${now.getFullYear()}`;
    const sName = localStorage.getItem('ielts_student_name') || 'Học viên';
    const sEmail = localStorage.getItem('ielts_student_email') || '';

    const bandMatch = fullOutput.match(/OVERALL BAND SCORE:\s*([0-9.]+)/i) || fullOutput.match(/Band\s*([0-9.]+)/i);
    const bandScore = bandMatch ? `Band ${bandMatch[1]}` : "Đã hoàn thành";

    const attempts = getWT2Attempts(activeExerciseKey);
    const newAttemptNum = attempts.length + 1;

    const newAttemptRecord = {
      attemptNum: newAttemptNum,
      timestamp: timeStr,
      score: bandScore,
      timeSpent: timeSpentFormatted,
      studentEssay: essay,
      aiFeedback: fullOutput
    };

    saveWT2Attempt(activeExerciseKey, newAttemptRecord);
    renderWorkspacePastAttemptsBar();

    // --- LƯU VÀO LỊCH SỬ CHUNG TRANG CHỦ & BẮN LÊN GOOGLE DRIVE ---
    const attemptSnapshot = {
      id: "attempt_wt2_" + Date.now(),
      timestamp: `${timeStr} (Lần ${newAttemptNum})`,
      testTitle: `Writing Task 2: ${currentItemJson?.title || 'Bài luận Task 2'} (Lần ${newAttemptNum})`,
      studentName: sName,
      studentEmail: sEmail,
      score: bandScore,
      timeSpent: timeSpentFormatted,
      details: `ĐỀ BÀI:\n${prompt}\n\nBÀI VIẾT:\n${essay}\n\nNHẬN XÉT AI:\n${fullOutput}`,
      pageUrl: `writing task 2/index-t2.html?test=${activeExerciseKey}`,
      moduleType: "writing_t2"
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

  } catch (err) {
    console.error(err);
    statusBar.innerHTML = `❌ Lỗi kết nối AI: ${err.message}. Em bấm kiểm tra lại nhé!`;
    submitBtn.disabled = false;
  }
}

// =========================================================================
// 6. TRỢ GIẢNG AI STACKING Q&A CHO TASK 2 (HỎI LUẬN ĐIỂM & GIẢM ĐỘ KHÓ TỪ VỰNG)
// =========================================================================
function resetQAChatBox() {
  const container = document.getElementById('qaChatContainer');
  if (container) container.innerHTML = '';
}

window.askTask2Assistant = async () => {
  const inputEl = document.getElementById('qaInputText');
  const chatContainer = document.getElementById('qaChatContainer');
  const question = inputEl?.value.trim();
  if (!question || !currentItemJson) return;

  inputEl.value = '';

  const qBubble = document.createElement('div');
  qBubble.style.cssText = 'background:#F3E8FF; border:1.5px solid #D8B4FE; border-radius:12px; padding:10px 14px; margin-bottom:10px; font-weight:800; font-size:13.5px; color:#6D28D9;';
  qBubble.innerHTML = `🙋 <b>Em hỏi:</b> ${question}`;
  chatContainer.appendChild(qBubble);

  const aBubble = document.createElement('div');
  aBubble.style.cssText = 'background:#FFFFFF; border:1.5px solid #E8E2D8; border-left:4px solid #7C3AED; border-radius:12px; padding:12px 16px; margin-bottom:14px; font-size:14px; line-height:1.6; color:#261F1D;';
  aBubble.innerHTML = `<i>⏳ Trợ giảng AI đang phân tích luận điểm bài viết...</i>`;
  chatContainer.appendChild(aBubble);
  chatContainer.scrollTop = chatContainer.scrollHeight;

  const prompt = `
Bạn là Trợ giảng IELTS Writing Task 2 chuyên sâu, xưng "Thầy" và gọi học sinh là "Em".
ĐỀ BÀI TASK 2: ${currentItemJson.prompt}
HƯỚNG DẪN VIẾT / DÀN Ý SẴN CÓ: ${currentItemJson.guide || 'Chưa có'}
CÂU HỎI CỦA HỌC SINH: "${question}"

YÊU CẦU:
1. Giải thích phương hướng lập luận PEEL (Point, Explain, Example, Link).
2. Nếu Em yêu cầu hạ độ khó từ vựng hoặc gợi ý câu đơn giản, hãy hướng dẫn câu từ vựng cơ bản trước, sau đó mới chỉ cách nâng cấp lên Band 7.5+.
`;

  let responseText = '';
  try {
    await streamGeminiTask2([{ text: prompt }], (chunk) => {
      responseText += chunk;
      aBubble.innerHTML = marked.parse(responseText);
      chatContainer.scrollTop = chatContainer.scrollHeight;
    });
  } catch (err) {
    aBubble.innerHTML = `⚠️ Lỗi trả lời: ${err.message}. Em thử hỏi lại nhé!`;
  }
};
