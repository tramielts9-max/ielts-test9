/**
 * vocab/js-v/app-v.js
 * BỘ ĐIỀU KHIỂN TỔNG THỂ TỪ VỰNG DUOLINGO X TRẠM IELTS (BẢN ĐẠI TU TOÀN DIỆN)
 * BẢN FULL ĐẦY ĐỦ 100% - KIỂM TRA BẢNG LIST 30 TỪ, AI CHẤM TRỌN GÓI 1 LẦN,
 * HỌC FLASHCARD TỪNG BÀI & ĐỒNG BỘ LỊCH SỬ TRANG CHỦ + GOOGLE DRIVE
 */

// 1. MÃ HÓA RUNTIME AUTH KEY CHO GEMINI AI
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

class VocabApp {
  constructor() {
    this.courses = [];
    this.currentCourse = null;
    this.currentCourseId = localStorage.getItem('sv_active_course_id') || 'course_ielts_300';
    this.user = this.getUserInfo();

    // Dữ liệu bài học hiện tại
    this.activeLesson = null;
    this.activeWords = [];
    
    // Trạng thái Flashcard
    this.fcCurrentIndex = 0;
    this.isCardFlipped = false;

    // Trạng thái Bài thi List 30 từ
    this.examTimerInterval = null;
    this.examSeconds = 0;
    this.isExamActive = false;
  }

  getUserInfo() {
    return {
      name: localStorage.getItem('ielts_student_name') || 'Học viên',
      email: (localStorage.getItem('ielts_student_email') || 'guest@gmail.com').toLowerCase().trim()
    };
  }

  async init() {
    this.updateUserHeaderUI();

    try {
      const res = await fetch('data-v/courses-v.json');
      this.courses = await res.json();
      this.currentCourse = this.courses.find(c => c.id === this.currentCourseId) || this.courses[0];
    } catch (e) {
      alert("⚠️ Không thể tải danh mục khóa học từ vựng!");
      return;
    }

    this.initCourseDropdown();
    this.renderRoadmapLessons();
    this.setupExamListeners();
    this.checkUrlDeepLink();
  }

  updateUserHeaderUI() {
    const userLabel = document.getElementById('userDisplayLabel');
    if (userLabel) userLabel.innerText = `${this.user.name} (${this.user.email})`;

    // Đếm chuỗi ngày học từ lịch sử chung
    const localHist = JSON.parse(localStorage.getItem('ielts_local_history') || '[]');
    const vocabAttempts = localHist.filter(item => (item.moduleType === 'vocab' || (item.testTitle && item.testTitle.includes('Từ vựng'))));
    
    const xpEl = document.getElementById('userXP');
    if (xpEl) xpEl.innerHTML = `<i class="fa-solid fa-bolt"></i> ${vocabAttempts.length * 30} KN`;
  }

  // =========================================================================
  // 1. THANH CHỌN KHÓA HỌC (300 TỪ / 540 TỪ)
  // =========================================================================
  initCourseDropdown() {
    const dropdown = document.getElementById('courseSelectorDropdown');
    if (!dropdown) return;

    dropdown.value = this.currentCourse.id;
    dropdown.onchange = (e) => {
      this.currentCourseId = e.target.value;
      localStorage.setItem('sv_active_course_id', this.currentCourseId);
      this.currentCourse = this.courses.find(c => c.id === this.currentCourseId) || this.courses[0];
      this.renderRoadmapLessons();
    };
  }

