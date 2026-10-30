/**
 * writing task 1/js/app-t1.js
 * BỘ ĐIỀU KHIỂN TASK 1 THEO PHONG CÁCH DUOLINGO X TRẠM IELTS
 * BẢN FULL ĐẦY ĐỦ 100% - AUTO-SAVE THỜI GIAN THỰC, NÚT LƯU TẠM DRAFT,
 * FIX DEEP-LINK XEM LẠI TỪ TRANG CHỦ & FIX HIỂN THỊ CÂU GỐC TRONG AI SỬA BÀI
 */
import '../../js/auth-lock.js';
import { streamGeminiTask1 } from './api-t1.js';

let manifestData = [];
let currentItemJson = null;
let currentBase64Image = null;
let currentCategory = "ALL";
let activeExerciseKey = null;

// Bộ đếm thời gian xem gợi ý
let guideTimerInterval = null;
let guideTotalOpenSeconds = 0;
let isGuideOpen = false;

// Bộ đếm thời gian làm bài (Stopwatch) để tính giờ tiếp tục khi mở lại bài dở
let task1TimerInterval = null;
let task1ElapsedSeconds = 0;
let isTask1TimerRunning = false;

const CATEGORIES = ["ALL", "Line Graph", "Bar Chart", "Pie Chart", "Table", "Mixed Charts", "Map", "Floor Plan", "Process"];
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
function getWT1DraftKey(key) {
  return `ielts_wt1_draft_${key}`;
}

function saveWT1Draft(key, text, elapsedSec = 0) {
  if (!key) return;
  const draftData = {
    text: text,
    elapsedSeconds: elapsedSec,
    guideSeconds: guideTotalOpenSeconds,
    updatedAt: new Date().toISOString()
  };
  localStorage.setItem(getWT1DraftKey(key), JSON.stringify(draftData));
}

function loadWT1Draft(key) {
  if (!key) return null;
  try {
    const raw = localStorage.getItem(getWT1DraftKey(key));
    return raw ? JSON.parse(raw) : null;
  } catch(e) {
    return null;
  }
}

function clearWT1Draft(key) {
  if (!key) return;
  localStorage.removeItem(getWT1DraftKey(key));
}

// Tự động chèn nút "💾 Lưu Tạm Bài Làm" vào giao diện kế bên nút Nộp Bài
function injectSaveDraftButton() {
  const submitBtn = document.getElementById('btnSubmitGrading');
  if (!submitBtn || document.getElementById('btnSaveDraftWT1')) return;

  const draftBtn = document.createElement('button');
  draftBtn.id = 'btnSaveDraftWT1';
  draftBtn.type = 'button';
  draftBtn.className = 'btn-3d btn-3d-white';
  draftBtn.style.cssText = 'padding: 12px 18px; font-size: 13.5px; font-weight: 900; margin-right: 10px; border-color: #86EFAC; color: #166534;';
  draftBtn.innerHTML = '💾 Lưu Tạm (Làm Tiếp Sau)';
  draftBtn.onclick = () => {
    const essay = document.getElementById('studentEssayInput')?.value || '';
    saveWT1Draft(activeExerciseKey, essay, task1ElapsedSeconds);
    alert(`✅ Đã lưu tạm bài viết thành công (${task1ElapsedSeconds} giây làm bài). Lần sau mở bài này em sẽ được viết tiếp!`);
  };

  submitBtn.parentNode.insertBefore(draftBtn, submitBtn);
}

// Bộ đếm thời gian làm bài viết
function startTask1Timer() {
  if (isTask1TimerRunning) return;
  isTask1TimerRunning = true;
  task1TimerInterval = setInterval(() => {
    task1ElapsedSeconds++;
  }, 1000);
}

function pauseTask1Timer() {
  isTask1TimerRunning = false;
  if (task1TimerInterval) {
    clearInterval(task1TimerInterval);
    task1TimerInterval = null;
  }
}

