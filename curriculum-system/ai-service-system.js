/**
 * curriculum-system/ai-service-system.js
 * DỊCH VỤ AI GEMINI CHẨN ĐOÁN LỘ TRÌNH & ĐIỀU PHỐI ĐỐT SỐNG
 * Key được mã hóa 2 phần chuẩn theo kiến trúc api-t1.js
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
Bạn là Giám Đốc Học Thuật IELTS cấp cao.
Nhiệm vụ: Đọc kỹ thông tin năng lực học sinh dưới đây (do học sinh nói qua micro, gõ tay hoặc trích xuất từ file báo cáo/bảng điểm):
"""
${studentInputText}
"""

HÃY PHÂN TÍCH VÀ TRÍCH XUẤT CÁC MỤC SAU:
1. "estimated_band": Điểm hiện tại của học sinh (từ 0.0 đến 6.5).
2. "target_band": Điểm mục tiêu mà học sinh mong muốn đạt được (Ví dụ: học sinh nói "lên band 7" hoặc "mục tiêu 7.0" thì lấy đúng 7.0. Nếu học sinh không nói rõ mục tiêu thì mặc định lấy 7.0. Trần tối đa khóa học là 7.0).
3. ĐỐI CHIẾU VÀ ÁNH XẠ NĂNG LỰC CỦA HỌC SINH VÀO KHO BÀI TẬP (GỒM CÁC TAGS):
- Ngữ pháp: G_NOUNS, G_PRES_SIMPLE, G_PAST_SIMPLE, G_FUTURE_SIMPLE, G_ARTICLES, G_PREP_BASIC, G_PAST_CONT, G_PRES_PERF, G_PAST_PERF, G_CONDITIONALS, G_PASSIVE_VOICE, G_COMPARISON, G_RELATIVE_CLAUSE, G_PREP_ADV, G_WORD_FORM.
- Kỹ năng cơ bản: VOCAB_U01_U04, PRE_LIS_A1_A2, PRE_READ_A1_A2, PRE_SPK_A1.
- Kỹ năng nâng cao: WT1_LINE, WT1_BAR, WT1_TABLE, WT1_PIE, WT1_MAP, WT1_PROCESS, WT2_OPINION, WT2_DISCUSSION, WT2_OUTWEIGH, WT2_CAUSE_SOLUTION, SPK_P1, SPK_P2, SPK_P3, READ_UNPROMPTED, LIS_UNPROMPTED.

TRẢ VỀ DUY NHẤT 1 CHUỖI JSON THUẦN (KHÔNG DÙNG MARKDOWN, KHÔNG \`\`\`json):
{
  "estimated_band": 5.5,
  "target_band": 7.0,
  "recommended_speed": "normal",
  "recommended_daily_hours": 1.5,
  "academic_summary": "Nhận xét ngắn gọn 2-3 câu về điểm mạnh và lỗ hổng kiến thức cốt lõi.",
  "mastered_tags": ["Danh", "sach", "tags", "hoc", "sinh", "da", "vung", "de", "got", "bo"],
  "weak_tags": ["Danh", "sach", "tags", "hoc", "sinh", "yeu", "can", "uu", "tien"]
}
`;

  const result = await callGeminiDiagnostic(prompt);
  let cleanJson = result.rawText.replace(/^```json/i, "").replace(/```$/i, "").trim();
  return JSON.parse(cleanJson);
}