  // =========================================================================
  // 2. MÀN HÌNH CHÍNH: LỘ TRÌNH TỪNG UNIT (KÈM SỐ TỪ THUỘC & ĐIỂM KIỂM TRA)
  // =========================================================================
  renderRoadmapLessons() {
    const container = document.getElementById('roadmapLessonList');
    const titleEl = document.getElementById('courseBannerText');
    const badgeEl = document.getElementById('totalCourseProgressBadge');
    if (!container || !this.currentCourse) return;

    if (titleEl) titleEl.innerText = this.currentCourse.title;

    let totalLearnedAllUnits = 0;
    const totalWordsAllUnits = this.currentCourse.lessons.length * 30;

    container.innerHTML = this.currentCourse.lessons.map((lesson, idx) => {
      const stats = this.getUnitStats(lesson.file);
      totalLearnedAllUnits += stats.learnedCount;

      const isDone = stats.learnedCount > 0 || stats.attemptsCount > 0;

      return `
        <div class="vocab-unit-card">
          <div style="display: flex; align-items: center; gap: 16px;">
            <div style="width: 52px; height: 52px; border-radius: 16px; background: #FAF7F2; border: 2px solid #E8E2D8; display: flex; align-items: center; justify-content: center; font-size: 26px; flex-shrink: 0;">
              ${lesson.icon || '📖'}
            </div>
            <div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-family: monospace; font-size: 11px; font-weight: 900; background: #1E293B; color: white; padding: 2px 7px; border-radius: 6px;">UNIT ${lesson.unit}</span>
                <b style="font-size: 16.5px; color: #261F1D;">${lesson.title}</b>
              </div>
              <div style="font-size: 13.5px; font-weight: 700; color: #64748B; margin-top: 3px;">
                ${lesson.subTitle}
              </div>

              <!-- THỐNG KÊ CHI TIẾT TỪNG BÀI THEO YÊU CẦU TRANG 15 -->
              <div class="unit-stat-pills">
                <span class="pill-learned">
                  <i class="fa-solid fa-circle-check"></i> Đã thuộc: <b>${stats.learnedCount}/30 từ</b>
                </span>
                <span class="pill-score">
                  <i class="fa-solid fa-trophy"></i> Điểm cao nhất: <b>${stats.bestScore}/30</b>
                </span>
                <span class="pill-attempts">
                  <i class="fa-solid fa-rotate-right"></i> Đã làm: <b>${stats.attemptsCount} lần</b>
                </span>
              </div>
            </div>
          </div>

          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <button type="button" onclick="window.startVocabFlashcard('${lesson.file}', '${lesson.title}')" class="btn-3d btn-3d-blue">
              🧠 Học Từ Mới
            </button>
            <button type="button" onclick="window.startVocabListExam('${lesson.file}', '${lesson.title}', ${lesson.unit})" class="btn-3d btn-3d-red">
              📝 Kiểm Tra 30 Từ
            </button>
            ${stats.attemptsCount > 0 ? `
              <button type="button" onclick="window.viewPastVocabAttempt('${lesson.file}', '${lesson.title}', ${lesson.unit})" class="btn-3d btn-3d-white" title="Xem lại lần làm gần nhất">
                👁️ Xem lại
              </button>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');

    if (badgeEl) {
      const pct = Math.round((totalLearnedAllUnits / (totalWordsAllUnits || 1)) * 100);
      badgeEl.innerText = `Toàn khóa: ${totalLearnedAllUnits}/${totalWordsAllUnits} từ (${pct}%)`;
    }
  }

  // Quản lý dữ liệu học tập của từng Unit trong LocalStorage
  getUnitStorageKey(file) {
    const cleanEmail = this.user.email.replace(/[^a-zA-Z0-9]/g, '_');
    return `sv_unit_stats_${cleanEmail}_${file}`;
  }

  getUnitStats(file) {
    try {
      const raw = localStorage.getItem(this.getUnitStorageKey(file));
      return raw ? JSON.parse(raw) : { learnedCount: 0, learnedWordIds: [], bestScore: 0, attemptsCount: 0, lastAttempt: null };
    } catch(e) {
      return { learnedCount: 0, learnedWordIds: [], bestScore: 0, attemptsCount: 0, lastAttempt: null };
    }
  }

  saveUnitStats(file, stats) {
    localStorage.setItem(this.getUnitStorageKey(file), JSON.stringify(stats));
  }

  // =========================================================================
  // 3. MÀN HÌNH FLASHCARD: HỌC TỪ MỚI TRƯỚC KHI KHẢO BÀI
  // =========================================================================
  async openFlashcard(file, title) {
    try {
      const res = await fetch(`data-v/${file}`);
      this.activeWords = await res.json();
      this.activeLesson = { file, title };
      this.fcCurrentIndex = 0;
      this.isCardFlipped = false;

      document.getElementById('portalRoadmapView').style.display = 'none';
      document.getElementById('coursePickerSection').style.display = 'none';
      document.getElementById('listExamScreen').style.display = 'none';
      document.getElementById('flashcardScreen').style.display = 'block';

      this.renderCurrentFlashcard();
    } catch(e) {
      alert("Lỗi tải từ vựng: " + file);
    }
  }

  renderCurrentFlashcard() {
    const word = this.activeWords[this.fcCurrentIndex];
    if (!word) return;

    const counter = document.getElementById('fcCardCounterBadge');
    const wordEn = document.getElementById('fcWordEn');
    const meaningVn = document.getElementById('fcMeaningVn');
    const exampleEl = document.getElementById('fcExample');
    const frontSide = document.getElementById('fcFrontSide');
    const backSide = document.getElementById('fcBackSide');

    if (counter) counter.innerText = `Thẻ: ${this.fcCurrentIndex + 1}/${this.activeWords.length}`;
    if (wordEn) wordEn.innerText = word.word;
    if (meaningVn) meaningVn.innerText = word.meaning;
    if (exampleEl) exampleEl.innerText = word.example ? `"${word.example}"` : '';

    this.isCardFlipped = false;
    frontSide.style.display = 'block';
    backSide.style.display = 'none';
  }

  flipFlashcard() {
    this.isCardFlipped = !this.isCardFlipped;
    const frontSide = document.getElementById('fcFrontSide');
    const backSide = document.getElementById('fcBackSide');
    frontSide.style.display = this.isCardFlipped ? 'none' : 'block';
    backSide.style.display = this.isCardFlipped ? 'block' : 'none';
  }

  nextFlashcard() {
    if (this.fcCurrentIndex < this.activeWords.length - 1) {
      this.fcCurrentIndex++;
      this.renderCurrentFlashcard();
    } else {
      alert("🎉 Em đã xem hết toàn bộ 30 từ vựng của bài này! Giờ hãy vào làm bài kiểm tra 30 từ nhé.");
    }
  }

  prevFlashcard() {
    if (this.fcCurrentIndex > 0) {
      this.fcCurrentIndex--;
      this.renderCurrentFlashcard();
    }
  }

  markCurrentWordLearned() {
    const word = this.activeWords[this.fcCurrentIndex];
    if (!word || !this.activeLesson) return;

    const stats = this.getUnitStats(this.activeLesson.file);
    if (!stats.learnedWordIds) stats.learnedWordIds = [];

    if (!stats.learnedWordIds.includes(word.id)) {
      stats.learnedWordIds.push(word.id);
      stats.learnedCount = stats.learnedWordIds.length;
      this.saveUnitStats(this.activeLesson.file, stats);
    }

    this.nextFlashcard();
  }

  // =========================================================================
  // 4. MÀN HÌNH BÀI THI: BẢNG LIST 30 TỪ CHIA 2 CỘT (CHUẨN TRANG 15)
  // =========================================================================
  async openListExam(file, title, unitNum) {
    try {
      const res = await fetch(`data-v/${file}`);
      this.activeWords = await res.json();
      this.activeLesson = { file, title, unitNum };

      document.getElementById('portalRoadmapView').style.display = 'none';
      document.getElementById('coursePickerSection').style.display = 'none';
      document.getElementById('flashcardScreen').style.display = 'none';
      document.getElementById('listExamScreen').style.display = 'block';

      document.getElementById('examUnitTitleDisplay').innerText = `BÀI KIỂM TRA TỪ VỰNG: ${title.toUpperCase()}`;
      document.getElementById('examStudentNameDisplay').innerText = `Học viên: ${this.user.name} • Mục tiêu: Điền đúng nghĩa 30 từ`;

      this.renderExamTableInputs();
      this.restoreExamDraft();
      this.startExamTimer();

      document.getElementById('aiExamResultContainer').style.display = 'none';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch(e) {
      alert("Lỗi tải bài kiểm tra: " + file);
    }
  }

  renderExamTableInputs() {
    const leftTbody = document.getElementById('examTbodyLeft');
    const rightTbody = document.getElementById('examTbodyRight');
    leftTbody.innerHTML = '';
    rightTbody.innerHTML = '';

    const first15 = this.activeWords.slice(0, 15);
    const last15 = this.activeWords.slice(15, 30);

    const renderRows = (words, startIndex) => {
      return words.map((w, idx) => {
        const rowNum = startIndex + idx + 1;
        return `
          <tr id="row_vocab_${w.id}">
            <td class="col-stt">${rowNum}</td>
            <td class="col-en">
              <b>${w.word}</b>
            </td>
            <td>
              <input type="text" id="inp_vocab_${w.id}" data-id="${w.id}" class="col-vn-input" placeholder="Gõ nghĩa tiếng Việt..." autocomplete="off">
              <div id="correct_lbl_${w.id}" style="display:none; font-size:11.5px; font-weight:800; color:#166534; margin-top:2px;"></div>
            </td>
          </tr>
        `;
      }).join('');
    };

    leftTbody.innerHTML = renderRows(first15, 0);
    rightTbody.innerHTML = renderRows(last15, 15);
  }

  setupExamListeners() {
    // Tự động lưu nháp sau khi học sinh ngừng gõ 1.5 giây
    const form = document.getElementById('vocabTestForm');
    let autoSaveTimeout = null;
    form?.addEventListener('input', () => {
      clearTimeout(autoSaveTimeout);
      autoSaveTimeout = setTimeout(() => this.saveExamDraft(), 1500);
    });

    document.getElementById('btnSaveDraftVocab')?.addEventListener('click', () => {
      this.saveExamDraft();
      alert("✅ Đã lưu tạm bài kiểm tra thành công! Em có thể thoát ra và quay lại điền tiếp.");
    });

    document.getElementById('btnSubmitVocabList')?.addEventListener('click', () => {
      this.submitVocabListForAIGrading();
    });
  }

  getExamDraftKey() {
    return `sv_draft_${this.user.email}_${this.activeLesson?.file}`;
  }

  saveExamDraft() {
    if (!this.activeLesson) return;
    const inputsData = {};
    this.activeWords.forEach(w => {
      const el = document.getElementById(`inp_vocab_${w.id}`);
      if (el) inputsData[w.id] = el.value;
    });

    const draft = {
      seconds: this.examSeconds,
      inputs: inputsData,
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem(this.getExamDraftKey(), JSON.stringify(draft));
  }

  restoreExamDraft() {
    try {
      const raw = localStorage.getItem(this.getExamDraftKey());
      if (!raw) return;
      const draft = JSON.parse(raw);
      this.examSeconds = draft.seconds || 0;
      this.updateTimerDisplay();

      if (draft.inputs) {
        Object.entries(draft.inputs).forEach(([id, val]) => {
          const el = document.getElementById(`inp_vocab_${id}`);
          if (el) el.value = val;
        });
      }
    } catch(e) {}
  }

  clearExamDraft() {
    if (this.activeLesson) {
      localStorage.removeItem(this.getExamDraftKey());
    }
  }

  startExamTimer() {
    this.stopExamTimer();
    this.examTimerInterval = setInterval(() => {
      this.examSeconds++;
      this.updateTimerDisplay();
    }, 1000);
  }

  stopExamTimer() {
    if (this.examTimerInterval) {
      clearInterval(this.examTimerInterval);
      this.examTimerInterval = null;
    }
  }

  updateTimerDisplay() {
    const el = document.getElementById('examTimerDisplay');
    if (!el) return;
    const mm = String(Math.floor(this.examSeconds / 60)).padStart(2, '0');
    const ss = String(this.examSeconds % 60).padStart(2, '0');
    el.innerText = `${mm}:${ss}`;
  }

  // =========================================================================
  // 5. GỌI AI GEMINI CHẤM TRỌN GÓI 30 TỪ TRONG 1 REQUEST DUY NHẤT
  // =========================================================================
  async submitVocabListForAIGrading() {
    const studentInputs = [];
    let filledCount = 0;

    this.activeWords.forEach((w, idx) => {
      const inputEl = document.getElementById(`inp_vocab_${w.id}`);
      const val = (inputEl?.value || '').trim();
      if (val) filledCount++;
      studentInputs.push({
        stt: idx + 1,
        id: w.id,
        word: w.word,
        standardMeaning: w.meaning,
        studentMeaning: val || "(Bỏ trống)"
      });
    });

    if (filledCount === 0) {
      alert("⚠️ Em hãy điền nghĩa tiếng Việt của các từ trước khi nộp bài nhé!");
      return;
    }

    const submitBtn = document.getElementById('btnSubmitVocabList');
    submitBtn.disabled = true;
    submitBtn.innerHTML = `⏳ AI Gemini đang chấm trọn gói 30 từ...`;

    this.stopExamTimer();

    // PROMPT CHẤM TRỌN GÓI CẢ DANH SÁCH 30 TỪ
    const prompt = `
Bạn là Giáo viên Khảo thí Từ vựng tiếng Anh.
Nhiệm vụ: Chấm điểm bài kiểm tra từ vựng (gồm 30 từ) dưới đây của học sinh.
TIÊU CHÍ CHẤM:
- Chấp nhận các từ đồng nghĩa tiếng Việt hợp lý hoặc cách dịch sát nghĩa (không bắt bẻ từng dấu câu).
- Nếu học sinh hiểu đúng bản chất nghĩa từ -> isCorrect: true.
- Nếu sai hoàn toàn hoặc để trống -> isCorrect: false.

DANH SÁCH 30 TỪ VÀ BÀI LÀM CỦA HỌC SINH:
${JSON.stringify(studentInputs, null, 2)}

HÃY TRẢ VỀ DUY NHẤT 1 CHUỖI JSON THUẦN (KHÔNG MARKDOWN, KHÔNG \`\`\`json):
{
  "totalCorrect": 25,
  "summary": "Nhận xét tổng quát 1-2 câu ngắn gọn về độ hiểu từ vựng của em.",
  "results": [
    {
      "id": "w300_001",
      "isCorrect": true,
      "feedback": "Đúng nghĩa."
    }
  ]
}
`;

    try {
      const apiKey = getDecodedKey();
      const aiResponse = await this.callGeminiRaw(apiKey, prompt);
      const cleanJson = aiResponse.replace(/^```json/, '').replace(/```$/, '').trim();
      const gradingResult = JSON.parse(cleanJson);

      this.applyGradingResultUI(gradingResult, studentInputs);
      this.clearExamDraft();
    } catch (err) {
      console.warn("Lỗi AI chấm, chuyển sang chấm tự động bằng thuật toán từ điển:", err);
      // Fallback chấm offline chống mất bài
      this.fallbackLocalGrading(studentInputs);
      this.clearExamDraft();
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `🚀 NỘP BÀI & GỌI AI CHẤM TRỌN GÓI 30 TỪ`;
    }
  }

  async callGeminiRaw(apiKey, promptText) {
    const models = [
      'gemini-3.5-flash-lite',
      'gemini-3.1-flash-lite',
      'gemini-2.0-flash-lite',
      'gemini-2.0-flash',
      'gemini-1.5-flash'
    ];

    for (const m of models) {
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: promptText }] }] })
        });
        if (res.ok) {
          const data = await res.json();
          const txt = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (txt) return txt;
        }
      } catch (e) {}
    }
    throw new Error("Không thể kết nối đến AI.");
  }

  // Chấm offline nếu mạng lỗi
  fallbackLocalGrading(studentInputs) {
    let correctCount = 0;
    const results = studentInputs.map(item => {
      const cleanStd = item.standardMeaning.toLowerCase();
      const cleanUser = item.studentMeaning.toLowerCase();
      const isOk = cleanUser !== '(bỏ trống)' && (cleanStd.includes(cleanUser) || cleanUser.includes(cleanStd.split('/')[0].trim()));
      if (isOk) correctCount++;
      return { id: item.id, isCorrect: isOk, feedback: isOk ? "Đúng nghĩa." : `Nghĩa chuẩn: ${item.standardMeaning}` };
    });

    const gradingResult = {
      totalCorrect: correctCount,
      summary: `Em đã hoàn thành bài kiểm tra 30 từ với kết quả ${correctCount}/30 từ đúng.`,
      results
    };
    this.applyGradingResultUI(gradingResult, studentInputs);
  }

  applyGradingResultUI(gradingResult, studentInputs) {
    const resultMap = new Map();
    (gradingResult.results || []).forEach(r => resultMap.set(r.id, r));

    let correctCount = gradingResult.totalCorrect !== undefined ? gradingResult.totalCorrect : 0;
    const learnedIdsToSave = [];

    studentInputs.forEach(item => {
      const res = resultMap.get(item.id) || { isCorrect: false };
      const inputEl = document.getElementById(`inp_vocab_${item.id}`);
      const lblEl = document.getElementById(`correct_lbl_${item.id}`);

      if (inputEl) {
        inputEl.disabled = true;
        if (res.isCorrect) {
          inputEl.classList.add('is-correct');
          learnedIdsToSave.push(item.id);
        } else {
          inputEl.classList.add('is-wrong');
          if (lblEl) {
            lblEl.style.display = 'block';
            lblEl.innerHTML = `👉 Nghĩa chuẩn: <b>${item.standardMeaning}</b>`;
          }
        }
      }
    });

    // Cập nhật Box kết quả
    const resBox = document.getElementById('aiExamResultContainer');
    const badge = document.getElementById('examScoreBadge');
    const summary = document.getElementById('aiSummaryFeedback');

    resBox.style.display = 'block';
    badge.innerText = `Điểm: ${correctCount}/30 (${Math.round((correctCount/30)*100)}%)`;
    summary.innerHTML = `
      <div style="margin-bottom:6px;"><b>Nhận xét:</b> ${gradingResult.summary || 'Em đã hoàn thành xuất sắc bài kiểm tra 30 từ!'}</div>
      <div style="font-size:12.5px; color:#15803D;">⏱️ Thời gian làm: <b>${Math.floor(this.examSeconds/60)}p ${this.examSeconds%60}s</b> • Bài thi đã được đồng bộ lên Lịch sử Trang Chủ & Google Drive.</div>
    `;

    resBox.scrollIntoView({ behavior: 'smooth', block: 'start' });

    // Lưu vào thống kê Unit
    this.saveUnitExamRecord(correctCount, learnedIdsToSave);
  }

  saveUnitExamRecord(score, newlyLearnedIds) {
    const stats = this.getUnitStats(this.activeLesson.file);
    stats.attemptsCount = (stats.attemptsCount || 0) + 1;
    stats.bestScore = Math.max(stats.bestScore || 0, score);

    if (!stats.learnedWordIds) stats.learnedWordIds = [];
    newlyLearnedIds.forEach(id => {
      if (!stats.learnedWordIds.includes(id)) stats.learnedWordIds.push(id);
    });
    stats.learnedCount = stats.learnedWordIds.length;
    this.saveUnitStats(this.activeLesson.file, stats);

    // Lưu vào Lịch sử chung trang chủ index.html
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')} - ${String(now.getDate()).padStart(2,'0')}/${String(now.getMonth()+1).padStart(2,'0')}/${now.getFullYear()}`;
    const speedStr = `${Math.floor(this.examSeconds/60)}p ${this.examSeconds%60}s`;

    const attemptSnapshot = {
      id: "attempt_vocab_" + Date.now(),
      timestamp: timeStr,
      testTitle: `Khảo Từ Vựng: ${this.activeLesson.title} (30 từ)`,
      studentName: this.user.name,
      studentEmail: this.user.email,
      score: `${score}/30`,
      timeSpent: speedStr,
      details: `Đạt ${score}/30 từ trong ${speedStr}. Đã tích lũy ${stats.learnedCount}/30 từ thuộc bài này.`,
      pageUrl: `vocab/index-v.html?unit=${this.activeLesson.unitNum || 1}`,
      moduleType: "vocab"
    };

    try {
      const localHist = JSON.parse(localStorage.getItem('ielts_local_history') || '[]');
      localHist.unshift(attemptSnapshot);
      localStorage.setItem('ielts_local_history', JSON.stringify(localHist));
    } catch(e) {}

    fetch(CLOUD_SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "save_attempt", attempt: attemptSnapshot })
    }).catch(() => {});
  }

  viewPastVocabAttempt(file, title, unitNum) {
    this.openListExam(file, title, unitNum);
  }

  backToPortal() {
    this.stopExamTimer();
    document.getElementById('flashcardScreen').style.display = 'none';
    document.getElementById('listExamScreen').style.display = 'none';
    document.getElementById('portalRoadmapView').style.display = 'block';
    document.getElementById('coursePickerSection').style.display = 'flex';
    this.renderRoadmapLessons();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Tự động nhận diện ?unit= trên URL khi bấm từ lộ trình Roadmap
  checkUrlDeepLink() {
    const params = new URLSearchParams(window.location.search);
    const unitParam = parseInt(params.get('unit'), 10);
    if (!isNaN(unitParam) && this.currentCourse) {
      const matched = this.currentCourse.lessons.find(l => l.unit === unitParam);
      if (matched) {
        this.openListExam(matched.file, matched.title, matched.unit);
      }
    }
  }
}

// Khởi tạo app và gắn hàm toàn cục
const app = new VocabApp();
document.addEventListener('DOMContentLoaded', () => app.init());

window.vocabApp = app;
window.startVocabFlashcard = (f, t) => app.openFlashcard(f, t);
window.startVocabListExam = (f, t, u) => app.openListExam(f, t, u);
window.viewPastVocabAttempt = (f, t, u) => app.viewPastVocabAttempt(f, t, u);
window.backToVocabPortal = () => app.backToPortal();
window.flipCurrentFlashcard = () => app.flipFlashcard();
window.nextFlashcard = () => app.nextFlashcard();
window.prevFlashcard = () => app.prevFlashcard();
window.markFlashcardLearned = () => app.markCurrentWordLearned();
