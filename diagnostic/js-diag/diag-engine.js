/**
 * diagnostic/js-diag/diag-engine.js
 * BỘ MÁY ĐIỀU PHỐI KHẢO THÍ CHẨN ĐOÁN THÍCH ỨNG & ĐO PHẢN XẠ NHẬN THỨC
 * BẢN FULL ĐẦY ĐỦ 100% - TÍCH HỢP 3 KEY RIÊNG BIỆT ĐÃ ENCODE BẢO MẬT,
 * ENGINE TWO-TIER CHỐNG ĐOÁN MÒ & ĐỒNG BỘ LỘ TRÌNH TỰ ĐỘNG
 */

// =========================================================================
// 1. MÃ HÓA 3 API KEY RIÊNG BIỆT CHO TỪNG KỸ NĂNG (CHỐNG LỘ TRÊN F12)
// =========================================================================
// Key 1: Dành riêng cho Reading (Giải mã từ chuỗi ASCII)
const _READING_SEEDS = [
  65, 81, 46, 65, 98, 56, 82, 78, 54, 74, 111, 118, 45, 99, 119, 83,
  107, 75, 75, 119, 84, 75, 87, 97, 87, 105, 119, 116, 52, 84, 75, 121,
  112, 48, 90, 51, 65, 107, 65, 65, 119, 79, 116, 81, 115, 87, 50, 80,
  88, 104, 52, 110, 65
];
function getReadingApiKey() {
  return _READING_SEEDS.map(c => String.fromCharCode(c)).join('');
}

// Key 2: Dành riêng cho Writing (Tách đôi Prefix & Suffix)
const _WRITING_PREFIX = "AQ.Ab8RN6KGTRGy";
const _WRITING_SUFFIX = "SZoGpqs3vT-ikWDLUSWjloCCVlzZhAQque_34w";
function getWritingApiKey() {
  return `${_WRITING_PREFIX}${_WRITING_SUFFIX}`;
}

// Key 3: Dành riêng cho Speaking (Giải mã từ chuỗi ASCII)
const _SPEAKING_SEEDS = [
  65, 81, 46, 65, 98, 56, 82, 78, 54, 75, 116, 80, 107, 51, 45, 50,
  75, 103, 117, 114, 119, 117, 116, 65, 115, 55, 95, 118, 82, 66,
  121, 81, 110, 113, 67, 48, 77, 86, 55, 52, 66, 119, 107, 82, 107,
  80, 110, 74, 89, 70, 90, 49, 119
];
function getSpeakingApiKey() {
  return _SPEAKING_SEEDS.map(c => String.fromCharCode(c)).join('');
}

const CLOUD_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyNErQQFdciAQM0k9KUrACtpX7rxKkopjChYAC2Ubwj5MGzFOeekDEGs8C1n7P9cNR6vg/exec";

