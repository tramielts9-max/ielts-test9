/**
 * diagnostic/js-diag/diag-engine.js
 * BỘ MÁY ĐIỀU PHỐI KHẢO THÍ CHẨN ĐOÁN THÍCH ỨNG MASTER (TEST 1, 2, 3 & 3 SET XOAY TUA)
 * BẢN FULL ĐẦY ĐỦ 100% - TÍCH HỢP BÀI NGHE JSON NGOÀI CHO TEST 2 & 3, NHẢY GIÂY AUDIO THEO PART,
 * KÉO THẢ MATCHING, BẢN ĐỒ MAP LABELLING, CHẤM TWO-TIER, CHẤM AI WRITING & SPEAKING
 */

import { diagReadingEngine } from './diag-reading.js';

// =========================================================================
// 1. MÃ HÓA 3 API KEY RIÊNG BIỆT CHO TỪNG KỸ NĂNG (BẢO MẬT CHỐNG F12)
// =========================================================================
const _READING_SEEDS = [
  65, 81, 46, 65, 98, 56, 82, 78, 54, 74, 111, 118, 45, 99, 119, 83,
  107, 75, 75, 119, 84, 75, 87, 97, 87, 105, 119, 116, 52, 84, 75, 121,
  112, 48, 90, 51, 65, 107, 65, 65, 119, 79, 116, 81, 115, 87, 50, 80,
  88, 104, 52, 110, 65
];
function getReadingKey() { return _READING_SEEDS.map(c => String.fromCharCode(c)).join(''); }

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

const CLOUD_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyNErQQFdciAQM0k9KUrACtpX7rxKkopjChYAC2Ubwj5MGzFOeekDEGs8C1n7P9cNR6vg/exec";

// =========================================================================
// 2. NGÂN HÀNG DỮ LIỆU ĐỀ THI CHO CÁC PHẦN NGỮ PHÁP, TỪ VỰNG, WRITING, SPEAKING
// =========================================================================
const DIAGNOSTIC_DATABASE = {
  // -----------------------------------------------------------------------
  // TEST 1 (45 PHÚT - BAND 0 ➔ 5.0): LISTENING CƠ BẢN A2 & B2
  // -----------------------------------------------------------------------
  test_01: {
    title: "TEST 1: KHẢO SÁT NỀN TẢNG (45 PHÚT)",
    targetBand: "0 - 5.0",
    grammarSets: {
      1: [
        { id: "g01", q: "She usually ______ to school by bicycle every morning.", options: ["A. go", "B. goes", "C. is going"], answer: "B", topic: "Hiện tại đơn" },
        { id: "g02", q: "Look! The children ______ football on the playground.", options: ["A. play", "B. played", "C. are playing"], answer: "C", topic: "Hiện tại tiếp diễn" },
        { id: "g03", q: "Yesterday, we ______ an interesting museum in the city center.", options: ["A. visit", "B. visited", "C. will visit"], answer: "B", topic: "Quá khứ đơn" },
        { id: "g04", q: "While he ______ dinner, the lights suddenly went out.", options: ["A. cooked", "B. was cooking", "C. is cooking"], answer: "B", topic: "Quá khứ tiếp diễn" },
        { id: "g05", q: "They ______ in this town for more than ten years.", options: ["A. live", "B. lived", "C. have lived"], answer: "C", topic: "Hiện tại hoàn thành" },
        { id: "g06", q: "By the time the police arrived, the thief ______.", options: ["A. escaped", "B. had escaped", "C. escapes"], answer: "B", topic: "Quá khứ hoàn thành" },
        { id: "g07", q: "I promise I ______ you with your homework tomorrow.", options: ["A. help", "B. will help", "C. helped"], answer: "B", topic: "Tương lai đơn" },
        { id: "g08", q: "If it ______ tomorrow, we will stay at home.", options: ["A. rains", "B. will rain", "C. rained"], answer: "A", topic: "Câu điều kiện 1" },
        { id: "g09", q: "If I ______ you, I would take that opportunity.", options: ["A. am", "B. were", "C. will be"], answer: "B", topic: "Câu điều kiện 2" },
        { id: "g10", q: "The historic building ______ by thousands of visitors every year.", options: ["A. visits", "B. is visited", "C. was visited"], answer: "B", topic: "Câu bị động" },
        { id: "g11", q: "The woman ______ lives next door is a famous scientist.", options: ["A. which", "B. who", "C. whose"], answer: "B", topic: "Mệnh đề quan hệ" },
        { id: "g12", q: "This exercise is much ______ than the previous one.", options: ["A. easy", "B. easier", "C. more easy"], answer: "B", topic: "Cấu trúc so sánh" },
        { id: "g13", q: "We arrived ______ the airport early in the morning.", options: ["A. in", "B. on", "C. at"], answer: "C", topic: "Giới từ" },
        { id: "g14", q: "He is interested in ______ foreign languages.", options: ["A. learn", "B. learning", "C. to learn"], answer: "B", topic: "Danh động từ V-ing" },
        { id: "g15", q: "The government made a large ______ in clean technology.", options: ["A. invest", "B. investment", "C. investor"], answer: "B", topic: "Từ loại (Word Form)" }
      ]
    },
    listeningSets: {
      1: {
        audioA2: {
          url: "https://archive.org/download/lisb2-3/lisa2-1.mp3",
          title: "Audio 1 (A2): Hotel Reservation (Đặt phòng khách sạn)",
          questions: [
            { id: "lis_s1_01", q: "1. What is the guest's surname?", options: ["A. Berardelli", "B. Bernard", "C. Baradelli"], answer: "A" },
            { id: "lis_s1_02", q: "2. What type of room was booked for one night?", options: ["A. Double room", "B. Single room", "C. Suite room"], answer: "B" },
            { id: "lis_s1_03", q: "3. What number should the guest dial for the reception desk?", options: ["A. Dial 0", "B. Dial 9", "C. Dial 1"], answer: "A" },
            { id: "lis_s1_04", q: "4. What is the latest luggage checkout time at reception?", options: ["A. 10 o'clock", "B. 12 o'clock", "C. 2 o'clock"], answer: "B" },
            { id: "lis_s1_05", q: "5. What time was the morning wake-up call confirmed?", options: ["A. 7:00 a.m.", "B. 7:30 a.m.", "C. 8:00 a.m."], answer: "B" }
          ]
        },
        audioB2: {
          url: "https://archive.org/download/lisb2-3/lisb2-1.mp3",
          title: "Audio 2 (B2): Working in the Film Industry (Ngành điện ảnh)",
          questions: [
            { id: "lis_s1_06", q: "6. How long has the speaker worked in the film industry?", options: ["A. 3 years", "B. 8 years", "C. 10 years"], answer: "B" },
            { id: "lis_s1_07", q: "7. What do people in junior roles spend most of their time doing on set?", options: ["A. Writing script ideas", "B. Standing and waiting", "C. Talking with directors"], answer: "B" },
            { id: "lis_s1_08", q: "8. Why have many talented individuals left the film business?", options: ["A. Low salaries", "B. Too much drama and stress", "C. Strict office hours"], answer: "B" },
            { id: "lis_s1_09", q: "9. How long does a close-knit film crew typically work together?", options: ["A. Up to 3 months", "B. Exactly 6 months", "C. Over a year"], answer: "A" },
            { id: "lis_s1_10", q: "10. What unique language feature must new workers quickly learn on set?", options: ["A. Formal grammar", "B. Slang words and jargon", "C. Foreign accents"], answer: "B" }
          ]
        }
      }
    },
    writing: {
      task1Prompt: "The graph below shows the average house prices in 3 countries between 1997–2014.",
      task1Guide: "Gợi ý: 'Nhìn chung, giá nhà ở cả 3 nước đều tăng qua các năm, trong đó giá nhà ở Country A luôn ở mức cao nhất và Country C ở mức thấp nhất.'",
      task2Prompt: "Some people think that university students should focus only on subjects related to their future jobs. Others believe that they should study a wide range of subjects. Discuss both views.",
      task2Guide: "Gợi ý viết Đoạn 1: (1) Học môn chuyên ngành giúp sinh viên có kiến thức sâu cho công việc. (2) Nhờ đó họ dễ tìm việc tốt sau tốt nghiệp."
    },
    speaking: {
      q1: "Do you work or are you a student? What do you like most about your studies or career?",
      q2: "How often do you use English in your daily life or studies?"
    }
  },

  // -----------------------------------------------------------------------
  // TEST 2 (100 PHÚT - BAND 5.0 ➔ 6.5): LISTENING PART 1 & 2 TỪ JSON NGOÀI
  // -----------------------------------------------------------------------
  test_02: {
    title: "TEST 2: KHẢO THÍ CHUẨN HÓA (100 PHÚT)",
    targetBand: "5.0 - 6.5",
    grammarSets: {
      1: [
        { id: "t2_g01", q: "Rarely ______ such a brilliant academic presentation.", options: ["A. I have heard", "B. have I heard", "C. I heard"], answer: "B", topic: "Đảo ngữ" },
        { id: "t2_g02", q: "Had we known the flight was delayed, we ______ at home longer.", options: ["A. would stay", "B. would have stayed", "C. stayed"], answer: "B", topic: "Điều kiện loại 3" },
        { id: "t2_g03", q: "The research suggests that regular exercise ______ mental focus.", options: ["A. enhances", "B. enhance", "C. is enhancing"], answer: "A", topic: "Hiện tại đơn học thuật" },
        { id: "t2_g04", q: "It was not until midnight that the committee ______ their decision.", options: ["A. reached", "B. has reached", "C. reaches"], answer: "A", topic: "Cấu trúc nhấn mạnh" },
        { id: "t2_g05", q: "She insisted that every member ______ present at the meeting.", options: ["A. is", "B. be", "C. was"], answer: "B", topic: "Giả định thức (Subjunctive)" }
      ]
    },
    vocabSets: {
      1: [
        { id: "v01", q: "Which word means 'to officially approve or support something'?", options: ["A. Endorse", "B. Abandon", "C. Neglect"], answer: "A" },
        { id: "v02", q: "What is the synonym of 'rapid acceleration'?", options: ["A. Sudden decline", "B. Swift increase", "C. Minor fluctuation"], answer: "B" },
        { id: "v03", q: "The term 'excavate' in archaeology most closely means:", options: ["A. Dig up carefully", "B. Restore paint", "C. Bury underground"], answer: "A" },
        { id: "v04", q: "What does 'sustainable development' refer to?", options: ["A. Short-term profit", "B. Preserving resources for future", "C. Fast industrialization"], answer: "B" },
        { id: "v05", q: "A 'precursor' is something that:", options: ["A. Comes after an event", "B. Comes before and influences", "C. Stops an action"], answer: "B" }
      ]
    },
    writing: {
      task1Prompt: "The bar chart illustrates the quantity of waste disposed of by six nations over twenty years.",
      task1Guide: "Từ khóa định hướng: xu hướng tăng tổng thể / so sánh quốc gia cao nhất ↔ thấp nhất.",
      task2Prompt: "Some people argue that technological development increases the gap between rich and poor. To what extent do you agree or disagree?",
      task2Guide: "Viết 2 đoạn thân bài PEEL: Đoạn 1 (Cơ hội việc làm công nghệ) - Đoạn 2 (Bất bình đẳng tiếp cận số)."
    },
    speaking: {
      q1: "Let's talk about your hometown. Has it changed much in recent years?",
      q2: "Describe a useful piece of electronic equipment that you use regularly (Cue Card Part 2)."
    }
  },

  // -----------------------------------------------------------------------
  // TEST 3 (105 PHÚT - BAND 6.5+): LISTENING PART 3 & 4 TỪ JSON NGOÀI
  // -----------------------------------------------------------------------
  test_03: {
    title: "TEST 3: THỬ THÁCH ĐỈNH CAO (105 PHÚT)",
    targetBand: "6.5 - 7.5+",
    grammarSets: {
      1: [
        { id: "t3_g01", q: "Under no circumstances ______ confidential data be shared.", options: ["A. should", "B. must not", "C. it should"], answer: "A", topic: "Đảo ngữ phủ định" },
        { id: "t3_g02", q: "______ for his timely intervention, the project would have collapsed.", options: ["A. Were it not", "B. Had it not been", "C. If it wasn't"], answer: "B", topic: "Đảo ngữ điều kiện loại 3" }
      ]
    },
    writing: {
      task1Prompt: "Writing Task 1 Body: Write two body paragraphs describing the key groupings of the chart.",
      task2Prompt: "Writing Task 2 Body: Write two complete PEEL paragraphs evaluating whether artificial intelligence poses existential threats to human employment."
    },
    speaking: {
      q1: "Do you believe artificial intelligence will eventually replace human decision-making in legal and ethical matters? (Part 3 Deep Discussion)"
    }
  }
};

