/**
 * js/auth-lock.js - HỆ THỐNG PHÂN QUYỀN FREEMIUM & LÁ CHẮN TƯƠNG TÁC TỰ ĐỘNG
 * Trạm IELTS - Cho phép xem đề thi, chặn ngay khi bấm vào ô làm bài / lựa chọn / nộp bài
 */

const AUTH_STORAGE_KEYS = {
  STUDENT_ID: 'tram_student_id',
  ACCESS_STATUS: 'tram_access_status', // 'active' | 'locked'
  ADMIN_SECRET: 'phuc_tramielts'
};

class AuthLockSystem {
  constructor() {
    this.studentId = this.getOrCreateStudentID();
    this.initAdminBar();
    this.injectConversionModal();
    this.activateUniversalInteractionBarrier(); // Kích hoạt lá chắn tự động
  }

  // 1. Tự sinh hoặc lấy mã học viên TR-xxxx
  getOrCreateStudentID() {
    let id = localStorage.getItem(AUTH_STORAGE_KEYS.STUDENT_ID);
    if (!id) {
      const randNum = Math.floor(1000 + Math.random() * 9000);
      id = `TR-${randNum}`;
      localStorage.setItem(AUTH_STORAGE_KEYS.STUDENT_ID, id);
    }
    return id;
  }

  // 2. Kiểm tra học sinh đã được duyệt quyền chưa
  isStudentActive() {
    const email = (localStorage.getItem('ielts_student_email') || '').toLowerCase();
    if (email.includes('admin') || email.includes('tramielts9@gmail.com') || email.includes('dinhnguyenphuc019.2@gmail.com')) {
      return true;
    }
    return localStorage.getItem(AUTH_STORAGE_KEYS.ACCESS_STATUS) === 'active';
  }

  // 3. Khóa chuyển đổi (Execution Lock) - Chặn hành động và bung Modal Zalo
  enforceLock(actionName = "Bài tập & Chấm thi AI") {
    if (this.isStudentActive()) return true;
    this.showConversionModal(actionName);
    return false;
  }

  // 4. LÁ CHẮN TỰ ĐỘNG TOÀN SÀN: Bắt mọi cú click vào ô làm bài / trắc nghiệm / nộp bài
  activateUniversalInteractionBarrier() {
    if (this.isStudentActive()) return;

    // Danh sách selector cần chặn khi chưa kích hoạt
    const interactiveSelectors = [
      'input:not([id*="admin"]):not([id*="login"]):not([id*="search"])',
      'textarea:not([id*="admin"])',
      'select:not([id*="admin"])',
      '.choice-btn',
      '.option-btn',
      '.btn-submit',
      '.btn-submit-grading',
      '.btn-full-submit',
      '#btnSubmitGrading',
      '#btnStartGrading',
      '#btnBottomSubmit',
      '#recBtn'
    ].join(',');

    const blockEvent = (e) => {
      if (this.isStudentActive()) return;

      const target = e.target.closest(interactiveSelectors);
      if (target) {
        // Chặn hoàn toàn không cho gõ phím / chọn đáp án / submit
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        if (typeof target.blur === 'function') target.blur();

        let featureName = "Làm bài tập";
        if (target.tagName === 'TEXTAREA') featureName = "Viết bài luận / Trả lời";
        else if (target.type === 'radio' || target.classList.contains('choice-btn')) featureName = "Chọn đáp án trắc nghiệm";
        else if (target.id === 'recBtn') featureName = "Phòng thu âm Speaking";
        else if (target.innerText && (target.innerText.includes('Chấm') || target.innerText.includes('Nộp'))) featureName = "Chấm điểm & Sửa bài AI";

        this.showConversionModal(featureName);
      }
    };

    // Bắt sự kiện từ gốc (Capture Phase) để chặn trước khi logic bài thi kịp chạy
    document.addEventListener('pointerdown', blockEvent, true);
    document.addEventListener('focusin', blockEvent, true);
    document.addEventListener('keydown', (e) => {
      if (this.isStudentActive()) return;
      if (e.target.closest(interactiveSelectors)) {
        e.preventDefault();
        e.stopPropagation();
        this.showConversionModal("Làm bài tập");
      }
    }, true);
  }

