/**
 * IELTS SPEAKING CONTROLLER & 2-TIER GRADING ENGINE
 * BẢN FULL ĐẦY ĐỦ 100% - AUTO-SAVE TRANSCRIPT THỜI GIAN THỰC, NÚT LƯU TẠM DRAFT,
 * FIX DEEP-LINK XEM LẠI TỪ TRANG CHỦ & FIX HIỂN THỊ CÂU GỐC TRONG AI SỬA BÀI
 */

// 1. MÃ HÓA RUNTIME AUTH KEY
const _AUTH_SEEDS = [
  65, 81, 46, 65, 98, 56, 82, 78, 54, 75, 116, 80, 107, 51, 45, 50,
  75, 103, 117, 114, 119, 117, 116, 65, 115, 55, 95, 118, 82, 66,
  121, 81, 110, 113, 67, 48, 77, 86, 55, 52, 66, 119, 107, 82, 107,
  80, 110, 74, 89, 70, 90, 49, 119
];

function getDecodedKey() {
  return _AUTH_SEEDS.map(c => String.fromCharCode(c)).join('');
}

const CLOUD_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyNErQQFdciAQM0k9KUrACtpX7rxKkopjChYAC2Ubwj5MGzFOeekDEGs8C1n7P9cNR6vg/exec";

// Global States
let currentPart = 1;
let currentPromptsData = [];
let selectedPromptItem = null;
let isCustomMode = false;
let activePromptKey = null;

// Speech & Recording States
let recognition = null;
let isRecording = false;
let mediaRecorder = null;
let audioChunks = [];
let base64Audio = null;

// Self-Reliance Timer (20s Rule)
let guideTimer = null;
let guideSecondsCount = 0;
let isGuideOpen = false;
let hasUsedAssistance = false;

if (window.marked) {
  marked.setOptions({ breaks: true, gfm: true });
}

window.addEventListener('DOMContentLoaded', async () => {
  injectSaveDraftButtonSpeaking();
  setupSpeakingDraftListeners();
  await loadPartData(1);
  initSpeechRecognition();
  handleUrlDeepLinkSpeaking();
});

// =========================================================================
// 1. QUẢN LÝ LƯU TRỮ BẢN NHÁP (DRAFT AUTO-SAVE & RESUME)
// =========================================================================
function getSpeakingDraftKey(promptKey) {
  return `ielts_spk_draft_${promptKey}`;
}

function saveSpeakingDraft(promptKey, transcriptText) {
  if (!promptKey) return;
  const draftData = {
    transcript: transcriptText,
    guideSeconds: guideSecondsCount,
    updatedAt: new Date().toISOString()
  };
  localStorage.setItem(getSpeakingDraftKey(promptKey), JSON.stringify(draftData));
}

function loadSpeakingDraft(promptKey) {
  if (!promptKey) return null;
  try {
    const raw = localStorage.getItem(getSpeakingDraftKey(promptKey));
    return raw ? JSON.parse(raw) : null;
  } catch(e) {
    return null;
  }
}

function clearSpeakingDraft(promptKey) {
  if (!promptKey) return;
  localStorage.removeItem(getSpeakingDraftKey(promptKey));
}

// Tự động chèn nút "💾 Lưu Tạm Bài Nói" cạnh nút Bắt đầu chấm AI
function injectSaveDraftButtonSpeaking() {
  const gradeBtn = document.getElementById('btnStartGrading');
  if (!gradeBtn || document.getElementById('btnSaveDraftSpeaking')) return;

  const draftBtn = document.createElement('button');
  draftBtn.id = 'btnSaveDraftSpeaking';
  draftBtn.type = 'button';
  draftBtn.className = 'btn-3d btn-3d-white';
  draftBtn.style.cssText = 'padding: 12px 18px; font-size: 13.5px; font-weight: 900; margin-right: 10px; border-color: #FCD34D; color: #92400E;';
  draftBtn.innerHTML = '💾 Lưu Tạm Bài Nói';
  draftBtn.onclick = () => {
    const transcript = document.getElementById('speechTranscript')?.value || '';
    saveSpeakingDraft(activePromptKey, transcript);
    alert("✅ Đã lưu tạm câu trả lời của em thành công! Lần sau mở chủ đề này em sẽ được nói tiếp.");
  };

  gradeBtn.parentNode.insertBefore(draftBtn, gradeBtn);
}

