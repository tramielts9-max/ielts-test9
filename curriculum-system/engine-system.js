/**
 * curriculum-system/engine-system.js
 * BỘ MÁY ĐIỀU PHỐI TÍNH XUÔI THEO SỐ BUỔI HỌC (300K/BUỔI - 12 BUỔI/NỬA BAND + LŨY TIẾN)
 * GIAI ĐOẠN 2 HOÀN CHỈNH: THUẬT TOÁN BĂM 5 KHỐI CHẶNG TUẦN TỰ & QUÉT SẠCH 100% KHO TỪ VỰNG
 */

export class CurriculumEngineSystem {
  constructor() {
    this.allNodes = [];
  }

  setNodes(nodes) {
    this.allNodes = nodes.map(n => ({
      ...n,
      benefit: n.benefit || this.generateBenefit(n)
    }));
  }

  generateBenefit(node) {
    const d = (node.domain || '').toUpperCase();
    const t = (node.title || '').toLowerCase();

    if (d === 'GRAMMAR') {
      if (t.includes('lý thuyết')) return "Nắm vững bản chất công thức, tránh dịch 'word-by-word' từ tiếng Việt.";
      return "Triệt tiêu lỗi sai thì, sai cấu trúc câu đơn/phức khi viết và nói.";
    }
    if (d === 'VOCABULARY') return "Nạp từ vựng học thuật theo ngữ cảnh mạch tư duy (Collocations & Topic Words).";
    if (d === 'PRE_LISTENING') return "Luyện tai bắt âm nối, nuốt âm (-s, -ed), số liệu và tên riêng chuẩn xác.";
    if (d === 'PRE_READING') return "Rèn kỹ thuật Skimming & Scanning định vị từ khóa không cần tra từ điển.";
    if (d === 'PRE_SPEAKING') return "Shadowing nhại giọng bản ngữ, chuẩn hóa ngữ điệu và phản xạ kéo dài câu trả lời.";
    if (d.includes('PRE_WRITING')) return "Chuyển ngữ kịch bản Việt ➔ Anh 3 mốc Band, rèn tư duy dàn ý PEEL.";
    if (d === 'READING') {
      if (t.includes('có mớm')) return "Luyện chiến thuật làm chủ dạng bài (Gap Fill, TFNG) có mớm dẫn dắt.";
      return "Tự lực định vị từ khóa dưới áp lực bấm giờ 15-20p/Passage chuẩn phòng thi.";
    }
    if (d === 'LISTENING') return "Rèn độ nhạy bắt từ khóa chuyển ý (Signposting) và bẫy đổi ý (actually, but).";
    if (d === 'WRITING_T1') return "Tự viết bài mô tả biểu đồ 150 từ hoàn chỉnh trong đúng 20 phút (Overview & Grouping).";
    if (d === 'WRITING_T2') return "Viết bài luận học thuật 250 từ chuẩn 4 đoạn PEEL, nâng cấp từ vựng C1 chuẩn xác.";
    if (d === 'SPEAKING') return "Phản xạ trả lời trôi chảy theo cấu trúc AREA, không bị khựng quá 3 giây.";
    if (d === 'MOCK_TEST') return "Rèn luyện thể lực và tâm lý phòng thi dưới áp lực làm bài liên tục 3 tiếng.";
    return "Củng cố phản xạ và độ chính xác ngôn ngữ học thuật.";
  }