  // 5. Modal Zalo Onboarding
  injectConversionModal() {
    if (document.getElementById('zaloConversionModal')) return;

    const modalHtml = `
      <div id="zaloConversionModal" style="display:none; position:fixed; inset:0; z-index:999999; background:rgba(15, 23, 42, 0.75); backdrop-filter:blur(6px); align-items:center; justify-content:center; padding:16px;">
        <div style="background:#FFFFFF; border:3px solid #E8E2D8; border-bottom:7px solid #D3CBC0; border-radius:26px; max-width:440px; width:100%; padding:26px 22px; text-align:center; position:relative; box-shadow:0 20px 40px rgba(0,0,0,0.3); font-family:'Plus Jakarta Sans', system-ui, sans-serif;">
          
          <button type="button" onclick="window.authLockSystem.hideConversionModal()" style="position:absolute; top:14px; right:16px; background:#F1ECE6; border:none; width:34px; height:34px; border-radius:50%; font-weight:900; color:#7E7672; cursor:pointer; font-size:16px;">✕</button>

          <div style="width:60px; height:60px; border-radius:50%; background:#FFF4E5; border:3px solid #FCD34D; display:flex; align-items:center; justify-content:center; margin:0 auto 12px auto; font-size:26px;">
            🔒
          </div>

          <h3 style="margin:0 0 6px 0; color:#8B1518; font-size:19px; font-weight:900;">
            KÍCH HOẠT QUYỀN HỌC VIÊN
          </h3>
          <p id="lockFeatureNotice" style="margin:0 0 16px 0; font-size:13px; font-weight:700; color:#64748B;">
            Tính năng này yêu cầu tài khoản đã được phê duyệt lộ trình.
          </p>

          <div style="background:#F0F9FF; border:2px dashed #0284C7; border-radius:14px; padding:10px 14px; margin-bottom:16px;">
            <div style="font-size:11.5px; font-weight:800; color:#0369A1; text-transform:uppercase;">Mã Học Viên Của Em</div>
            <div style="display:flex; align-items:center; justify-content:center; gap:8px; margin-top:2px;">
              <span id="lockStudentIdDisplay" style="font-size:22px; font-weight:900; color:#0C4A6E; letter-spacing:1px;">${this.studentId}</span>
              <button type="button" onclick="window.authLockSystem.copyStudentId()" style="background:#0284C7; color:white; border:none; padding:4px 8px; border-radius:6px; font-size:11px; font-weight:800; cursor:pointer;">Copy</button>
            </div>
          </div>

          <!-- ẢNH QR ZALO -->
          <div style="margin-bottom:16px;">
            <div style="font-size:12.5px; font-weight:800; color:#334155; margin-bottom:8px;">Quét mã QR Zalo Thầy Phúc để mở quyền:</div>
            <img src="assets/zalo-qr.png" onerror="this.onerror=null; this.src='../assets/zalo-qr.png';" alt="QR Zalo Thầy Phúc" style="width:170px; height:170px; border-radius:14px; border:2px solid #E8E2D8; object-fit:cover; margin:0 auto; display:block;">
          </div>

          <a id="btnOpenZaloApp" href="https://zalo.me/0967561243" target="_blank" style="background:#0068FF; color:#FFFFFF; text-decoration:none; padding:13px 20px; border-radius:14px; font-weight:900; font-size:14.5px; display:flex; align-items:center; justify-content:center; gap:8px; border-bottom:4px solid #004EC4; margin-bottom:12px;">
            Nhắn Zalo Cho Thầy Kích Hoạt
          </a>

          <div style="font-size:12px; font-weight:700; color:#64748B;">
            Thầy đã duyệt tài khoản của em? 
            <a href="javascript:location.reload()" style="color:#8B1518; font-weight:900; text-decoration:underline;">Tải lại trang</a>
          </div>

        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
  }

  showConversionModal(featureName) {
    const modal = document.getElementById('zaloConversionModal');
    const notice = document.getElementById('lockFeatureNotice');
    if (notice) notice.innerHTML = `Để làm <b>${featureName}</b> và nhận AI sửa bài, em hãy gửi mã học viên cho thầy nhé!`;
    if (modal) modal.style.display = 'flex';
  }

  hideConversionModal() {
    const modal = document.getElementById('zaloConversionModal');
    if (modal) modal.style.display = 'none';
  }

  copyStudentId() {
    navigator.clipboard.writeText(this.studentId).then(() => {
      alert(`Đã copy mã học viên: ${this.studentId}`);
    });
  }

  // 6. Thanh Admin nổi (chỉ hiện khi có ?admin= trên URL)
  initAdminBar() {
    const params = new URLSearchParams(window.location.search);
    if (!params.has('admin')) return;

    const barHtml = `
      <div id="floatingAdminBar" style="position:fixed; bottom:0; left:0; right:0; z-index:9999999; background:#0F172A; color:#FFFFFF; border-top:3px solid #D97706; padding:10px 18px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; font-family:monospace; font-size:13px; box-shadow:0 -4px 20px rgba(0,0,0,0.4);">
        <div style="display:flex; align-items:center; gap:10px;">
          <span style="background:#D97706; color:white; padding:3px 8px; border-radius:6px; font-weight:bold;">🛠️ TRẠM ADMIN TOOLBAR</span>
          <span>Mã tab hiện tại: <b style="color:#38BDF8;">${this.studentId}</b></span>
        </div>

        <div style="display:flex; align-items:center; gap:8px;">
          <input type="text" id="adminInputStudentCode" value="${this.studentId}" placeholder="Nhập mã TR-xxxx..." style="background:#1E293B; border:1px solid #475569; color:#FFFFFF; padding:6px 10px; border-radius:8px; outline:none; font-family:inherit; width:130px; font-weight:bold;">
          
          <button type="button" onclick="window.authLockSystem.adminSetStudentStatus('active')" style="background:#16A34A; color:white; border:none; padding:6px 14px; border-radius:8px; font-weight:bold; cursor:pointer;">
            ✓ Duyệt Active
          </button>

          <button type="button" onclick="window.authLockSystem.adminSetStudentStatus('locked')" style="background:#EF4444; color:white; border:none; padding:6px 14px; border-radius:8px; font-weight:bold; cursor:pointer;">
            🔒 Khóa Lại
          </button>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', barHtml);
  }

  adminSetStudentStatus(status) {
    const code = document.getElementById('adminInputStudentCode')?.value.trim() || this.studentId;
    if (code === this.studentId) {
      localStorage.setItem(AUTH_STORAGE_KEYS.ACCESS_STATUS, status);
      alert(`Đã cập nhật mã [${code}] sang trạng thái: ${status.toUpperCase()}`);
      location.reload();
    } else {
      alert(`Đã gửi lệnh cập nhật mã [${code}] ➔ ${status.toUpperCase()}`);
    }
  }
}

export const authLockSystem = new AuthLockSystem();
window.authLockSystem = authLockSystem;