function setupSpeakingDraftListeners() {
  const txtArea = document.getElementById('speechTranscript');
  let autoSaveTimeout = null;

  txtArea?.addEventListener('input', () => {
    clearTimeout(autoSaveTimeout);
    autoSaveTimeout = setTimeout(() => {
      saveSpeakingDraft(activePromptKey, txtArea.value);
    }, 1500);
  });
}

// =========================================================================
// 2. QUẢN LÝ LƯU TRỮ TỪNG LẦN NÓI & BÀI CHẤM AI (ATTEMPTS: LẦN 1, LẦN 2...)
// =========================================================================
function getSpeakingStorageKey(promptKey) {
  return `ielts_spk_attempts_${promptKey}`;
}

function getSpeakingAttempts(promptKey) {
  try {
    const raw = localStorage.getItem(getSpeakingStorageKey(promptKey));
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveSpeakingAttempt(promptKey, attemptData) {
  try {
    const attempts = getSpeakingAttempts(promptKey);
    attempts.unshift(attemptData); // Lần mới nhất lên đầu
    localStorage.setItem(getSpeakingStorageKey(promptKey), JSON.stringify(attempts));
  } catch (e) {
    console.warn("Lỗi lưu lần nói Speaking:", e);
  }
}

function getCompletedRecord(promptId, topicName) {
  try {
    const list = JSON.parse(localStorage.getItem('ielts_local_history') || '[]');
    return list.find(item => 
      (item.testTitle && (item.testTitle.includes(promptId) || item.testTitle.includes(topicName))) ||
      (item.details && (item.details.includes(promptId) || item.details.includes(topicName)))
    );
  } catch(e) {
    return null;
  }
}

// =========================================================================
// 3. XỬ LÝ DEEP-LINK NÚT "XEM LẠI" TỪ TRANG CHỦ
// =========================================================================
function handleUrlDeepLinkSpeaking() {
  const urlParams = new URLSearchParams(window.location.search);
  const attemptId = urlParams.get('attemptId');
  const promptParam = urlParams.get('prompt') || urlParams.get('id');

  // Trường hợp 1: Có attemptId từ nút Xem lại của trang chủ
  if (attemptId) {
    try {
      const localHist = JSON.parse(localStorage.getItem('ielts_local_history') || '[]');
      const foundAttempt = localHist.find(a => a.id === attemptId);

      if (foundAttempt) {
        // Tự động nhận diện Part từ testTitle (ví dụ: Speaking Part 2...)
        const partMatch = foundAttempt.testTitle.match(/Part\s*([123])/i);
        const targetPart = partMatch ? parseInt(partMatch[1]) : 1;

        loadPartData(targetPart).then(() => {
          const matchedItem = currentPromptsData.find(item => 
            foundAttempt.testTitle.includes(item.id) || 
            foundAttempt.testTitle.includes(item.topic) ||
            foundAttempt.testTitle.includes(item.title)
          ) || currentPromptsData[0];

          if (matchedItem) {
            window.startLessonSpeaking(matchedItem.id);
            restoreAttemptToWorkspaceSpeaking(foundAttempt);
          }
        });
        return;
      }
    } catch(e) {
      console.warn("Lỗi deep-link Speaking attemptId:", e);
    }
  }

  // Trường hợp 2: Có promptParam trên URL
  if (promptParam) {
    const matchedItem = currentPromptsData.find(item => item.id === promptParam);
    if (matchedItem) {
      window.startLessonSpeaking(matchedItem.id);
    }
  }
}

function restoreAttemptToWorkspaceSpeaking(attempt) {
  const txtArea = document.getElementById('speechTranscript');
  const resultBox = document.getElementById('result-box');
  const resultContent = document.getElementById('result-content');
  const statusBar = document.getElementById('status-bar');
  const printBtn = document.getElementById('btnPrintReport');

  let transcriptText = '';
  let aiText = '';

  if (attempt.details && attempt.details.includes('BÀI NÓI (TRANSCRIPT):')) {
    const parts = attempt.details.split('BÀI NÓI (TRANSCRIPT):');
    if (parts[1]) {
      const subParts = parts[1].split('NHẬN XÉT AI:');
      transcriptText = subParts[0].trim();
      aiText = subParts[1] ? subParts[1].trim() : '';
    }
  } else if (attempt.transcript) {
    transcriptText = attempt.transcript;
    aiText = attempt.aiFeedback || '';
  }

  if (txtArea) {
    txtArea.value = transcriptText;
  }

  if (resultBox && resultContent) {
    resultBox.style.display = 'block';
    if (printBtn) printBtn.style.display = 'inline-flex';
    statusBar.innerHTML = `📜 ĐANG XEM LẠI BÀI NÓI: <b>${attempt.testTitle}</b> (${attempt.timestamp}) — Điểm: <b>${attempt.score}</b>`;
    resultContent.innerHTML = marked.parse(aiText || '<i>Chưa có dữ liệu bài chấm chi tiết.</i>');
    resultBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

// ==================== MÀN HÌNH 1: PORTAL CARD LOGIC ====================
async function loadPartData(partNum) {
  currentPart = partNum;
  
  ['tabPart1Btn', 'tabPart2Btn', 'tabPart3Btn'].forEach((id, idx) => {
    const btn = document.getElementById(id);
    if (btn) btn.classList.toggle('active', idx + 1 === partNum);
  });

  const urlsToTry = [
    `speaking-part${partNum}.json`,
    `data/speaking-part${partNum}.json`,
    `data/manifest-part${partNum}.json`
  ];

  currentPromptsData = [];
  for (const url of urlsToTry) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const raw = await res.json();
        currentPromptsData = Array.isArray(raw) ? raw : (raw.topics || []);
        if (currentPromptsData.length > 0) break;
      }
    } catch(e) {}
  }

  renderPortalCards();
}

window.switchSpeakingPart = (partNum) => {
  loadPartData(partNum);
};

function renderPortalCards() {
  const container = document.getElementById('portalCardsGrid');
  const search = (document.getElementById('portalSearchInput')?.value || '').toLowerCase().trim();
  if (!container) return;

  let completedCount = 0;
  currentPromptsData.forEach(item => {
    const attempts = getSpeakingAttempts(item.id || item.topic);
    if (attempts.length > 0 || getCompletedRecord(item.id, item.topic)) completedCount++;
  });

  const progressBadge = document.getElementById('portalProgressBadge');
  if (progressBadge) {
    progressBadge.innerText = `${completedCount}/${currentPromptsData.length} Đã luyện`;
  }

  const filtered = currentPromptsData.filter(item => {
    const t = (item.title || item.topic || '').toLowerCase();
    const p = (item.fullPromptText || '').toLowerCase();
    return t.includes(search) || p.includes(search);
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; padding: 40px; text-align: center; color: var(--text-muted); font-weight: 800; font-size: 16px; background: #FFFFFF; border-radius: 22px; border: 2.5px dashed var(--border-color);">
        Không tìm thấy chủ đề nào phù hợp!
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(item => {
    const promptKey = item.id || item.topic;
    const attempts = getSpeakingAttempts(promptKey);
    const rec = getCompletedRecord(item.id, item.topic);
    const draft = loadSpeakingDraft(promptKey);
    const isDone = attempts.length > 0 || !!rec;
    const count = attempts.length > 0 ? attempts.length : (isDone ? 1 : 0);
    const latestScore = attempts.length > 0 ? attempts[0].score : (rec?.score || 'Đã luyện');

    const statusBadge = isDone
      ? `<span style="font-size: 12.5px; font-weight: 900; background: #DCFCE7; color: #166534; padding: 2px 8px; border-radius: 6px; border: 1px solid #86EFAC;">
           ✓ Đã luyện ${count} lần (${latestScore})
         </span>`
      : (draft ? `<span style="font-size: 12px; font-weight: 800; background: #FEF3C7; color: #92400E; padding: 2px 6px; border-radius: 6px;">● Đang nói dở</span>` : `<span style="font-size: 12.5px; font-weight: 800; color: var(--text-muted);">● Chưa làm</span>`);

    const qCount = item.questions ? `${item.questions.length} câu hỏi` : (item.questionCount ? `${item.questionCount} câu hỏi` : 'Full set');

    return `
      <div class="spk-lesson-card ${isDone ? 'is-done' : ''}">
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 10px;">
            <span class="part-tag" style="background: ${isDone ? '#DCFCE7' : '#FEF3C7'}; color: ${isDone ? '#166534' : '#B45309'}; border-color: ${isDone ? '#86EFAC' : '#FDE68A'};">
              Part ${currentPart} • ${item.id}
            </span>
            ${statusBadge}
          </div>
          <h3 style="font-size: 16.5px; font-weight: 900; color: var(--text-main); margin: 6px 0 12px 0; line-height: 1.4;" title="${item.title || item.topic}">
            ${item.title || item.topic}
          </h3>
          <div style="font-size: 13px; color: var(--text-muted); font-weight: 700; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center;">
            <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 190px;" title="${item.topic}">📁 ${item.topic}</span>
            <span style="color: #0284C7; font-weight: 800; white-space: nowrap;">⏱️ ${qCount}</span>
          </div>
        </div>

        <div style="display: flex; gap: 8px; margin-top: 10px;">
          <button onclick="window.startLessonSpeaking('${item.id}')" class="btn-3d ${isDone ? 'btn-3d-green' : 'btn-3d-gold'}" style="flex: 1; padding: 11px; font-size: 13px;">
            ${isDone ? `+ Luyện tiếp lần ${count + 1}` : (draft ? 'Nói tiếp bài dở →' : 'Vào luyện nói →')}
          </button>
          ${isDone ? `
            <button onclick="window.openPastAttemptsSpeaking('${item.id}')" class="btn-3d btn-3d-white" style="padding: 11px 12px; font-size: 13px;" title="Xem lại bài nói và bài sửa của các lần trước">
              👁️ Xem (${count})
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');
}

window.filterSpeakingCards = () => renderPortalCards();

// ==================== CHUYỂN QUA LẠI WORKSPACE ====================
window.startLessonSpeaking = (promptId) => {
  isCustomMode = false;
  selectedPromptItem = currentPromptsData.find(item => item.id === promptId);
  if (!selectedPromptItem) return;

  activePromptKey = selectedPromptItem.id || selectedPromptItem.topic;

  document.getElementById('portalScreen').classList.add('hidden');
  document.getElementById('workspaceScreen').classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });

  document.getElementById('currentPartTag').innerText = `Part ${currentPart}`;
  document.getElementById('promptDisplayArea').style.display = 'block';
  document.getElementById('customPromptInput').style.display = 'none';
  document.getElementById('promptDisplayArea').innerText = selectedPromptItem.fullPromptText || selectedPromptItem.topic;

  // Phục hồi nháp nếu có
  const draft = loadSpeakingDraft(activePromptKey);
  const txtArea = document.getElementById('speechTranscript');
  if (draft && txtArea) {
    txtArea.value = draft.transcript || '';
    guideSecondsCount = draft.guideSeconds || 0;
  } else {
    if (txtArea) txtArea.value = '';
    resetGuideTimer();
  }

  updateGuideView(selectedPromptItem.guide);
  resetRecordingUI();
  renderWorkspacePastAttemptsBar();
};

window.openPastAttemptsSpeaking = (promptId) => {
  window.startLessonSpeaking(promptId);
  setTimeout(() => {
    window.viewPastAttemptDetailSpeaking(0);
  }, 400);
};

window.startCustomSpeaking = () => {
  isCustomMode = true;
  selectedPromptItem = null;
  activePromptKey = 'custom_' + Date.now();

  document.getElementById('portalScreen').classList.add('hidden');
  document.getElementById('workspaceScreen').classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });

  document.getElementById('currentPartTag').innerText = "Đề tự nhập";
  document.getElementById('promptDisplayArea').style.display = 'none';
  const customInp = document.getElementById('customPromptInput');
  customInp.style.display = 'block';
  customInp.value = '';

  updateGuideView(null);
  resetGuideTimer();
  resetRecordingUI();
  renderWorkspacePastAttemptsBar();
};

window.backToPortalSpeaking = () => {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
  if (recognition) { try { recognition.stop(); } catch(e){} }
  isRecording = false;

  // Tự lưu nháp khi thoát
  const transcript = document.getElementById('speechTranscript')?.value || '';
  if (transcript.trim()) {
    saveSpeakingDraft(activePromptKey, transcript);
  }

  document.getElementById('workspaceScreen').classList.add('hidden');
  document.getElementById('portalScreen').classList.remove('hidden');
  renderPortalCards();
};

// =========================================================================
// 4. THANH HIỂN THỊ CÁC LẦN LUYỆN NÓI CŨ
// =========================================================================
function renderWorkspacePastAttemptsBar() {
  let bar = document.getElementById('spkPastAttemptsBar');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'spkPastAttemptsBar';
    const container = document.querySelector('.s-container');
    const promptCard = document.querySelector('.prompt-card');
    if (container && promptCard) container.insertBefore(bar, promptCard);
  }

  const attempts = getSpeakingAttempts(activePromptKey);
  if (attempts.length === 0) {
    bar.innerHTML = '';
    return;
  }

  let html = `
    <div style="background: #FFFBEB; border: 2px solid #FDE68A; border-radius: 16px; padding: 12px 18px; margin-bottom: 18px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
      <div>
        <b style="color: #92400E; font-size: 14px;">📜 Chủ đề này Em đã luyện nói ${attempts.length} lần trước đây:</b>
        <div style="display: flex; gap: 8px; margin-top: 6px; flex-wrap: wrap;">
  `;

  attempts.forEach((att, idx) => {
    html += `
      <button type="button" onclick="window.viewPastAttemptDetailSpeaking(${idx})" style="background: #FFFFFF; border: 1.5px solid #FDE68A; border-bottom: 3px solid #D97706; padding: 4px 10px; border-radius: 8px; font-weight: 800; font-size: 12.5px; cursor: pointer; color: #92400E;">
        Lần ${att.attemptNum || (attempts.length - idx)}: <b>${att.score}</b> (${att.timestamp.split(' - ')[0]})
      </button>
    `;
  });

  html += `
        </div>
      </div>
      <span style="font-size: 12px; color: #B45309; font-weight: 700;">Nhấp vào lần làm để xem lại bản chấm cũ</span>
    </div>
  `;

  bar.innerHTML = html;
}