  // TÍNH CHUẨN SỐ BUỔI HỌC THEO CÔNG THỨC LŨY TIẾN (5.5 -> 7.0 = 42 BUỔI / 91 NGÀY BTVN)
  calculateSessionsByBands(startBand, targetBand) {
    const s = Math.round((parseFloat(startBand) || 0.0) * 2) / 2;
    const t = Math.round((Math.min(7.0, parseFloat(targetBand) || 7.0)) * 2) / 2;

    if (s >= t) return { sessions: 12, months: 1.0, days: 26, hours: 39, weeks: 4 };

    const stepCosts = {
      '0.0-0.5': 12, '0.5-1.0': 12, '1.0-1.5': 12, '1.5-2.0': 12,
      '2.0-2.5': 12, '2.5-3.0': 12, '3.0-3.5': 12, '3.5-4.0': 12,
      '4.0-4.5': 12, '4.5-5.0': 12,
      '5.0-5.5': 12, // Chuẩn 12 buổi
      '5.5-6.0': 13, // +1 buổi = 13
      '6.0-6.5': 14, // +1 buổi = 14
      '6.5-7.0': 15  // +1 buổi = 15
    };

    let totalSessions = 0;
    let curr = s;

    while (curr < t) {
      const next = Math.round((curr + 0.5) * 2) / 2;
      const key = `${curr.toFixed(1)}-${next.toFixed(1)}`;
      totalSessions += (stepCosts[key] || 12);
      curr = next;
    }

    const months = Math.round((totalSessions / 12) * 10) / 10;
    const days = Math.round(months * 26);
    const hours = Math.round(days * 1.5 * 10) / 10;
    const weeks = Math.round(months * 4);

    return {
      sessions: totalSessions,
      months,
      days,
      hours,
      weeks
    };
  }

  /**
   * LỌC KHO BÀI TẬP: BẢO TỒN 100% TỪ VỰNG KHI CÓ YÊU CẦU & GIẢI CỨU ĐỐT NỀN TẢNG
   */
  pruneCurriculumByBands(startBand = 0.0, targetBand = 7.0, aiOptions = {}) {
    const sBand = parseFloat(startBand) || 0.0;
    const tBand = Math.min(7.0, parseFloat(targetBand) || 7.0);

    const weakTags = aiOptions.retained_weak_tags || aiOptions.weak_tags || [];
    const prunedTags = aiOptions.pruned_tags || aiOptions.mastered_tags || [];
    const excludedDomains = (aiOptions.pruned_domains || aiOptions.excluded_domains || []).map(d => d.toUpperCase());
    const focusDomains = (aiOptions.focus_domains || []).map(d => d.toUpperCase());
    const isFullVocab = (aiOptions.vocab_requirement === 'FULL_100_PERCENT');

    return this.allNodes.filter((node, idx) => {
      const d = (node.domain || '').toUpperCase();
      const nodeTags = node.tags || [];
      const stg = node.stage || 'S1';
      const titleLower = (node.title || '').toLowerCase();

      // 1. NẾU YÊU CẦU HỌC 100% TỪ VỰNG -> BẢO TỒN TOÀN BỘ 28 UNIT TỪ VỰNG KHÔNG CẮT BẤT KỲ BÀI NÀO
      if (isFullVocab && d === 'VOCABULARY') {
        return true;
      }

      // 2. GIẢI CỨU BÀI NỀN TẢNG YẾU (VÍ DỤ: G_IRREG_V2, G_PASSIVE_VOICE, PRE_SPK_A1)
      if (weakTags.length > 0 && nodeTags.some(tag => weakTags.includes(tag))) {
        return true;
      }

      // 3. CẮT BỎ CÁC DOMAIN BỊ LOẠI TRỪ (VÍ DỤ: PRE_READING)
      if (excludedDomains.some(ex => d === ex || d.startsWith(ex) || ex.includes(d))) {
        return false;
      }

      // 4. CẮT BỎ CÁC TAGS RÂU RIA AI ĐÃ ĐÁNH GIÁ VỮNG
      if (prunedTags.length > 0 && nodeTags.length > 0 && nodeTags.every(t => prunedTags.includes(t))) {
        return false;
      }

      // 5. BẢO VỆ CÁC DOMAIN TRỌNG TÂM ĐỂ DÀNH NGUYÊN LIỆU CHO 5 CHẶNG
      if (focusDomains.some(fc => d === fc || d.includes(fc))) {
        if (tBand <= 5.5 && stg === 'S4') return false;
        return true;
      }

      // 6. CẮT ĐẦU THEO BAND XUẤT PHÁT (HEAD-CUT)
      if (sBand >= 3.5 && stg === 'S1') return false;
      if (sBand >= 4.5 && stg === 'S1') return false;
      if (sBand >= 5.0 && stg === 'S2' && !d.includes('PRE_WRITING')) return false;
      if (sBand >= 5.5 && stg === 'S2') return false;
      if (sBand >= 6.0 && stg === 'S3' && (titleLower.includes('có mớm') || d.includes('PRE_'))) return false;
      if (sBand >= 6.5 && stg === 'S3') return false;

      // 7. CẮT ĐUÔI THEO BAND MỤC TIÊU (TAIL-CUT)
      if (tBand <= 5.0 && (stg === 'S3' || stg === 'S4')) return false;
      if (tBand <= 5.5 && stg === 'S4') return false;
      if (tBand <= 6.0 && stg === 'S4') return false;
      if (tBand <= 6.5 && stg === 'S4' && idx % 3 === 0) return false;

      return true;
    });
  }

