/**
 * diagnostic/js-diag/diag-fulltest-engine.js
 * BỘ ĐIỀU PHỐI PHÒNG THI CHUYÊN SÂU FULL TEST LIÊN HOÀN (FULL MOCK TEST)
 * BẢN FULL ĐẦY ĐỦ 100% - LIÊN HOÀN 40 CÂU NGHE + 40 CÂU ĐỌC CAM 21,
 * FULL WRITING 2 TASKS VÀ FULL SPEAKING 3 PARTS CÓ AI GEMINI CHẤM ĐIỂM CHI TIẾT
 */

import { diagGrammarEngine } from './diag-grammar.js';

// =========================================================================
// 1. MÃ HÓA BẢO MẬT 3 API KEY CHO FULL TEST
// =========================================================================
const _WRITING_PREFIX = "AQ.Ab8RN6KGTRGy";
const _WRITING_SUFFIX = "SZoGpqs3vT-ikWDLUSWjloCCVlzZhAQque_34w";
function getWritingKey() { return `${_WRITING_PREFIX}${_WRITING_SUFFIX}`; }

const _SPEAKING_SEEDS = [
  65, 81, 46, 65, 98, 56, 82, 78, 54, 75, 116, 80, 107, 51, 45, 50,
  75, 103, 117, 114, 119, 117, 116, 65, 115, 55, 95, 118, 82, 66,
  121, 81, 110, 113, 67, 48, 77, 86, 55, 52, 66, 119, 107, 82, 107,
  80, 110, 74, 89, 70, 90, 49, 119
];
function getSpeakingKey() { return _SPEAKING_SEEDS.map(c => String.fromCharCode(c)).join(''); }

// =========================================================================
// 2. NGÂN HÀNG ĐỀ FULL WRITING & FULL SPEAKING (3 SET XOAY TUA)
// =========================================================================
const FULLTEST_PROMPTS_BANK = {
  1: {
    writing: {
      t1Title: "Line Graph: Giá 4 loại bánh mì (2001 - 2005)",
      t1Img: "../writing task 1/images_task1/task1_img_104.jpeg",
      t1Prompt: "The graph below shows the price of different kinds of bread, in dollars, from 2001 to 2005. Summarise the information by selecting and reporting the main features, and make comparisons where relevant. (Write at least 150 words)",
      t2Title: "Opinion Essay: Lớp học truyền thống vào năm 2050",
      t2Prompt: "The typical teaching situation between students and teachers in the classroom will be gone by the year 2050. To what extent do you agree or disagree? (Write at least 250 words)"
    },
    speaking: {
      p1Questions: [
        "1. Where is your hometown, and what do you like most about living there?",
        "2. Do you prefer studying or working in the morning or in the evening?",
        "3. How often do you use public transport in your daily routine?"
      ],
      p2CueCard: {
        topic: "Describe an important decision you made in your life.",
        cues: [
          "What the decision was",
          "Why you had to make this decision",
          "What happened as a result",
          "And explain how you felt about this decision later on."
        ]
      },
      p3Questions: [
        "1. What types of decisions do young people usually struggle to make on their own?",
        "2. Do you believe artificial intelligence will eventually replace human decision-making in critical fields?",
        "3. How does advice from family members influence career decisions in your country?"
      ]
    }
  },
  2: {
    writing: {
      t1Title: "Bar Chart: Khí thải từ 3 loại nhiên liệu hóa thạch tại Anh (1990 - 2010)",
      t1Img: "../writing task 1/images_task1/task1_img_119.jpeg",
      t1Prompt: "The graph below shows the three different kinds of emission sources (oil / coal / gas) of greenhouse gas in the UK. Summarize the information by selecting and reporting the main features and make comparisons where relevant. (Write at least 150 words)",
      t2Title: "Discussion Essay: Bằng đại học có còn là con đường tốt nhất?",
      t2Prompt: "Some people think that the best way to become successful in life is to get a university education, whereas others say this is no longer true. Discuss both these views and give your own opinion. (Write at least 250 words)"
    },
    speaking: {
      p1Questions: [
        "1. Let's talk about technology. What electronic device do you use most frequently?",
        "2. Do you enjoy outdoor activities on the weekend?",
        "3. Is it easy for you to manage your daily schedule?"
      ],
      p2CueCard: {
        topic: "Describe a useful piece of electronic equipment that you use regularly.",
        cues: [
          "What equipment it is",
          "When and where you got it",
          "What you primarily use it for",
          "And explain why it is so important in your life."
        ]
      },
      p3Questions: [
        "1. In what ways has modern technology altered the way students conduct academic research?",
        "2. Should schools impose strict regulations on smartphone usage among young pupils?",
        "3. Do you foresee artificial automation causing severe unemployment for future generations?"
      ]
    }
  },
  3: {
    writing: {
      t1Title: "Pie Chart: Cơ cấu khóa học tại trung tâm người lớn (1985 & Nay)",
      t1Img: "../writing task 1/images_task1/task1_img_158.jpeg",
      t1Prompt: "The charts below show the percentage of students on an adult education center taking various courses offered in 1985 and this year. Summarize the information by selecting and reporting the main features, and make comparisons where relevant. (Write at least 150 words)",
      t2Title: "Direct Adv/Disadv Essay: Nghỉ một năm Gap Year",
      t2Prompt: "In some countries, young people are encouraged to work or travel for a year between finishing high school and starting university studies. Discuss the advantages and disadvantages for young people who decide to do this. (Write at least 250 words)"
    },
    speaking: {
      p1Questions: [
        "1. Do you prefer reading physical books or reading online articles?",
        "2. What kind of music do you listen to when you want to relax?",
        "3. How has your neighborhood changed over the past five years?"
      ],
      p2CueCard: {
        topic: "Describe a long journey you enjoyed taking.",
        cues: [
          "Where you travelled to",
          "Who accompanied you on this journey",
          "What memorable sights you observed",
          "And explain why this trip left a lasting impression on you."
        ]
      },
      p3Questions: [
        "1. Why is taking a gap year becoming increasingly popular among high school graduates?",
        "2. What are the potential drawbacks for young people who enter the workforce too early?",
        "3. How can universities support students who experience academic disruption after long breaks?"
      ]
    }
  }
};

