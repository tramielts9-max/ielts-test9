/**
 * grammar/js/exercise-engine-g.js
 * ENGINE CHẤM ĐIỂM NGỮ PHÁP ĐA TẦNG THÔNG MINH (HYBRID ENGINE)
 * BẢN FULL ĐẦY ĐỦ 100% - CHỐNG CHẤM OAN DO DẤU CÁCH ẨN, NHÁY CONG, TỪ VIẾT TẮT,
 * TỰ ĐỘNG GỌT BỎ TARGETSTART VÀ TÍCH HỢP AI PHÚC KHẢO TỰ ĐỘNG
 */

export class ExerciseEngine {
  /**
   * 1. BẢNG QUY ĐỔI TỪ VIẾT TẮT VỀ DẠNG ĐẦY ĐỦ (CONTRACTION EXPANDER)
   */
  static expandContractions(text) {
    if (!text) return "";
    return text
      .replace(/\bwon't\b/gi, "will not")
      .replace(/\bcan't\b/gi, "cannot")
      .replace(/\bshan't\b/gi, "shall not")
      .replace(/n't\b/gi, " not")
      .replace(/'ll\b/gi, " will")
      .replace(/'re\b/gi, " are")
      .replace(/'ve\b/gi, " have")
      .replace(/'m\b/gi, " am")
      // Quy chuẩn UK vs US phổ biến
      .replace(/\bpractise\b/gi, "practice");
  }

  /**
   * 2. BỘ CHUẨN HÓA SIÊU CẤP (NORMALIZER):
   * Khử ký tự tàng hình, khử &nbsp;, đổi nháy cong thành nháy thẳng, gọt dấu câu cuối dòng
   */
  static clean(text) {
    if (!text) return "";

    let cleaned = String(text)
      // Ép về bảng mã Unicode chuẩn NFKC
      .normalize("NFKC")
      // Xóa bỏ tất cả các loại khoảng trắng vô hình, Non-breaking space (\u00A0), zero-width space (\uFEFF, \u200B)
      .replace(/[\u00A0\u1680\u2000-\u200B\u202F\u205F\u3000\uFEFF]/g, " ")
      // Đổi tất cả dấu nháy cong của iPhone/Word thành dấu nháy thẳng chuẩn (')
      .replace(/[‘’`´]/g, "'")
      // Đổi chữ thường
      .toLowerCase();

    // Bung các từ viết tắt về dạng đầy đủ
    cleaned = this.expandContractions(cleaned);

    // Gọt bỏ dấu chấm, dấu phẩy, dấu hỏi, dấu chấm than ở cuối câu
    cleaned = cleaned.replace(/[.,?!:;]+$/g, "");

    // Xóa các ký tự đặc biệt không cần thiết và gom nhiều dấu cách thành 1
    cleaned = cleaned
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    return cleaned;
  }

  /**
   * 3. GỌT BỎ PHẦN GỢI Ý MỒI CÂU IN SẴN (TARGETSTART)
   */
  static stripTargetStart(userInput, targetStart) {
    if (!userInput) return "";
    if (!targetStart) return userInput.trim();

    const cleanInput = userInput.trim();
    const cleanStart = targetStart.trim();

    // Nếu học sinh gõ lặp lại cả cụm targetStart ở đầu câu -> tự gọt bỏ
    const regex = new RegExp(`^${cleanStart}\\s*`, "i");
    if (regex.test(cleanInput)) {
      return cleanInput.replace(regex, "").trim();
    }

    return cleanInput;
  }

  /**
   * 4. HÀM CHẤM ĐIỂM CHÍNH (GRADE QUESTION)
   */
  static gradeQuestion(q, userVal) {
    // A. DẠNG TRẮC NGHIỆM CHỌN (A, B, C, D)
    if (q.type === "choice") {
      const selectedIndex = parseInt(userVal, 10);
      const isCorrect = selectedIndex === q.correctIndex;
      return {
        isCorrect,
        correctDisplay: q.options[q.correctIndex]
      };
    }

    // B. DẠNG ĐIỀN TỪ (BLANK) HOẶC VIẾT LẠI CÂU (REWRITE)
    if (q.type === "blank" || q.type === "rewrite") {
      const rawUser = userVal || "";
      const answersList = q.answers || (q.answer ? [q.answer] : []);

      // Trường hợp 1: So sánh trực tiếp phần học sinh gõ
      const cleanUserDirect = this.clean(rawUser);

      // Trường hợp 2: Học sinh gõ tiếp sau targetStart (hoặc gõ cả câu)
      const strippedUser = this.stripTargetStart(rawUser, q.targetStart || "");
      const cleanUserStripped = this.clean(strippedUser);

      let isCorrect = false;

      for (const ans of answersList) {
        const cleanAnsDirect = this.clean(ans);
        const strippedAns = this.stripTargetStart(ans, q.targetStart || "");
        const cleanAnsStripped = this.clean(strippedAns);

        // Kiểm tra đối chiếu 4 chiều:
        if (
          cleanUserDirect === cleanAnsDirect ||
          cleanUserStripped === cleanAnsStripped ||
          cleanUserDirect === cleanAnsStripped ||
          cleanUserStripped === cleanAnsDirect
        ) {
          isCorrect = true;
          break;
        }
      }

      return {
        isCorrect,
        correctDisplay: answersList.join(" <br>HOẶC: "),
        rawUser: rawUser,
        needsAiReview: !isCorrect // Nếu Vòng 1 chưa khớp, bật cờ để AI có thể phúc khảo
      };
    }

    return { isCorrect: false, correctDisplay: "" };
  }

  /**
   * 5. VÒNG BẢO VỆ PHÚC KHẢO BẰNG AI (DÀNH CHO CÂU TỰ LUẬN VIẾT KHÁC MẪU NHƯNG ĐÚNG)
   */
  static async verifyWithAI(promptQuestion, studentAnswer, standardAnswersList, apiKey) {
    if (!studentAnswer || studentAnswer.trim().length === 0) return false;
    if (!apiKey) return false;

    const promptText = `
Bạn là Giám khảo Khảo thí Ngữ pháp tiếng Anh chuẩn Cambridge.
Nhiệm vụ: Thẩm định xem câu trả lời của học sinh có ĐÚNG NGỮ PHÁP và GIỮ NGUYÊN NGHĨA so với các đáp án mẫu hay không.

- Đề bài / Câu gốc: "${promptQuestion}"
- Đáp án mẫu chuẩn: ${JSON.stringify(standardAnswersList)}
- Câu trả lời của học sinh: "${studentAnswer}"

YÊU CẦU:
1. Chấp nhận các cách đảo ngữ, từ đồng nghĩa hợp lệ, hoặc đảo trật tự trạng từ nếu đúng ngữ pháp.
2. Trả về DUY NHẤT 1 từ: "CORRECT" nếu đúng, hoặc "INCORRECT" nếu sai ngữ pháp/sai nghĩa. Không giải thích thêm.
`;

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: promptText }] }] })
        }
      );
      if (!res.ok) return false;
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
      return text.toUpperCase().includes("CORRECT") && !text.toUpperCase().includes("INCORRECT");
    } catch (e) {
      console.warn("[ExerciseEngine] Lỗi gọi AI phúc khảo ngầm:", e);
      return false;
    }
  }
}
