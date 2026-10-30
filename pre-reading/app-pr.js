/**
 * pre-reading/app-pr.js
 * BỘ ĐIỀU KHIỂN DANH SÁCH BÀI ĐỌC THEO LEVEL CEFR DUOLINGO 3D
 * BẢN FULL ĐẦY ĐỦ 100% - HIỂN THỊ KẾT QUẢ CẢ LẦN 1 VÀ LẦN 2 TRÊN THẺ BÀI
 */
import '../../js/auth-lock.js';
import { initDB, getAllSubmissions } from './db-pr.js';
import { initModal, openModal } from './modal-pr.js';
import { exportReport } from './export-pr.js';

let readingData = {};
let currentLevel = 'A1';
const LEVELS = ["A1", "A2", "B1", "B1+", "B2", "C1"];

async function start() {
  await initDB();
  initModal(() => renderLessons());

  try {
    const res = await fetch('./data-pr.json');
    readingData = await res.json();
  } catch (err) {
    console.error("Lỗi đọc data-pr.json:", err);
  }

  buildLevelTabs();
  document.getElementById('searchInput')?.addEventListener('input', () => renderLessons());
  window.exportSummaryPR = exportReport;
  window.openSubmitModalPR = (id, title) => openModal(id, title, currentLevel);
}

function buildLevelTabs() {
  const container = document.getElementById('level-container');
  if (!container) return;
  container.innerHTML = '';

  LEVELS.forEach(lvl => {
    const btn = document.createElement('button');
    const isActive = lvl === currentLevel;
    const lvlClass = lvl.replace('+', 'plus');
    btn.className = `pr-level-btn lvl-${lvlClass} ${isActive ? 'active' : ''}`;
    btn.innerText = lvl;
    btn.onclick = () => {
      currentLevel = lvl;
      buildLevelTabs();
    };
    container.appendChild(btn);
  });

  renderLessons();
}

async function renderLessons() {
  const container = document.getElementById('lessonList');
  if (!container) return;
  const search = document.getElementById('searchInput')?.value.toLowerCase() || '';
  const lessons = readingData[currentLevel] || [];

  const allSubs = await getAllSubmissions();
  const subMap = new Map(allSubs.map(s => [s.id, s]));

  let completedCount = 0;
  let filtered = [];

  lessons.forEach((l, idx) => {
    const id = `reading_${currentLevel}_${idx}`;
    const sub = subMap.get(id);
    if (sub) completedCount++;
    if (l.title.toLowerCase().includes(search)) {
      filtered.push({ ...l, id, sub, index: idx + 1 });
    }
  });

  const progressBadge = document.getElementById('progress-badge');
  if (progressBadge) {
    progressBadge.innerText = `${completedCount}/${lessons.length} Đã nộp`;
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; padding: 40px; text-align: center; color: var(--text-muted); font-weight: 800; font-size: 16px; background: #FFFFFF; border-radius: 22px; border: 2.5px dashed var(--border-color);">
        Không tìm thấy bài tập nào phù hợp!
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(item => {
    const isDone = !!item.sub;
    const attempts = item.sub?.attempts || (isDone ? [{ attemptNum: 1, correct: item.sub.correct, total: item.sub.total, timestamp: item.sub.timestamp }] : []);
    const attemptCount = attempts.length;
    const firstAttempt = attempts[0];
    const latestAttempt = attempts.length > 1 ? attempts[attempts.length - 1] : null;

    let attemptsHtml = '';
    if (isDone) {
      const p1 = firstAttempt.total > 0 ? Math.round((firstAttempt.correct / firstAttempt.total) * 100) : 0;
      attemptsHtml = `
        <div style="display: flex; flex-direction: column; gap: 4px; margin-top: 6px;">
          <div style="font-size: 12.5px; font-weight: 800; color: #166534; background: #DCFCE7; border: 1.5px solid #86EFAC; border-radius: 8px; padding: 3px 8px; display: inline-flex; align-items: center; gap: 6px;">
            <span style="background: #166534; color: white; padding: 1px 5px; border-radius: 4px; font-size: 10.5px;">LẦN 1</span>
            <span>🎯 ${firstAttempt.correct}/${firstAttempt.total} (${p1}%)</span>
          </div>
          ${latestAttempt ? `
            <div style="font-size: 12.5px; font-weight: 800; color: #065F46; background: #A7F3D0; border: 1.5px solid #34D399; border-radius: 8px; padding: 3px 8px; display: inline-flex; align-items: center; gap: 6px;">
              <span style="background: #059669; color: white; padding: 1px 5px; border-radius: 4px; font-size: 10.5px;">LẦN ${attemptCount}</span>
              <span>🎯 ${latestAttempt.correct}/${latestAttempt.total} (${Math.round((latestAttempt.correct / latestAttempt.total) * 100)}%)</span>
            </div>
          ` : ''}
        </div>
      `;
    }

    return `
      <div class="pr-lesson-card ${isDone ? 'is-done' : ''}">
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
            <span class="pr-card-tag" style="background: ${isDone ? '#DCFCE7' : '#F1ECE6'}; color: ${isDone ? '#166534' : '#475569'};">
              Bài ${item.index} • ${currentLevel}
            </span>
            ${isDone 
              ? `<span style="font-size: 12.5px; font-weight: 900; background: #FEF3C7; color: #92400E; padding: 2px 8px; border-radius: 8px; border: 1px solid #FCD34D;">
                   Đã làm ${attemptCount} lần
                 </span>` 
              : `<span style="font-size: 13px; font-weight: 800; color: var(--text-muted);">
                   ● Chưa làm
                 </span>`
            }
          </div>

          <h4 class="pr-card-title">
            ${item.title}
          </h4>

          ${attemptsHtml}
        </div>

        <div style="padding-top: 14px; border-top: 2px dashed var(--border-color); display: flex; gap: 10px; align-items: center; margin-top: 12px;">
          <a href="${item.url}" target="_blank" class="btn-3d btn-3d-white" style="flex: 1; padding: 10px 12px; font-size: 13px;">
            Làm bài →
          </a>
          <button onclick="window.openSubmitModalPR('${item.id}', '${item.title.replace(/'/g, "\\'")}')" class="btn-3d ${isDone ? 'btn-3d-green' : 'btn-3d-amber'}" style="flex: 1.2; padding: 10px 12px; font-size: 13px;">
            ${isDone ? `+ Nộp lần ${attemptCount + 1}` : 'Nộp bài'}
          </button>
        </div>
      </div>
    `;
  }).join('');
}

window.addEventListener('DOMContentLoaded', start);
