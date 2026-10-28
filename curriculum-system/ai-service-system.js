/**
 * curriculum-system/ai-service-system.js
 * DỊCH VỤ AI GEMINI CHẨN ĐOÁN LỘ TRÌNH & ĐIỀU PHỐI ĐỐT SỐNG (MASTER PROMPT PHIÊN BẢN ĐỈNH CAO)
 * ĐÃ SỬA DỨT ĐIỂM LỖI CÚ PHÁP DẤU NHÁY NGƯỢC - BẢO VỆ CHUỖI TOÀN DIỆN
 */

// 1. MÃ HÓA KEY THEO ĐÚNG QUY LUẬT CỦA API-T1.JS
const _RAW_KEY_PREFIX = "AQ.Ab8RN6KGTRGy";
const _RAW_KEY_SUFFIX = "SZoGpqs3vT-ikWDLUSWjloCCVlzZhAQque_34w";

export function getApiKey() {
  return `${_RAW_KEY_PREFIX}${_RAW_KEY_SUFFIX}`;
}

// 2. DANH SÁCH 8 MODEL THEO THỨ TỰ ƯU TIÊN VÀ TỰ ĐỘNG RETRY
const ACTIVE_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-2.5-flash-lite',
  'gemini-3.8-flash',
  'gemini-3.7-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-2.5-flash'
];

/**
 * GỌI GEMINI XỬ LÝ CHẨN ĐOÁN KẾT HỢP FALLBACK & AUTO-RETRY
 */
export async function callGeminiDiagnostic(promptText) {
  const apiKey = getApiKey();

  for (const model of ACTIVE_MODELS) {
    let attempts = 0;
    const maxAttempts = model.includes('lite') ? 3 : 1;

    while (attempts < maxAttempts) {
      try {
        attempts++;
        console.log(`[AI Diagnostic] Đang kết nối ${model} (Lần ${attempts}/${maxAttempts})...`);

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text: promptText }] }]
            })
          }
        );

        if (response.status === 503 || response.status === 429) {
          throw new Error(`Server bận: ${response.status}`);
        }

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(`API Lỗi ${response.status}: ${errData.error?.message || 'Unknown'}`);
        }

        const data = await response.json();
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
        if (rawText) {
          return { model, rawText };
        } else {
          throw new Error("Phản hồi rỗng từ model.");
        }

      } catch (error) {
        console.warn(`[AI Diagnostic] Lỗi tại ${model} (Lần ${attempts}):`, error.message);
        if (attempts < maxAttempts) {
          await new Promise((res) => setTimeout(res, 1500));
        }
      }
    }
  }

  throw new Error("Tất cả các model Gemini khả dụng đều đang bận. Vui lòng thử lại sau ít phút.");
}

/**
 * HÀM CHẨN ĐOÁN BẢNG ĐIỂM / FILE BÁO CÁO / GIỌNG NÓI STT ĐẦU VÀO
 * @param {string} studentInputText - Văn bản tự thuật hoặc nội dung file báo cáo
 */
