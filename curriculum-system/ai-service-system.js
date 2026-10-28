/**
 * curriculum-system/ai-service-system.js
 * DỊCH VỤ AI GEMINI CHẨN ĐOÁN LỘ TRÌNH & ĐIỀU PHỐI ĐỐT SỐNG (GIAI ĐOẠN 1 HOÀN CHỈNH)
 * ĐÃ TÍCH HỢP LỆNH ĐIỀU PHỐI KỸ THUẬT: CHẾ ĐỘ CHẶNG TUẦN TỰ & 100% KHO TỪ VỰNG
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
Bạn là Giám Đốc Học Thuật IELTS cấp cao kiêm Kiến Trúc Sư Điều Phối Chương Trình.
Nhiệm vụ: Đọc và phân tích sâu sắc toàn bộ hồ sơ năng lực học thuật cùng các mệnh lệnh sư phạm đặc biệt dưới đây:
"""
${studentInputText}
"""

HỆ THỐNG KHO BÀI TẬP HIỆN CÓ CỦA TRUNG TÂM (858 BÀI ĐÃ MÃ HÓA ID):
1. DOMAINS CHÍNH:
   - GRAMMAR: Ngữ pháp lý thuyết & bài tập thực hành (S1_GRAM, S2_GRAM).
   - VOCABULARY: Toàn bộ 10 Unit bộ 300 từ (S1_VOCAB_01..04, S2_VOCAB_300_05..10) và 18 Unit bộ 540 từ (S2_VOCAB_540_01..06, S3_VOCAB_540_07..18) = Tổng cộng 28 Unit.
   - PRE_LISTENING: Luyện nghe bắt âm nối, số liệu, tên riêng A1, A2, B1, B2.
   - PRE_READING: Scanning, Sentence Stripping câu đơn, câu phức A1, A2, B1, B2.
   - PRE_SPEAKING: Shadowing nhại giọng bản ngữ A1, A2, B1, B2, C1.
   - PRE_WRITING_T1: Dịch câu số liệu biểu đồ 3 mốc Band Task 1.
   - PRE_WRITING_T2: Dịch câu tư duy lập luận PEEL Task 2.
   - READING: Luyện đề Cam 17 - Cam 21 (có mớm từ khóa và tự làm không mớm).
   - LISTENING: Luyện đề Cam 19 - Cam 21 (có mớm và tốc độ 1.1x).
   - WRITING_T1: Viết bài 150 từ hoàn chỉnh Task 1 (Line, Bar, Table, Pie, Map, Process, Floor, Mixed).
   - WRITING_T2: Viết luận 250 từ chuẩn PEEL Task 2 (Opinion, Discussion, Outweigh, Cause-Solution, Two-part).
   - SPEAKING: Luyện nói Forecast Part 1, Part 2, Part 3.
   - MOCK_TEST: Đề thi thử áp lực 3 tiếng.

QUY TẮC NHẬN DIỆN MỆNH LỆNH SƯ PHẠM VÀ ĐIỀU PHỐI CHẶNG:
1. "schedule_mode":
   - Nếu trong văn bản có yêu cầu về thứ tự học (ví dụ: "thứ tự bắt buộc", "học ngữ pháp đầu tiên", "rồi tới reading", "speaking ở cuối", "theo nhóm kỹ năng")... BẮT BUỘC TRẢ VỀ: "SEQUENTIAL_PHASES".
   - Nếu không có yêu cầu thứ tự thì trả về: "SPIRAL_MIXED".
2. "phase_order": Mảng định danh thứ tự các chặng khi schedule_mode là "SEQUENTIAL_PHASES".
   Ví dụ người dùng yêu cầu: Ngữ pháp -> Reading song song Từ vựng -> Listening -> Writing -> Speaking thì trả về chính xác:
   ["PHASE_1_GRAMMAR", "PHASE_2_READING_VOCAB", "PHASE_3_LISTENING", "PHASE_4_WRITING", "PHASE_5_SPEAKING"]
3. "vocab_requirement":
   - Nếu có yêu cầu "học hết toàn bộ cái 300 và 540 không bỏ phần gì hết", BẮT BUỘC TRẢ VỀ: "FULL_100_PERCENT".
   - Mặc định bình thường: "STANDARD".
4. "estimated_band" & "target_band": Band hiện tại (0.0 - 6.5) và Band mục tiêu (tối đa 7.0).
5. "skill_scores": Điểm chi tiết từng kỹ năng bóc tách từ báo cáo (reading, listening, writing, speaking).
6. "bottleneck_skill": Kỹ năng yếu nhất (Ví dụ: SPEAKING nếu điểm 4.5).
7. "pruned_domains": Các domain cần GỌT BỎ HOÀN TOÀN (Ví dụ: PRE_READING nếu học sinh đã yêu cầu bỏ hoặc Reading đã 6.5).
8. "pruned_tags": Các tags râu ria đã vững cần lược bỏ.
9. "retained_weak_tags": Các tags bài tập mà học sinh bị sai sót nghiêm trọng BẮT BUỘC PHẢI GIỮ LẠI (Ví dụ: G_IRREG_V2, G_IRREG_V3, G_PASSIVE_VOICE, PRE_SPK_A1, PWT1_CORE, PWT2_CORE...).
10. "intensity_weights": Bảng trọng số điều phối cho các kỹ năng.
11. "pedagogical_constraints": 2 - 3 dòng chỉ thị sư phạm răn đe hành vi học tập (cấm ngâm bài mẫu 50 phút, luyện Shadowing ngắt câu ngắn trị câu dây thừng...).

TRẢ VỀ DUY NHẤT 1 CHUỖI JSON THUẦN (KHÔNG DÙNG MARKDOWN, KHÔNG \`\`\`json):
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
  "academic_summary": "Điểm nghẽn nghiêm trọng nhất là Speaking 4.5. Lộ trình được thiết lập theo đúng mệnh lệnh tuần tự 5 chặng: Triệt tiêu lỗ hổng Ngữ pháp đầu tiên, tiếp đến Reading song song 100% kho 28 Unit từ vựng, chuyển tiếp sang Listening, Writing và dồn toàn lực bứt phá Speaking ở chặng về đích.",
  "pruned_domains": ["PRE_READING"],
  "pruned_tags": ["G_PRES_SIMPLE", "G_FUTURE_SIMPLE", "G_NOUNS", "G_ARTICLES"],
  "retained_weak_tags": ["G_IRREG_V2", "G_IRREG_V3", "G_PASSIVE_VOICE", "PRE_SPK_A1", "PRE_SPK_INTER", "PWT1_CORE", "PWT2_CORE"],
  "intensity_weights": {
    "SPEAKING": 2.5,
    "PRE_SPEAKING": 2.5,
    "WRITING_T1": 1.8,
    "WRITING_T2": 1.8,
    "LISTENING": 1.0,
    "READING": 1.0,
    "GRAMMAR": 1.5,
    "VOCABULARY": 2.0
  },
  "pedagogical_constraints": [
    "Thực thi đúng trình tự 5 chặng tuần tự: Ngữ pháp ➔ Reading + 100% Từ vựng 300/540 ➔ Listening ➔ Writing ➔ Speaking",
    "Khóa tài liệu gợi ý Writing sau 5 phút để ép học viên tự lên dàn ý PEEL độc lập",
    "Luyện Shadowing ngắt câu ngắn dứt khoát để trị tật câu dây thừng, nuốt âm đuôi và lỗi đổi thì lung tung trong Speaking"
  ],
  "excluded_domains": ["PRE_READING"],
  "focus_domains": ["GRAMMAR", "VOCABULARY", "READING", "LISTENING", "WRITING_T1", "WRITING_T2", "SPEAKING", "PRE_SPEAKING"],
  "mastered_tags": ["G_PRES_SIMPLE", "G_FUTURE_SIMPLE", "G_NOUNS", "G_ARTICLES"],
  "weak_tags": ["G_IRREG_V2", "G_IRREG_V3", "G_PASSIVE_VOICE", "PRE_SPK_A1", "PRE_SPK_INTER", "PWT1_CORE", "PWT2_CORE"]
}
`;

  const result = await callGeminiDiagnostic(prompt);
  let cleanJson = result.rawText.replace(/^```json/i, "").replace(/```$/i, "").trim();
  return JSON.parse(cleanJson);
}