  calculateTotals(retainedNodes, speedProfile = 'normal', dailyHours = 1.5, startBand = 0.0, targetBand = 7.0) {
    const stats = this.calculateSessionsByBands(startBand, targetBand);

    return {
      totalSelfStudyHours: stats.hours,
      totalDays: stats.days,
      estimatedMonths: stats.months,
      totalWeeks: stats.weeks,
      totalLiveSessions: stats.sessions,
      totalTeacherHours: stats.sessions * 2,
      tuitionVND: (stats.sessions * 300000).toLocaleString('vi-VN') + 'đ',
      nodeCount: retainedNodes.length
    };
  }

  // =========================================================================
  // BỘ ĐIỀU PHỐI CHÍNH: TỰ ĐỘNG CHUYỂN GIỮA "CHẶNG TUẦN TỰ" VÀ "DÀN TRẢI"
  // =========================================================================
  generateDailyCalendar(retainedNodes, speedProfile = 'normal', dailyHours = 1.5, startBand = 0.0, targetBand = 7.0, aiOptions = {}) {
    const stats = this.calculateSessionsByBands(startBand, targetBand);
    const targetDays = stats.days; // 91 ngày chuẩn cho mốc 5.5 -> 7.0
    const dailyTargetMinutes = Math.round(dailyHours * 60); // 90 phút/ngày

    // NẾU CÓ LỆNH THỨ TỰ BẮT BUỘC TỪ AI -> KÍCH HOẠT THUẬT TOÁN 5 CHẶNG TUẦN TỰ
    if (aiOptions.schedule_mode === 'SEQUENTIAL_PHASES') {
      return this.generateSequentialPhasesCalendar(retainedNodes, targetDays, dailyTargetMinutes, speedProfile, stats, aiOptions);
    }

    // NẾU KHÔNG CÓ YÊU CẦU THỨ TỰ -> CHẠY THUẬT TOÁN XOAY VÒNG TIÊU CHUẨN
    return this.generateStandardSpiralCalendar(retainedNodes, targetDays, dailyTargetMinutes, speedProfile, stats, aiOptions);
  }