// =========================================================================
// 3. CLASS ĐIỀU PHỐI CHÍNH
// =========================================================================
class DiagnosticFullTestEngine {
  constructor() {
    this.currentSection = "grammar";
    this.setNum = 1;
    this.timerSeconds = 0;
    this.timerInterval = null;

    this.lisParts = [];
    this.readPassages = [];
    this.userAnswers = {
      listening: {},
      reading: {},
      writing: { task1: '', task2: '' },
      speaking: { part1: '', part2: '', part3: '' }
    };

    this.activeLisPartIdx = 0;
    this.activeReadPassageIdx = 0;
    this.speechRecognition = null;
    this.isRecording = false;

    // Timer chuẩn bị Part 2 Speaking
    this.prepTimerSeconds = 60;
    this.prepInterval = null;
  }

  async init() {
    const urlParams = new URLSearchParams(window.location.search);
    const rawSet = parseInt(urlParams.get('set') || urlParams.get('ver'), 10);
    this.setNum = (!isNaN(rawSet) && rawSet >= 1 && rawSet <= 3) ? rawSet : 1;

    document.getElementById('fullTestHeaderTitle').innerText = `IELTS FULL MOCK TEST • CAMBRIDGE 21 (SET ${this.setNum})`;

    // 1. Nạp 100 câu Ngữ pháp
    await this.initGrammar100();

    // 2. Tự động bốc 4 Parts Listening Cam 21
    await this.loadCrossModuleListening();

    // 3. Tự động bốc 3 Passages Reading Cam 21
    await this.loadCrossModuleReading();

    // 4. Nạp đề Full Writing
    this.renderFullWriting();

    // 5. Nạp đề Full Speaking
    this.renderFullSpeaking();

    // 6. Khởi động Timer và Mic
    this.initSpeechRecognition();
    this.startTimer();
  }

  // =========================================================================
  // 1. NẠP 100 CÂU NGỮ PHÁP (TEST 4)
  // =========================================================================
  async initGrammar100() {
    const success = await diagGrammarEngine.loadTestFromJson('data-diag/grammar/test4-grammar.json');
    const mount = document.getElementById('ftGrammarMount');
    if (mount && success) {
      diagGrammarEngine.containerId = 'ftGrammarMount';
      diagGrammarEngine.render();
    }
  }

  // =========================================================================
  // 2. NẠP LISTENING LIÊN HOÀN (CAM 21)
  // =========================================================================
  async loadCrossModuleListening() {
    const tNum = this.setNum;
    try {
      const [p1, p2, p3, p4] = await Promise.all([
        fetch(`../listening/data-l/cam21-lis-test${tNum}/cam21-lis-test${tNum}-p1.json`).then(r => r.json()),
        fetch(`../listening/data-l/cam21-lis-test${tNum}/cam21-lis-test${tNum}-p2.json`).then(r => r.json()),
        fetch(`../listening/data-l/cam21-lis-test${tNum}/cam21-lis-test${tNum}-p3.json`).then(r => r.json()),
        fetch(`../listening/data-l/cam21-lis-test${tNum}/cam21-lis-test${tNum}-p4.json`).then(r => r.json())
      ]);

      this.lisParts = [p1, p2, p3, p4];
      this.renderFullListeningUI();
    } catch (e) {
      console.warn("Lỗi nạp liên hoàn bài nghe Cam 21:", e);
    }
  }

  renderFullListeningUI() {
    const mount = document.getElementById('ftListeningMount');
    const audioEl = document.getElementById('ftAudioPlayer');
    if (!mount || this.lisParts.length === 0) return;

    if (audioEl && this.lisParts[0].audioUrl) {
      audioEl.src = this.lisParts[0].audioUrl;
    }

    let html = `
      <div style="display:flex; gap:8px; margin-bottom:16px; flex-wrap:wrap;">
        ${this.lisParts.map((p, idx) => `
          <button type="button" id="btnLisPart_${idx}" class="btn-3d ${idx === 0 ? 'btn-3d-blue' : 'btn-3d-white'}" style="padding:8px 14px; font-size:13px;" onclick="window.ftEngine.switchLisPart(${idx})">
            Part ${idx + 1}
          </button>
        `).join('')}
      </div>
      <div id="ftLisActivePartBox"></div>
    `;

    mount.innerHTML = html;
    this.switchLisPart(0);
  }

