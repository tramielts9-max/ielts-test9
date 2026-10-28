/**
 * curriculum-system/engine-system.js
 * BỘ MÁY ĐIỀU PHỐI TÍNH XUÔI THEO SỐ BUỔI HỌC (300K/BUỔI - 12 BUỔI/NỬA BAND + LŨY TIẾN)
 * GIAI ĐOẠN 2: BẢO TOÀN KHỐI LƯỢNG HỌC TẬP (ZERO-SUM) & TÁI PHÂN BỔ TRỌNG SỐ THEO AI
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
   * LỌC KHO BÀI TẬP: TỰ ĐỘNG BÙ TRỪ VÀ GIẢI CỨU ĐỐT SỐNG NỀN TẢNG THEO AI
   */
  pruneCurriculumByBands(startBand = 0.0, targetBand = 7.0, aiOptions = {}) {
    const sBand = parseFloat(startBand) || 0.0;
    const tBand = Math.min(7.0, parseFloat(targetBand) || 7.0);

    const weakTags = aiOptions.retained_weak_tags || aiOptions.weak_tags || [];
    const prunedTags = aiOptions.pruned_tags || aiOptions.mastered_tags || [];
    const excludedDomains = (aiOptions.pruned_domains || aiOptions.excluded_domains || []).map(d => d.toUpperCase());
    const focusDomains = (aiOptions.focus_domains || []).map(d => d.toUpperCase());
    const weights = aiOptions.intensity_weights || {};

    return this.allNodes.filter((node, idx) => {
      const d = (node.domain || '').toUpperCase();
      const nodeTags = node.tags || [];
      const stg = node.stage || 'S1';
      const titleLower = (node.title || '').toLowerCase();

      // 1. NẾU BÀI CHỨA TAG YẾU CẦN GIẢI CỨU (VÍ DỤ: G_IRREG_V2, PRE_SPK_A1) -> BẢO VỆ 100%, KHÔNG CẮT
      if (weakTags.length > 0 && nodeTags.some(tag => weakTags.includes(tag))) {
        return true;
      }

      // 2. NẾU THUỘC DOMAIN MÀ AI YÊU CẦU CẮT HOÀN TOÀN (VÍ DỤ: PRE_READING) -> CẮT NGAY
      if (excludedDomains.some(ex => d === ex || d.startsWith(ex) || ex.includes(d))) {
        return false;
      }

      // 3. NẾU THUỘC DANH SÁCH TAGS AI BÁO ĐÃ VỮNG VÀ KHÔNG CHỨA TAG YẾU -> CẮT BỎ ĐỠ TỐN THỜI GIAN
      if (prunedTags.length > 0 && nodeTags.length > 0 && nodeTags.every(t => prunedTags.includes(t))) {
        return false;
      }

      // 4. NẾU LÀ DOMAIN TRỌNG TÂM ƯU TIÊN CAO (SPEAKING, WRITING) -> BẢO VỆ ĐỂ LẤY NGUYÊN LIỆU XẾP 91 NGÀY
      const isHighPriority = focusDomains.some(fc => d === fc || d.includes(fc)) || (weights[d] && weights[d] >= 1.5);
      if (isHighPriority) {
        if (tBand <= 5.5 && stg === 'S4') return false;
        return true;
      }

      // 5. CẮT ĐẦU THEO BAND XUẤT PHÁT (HEAD-CUT CHO CÁC MÔN CÒN LẠI)
      if (sBand >= 3.5 && stg === 'S1') return false;
      if (sBand >= 4.5 && stg === 'S1') return false;
      if (sBand >= 5.0 && stg === 'S2' && !d.includes('PRE_WRITING')) return false;
      if (sBand >= 5.5 && stg === 'S2') return false;
      if (sBand >= 6.0 && stg === 'S3' && (titleLower.includes('có mớm') || d.includes('PRE_'))) return false;
      if (sBand >= 6.5 && stg === 'S3') return false;

      // 6. CẮT ĐUÔI THEO BAND MỤC TIÊU (TAIL-CUT)
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

  /**
   * XẾP LỊCH BTVN: BẢO TOÀN TUYỆT ĐỐI ĐỦ 91 NGÀY (KHÔNG HỤT NGÀY) & ĐÔN TRỌNG SỐ THEO AI
   */
  generateDailyCalendar(retainedNodes, speedProfile = 'normal', dailyHours = 1.5, startBand = 0.0, targetBand = 7.0, aiOptions = {}) {
    const stats = this.calculateSessionsByBands(startBand, targetBand);
    const targetDays = stats.days; // 91 ngày cho chặng 5.5 -> 7.0
    const dailyTargetMinutes = Math.round(dailyHours * 60); // 90 phút/ngày
    const calendarDays = [];

    const weights = aiOptions.intensity_weights || {
      SPEAKING: 1.0, PRE_SPEAKING: 1.0, WRITING_T1: 1.0, WRITING_T2: 1.0,
      LISTENING: 1.0, READING: 1.0, GRAMMAR: 1.0, VOCABULARY: 1.0
    };
    const weakTags = aiOptions.retained_weak_tags || aiOptions.weak_tags || [];

    // Phân loại hàng đợi theo môn
    const qUrgentRescue = []; // Bài nền tảng giải cứu khẩn cấp (quá khứ bất quy tắc, to-be...)
    const qShadowing = [];    // Pre-Speaking Shadowing
    const qSpkFormal = [];    // Speaking Part 1, 2, 3
    const qPreWrite = [];     // Pre-Writing dịch câu PEEL
    const qWriteT1 = [];      // Writing Task 1
    const qWriteT2 = [];      // Writing Task 2
    const qListening = [];    // Listening đề Cam
    const qReading = [];      // Reading đề Cam
    const qGrammar = [];      // Ngữ pháp
    const qVocab = [];        // Từ vựng
    const qMock = [];         // Thi thử

    retainedNodes.forEach(node => {
      const d = (node.domain || '').toUpperCase();
      const nWithBenefit = { ...node, benefit: node.benefit || this.generateBenefit(node) };
      const isWeak = (node.tags || []).some(t => weakTags.includes(t));

      if (isWeak && (d === 'GRAMMAR' || d === 'PRE_SPEAKING')) {
        qUrgentRescue.push(nWithBenefit);
      } else if (d === 'PRE_SPEAKING') qShadowing.push(nWithBenefit);
      else if (d === 'SPEAKING') qSpkFormal.push(nWithBenefit);
      else if (d.includes('PRE_WRITING')) qPreWrite.push(nWithBenefit);
      else if (d === 'WRITING_T1') qWriteT1.push(nWithBenefit);
      else if (d === 'WRITING_T2') qWriteT2.push(nWithBenefit);
      else if (d === 'LISTENING' || d === 'PRE_LISTENING') qListening.push(nWithBenefit);
      else if (d === 'READING' || d === 'PRE_READING') qReading.push(nWithBenefit);
      else if (d === 'GRAMMAR') qGrammar.push(nWithBenefit);
      else if (d === 'VOCABULARY') qVocab.push(nWithBenefit);
      else if (d === 'MOCK_TEST') qMock.push(nWithBenefit);
    });

    const spkWeight = (weights.SPEAKING || 1.0);
    const writeWeight = (weights.WRITING_T2 || weights.WRITING_T1 || 1.0);
    const readWeight = (weights.READING || 1.0);

    const pickTask = (queue, dayNodes, usedDomains, maxAllowed = 40) => {
      if (!queue || queue.length === 0) return 0;
      const candidate = queue[0];
      const dur = candidate.duration?.[speedProfile] || candidate.duration?.normal || 20;

      queue.shift();
      dayNodes.push({
        ...candidate,
        assignedDurationMinutes: dur
      });
      return dur;
    };

    let reviewLoopIndex = 1;

    // VÒNG LẶP CHẠY CHÍNH XÁC 100% ĐỦ targetDays (91 NGÀY)
    for (let currentDay = 1; currentDay <= targetDays; currentDay++) {
      let dayMinutes = 0;
      const dayNodes = [];
      const usedDomainsThisDay = new Set();

      // 1. CỨU VIỆN KHẨN CẤP (XẾP ĐẦU TIÊN Ở CÁC TUẦN ĐẦU)
      if (qUrgentRescue.length > 0) {
        dayMinutes += pickTask(qUrgentRescue, dayNodes, usedDomainsThisDay, 25);
      }

      // 2. ƯU TIÊN SỐ 1: BÀI NÓI (NẾU TRỌNG SỐ CAO THÌ NGÀY NÀO CŨNG PHẢI NÓI)
      if (spkWeight >= 1.5) {
        // Luân phiên 1 bài Shadowing câu ngắn trị nuốt âm hoặc 1 bài phản xạ Part 1/Part 2
        if (qShadowing.length > 0 && currentDay % 2 === 1) {
          dayMinutes += pickTask(qShadowing, dayNodes, usedDomainsThisDay, 25);
          usedDomainsThisDay.add('SPEAKING');
        } else if (qSpkFormal.length > 0) {
          dayMinutes += pickTask(qSpkFormal, dayNodes, usedDomainsThisDay, 25);
          usedDomainsThisDay.add('SPEAKING');
        } else if (qShadowing.length > 0) {
          dayMinutes += pickTask(qShadowing, dayNodes, usedDomainsThisDay, 25);
          usedDomainsThisDay.add('SPEAKING');
        }
      }

      // 3. ƯU TIÊN SỐ 2: VIẾT (ĐẶC TRỊ CAI NGHIỆN BÀI MẪU)
      if (writeWeight >= 1.5 && dayMinutes < dailyTargetMinutes) {
        if (qPreWrite.length > 0 && currentDay <= 30) {
          dayMinutes += pickTask(qPreWrite, dayNodes, usedDomainsThisDay, 30);
          usedDomainsThisDay.add('WRITING');
        } else if (currentDay % 2 === 0 && qWriteT1.length > 0) {
          dayMinutes += pickTask(qWriteT1, dayNodes, usedDomainsThisDay, 35);
          usedDomainsThisDay.add('WRITING');
        } else if (qWriteT2.length > 0) {
          dayMinutes += pickTask(qWriteT2, dayNodes, usedDomainsThisDay, 45);
          usedDomainsThisDay.add('WRITING');
        }
      }

      // 4. NGHE (LUYỆN BẮT TỪ KHÓA & TRỊ MẤT DẤU BĂNG)
      if (!usedDomainsThisDay.has('LISTENING') && dayMinutes < dailyTargetMinutes && qListening.length > 0) {
        if (currentDay % 2 === 1) {
          dayMinutes += pickTask(qListening, dayNodes, usedDomainsThisDay, 25);
          usedDomainsThisDay.add('LISTENING');
        }
      }

      // 5. ĐỌC (NẾU HỌC SINH ĐÃ 6.5 THÌ CHỈ XẾP 4-5 NGÀY/LẦN ĐỂ DUY TRÌ TAY LÀM ĐỀ)
      if (readWeight <= 0.5) {
        if (currentDay % 5 === 0 && qReading.length > 0 && !usedDomainsThisDay.has('READING')) {
          dayMinutes += pickTask(qReading, dayNodes, usedDomainsThisDay, 30);
          usedDomainsThisDay.add('READING');
        }
      } else if (dayMinutes < dailyTargetMinutes && qReading.length > 0 && !usedDomainsThisDay.has('READING')) {
        dayMinutes += pickTask(qReading, dayNodes, usedDomainsThisDay, 25);
        usedDomainsThisDay.add('READING');
      }

      // 6. TỪ VỰNG HOẶC NGỮ PHÁP BỔ TRỢ
      if (dayMinutes < dailyTargetMinutes) {
        if (qVocab.length > 0 && currentDay % 3 === 0) {
          dayMinutes += pickTask(qVocab, dayNodes, usedDomainsThisDay, 20);
        } else if (qGrammar.length > 0) {
          dayMinutes += pickTask(qGrammar, dayNodes, usedDomainsThisDay, 20);
        }
      }

      // 7. BẢO TOÀN THỜI LƯỢNG (AUTO-REFILL): NẾU CHƯA ĐỦ 80 PHÚT, BƠM THÊM BÀI ĐẾN ĐỦ
      if (dayMinutes < 70) {
        const refillQueues = [qWriteT2, qWriteT1, qSpkFormal, qShadowing, qListening, qVocab];
        for (const rQ of refillQueues) {
          if (rQ.length > 0) {
            dayMinutes += pickTask(rQ, dayNodes, usedDomainsThisDay, 35);
            if (dayMinutes >= 75) break;
          }
        }
      }

      // 8. BẢO HIỂM CUỐI: NẾU TẤT CẢ KHO BÀI MỚI ĐÃ HẾT TRƯỚC NGÀY 91 -> KÍCH HOẠT VÒNG LẶP ÔN TẬP CAO CẤP
      if (dayNodes.length === 0) {
        const isSpeakingTurn = (currentDay % 2 === 1);
        if (isSpeakingTurn) {
          dayNodes.push({
            id: `REV_SPK_${String(reviewLoopIndex).padStart(2, '0')}`,
            stage: "S4", domain: "SPEAKING", type: "PRACTICE",
            title: `[ÔN TẬP DUY TRÌ #${reviewLoopIndex}] Luyện phản xạ ngắt nghỉ Speaking Part 2 & Part 3 (Bấm giờ phòng thi)`,
            benefit: "Ép tốc độ phản xạ và kiểm soát câu ngắn, loại bỏ hoàn toàn tật ngập ngừng và câu run-on.",
            assignedDurationMinutes: 30,
            url: "speaking/index-s.html"
          });
          dayNodes.push({
            id: `REV_SHADOW_${String(reviewLoopIndex).padStart(2, '0')}`,
            stage: "S4", domain: "PRE_SPEAKING", type: "PRACTICE",
            title: `[SHADOWING C1 #${reviewLoopIndex}] Luyện ngữ điệu & Bật âm đuôi (-s, -ed) theo người bản xứ`,
            benefit: "Chuẩn hóa cơ miệng, triệt tiêu lỗi nuốt âm đuôi gây mất điểm Pronunciation.",
            assignedDurationMinutes: 25,
            url: "pre-speaking/index-ps.html"
          });
          dayMinutes = 55;
        } else {
          dayNodes.push({
            id: `REV_WRT_${String(reviewLoopIndex).padStart(2, '0')}`,
            stage: "S4", domain: "WRITING_T2", type: "PRACTICE",
            title: `[VIẾT ĐỘC LẬP #${reviewLoopIndex}] Viết bài luận Task 2 bấm giờ 40 phút (CẤM XEM BÀI MẪU)`,
            benefit: "Cai nghiện hoàn toàn thói quen ngâm tài liệu gợi ý, tự lên dàn ý PEEL và viết chuẩn thời gian.",
            assignedDurationMinutes: 50,
            url: "writing task 2/index-t2.html"
          });
          dayMinutes = 50;
        }
        reviewLoopIndex++;
      }

      calendarDays.push({
        dayNumber: currentDay,
        totalMinutes: dayMinutes,
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