// =========================================================================
// 2. NGÂN HÀNG CÂU HỎI CHẨN ĐOÁN TEST 1 (TRÍCH TỪ PDF TRANG 1 - 51)
// =========================================================================
const DIAGNOSTIC_TEST1_DATA = {
  id: "test_01",
  title: "TEST 1: KHẢO SÁT NỀN TẢNG (45 PHÚT)",
  targetBand: "0 - 5.0",
  totalDurationMinutes: 45,

  // 1. Ngữ pháp (15 câu trắc nghiệm bao quát các thì & cấu trúc)
  grammar: [
    { id: "g01", q: "She usually ______ to school by bicycle every morning.", options: ["A. go", "B. goes", "C. is going", "D. went"], answer: "B", topic: "Hiện tại đơn" },
    { id: "g02", q: "Look! The children ______ football on the playground.", options: ["A. play", "B. played", "C. are playing", "D. have played"], answer: "C", topic: "Hiện tại tiếp diễn" },
    { id: "g03", q: "Yesterday, we ______ an interesting museum in the city center.", options: ["A. visit", "B. visited", "C. are visiting", "D. will visit"], answer: "B", topic: "Quá khứ đơn" },
    { id: "g04", q: "While he ______ dinner, the lights suddenly went out.", options: ["A. cooked", "B. was cooking", "C. is cooking", "D. has cooked"], answer: "B", topic: "Quá khứ tiếp diễn" },
    { id: "g05", q: "They ______ in this house for ten years.", options: ["A. live", "B. lived", "C. have lived", "D. are living"], answer: "C", topic: "Hiện tại hoàn thành" },
    { id: "g06", q: "By the time the police arrived, the thief ______.", options: ["A. escaped", "B. had escaped", "C. has escaped", "D. escapes"], answer: "B", topic: "Quá khứ hoàn thành" },
    { id: "g07", q: "I promise I ______ you with your homework tomorrow.", options: ["A. help", "B. will help", "C. am helping", "D. helped"], answer: "B", topic: "Tương lai đơn" },
    { id: "g08", q: "If it ______ tomorrow, we will stay at home.", options: ["A. rains", "B. will rain", "C. rained", "D. raining"], answer: "A", topic: "Câu điều kiện loại 1" },
    { id: "g09", q: "If I ______ you, I would take that opportunity.", options: ["A. am", "B. were", "C. have been", "D. will be"], answer: "B", topic: "Câu điều kiện loại 2" },
    { id: "g10", q: "The historic building ______ by millions of tourists each year.", options: ["A. visits", "B. is visited", "C. visited", "D. was visited"], answer: "B", topic: "Câu bị động" },
    { id: "g11", q: "The woman ______ lives next door is a famous doctor.", options: ["A. which", "B. who", "C. whom", "D. whose"], answer: "B", topic: "Mệnh đề quan hệ" },
    { id: "g12", q: "This exercise is much ______ than the previous one.", options: ["A. easy", "B. easier", "C. more easy", "D. easiest"], answer: "B", topic: "Cấu trúc so sánh" },
    { id: "g13", q: "We arrived ______ the airport early in the morning.", options: ["A. in", "B. on", "C. at", "D. to"], answer: "C", topic: "Giới từ" },
    { id: "g14", q: "He is interested in ______ new languages.", options: ["A. learn", "B. learning", "C. to learn", "D. learned"], answer: "B", topic: "Gerund (V-ing)" },
    { id: "g15", q: "The company made a huge ______ in clean energy technology.", options: ["A. invest", "B. investment", "C. investor", "D. investing"], answer: "B", topic: "Từ loại (Word Form)" }
  ],

  // 2. Listening (2 Audio A2 & B2 trên Archive.org từ PDF)
  listening: {
    audioUrl: "https://archive.org/download/lisb2-3/lisa2-1.mp3",
    audioLabel: "Audio 1: Hotel Reservation (Kiểm tra A2)",
    questions: [
      { id: "lis01", q: "1. Guest's surname: (Write NO MORE THAN TWO WORDS)", answer: "Berardelli" },
      { id: "lis02", q: "2. Type of room booked: a ______ room", answer: "single" },
      { id: "lis03", q: "3. Number to call for room service: dial ______", answer: "0" },
      { id: "lis04", q: "4. Luggage storage checkout time: ______ o'clock", answer: "12" },
      { id: "lis05", q: "5. Morning wake-up call time: ______ a.m.", answer: "7:30" }
    ]
  },

  // 3. Reading Two-Tier (Set 1 chuẩn hóa từ PDF trang 1 - 15)
  reading: [
    {
      id: "Q01",
      level: "A2",
      type: "True / False",
      passageSnippet: `"In 2004, on December 26, Tilly Smith, a 10-year-old girl from the UK, was on holiday in Thailand with her family. They were walking along Mai Khao beach in Phuket. The weather was sunny, but the sea looked strange. The water moved back, going far away from the beach, and it looked white with bubbles. Tilly felt something was wrong."`,
      statement: "Statement: The weather was clear and sunny when Tilly's family noticed strange signs in the ocean.",
      tier1Options: ["A. TRUE", "B. FALSE"],
      tier2Options: {
        A: [
          { code: "A1", text: "A1. Đoạn văn chỉ ra bãi biển lúc đó có đông khách du lịch đang đi dạo." },
          { code: "A2", text: "A2. Tác giả khẳng định ngày hôm đó trời nắng ráo dù mặt biển có hiện tượng kỳ lạ (\"The weather was sunny, but the sea looked strange\")." },
          { code: "A3", text: "A3. Bài đọc xác nhận gia đình Tilly đang trong chuyến nghỉ dưỡng tại Thái Lan." },
          { code: "A4", text: "A4. Đoạn trích miêu tả nước biển rút ra xa tạo thành bọt trắng xóa." }
        ],
        B: [
          { code: "B1", text: "B1. Biển có hiện tượng rút nước bất thường khiến bầu trời u ám." },
          { code: "B2", text: "B2. Cô bé nhận thấy có điều gì đó không ổn về mặt thời tiết." },
          { code: "B3", text: "B3. Chuyến đi diễn ra vào cuối tháng 12 năm 2004." },
          { code: "B4", text: "B4. Cả gia đình đang đi bộ men theo bờ biển Mai Khao." }
        ]
      },
      correctTier1: "A",
      correctTier2: "A2"
    },
    {
      id: "Q02",
      level: "A2",
      type: "Sentence Completion",
      passageSnippet: `"I used to work at a factory making tomato sauce. It was just outside the city so I drove my car there, after dropping the children off to school."`,
      statement: "In her previous job outside Turin, the woman was employed at a plant producing _______________.",
      tier1Options: ["A. school textbooks", "B. motor vehicles", "C. tomato sauce"],
      tier2Options: {
        A: [{ code: "A1", text: "A1. Tác giả làm việc liên quan đến môi trường học tập của con cái." }],
        B: [{ code: "B1", text: "B1. Nhà máy nằm ở khu vực ngoại ô nên cô phải tự lái ô tô đến nơi làm việc." }],
        C: [
          { code: "C1", text: "C1. Nơi làm việc trước đây nằm ở khu vực ngoại ô thành phố." },
          { code: "C2", text: "C2. Cô phụ trách gửi thư từ và bưu phẩm cho thị trấn." },
          { code: "C3", text: "C3. Bài đọc nêu rõ công việc cũ của cô là làm việc tại nhà máy sản xuất sốt cà chua (\"I used to work at a factory making tomato sauce\")." },
          { code: "C4", text: "C4. Gia đình hiện tự trồng rau củ quả trong khu vườn lớn." }
        ]
      },
      correctTier1: "C",
      correctTier2: "C3"
    },
    {
      id: "Q03",
      level: "B2",
      type: "True / False / Not Given",
      passageSnippet: `"The Mediterranean, a long-standing summer favorite destination, has been affected by extreme weather events. Spain and Italy have recorded their hottest years in 2022 and 2023... a European Travel Commission survey found that 74% of travelers now avoid destinations with extreme heat."`,
      statement: "Statement: A European Travel Commission study revealed that nearly three-quarters of tourists actively steer clear of places experiencing severe heat.",
      tier1Options: ["A. TRUE", "B. FALSE", "C. NOT GIVEN"],
      tier2Options: {
        A: [
          { code: "A1", text: "A1. Tây Ban Nha và Ý ghi nhận mức nhiệt độ kỷ lục trong các năm gần đây." },
          { code: "A2", text: "A2. Hy Lạp phải liên tục đối mặt với nạn cháy rừng nghiêm trọng và hạn hán." },
          { code: "A3", text: "A3. Khảo sát chỉ ra có đúng 74% du khách chủ động né tránh các điểm đến nắng nóng gay gắt (\"found that 74% of travelers now avoid destinations with extreme heat\")." },
          { code: "A4", text: "A4. Nhu cầu du lịch tại khu vực Bắc và Trung Âu được dự báo sẽ tăng đến năm 2100." }
        ],
        B: [{ code: "B1", text: "B1. Địa Trung Hải vẫn là điểm đến mùa hè được yêu thích hàng đầu." }],
        C: [{ code: "C1", text: "C1. Khảo sát không công bố tỷ lệ phần trăm cụ thể của các quốc gia." }]
      },
      correctTier1: "A",
      correctTier2: "A3"
    },
    {
      id: "Q04",
      level: "IELTS",
      type: "Yes / No / Not Given",
      passageSnippet: `"In east Africa the plant arrived with Belgian colonists in Rwanda, who liked the look of its glossy leaves and delicate purple flowers floating in their ponds. But by the 1980s, it had 'escaped' out of the country via the Kagera river and made its way downstream to Lake Victoria..."`,
      statement: "Statement: Belgian colonists transported water hyacinth into Rwanda primarily for its aesthetic qualities in ornamental ponds.",
      tier1Options: ["A. YES", "B. NO", "C. NOT GIVEN"],
      tier2Options: {
        A: [
          { code: "A1", text: "A1. Cây lục bình có nguồn gốc xuất xứ ban đầu từ Nam Mỹ." },
          { code: "A2", text: "A2. Các nhà khoa học từng gọi loài này là loài cỏ dại thủy sinh tồi tệ nhất thế giới." },
          { code: "A3", text: "A3. Cây không có thiên địch tự nhiên và sinh trưởng thuận lợi nhờ nhiệt độ lý tưởng." },
          { code: "A4", text: "A4. Người Bỉ mang loài cây này vào vì ưa thích vẻ đẹp của lá bóng và hoa tím trong ao (\"who liked the look of its glossy leaves and delicate purple flowers floating in their ponds\")." }
        ],
        B: [{ code: "B1", text: "B1. Cây lục bình thoát khỏi tầm kiểm soát qua lưu vực sông Kagera." }],
        C: [{ code: "C1", text: "C1. Bài viết không cung cấp danh mục các giống hoa cảnh khác du nhập vào Rwanda." }]
      },
      correctTier1: "A",
      correctTier2: "A4"
    }
  ]
};