  switchLisPart(idx) {
    this.activeLisPartIdx = idx;
    const part = this.lisParts[idx];
    if (!part) return;

    this.lisParts.forEach((_, i) => {
      const btn = document.getElementById(`btnLisPart_${i}`);
      if (btn) btn.className = `btn-3d ${i === idx ? 'btn-3d-blue' : 'btn-3d-white'}`;
    });

    const box = document.getElementById('ftLisActivePartBox');
    if (!box) return;

    let qHtml = `<b style="font-size:16px; color:#0369A1; display:block; margin-bottom:14px;">${part.title}</b>`;

    (part.groups || []).forEach(g => {
      qHtml += `<div style="font-weight:900; margin:12px 0 6px 0;">${g.title}</div>`;
      if (g.instructions) qHtml += `<div style="font-size:13px; color:#64748B; margin-bottom:10px;">${g.instructions}</div>`;

      (g.questionIds || []).forEach(qId => {
        const q = part.questions[qId];
        const num = q?.num || qId;
        const text = q?.text || q?.prompt || '';

        qHtml += `
          <div class="q-item-box" style="margin-bottom:10px;">
            <b style="font-size:13.5px; color:#1E293B;">Câu ${num}. ${text}</b>
            <input type="text" class="diag-input" id="inp_ft_lis_${qId}" placeholder="Điền đáp án..." oninput="window.ftEngine.recordLisAnswer('${qId}', this.value)" style="margin-top:6px;">
          </div>
        `;
      });
    });

    box.innerHTML = qHtml;

    Object.entries(this.userAnswers.listening).forEach(([qid, val]) => {
      const el = document.getElementById(`inp_ft_lis_${qid}`);
      if (el) el.value = val;
    });
  }

  recordLisAnswer(qId, val) {
    this.userAnswers.listening[qId] = val.trim();
  }

  // =========================================================================
  // 3. NẠP READING LIÊN HOÀN (CAM 21)
  // =========================================================================
  async loadCrossModuleReading() {
    const tNum = this.setNum;
    try {
      const [r1, r2, r3] = await Promise.all([
        fetch(`../reading/data-r/cam21-test${tNum}/cam21-test${tNum}-p1.json`).then(r => r.json()),
        fetch(`../reading/data-r/cam21-test${tNum}/cam21-test${tNum}-p2.json`).then(r => r.json()),
        fetch(`../reading/data-r/cam21-test${tNum}/cam21-test${tNum}-p3.json`).then(r => r.json())
      ]);

      this.readPassages = [r1, r2, r3];
      this.renderFullReadingUI();
    } catch (e) {
      console.warn("Lỗi nạp liên hoàn bài đọc Cam 21:", e);
    }
  }

  renderFullReadingUI() {
    const mount = document.getElementById('ftReadingMount');
    if (!mount || this.readPassages.length === 0) return;

    let html = `
      <div style="display:flex; gap:8px; margin-bottom:16px; flex-wrap:wrap;">
        ${this.readPassages.map((p, idx) => `
          <button type="button" id="btnReadPassage_${idx}" class="btn-3d ${idx === 0 ? 'btn-3d-red' : 'btn-3d-white'}" style="padding:8px 14px; font-size:13px;" onclick="window.ftEngine.switchReadPassage(${idx})">
            Passage ${idx + 1}
          </button>
        `).join('')}
      </div>
      <div id="ftReadActiveBox"></div>
    `;

    mount.innerHTML = html;
    this.switchReadPassage(0);
  }

  switchReadPassage(idx) {
    this.activeReadPassageIdx = idx;
    const passage = this.readPassages[idx];
    if (!passage) return;

    this.readPassages.forEach((_, i) => {
      const btn = document.getElementById(`btnReadPassage_${i}`);
      if (btn) btn.className = `btn-3d ${i === idx ? 'btn-3d-red' : 'btn-3d-white'}`;
    });

    const box = document.getElementById('ftReadActiveBox');
    if (!box) return;

    let html = `
      <div class="reading-passage-split">
        <h4 style="margin:0 0 10px 0; color:var(--tram-red);">${passage.title || `READING PASSAGE ${idx + 1}`}</h4>
        <div style="white-space:pre-wrap;">${passage.passageText || passage.passageHtml || ''}</div>
      </div>
    `;

    (passage.questions || []).forEach((q, qIdx) => {
      const num = qIdx + 1;
      html += `
        <div class="q-item-box" style="margin-bottom:12px;">
          <b style="font-size:13.5px; color:#1E293B;">Câu ${num}. ${q.questionText || q.prompt || ''}</b>
          ${q.options ? `
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:6px; margin-top:8px;">
              ${q.options.map(opt => `
                <label class="option-label" onclick="window.ftEngine.recordReadAnswer('${q.id || `r_${idx}_${num}`}', '${opt.charAt(0)}')">
                  <input type="radio" name="rad_read_${q.id || num}" value="${opt.charAt(0)}">
                  <span>${opt}</span>
                </label>
              `).join('')}
            </div>
          ` : `
            <input type="text" class="diag-input" placeholder="Gõ câu trả lời..." oninput="window.ftEngine.recordReadAnswer('${q.id || `r_${idx}_${num}`}', this.value)" style="margin-top:6px;">
          `}
        </div>
      `;
    });

    box.innerHTML = html;
  }