function resetTask1Timer(initialSeconds = 0) {
  pauseTask1Timer();
  task1ElapsedSeconds = initialSeconds;
}

// =========================================================================
// 2. QUẢN LÝ LƯU TRỮ TỪNG LẦN LÀM (ATTEMPTS: LẦN 1, LẦN 2...)
// =========================================================================
function getWT1StorageKey(key) {
  return `ielts_wt1_attempts_${key}`;
}

function getWT1Attempts(key) {
  try {
    const raw = localStorage.getItem(getWT1StorageKey(key));
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveWT1Attempt(key, attemptData) {
  try {
    const attempts = getWT1Attempts(key);
    attempts.unshift(attemptData); // Lần mới nhất lên đầu
    localStorage.setItem(getWT1StorageKey(key), JSON.stringify(attempts));
  } catch (e) {
    console.warn("Lỗi lưu lần làm WT1:", e);
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
          window.startLessonTask1(matchedItem.file, matchedItem.image || '', matchedItem.type, itemKey).then(() => {
            // Khôi phục nội dung bài viết và nhận xét AI đã lưu
            restoreAttemptToWorkspace(foundAttempt);
          });
          return;
        }
      }
    } catch(e) {
      console.warn("Lỗi xử lý deep-link attemptId:", e);
    }
  }

  // Trường hợp 2: Có test/file trực tiếp trên URL
  if (testParam) {
    const matchedItem = manifestData.find(item => item.file.includes(testParam) || item.id === testParam);
    if (matchedItem) {
      const itemKey = matchedItem.id || matchedItem.title;
      window.startLessonTask1(matchedItem.file, matchedItem.image || '', matchedItem.type, itemKey);
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

  if (attempt.details && attempt.details.includes('BÀI LÀM HỌC VIÊN:')) {
    const parts = attempt.details.split('BÀI LÀM HỌC VIÊN:');
    if (parts[1]) {
      const subParts = parts[1].split('BÀI CHẤM AI:');
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
    statusBar.innerHTML = `📜 ĐANG XEM LẠI BÀI LÀM: <b>${attempt.testTitle}</b> (Nộp lúc: ${attempt.timestamp}) — Điểm: <b>${attempt.score}</b>`;
    resultMarkdown.innerHTML = marked.parse(aiText || '<i>Chưa có dữ liệu bài chấm chi tiết.</i>');
    resultBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

// ==================== MÀN HÌNH 1: PORTAL LOGIC ====================
async function loadManifestAndInitPortal() {
  try {
    const res = await fetch('data/manifest-t1.json');
    manifestData = await res.json();
    renderTabs();
    renderCards();
  } catch (err) {
    console.error("Lỗi manifest Task 1:", err);
  }
}

function renderTabs() {
  const container = document.getElementById('categoryTabsContainer');
  if (!container) return;
  container.innerHTML = CATEGORIES.map(cat => {
    const isActive = cat === currentCategory;
    return `
      <button onclick="window.switchTask1Category('${cat}')" class="t1-tab-btn ${isActive ? 'active' : ''}">
        ${cat === 'ALL' ? 'Tất cả 133 đề' : cat}
      </button>
    `;
  }).join('');
}

window.switchTask1Category = (cat) => {
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
    const attempts = getWT1Attempts(item.id || item.title);
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
        Không tìm thấy đề thi phù hợp!
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(item => {
    const itemKey = item.id || item.title;
    const attempts = getWT1Attempts(itemKey);
    const rec = getCompletedRecord(item.title);
    const draft = loadWT1Draft(itemKey);
    const isDone = attempts.length > 0 || !!rec;
    const count = attempts.length > 0 ? attempts.length : (isDone ? 1 : 0);
    const latestScore = attempts.length > 0 ? attempts[0].score : (rec?.score || 'Đã viết');

    return `
      <div class="t1-lesson-card ${isDone ? 'is-done' : ''}">
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 10px;">
            <span class="badge" style="background: ${isDone ? '#DCFCE7' : '#CCFBF1'}; color: ${isDone ? '#166534' : '#0F766E'};">
              ${item.type}
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
          <button onclick="window.startLessonTask1('${item.file}', '${item.image || ''}', '${item.type}', '${itemKey}')" class="btn-3d ${isDone ? 'btn-3d-green' : 'btn-3d-teal'}" style="flex: 1; padding: 10px 14px; font-size: 13px;">
            ${isDone ? `+ Viết tiếp lần ${count + 1}` : (draft ? 'Viết tiếp bài dở →' : 'Vào phòng thi viết →')}
          </button>
          ${isDone ? `
            <button onclick="window.openPastAttemptsTask1('${item.file}', '${item.image || ''}', '${item.type}', '${itemKey}')" class="btn-3d btn-3d-white" style="padding: 10px 12px; font-size: 13px;" title="Xem lại bài viết và nhận xét AI">
              👁️ Xem (${count})
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');
}

window.filterTask1Cards = () => renderCards();

// ==================== CHUYỂN QUA LẠI WORKSPACE ====================
window.startLessonTask1 = async (filePath, imageSrc, chartType, itemKey) => {
  activeExerciseKey = itemKey || filePath;
  document.getElementById('portalScreen').classList.add('hidden');
  document.getElementById('workspaceScreen').classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });

  document.getElementById('chartTypeBadge').innerText = chartType;

  // Khôi phục bản nháp dở dang nếu có
  const draft = loadWT1Draft(activeExerciseKey);
  const essayInput = document.getElementById('studentEssayInput');
  if (draft && essayInput) {
    essayInput.value = draft.text || '';
    resetTask1Timer(draft.elapsedSeconds || 0);
    guideTotalOpenSeconds = draft.guideSeconds || 0;
    updateTimerBadge();
    const count = draft.text.trim() ? draft.text.trim().split(/\s+/).length : 0;
    document.getElementById('wordCounter').innerText = `${count} từ (Bản nháp)`;
  } else {
    if (essayInput) essayInput.value = '';
    resetTask1Timer(0);
    resetGuideTimer();
    document.getElementById('wordCounter').innerText = `0 từ`;
  }

  startTask1Timer();

  try {
    const res = await fetch(filePath);
    currentItemJson = await res.json();
    document.getElementById('promptDisplayText').innerText = currentItemJson.prompt || "The graph below shows...";
    const finalImg = currentItemJson.image || imageSrc;
    if (finalImg) {
      showImage(finalImg);
      loadRemoteImageToBase64(finalImg);
    } else {
      removeImage();
    }
    renderGuideContent(currentItemJson.guide);
    renderWorkspacePastAttemptsBar();
    resetQAChatBox();
  } catch (err) {
    console.warn("Lỗi tải chi tiết:", err.message);
    if (imageSrc) {
      showImage(imageSrc);
      loadRemoteImageToBase64(imageSrc);
    } else {
      removeImage();
    }
    renderGuideContent(null);
  }
};

window.openPastAttemptsTask1 = async (filePath, imageSrc, chartType, itemKey) => {
  await window.startLessonTask1(filePath, imageSrc, chartType, itemKey);
  setTimeout(() => {
    window.viewPastAttemptDetailWT1(0);
  }, 400);
};

window.backToPortalTask1 = () => {
  // Lưu tạm trước khi thoát ra danh mục
  const essay = document.getElementById('studentEssayInput')?.value || '';
  if (essay.trim()) {
    saveWT1Draft(activeExerciseKey, essay, task1ElapsedSeconds);
  }
  pauseTask1Timer();

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

    // Tự động kích hoạt bộ đếm thời gian khi bắt đầu gõ
    if (!isTask1TimerRunning) startTask1Timer();

    // Auto-save sau mỗi 1.5 giây dừng gõ phím
    clearTimeout(autoSaveTimeout);
    autoSaveTimeout = setTimeout(() => {
      saveWT1Draft(activeExerciseKey, text, task1ElapsedSeconds);
    }, 1500);
  });

  document.getElementById('btnToggleGuide')?.addEventListener('click', toggleGuide);
  const fileInput = document.getElementById('chartFileInput');
  fileInput?.addEventListener('change', (e) => handleImageUpload(e.target.files[0]));
  document.getElementById('btnRemoveImage')?.addEventListener('click', removeImage);

  window.addEventListener('paste', (e) => {
    const items = (e.clipboardData || window.clipboardData).items;
    for (let item of items) {
      if (item.type.includes('image')) {
        handleImageUpload(item.getAsFile());
        break;
      }
    }
  });

  document.getElementById('btnSubmitGrading')?.addEventListener('click', submitEssay);
}

// =========================================================================
// 4. THANH HIỂN THỊ CÁC LẦN NỘP BÀI CŨ
// =========================================================================
function renderWorkspacePastAttemptsBar() {
  let bar = document.getElementById('wt1PastAttemptsBar');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'wt1PastAttemptsBar';
    const workspace = document.querySelector('.workspace-t1');
    if (workspace) workspace.parentNode.insertBefore(bar, workspace);
  }

  const attempts = getWT1Attempts(activeExerciseKey);
  if (attempts.length === 0) {
    bar.innerHTML = '';
    return;
  }

  let html = `
    <div style="background: #F0FDF4; border: 2px solid #86EFAC; border-radius: 16px; padding: 12px 18px; margin-bottom: 18px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
      <div>
        <b style="color: #166534; font-size: 14px;">📜 Đề này Em đã viết ${attempts.length} lần trước đây:</b>
        <div style="display: flex; gap: 8px; margin-top: 6px; flex-wrap: wrap;">
  `;

  attempts.forEach((att, idx) => {
    html += `
      <button type="button" onclick="window.viewPastAttemptDetailWT1(${idx})" style="background: #FFFFFF; border: 1.5px solid #86EFAC; border-bottom: 3px solid #22C55E; padding: 4px 10px; border-radius: 8px; font-weight: 800; font-size: 12.5px; cursor: pointer; color: #166534;">
        Lần ${att.attemptNum || (attempts.length - idx)}: <b>${att.score}</b> (${att.timestamp.split(' - ')[0]})
      </button>
    `;
  });

  html += `
        </div>
      </div>
      <span style="font-size: 12px; color: #15803D; font-weight: 700;">Nhấp vào lần làm để xem lại bản chấm cũ</span>
    </div>
  `;

  bar.innerHTML = html;
}

window.viewPastAttemptDetailWT1 = (idx) => {
  const attempts = getWT1Attempts(activeExerciseKey);
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

function renderGuideContent(guideMarkdown) {
  const box = document.getElementById('guideContentBox');
  if (guideMarkdown) {
    box.innerHTML = marked.parse(guideMarkdown);
  } else {
    box.innerHTML = `<p>Đề bài này chưa có phần hướng dẫn chi tiết. Em hãy chủ động quan sát hình và viết bài nhé!</p>`;
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
    updateTimerBadge();
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
  updateTimerBadge();
}

function updateTimerBadge() {
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

function showImage(src) {
  const img = document.getElementById('chartImage');
  const fallback = document.getElementById('imageFallback');
  const removeBtn = document.getElementById('btnRemoveImage');

  img.onerror = () => {
    if (src.endsWith('.jpg')) img.src = src.replace('.jpg', '.jpeg');
    else if (src.endsWith('.jpeg')) img.src = src.replace('.jpeg', '.jpg');
    else { img.style.display = 'none'; fallback.style.display = 'block'; }
  };
  img.onload = () => { img.style.display = 'block'; fallback.style.display = 'none'; removeBtn.style.display = 'inline-block'; };
  img.src = src;
}

function removeImage() {
  currentBase64Image = null;
  const img = document.getElementById('chartImage');
  img.src = '';
  img.style.display = 'none';
  document.getElementById('imageFallback').style.display = 'block';
  document.getElementById('btnRemoveImage').style.display = 'none';
  document.getElementById('chartFileInput').value = '';
}

function handleImageUpload(file) {
  if (!file || !file.type.startsWith('image/')) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    currentBase64Image = { mimeType: file.type, data: e.target.result.split(',')[1] };
    showImage(e.target.result);
  };
  reader.readAsDataURL(file);
}

async function loadRemoteImageToBase64(url) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const reader = new FileReader();
    reader.onloadend = () => {
      currentBase64Image = { mimeType: blob.type || 'image/jpeg', data: reader.result.split(',')[1] };
    };
    reader.readAsDataURL(blob);
  } catch(e) {}
}

window.openImageModal = (src) => window.open(src, '_blank');

// =========================================================================
// 5. CHẤM BÀI AI (BẮT BUỘC TRÍCH DẪN CÂU GỐC CỦA HỌC SINH)
// =========================================================================
async function submitEssay() {
  const essay = document.getElementById('studentEssayInput').value.trim();
  if (!essay) {
    alert("⚠️ Em vui lòng viết bài trước khi nộp nhé!");
    return;
  }

  stopGuideTimer();
  pauseTask1Timer();

  const isAssisted = guideTotalOpenSeconds > 30;
  const modeStatus = isAssisted 
    ? `Có trợ giúp từ gợi ý mẫu (${guideTotalOpenSeconds} giây xem hướng dẫn)`
    : `Tự lực làm bài hoàn toàn (${guideTotalOpenSeconds} giây)`;

  const prompt = currentItemJson?.prompt || document.getElementById('promptDisplayText').innerText;
  const submitBtn = document.getElementById('btnSubmitGrading');
  const resultBox = document.getElementById('resultBox');
  const resultMarkdown = document.getElementById('resultMarkdown');
  const statusBar = document.getElementById('statusBar');

  submitBtn.disabled = true;
  resultBox.style.display = 'block';
  resultMarkdown.innerHTML = '';
  statusBar.innerHTML = `⏳ Thầy đang phân tích và sửa bài 2 tầng cho em... (Thời gian làm bài: <b>${Math.round(task1ElapsedSeconds / 60)} phút</b> | Chế độ: <b>${modeStatus}</b>)`;

  const promptPayload = [{
    text: `
Bạn là Giám khảo IELTS & Giáo viên dạy viết Task 1 cự phách.
QUY TẮC XƯNG HÔ: Bắt buộc xưng "Thầy" và gọi học sinh là "Em".
THÔNG TIN LÀM BÀI: ${modeStatus}.

QUY TẮC BẮT BUỘC TRONG PHẦN 1:
- KHÔNG ĐƯỢC NUỐT CÂU GỐC CỦA HỌC SINH.
- MỖI CÂU ĐỀU PHẢI TRÍCH DẪN RÕ RÀNG: "Câu [Số]: [CÂU GỐC HỌC SINH VIẾT]" trước khi tiến hành Bước 1 và Bước 2.

HÃY XUẤT BÀI CHẤM THEO ĐÚNG CẤU TRÚC 6 PHẦN SAU (DÙNG 100% MARKDOWN):
# PHẦN 1: MỔ XẺ 2 TẦNG CHI TIẾT TỪNG CÂU
---
### 📌 Câu [Số]: "[CÂU GỐC CỦA EM ĐÃ VIẾT - BẮT BUỘC TRÍCH DẪN NGUYÊN VĂN]" — Điểm gốc: Band [Điểm/9]
#### 🛠️ BƯỚC 1: SỬA LỖI HIỂN NHIÊN (Band 6.0 - 6.5)
- **Thầy sửa trực tiếp:** [Câu sửa]
- **🔄 Từ sửa:** <del class="err">[Từ sai]</del> ➔ <ins class="fix">[Từ đúng]</ins>
- **👉 Câu sạch lỗi:** "[Viết lại câu hoàn chỉnh sạch lỗi]"

#### ✨ BƯỚC 2: NÂNG CẤP HOÀN MỸ (Band 8.0+)
- **Bơm từ C1-C2 & cấu trúc số liệu:** [Viết câu nâng cấp với <mark class="vocab">từ C1-C2</mark>]
- **👉 Chốt câu hoàn mỹ:** "[Câu đỉnh cao chuẩn band 8+]"
---
# PHẦN 2: BẢNG TỔNG HỢP ĐIỂM TỪNG CÂU
| Câu số | Điểm gốc (/9) | Điểm sau sửa lỗi (/9) | Điểm hoàn mỹ (/9) | Lỗi cốt lõi |
|---|---|---|---|---|

# PHẦN 3: ĐÁNH GIÁ 4 TIÊU CHÍ (IELTS TASK 1 RUBRIC)
| Task Achievement | Coherence & Cohesion | Lexical Resource | Grammatical Range & Accuracy |
|---|---|---|---|
| Band [Điểm] | Band [Điểm] | Band [Điểm] | Band [Điểm] |

> ### 🎯 OVERALL BAND SCORE: [Band tổng]

# PHẦN 4: LỜI DẶN DÒ CHIẾN LƯỢC CỦA THẦY
# PHẦN 5: BẢN SẠCH LỖI HIỂN NHIÊN (CLEAN VERSION)
# PHẦN 6: BẢN NÂNG CẤP HOÀN MỸ (BAND 8.0+ MASTER VERSION)

Đề bài: ${prompt}
Bài làm của học sinh:
${essay}
    `
  }];

  if (currentBase64Image) {
    promptPayload.push({
      inlineData: { mimeType: currentBase64Image.mimeType, data: currentBase64Image.data }
    });
  }

  let fullOutput = "";
  try {
    await streamGeminiTask1(promptPayload, (chunk) => {
      fullOutput += chunk;
      resultMarkdown.innerHTML = marked.parse(fullOutput);
    });

    statusBar.innerHTML = `✅ Thầy đã chấm xong! (Trạng thái: <b>${modeStatus}</b>)`;
    submitBtn.disabled = false;

    // Xóa nháp vì đã nộp bài thành công
    clearWT1Draft(activeExerciseKey);

    // --- LƯU VÀO ATTEMPTS RIÊNG BIỆT ---
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')} - ${String(now.getDate()).padStart(2,'0')}/${String(now.getMonth()+1).padStart(2,'0')}/${now.getFullYear()}`;
    const sName = localStorage.getItem('ielts_student_name') || 'Học viên';
    const sEmail = localStorage.getItem('ielts_student_email') || '';

    const bandMatch = fullOutput.match(/OVERALL BAND SCORE:\s*([0-9.]+)/i) || fullOutput.match(/Band\s*([0-9.]+)/i);
    const bandScore = bandMatch ? `Band ${bandMatch[1]}` : "Đã hoàn thành";

    const attempts = getWT1Attempts(activeExerciseKey);
    const newAttemptNum = attempts.length + 1;

    const newAttemptRecord = {
      attemptNum: newAttemptNum,
      timestamp: timeStr,
      score: bandScore,
      timeSpent: `${Math.round(task1ElapsedSeconds / 60)} phút (${task1ElapsedSeconds}s)`,
      studentEssay: essay,
      aiFeedback: fullOutput
    };

    saveWT1Attempt(activeExerciseKey, newAttemptRecord);
    renderWorkspacePastAttemptsBar();

    // --- LƯU VÀO LỊCH SỬ CHUNG TRANG CHỦ & BẮN LÊN GOOGLE DRIVE ---
    const attemptSnapshot = {
      id: "attempt_wt1_" + Date.now(),
      timestamp: `${timeStr} (Lần ${newAttemptNum})`,
      testTitle: `Writing Task 1: ${currentItemJson?.title || 'Biểu đồ Task 1'} (Lần ${newAttemptNum})`,
      studentName: sName,
      studentEmail: sEmail,
      score: bandScore,
      timeSpent: `${Math.round(task1ElapsedSeconds / 60)} phút`,
      details: `ĐỀ BÀI:\n${prompt}\n\nBÀI LÀM HỌC VIÊN:\n${essay}\n\nBÀI CHẤM AI:\n${fullOutput}`,
      pageUrl: `writing task 1/index-t1.html?test=${activeExerciseKey}`,
      moduleType: "writing_t1"
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
    statusBar.innerHTML = `❌ Lỗi: ${err.message}. Em bấm thử lại nhé!`;
    submitBtn.disabled = false;
  }
}

// =========================================================================
// 6. TRỢ GIẢNG AI STACKING Q&A (HỎI DÀN Ý, HẠ ĐỘ KHÓ TỪ VỰNG THEO YÊU CẦU)
// =========================================================================
function resetQAChatBox() {
  const container = document.getElementById('qaChatContainer');
  if (container) container.innerHTML = '';
}

window.askTask1Assistant = async () => {
  const inputEl = document.getElementById('qaInputText');
  const chatContainer = document.getElementById('qaChatContainer');
  const question = inputEl?.value.trim();
  if (!question || !currentItemJson) return;

  inputEl.value = '';

  const qBubble = document.createElement('div');
  qBubble.style.cssText = 'background:#CCFBF1; border:1.5px solid #99F6E4; border-radius:12px; padding:10px 14px; margin-bottom:10px; font-weight:800; font-size:13.5px; color:#0F766E;';
  qBubble.innerHTML = `🙋 <b>Em hỏi:</b> ${question}`;
  chatContainer.appendChild(qBubble);

  const aBubble = document.createElement('div');
  aBubble.style.cssText = 'background:#FFFFFF; border:1.5px solid #E8E2D8; border-left:4px solid #0D9488; border-radius:12px; padding:12px 16px; margin-bottom:14px; font-size:14px; line-height:1.6; color:#261F1D;';
  aBubble.innerHTML = `<i>⏳ Trợ giảng AI đang đọc biểu đồ và chuẩn bị trả lời...</i>`;
  chatContainer.appendChild(aBubble);
  chatContainer.scrollTop = chatContainer.scrollHeight;

  const prompt = `
Bạn là Trợ giảng IELTS Writing Task 1, xưng "Thầy" và gọi học sinh là "Em".
ĐỀ BÀI TASK 1: ${currentItemJson.prompt}
HƯỚNG DẪN VIẾT SẴN CÓ: ${currentItemJson.guide || 'Chưa có'}
CÂU HỎI CỦA HỌC SINH: "${question}"

YÊU CẦU:
1. Giải thích cụ thể theo số liệu biểu đồ.
2. Nếu Em yêu cầu hạ độ khó từ vựng hoặc viết câu đơn giản, hãy hướng dẫn cấu trúc câu dễ hiểu (Band 5.5 - 6.0) trước, sau đó mới nâng lên cụm Band 7.5+.
`;

  let responseText = '';
  try {
    await streamGeminiTask1([{ text: prompt }], (chunk) => {
      responseText += chunk;
      aBubble.innerHTML = marked.parse(responseText);
      chatContainer.scrollTop = chatContainer.scrollHeight;
    });
  } catch (err) {
    aBubble.innerHTML = `⚠️ Lỗi trả lời: ${err.message}. Em thử hỏi lại nhé!`;
  }
};