window.viewPastAttemptDetailSpeaking = (idx) => {
  const attempts = getSpeakingAttempts(activePromptKey);
  const att = attempts[idx];
  if (!att) return;

  const txtArea = document.getElementById('speechTranscript');
  if (txtArea) txtArea.value = att.transcript || '';

  const resultBox = document.getElementById('result-box');
  const resultContent = document.getElementById('result-content');
  const statusBar = document.getElementById('status-bar');
  const printBtn = document.getElementById('btnPrintReport');

  resultBox.style.display = 'block';
  if (printBtn) printBtn.style.display = 'inline-flex';
  statusBar.innerHTML = `📜 ĐANG XEM LẠI BÀI CHẤM: <b>LẦN ${att.attemptNum || 1}</b> (${att.timestamp}) — Điểm: <b>${att.score}</b>`;
  resultContent.innerHTML = marked.parse(att.aiFeedback || '');
  resultBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

function updateGuideView(guide) {
  const ideasText = document.getElementById('guideIdeasText');
  const vocabList = document.getElementById('guideVocabList');
  const outlineText = document.getElementById('guideOutlineText');
  vocabList.innerHTML = '';

  if (guide) {
    ideasText.innerText = guide.suggestedIdeas || "Chưa có gợi ý thêm.";
    outlineText.innerText = guide.sampleOutline || "Chưa có dàn ý.";
    if (guide.keyVocab && Array.isArray(guide.keyVocab)) {
      guide.keyVocab.forEach(v => {
        const li = document.createElement('li');
        li.innerText = v;
        vocabList.appendChild(li);
      });
    }
  } else {
    ideasText.innerText = "Em đang tự luyện đề riêng. Hãy áp dụng cấu trúc AREA hoặc PEEL nhé!";
    outlineText.innerText = "";
  }
}

// ==================== BẤM GIỜ TỰ LỰC 20S ====================
window.toggleGuide = () => {
  const box = document.getElementById('guideContentBox');
  const btn = document.getElementById('btnToggleGuide');
  isGuideOpen = !isGuideOpen;

  if (isGuideOpen) {
    box.style.display = 'block';
    btn.innerText = "📕 ĐÓNG HƯỚNG DẪN CHI TIẾT";
    startGuideTimer();
  } else {
    box.style.display = 'none';
    btn.innerText = "📖 MỞ HƯỚNG DẪN CHI TIẾT (GỢI Ý & TỪ VỰNG)";
    stopGuideTimer();
  }
};

function startGuideTimer() {
  if (guideTimer) return;
  guideTimer = setInterval(() => {
    guideSecondsCount++;
    const timerEl = document.getElementById('timerCount');
    if (timerEl) timerEl.innerText = guideSecondsCount;

    if (guideSecondsCount > 20 && !hasUsedAssistance) {
      hasUsedAssistance = true;
      const badge = document.getElementById('selfRelianceBadge');
      if (badge) {
        badge.className = "self-reliance-badge assisted";
        badge.innerHTML = `⚠️ Đã dùng trợ giúp (>20s: ${guideSecondsCount}s)`;
      }
    }
  }, 1000);
}

function stopGuideTimer() {
  if (guideTimer) {
    clearInterval(guideTimer);
    guideTimer = null;
  }
}

function resetGuideTimer() {
  stopGuideTimer();
  guideSecondsCount = 0;
  hasUsedAssistance = false;
  isGuideOpen = false;
  document.getElementById('guideContentBox').style.display = 'none';
  document.getElementById('btnToggleGuide').innerText = "📖 MỞ HƯỚNG DẪN CHI TIẾT (GỢI Ý & TỪ VỰNG)";
  const badge = document.getElementById('selfRelianceBadge');
  if (badge) {
    badge.className = "self-reliance-badge clean";
    badge.innerHTML = `🟢 Tự lực (<span id="timerCount">0</span>s / tối đa 20s)`;
  }
}

// ==================== THU ÂM & WEB SPEECH API ====================
function initSpeechRecognition() {
  window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!window.SpeechRecognition) {
    console.warn("Trình duyệt không hỗ trợ Web Speech API.");
    return;
  }

  recognition = new window.SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'en-US';

  recognition.onresult = (event) => {
    let interim = '';
    let final = '';
    for (let i = 0; i < event.results.length; ++i) {
      if (event.results[i].isFinal) {
        final += event.results[i][0].transcript + ' ';
      } else {
        interim += event.results[i][0].transcript;
      }
    }
    const txtArea = document.getElementById('speechTranscript');
    if (txtArea) {
      txtArea.value = final + interim;
      saveSpeakingDraft(activePromptKey, txtArea.value);
    }
  };

  recognition.onerror = (e) => console.error("Speech Error:", e.error);
}