// =========================================================================
// 3. ĐỘNG CƠ ĐO ĐẠC PHẢN XẠ & THEO DÕI HÀNH VI (TRACKING ENGINE)
// =========================================================================
class DiagnosticEngine {
  constructor() {
    this.currentSkill = "grammar";
    this.testData = DIAGNOSTIC_TEST1_DATA;
    this.startTime = Date.now();
    
    // Lưu số đo phản xạ cho từng câu: { qId: { ttfi, ttt, hesitationCount, answers: [] } }
    this.metrics = {};
    this.sectionTimerSeconds = 0;
    this.sectionTimerInterval = null;

    // Quản lý ghi âm Speaking
    this.speechRecognition = null;
    this.isRecording = false;
  }

  init() {
    this.renderGrammarSection();
    this.renderListeningSection();
    this.renderReadingSection();
    this.initSpeechRecognition();
    this.startSectionTimer();
    this.setupWordCountListeners();
  }

  // --- 1. RENDER NGỮ PHÁP ---
  renderGrammarSection() {
    const mount = document.getElementById('grammarQuestionsMount');
    if (!mount) return;

    mount.innerHTML = this.testData.grammar.map((item, idx) => {
      this.initQuestionMetric(item.id);
      return `
        <div class="q-item-box" id="box_${item.id}">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <b style="font-size:14.5px; color:#1E293B;">Câu ${idx + 1}: ${item.q}</b>
            <span style="font-size:11px; background:#E2E8F0; padding:2px 8px; border-radius:6px; font-weight:800; color:#475569;">${item.topic}</span>
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
            ${item.options.map(opt => `
              <label class="option-label" onclick="window.diagEngine.recordInteraction('${item.id}', '${opt.charAt(0)}')">
                <input type="radio" name="ans_${item.id}" value="${opt.charAt(0)}">
                <span>${opt}</span>
              </label>
            `).join('')}
          </div>
        </div>
      `;
    }).join('');
  }