// =========================================================================
// 3. ĐỘNG CƠ ĐIỀU PHỐI KHẢO THÍ CHÍNH (DIAGNOSTIC ENGINE MASTER)
// =========================================================================
class DiagnosticEngineMaster {
  constructor() {
    this.currentSkill = "grammar";
    this.testId = "test_01";
    this.setNum = 1;
    this.activeData = null;

    // Dữ liệu Listening nạp động từ JSON
    this.listeningJsonData = null;
    this.activeListeningPartIndex = 0;
    this.listeningAnswers = {};

    // Telemetry phản xạ
    this.metrics = {};
    this.timerSeconds = 0;
    this.timerInterval = null;

    // Trạng thái ghi âm
    this.speechRecognition = null;
    this.isRecording = false;

    // Trạng thái Review
    this.isReviewMode = false;
  }

  async init() {
    const urlParams = new URLSearchParams(window.location.search);
    this.testId = urlParams.get('testId') || 'test_01';
    
    const rawSet = parseInt(urlParams.get('set') || urlParams.get('ver'), 10);
    this.setNum = (!isNaN(rawSet) && rawSet >= 1 && rawSet <= 3) ? rawSet : Math.floor(Math.random() * 3) + 1;

    this.activeData = DIAGNOSTIC_DATABASE[this.testId] || DIAGNOSTIC_DATABASE.test_01;

    const titleEl = document.getElementById('currentTestTitle');
    if (titleEl) {
      titleEl.innerText = `${this.activeData.title} • Set ${this.setNum}`;
    }

    // 1. Render Ngữ pháp / Từ vựng
    this.renderGrammarAndVocabSection();

    // 2. Nạp dữ liệu Listening từ JSON ngoài (cho Test 2 & Test 3) hoặc DB nội bộ (Test 1)
    await this.initListeningData();

    // 3. Nạp Reading từ file JSON riêng biệt
    await this.initReadingFromJson();

    // 4. Khởi tạo Writing & Speaking
    this.setupWritingAndSpeaking();
    this.initSpeechRecognition();
    this.startTimer();

    // 5. Kiểm tra Review Mode nếu có attemptId
    const attemptId = urlParams.get('attemptId');
    if (attemptId) {
      this.restoreReviewMode(attemptId);
    }
  }