window.toggleRecording = async () => {
  const recBtn = document.getElementById('recBtn');
  const recText = document.getElementById('recText');
  const recIcon = document.getElementById('recIcon');

  if (!isRecording) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);
      audioChunks = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/mp3' });
        document.getElementById('audioPreview').src = URL.createObjectURL(audioBlob);
        document.getElementById('audioContainer').style.display = 'block';

        const reader = new FileReader();
        reader.onloadend = () => {
          base64Audio = reader.result.split(',')[1];
        };
        reader.readAsDataURL(audioBlob);
      };

      mediaRecorder.start();
      if (recognition) {
        document.getElementById('speechTranscript').value = '';
        try { recognition.start(); } catch(e){}
      }

      isRecording = true;
      recBtn.classList.add('recording');
      recText.innerText = "Dừng ghi âm & Hoàn thành bài nói";
      recIcon.innerText = "■";
    } catch (err) {
      alert("Không thể mở Micro: " + err.message + ". Em hãy cấp quyền micro trên trình duyệt nhé!");
    }
  } else {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
    if (recognition) { try { recognition.stop(); } catch(e){} }

    isRecording = false;
    recBtn.classList.remove('recording');
    recText.innerText = "Nói lại lần nữa (Ghi âm mới)";
    recIcon.innerText = "🎙️";
  }
};