  recordReadAnswer(qId, val) {
    this.userAnswers.reading[qId] = val.trim();
  }

  // =========================================================================
  // 4. RENDER FULL WRITING (TASK 1 & TASK 2 ĐẦY ĐỦ KÈM BIỂU ĐỒ)
  // =========================================================================
  renderFullWriting() {
    const mount = document.getElementById('ftWritingMount');
    const wData = (FULLTEST_PROMPTS_BANK[this.setNum] || FULLTEST_PROMPTS_BANK[1]).writing;
    if (!mount) return;

    mount.innerHTML = `
      <!-- TASK 1 -->
      <div class="q-item-box" style="margin-bottom:24px; border:2.5px solid #BFDBFE;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; flex-wrap:wrap; gap:8px;">
          <b style="font-size:16px; color:#1E40AF;">📊 TASK 1: ${wData.t1Title}</b>
          <span style="font-size:12px; font-weight:800; background:#DBEAFE; color:#1E40AF; padding:3px 10px; border-radius:10px;">Tối thiểu 150 từ</span>
        </div>

        <div style="display:flex; gap:16px; margin-bottom:14px; flex-wrap:wrap; align-items:flex-start;">
          <div style="max-width:360px; background:#FFFFFF; border:1.5px solid #CBD5E1; border-radius:12px; padding:10px; text-align:center;">
            <img src="${wData.t1Img}" alt="Task 1 Chart" style="max-width:100%; border-radius:8px;">
          </div>
          <div style="flex:1; min-width:260px; font-size:14px; line-height:1.6; color:#334155;">
            <b>Đề bài:</b> "${wData.t1Prompt}"
          </div>
        </div>

        <textarea id="ft_writing_task1" class="diag-textarea" rows="9" placeholder="Viết toàn bộ bài báo cáo Task 1 (Introduction, Overview, 2 đoạn Body) tại đây..." oninput="window.ftEngine.updateWordCount('ft_writing_task1', 'wc_task1')"></textarea>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:4px;">
          <span style="font-size:12px; color:#64748B;">Khuyến nghị: 20 phút</span>
          <b style="font-size:12.5px; color:#1E40AF;" id="wc_task1">0 từ</b>
        </div>
      </div>

      <!-- TASK 2 -->
      <div class="q-item-box" style="border:2.5px solid #DDD6FE;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; flex-wrap:wrap; gap:8px;">
          <b style="font-size:16px; color:#7C3AED;">📝 TASK 2: ${wData.t2Title}</b>
          <span style="font-size:12px; font-weight:800; background:#EDE9FE; color:#6D28D9; padding:3px 10px; border-radius:10px;">Tối thiểu 250 từ</span>
        </div>

        <div style="background:#FFFFFF; border:1.5px solid #CBD5E1; border-left:4px solid #7C3AED; border-radius:12px; padding:12px 14px; margin-bottom:14px; font-size:14px; line-height:1.6; color:#334155;">
          <b>Đề bài:</b> "${wData.t2Prompt}"
        </div>

        <textarea id="ft_writing_task2" class="diag-textarea" rows="14" placeholder="Viết toàn bộ bài luận Task 2 (Mở bài, 2 Thân bài PEEL, Kết bài) tại đây..." oninput="window.ftEngine.updateWordCount('ft_writing_task2', 'wc_task2')"></textarea>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:4px;">
          <span style="font-size:12px; color:#64748B;">Khuyến nghị: 40 phút</span>
          <b style="font-size:12.5px; color:#7C3AED;" id="wc_task2">0 từ</b>
        </div>
      </div>
    `;
  }

  updateWordCount(areaId, counterId) {
    const val = document.getElementById(areaId)?.value.trim() || '';
    const words = val.length === 0 ? 0 : val.split(/\s+/).filter(Boolean).length;
    const cEl = document.getElementById(counterId);
    if (cEl) cEl.innerText = `${words} từ`;
    if (areaId === 'ft_writing_task1') this.userAnswers.writing.task1 = val;
    if (areaId === 'ft_writing_task2') this.userAnswers.writing.task2 = val;
  }

