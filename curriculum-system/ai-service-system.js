/**
 * curriculum-system/ai-service-system.js
 * DỊCH VỤ AI GEMINI CHẨN ĐOÁN LỘ TRÌNH & ĐIỀU PHỐI ĐỐT SỐNG (GIAI ĐOẠN 1)
 * Chuẩn kiến trúc bảo toàn code - Không cắt giảm tính năng
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
Bạn là Giám Đốc Học Thuật IELTS cấp cao của hệ thống luyện thi cá nhân hóa.
Nhiệm vụ: Đọc và phân tích sâu sắc toàn bộ hồ sơ năng lực học thuật dưới đây (do học sinh nói qua micro, gõ tay hoặc dán từ bản báo cáo chi tiết):
"""
${studentInputText}
"""

HỆ THỐNG KHO BÀI TẬP HIỆN CÓ CỦA TRUNG TÂM (858 BÀI):
1. DOMAINS CHÍNH:
   - GRAMMAR: Ngữ pháp lý thuyết & bài tập.
   - VOCABULARY: Từ vựng học thuật 300 từ & 540 từ.
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

2. DANH MỤC TAGS KHO BÀI:
   - Ngữ pháp: G_NOUNS, G_PRES_SIMPLE, G_PRES_CONT, G_IRREG_V2, G_PAST_SIMPLE, G_FUTURE_SIMPLE, G_PREP_BASIC, G_ARTICLES, G_PAST_CONT, G_IRREG_V3, G_PRES_PERF, G_PAST_PERF, G_CONDITIONALS, G_PASSIVE_VOICE, G_COMPARISON, G_RELATIVE_CLAUSE, G_PREP_ADV, G_WORD_FORM.
   - Nền tảng: VOCAB_300_U1 -> U10, VOCAB_540_U1 -> U18, PRE_LIS_A1, PRE_LIS_INTER, PRE_LIS_ADV, PRE_READ_A1, PRE_READ_INTER, PRE_READ_ADV, PRE_SPK_A1, PRE_SPK_INTER, PRE_SPK_B2, PRE_SPK_C1, PWT1_CORE, PWT2_CORE.
   - Đề chính thức & Nâng cao: READ_PROMPTED, READ_UNPROMPTED, LIS_PROMPTED, LIS_UNPROMPTED, WT1_STAGE3, WT1_STAGE4, WT2_STAGE3, WT2_STAGE4, SPK_P1, SPK_P2, SPK_P3, MOCK_TEST_FULL.

HÃY PHÂN TÍCH HỌC THUẬT VÀ TRẢ VỀ ĐƠN THUỐC ĐIỀU PHỐI (JSON):
1. "estimated_band": Band tổng hiện tại (từ 0.0 đến 6.5). Nếu báo cáo ghi rõ (ví dụ: Band 5.5) thì lấy đúng số đó.
2. "target_band": Band mục tiêu mong muốn (Tối đa 7.0. Mặc định là 7.0 nếu học sinh muốn bứt phá lên mốc cao nhất).
3. "skill_scores": Điểm chi tiết từng kỹ năng bóc tách từ báo cáo (reading, listening, writing, speaking).
4. "bottleneck_skill": Kỹ năng yếu nhất đang kéo tụt điểm (Điểm nghẽn cổ chai - Ví dụ: SPEAKING nếu điểm 4.5).
5. "pruned_domains": Các domain cần GỌT BỎ HOÀN TOÀN (Ví dụ: Reading học sinh đã 6.5 thì cắt sạch PRE_READING; nếu ngữ pháp căn bản đã vững thì cắt các bài ngữ pháp câu đơn).
6. "pruned_tags": Danh sách tags cụ thể cần loại bỏ để tránh học lại cái đã biết.
7. "retained_weak_tags": Danh sách tags cụ thể học sinh bị sai sót nghiêm trọng BẮT BUỘC PHẢI GIỮ LẠI (Ví dụ sai "rised" thì giữ G_IRREG_V2; sai to-be thì giữ G_PASSIVE_VOICE; phát âm sai/nuốt âm đuôi/câu dây thừng thì giữ PRE_SPK_A1, PRE_SPK_INTER).
8. "intensity_weights": Trọng số điều phối để Engine bù trừ bài học (Môn yếu đẩy trọng số cao từ 1.8 - 2.5 để tăng gấp đôi bài; môn đã giỏi hạ trọng số xuống 0.2 - 0.4 để giảm bài).
   Bắt buộc gồm các keys: "SPEAKING", "PRE_SPEAKING", "WRITING_T1", "WRITING_T2", "LISTENING", "READING", "GRAMMAR", "VOCABULARY".
9. "pedagogical_constraints": 2 - 3 dòng chỉ thị sư phạm răn đe hành vi học tập (Ví dụ: "Khóa bài mẫu Writing sau 5 phút để trị bệnh ngâm tài liệu 50 phút", "Luyện Shadowing câu ngắn dứt khoát trị tật câu dây thừng").
10. Đồng bộ các mảng tương thích ngược:
    - "excluded_domains": Giống pruned_domains.
    - "focus_domains": Mảng các domain trọng tâm cần đẩy mạnh (Ví dụ: ["SPEAKING", "PRE_SPEAKING", "WRITING_T1", "WRITING_T2"]).
    - "mastered_tags": Giống pruned_tags.
    - "weak_tags": Giống retained_weak_tags.

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
  "academic_summary": "Nhận xét súc tích 2-3 câu: Điểm nghẽn lớn nhất là Speaking 4.5 lệch sâu so với Reading 6.5. Cần cắt giảm đọc hiểu để x2 thời lượng Shadowing ngắt câu và ép viết Writing độc lập không phụ thuộc bài mẫu.",
  "pruned_domains": ["PRE_READING"],
  "pruned_tags": ["G_PRES_SIMPLE", "G_FUTURE_SIMPLE", "G_NOUNS", "G_ARTICLES"],
  "retained_weak_tags": ["G_IRREG_V2", "G_IRREG_V3", "G_PASSIVE_VOICE", "PRE_SPK_A1", "PRE_SPK_INTER", "PWT1_CORE", "PWT2_CORE"],
  "intensity_weights": {
    "SPEAKING": 2.5,
    "PRE_SPEAKING": 2.5,
    "WRITING_T1": 1.8,
    "WRITING_T2": 1.8,
    "LISTENING": 1.0,
    "READING": 0.3,
    "GRAMMAR": 0.4,
    "VOCABULARY": 0.8
  },
  "pedagogical_constraints": [
    "Khóa tính năng xem gợi ý Writing sau 5 phút để ép tư duy tự viết",
    "Shadowing câu ngắn ngắt nghỉ dứt khoát để trị tật nuốt âm đuôi và câu dây thừng",
    "Trị dứt điểm 17 lỗi chính tả và chia sai động từ quá khứ bất quy tắc"
  ],
  "excluded_domains": ["PRE_READING"],
  "focus_domains": ["SPEAKING", "PRE_SPEAKING", "WRITING_T1", "WRITING_T2"],
  "mastered_tags": ["G_PRES_SIMPLE", "G_FUTURE_SIMPLE", "G_NOUNS", "G_ARTICLES"],
  "weak_tags": ["G_IRREG_V2", "G_IRREG_V3", "G_PASSIVE_VOICE", "PRE_SPK_A1", "PRE_SPK_INTER", "PWT1_CORE", "PWT2_CORE"]
}
`;

  const result = await callGeminiDiagnostic(prompt);
  let cleanJson = result.rawText.replace(/^```json/i, "").replace(/```$/i, "").trim();
  return JSON.parse(cleanJson);
}
