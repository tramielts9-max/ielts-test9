/**
 * listening/js-l/app-l.js - Module điều khiển bài thi IELTS Listening Duolingo 3D
 * ĐÃ BỎ 100% BIỂU TƯỢNG FONT AWESOME GÂY LỖI Ô VUÔNG
 */
import '../../js/auth-lock.js';
import { CONFIG } from '../../js/config.js';
import { stateManager } from '../../js/state.js';
import { TestTimer } from '../../js/timer.js';
import { initHighlighting } from '../../js/highlight.js';
import { initResizer } from '../../js/resizer.js';
import { askGemini } from '../../js/ai-assistant.js';
import { initAudioTranscriptSync } from './audio-sync.js';
import { TestEvaluatorListening } from './evaluator-l.js';

let currentFontSize = parseInt(localStorage.getItem('ielts_font_size')) || 15;
applyFontSize(currentFontSize);

function applyFontSize(size) {
  document.documentElement.style.setProperty('--font-size-base', `${size}px`);
  document.querySelectorAll('.passage-box, .question-box').forEach(el => {
    el.style.fontSize = `${size}px`;
  });
}

window.changeFontSize = (delta) => {
  currentFontSize = Math.min(Math.max(currentFontSize + delta, 12), 24);
  applyFontSize(currentFontSize);
  localStorage.setItem('ielts_font_size', currentFontSize);
};

window.toggleTheme = () => {
  const isDark = document.body.classList.toggle('dark-theme');
  localStorage.setItem('ielts_theme', isDark ? 'dark' : 'light');
  const btn = document.getElementById('btnThemeToggle');
  if (btn) btn.innerText = isDark ? 'Chế độ Sáng' : 'Chế độ Tối';
};

window.askGeminiAI = (qId) => askGemini(qId);

export async function initListeningApp() {
  const timer = new TestTimer('timerDisplay', (sec) => {
    if (sec % 5 === 0) collectAndSaveState();
  });
  window.startTimer = () => timer.start();
  window.pauseTimer = () => timer.pause();

  initHighlighting();
  initResizer();
  initAudioTranscriptSync();

  const user = stateManager.getUser();
  const nameInput = document.getElementById('studentNameInput');
  const emailInput = document.getElementById('studentEmailInput');
  if (nameInput && user.name) nameInput.value = user.name;
  if (emailInput && user.email) emailInput.value = user.email;

  const evaluator = new TestEvaluatorListening(window.TEST_DATA);

  window.checkAnswers = async () => {
    const studentName = nameInput ? nameInput.value.trim() : "";
    const studentEmail = emailInput ? emailInput.value.trim().toLowerCase() : "";

    if (!studentName || !studentEmail) {
      alert("⚠️ Vui lòng điền Họ tên và Email trước khi nộp bài!");
      return;
    }

    stateManager.saveUser(studentName, studentEmail);
    timer.stop();

    const evaluation = evaluator.evaluate();
    const scoreStr = `${evaluation.score}/${evaluation.total}`;
    
    const scoreBadge = document.getElementById('scoreBadge');
    const scoreText = document.getElementById('scoreText');
    if (scoreBadge) scoreBadge.style.display = 'block';
    if (scoreText) scoreText.innerText = scoreStr;

    document.body.classList.add('submitted-mode');

    if (window.enableSplitViewAfterSubmit) {
      window.enableSplitViewAfterSubmit();
    }

    collectAndSaveState(true, scoreStr);
    await evaluator.submitToCloud(evaluation, studentName, studentEmail, timer.formatTime(timer.seconds));
  };

  function collectAndSaveState(isSubmitted = false, scoreStr = '') {
    if (stateManager.isReviewMode) return;
    const state = {
      seconds: timer.seconds,
      isSubmitted: isSubmitted || document.body.classList.contains('submitted-mode'),
      scoreText: scoreStr || document.getElementById('scoreText')?.innerText || '',
      inputs: {},
      radios: {},
      selects: {},
      thoughts: {},
      aiResponses: {}
    };
    document.querySelectorAll('input.fill-input').forEach(i => state.inputs[i.id] = i.value);
    document.querySelectorAll('input[type="radio"]:checked').forEach(r => state.radios[r.name] = r.value);
    document.querySelectorAll('select.fill-input').forEach(s => state.selects[s.id] = s.value);
    document.querySelectorAll('.thought-box textarea').forEach(t => state.thoughts[t.id] = t.value);
    document.querySelectorAll('.ai-response').forEach(a => {
      if (a.innerHTML.trim() !== '') state.aiResponses[a.id] = a.innerHTML;
    });
    stateManager.saveTestProgress(state);
  }

  document.addEventListener('input', () => collectAndSaveState());
  document.addEventListener('change', () => collectAndSaveState());

  const urlParams = new URLSearchParams(window.location.search);
  const attemptId = urlParams.get('attemptId');
  const emailParam = urlParams.get('email');

  if (attemptId && emailParam && CONFIG.DRIVE_STORAGE_URL) {
    try {
      const res = await fetch(CONFIG.DRIVE_STORAGE_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action: "get_single_attempt", email: emailParam, attemptId: attemptId })
      });
      const data = await res.json();
      if (data?.attempt) {
        restoreReviewMode(data.attempt, timer, evaluator);
        return;
      }
    } catch (e) {
      console.warn("Không thể tải bài làm từ Cloud:", e);
    }
  }

  const saved = stateManager.getSavedProgress();
  if (saved) {
    if (saved.seconds) timer.setTime(saved.seconds);
    if (saved.inputs) Object.entries(saved.inputs).forEach(([id, val]) => { const el = document.getElementById(id); if (el) el.value = val; });
    if (saved.radios) Object.entries(saved.radios).forEach(([name, val]) => { const el = document.querySelector(`input[name="${name}"][value="${val}"]`); if (el) el.checked = true; });
    if (saved.selects) Object.entries(saved.selects).forEach(([id, val]) => { const el = document.getElementById(id); if (el) el.value = val; });
    if (saved.thoughts) Object.entries(saved.thoughts).forEach(([id, val]) => { const el = document.getElementById(id); if (el) el.value = val; });
    if (saved.aiResponses) Object.entries(saved.aiResponses).forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (el) { el.style.display = 'block'; el.innerHTML = val; }
    });

    if (saved.isSubmitted) {
      evaluator.evaluate();
      if (window.enableSplitViewAfterSubmit) window.enableSplitViewAfterSubmit();
      const scoreBadge = document.getElementById('scoreBadge');
      const scoreText = document.getElementById('scoreText');
      if (scoreBadge) scoreBadge.style.display = 'block';
      if (scoreText) scoreText.innerText = saved.scoreText;
      evaluator.renderPostSubmissionControls();
    }
  }
}