function resetRecordingUI() {
  isRecording = false;
  const recBtn = document.getElementById('recBtn');
  if (recBtn) {
    recBtn.classList.remove('recording');
    document.getElementById('recText').innerText = "Bắt đầu ghi âm & nói tiếng Anh";
    document.getElementById('recIcon').innerText = "🎙️";
  }
  document.getElementById('audioContainer').style.display = 'none';
  document.getElementById('result-box').style.display = 'none';
  document.getElementById('status-bar').innerText = '';
}

// ==================== STREAMING GEMINI CHẤM ĐIỂM ====================
async function streamGeminiDirect(apiKey, parts, onChunk) {
  const modelsQueue = [
    "gemini-3.5-flash-lite",
    "gemini-3.1-flash-lite",
    "gemini-2.0-flash-lite",
    "gemini-2.0-flash",
    "gemini-1.5-flash"
  ];

  let lastError = null;
  for (let model of modelsQueue) {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ role: 'user', parts: parts }] })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error?.message || `HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const jsonStr = line.replace("data: ", "").trim();
            try {
              const parsed = JSON.parse(jsonStr);
              const textChunk = parsed.candidates?.[0]?.content?.parts?.[0]?.text || "";
              onChunk(textChunk);
            } catch (e) {}
          }
        }
      }
      return model;
    } catch (err) {
      console.warn(`Model ${model} chuyển tiếp dự phòng: ${err.message}`);
      lastError = err;
    }
  }
  throw lastError;
}

// =========================================================================
// 5. CHẤM BÀI AI (BẮT BUỘC TRÍCH DẪN NGUYÊN VĂN CÂU NÓI CỦA HỌC SINH)
// =========================================================================
window.startGrading = async () => {
  const apiKey = getDecodedKey();
  const taskPrompt = isCustomMode 
    ? document.getElementById('customPromptInput').value.trim() 
    : (selectedPromptItem?.fullPromptText || document.getElementById('promptDisplayArea').innerText.trim());
  const transcript = document.getElementById('speechTranscript').value.trim();

  if (!taskPrompt) {
    alert("⚠️ Vui lòng chọn hoặc nhập đề bài Speaking!");
    return;
  }
  if (!transcript) {
    alert("⚠️ Vui lòng ghi âm hoặc gõ bản ký âm câu trả lời của em!");
    return;
  }

  const submitBtn = document.getElementById('btnStartGrading');
  const printBtn = document.getElementById('btnPrintReport');
  const resultBox = document.getElementById('result-box');
  const resultContent = document.getElementById('result-content');
  const statusBar = document.getElementById('status-bar');

  submitBtn.disabled = true;
  printBtn.style.display = "none";
  resultBox.style.display = "block";
  resultContent.innerHTML = "";

  statusBar.innerHTML = "⏳ Thầy đang phân tích phát âm, ngữ điệu & mổ xẻ bài nói 2 tầng cho em...";

  const assistanceStatus = hasUsedAssistance
    ? `HỌC SINH ĐÃ MỞ XEM HƯỚNG DẪN QUÁ 20S (${guideSecondsCount}s).`
    : `HỌC SINH HOÀN TOÀN TỰ LỰC.`;

  const systemInstruction = `