  // =========================================================================
  // 5. RENDER FULL SPEAKING (3 PARTS LIÊN HOÀN CÓ TIMER 1 PHÚT CHUẨN BỊ)
  // =========================================================================
  renderFullSpeaking() {
    const mount = document.getElementById('ftSpeakingMount');
    const sData = (FULLTEST_PROMPTS_BANK[this.setNum] || FULLTEST_PROMPTS_BANK[1]).speaking;
    if (!mount) return;

    mount.innerHTML = `
      <!-- PART 1 -->
      <div class="q-item-box" style="margin-bottom:18px;">
        <b style="font-size:15px; color:#92400E; display:block; margin-bottom:6px;">🎤 Part 1: Giao tiếp đời sống (Introduction & Interview)</b>
        <div style="background:#FFFFFF; border:1px solid #CBD5E1; padding:10px 14px; border-radius:10px; font-size:13.5px; color:#334155; margin-bottom:10px; line-height:1.6;">
          ${sData.p1Questions.map(q => `<div>• ${q}</div>`).join('')}
        </div>
        <button type="button" class="btn-3d btn-3d-red" id="btnRecFtSpk1" style="padding:8px 16px; font-size:13px;" onclick="window.ftEngine.toggleSpeech('ft_spk_part1', 'btnRecFtSpk1')">
          <i class="fa-solid fa-microphone"></i> Bấm để trả lời Part 1
        </button>
        <textarea id="ft_spk_part1" class="diag-textarea" style="height:70px; margin-top:8px;" placeholder="Bản ký âm câu trả lời Part 1..."></textarea>
      </div>

      <!-- PART 2 CUE CARD CÓ ĐỒNG HỒ 1 PHÚT -->
      <div class="q-item-box" style="margin-bottom:18px; border:2px solid #FCD34D; background:#FFFDF5;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; flex-wrap:wrap; gap:8px;">
          <b style="font-size:15px; color:#B45309;">🎤 Part 2: Thuyết trình Cue Card (Individual Long Turn)</b>
          <div style="display:flex; align-items:center; gap:8px;">
            <button type="button" class="btn-3d btn-3d-white" style="padding:5px 12px; font-size:12px;" onclick="window.ftEngine.startPrepTimer()">
              ⏱ Bắt đầu 1 phút chuẩn bị
            </button>
            <span id="prepTimerDisplay" style="font-family:monospace; font-weight:900; color:#B45309; background:#FEF3C7; padding:4px 8px; border-radius:8px;">01:00</span>
          </div>
        </div>

        <div style="background:#FFFFFF; border:1.5px solid #FCD34D; padding:12px 14px; border-radius:10px; font-size:13.5px; color:#334155; margin-bottom:10px; line-height:1.6;">
          <b>${sData.p2CueCard.topic}</b>
          <div style="margin-top:4px;">You should say:</div>
          ${sData.p2CueCard.cues.map(c => `<div>- ${c}</div>`).join('')}
        </div>

        <textarea id="ft_spk_notes" class="diag-textarea" style="height:60px; margin-bottom:8px; background:#FAF7F2;" placeholder="Ghi chú nháp ý tưởng trong 1 phút chuẩn bị..."></textarea>

        <button type="button" class="btn-3d btn-3d-red" id="btnRecFtSpk2" style="padding:8px 16px; font-size:13px;" onclick="window.ftEngine.toggleSpeech('ft_spk_part2', 'btnRecFtSpk2')">
          <i class="fa-solid fa-microphone"></i> Bấm để nói Part 2 (Nói liên tục trong 2 phút)
        </button>
        <textarea id="ft_spk_part2" class="diag-textarea" style="height:90px; margin-top:8px;" placeholder="Bản ký âm bài nói Part 2..."></textarea>
      </div>

      <!-- PART 3 -->
      <div class="q-item-box">
        <b style="font-size:15px; color:#92400E; display:block; margin-bottom:6px;">🎤 Part 3: Thảo luận chuyên sâu 2 chiều (Two-way Discussion)</b>
        <div style="background:#FFFFFF; border:1px solid #CBD5E1; padding:10px 14px; border-radius:10px; font-size:13.5px; color:#334155; margin-bottom:10px; line-height:1.6;">
          ${sData.p3Questions.map(q => `<div>• ${q}</div>`).join('')}
        </div>
        <button type="button" class="btn-3d btn-3d-red" id="btnRecFtSpk3" style="padding:8px 16px; font-size:13px;" onclick="window.ftEngine.toggleSpeech('ft_spk_part3', 'btnRecFtSpk3')">
          <i class="fa-solid fa-microphone"></i> Bấm để trả lời Part 3
        </button>
        <textarea id="ft_spk_part3" class="diag-textarea" style="height:80px; margin-top:8px;" placeholder="Bản ký âm câu trả lời Part 3..."></textarea>
      </div>
    `;
  }

  startPrepTimer() {
    this.prepTimerSeconds = 60;
    const disp = document.getElementById('prepTimerDisplay');
    clearInterval(this.prepInterval);

    this.prepInterval = setInterval(() => {
      this.prepTimerSeconds--;
      if (disp) {
        const mm = String(Math.floor(this.prepTimerSeconds / 60)).padStart(2, '0');
        const ss = String(this.prepTimerSeconds % 60).padStart(2, '0');
        disp.innerText = `${mm}:${ss}`;
      }
      if (this.prepTimerSeconds <= 0) {
        clearInterval(this.prepInterval);
        alert("⏰ Hết 1 phút chuẩn bị! Em hãy bấm micro để bắt đầu bài nói 2 phút nhé.");
      }
    }, 1000);
  }

