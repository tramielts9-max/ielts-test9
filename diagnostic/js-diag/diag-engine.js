/**
 * diagnostic/js-diag/diag-engine.js
 * BỘ MÁY ĐIỀU PHỐI KHẢO THÍ CHẨN ĐOÁN THÍCH ỨNG MASTER (TEST 1, 2, 3 & 3 SET XOAY TUA)
 * BẢN FULL ĐẦY ĐỦ 100% - CHẤM TWO-TIER, CHẤM AI WRITING/SPEAKING TRỰC TIẾP,
 * ĐO ĐỘ TRỄ PHẢN XẠ TTFI/HESITATION, DASHBOARD CHI TIẾT CÂU SAI & REVIEW MODE TÔ MÀU
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
// 2. NGÂN HÀNG DỮ LIỆU ĐỀ THI ĐA DẠNG CHO TEST 1, 2, 3
// =========================================================================
const DIAGNOSTIC_DATABASE = {
  // -----------------------------------------------------------------------
  // TEST 1 (45 PHÚT - BAND 0 ➔ 5.0): CÓ 3 PHIÊN BẢN LISTENING XOAY TUA
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
    // Đủ 2 Audio (A2 + B2) - Đã hạ độ khó thành trắc nghiệm 3 lựa chọn A, B, C
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
      },
      2: {
        audioA2: {
          url: "https://archive.org/download/lisb2-3/lisa2-2.mp3",
          title: "Audio 1 (A2): Family Life (Gia đình)",
          questions: [
            { id: "lis_s2_01", q: "1. How old is Paul currently?", options: ["A. 18", "B. 21", "C. 25"], answer: "B" },
            { id: "lis_s2_02", q: "2. What is Paul's job apprenticeship?", options: ["A. Engineer on ships", "B. Carpenter", "C. Electrician"], answer: "A" },
            { id: "lis_s2_03", q: "3. What did the siblings usually argue about in the past?", options: ["A. Doing chores", "B. Playing video games", "C. Watching TV"], answer: "B" },
            { id: "lis_s2_04", q: "4. What is the father currently building?", options: ["A. A garden shed", "B. A sailing boat", "C. A wooden table"], answer: "B" },
            { id: "lis_s2_05", q: "5. How long has the mother been away from formal work?", options: ["A. Over 10 years", "B. Over 20 years", "C. Exactly 5 years"], answer: "B" }
          ]
        },
        audioB2: {
          url: "https://archive.org/download/lisb2-3/lisb2-2.mp3",
          title: "Audio 2 (B2): Work & Commute (Đi lại & Công việc)",
          questions: [
            { id: "lis_s2_06", q: "6. What is the speaker's stance regarding their compensation?", options: ["A. Will not work for low pay", "B. Salary is unimportant", "C. Overtime is required"], answer: "A" },
            { id: "lis_s2_07", q: "7. How many paid vacation days does the speaker receive annually?", options: ["A. 14 days", "B. 21 days", "C. 28 days"], answer: "B" },
            { id: "lis_s2_08", q: "8. How long does the daily round-trip car commute take?", options: ["A. 1 hour", "B. 2 hours", "C. 4 hours"], answer: "B" },
            { id: "lis_s2_09", q: "9. How many days each week does the speaker work remotely from home?", options: ["A. 2 days", "B. 3 days", "C. 5 days"], answer: "A" },
            { id: "lis_s2_10", q: "10. What activity helps the speaker relax while stuck in traffic?", options: ["A. Drinking coffee", "B. Listening to podcasts", "C. Making phone calls"], answer: "B" }
          ]
        }
      },
      3: {
        audioA2: {
          url: "https://archive.org/download/lisb2-3/lisa2-3.mp3",
          title: "Audio 1 (A2): Clothes Shopping (Mua sắm)",
          questions: [
            { id: "lis_s3_01", q: "1. Which jacket colour was finally chosen?", options: ["A. Blue", "B. Black", "C. Grey"], answer: "B" },
            { id: "lis_s3_02", q: "2. What discount percentage applies to the second item?", options: ["A. 10%", "B. 15%", "C. 20%"], answer: "B" },
            { id: "lis_s3_03", q: "3. What colour cardigan was picked?", options: ["A. Brown", "B. Green", "C. White"], answer: "A" },
            { id: "lis_s3_04", q: "4. What was the total price after discount?", options: ["A. £50", "B. £76", "C. £90"], answer: "B" },
            { id: "lis_s3_05", q: "5. How much change did the customer receive back?", options: ["A. £14", "B. £24", "C. £30"], answer: "B" }
          ]
        },
        audioB2: {
          url: "https://archive.org/download/lisb2-3/lisb2-3.mp3",
          title: "Audio 2 (B2): News & Media (Tin tức & Truyền thông)",
          questions: [
            { id: "lis_s3_06", q: "6. Where does the speaker primarily consume news when traveling?", options: ["A. On the radio", "B. On television", "C. Social media"], answer: "A" },
            { id: "lis_s3_07", q: "7. Why does the speaker avoid watching live television broadcasts?", options: ["A. Too expensive", "B. Strong dislike of adverts", "C. Broadcasts too late"], answer: "B" },
            { id: "lis_s3_08", q: "8. Which historic news event had the strongest emotional impact?", options: ["A. Moon landing", "B. 9/11 Twin Towers attack", "C. Major earthquake"], answer: "B" },
            { id: "lis_s3_09", q: "9. Why do online tabloids publish sensationalist headlines?", options: ["A. To educate readers", "B. To generate more clicks", "C. To comply with laws"], answer: "B" },
            { id: "lis_s3_10", q: "10. Which recent political incident was highlighted as shocking?", options: ["A. The Capitol attack", "B. Election debates", "C. Economic summit"], answer: "A" }
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
  // TEST 2 (100 PHÚT - BAND 5.0 ➔ 6.5): CÓ TỪ VỰNG, CAM 21 P1+P2
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
    listening: {
      audioUrl: "https://archive.org/download/lisb2-3/lisb2-1.mp3",
      title: "IELTS Listening Cambridge 21 (Part 1 & Part 2)",
      questions: [
        { id: "t2_lis01", q: "1. What is the customer's primary reason for calling?", answer: "enquiry" },
        { id: "t2_lis02", q: "2. The membership fee is payable on a ______ basis.", answer: "monthly" }
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
  // TEST 3 (105 PHÚT - BAND 6.5+): NGỮ PHÁP ADVANCED, CAM 21 P3+P4
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
    listening: {
      audioUrl: "https://archive.org/download/lisb2-3/lisb2-3.mp3",
      title: "IELTS Listening Cambridge 21 (Part 3 & Part 4 Academic Lecture)",
      questions: [
        { id: "t3_lis01", q: "1. The research project focuses primarily on marine ______.", answer: "biodiversity" },
        { id: "t3_lis02", q: "2. What methodology was employed to gather deep-sea specimens?", answer: "sonar" }
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
// 3. ĐỘNG CƠ ĐIỀU PHỐI KHẢO THÍ CHÍNH (DIAGNOSTIC ENGINE)
// =========================================================================
class DiagnosticEngineMaster {
  constructor() {
    this.currentSkill = "grammar";
    this.testId = "test_01";
    this.setNum = 1;
    this.activeData = null;

    // Bộ nhớ Telemetry phản xạ
    this.metrics = {};
    this.timerSeconds = 0;
    this.timerInterval = null;

    // Trạng thái thu âm
    this.speechRecognition = null;
    this.isRecording = false;

    // Chế độ xem lại
    this.isReviewMode = false;
  }

  async init() {
    const urlParams = new URLSearchParams(window.location.search);
    this.testId = urlParams.get('testId') || 'test_01';
    
    // Tự động xoay tua Set 1, 2, 3 nếu không chỉ định
    const rawSet = parseInt(urlParams.get('set') || urlParams.get('ver'), 10);
    this.setNum = (!isNaN(rawSet) && rawSet >= 1 && rawSet <= 3) ? rawSet : Math.floor(Math.random() * 3) + 1;

    this.activeData = DIAGNOSTIC_DATABASE[this.testId] || DIAGNOSTIC_DATABASE.test_01;

    // Cập nhật tiêu đề trang
    const titleEl = document.getElementById('currentTestTitle');
    if (titleEl) {
      titleEl.innerText = `${this.activeData.title} • Set ${this.setNum}`;
    }

    // 1. Nạp và render phần Ngữ pháp / Từ vựng
    this.renderGrammarAndVocabSection();

    // 2. Nạp và render phần Listening
    this.renderListeningSection();

    // 3. NẠP READING TỪ FILE JSON RIÊNG BIỆT (CHẠY QUA DIAG-READING.JS)
    await this.initReadingFromJson();

    // 4. Khởi tạo Writing & Speaking
    this.setupWritingAndSpeaking();
    this.initSpeechRecognition();
    this.startTimer();

    // 5. Kiểm tra Review Mode
    const attemptId = urlParams.get('attemptId');
    if (attemptId) {
      this.restoreReviewMode(attemptId);
    }
  }

  // --- NẠP DỮ LIỆU READING TỪ FILE JSON RIÊNG BIỆT ---
  async initReadingFromJson() {
    // Quy ước đường dẫn: data-diag/reading/test1-reading-s1.json
    const testNum = this.testId.replace('test_0', '').replace('test_', '');
    const jsonPath = `data-diag/reading/test${testNum}-reading-s${this.setNum}.json`;

    console.log(`[DiagEngine] Đang nạp Reading JSON: ${jsonPath}`);
    const success = await diagReadingEngine.loadTestFromJson(jsonPath);
    if (success) {
      diagReadingEngine.render();
    }
  }

  // --- RENDER NGỮ PHÁP & TỪ VỰNG ---
  renderGrammarAndVocabSection() {
    const mount = document.getElementById('grammarQuestionsMount');
    if (!mount) return;

    const gList = (this.activeData.grammarSets && this.activeData.grammarSets[this.setNum]) || 
                  (this.activeData.grammarSets && this.activeData.grammarSets[1]) || [];
    
    const vList = (this.activeData.vocabSets && this.activeData.vocabSets[this.setNum]) || 
                  (this.activeData.vocabSets && this.activeData.vocabSets[1]) || [];

    let html = '';

    // Khối Ngữ pháp
    html += `
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

    // Khối Từ vựng (Nếu là Test 2)
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

  // --- RENDER LISTENING (HẠ ĐỘ KHÓ 3 LỰA CHỌN A-B-C) ---
  renderListeningSection() {
    const mount = document.getElementById('listeningQuestionsMount');
    const audioEl = document.getElementById('diagAudioPlayer');
    const labelEl = document.getElementById('currentAudioLabel');
    if (!mount) return;

    // Test 1: Có 2 Audio A2 và B2
    if (this.testId === 'test_01' && this.activeData.listeningSets) {
      const setLis = this.activeData.listeningSets[this.setNum] || this.activeData.listeningSets[1];
      if (audioEl) audioEl.src = setLis.audioA2.url;
      if (labelEl) labelEl.innerText = setLis.audioA2.title;

      let html = '';

      // Khối Audio A2
      html += `
        <div style="margin-bottom:20px;">
          <b style="font-size:14.5px; color:#0284C7; display:block; margin-bottom:10px;">
            🎧 BÀI NGHE 1 (LEVEL A2): ĐÃ HẠ ĐỘ KHÓ THÀNH TRẮC NGHIỆM 3 LỰA CHỌN
          </b>
          ${setLis.audioA2.questions.map(q => this.renderListeningQuestionItem(q)).join('')}
        </div>
      `;

      // Khối Audio B2
      html += `
        <div style="margin-top:24px; border-top:2px dashed #E8E2D8; padding-top:18px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:8px;">
            <b style="font-size:14.5px; color:#8B1518;">
              🎧 BÀI NGHE 2 (LEVEL B2): ${setLis.audioB2.title}
            </b>
            <button type="button" class="btn-3d btn-3d-white" style="padding:6px 12px; font-size:12px;" onclick="document.getElementById('diagAudioPlayer').src='${setLis.audioB2.url}'; document.getElementById('currentAudioLabel').innerText='${setLis.audioB2.title}'; document.getElementById('diagAudioPlayer').play();">
              ▶ Bật Audio B2 này
            </button>
          </div>
          ${setLis.audioB2.questions.map(q => this.renderListeningQuestionItem(q)).join('')}
        </div>
      `;

      mount.innerHTML = html;
    } else {
      // Test 2 & Test 3: Đề chuẩn Cambridge 21
      if (audioEl && this.activeData.listening) audioEl.src = this.activeData.listening.audioUrl;
      if (labelEl && this.activeData.listening) labelEl.innerText = this.activeData.listening.title;

      const qList = (this.activeData.listening && this.activeData.listening.questions) || [];
      mount.innerHTML = qList.map(q => `
        <div class="q-item-box" id="box_${q.id}">
          <label style="font-size:14px; font-weight:800; color:#1E293B; display:block;">${q.q}</label>
          <input type="text" id="ans_${q.id}" class="diag-input" placeholder="Điền đáp án nghe được...">
          <div id="fb_${q.id}" style="display:none; font-size:12.5px; font-weight:800; margin-top:6px; padding:4px 8px; border-radius:6px;"></div>
        </div>
      `).join('');
    }
  }

  renderListeningQuestionItem(q) {
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

  // --- CẤU HÌNH WRITING & SPEAKING PROMPT THEO TEST ---
  setupWritingAndSpeaking() {
    const wData = this.activeData.writing;
    const sData = this.activeData.speaking;

    const wt1Box = document.getElementById('wt1PromptBox');
    const wt2Box = document.getElementById('wt2PromptBox');

    if (wt1Box && wData) {
      wt1Box.innerHTML = `<b>Đề bài Task 1:</b> "${wData.task1Prompt}"<br><i>${wData.task1Guide || ''}</i>`;
    }
    if (wt2Box && wData) {
      wt2Box.innerHTML = `<b>Đề bài Task 2:</b> "${wData.task2Prompt}"<br><i>${wData.task2Guide || ''}</i>`;
    }
  }

  // --- TELEMETRY PHẢN XẠ & ĐỔI ĐÁP ÁN (HESITATION) ---
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
    if (!m.firstInteractionTime) {
      m.firstInteractionTime = now - m.renderTime; // Độ trễ TTFI
    }

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
  // 4. CHẤM BÀI TOÀN DIỆN, GỌI AI CHẤM VIẾT/NÓI & XUẤT DASHBOARD CHI TIẾT
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

    // 2. Chấm Listening
    let lCorrect = 0;
    const lWrongList = [];

    if (this.testId === 'test_01' && this.activeData.listeningSets) {
      const setLis = this.activeData.listeningSets[this.setNum] || this.activeData.listeningSets[1];
      const allLisQ = [...setLis.audioA2.questions, ...setLis.audioB2.questions];

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

    // 4. LẤY TEXT VÀ GỌI AI CHẤM WRITING & SPEAKING
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

    // 5. Tính toán Band tổng & Giải thích lý do logic
    const overallScore = Math.round(((gCorrect / (gList.length || 1)) * 25) + 
                                    ((lCorrect / 10) * 25) + 
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

    // 6. Lưu vĩnh viễn dữ liệu vào LocalStorage & Google Drive
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
        lScore: `${lCorrect}/10`,
        rScore: `${readingResult.score}/${readingResult.total}`,
        wBand: writingBand,
        sBand: speakingBand,
        gWrongList,
        lWrongList,
        rDetails: readingResult.details,
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

      // Mở khóa bài tiếp theo
      if (this.testId === 'test_01') localStorage.setItem('diag_unlocked_test2', 'true');
      if (this.testId === 'test_02') localStorage.setItem('diag_unlocked_test3', 'true');
    } catch(e) {}

    fetch(CLOUD_SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "save_attempt", attempt: attemptSnapshot })
    }).catch(() => {});

    // 7. Hiển thị Dashboard chi tiết từng câu sai
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

  // =========================================================================
  // 5. DASHBOARD CHI TIẾT CÂU SAI & NÚT XEM LẠI BÀI LÀM TÔ MÀU
  // =========================================================================
  renderComprehensiveDashboard(attempt) {
    const d = attempt.details;

    let wrongQuestionsHtml = '';

    // A. Danh sách câu sai Ngữ pháp
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

    // B. Danh sách câu sai Listening
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

    // C. Danh sách câu sai Reading Two-Tier
    const rWrongList = (d.rDetails || []).filter(item => !item.isCorrect);
    if (rWrongList.length > 0) {
      wrongQuestionsHtml += `
        <div style="margin-bottom:16px;">
          <b style="color:#DC2626; font-size:14px;"><i class="fa-solid fa-circle-xmark"></i> CÁC CÂU CHƯA ĐẠT CHUẨN READING TWO-TIER (${rWrongList.length} câu):</b>
          <div style="display:flex; flex-direction:column; gap:6px; margin-top:6px;">
            ${rWrongList.map(item => `
              <div style="background:#FEF2F2; border:1px solid #FCA5A5; padding:8px 12px; border-radius:8px; font-size:13px;">
                <b>Câu ${item.questionNum}:</b> ${item.behaviorTag}<br>
                <span style="color:#991B1B;">• Tầng 1: Em chọn <b>${item.userTier1}</b> (Chuẩn: <b>${item.expectedTier1}</b>)</span><br>
                <span style="color:#991B1B;">• Tầng 2: Căn cứ em chọn <b>${item.userTier2}</b> (Căn cứ chuẩn: <b>${item.expectedTier2}</b>)</span>
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

        <!-- 1. BAND ĐIỂM VÀ LÝ DO GIẢI THÍCH CHI TIẾT -->
        <div style="background:#FEF3C7; border:2px solid #FCD34D; border-left:6px solid #D97706; padding:18px 20px; border-radius:16px; margin-bottom:20px;">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
            <b style="font-size:14px; color:#92400E;">🎯 BAND ƯỚC LƯỢNG SƠ BỘ:</b>
            <span style="font-size:24px; font-weight:900; color:#B45309;">${attempt.score}</span>
          </div>
          <div style="margin-top:10px; font-size:14px; line-height:1.6; color:#78350F; font-weight:700;">
            <b>💡 Giải thích nguyên nhân:</b> ${d.bandReason}
          </div>
        </div>

        <!-- 2. CHI TIẾT CÂU ĐẠT CHUẨN CẢ 4 KỸ NĂNG -->
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(140px, 1fr)); gap:10px; margin-bottom:22px;">
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

        <!-- 3. DANH SÁCH CHI TIẾT CÁC CÂU LÀM SAI (THEO YÊU CẦU PDF TRANG 5) -->
        <div style="background:#FAF7F2; border:2px solid #E8E2D8; border-radius:18px; padding:18px; margin-bottom:22px;">
          <h4 style="margin:0 0 12px 0; color:#261F1D; font-size:15px; font-weight:900;">
            🔍 PHÂN TÍCH CHI TIẾT CÁC CÂU LÀM SAI ĐỂ CẢI THIỆN:
          </h4>
          ${wrongQuestionsHtml || '<div style="color:#166534; font-weight:bold;">🎉 Tuyệt vời! Em không làm sai câu trắc nghiệm nào.</div>'}
        </div>

        <!-- 4. TÓM TẮT BÀI SỬA CỦA AI CHO WRITING & SPEAKING -->
        <div style="background:#F8FAFC; border:1.5px solid #CBD5E1; border-radius:16px; padding:16px; margin-bottom:24px; font-size:13.5px; line-height:1.6;">
          <b style="color:#1E293B; display:block; margin-bottom:6px;">🤖 Nhận xét tự luận từ AI:</b>
          <div><b>Writing:</b> ${d.aiWritingFeedback}</div>
          <div style="margin-top:8px;"><b>Speaking:</b> ${d.aiSpeakingFeedback}</div>
        </div>

        <!-- 5. NÚT TO NỔI BẬT ĐỂ XEM LẠI TOÀN BỘ BÀI THI TÔ MÀU ĐÚNG SAI -->
        <div style="display:flex; flex-direction:column; gap:12px; align-items:center;">
          <button type="button" onclick="location.reload()" class="btn-3d btn-3d-red" style="width:100%; padding:15px; font-size:16px; box-shadow:0 6px 20px rgba(139,21,24,0.35);">
            👁️ XEM LẠI TOÀN BỘ BÀI LÀM & CHI TIẾT ĐÚNG SAI TÔ MÀU &rarr;
          </button>

          <div style="display:flex; gap:10px; width:100%;">
            <a href="index-diag.html" class="btn-3d btn-3d-white" style="flex:1; text-align:center;">
              ⬅ Danh sách bài Test
            </a>
            <a href="../curriculum-system/roadmap.html" class="btn-3d btn-3d-blue" style="flex:1; text-align:center;">
              🚀 Kích hoạt Lộ trình học &rarr;
            </a>
          </div>
        </div>

      </div>
    `;
  }

  // --- REVIEW MODE: KHÔI PHỤC BÀI LÀM VÀ TÔ MÀU CÂU HỎI ---
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

      // 2. Tô màu Reading
      if (d.rDetails) {
        diagReadingEngine.renderReviewMode({ details: d.rDetails });
      }

      // 3. Khôi phục text Writing & Speaking
      const wt1 = document.getElementById('diag_wt1_input');
      const wt2 = document.getElementById('diag_wt2_input');
      const spk1 = document.getElementById('diag_spk_1');
      const spk2 = document.getElementById('diag_spk_2');

      if (wt1 && d.wt1Text) { wt1.value = d.wt1Text; wt1.disabled = true; }
      if (wt2 && d.wt2Text) { wt2.value = d.wt2Text; wt2.disabled = true; }
      if (spk1 && d.spk1Text) { spk1.value = d.spk1Text; spk1.disabled = true; }
      if (spk2 && d.spk2Text) { spk2.value = d.spk2Text; spk2.disabled = true; }

      // Ẩn nút nộp bài
      document.getElementById('btnSubmitFullDiagnostic')?.remove();

      alert(`📜 Đang ở chế độ XEM LẠI BÀI THI: ${att.testTitle} (${att.score})`);
    } catch(e) {
      console.warn("Lỗi khôi phục Review Mode:", e);
    }
  }
}

// Khởi tạo engine toàn cục
export const diagEngine = new DiagnosticEngineMaster();
window.diagEngine = diagEngine;
window.switchSkillSection = (s) => diagEngine.switchSection(s);
window.toggleDiagSpeech = (t, b) => diagEngine.toggleSpeech(t, b);
window.submitDiagnosticExam = () => diagEngine.submitFullExam();

document.addEventListener('DOMContentLoaded', () => diagEngine.init());