function restoreReviewMode(attempt, timer, evaluator) {
  stateManager.isReviewMode = true;
  timer.stop();

  const banner = document.createElement('div');
  banner.style.cssText = "background: #FEF3C7; color: #92400E; border: 2px solid #F59E0B; border-bottom: 4px solid #D97706; padding: 12px 18px; font-weight: 800; font-size: 14.5px; border-radius: 14px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;";
  banner.innerHTML = `
    <span>ĐANG XEM LẠI BÀI (${attempt.timestamp}) — Điểm: <b>${attempt.score}</b> (Học viên: ${attempt.studentName})</span>
    <div style="display:flex; gap:8px;">
      <button type="button" id="btnExitReview" style="background: #EF4444; color: white; border: none; border-bottom: 3px solid #B91C1C; padding: 7px 14px; border-radius: 10px; font-weight: 900; cursor: pointer;">Làm lại bài này</button>
      <a href="../index.html" style="background: #D97706; color: white; border-bottom: 3px solid #B45309; padding: 7px 14px; text-decoration: none; border-radius: 10px; font-weight: 900;">Về Trang chủ</a>
    </div>
  `;
  document.body.insertBefore(banner, document.body.firstChild);

  document.getElementById('btnExitReview')?.addEventListener('click', () => {
    stateManager.clearProgress();
    const cleanUrl = window.location.pathname + `?test=` + (new URLSearchParams(window.location.search).get('test') || '');
    window.location.href = cleanUrl;
  });

  if (attempt.inputs) {
    Object.entries(attempt.inputs).forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (el) { el.value = val; el.disabled = true; }
    });
  }
  if (attempt.radios) {
    Object.entries(attempt.radios).forEach(([name, val]) => {
      const el = document.querySelector(`input[name="${name}"][value="${val}"]`);
      if (el) el.checked = true;
    });
    document.querySelectorAll('input[type="radio"]').forEach(r => r.disabled = true);
  }
  if (attempt.selects) {
    Object.entries(attempt.selects).forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (el) { el.value = val; el.disabled = true; }
    });
  }
  if (attempt.thoughts) {
    Object.entries(attempt.thoughts).forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (el) { el.value = val; el.disabled = true; }
    });
  }
  if (attempt.aiResponses) {
    Object.entries(attempt.aiResponses).forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (el) { el.style.display = 'block'; el.innerHTML = val; }
    });
  }

  evaluator.evaluate();
  if (window.enableSplitViewAfterSubmit) window.enableSplitViewAfterSubmit();

  const scoreBadge = document.getElementById('scoreBadge');
  const scoreText = document.getElementById('scoreText');
  if (scoreBadge) scoreBadge.style.display = 'block';
  if (scoreText) scoreText.innerText = attempt.score;

  document.querySelectorAll('.btn-submit, .btn-full-submit, #btnBottomSubmit').forEach(b => b.remove());
}