  // =========================================================================
  // THUẬT TOÁN 1: BĂM 5 KHỐI CHẶNG TUẦN TỰ (ĐÚNG THEO LỆNH CỦA BẠN 100%)
  // =========================================================================
  generateSequentialPhasesCalendar(retainedNodes, targetDays, dailyTargetMinutes, speedProfile, stats, aiOptions) {
    const calendarDays = [];

    // 1. Phân loại toàn bộ kho bài vào các ngăn tủ chuyên biệt
    const qGrammar = [];
    const qVocab = [];
    const qReading = [];
    const qListening = [];
    const qWriting = [];
    const qSpeaking = [];

    // Sắp xếp bài từ vựng đúng thứ tự Unit 1 -> 10 (300 từ) rồi đến Unit 1 -> 18 (540 từ)
    const rawVocab = retainedNodes.filter(n => (n.domain || '').toUpperCase() === 'VOCABULARY');
    rawVocab.sort((a, b) => {
      const getNum = id => parseInt(id.replace(/[^0-9]/g, ''), 10) || 0;
      return getNum(a.id) - getNum(b.id);
    });
    rawVocab.forEach(n => qVocab.push({ ...n, benefit: n.benefit || this.generateBenefit(n) }));

    retainedNodes.forEach(node => {
      const d = (node.domain || '').toUpperCase();
      const nWithBenefit = { ...node, benefit: node.benefit || this.generateBenefit(node) };

      if (d === 'GRAMMAR') qGrammar.push(nWithBenefit);
      else if (d === 'READING' || d === 'PRE_READING') qReading.push(nWithBenefit);
      else if (d === 'LISTENING' || d === 'PRE_LISTENING') qListening.push(nWithBenefit);
      else if (d.includes('WRITING')) qWriting.push(nWithBenefit);
      else if (d.includes('SPEAKING')) qSpeaking.push(nWithBenefit);
    });

    // 2. Tính toán phân bổ số ngày cho từng Chặng (Tổng cộng chuẩn 91 ngày)
    // Chặng 1 (Ngữ pháp): khoảng 8 ngày
    const daysPhase1 = Math.min(10, Math.max(6, Math.ceil(qGrammar.length / 2)));
    // Chặng 2 (Reading + 100% Từ vựng): 28 ngày (đủ đúng 28 Unit từ vựng)
    const daysPhase2 = qVocab.length > 0 ? qVocab.length : 28;
    // Chặng 3 (Listening): 16 ngày
    const daysPhase3 = 16;
    // Chặng 4 (Writing): 19 ngày
    const daysPhase4 = 19;
    // Chặng 5 (Speaking bứt phá về đích): Số ngày còn lại (91 - 8 - 28 - 16 - 19 = 20 ngày)
    const daysPhase5 = targetDays - (daysPhase1 + daysPhase2 + daysPhase3 + daysPhase4);

    const pickFromQueue = (queue, maxMins = 50) => {
      if (!queue || queue.length === 0) return null;
      const task = queue.shift();
      const dur = task.duration?.[speedProfile] || task.duration?.normal || 25;
      return { ...task, assignedDurationMinutes: dur };
    };

    let currentDayNum = 1;

    // -----------------------------------------------------------------------
    // CHẶNG 1: NỀN TẢNG NGỮ PHÁP (NGÀY 1 -> daysPhase1) - TUYỆT ĐỐI KHÔNG CÓ NÓI/VIẾT
    // -----------------------------------------------------------------------
    for (let i = 0; i < daysPhase1 && currentDayNum <= targetDays; i++) {
      const dayTasks = [];
      let mins = 0;

      while (mins < dailyTargetMinutes && qGrammar.length > 0) {
        const task = pickFromQueue(qGrammar, 40);
        if (task) {
          dayTasks.push(task);
          mins += task.assignedDurationMinutes;
        }
      }

      if (dayTasks.length === 0) {
        dayTasks.push({
          id: `S2_GRAM_REV_${currentDayNum}`,
          stage: "S2", domain: "GRAMMAR", type: "PRACTICE",
          title: `Tổng ôn & Triệt tiêu lỗi câu phức / Thì quá khứ #${i + 1}`,
          benefit: "Luyện phản xạ chuyển đổi câu chủ động sang bị động và sử dụng mệnh đề quan hệ.",
          assignedDurationMinutes: 60,
          url: "grammar/index-g.html"
        });
        mins = 60;
      }

      calendarDays.push({
        dayNumber: currentDayNum,
        totalMinutes: mins,
        phaseId: "PHASE_1_GRAMMAR",
        phaseName: "Chặng 1: Nền Tảng Ngữ Pháp Trọng Tâm",
        phaseDesc: "Tập trung triệt tiêu toàn bộ lỗi chia thì, động từ bất quy tắc và câu phức trước khi làm đề.",
        nodes: dayTasks
      });
      currentDayNum++;
    }

    // -----------------------------------------------------------------------
    // CHẶNG 2: READING & 100% KHO TỪ VỰNG (MỖI NGÀY 1 UNIT TỪ VỰNG + 1 BÀI READING)
    // -----------------------------------------------------------------------
    for (let i = 0; i < daysPhase2 && currentDayNum <= targetDays; i++) {
      const dayTasks = [];
      let mins = 0;

      // 1. Đúng 1 Unit từ vựng tuần tự từ Unit 1 đến Unit 28
      const vTask = pickFromQueue(qVocab, 30);
      if (vTask) {
        dayTasks.push(vTask);
        mins += vTask.assignedDurationMinutes;
      }

      // 2. Chạy song song 1 bài Reading Cambridge
      const rTask = pickFromQueue(qReading, 45);
      if (rTask) {
        dayTasks.push(rTask);
        mins += rTask.assignedDurationMinutes;
      } else {
        dayTasks.push({
          id: `REV_READ_${currentDayNum}`,
          stage: "S4", domain: "READING", type: "TEST",
          title: `Reading Cambridge Thực Chiến: Giải Passage 3 dưới áp lực 20 phút`,
          benefit: "Rèn kỹ thuật xử lý dạng bài khó Summary Completion và True/False/Not Given.",
          assignedDurationMinutes: 45,
          url: "reading/reading.html"
        });
        mins += 45;
      }

      calendarDays.push({
        dayNumber: currentDayNum,
        totalMinutes: mins,
        phaseId: "PHASE_2_READING_VOCAB",
        phaseName: "Chặng 2: Đột Phá Reading & Quét Sạch 100% Từ Vựng (28 Unit)",
        phaseDesc: "Cày sạch toàn bộ 10 Unit bộ 300 từ và 18 Unit bộ 540 từ, kết hợp giải đề Reading chuẩn phòng thi.",
        nodes: dayTasks
      });
      currentDayNum++;
    }

    // -----------------------------------------------------------------------
    // CHẶNG 3: CHIẾN THUẬT LISTENING PHÒNG THI
    // -----------------------------------------------------------------------
    for (let i = 0; i < daysPhase3 && currentDayNum <= targetDays; i++) {
      const dayTasks = [];
      let mins = 0;

      while (mins < dailyTargetMinutes && qListening.length > 0) {
        const lTask = pickFromQueue(qListening, 35);
        if (lTask) {
          dayTasks.push(lTask);
          mins += lTask.assignedDurationMinutes;
        }
      }

      if (dayTasks.length === 0) {
        dayTasks.push({
          id: `REV_LIS_${currentDayNum}`,
          stage: "S4", domain: "LISTENING", type: "TEST",
          title: `Listening Cambridge 1.1x: Bẫy Matching Features & Chuyển ý Part 2/Part 3`,
          benefit: "Luyện phản xạ bắt từ khóa khi người nói đảo chiều và trị tật mất dấu track âm thanh.",
          assignedDurationMinutes: 45,
          url: "listening/listening.html"
        });
        mins = 45;
      }

      calendarDays.push({
        dayNumber: currentDayNum,
        totalMinutes: mins,
        phaseId: "PHASE_3_LISTENING",
        phaseName: "Chặng 3: Chiến Thuật Listening & Trị Bẫy Đảo Chiều",
        phaseDesc: "Rèn kỹ năng bám dấu bài nghe, triệt tiêu lỗi bỏ trống chuỗi câu ở Part 2 và Part 3.",
        nodes: dayTasks
      });
      currentDayNum++;
    }

    // -----------------------------------------------------------------------
    // CHẶNG 4: THỰC CHIẾN WRITING TASK 1 & TASK 2 (CAI NGHIỆN BÀI MẪU)
    // -----------------------------------------------------------------------
    for (let i = 0; i < daysPhase4 && currentDayNum <= targetDays; i++) {
      const dayTasks = [];
      let mins = 0;

      while (mins < dailyTargetMinutes && qWriting.length > 0) {
        const wTask = pickFromQueue(qWriting, 50);
        if (wTask) {
          dayTasks.push(wTask);
          mins += wTask.assignedDurationMinutes;
        }
      }

      if (dayTasks.length === 0) {
        dayTasks.push({
          id: `REV_WRT2_${currentDayNum}`,
          stage: "S4", domain: "WRITING_T2", type: "PRACTICE",
          title: `Writing Task 2 Độc Lập: Viết luận 250 từ chuẩn PEEL (Bấm giờ 40 phút)`,
          benefit: "Tự lên dàn ý và triển khai câu luận điểm độc lập, không tra cứu tài liệu gợi ý.",
          assignedDurationMinutes: 50,
          url: "writing task 2/index-t2.html"
        });
        mins = 50;
      }

      calendarDays.push({
        dayNumber: currentDayNum,
        totalMinutes: mins,
        phaseId: "PHASE_4_WRITING",
        phaseName: "Chặng 4: Thực Chiến Writing Task 1 & Task 2 (Cai Nghiện Bài Mẫu)",
        phaseDesc: "Ép thời gian viết 20 phút Task 1 và 40 phút Task 2, cấm tuyệt đối việc ngâm tài liệu gợi ý.",
        nodes: dayTasks
      });
      currentDayNum++;
    }

    // -----------------------------------------------------------------------
    // CHẶNG 5: VỀ ĐÍCH BÙNG NỔ SPEAKING (KÉO TỪ 4.5 LÊN 7.0)
    // -----------------------------------------------------------------------
    while (currentDayNum <= targetDays) {
      const dayTasks = [];
      let mins = 0;

      while (mins < dailyTargetMinutes && qSpeaking.length > 0) {
        const sTask = pickFromQueue(qSpeaking, 35);
        if (sTask) {
          dayTasks.push(sTask);
          mins += sTask.assignedDurationMinutes;
        }
      }

      if (dayTasks.length === 0) {
        dayTasks.push({
          id: `REV_SPK_P3_${currentDayNum}`,
          stage: "S4", domain: "SPEAKING", type: "PRACTICE",
          title: `Speaking Part 3 Phản Biện Chuyên Sâu: Trả lời 4 bước AREA không ngập ngừng`,
          benefit: "Rèn phản xạ kéo dài câu trả lời mạch lạc, triệt tiêu tật đệm 'like', 'yeah' và câu run-on.",
          assignedDurationMinutes: 35,
          url: "speaking/index-s.html"
        });
        dayTasks.push({
          id: `REV_SHAD_FINAL_${currentDayNum}`,
          stage: "S4", domain: "PRE_SPEAKING", type: "PRACTICE",
          title: `Shadowing Diễn Thuyết C1: Bật rõ âm đuôi (-s, -ed) & Ngữ điệu bản ngữ`,
          benefit: "Chuẩn hóa cơ miệng phát âm, trị dứt điểm tật nuốt âm đuôi gây hiểu nhầm từ vựng.",
          assignedDurationMinutes: 30,
          url: "pre-speaking/index-ps.html"
        });
        mins = 65;
      }

      calendarDays.push({
        dayNumber: currentDayNum,
        totalMinutes: mins,
        phaseId: "PHASE_5_SPEAKING",
        phaseName: "Chặng 5: Về Đích - Đột Phá Speaking & Shadowing Toàn Diện",
        phaseDesc: "Dồn toàn lực giải quyết điểm nghẽn 4.5: Trị dứt điểm câu dây thừng, nuốt âm đuôi và lỗi nhảy thì.",
        nodes: dayTasks
      });
      currentDayNum++;
    }

    return {
      totalDays: calendarDays.length,
      estimatedMonths: stats.months,
      dailySchedule: calendarDays
    };
  }