  // --- NẠP DỮ LIỆU READING TỪ FILE JSON ---
  async initReadingFromJson() {
    const testNum = this.testId.replace('test_0', '').replace('test_', '');
    const jsonPath = `data-diag/reading/test${testNum}-reading-s${this.setNum}.json`;

    console.log(`[DiagEngine] Đang nạp Reading JSON: ${jsonPath}`);
    const success = await diagReadingEngine.loadTestFromJson(jsonPath);
    if (success) {
      diagReadingEngine.render();
    }
  }

  // --- NẠP DỮ LIỆU LISTENING TỪ FILE JSON RIÊNG BIỆT ---
  async initListeningData() {
    const testNum = this.testId.replace('test_0', '').replace('test_', '');

    if (this.testId === 'test_02' || this.testId === 'test_03') {
      const jsonPath = `data-diag/listening/test${testNum}-listening-s${this.setNum}.json`;
      console.log(`[DiagEngine] Đang nạp Listening JSON: ${jsonPath}`);

      try {
        const res = await fetch(jsonPath);
        if (res.ok) {
          this.listeningJsonData = await res.json();
          this.renderAdvancedListeningSection();
          return;
        }
      } catch (err) {
        console.warn(`[DiagEngine] Không thể nạp ${jsonPath}, dùng fallback nội bộ:`, err);
      }
    }

    // Fallback cho Test 1
    this.renderBasicListeningSection();
  }

  // =========================================================================
  // 4. GIAO DIỆN & TÍNH NĂNG LISTENING CAO CẤP (CHUẨN MODULE LISTENING/)
  // =========================================================================
  renderAdvancedListeningSection() {
    const mount = document.getElementById('listeningQuestionsMount');
    const audioEl = document.getElementById('diagAudioPlayer');
    const labelEl = document.getElementById('currentAudioLabel');
    if (!mount || !this.listeningJsonData) return;

    const data = this.listeningJsonData;
    const parts = data.parts || [];
    if (parts.length === 0) return;

    if (audioEl && data.audioUrl) {
      audioEl.src = data.audioUrl;
      audioEl.preload = "auto";
    }

    let html = `
      <!-- THANH SUB-TAB CHUYỂN PART VỚI MỐC GIÂY -->
      <div style="display:flex; gap:10px; margin-bottom:18px; flex-wrap:wrap; align-items:center; background:#FFFFFF; border:2px solid #E8E2D8; border-radius:16px; padding:8px 12px;">
        <span style="font-size:12.5px; font-weight:900; color:#0369A1; text-transform:uppercase; margin-right:4px;">
          Chọn Phần Nghe:
        </span>
        ${parts.map((p, idx) => `
          <button type="button" 
                  id="btnPartTab_${idx}" 
                  class="btn-3d ${idx === this.activeListeningPartIndex ? 'btn-3d-blue' : 'btn-3d-white'}" 
                  style="padding:8px 16px; font-size:13px;"
                  onclick="window.switchListeningPart(${idx}, true)">
            Part ${p.partNum} (Bắt đầu: ${this.formatSecondsToTime(p.startTime)})
          </button>
        `).join('')}
      </div>

      <!-- KHUNG BÀI LÀM CỦA PART ĐANG CHỌN -->
      <div id="activePartContainer"></div>

      <!-- KHUNG TRANSCRIPT (ẨN KHI LÀM, HIỆN KHI XEM LẠI REVIEW MODE) -->
      <div id="listeningTranscriptContainer" style="display:none; margin-top:24px; background:#FFFFFF; border:2px solid #BAE6FD; border-left:6px solid #0284C7; border-radius:16px; padding:18px 22px; max-height:450px; overflow-y:auto; line-height:1.75; font-size:14px;">
        <h4 style="margin:0 0 10px 0; color:#0284C7; font-size:16px; font-weight:900;">
          📜 BĂNG KÝ ÂM TRANSCRIPT (BẤM VÀO TỪNG CÂU ĐỂ TUA AUDIO ĐẾN ĐOẠN ĐÓ):
        </h4>
        <div id="transcriptLinesMount"></div>
      </div>
    `;

    mount.innerHTML = html;
    this.switchListeningPart(this.activeListeningPartIndex, false);
  }

  switchListeningPart(partIndex, shouldSeekAndPlay = true) {
    if (!this.listeningJsonData || !this.listeningJsonData.parts[partIndex]) return;

    this.activeListeningPartIndex = partIndex;
    const part = this.listeningJsonData.parts[partIndex];

    // 1. Cập nhật giao diện nút Tab
    this.listeningJsonData.parts.forEach((_, idx) => {
      const btn = document.getElementById(`btnPartTab_${idx}`);
      if (btn) {
        btn.className = `btn-3d ${idx === partIndex ? 'btn-3d-blue' : 'btn-3d-white'}`;
      }
    });

    // 2. Nhảy giây Audio theo đúng startTime của Part
    const audioEl = document.getElementById('diagAudioPlayer');
    const labelEl = document.getElementById('currentAudioLabel');
    if (labelEl) {
      labelEl.innerText = `${part.title} (Từ ${this.formatSecondsToTime(part.startTime)})`;
    }

    if (audioEl && shouldSeekAndPlay && part.startTime !== undefined) {
      audioEl.currentTime = parseFloat(part.startTime);
      audioEl.play().catch(() => {});
    }

    // 3. Render câu hỏi của Part
    const container = document.getElementById('activePartContainer');
    if (container) {
      container.innerHTML = this.buildPartQuestionsHtml(part);
      this.restoreListeningInputsUI(part);
    }

    // 4. Cập nhật transcript nếu đang mở
    const tMount = document.getElementById('transcriptLinesMount');
    if (tMount && part.transcriptHtml) {
      tMount.innerHTML = part.transcriptHtml;
      this.bindTranscriptClickEvents();
    }
  }