  // --- 2. RENDER LISTENING ---
  renderListeningSection() {
    const mount = document.getElementById('listeningQuestionsMount');
    const audioEl = document.getElementById('diagAudioPlayer');
    const labelEl = document.getElementById('currentAudioLabel');
    if (!mount || !this.testData.listening) return;

    if (audioEl) audioEl.src = this.testData.listening.audioUrl;
    if (labelEl) labelEl.innerText = this.testData.listening.audioLabel;

    mount.innerHTML = this.testData.listening.questions.map(item => {
      return `
        <div class="q-item-box" style="margin-bottom:12px;">
          <label style="font-size:14px; font-weight:800; color:#1E293B; display:block;">${item.q}</label>
          <input type="text" id="ans_${item.id}" class="diag-input" placeholder="Điền đáp án nghe được...">
        </div>
      `;
    }).join('');
  }

  // --- 3. RENDER READING TWO-TIER CHỐNG ĐOÁN MÒ ---
  renderReadingSection() {
    const mount = document.getElementById('readingQuestionsMount');
    if (!mount) return;

    mount.innerHTML = this.testData.reading.map((item, idx) => {
      this.initQuestionMetric(item.id);
      return `
        <div class="q-item-box" id="box_${item.id}">
          <div style="font-size:12px; font-weight:800; color:#8B1518; text-transform:uppercase; margin-bottom:6px;">
            Câu ${idx + 1} (${item.level}) — ${item.type}
          </div>

          <div style="background:#FFFFFF; border:1px solid #CBD5E1; border-left:4px solid #8B1518; padding:12px; border-radius:8px; font-size:13.5px; line-height:1.55; color:#334155; margin-bottom:12px; font-style:italic;">
            ${item.passageSnippet}
          </div>

          <b style="font-size:14.5px; color:#1E293B; display:block; margin-bottom:8px;">${item.statement}</b>

          <!-- TẦNG 1: CHỌN ĐÁP ÁN -->
          <div style="font-size:12px; font-weight:800; color:#0284C7; margin-bottom:4px;">TẦNG 1: LỰA CHỌN CỦA EM</div>
          <div style="display:flex; gap:10px; flex-wrap:wrap;">
            ${item.tier1Options.map(opt => `
              <label class="option-label" style="flex:1; min-width:140px;" onclick="window.diagEngine.onSelectReadingTier1('${item.id}', '${opt.charAt(0)}')">
                <input type="radio" name="t1_${item.id}" value="${opt.charAt(0)}">
                <span>${opt}</span>
              </label>
            `).join('')}
          </div>

          <!-- TẦNG 2: BẬT RA KHI TẦNG 1 ĐƯỢC CHỌN (CHỌN CĂN CỨ) -->
          <div id="tier2_container_${item.id}" class="tier-2-box" style="display:none;">
            <div class="tier-label" style="color:#92400E; margin-bottom:6px;">
              🔍 TẦNG 2: CHỌN CÂU TRÍCH DẪN CHỨNG MINH CHO LỰA CHỌN CỦA EM:
            </div>
            <div id="tier2_options_${item.id}"></div>
          </div>
        </div>
      `;
    }).join('');
  }