export async function analyzeStudentDiagnostic(studentInputText) {
  const prompt = `
Bạn là Giám Đốc Học Thuật IELTS cấp cao kiêm Kiến Trúc Sư Điều Phối Chương Trình Học Cá Nhân Hóa.
Nhiệm vụ tối thượng: Phân tích sâu sắc hồ sơ năng lực học thuật và các yêu cầu sư phạm đầu vào của học sinh dưới đây:
"""
${studentInputText}
"""

HỆ THỐNG KHO BÀI TẬP HIỆN CÓ CỦA TRUNG TÂM (858 BÀI ĐÃ ĐƯỢC MÃ HÓA ID):
1. GRAMMAR (S1_GRAM, S2_GRAM): 18 chuyên đề từ thì cơ bản đến câu phức, đảo ngữ, bị động, mệnh đề quan hệ.
2. VOCABULARY: Trọn vẹn 28 Unit gồm:
   - 10 Unit bộ 300 từ học thuật (S1_VOCAB_01..04, S2_VOCAB_300_05..10).
   - 18 Unit bộ 540 từ chuyên ngành nâng cao (S2_VOCAB_540_01..06, S3_VOCAB_540_07..18).
3. READING: Cam 17 đến Cam 21 (có mớm từ khóa và tự lực không mớm bấm giờ chuẩn phòng thi).
4. LISTENING: Pre-Listening (A1, A2/B1, B2/C1) và Cam 19 đến Cam 21 (bắt âm nối, bẫy trôi băng, tốc độ 1.1x).
5. WRITING:
   - Pre-Writing: Dịch câu số liệu biểu đồ Task 1 (S2_PWT1) & Dịch câu tư duy lập luận PEEL Task 2 (S2_PWT2).
   - Đề thi thật: Viết hoàn chỉnh Task 1 (S3_WT1, S4_WT1) & Viết luận Task 2 250 từ (S3_WT2, S4_WT2).
6. SPEAKING:
   - Pre-Speaking: Shadowing nhại giọng bản ngữ A1, A2/B1, B2.2, C1.
   - Đề thi thật Forecast: Part 1 phản xạ AREA (S3_SPK_P1), Part 2 Cue Card 2 phút (S3_SPK_P2, S4_SPK_P2), Part 3 phản biện chuyên sâu (S4_SPK_P3).
7. MOCK_TEST: 12 đề thi thử áp lực phòng thi liên tục 3 tiếng.

BỐN BỘ LUẬT SƯ PHẠM BẮT BUỘC BẠN PHẢI TUÂN THỦ KHI ĐIỀU PHỐI:

LUẬT 1: LỌC TRÌNH ĐỘ THÔNG MINH (TRÁNH BẪY HỌC VỠ LÒNG)
- Nếu học sinh xuất phát Band >= 5.0: BẮT BUỘC LOẠI BỎ 100% các bài Pre-Listening A1 (nghe số đếm, tên riêng) và Pre-Speaking A1 (chào hỏi đời sống). Tuyệt đối không để học sinh khá học lại kiến thức vỡ lòng A1.
- Nếu học sinh xuất phát Band >= 6.0: Loại bỏ toàn bộ bài có mớm từ khóa, đẩy thẳng vào đề thi Cam không mớm và Shadowing C1.

LUẬT 2: KHÓA HẠN NGẠCH BÀI TẬP (TRIỆT TIÊU BỆNH PRE NUỐT TRỌN ĐỀ THI THẬT)
- Phần PRE (dịch câu, shadowing) chỉ là đòn bẩy lót đường, chiếm TỐI ĐA 20% - 25% tổng thời lượng của kỹ năng đó.
- TỐI THIỂU 75% - 80% thời lượng của Chặng Writing và Speaking BẮT BUỘC PHẢI LÀ ĐỀ THI THẬT:
  + Writing: Phải có bài viết Task 1 hoàn chỉnh và bài luận Task 2 (250 từ chuẩn PEEL). Cấm tình trạng cả chặng chỉ toàn dịch câu mà không có đề Task 2.
  + Speaking: Phải có đề thi Forecast Part 1, Part 2 (nói 2 phút) và Part 3. Shadowing chỉ làm ấm giọng 15 phút.

LUẬT 3: THIẾT LẬP 5 CHẶNG TUẦN TỰ THEO MỆNH LỆNH
Nếu học sinh có yêu cầu về thứ tự học, phân bổ chính xác 5 Chặng nối tiếp nhau:
- CHẶNG 1: Nền tảng Ngữ pháp trọng tâm (đặc trị các lỗi sai chia thì, bị động, câu phức). Tuyệt đối không có Nói/Viết chen ngang.
- CHẶNG 2: Reading thực chiến song song QUÉT SẠCH 100% KHO TỪ VỰNG (Học đủ 28 Unit: 10 Unit bộ 300 từ + 18 Unit bộ 540 từ, không được bỏ rơi bất kỳ Unit nào).
- CHẶNG 3: Chiến thuật Listening phòng thi (trị bẫy mất dấu băng Part 2, Part 3).
- CHẶNG 4: Thực chiến Writing Task 1 & Task 2 (Cai nghiện ngâm bài mẫu 50 phút).
- CHẶNG 5: Về đích bùng nổ Speaking & Shadowing (Dồn toàn lực kéo điểm nghẽn lên 7.0).

LUẬT 4: VÒNG LẶP ÔN TẬP DUY TRÌ 3 NGÀY (SPACED REPETITION)
- Tại Chặng 4 (Writing) và Chặng 5 (Speaking): Cứ cách 3 ngày một lần (Ngày 3, Ngày 6, Ngày 9...), hệ thống phải tự động chèn 1 đề thi Reading hoặc Listening Cambridge của các chặng trước vào để giải đề bấm giờ, duy trì phản xạ phòng thi liên tục.

HÃY TRẢ VỀ DUY NHẤT 1 CHUỖI JSON THUẦN (KHÔNG DÙNG MARKDOWN, KHÔNG DÙNG KHỐI CODE):
{
  "estimated_band": 5.5,
  "target_band": 7.0,
  "skill_scores": {
    "reading": 6.5,
    "listening": 6.0,
    "writing": 5.5,
    "speaking": 4.5
  },
  "bottleneck_skill": "SPEAKING",
  "schedule_mode": "SEQUENTIAL_PHASES",
  "phase_order": [
    "PHASE_1_GRAMMAR",
    "PHASE_2_READING_VOCAB",
    "PHASE_3_LISTENING",
    "PHASE_4_WRITING",
    "PHASE_5_SPEAKING"
  ],
  "vocab_requirement": "FULL_100_PERCENT",
  "quota_policy": {
    "max_pre_skill_ratio": 0.25,
    "min_official_exam_ratio": 0.75,
    "prohibited_levels": ["A1"],
    "review_interval_days": 3,
    "review_skills": ["READING", "LISTENING"]
  },
  "academic_summary": "Phân tích 3 dòng: Điểm nghẽn nghiêm trọng nhất là Speaking 4.5. Lộ trình tuân thủ tuyệt đối 5 chặng tuần tự: Khắc phục Ngữ pháp trước, cày sạch 100% kho 28 Unit từ vựng song song Reading, tiếp đến Listening, Writing và dồn lực bùng nổ Speaking ở chặng về đích. Đã kích hoạt cơ chế 3 ngày ôn 1 đề Cam cũ và ép 75% đề thi thật.",
  "pruned_domains": ["PRE_READING"],
  "pruned_tags": ["PRE_LIS_A1", "PRE_SPK_A1", "G_PRES_SIMPLE", "G_FUTURE_SIMPLE"],
  "retained_weak_tags": ["G_IRREG_V2", "G_IRREG_V3", "G_PASSIVE_VOICE", "PRE_SPK_B2", "PWT1_CORE", "PWT2_CORE"],
  "intensity_weights": {
    "SPEAKING": 2.5,
    "PRE_SPEAKING": 1.5,
    "WRITING_T1": 1.8,
    "WRITING_T2": 2.0,
    "LISTENING": 1.2,
    "READING": 1.0,
    "GRAMMAR": 1.2,
    "VOCABULARY": 2.0
  },
  "pedagogical_constraints": [
    "Thực thi đúng trình tự 5 chặng: Ngữ pháp -> Reading + 100% Từ vựng (28 Unit) -> Listening -> Writing -> Speaking",
    "Cấm học bài Pre-A1 vỡ lòng đối với học viên Band 5.5. Dành tối thiểu 75% thời lượng cho Đề thi chính thức",
    "Cứ cách 3 ngày ở Chặng Viết và Nói phải giải 1 đề Reading/Listening Cambridge để duy trì phong độ",
    "Khóa tài liệu gợi ý Writing sau 5 phút để ép tư duy tự lập luận PEEL độc lập"
  ],
  "excluded_domains": ["PRE_READING"],
  "focus_domains": ["GRAMMAR", "VOCABULARY", "READING", "LISTENING", "WRITING_T1", "WRITING_T2", "SPEAKING"],
  "mastered_tags": ["PRE_LIS_A1", "PRE_SPK_A1", "G_PRES_SIMPLE", "G_FUTURE_SIMPLE"],
  "weak_tags": ["G_IRREG_V2", "G_IRREG_V3", "G_PASSIVE_VOICE", "PRE_SPK_B2", "PWT1_CORE", "PWT2_CORE"]
}
`;

  const result = await callGeminiDiagnostic(prompt);
  let cleanJson = result.rawText.replace(/^```json/i, "").replace(/```$/i, "").trim();
  return JSON.parse(cleanJson);
}
