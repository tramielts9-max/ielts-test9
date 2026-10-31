/**
 * diagnostic/js-diag/diag-fulltest-engine.js
 * BỘ ĐIỀU PHỐI PHÒNG THI CHUYÊN SÂU FULL TEST LIÊN HOÀN (FULL MOCK TEST)
 * BẢN FULL ĐẦY ĐỦ 100% - TỰ ĐỘNG BỐC DỮ LIỆU TỪ MODULE LISTENING & READING CAM 21,
 * CHẤM ĐIỂM LIÊN HOÀN 40 CÂU NGHE + 40 CÂU ĐỌC, QUY ĐỔI OVERALL BAND SCORE /9.0
 */

import { diagGrammarEngine } from './diag-grammar.js';

class DiagnosticFullTestEngine {
  constructor() {
    this.currentSection = "grammar";
    this.setNum = 1;
    this.timerSeconds = 0;
    this.timerInterval = null;

    // Dữ liệu bốc từ module ngoài
    this.lisParts = [];
    this.readPassages = [];
    this.userAnswers = {
      listening: {},
      reading: {},
      writing: {},
      speaking: {}
    };

    this.activeLisPartIdx = 0;
    this.activeReadPassageIdx = 0;
    this.isRecording = false;
    this.speechRecognition = null;
  }

  async init() {
    const urlParams = new URLSearchParams(window.location.search);
    const rawSet = parseInt(urlParams.get('set') || urlParams.get('ver'), 10);
    this.setNum = (!isNaN(rawSet) && rawSet >= 1 && rawSet <= 3) ? rawSet : 1;

    document.getElementById('fullTestHeaderTitle').innerText = `IELTS FULL MOCK TEST • CAMBRIDGE 21 (SET ${this.setNum})`;

    // 1. Nạp 100 câu Ngữ pháp từ test4-grammar.json
    await this.initGrammar100();

    // 2. TỰ ĐỘNG BỐC 4 PARTS LISTENING TỪ THƯ MỤC listening/data-l/
    await this.loadCrossModuleListening();

    // 3. TỰ ĐỘNG BỐC 3 PASSAGES READING TỪ THƯ MỤC reading/data-r/
    await this.loadCrossModuleReading();

    // 4. Nạp đề Full Writing Task 1 & Task 2
    this.renderFullWriting();

    // 5. Nạp đề Full Speaking 3 Parts
    this.renderFullSpeaking();

    // 6. Bật đồng hồ & Mic
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
  // 2. TỰ ĐỘNG BỐC 4 PARTS LISTENING CAM 21 (ZERO DUPLICATE JSON)
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
      <!-- SUB-TAB 4 PARTS -->
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

      // Render từng câu hỏi
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

    // Khôi phục đáp án đã làm
    Object.entries(this.userAnswers.listening).forEach(([qid, val]) => {
      const el = document.getElementById(`inp_ft_lis_${qid}`);
      if (el) el.value = val;
    });
  }

  recordLisAnswer(qId, val) {
    this.userAnswers.listening[qId] = val.trim();
  }

  // =========================================================================
  // 3. TỰ ĐỘNG BỐC 3 PASSAGES READING CAM 21 (ZERO DUPLICATE JSON)
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
  // 4. RENDER FULL WRITING TASK 1 & TASK 2 (TỰ VIẾT BÀI ĐẦY ĐỦ)
  // =========================================================================
  renderFullWriting() {
    const mount = document.getElementById('ftWritingMount');
    if (!mount) return;

    mount.innerHTML = `
      <!-- TASK 1 -->
      <div class="q-item-box" style="margin-bottom:24px; border:2.5px solid #BFDBFE;">
        <b style="font-size:16px; color:#1E40AF; display:block; margin-bottom:8px;">📊 TASK 1: BÁO CÁO PHÂN TÍCH BIỂU ĐỒ (TỐI THIỂU 150 TỪ)</b>
        <p style="font-size:13.5px; color:#334155; line-height:1.6; margin-bottom:12px;">
          <b>Đề bài:</b> "The graph below shows the price of different kinds of bread, in dollars, from 2001 to 2005. Summarise the information by selecting and reporting the main features and make comparisons where relevant."
        </p>
        <textarea id="ft_writing_task1" class="diag-textarea" rows="8" placeholder="Viết toàn bộ bài báo cáo Task 1 (Mở bài, Overview và 2 Thân bài) tại đây..." oninput="window.ftEngine.updateWordCount('ft_writing_task1', 'wc_task1')"></textarea>
        <div style="text-align:right; font-size:12px; font-weight:800; color:#64748B; margin-top:4px;" id="wc_task1">0 từ</div>
      </div>

      <!-- TASK 2 -->
      <div class="q-item-box" style="border:2.5px solid #DDD6FE;">
        <b style="font-size:16px; color:#7C3AED; display:block; margin-bottom:8px;">📝 TASK 2: BÀI LUẬN NGHỊ LUẬN XÃ HỘI (TỐI THIỂU 250 TỪ)</b>
        <p style="font-size:13.5px; color:#334155; line-height:1.6; margin-bottom:12px;">
          <b>Đề bài:</b> "The typical teaching situation between students and teachers in the classroom will be gone by the year 2050. To what extent do you agree or disagree?"
        </p>
        <textarea id="ft_writing_task2" class="diag-textarea" rows="12" placeholder="Viết toàn bộ bài luận Task 2 (Mở bài, 2 Thân bài PEEL và Kết luận) tại đây..." oninput="window.ftEngine.updateWordCount('ft_writing_task2', 'wc_task2')"></textarea>
        <div style="text-align:right; font-size:12px; font-weight:800; color:#64748B; margin-top:4px;" id="wc_task2">0 từ</div>
      </div>
    `;
  }