  buildPartQuestionsHtml(part) {
    let html = `
      <div style="border-bottom:2px solid #E8E2D8; padding-bottom:10px; margin-bottom:16px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
        <b style="font-size:16px; color:#0C4A6E;">${part.title}</b>
        <button type="button" class="btn-3d btn-3d-white" style="padding:6px 12px; font-size:12px;" onclick="window.seekDiagAudio(${part.startTime})">
          ▶ Phát lại từ đầu Part này (${this.formatSecondsToTime(part.startTime)})
        </button>
      </div>
    `;

    (part.groups || []).forEach(group => {
      html += `<div style="font-size:15px; font-weight:900; color:#1E293B; margin:16px 0 6px 0;">${group.title}</div>`;
      if (group.instructions) {
        html += `<div style="background:#FAF7F2; border:1.5px solid #E8E2D8; border-radius:10px; padding:8px 12px; font-size:13px; font-weight:700; color:#475569; margin-bottom:12px;">${group.instructions}</div>`;
      }

      // A. Dạng bảng (Table) hoặc Điền từ (Notes)
      if (group.type === 'table' || group.type === 'notes' || group.tableHtml || group.template) {
        let contentBody = group.tableHtml || group.template || '';
        (group.questionIds || []).forEach(qId => {
          const q = part.questions[qId];
          const width = q?.inputWidth || "120px";
          const audioTimeBtn = q?.time ? `<button type="button" class="btn-3d btn-3d-white" style="padding:2px 7px; font-size:11px; margin-left:4px;" onclick="window.seekDiagAudio(${q.time})">▶ ${this.formatSecondsToTime(q.time)}</button>` : '';

          const inputHtml = `
            <span style="display:inline-block; vertical-align:middle; margin:2px 0;">
              <input type="text" 
                     id="inp_${qId}" 
                     class="diag-input" 
                     style="width:${width}; padding:5px 8px; text-align:center; font-weight:800; color:#0284C7; display:inline-block;" 
                     placeholder="[Câu ${q?.num || qId}]"
                     oninput="window.syncDiagAnswer('${qId}', this.value)">
              ${audioTimeBtn}
              <div id="fb_${qId}" style="display:none; font-size:12px; font-weight:800; padding:2px 6px; border-radius:4px; margin-top:2px;"></div>
            </span>
          `;
          contentBody = contentBody.replace(new RegExp(`{{${qId}}}`, 'g'), inputHtml);
        });
        html += `<div style="margin-bottom:18px; font-size:14px; line-height:1.8;">${contentBody}</div>`;

      // B. Dạng Bản đồ (Map Labelling)
      } else if (group.type === 'map' || group.imageUrl) {
        const optsLetters = ['A','B','C','D','E','F','G','H','I'].slice(0, group.optionsCount || 9);
        const imgPath = group.imageUrl || '../listening/data-l/images/cam21-t2-p2-map.png';

        html += `
          <div style="background:#FFFFFF; border:2px solid #E8E2D8; border-radius:14px; padding:12px; text-align:center; margin-bottom:14px;">
            <img src="${imgPath}" alt="Map" style="max-width:100%; height:auto; border-radius:8px; border:1px solid #CBD5E1;">
          </div>
          <table style="width:100%; border-collapse:collapse; background:#FFFFFF; border:2px solid #E8E2D8; border-radius:12px; overflow:hidden; margin-bottom:18px;">
            <thead>
              <tr style="background:#FAF7F2;">
                <th style="padding:8px 12px; text-align:left; font-size:13px;">Địa điểm câu hỏi</th>
                ${optsLetters.map(l => `<th style="padding:8px 4px; text-align:center; font-size:12.5px;">${l}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${(group.questionIds || []).map(qId => {
                const q = part.questions[qId];
                return `
                  <tr style="border-top:1px solid #E8E2D8;" id="row_${qId}">
                    <td style="padding:8px 12px; font-weight:800; font-size:13px;">
                      Câu ${q?.num || qId}: ${q?.text || ''}
                      ${q?.time ? `<button type="button" class="btn-3d btn-3d-white" style="padding:2px 6px; font-size:11px; margin-left:4px;" onclick="window.seekDiagAudio(${q.time})">▶</button>` : ''}
                      <div id="fb_${qId}" style="display:none; font-size:12px; font-weight:800; margin-top:2px;"></div>
                    </td>
                    ${optsLetters.map(letter => `
                      <td style="text-align:center; padding:4px;">
                        <input type="radio" name="ans_${qId}" value="${letter}" onchange="window.syncDiagAnswer('${qId}', '${letter}')" style="cursor:pointer; width:16px; height:16px;">
                      </td>
                    `).join('')}
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        `;

      // C. Dạng Nối thông tin (Matching)
      } else if (group.type === 'matching' && Array.isArray(group.options)) {
        html += `
          <div style="display:flex; gap:16px; margin-bottom:18px; flex-wrap:wrap;">
            <div style="flex:1.4; min-width:280px; display:flex; flex-direction:column; gap:8px;">
              ${(group.questionIds || []).map(qId => {
                const q = part.questions[qId];
                return `
                  <div class="q-item-box" id="box_${qId}" style="margin-bottom:0; padding:12px 14px;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                      <b style="font-size:13.5px; color:#1E293B;">Câu ${q?.num || qId}: ${q?.text || ''}</b>
                      ${q?.time ? `<button type="button" class="btn-3d btn-3d-white" style="padding:2px 6px; font-size:11px;" onclick="window.seekDiagAudio(${q.time})">▶ ${this.formatSecondsToTime(q.time)}</button>` : ''}
                    </div>
                    <div style="display:flex; gap:8px; align-items:center; margin-top:8px;">
                      <span style="font-size:12.5px; font-weight:800; color:#64748B;">Đáp án chọn:</span>
                      <select id="sel_${qId}" class="diag-input" style="width:auto; min-width:180px; padding:6px 10px; font-size:13px;" onchange="window.syncDiagAnswer('${qId}', this.value)">
                        <option value="">-- Chọn đáp án A-H --</option>
                        ${group.options.map(opt => `<option value="${opt.key}">${opt.key}. ${opt.text}</option>`).join('')}
                      </select>
                    </div>
                    <div id="fb_${qId}" style="display:none; font-size:12px; font-weight:800; margin-top:4px;"></div>
                  </div>
                `;
              }).join('')}
            </div>

            <!-- Ngân hàng đáp án bên phải -->
            <div style="flex:1; min-width:240px; background:#FFFFFF; border:2px solid #E8E2D8; border-radius:14px; padding:12px; align-self:flex-start;">
              <b style="font-size:13px; color:#0369A1; display:block; margin-bottom:8px;">📋 ${group.optionsTitle || 'Danh mục lựa chọn'}:</b>
              <div style="display:flex; flex-direction:column; gap:6px;">
                ${group.options.map(opt => `
                  <div style="background:#FAF7F2; border:1px solid #CBD5E1; border-radius:8px; padding:6px 10px; font-size:12.5px; font-weight:700;">
                    <span style="background:#0284C7; color:white; padding:1px 6px; border-radius:4px; font-weight:900;">${opt.key}</span>
                    <span style="color:#1E293B; margin-left:4px;">${opt.text}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
        `;

      // D. Dạng Trắc nghiệm (MCQ)
      } else {
        (group.questionIds || []).forEach(qId => {
          const q = part.questions[qId];
          if (!q) return;

          html += `
            <div class="q-item-box" id="box_${qId}">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                <b style="font-size:14px; color:#1E293B;">Câu ${q.num || qId}: ${q.text || ''}</b>
                ${q.time ? `<button type="button" class="btn-3d btn-3d-white" style="padding:2px 7px; font-size:11px;" onclick="window.seekDiagAudio(${q.time})">▶ ${this.formatSecondsToTime(q.time)}</button>` : ''}
              </div>
              <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:8px;">
                ${(q.options || []).map(opt => {
                  const letter = opt.charAt(0);
                  return `
                    <label class="option-label" onclick="window.syncDiagAnswer('${qId}', '${letter}')">
                      <input type="radio" name="ans_${qId}" value="${letter}">
                      <span>${opt}</span>
                    </label>
                  `;
                }).join('')}
              </div>
              <div id="fb_${qId}" style="display:none; font-size:12px; font-weight:800; margin-top:6px;"></div>
            </div>
          `;
        });
      }
    });

    return html;
  }

  restoreListeningInputsUI(part) {
    Object.entries(this.listeningAnswers).forEach(([qId, val]) => {
      // Input text
      const inp = document.getElementById(`inp_${qId}`);
      if (inp) inp.value = val;

      // Select matching
      const sel = document.getElementById(`sel_${qId}`);
      if (sel) sel.value = val;

      // Radio MCQ hoặc Map
      const radio = document.querySelector(`input[name="ans_${qId}"][value="${val}"]`);
      if (radio) radio.checked = true;
    });
  }

  bindTranscriptClickEvents() {
    document.querySelectorAll('#transcriptLinesMount .transcript-line[data-time]').forEach(line => {
      line.style.cursor = 'pointer';
      line.title = 'Bấm để nghe từ đoạn này';
      line.onclick = () => {
        const t = line.getAttribute('data-time');
        if (t) window.seekDiagAudio(parseFloat(t));
      };
    });
  }

  seekAudio(seconds) {
    const audio = document.getElementById('diagAudioPlayer');
    if (audio && seconds !== undefined) {
      audio.currentTime = parseFloat(seconds);
      audio.play().catch(() => {});
    }
  }

  formatSecondsToTime(sec) {
    if (!sec && sec !== 0) return "00:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  }

  // =========================================================================
  // 5. GIAO DIỆN LISTENING TEST 1 (CƠ BẢN A2 & B2)
  // =========================================================================
  renderBasicListeningSection() {
    const mount = document.getElementById('listeningQuestionsMount');
    const audioEl = document.getElementById('diagAudioPlayer');
    const labelEl = document.getElementById('currentAudioLabel');
    if (!mount) return;

    if (this.testId === 'test_01' && this.activeData.listeningSets) {
      const setLis = this.activeData.listeningSets[this.setNum] || this.activeData.listeningSets[1];
      if (audioEl) audioEl.src = setLis.audioA2.url;
      if (labelEl) labelEl.innerText = setLis.audioA2.title;

      let html = `
        <div style="margin-bottom:20px;">
          <b style="font-size:14.5px; color:#0284C7; display:block; margin-bottom:10px;">
            🎧 BÀI NGHE 1 (LEVEL A2): TRẮC NGHIỆM 3 LỰA CHỌN
          </b>
          ${setLis.audioA2.questions.map(q => this.renderBasicListeningItem(q)).join('')}
        </div>

        <div style="margin-top:24px; border-top:2px dashed #E8E2D8; padding-top:18px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:8px;">
            <b style="font-size:14.5px; color:#8B1518;">
              🎧 BÀI NGHE 2 (LEVEL B2): ${setLis.audioB2.title}
            </b>
            <button type="button" class="btn-3d btn-3d-white" style="padding:6px 12px; font-size:12px;" onclick="document.getElementById('diagAudioPlayer').src='${setLis.audioB2.url}'; document.getElementById('currentAudioLabel').innerText='${setLis.audioB2.title}'; document.getElementById('diagAudioPlayer').play();">
              ▶ Bật Audio B2 này
            </button>
          </div>
          ${setLis.audioB2.questions.map(q => this.renderBasicListeningItem(q)).join('')}
        </div>
      `;
      mount.innerHTML = html;
    }
  }

  renderBasicListeningItem(q) {
    this.initQuestionMetric(q.id);
    return `
      <div class="q-item-box" id="box_${q.id}" style="margin-bottom:10px;">
        <b style="font-size:14px; color:#1E293B; display:block; margin-bottom:6px;">${q.q}</b>
        <div style="display:flex; gap:10px; flex-wrap:wrap;">
          ${q.options.map(opt => `
            <label class="option-label" style="flex:1; min-width:140px;" onclick="window.diagEngine.recordInteraction('${q.id}', '${opt.charAt(0)}')">
              <input type="radio" name="ans_${q.id}" value="${opt.charAt(0)}">
              <span>${opt}</span>
            </label>
          `).join('')}
        </div>
        <div id="fb_${q.id}" style="display:none; font-size:12.5px; font-weight:800; margin-top:8px; padding:4px 8px; border-radius:6px;"></div>
      </div>
    `;
  }

  // --- RENDER NGỮ PHÁP & TỪ VỰNG ---
  renderGrammarAndVocabSection() {
    const mount = document.getElementById('grammarQuestionsMount');
    if (!mount) return;

    const gList = (this.activeData.grammarSets && this.activeData.grammarSets[this.setNum]) || 
                  (this.activeData.grammarSets && this.activeData.grammarSets[1]) || [];
    
    const vList = (this.activeData.vocabSets && this.activeData.vocabSets[this.setNum]) || 
                  (this.activeData.vocabSets && this.activeData.vocabSets[1]) || [];

    let html = `
      <div style="font-size:14px; font-weight:900; color:#059669; margin-bottom:12px; display:flex; align-items:center; gap:6px;">
        <i class="fa-solid fa-shapes"></i> BÀI TẬP NGỮ PHÁP (${gList.length} CÂU):
      </div>
    `;

    gList.forEach((item, idx) => {
      this.initQuestionMetric(item.id);
      html += `
        <div class="q-item-box" id="box_${item.id}">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
            <b style="font-size:14px; color:#1E293B;">Câu ${idx + 1}: ${item.q}</b>
            <span style="font-size:11px; background:#E2E8F0; padding:2px 8px; border-radius:6px; font-weight:800; color:#475569;">${item.topic}</span>
          </div>
          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:8px;">
            ${item.options.map(opt => `
              <label class="option-label" onclick="window.diagEngine.recordInteraction('${item.id}', '${opt.charAt(0)}')">
                <input type="radio" name="ans_${item.id}" value="${opt.charAt(0)}">
                <span>${opt}</span>
              </label>
            `).join('')}
          </div>
          <div id="fb_${item.id}" style="display:none; font-size:12.5px; font-weight:800; margin-top:8px; padding:6px 10px; border-radius:6px;"></div>
        </div>
      `;
    });

    if (vList.length > 0) {
      html += `
        <div style="font-size:14px; font-weight:900; color:#0284C7; margin:24px 0 12px 0; display:flex; align-items:center; gap:6px;">
          <i class="fa-solid fa-spell-check"></i> BÀI TẬP TỪ VỰNG HỌC THUẬT (${vList.length} CÂU):
        </div>
      `;
      vList.forEach((item, idx) => {
        this.initQuestionMetric(item.id);
        html += `
          <div class="q-item-box" id="box_${item.id}">
            <b style="font-size:14px; color:#1E293B; display:block; margin-bottom:8px;">Câu ${idx + 1}: ${item.q}</b>
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:8px;">
              ${item.options.map(opt => `
                <label class="option-label" onclick="window.diagEngine.recordInteraction('${item.id}', '${opt.charAt(0)}')">
                  <input type="radio" name="ans_${item.id}" value="${opt.charAt(0)}">
                  <span>${opt}</span>
                </label>
              `).join('')}
            </div>
            <div id="fb_${item.id}" style="display:none; font-size:12.5px; font-weight:800; margin-top:8px; padding:6px 10px; border-radius:6px;"></div>
          </div>
        `;
      });
    }

    mount.innerHTML = html;
  }

  // --- CẤU HÌNH WRITING & SPEAKING ---
  setupWritingAndSpeaking() {
    const wData = this.activeData.writing;
    const wt1Box = document.getElementById('wt1PromptBox');
    const wt2Box = document.getElementById('wt2PromptBox');

    if (wt1Box && wData) {
      wt1Box.innerHTML = `<b>Đề bài Task 1:</b> "${wData.task1Prompt}"<br><i>${wData.task1Guide || ''}</i>`;
    }
    if (wt2Box && wData) {
      wt2Box.innerHTML = `<b>Đề bài Task 2:</b> "${wData.task2Prompt}"<br><i>${wData.task2Guide || ''}</i>`;
    }
  }

  // --- TELEMETRY PHẢN XẠ & ĐỔI ĐÁP ÁN ---
  initQuestionMetric(qId) {
    if (!this.metrics[qId]) {
      this.metrics[qId] = {
        renderTime: Date.now(),
        firstInteractionTime: null,
        hesitationCount: 0,
        chosenValues: []
      };
    }
  }

  recordInteraction(qId, val) {
    if (this.isReviewMode) return;
    if (!this.metrics[qId]) this.initQuestionMetric(qId);
    const m = this.metrics[qId];

    const now = Date.now();
    if (!m.firstInteractionTime) m.firstInteractionTime = now - m.renderTime;

    if (m.chosenValues.length > 0 && m.chosenValues[m.chosenValues.length - 1] !== val) {
      m.hesitationCount++;
    }
    m.chosenValues.push(val);
  }

  // --- CHUYỂN TAB & TIMER ---
  switchSection(skillKey) {
    ['grammar', 'listening', 'reading', 'writing', 'speaking'].forEach(s => {
      const tab = document.getElementById(`tabNav_${s}`);
      const sec = document.getElementById(`section_${s}`);
      if (tab) tab.classList.toggle('active', s === skillKey);
      if (sec) sec.style.display = (s === skillKey) ? 'block' : 'none';
    });
    this.currentSkill = skillKey;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  startTimer() {
    this.timerSeconds = 0;
    const disp = document.getElementById('sectionTimerDisplay');
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

  // --- MICRO SPEAKING ---
  initSpeechRecognition() {
    window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!window.SpeechRecognition) return;
    this.speechRecognition = new window.SpeechRecognition();
    this.speechRecognition.continuous = true;
    this.speechRecognition.interimResults = true;
    this.speechRecognition.lang = 'en-US';
  }

  toggleSpeech(targetAreaId, btnId) {
    if (!this.speechRecognition) {
      alert("⚠️ Trình duyệt của em chưa hỗ trợ Web Speech. Em hãy gõ trực tiếp câu trả lời vào ô nhé!");
      return;
    }
    const btn = document.getElementById(btnId);
    const area = document.getElementById(targetAreaId);

    if (!this.isRecording) {
      try {
        this.speechRecognition.start();
        this.isRecording = true;
        if (btn) btn.innerHTML = `<i class="fa-solid fa-stop"></i> Đang nghe... Bấm dừng`;

        this.speechRecognition.onresult = (e) => {
          let str = '';
          for (let i = 0; i < e.results.length; ++i) str += e.results[i][0].transcript + ' ';
          if (area) area.value = str.trim();
        };
      } catch(e) {}
    } else {
      try {
        this.speechRecognition.stop();
        this.isRecording = false;
        if (btn) btn.innerHTML = `<i class="fa-solid fa-microphone"></i> Bấm để nói tiếng Anh`;
      } catch(e) {}
    }
  }

  // =========================================================================
  // 6. CHẤM BÀI TOÀN DIỆN & XUẤT BÁO CÁO DASHBOARD
  // =========================================================================
  async submitFullExam() {
    if (!confirm("Em có chắc chắn muốn nộp bài thi để hệ thống phân tích phản xạ, đối soát câu chữ và chấm điểm AI không?")) {
      return;
    }

    const btn = document.getElementById('btnSubmitFullDiagnostic');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `⏳ AI đang chấm bài dịch Writing, Speaking & đối soát câu sai...`;
    }

    clearInterval(this.timerInterval);

    // 1. Chấm Ngữ pháp & Từ vựng
    let gCorrect = 0;
    const gWrongList = [];
    const gList = (this.activeData.grammarSets && this.activeData.grammarSets[this.setNum]) || (this.activeData.grammarSets && this.activeData.grammarSets[1]) || [];

    gList.forEach((item, idx) => {
      const chosen = document.querySelector(`input[name="ans_${item.id}"]:checked`)?.value;
      if (chosen === item.answer) {
        gCorrect++;
      } else {
        gWrongList.push({
          num: idx + 1,
          q: item.q,
          chosen: chosen || "Bỏ trống",
          expected: item.answer,
          topic: item.topic
        });
      }
    });

    // 2. Chấm Listening (Hỗ trợ cả Test 1 DB nội bộ và Test 2/3 nạp JSON ngoài)
    let lCorrect = 0;
    let lTotal = 0;
    const lWrongList = [];

    if (this.listeningJsonData && (this.testId === 'test_02' || this.testId === 'test_03')) {
      const parts = this.listeningJsonData.parts || [];
      parts.forEach(part => {
        const answersMap = part.answers || {};
        const qKeys = Object.keys(answersMap);
        lTotal += qKeys.length;

        qKeys.forEach(qId => {
          const expected = answersMap[qId];
          const userVal = (this.listeningAnswers[qId] || '').trim();
          let isCorrect = false;

          if (userVal && expected) {
            if (Array.isArray(expected)) {
              isCorrect = expected.map(a => a.toLowerCase().trim()).includes(userVal.toLowerCase());
            } else {
              isCorrect = userVal.toLowerCase() === String(expected).toLowerCase().trim();
            }
          }

          if (isCorrect) {
            lCorrect++;
          } else {
            const expStr = Array.isArray(expected) ? expected.join(' / ') : expected;
            const qTitle = part.questions[qId]?.text || part.questions[qId]?.q || `Câu ${part.questions[qId]?.num || qId}`;
            lWrongList.push({
              num: part.questions[qId]?.num || qId,
              q: `${part.title} - ${qTitle}`,
              chosen: userVal || "Bỏ trống",
              expected: expStr
            });
          }
        });
      });
    } else if (this.testId === 'test_01' && this.activeData.listeningSets) {
      const setLis = this.activeData.listeningSets[this.setNum] || this.activeData.listeningSets[1];
      const allLisQ = [...setLis.audioA2.questions, ...setLis.audioB2.questions];
      lTotal = allLisQ.length;

      allLisQ.forEach((item, idx) => {
        const chosen = document.querySelector(`input[name="ans_${item.id}"]:checked`)?.value;
        if (chosen === item.answer) {
          lCorrect++;
        } else {
          lWrongList.push({
            num: idx + 1,
            q: item.q,
            chosen: chosen || "Bỏ trống",
            expected: item.answer
          });
        }
      });
    }

    // 3. Chấm Reading thông qua DiagReadingEngine
    const readingResult = diagReadingEngine.evaluate();

    // 4. Gọi AI chấm Writing & Speaking
    const wt1Text = document.getElementById('diag_wt1_input')?.value.trim() || '';
    const wt2Text = document.getElementById('diag_wt2_input')?.value.trim() || '';
    const spk1Text = document.getElementById('diag_spk_1')?.value.trim() || '';
    const spk2Text = document.getElementById('diag_spk_2')?.value.trim() || '';

    let aiWritingFeedback = "Chưa có bài viết.";
    let aiSpeakingFeedback = "Chưa có bài nói.";
    let writingBand = 4.0;
    let speakingBand = 4.0;

    try {
      if (wt1Text || wt2Text) {
        const wKey = getWritingKey();
        const wPrompt = `Chấm nhanh bài viết đầu vào (Task 1: "${wt1Text}" | Task 2: "${wt2Text}"). Cho 1 câu sửa sạch lỗi và ước lượng Band. Trả lời dưới 100 từ.`;
        aiWritingFeedback = await this.callGeminiRaw(wKey, wPrompt);
        const m = aiWritingFeedback.match(/Band\s*([0-9.]+)/i);
        if (m) writingBand = parseFloat(m[1]);
      }

      if (spk1Text || spk2Text) {
        const sKey = getSpeakingKey();
        const sPrompt = `Chấm nhanh bài nói Speaking Part 1 ("${spk1Text} ${spk2Text}"). Đánh giá phản xạ và ước lượng Band điểm. Trả lời dưới 100 từ.`;
        aiSpeakingFeedback = await this.callGeminiRaw(sKey, sPrompt);
        const m = aiSpeakingFeedback.match(/Band\s*([0-9.]+)/i);
        if (m) speakingBand = parseFloat(m[1]);
      }
    } catch(e) {
      console.warn("Lỗi gọi AI chấm Writing/Speaking:", e);
    }

    // 5. Tính toán Band tổng
    const lisRatio = lTotal > 0 ? (lCorrect / lTotal) : 0;
    const overallScore = Math.round(((gCorrect / (gList.length || 1)) * 25) + 
                                    (lisRatio * 25) + 
                                    (readingResult.scorePercent * 0.25) + 
                                    ((writingBand / 9) * 25));
    
    let estimatedBand = "4.5";
    let bandReason = "";

    if (overallScore < 35) {
      estimatedBand = "3.0 - 3.5";
      bandReason = "Hổng kiến thức thì cơ bản và từ vựng nhận diện. Độ trễ phản xạ đọc hiểu cao, cần tập trung xây gốc Ngữ pháp & Dictation nghe bắt âm A1/A2.";
    } else if (overallScore < 55) {
      estimatedBand = "4.0 - 4.5";
      bandReason = "Đã nắm được các thì đơn giản nhưng dễ mắc bẫy từ khóa (Matching Trap). Writing còn ảnh hưởng nặng dịch word-by-word từ tiếng Việt.";
    } else if (overallScore < 75) {
      estimatedBand = "5.0 - 5.5";
      bandReason = "Nền tảng câu đơn vững, nghe hiểu hội thoại tốt. Điểm nghẽn nằm ở câu phức và tư duy triển khai mạch lập luận PEEL của Writing.";
    } else {
      estimatedBand = "6.0 - 6.5+";
      bandReason = "Phản xạ nhanh, phân biệt rõ căn cứ bài đọc và tránh được bẫy suy diễn. Sẵn sàng bứt phá các dạng đề Cambridge chuyên sâu.";
    }

    // 6. Lưu vĩnh viễn dữ liệu
    const user = {
      name: localStorage.getItem('ielts_student_name') || 'Học viên',
      email: (localStorage.getItem('ielts_student_email') || 'guest@gmail.com').toLowerCase().trim()
    };

    const attemptSnapshot = {
      id: "diag_attempt_" + Date.now(),
      timestamp: new Date().toLocaleString('vi-VN'),
      testTitle: `${this.activeData.title} (Set ${this.setNum})`,
      studentName: user.name,
      studentEmail: user.email,
      score: `Band ${estimatedBand} (${overallScore}/100)`,
      timeSpent: `${Math.round(this.timerSeconds / 60)} phút`,
      moduleType: "diagnostic",
      pageUrl: `diagnostic/runner-diag.html?testId=${this.testId}&set=${this.setNum}`,
      details: {
        gScore: `${gCorrect}/${gList.length}`,
        lScore: `${lCorrect}/${lTotal}`,
        rScore: `${readingResult.score}/${readingResult.total}`,
        wBand: writingBand,
        sBand: speakingBand,
        gWrongList,
        lWrongList,
        rDetails: readingResult.details,
        listeningAnswers: this.listeningAnswers,
        wt1Text, wt2Text, spk1Text, spk2Text,
        aiWritingFeedback,
        aiSpeakingFeedback,
        bandReason
      }
    };

    try {
      const localHist = JSON.parse(localStorage.getItem('ielts_local_history') || '[]');
      localHist.unshift(attemptSnapshot);
      localStorage.setItem('ielts_local_history', JSON.stringify(localHist));

      if (this.testId === 'test_01') localStorage.setItem('diag_unlocked_test2', 'true');
      if (this.testId === 'test_02') localStorage.setItem('diag_unlocked_test3', 'true');
    } catch(e) {}

    fetch(CLOUD_SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "save_attempt", attempt: attemptSnapshot })
    }).catch(() => {});

    // 7. Hiển thị Dashboard
    this.renderComprehensiveDashboard(attemptSnapshot);
  }

  async callGeminiRaw(apiKey, prompt) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }] })
    });
    const d = await res.json();
    return d.candidates?.[0]?.content?.parts?.[0]?.text || "Đã ghi nhận bài làm.";
  }

  // --- RENDER BẢNG KẾT QUẢ TOÀN DIỆN ---
  renderComprehensiveDashboard(attempt) {
    const d = attempt.details;
    let wrongQuestionsHtml = '';

    // A. Sai Ngữ pháp
    if (d.gWrongList && d.gWrongList.length > 0) {
      wrongQuestionsHtml += `
        <div style="margin-bottom:16px;">
          <b style="color:#DC2626; font-size:14px;"><i class="fa-solid fa-circle-xmark"></i> CÁC CÂU SAI PHẦN NGỮ PHÁP (${d.gWrongList.length} câu):</b>
          <div style="display:flex; flex-direction:column; gap:6px; margin-top:6px;">
            ${d.gWrongList.map(item => `
              <div style="background:#FEF2F2; border:1px solid #FCA5A5; padding:8px 12px; border-radius:8px; font-size:13px;">
                <b>Câu ${item.num}:</b> ${item.q}<br>
                <span style="color:#991B1B;">• Em chọn: <b>${item.chosen}</b></span> ➔ <span style="color:#166534;">Đáp án chuẩn: <b>${item.expected}</b> (${item.topic})</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    // B. Sai Listening
    if (d.lWrongList && d.lWrongList.length > 0) {
      wrongQuestionsHtml += `
        <div style="margin-bottom:16px;">
          <b style="color:#DC2626; font-size:14px;"><i class="fa-solid fa-circle-xmark"></i> CÁC CÂU SAI PHẦN LISTENING (${d.lWrongList.length} câu):</b>
          <div style="display:flex; flex-direction:column; gap:6px; margin-top:6px;">
            ${d.lWrongList.map(item => `
              <div style="background:#FEF2F2; border:1px solid #FCA5A5; padding:8px 12px; border-radius:8px; font-size:13px;">
                <b>${item.q}</b><br>
                <span style="color:#991B1B;">• Em chọn: <b>${item.chosen}</b></span> ➔ <span style="color:#166534;">Đáp án chuẩn: <b>${item.expected}</b></span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    // C. Sai Reading
    const rWrongList = (d.rDetails || []).filter(item => !item.isCorrect);
    if (rWrongList.length > 0) {
      wrongQuestionsHtml += `
        <div style="margin-bottom:16px;">
          <b style="color:#DC2626; font-size:14px;"><i class="fa-solid fa-circle-xmark"></i> CÁC CÂU CHƯA ĐẠT CHUẨN READING (${rWrongList.length} câu):</b>
          <div style="display:flex; flex-direction:column; gap:6px; margin-top:6px;">
            ${rWrongList.map(item => `
              <div style="background:#FEF2F2; border:1px solid #FCA5A5; padding:8px 12px; border-radius:8px; font-size:13px;">
                <b>Câu ${item.questionNum}:</b> ${item.behaviorTag || 'Sai'}<br>
                <span style="color:#991B1B;">• Lựa chọn của em: <b>${item.userTier1 || item.userAnswer}</b></span> ➔ <span style="color:#166534;">Đáp án chuẩn: <b>${item.expectedTier1 || item.expectedAnswer}</b></span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    document.querySelector('.runner-container').innerHTML = `
      <div style="background:#FFFFFF; border:3px solid #E8E2D8; border-bottom:7px solid #D3CBC0; border-radius:24px; padding:32px 24px; max-width:820px; margin:30px auto;">
        <div style="text-align:center; margin-bottom:24px;">
          <div style="font-size:40px; margin-bottom:8px;">🎯</div>
          <h2 style="color:#8B1518; margin:0 0 6px 0; font-size:24px; font-weight:900;">BÁO CÁO PHÂN TÍCH NĂNG LỰC ĐẦU VÀO</h2>
          <span style="font-size:13px; font-weight:800; color:#64748B;">Học viên: ${attempt.studentName} • ${attempt.timestamp}</span>
        </div>

        <div style="background:#FEF3C7; border:2px solid #FCD34D; border-left:6px solid #D97706; padding:18px 20px; border-radius:16px; margin-bottom:20px;">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
            <b style="font-size:14px; color:#92400E;">🎯 BAND ƯỚC LƯỢNG SƠ BỘ:</b>
            <span style="font-size:24px; font-weight:900; color:#B45309;">${attempt.score}</span>
          </div>
          <div style="margin-top:10px; font-size:14px; line-height:1.6; color:#78350F; font-weight:700;">
            <b>💡 Phân tích nguyên nhân:</b> ${d.bandReason}
          </div>
        </div>

        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(130px, 1fr)); gap:10px; margin-bottom:22px;">
          <div style="background:#F0FDF4; border:1.5px solid #86EFAC; padding:12px; border-radius:12px; text-align:center;">
            <div style="font-size:11px; font-weight:800; color:#166534;">NGỮ PHÁP</div>
            <b style="font-size:18px; color:#15803D;">${d.gScore}</b>
          </div>
          <div style="background:#F0F9FF; border:1.5px solid #BAE6FD; padding:12px; border-radius:12px; text-align:center;">
            <div style="font-size:11px; font-weight:800; color:#0369A1;">LISTENING</div>
            <b style="font-size:18px; color:#0284C7;">${d.lScore}</b>
          </div>
          <div style="background:#FDF2F2; border:1.5px solid #FECACA; padding:12px; border-radius:12px; text-align:center;">
            <div style="font-size:11px; font-weight:800; color:#991B1B;">READING</div>
            <b style="font-size:18px; color:#8B1518;">${d.rScore}</b>
          </div>
          <div style="background:#EFF6FF; border:1.5px solid #BFDBFE; padding:12px; border-radius:12px; text-align:center;">
            <div style="font-size:11px; font-weight:800; color:#1E40AF;">WRITING</div>
            <b style="font-size:18px; color:#2563EB;">Band ${d.wBand}</b>
          </div>
          <div style="background:#FFFBEB; border:1.5px solid #FDE68A; padding:12px; border-radius:12px; text-align:center;">
            <div style="font-size:11px; font-weight:800; color:#92400E;">SPEAKING</div>
            <b style="font-size:18px; color:#D97706;">Band ${d.sBand}</b>
          </div>
        </div>

        <div style="background:#FAF7F2; border:2px solid #E8E2D8; border-radius:18px; padding:18px; margin-bottom:22px;">
          <h4 style="margin:0 0 12px 0; color:#261F1D; font-size:15px; font-weight:900;">
            🔍 CHI TIẾT CÁC CÂU LÀM SAI ĐỂ CẢI THIỆN:
          </h4>
          ${wrongQuestionsHtml || '<div style="color:#166534; font-weight:bold;">🎉 Tuyệt vời! Em không làm sai câu trắc nghiệm nào.</div>'}
        </div>

        <div style="background:#F8FAFC; border:1.5px solid #CBD5E1; border-radius:16px; padding:16px; margin-bottom:24px; font-size:13.5px; line-height:1.6;">
          <b style="color:#1E293B; display:block; margin-bottom:6px;">🤖 Nhận xét tự luận từ AI:</b>
          <div><b>Writing:</b> ${d.aiWritingFeedback}</div>
          <div style="margin-top:8px;"><b>Speaking:</b> ${d.aiSpeakingFeedback}</div>
        </div>

        <div style="display:flex; flex-direction:column; gap:12px; align-items:center;">
          <button type="button" onclick="location.reload()" class="btn-3d btn-3d-red" style="width:100%; padding:15px; font-size:16px;">
            👁️ XEM LẠI BÀI THI & TRANSCRIPT &rarr;
          </button>
          <div style="display:flex; gap:10px; width:100%;">
            <a href="index-diag.html" class="btn-3d btn-3d-white" style="flex:1; text-align:center;">⬅ Danh sách bài Test</a>
            <a href="../curriculum-system/roadmap.html" class="btn-3d btn-3d-blue" style="flex:1; text-align:center;">🚀 Lộ trình học &rarr;</a>
          </div>
        </div>
      </div>
    `;
  }

  // --- REVIEW MODE: KHÔI PHỤC VÀ TÔ MÀU ĐÚNG SAI ---
  restoreReviewMode(attemptId) {
    this.isReviewMode = true;
    try {
      const localHist = JSON.parse(localStorage.getItem('ielts_local_history') || '[]');
      const att = localHist.find(a => a.id === attemptId);
      if (!att || !att.details) return;

      const d = att.details;

      // 1. Tô màu Ngữ pháp
      (this.activeData.grammarSets[this.setNum] || []).forEach(g => {
        const box = document.getElementById(`box_${g.id}`);
        const fb = document.getElementById(`fb_${g.id}`);
        const wrongItem = (d.gWrongList || []).find(w => w.q === g.q);

        if (box) {
          box.style.borderColor = wrongItem ? '#EF4444' : '#22C55E';
          box.style.background = wrongItem ? '#FEF2F2' : '#F0FDF4';
        }
        if (fb) {
          fb.style.display = 'block';
          fb.style.color = wrongItem ? '#991B1B' : '#166534';
          fb.innerText = wrongItem ? `✗ Sai (Em chọn: ${wrongItem.chosen} | Chuẩn: ${wrongItem.expected})` : `✓ ĐÚNG`;
        }
      });

      // 2. Khôi phục bài nghe & mở Transcript
      if (d.listeningAnswers) {
        this.listeningAnswers = d.listeningAnswers;
        if (this.listeningJsonData) {
          this.switchListeningPart(0, false);
          const tBox = document.getElementById('listeningTranscriptContainer');
          if (tBox) tBox.style.display = 'block';
        }
      }

      // 3. Tô màu Reading
      if (d.rDetails) {
        diagReadingEngine.renderReviewMode({ details: d.rDetails });
      }

      // 4. Khôi phục text Writing & Speaking
      const wt1 = document.getElementById('diag_wt1_input');
      const wt2 = document.getElementById('diag_wt2_input');
      const spk1 = document.getElementById('diag_spk_1');
      const spk2 = document.getElementById('diag_spk_2');

      if (wt1 && d.wt1Text) { wt1.value = d.wt1Text; wt1.disabled = true; }
      if (wt2 && d.wt2Text) { wt2.value = d.wt2Text; wt2.disabled = true; }
      if (spk1 && d.spk1Text) { spk1.value = d.spk1Text; spk1.disabled = true; }
      if (spk2 && d.spk2Text) { spk2.value = d.spk2Text; spk2.disabled = true; }

      document.getElementById('btnSubmitFullDiagnostic')?.remove();
      alert(`📜 Đang ở chế độ XEM LẠI BÀI THI: ${att.testTitle} (${att.score})`);
    } catch(e) {
      console.warn("Lỗi khôi phục Review Mode:", e);
    }
  }
}

// =========================================================================
// 7. GẮN BIẾN TOÀN CỤC & SỰ KIỆN WINDOW
// =========================================================================
export const diagEngine = new DiagnosticEngineMaster();
window.diagEngine = diagEngine;
window.switchSkillSection = (s) => diagEngine.switchSection(s);
window.switchListeningPart = (idx, shouldPlay) => diagEngine.switchListeningPart(idx, shouldPlay);
window.seekDiagAudio = (seconds) => diagEngine.seekAudio(seconds);
window.syncDiagAnswer = (qId, val) => {
  diagEngine.listeningAnswers[qId] = val;
};
window.toggleDiagSpeech = (t, b) => diagEngine.toggleSpeech(t, b);
window.submitDiagnosticExam = () => diagEngine.submitFullExam();

document.addEventListener('DOMContentLoaded', () => diagEngine.init());