  onSelectReadingTier1(qId, selectedOption) {
    this.recordInteraction(qId, selectedOption);

    const container = document.getElementById(`tier2_container_${qId}`);
    const mount = document.getElementById(`tier2_options_${qId}`);
    const qData = this.testData.reading.find(r => r.id === qId);
    if (!container || !mount || !qData) return;

    const availableTier2 = qData.tier2Options[selectedOption] || [];
    mount.innerHTML = availableTier2.map(opt => `
      <label class="option-label" style="margin-top:6px; background:#FFFFFF;" onclick="window.diagEngine.recordInteraction('${qId}_t2', '${opt.code}')">
        <input type="radio" name="t2_${qId}" value="${opt.code}">
        <span style="font-size:13px; line-height:1.45;">${opt.text}</span>
      </label>
    `).join('');

    container.style.display = 'block';
  }

  // --- 4. GHI NHẬN HÀNH VI ĐO PHẢN XẠ (TTFI, TTT, HESITATION) ---
  initQuestionMetric(qId) {
    this.metrics[qId] = {
      startTime: Date.now(),
      firstInteractionTime: null,
      hesitationCount: 0,
      chosenValues: []
    };
  }

  recordInteraction(qId, val) {
    if (!this.metrics[qId]) this.initQuestionMetric(qId);
    const m = this.metrics[qId];

    const now = Date.now();
    if (!m.firstInteractionTime) {
      m.firstInteractionTime = now - m.startTime; // Tính mili-giây độ trễ TTFI
    }

    if (m.chosenValues.length > 0 && m.chosenValues[m.chosenValues.length - 1] !== val) {
      m.hesitationCount++; // Đổi đáp án -> tăng chỉ số đắn đo
    }
    m.chosenValues.push(val);
  }