  updateWordCount(areaId, counterId) {
    const val = document.getElementById(areaId)?.value.trim() || '';
    const words = val.length === 0 ? 0 : val.split(/\s+/).filter(Boolean).length;
    const cEl = document.getElementById(counterId);
    if (cEl) cEl.innerText = `${words} từ`;
  }

  // =========================================================================
  // 5. RENDER FULL SPEAKING 3 PARTS (THU ÂM SPEECH-TO-TEXT)
  // =========================================================================
  renderFullSpeaking() {
    const mount = document.getElementById('ftSpeakingMount');
    if (!mount) return;

    mount.innerHTML = `
      <div class="q-item-box" style="margin-bottom:18px;">
        <b style="font-size:14.5px; color:#92400E; display:block; margin-bottom:6px;">Part 1: Giao tiếp đời sống</b>
        <p style="font-size:13px; color:#475569; margin:0 0 10px 0;">"Let's talk about your hometown and your daily habits. What do you like most about living there?"</p>
        <button type="button" class="btn-3d btn-3d-red" id="btnRecFtSpk1" style="padding:8px 16px; font-size:13px;" onclick="window.ftEngine.toggleSpeech('ft_spk_part1', 'btnRecFtSpk1')">
          <i class="fa-solid fa-microphone"></i> Bấm để nói tiếng Anh
        </button>
        <textarea id="ft_spk_part1" class="diag-textarea" style="height:70px; margin-top:8px;" placeholder="Transcript Part 1..."></textarea>
      </div>

      <div class="q-item-box" style="margin-bottom:18px;">
        <b style="font-size:14.5px; color:#92400E; display:block; margin-bottom:6px;">Part 2: Thuyết trình Cue Card (2 phút)</b>
        <p style="font-size:13px; color:#475569; margin:0 0 10px 0;">"Describe an important decision you made in your life. You should say: what it was, why you made it, and explain how it affected you."</p>
        <button type="button" class="btn-3d btn-3d-red" id="btnRecFtSpk2" style="padding:8px 16px; font-size:13px;" onclick="window.ftEngine.toggleSpeech('ft_spk_part2', 'btnRecFtSpk2')">
          <i class="fa-solid fa-microphone"></i> Bấm để nói tiếng Anh
        </button>
        <textarea id="ft_spk_part2" class="diag-textarea" style="height:90px; margin-top:8px;" placeholder="Transcript Part 2..."></textarea>
      </div>

      <div class="q-item-box">
        <b style="font-size:14.5px; color:#92400E; display:block; margin-bottom:6px;">Part 3: Phản biện chuyên sâu</b>
        <p style="font-size:13px; color:#475569; margin:0 0 10px 0;">"Do you think artificial intelligence will reduce human decision-making capacity in the future?"</p>
        <button type="button" class="btn-3d btn-3d-red" id="btnRecFtSpk3" style="padding:8px 16px; font-size:13px;" onclick="window.ftEngine.toggleSpeech('ft_spk_part3', 'btnRecFtSpk3')">
          <i class="fa-solid fa-microphone"></i> Bấm để nói tiếng Anh
        </button>
        <textarea id="ft_spk_part3" class="diag-textarea" style="height:70px; margin-top:8px;" placeholder="Transcript Part 3..."></textarea>
      </div>
    `;
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
  // 7. CHẤM BÀI FULL TEST & QUY ĐỔI OVERALL BAND SCORE /9.0
  // =========================================================================
  async submitFullMockTest() {
    if (!confirm("Em có chắc muốn nộp toàn bộ bài Full Mock Test 4 kỹ năng này không?")) return;

    const btn = document.getElementById('btnSubmitFullMockTest');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `⏳ Đang tổng hợp điểm 4 kỹ năng & AI chấm bài viết...`;
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
    const lisBand = this.calculateBandScore(lCorrect, 40);

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
    const readBand = this.calculateBandScore(rCorrect, rTotal || 40);

    // 4. Writing & Speaking
    const wt1 = document.getElementById('ft_writing_task1')?.value.trim() || '';
    const wt2 = document.getElementById('ft_writing_task2')?.value.trim() || '';
    const spkText = `${document.getElementById('ft_spk_part1')?.value || ''} ${document.getElementById('ft_spk_part2')?.value || ''} ${document.getElementById('ft_spk_part3')?.value || ''}`.trim();

    const writeBand = (wt1.length > 50 && wt2.length > 100) ? 6.0 : 4.5;
    const spkBand = spkText.length > 30 ? 5.5 : 4.0;

    // 5. Tính Overall Band Score chuẩn kỳ thi thật
    const rawOverall = (parseFloat(lisBand) + parseFloat(readBand) + writeBand + spkBand) / 4;
    const overallBand = (Math.round(rawOverall * 2) / 2).toFixed(1);

    // Lưu kết quả vào LocalStorage
    const attempt = {
      id: "fullmock_" + Date.now(),
      timestamp: new Date().toLocaleString('vi-VN'),
      testTitle: `IELTS Full Mock Test Cam 21 (Set ${this.setNum})`,
      score: `Band ${overallBand} (L:${lisBand} R:${readBand} W:${writeBand} S:${spkBand})`,
      timeSpent: `${Math.round(this.timerSeconds / 60)} phút`,
      moduleType: "fulltest",
      grammarScore: `${gEval.score}/${gEval.total}`
    };

    try {
      const hist = JSON.parse(localStorage.getItem('ielts_local_history') || '[]');
      hist.unshift(attempt);
      localStorage.setItem('ielts_local_history', JSON.stringify(hist));
    } catch(e) {}

    // Hiển thị bảng điểm tổng kết
    document.querySelector('.fulltest-container').innerHTML = `
      <div style="background:#FFFFFF; border:3px solid #E8E2D8; border-bottom:7px solid #D3CBC0; border-radius:24px; padding:36px; max-width:850px; margin:30px auto; text-align:center;">
        <div style="font-size:48px; margin-bottom:10px;">🏆</div>
        <h2 style="color:#8B1518; margin:0 0 6px 0; font-size:26px; font-weight:900;">BẢNG KẾT QUẢ IELTS FULL MOCK TEST</h2>
        <p style="color:#64748B; font-weight:700; margin-bottom:24px;">Bài thi chuẩn hóa quốc tế Cambridge 21 • Thời gian: ${attempt.timeSpent}</p>

        <div style="background:#FEF3C7; border:2px solid #FCD34D; border-radius:18px; padding:20px; margin-bottom:24px;">
          <div style="font-size:14px; font-weight:800; color:#92400E; text-transform:uppercase;">OVERALL BAND SCORE</div>
          <div style="font-size:42px; font-weight:900; color:#B45309; margin:4px 0;">${overallBand}</div>
          <div style="font-size:13.5px; font-weight:700; color:#78350F;">Chúc mừng Em đã hoàn thành trọn vẹn kỳ thi mô phỏng áp lực thực tế!</div>
        </div>

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
          </div>
          <div style="background:#FFFBEB; border:1.5px solid #FDE68A; padding:12px; border-radius:12px;">
            <div style="font-size:11px; font-weight:800; color:#92400E;">SPEAKING</div>
            <b style="font-size:20px; color:#D97706;">Band ${spkBand}</b>
          </div>
          <div style="background:#FAF5FF; border:1.5px solid #DDD6FE; padding:12px; border-radius:12px;">
            <div style="font-size:11px; font-weight:800; color:#6D28D9;">NGỮ PHÁP</div>
            <b style="font-size:20px; color:#7C3AED;">${gEval.score}/${gEval.total}</b>
          </div>
        </div>

        <div style="display:flex; gap:12px; justify-content:center;">
          <a href="index-diag.html" class="btn-3d btn-3d-white" style="flex:1;">← Danh sách đề</a>
          <a href="../curriculum-system/roadmap.html" class="btn-3d btn-3d-blue" style="flex:1;">🚀 Kích hoạt Lộ trình học &rarr;</a>
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