Bạn là Giám khảo IELTS Speaking hàng đầu và là người Thầy tận tụy.
QUY TẮC XƯNG HÔ: Bắt buộc xưng "Anh" và gọi học sinh là "Em".
QUY TẮC ĐỊNH DẠNG: DÙNG 100% MARKDOWN THUẦN (###, ####, -). MỖI Ý XUỐNG DÒNG RIÊNG BIỆT.
TRẠNG THÁI BÀI LÀM: ${assistanceStatus}

QUY TẮC BẮT BUỘC TRONG PHẦN 1:
- KHÔNG ĐƯỢC NUỐT CÂU GỐC HỌC SINH ĐÃ NÓI.
- MỖI CÂU ĐỀU PHẢI TRÍCH DẪN NGUYÊN VĂN:
  "### 📌 Câu [Số]: [CÂU GỐC CỦA EM ĐÃ NÓI - BẮT BUỘC TRÍCH DẪN NGUYÊN VĂN] — Đánh giá: Band [Điểm/9]"
  trước khi tiến hành Bước 1 và Bước 2.

HÃY XUẤT BÀI CHẤM THEO ĐÚNG CẤU TRÚC 5 PHẦN SAU:
# PHẦN 1: MỔ XẺ TỪNG CÂU NÓI (2 TẦNG SPEAKING)
---
### 📌 Câu [Số]: "[CÂU GỐC CỦA EM ĐÃ NÓI - BẮT BUỘC TRÍCH DẪN NGUYÊN VĂN]" — Đánh giá: Band [Điểm/9]
#### 🛠️ BƯỚC 1: SỬA LỖI DIỄN ĐẠT & NGỮ PHÁP (Band [Điểm/9])
- **Anh chỉnh lại tự nhiên:** [Viết lại câu. Lỗi dùng <del class="err">từ sai</del>, sửa đúng <ins class="fix">từ đúng</ins>]
- **👉 Câu sửa sạch lỗi cơ bản:** "[Câu hoàn chỉnh]"

#### ✨ BƯỚC 2: NÂNG TẦM BẢN XỨ (Band 8.0+)
- **Biến hóa với Collocations & Idioms:** [Viết câu với <mark class="vocab">Collocations C1-C2</mark>]
- **👉 Phiên bản nói đẳng cấp Band 8.0+:** "[Câu xuất sắc nhất]"
---
# PHẦN 2: BẢNG ĐÁNH GIÁ 4 TIÊU CHÍ SPEAKING
| Fluency and Coherence | Lexical Resource | Grammatical Range & Accuracy | Pronunciation |
|---|---|---|---|
| Band [Điểm] | Band [Điểm] | Band [Điểm] | Band [Điểm] |

> ### 🎯 OVERALL SPEAKING BAND HIỆN TẠI: [Band điểm]

# PHẦN 3: LỜI DẶN DÒ CHIẾN LƯỢC CỦA ANH
# PHẦN 4: BẢN NÓI HOÀN THIỆN TỰ NHIÊN (CLEAN VERSION)
# PHẦN 5: BẢN NÓI XUẤT THẦN CHUẨN BẢN XỨ (MASTER 8.5 VERSION)
`;

  const partsPayload = [
    { text: systemInstruction + `\n\nPhần thi: IELTS Speaking Part ${currentPart}\nCâu hỏi:\n${taskPrompt}\n\nTranscript học sinh nói:\n${transcript}` }
  ];

  if (base64Audio) {
    partsPayload.push({
      inlineData: { mimeType: "audio/mp3", data: base64Audio }
    });
  }

  let fullMarkdown = "";
  try {
    await streamGeminiDirect(apiKey, partsPayload, (chunk) => {
      fullMarkdown += chunk;
      resultContent.innerHTML = marked.parse(fullMarkdown);
    });

    statusBar.innerHTML = "✅ Thầy đã chấm xong bài nói cho em rồi nhé! Em xem kỹ từng câu bên dưới nha.";
    submitBtn.disabled = false;
    printBtn.style.display = "inline-flex";

    // Xóa nháp vì đã hoàn thành nộp bài
    clearSpeakingDraft(activePromptKey);

    // --- LƯU VÀO ATTEMPTS RIÊNG BIỆT ---
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')} - ${String(now.getDate()).padStart(2,'0')}/${String(now.getMonth()+1).padStart(2,'0')}/${now.getFullYear()}`;
    const sName = localStorage.getItem('ielts_student_name') || 'Học viên';
    const sEmail = localStorage.getItem('ielts_student_email') || '';
    
    const bandMatch = fullMarkdown.match(/BAND HIỆN TẠI:\s*([0-9.]+)/i) || fullMarkdown.match(/Band\s*([0-9.]+)/i);
    const bandScore = bandMatch ? `Band ${bandMatch[1]}` : "Đã hoàn thành";

    const attempts = getSpeakingAttempts(activePromptKey);
    const newAttemptNum = attempts.length + 1;

    const newAttemptRecord = {
      attemptNum: newAttemptNum,
      timestamp: timeStr,
      score: bandScore,
      transcript: transcript,
      aiFeedback: fullMarkdown
    };

    saveSpeakingAttempt(activePromptKey, newAttemptRecord);
    renderWorkspacePastAttemptsBar();

    // --- LƯU VÀO LOCAL VÀ BẮN LÊN GOOGLE DRIVE ---
    try {
      const attemptSnapshot = {
        id: "attempt_spk_" + Date.now(),
        timestamp: `${timeStr} (Lần ${newAttemptNum})`,
        testTitle: `Speaking Part ${currentPart}: ${selectedPromptItem ? (selectedPromptItem.title || selectedPromptItem.topic) : 'Tự luyện'} (Lần ${newAttemptNum})`,
        studentName: sName,
        studentEmail: sEmail,
        score: bandScore,
        timeSpent: "N/A",
        details: `ĐỀ BÀI:\n${taskPrompt}\n\nBÀI NÓI (TRANSCRIPT):\n${transcript}\n\nNHẬN XÉT AI:\n${fullMarkdown}`,
        pageUrl: `speaking/index-s.html?prompt=${selectedPromptItem ? selectedPromptItem.id : 'custom'}`
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
    } catch(errHist) {
      console.warn("Lỗi lưu lịch sử Speaking:", errHist);
    }

  } catch (err) {
    console.error(err);
    statusBar.innerHTML = "❌ Có lỗi xảy ra: " + err.message;
    submitBtn.disabled = false;
  }
};