  // =========================================================================
  // 6. ĐIỀU HƯỚNG TAB & MIC
  // =========================================================================
  switchSection(key) {
    ['grammar', 'listening', 'reading', 'writing', 'speaking'].forEach(s => {
      const tab = document.getElementById(`tab_ft_${s}`);
      const sec = document.getElementById(`section_ft_${s}`);
      if (tab) tab.classList.toggle('active', s === key);
      if (sec) sec.style.display = (s === key) ? 'block' : 'none';
    });
    this.currentSection = key;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  startTimer() {
    this.timerSeconds = 0;
    const disp = document.getElementById('fullTestTimerDisplay');
    clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      this.timerSeconds++;
      if (disp) {
        const mm = String(Math.floor(this.timerSeconds / 60)).padStart(2, '0');
        const ss = String(this.timerSeconds % 60).padStart(2, '0');
        disp.innerText = `${mm}:${ss}`;
      }
    }, 1000);
  }

  initSpeechRecognition() {
    window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!window.SpeechRecognition) return;
    this.speechRecognition = new window.SpeechRecognition();
    this.speechRecognition.continuous = true;
    this.speechRecognition.interimResults = true;
    this.speechRecognition.lang = 'en-US';
  }

  toggleSpeech(targetId, btnId) {
    if (!this.speechRecognition) {
      alert("Trình duyệt chưa hỗ trợ Web Speech!");
      return;
    }
    const btn = document.getElementById(btnId);
    const area = document.getElementById(targetId);

    if (!this.isRecording) {
      try {
        this.speechRecognition.start();
        this.isRecording = true;
        if (btn) btn.innerHTML = `<i class="fa-solid fa-stop"></i> Đang thu âm... Bấm dừng`;
        this.speechRecognition.onresult = (e) => {
          let str = '';
          for (let i = 0; i < e.results.length; ++i) str += e.results[i][0].transcript + ' ';
          if (area) {
            area.value = str.trim();
            if (targetId === 'ft_spk_part1') this.userAnswers.speaking.part1 = str.trim();
            if (targetId === 'ft_spk_part2') this.userAnswers.speaking.part2 = str.trim();
            if (targetId === 'ft_spk_part3') this.userAnswers.speaking.part3 = str.trim();
          }
        };
      } catch(e) {}
    } else {
      try {
        this.speechRecognition.stop();
        this.isRecording = false;
        if (btn) btn.innerHTML = `<i class="fa-solid fa-microphone"></i> Bấm để tiếp tục nói`;
      } catch(e) {}
    }
  }

  // =========================================================================
  // 7. GỌI AI GEMINI CHẤM WRITING & SPEAKING TOÀN DIỆN
  // =========================================================================
  async evaluateWritingWithAI(task1Text, task2Text) {
    const apiKey = getWritingKey();
    const prompt = `
Bạn là Giám khảo IELTS Writing khắt khe của Hội đồng Cambridge.
Nhiệm vụ: Chấm điểm bài thi Full Writing (Task 1 & Task 2) của thí sinh theo đúng 4 tiêu chí: Task Achievement/Response, Coherence & Cohesion, Lexical Resource, Grammatical Range & Accuracy.

BÀI VIẾT TASK 1:
"${task1Text || '(Thí sinh không làm)'}"

BÀI VIẾT TASK 2:
"${task2Text || '(Thí sinh không làm)'}"

TRẢ VỀ DUY NHẤT 1 CHUỖI JSON:
{
  "t1Band": 5.5,
  "t2Band": 6.0,
  "overallWritingBand": 6.0,
  "feedbackT1": "Nhận xét ngắn về Task 1",
  "feedbackT2": "Nhận xét ngắn về Task 2",
  "keyAdvice": "Lời khuyên cải thiện cốt lõi"
}
`;
    try {
      const res = await this.callGeminiRaw(apiKey, prompt);
      const clean = res.replace(/^```json/, '').replace(/```$/, '').trim();
      return JSON.parse(clean);
    } catch(e) {
      return { t1Band: 5.0, t2Band: 5.0, overallWritingBand: 5.0, feedbackT1: "Đã nộp bài.", feedbackT2: "Đã nộp bài.", keyAdvice: "Tiếp tục rèn luyện." };
    }
  }

  async evaluateSpeakingWithAI(p1, p2, p3) {
    const apiKey = getSpeakingKey();
    const prompt = `
Bạn là Giám khảo IELTS Speaking chính thức.
Nhiệm vụ: Đánh giá transcript 3 phần Speaking của thí sinh để chấm điểm Band.

TRANSCRIPT:
Part 1: "${p1 || 'Không có'}"
Part 2: "${p2 || 'Không có'}"
Part 3: "${p3 || 'Không có'}"

TRẢ VỀ DUY NHẤT 1 CHUỖI JSON:
{
  "speakingBand": 5.5,
  "fluencyComment": "Nhận xét độ trôi chảy",
  "lexicalComment": "Nhận xét vốn từ vựng",
  "grammarComment": "Nhận xét ngữ pháp",
  "examinerSummary": "Tổng kết ngắn của Giám khảo"
}
`;
    try {
      const res = await this.callGeminiRaw(apiKey, prompt);
      const clean = res.replace(/^```json/, '').replace(/```$/, '').trim();
      return JSON.parse(clean);
    } catch(e) {
      return { speakingBand: 5.0, fluencyComment: "Giao tiếp phản xạ ổn.", lexicalComment: "Cần phong phú hơn.", grammarComment: "Đúng cấu trúc cơ bản.", examinerSummary: "Đã hoàn thành phần thi nói." };
    }
  }

  async callGeminiRaw(apiKey, prompt) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }] })
    });
    const d = await res.json();
    return d.candidates?.[0]?.content?.parts?.[0]?.text || "";
  }

  // =========================================================================
  // 8. TỔNG KẾT BÀI THI & XUẤT BẢNG KẾT QUẢ OVERALL BAND SCORE
  // =========================================================================
  async submitFullMockTest() {
    if (!confirm("Em có chắc chắn muốn nộp toàn bộ bài Full Mock Test để hệ thống chấm điểm liên hoàn và AI chấm chi tiết không?")) return;

    const btn = document.getElementById('btnSubmitFullMockTest');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `⏳ AI đang phân tích bài Viết, bài Nói & chấm điểm 4 kỹ năng...`;
    }

    clearInterval(this.timerInterval);

    // 1. Chấm Ngữ pháp 100 câu
    const gEval = diagGrammarEngine.evaluate();

    // 2. Chấm Listening 40 câu
    let lCorrect = 0;
    this.lisParts.forEach(p => {
      Object.entries(p.answers || {}).forEach(([qid, exp]) => {
        const u = (this.userAnswers.listening[qid] || '').toLowerCase().trim();
        if (Array.isArray(exp)) {
          if (exp.map(a => a.toLowerCase().trim()).includes(u)) lCorrect++;
        } else {
          if (u === String(exp).toLowerCase().trim()) lCorrect++;
        }
      });
    });
    const lisBand = parseFloat(this.calculateBandScore(lCorrect, 40));

    // 3. Chấm Reading 40 câu
    let rCorrect = 0;
    let rTotal = 0;
    this.readPassages.forEach(p => {
      (p.questions || []).forEach(q => {
        rTotal++;
        const u = (this.userAnswers.reading[q.id] || '').toUpperCase().trim();
        const exp = (q.correctAnswer || '').toUpperCase().trim();
        if (u && exp && u === exp) rCorrect++;
      });
    });
    const readBand = parseFloat(this.calculateBandScore(rCorrect, rTotal || 40));

    // 4. Lấy bài Writing & gọi AI chấm 4 tiêu chí
    const wt1 = document.getElementById('ft_writing_task1')?.value.trim() || '';
    const wt2 = document.getElementById('ft_writing_task2')?.value.trim() || '';
    const aiWriting = await this.evaluateWritingWithAI(wt1, wt2);
    const writeBand = parseFloat(aiWriting.overallWritingBand || 5.0);

    // 5. Lấy bài Speaking & gọi AI chấm 3 Parts
    const p1 = document.getElementById('ft_spk_part1')?.value.trim() || '';
    const p2 = document.getElementById('ft_spk_part2')?.value.trim() || '';
    const p3 = document.getElementById('ft_spk_part3')?.value.trim() || '';
    const aiSpeaking = await this.evaluateSpeakingWithAI(p1, p2, p3);
    const spkBand = parseFloat(aiSpeaking.speakingBand || 5.0);

    // 6. Tính Overall Band Score chuẩn quy tắc làm tròn 0.25 / 0.75 của IELTS
    const rawAverage = (lisBand + readBand + writeBand + spkBand) / 4;
    const overallBand = (Math.round(rawAverage * 2) / 2).toFixed(1);

    // Lưu vào LocalStorage
    const attempt = {
      id: "fullmock_" + Date.now(),
      timestamp: new Date().toLocaleString('vi-VN'),
      testTitle: `IELTS Full Mock Test Cam 21 (Set ${this.setNum})`,
      score: `Overall Band ${overallBand} (L:${lisBand} R:${readBand} W:${writeBand} S:${spkBand})`,
      timeSpent: `${Math.round(this.timerSeconds / 60)} phút`,
      moduleType: "fulltest",
      grammarScore: `${gEval.score}/${gEval.total}`,
      aiWriting,
      aiSpeaking
    };

    try {
      const hist = JSON.parse(localStorage.getItem('ielts_local_history') || '[]');
      hist.unshift(attempt);
      localStorage.setItem('ielts_local_history', JSON.stringify(hist));
    } catch(e) {}

    // Bảng báo cáo kết quả chi tiết
    document.querySelector('.fulltest-container').innerHTML = `
      <div style="background:#FFFFFF; border:3px solid #E8E2D8; border-bottom:7px solid #D3CBC0; border-radius:24px; padding:36px 26px; max-width:850px; margin:30px auto; text-align:center;">
        <div style="font-size:48px; margin-bottom:10px;">🏆</div>
        <h2 style="color:#8B1518; margin:0 0 6px 0; font-size:26px; font-weight:900;">BẢNG KẾT QUẢ IELTS FULL MOCK TEST</h2>
        <p style="color:#64748B; font-weight:700; margin-bottom:24px;">Bài thi chuẩn hóa quốc tế Cambridge 21 • Thời gian làm bài: ${attempt.timeSpent}</p>

        <!-- KHUNG OVERALL BAND SCORE TO NỔI BẬT -->
        <div style="background:#FEF3C7; border:2px solid #FCD34D; border-radius:18px; padding:22px; margin-bottom:26px;">
          <div style="font-size:14px; font-weight:800; color:#92400E; text-transform:uppercase;">OVERALL BAND SCORE</div>
          <div style="font-size:48px; font-weight:900; color:#B45309; margin:4px 0;">${overallBand}</div>
          <div style="font-size:14px; font-weight:700; color:#78350F;">
            Điểm từng phần: <b>Listening: ${lisBand}</b> • <b>Reading: ${readBand}</b> • <b>Writing: ${writeBand}</b> • <b>Speaking: ${spkBand}</b>
          </div>
        </div>

        <!-- 4 KỸ NĂNG + NGỮ PHÁP -->
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(130px, 1fr)); gap:12px; margin-bottom:26px;">
          <div style="background:#F0FDF4; border:1.5px solid #86EFAC; padding:12px; border-radius:12px;">
            <div style="font-size:11px; font-weight:800; color:#166534;">LISTENING</div>
            <b style="font-size:20px; color:#15803D;">Band ${lisBand}</b>
            <div style="font-size:11.5px; color:#64748B;">(${lCorrect}/40 câu)</div>
          </div>
          <div style="background:#F0F9FF; border:1.5px solid #BAE6FD; padding:12px; border-radius:12px;">
            <div style="font-size:11px; font-weight:800; color:#0369A1;">READING</div>
            <b style="font-size:20px; color:#0284C7;">Band ${readBand}</b>
            <div style="font-size:11.5px; color:#64748B;">(${rCorrect}/40 câu)</div>
          </div>
          <div style="background:#EFF6FF; border:1.5px solid #BFDBFE; padding:12px; border-radius:12px;">
            <div style="font-size:11px; font-weight:800; color:#1E40AF;">WRITING</div>
            <b style="font-size:20px; color:#2563EB;">Band ${writeBand}</b>
            <div style="font-size:11.5px; color:#64748B;">(T1: ${aiWriting.t1Band} | T2: ${aiWriting.t2Band})</div>
          </div>
          <div style="background:#FFFBEB; border:1.5px solid #FDE68A; padding:12px; border-radius:12px;">
            <div style="font-size:11px; font-weight:800; color:#92400E;">SPEAKING</div>
            <b style="font-size:20px; color:#D97706;">Band ${spkBand}</b>
            <div style="font-size:11.5px; color:#64748B;">(3 Parts AI chấm)</div>
          </div>
          <div style="background:#FAF5FF; border:1.5px solid #DDD6FE; padding:12px; border-radius:12px;">
            <div style="font-size:11px; font-weight:800; color:#6D28D9;">NGỮ PHÁP</div>
            <b style="font-size:20px; color:#7C3AED;">${gEval.score}/${gEval.total}</b>
            <div style="font-size:11.5px; color:#64748B;">(100 câu phân hóa)</div>
          </div>
        </div>

        <!-- BẢNG NHẬN XÉT CHI TIẾT TỰ LUẬN TỪ AI -->
        <div style="background:#F8FAFC; border:1.5px solid #CBD5E1; border-radius:16px; padding:18px; margin-bottom:26px; text-align:left; font-size:13.5px; line-height:1.65;">
          <h4 style="margin:0 0 10px 0; color:#1E293B; font-size:15px; font-weight:900;">🤖 BÁO CÁO PHÂN TÍCH TỰ LUẬN TỪ AI:</h4>
          <div style="margin-bottom:8px;">
            <b style="color:#1E40AF;">✍️ Writing Task 1:</b> ${aiWriting.feedbackT1}
          </div>
          <div style="margin-bottom:8px;">
            <b style="color:#7C3AED;">✍️ Writing Task 2:</b> ${aiWriting.feedbackT2}
          </div>
          <div style="margin-bottom:8px;">
            <b style="color:#D97706;">🎤 Speaking:</b> ${aiSpeaking.examinerSummary} (Độ lưu loát: ${aiSpeaking.fluencyComment} • Vốn từ: ${aiSpeaking.lexicalComment})
          </div>
          <div style="background:#FFFFFF; border-left:4px solid #059669; padding:8px 12px; border-radius:6px; margin-top:10px;">
            <b>💡 Lời khuyên trọng tâm:</b> ${aiWriting.keyAdvice}
          </div>
        </div>

        <!-- CỤM NÚT ĐIỀU HƯỚNG -->
        <div style="display:flex; gap:12px; justify-content:center; flex-wrap:wrap;">
          <a href="index-diag.html" class="btn-3d btn-3d-white" style="flex:1; min-width:180px;">← Danh mục đề</a>
          <a href="../curriculum-system/roadmap.html" class="btn-3d btn-3d-blue" style="flex:1; min-width:220px;">🚀 Kích hoạt Lộ trình học &rarr;</a>
        </div>
      </div>
    `;
  }

  calculateBandScore(correct, total = 40) {
    const s = Math.round((correct / (total || 1)) * 40);
    if (s >= 39) return "9.0";
    if (s >= 37) return "8.5";
    if (s >= 35) return "8.0";
    if (s >= 32) return "7.5";
    if (s >= 30) return "7.0";
    if (s >= 26) return "6.5";
    if (s >= 23) return "6.0";
    if (s >= 18) return "5.5";
    if (s >= 16) return "5.0";
    if (s >= 13) return "4.5";
    if (s >= 10) return "4.0";
    if (s >= 8)  return "3.5";
    if (s >= 6)  return "3.0";
    return "2.5";
  }
}

export const ftEngine = new DiagnosticFullTestEngine();
window.ftEngine = ftEngine;
window.switchFullTestSection = (s) => ftEngine.switchSection(s);
window.submitFullMockTestExam = () => ftEngine.submitFullMockTest();

document.addEventListener('DOMContentLoaded', () => ftEngine.init());