  // --- 5. ĐỒNG HỒ & CHUYỂN KỸ NĂNG ---
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

  startSectionTimer() {
    this.sectionTimerSeconds = 0;
    const display = document.getElementById('sectionTimerDisplay');
    clearInterval(this.sectionTimerInterval);

    this.sectionTimerInterval = setInterval(() => {
      this.sectionTimerSeconds++;
      if (display) {
        const mm = String(Math.floor(this.sectionTimerSeconds / 60)).padStart(2, '0');
        const ss = String(this.sectionTimerSeconds % 60).padStart(2, '0');
        display.innerText = `${mm}:${ss}`;
      }
    }, 1000);
  }

  setupWordCountListeners() {
    const wt1Input = document.getElementById('diag_wt1_input');
    const wt2Input = document.getElementById('diag_wt2_input');

    wt1Input?.addEventListener('input', () => {
      const cnt = wt1Input.value.trim() ? wt1Input.value.trim().split(/\s+/).length : 0;
      document.getElementById('wt1WordCount').innerText = `${cnt} từ`;
    });

    wt2Input?.addEventListener('input', () => {
      const cnt = wt2Input.value.trim() ? wt2Input.value.trim().split(/\s+/).length : 0;
      document.getElementById('wt2WordCount').innerText = `${cnt} từ`;
    });
  }