  // =========================================================================
  // THUẬT TOÁN 2: XOAY VÒNG TIÊU CHUẨN (CHO HỌC VIÊN KHÔNG YÊU CẦU THỨ TỰ)
  // =========================================================================
  generateStandardSpiralCalendar(retainedNodes, targetDays, dailyTargetMinutes, speedProfile, stats, aiOptions) {
    const calendarDays = [];
    const qGrammar = [];
    const qVocab = [];
    const qPreLis = [];
    const qOffLis = [];
    const qPreRead = [];
    const qOffRead = [];
    const qPreWrite = [];
    const qOffWrite = [];
    const qPreSpk = [];
    const qOffSpk = [];
    const qMock = [];

    retainedNodes.forEach(node => {
      const d = (node.domain || '').toUpperCase();
      const nWithBenefit = { ...node, benefit: node.benefit || this.generateBenefit(node) };

      if (d === 'GRAMMAR') qGrammar.push(nWithBenefit);
      else if (d === 'VOCABULARY') qVocab.push(nWithBenefit);
      else if (d === 'PRE_LISTENING') qPreLis.push(nWithBenefit);
      else if (d === 'LISTENING') qOffLis.push(nWithBenefit);
      else if (d === 'PRE_READING') qPreRead.push(nWithBenefit);
      else if (d === 'READING') qOffRead.push(nWithBenefit);
      else if (d.includes('PRE_WRITING')) qPreWrite.push(nWithBenefit);
      else if (d.includes('WRITING')) qOffWrite.push(nWithBenefit);
      else if (d === 'PRE_SPEAKING') qPreSpk.push(nWithBenefit);
      else if (d === 'SPEAKING') qOffSpk.push(nWithBenefit);
      else if (d === 'MOCK_TEST') qMock.push(nWithBenefit);
    });

    const pickTask = (queue, maxAllowed = 40) => {
      if (!queue || queue.length === 0) return null;
      const candidate = queue.shift();
      const dur = candidate.duration?.[speedProfile] || candidate.duration?.normal || 20;
      return { ...candidate, assignedDurationMinutes: dur };
    };

    for (let currentDay = 1; currentDay <= targetDays; currentDay++) {
      let dayMinutes = 0;
      const dayNodes = [];

      if (qGrammar.length > 0) {
        const t = pickTask(qGrammar, 30);
        if (t) { dayNodes.push(t); dayMinutes += t.assignedDurationMinutes; }
      }
      if (dayMinutes < dailyTargetMinutes && (qPreLis.length > 0 || qOffLis.length > 0)) {
        const t = pickTask(qPreLis.length > 0 ? qPreLis : qOffLis, 35);
        if (t) { dayNodes.push(t); dayMinutes += t.assignedDurationMinutes; }
      }
      if (dayMinutes < dailyTargetMinutes && (qVocab.length > 0 || qPreRead.length > 0 || qOffRead.length > 0)) {
        const t = pickTask(currentDay % 2 === 1 && qVocab.length > 0 ? qVocab : (qPreRead.length > 0 ? qPreRead : qOffRead), 35);
        if (t) { dayNodes.push(t); dayMinutes += t.assignedDurationMinutes; }
      }
      if (dayMinutes < dailyTargetMinutes && (qPreWrite.length > 0 || qOffWrite.length > 0)) {
        const t = pickTask(qPreWrite.length > 0 ? qPreWrite : qOffWrite, 45);
        if (t) { dayNodes.push(t); dayMinutes += t.assignedDurationMinutes; }
      }
      if (dayMinutes < dailyTargetMinutes && (qPreSpk.length > 0 || qOffSpk.length > 0)) {
        const t = pickTask(qPreSpk.length > 0 ? qPreSpk : qOffSpk, 35);
        if (t) { dayNodes.push(t); dayMinutes += t.assignedDurationMinutes; }
      }

      if (dayNodes.length === 0) {
        dayNodes.push({
          id: `MOCK_FULL_${currentDay}`,
          stage: "S4", domain: "MOCK_TEST", type: "TEST",
          title: `Tổng duyệt Đề Thi Thử Áp Lực Chuẩn Phòng Thi 3 Tiếng`,
          benefit: "Rèn luyện thể lực và chiến thuật làm bài liên tục 4 kỹ năng.",
          assignedDurationMinutes: 120,
          url: "reading/reading.html"
        });
        dayMinutes = 120;
      }

      calendarDays.push({
        dayNumber: currentDay,
        totalMinutes: dayMinutes,
        phaseId: "PHASE_SPIRAL",
        phaseName: "Lộ Trình Tích Hợp 4 Kỹ Năng",
        phaseDesc: "Phát triển đồng đều 4 kỹ năng kết hợp củng cố ngữ pháp và từ vựng mỗi ngày.",
        nodes: dayNodes
      });
    }

    return {
      totalDays: calendarDays.length,
      estimatedMonths: stats.months,
      dailySchedule: calendarDays
    };
  }
}

export const curriculumEngineSystem = new CurriculumEngineSystem();