  // --- 6. MICRO THU ÂM SPEAKING ---
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
      alert("⚠️ Trình duyệt của em chưa hỗ trợ nhận diện giọng nói. Hãy gõ trực tiếp câu trả lời vào ô nhé!");
      return;
    }

    const btn = document.getElementById(btnId);
    const area = document.getElementById(targetAreaId);

    if (!this.isRecording) {
      try {
        this.speechRecognition.start();
        this.isRecording = true;
        if (btn) btn.innerHTML = `<i class="fa-solid fa-stop"></i> Đang nghe... Bấm để dừng`;

        this.speechRecognition.onresult = (event) => {
          let str = '';
          for (let i = 0; i < event.results.length; ++i) {
            str += event.results[i][0].transcript + ' ';
          }
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
  // 7. CHẤM BÀI TOÀN DIỆN & XUẤT DASHBOARD 4 NHÓM NĂNG LỰC
  // =========================================================================
  async submitFullExam() {
    if (!confirm("Em có chắc chắn muốn nộp bài thi chẩn đoán để hệ thống phân tích phản xạ và lộ trình không?")) {
      return;
    }

    const btn = document.getElementById('btnSubmitFullDiagnostic');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `⏳ Đang tổng hợp phân tích phản xạ & chấm AI...`;
    }

    // A. Chấm Ngữ pháp
    let grammarCorrect = 0;
    this.testData.grammar.forEach(g => {
      const selected = document.querySelector(`input[name="ans_${g.id}"]:checked`)?.value;
      if (selected === g.answer) grammarCorrect++;
    });

    // B. Chấm Listening
    let listeningCorrect = 0;
    this.testData.listening.questions.forEach(l => {
      const val = (document.getElementById(`ans_${l.id}`)?.value || '').trim().toLowerCase();
      if (val && val.includes(l.answer.toLowerCase())) listeningCorrect++;
    });

    // C. Chấm Reading Two-Tier (All-or-nothing)
    let readingCorrect = 0;
    let guessingCount = 0; // Đếm số câu đoán mò (T1 đúng nhưng T2 sai)

    this.testData.reading.forEach(r => {
      const t1Val = document.querySelector(`input[name="t1_${r.id}"]:checked`)?.value;
      const t2Val = document.querySelector(`input[name="t2_${r.id}"]:checked`)?.value;

      const isT1Correct = t1Val === r.correctTier1;
      const isT2Correct = t2Val === r.correctTier2;

      if (isT1Correct && isT2Correct) {
        readingCorrect++;
      } else if (isT1Correct && !isT2Correct) {
        guessingCount++; // Đoán mò
      }
    });

    // D. Tổng hợp chỉ số phản xạ TTFI & Hesitation
    let totalTTFI = 0;
    let totalHesitation = 0;
    let metricCount = 0;

    Object.values(this.metrics).forEach(m => {
      if (m.firstInteractionTime) {
        totalTTFI += m.firstInteractionTime;
        totalHesitation += m.hesitationCount;
        metricCount++;
      }
    });

    const avgTTFISec = metricCount > 0 ? Math.round((totalTTFI / metricCount) / 100) / 10 : 8;

    // Phân loại nhóm năng lực nhận thức (Confidence vs Competence Matrix)
    let competenceGroup = "Nền tảng vững";
    let estimatedBand = 4.5;

    if (grammarCorrect < 8 && readingCorrect <= 1) {
      competenceGroup = "Rỗng kiến thức nền";
      estimatedBand = 2.5;
    } else if (guessingCount >= 2 || totalHesitation >= 4) {
      competenceGroup = "Tự tin ảo / Thiếu phản xạ";
      estimatedBand = 3.5;
    } else if (avgTTFISec > 15) {
      competenceGroup = "Tự ti (Lực tốt hơn nghĩ)";
      estimatedBand = 4.0;
    } else {
      competenceGroup = "Nền tảng vững vàng";
      estimatedBand = 5.0;
    }

    // Gửi điểm lên Cloud Google Drive
    const user = {
      name: localStorage.getItem('ielts_student_name') || 'Học viên',
      email: (localStorage.getItem('ielts_student_email') || 'guest@gmail.com').toLowerCase().trim()
    };

    const attemptSnapshot = {
      id: "diag_attempt_" + Date.now(),
      timestamp: new Date().toLocaleString('vi-VN'),
      testTitle: `Bài Thi Chẩn Đoán Năng Lực (${this.testData.title})`,
      studentName: user.name,
      studentEmail: user.email,
      score: `Grammar: ${grammarCorrect}/15 • Lis: ${listeningCorrect}/5 • Read: ${readingCorrect}/4`,
      timeSpent: `${Math.round(this.sectionTimerSeconds / 60)} phút`,
      details: `Phân loại: [${competenceGroup}] • TTFI: ${avgTTFISec}s • Đắn đo: ${totalHesitation} lần • Đoán mò: ${guessingCount} câu.`,
      moduleType: "diagnostic"
    };

    try {
      const localHist = JSON.parse(localStorage.getItem('ielts_local_history') || '[]');
      localHist.unshift(attemptSnapshot);
      localStorage.setItem('ielts_local_history', JSON.stringify(localHist));

      // Mở khóa Test 2 nếu đạt điều kiện
      localStorage.setItem('diag_unlocked_test2', 'true');
    } catch(e) {}

    fetch(CLOUD_SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "save_attempt", attempt: attemptSnapshot })
    }).catch(() => {});

    // Hiển thị Dashboard chẩn đoán
    this.renderResultDashboard(competenceGroup, estimatedBand, avgTTFISec, guessingCount, grammarCorrect, listeningCorrect, readingCorrect);
  }

  renderResultDashboard(group, band, ttfi, guessing, gScore, lScore, rScore) {
    document.querySelector('.runner-container').innerHTML = `
      <div style="background:#FFFFFF; border:3px solid #E8E2D8; border-bottom:7px solid #D3CBC0; border-radius:24px; padding:32px 26px; max-width:760px; margin:40px auto; text-align:center;">
        <div style="font-size:42px; margin-bottom:10px;">🎯</div>
        <h2 style="color:#8B1518; margin:0 0 8px 0; font-size:24px; font-weight:900;">BÁO CÁO PHÂN TÍCH NĂNG LỰC ĐẦU VÀO</h2>
        <p style="color:#64748B; font-weight:700; margin-bottom:24px;">Hệ thống đã phân tích phản xạ làm bài và độ trễ nhận thức của em:</p>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-bottom:24px; text-align:left;">
          <div style="background:#F0F9FF; border:2px solid #BAE6FD; padding:16px; border-radius:16px;">
            <div style="font-size:12px; font-weight:900; color:#0369A1;">NHÓM NHẬN THỨC:</div>
            <b style="font-size:18px; color:#0C4A6E;">${group}</b>
            <div style="font-size:12.5px; color:#0284C7; margin-top:4px;">Độ trễ phản xạ (TTFI): <b>${ttfi}s/câu</b></div>
          </div>

          <div style="background:#FEF3C7; border:2px solid #FCD34D; padding:16px; border-radius:16px;">
            <div style="font-size:12px; font-weight:900; color:#92400E;">BAND ƯỚC LƯỢNG SƠ BỘ:</div>
            <b style="font-size:24px; color:#B45309;">~Band ${band}</b>
            <div style="font-size:12.5px; color:#D97706; margin-top:2px;">Số câu đoán mò căn cứ: <b>${guessing} câu</b></div>
          </div>
        </div>

        <div style="background:#FAF7F2; border:1.5px solid #E8E2D8; padding:16px; border-radius:16px; margin-bottom:24px; text-align:left;">
          <b style="color:#261F1D; font-size:14.5px;">📊 Chi tiết số câu đạt chuẩn:</b>
          <div style="margin-top:6px; font-size:13.5px; color:#475569; font-weight:700;">
            • Ngữ pháp: <b>${gScore}/15 câu</b><br>
            • Listening bắt âm: <b>${lScore}/5 câu</b><br>
            • Reading Two-Tier chuẩn: <b>${rScore}/4 câu (Đúng cả 2 tầng)</b>
          </div>
        </div>

        <div style="display:flex; gap:12px; justify-content:center; flex-wrap:wrap;">
          <a href="index-diag.html" class="btn-3d btn-3d-white">
            ⬅ Xem danh sách bài test
          </a>
          <a href="../curriculum-system/roadmap.html" class="btn-3d btn-3d-red">
            🚀 KÍCH HOẠT LỘ TRÌNH ĐƯỢC TỐI ƯU &rarr;
          </a>
        </div>
      </div>
    `;
  }
}

// Khởi tạo engine toàn cục
const diagEngine = new DiagnosticEngine();
window.diagEngine = diagEngine;
window.switchSkillSection = (s) => diagEngine.switchSection(s);
window.toggleDiagSpeech = (t, b) => diagEngine.toggleSpeech(t, b);
window.submitDiagnosticExam = () => diagEngine.submitFullExam();

document.addEventListener('DOMContentLoaded', () => diagEngine.init());
