/* ==========================================
   T.I.M.E.S SYSTEM - INITIALIZATION & THEME
   ========================================== */

document.addEventListener('DOMContentLoaded', () => {
    loadSystemSettings();

    // Override .value setter to sync with flatpickr khi gán giá trị bằng JS
    const originalDescriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
    Object.defineProperty(HTMLInputElement.prototype, 'value', {
        get: function () {
            return originalDescriptor.get.call(this);
        },
        set: function (val) {
            originalDescriptor.set.call(this, val);
            if (this._flatpickr && !this._isSyncingFlatpickr) {
                this._isSyncingFlatpickr = true;
                try {
                    this._flatpickr.setDate(val, false);
                } finally {
                    this._isSyncingFlatpickr = false;
                }
            }
        }
    });

    // Khởi tạo flatpickr trên tất cả các input type date
    document.querySelectorAll('input[type="date"]').forEach(el => {
        flatpickr(el, {
            dateFormat: "Y-m-d",
            altInput: true,
            altFormat: "d/m/Y",
            locale: "vn",
            disableMobile: true,
            allowInput: true,
            onReady: function (_selectedDates, _dateStr, instance) {
                // Truyền class của input gốc sang altInput để CSS có thể target đúng
                if (instance.altInput && el.classList.length > 0) {
                    el.classList.forEach(c => instance.altInput.classList.add(c));
                }
            }
        });
    });

    if (typeof initServerConfigModal === 'function') {
        initServerConfigModal();
    }
});

window.initServerConfigModal = function() {
    const btnOpen = document.getElementById('btn-open-server-config');
    const modal = document.getElementById('modal-server-config');
    const btnClose = document.getElementById('btn-close-server-config');
    const inpUrl = document.getElementById('input-custom-api-url');
    const btnSave = document.getElementById('btn-save-server-url');
    const btnReset = document.getElementById('btn-reset-server-url');
    const btnTest = document.getElementById('btn-test-server-url');
    const testResult = document.getElementById('server-test-result');

    if (!modal || !btnOpen) return;

    btnOpen.onclick = function() {
        if (inpUrl) inpUrl.value = (window.getApiUrl ? window.getApiUrl() : localStorage.getItem('times_custom_api_url') || 'https://script.google.com/macros/s/AKfycby_u0aZVhVVtCoIKXoSqguWh7eViLR9i7xP2pZgn_nHyHoq44z_kDdOIU2Ug-Y6_sowNw/exec');
        if (testResult) testResult.style.display = 'none';
        modal.style.display = 'flex';
    };

    if (btnClose) btnClose.onclick = () => { modal.style.display = 'none'; };

    if (btnSave) btnSave.onclick = function() {
        const val = inpUrl ? inpUrl.value.trim() : '';
        if (!val.startsWith('https://script.google.com/macros/s/')) {
            alert('Đường dẫn không hợp lệ! Vui lòng nhập link Web App Google Apps Script có dạng: https://script.google.com/macros/s/.../exec');
            return;
        }
        if (window.setCustomApiUrl) window.setCustomApiUrl(val);
        else localStorage.setItem('times_custom_api_url', val);
        alert('✅ Đã lưu cấu hình máy chủ mới! Ứng dụng sẽ tự động tải lại.');
        window.location.reload();
    };

    if (btnReset) btnReset.onclick = function() {
        if (confirm('Khôi phục về địa chỉ máy chủ mặc định?')) {
            if (window.setCustomApiUrl) window.setCustomApiUrl('');
            else localStorage.removeItem('times_custom_api_url');
            alert('✅ Đã khôi phục về máy chủ mặc định!');
            window.location.reload();
        }
    };

    if (btnTest) btnTest.onclick = async function() {
        const val = inpUrl ? inpUrl.value.trim() : '';
        if (!val) return;
        if (testResult) {
            testResult.style.display = 'block';
            testResult.style.background = '#fef9e7';
            testResult.style.color = '#d35400';
            testResult.innerText = '⏳ Đang kiểm tra kết nối tới máy chủ...';
        }
        try {
            const res = await fetch(val + '?action=getDataVersion&args=%5B%5D', {
                method: 'GET',
                mode: 'cors',
                credentials: 'omit',
                redirect: 'follow'
            });
            if (res.ok) {
                const data = await res.json();
                if (data && data.status === 'success') {
                    if (testResult) {
                        testResult.style.background = '#eafaf1';
                        testResult.style.color = '#27ae60';
                        testResult.innerText = '✅ Kết nối thành công! Máy chủ phản hồi HTTP 200 OK.';
                    }
                    return;
                }
            }
            throw new Error('Máy chủ trả về trạng thái ' + res.status);
        } catch (e) {
            if (testResult) {
                testResult.style.background = '#fdedec';
                testResult.style.color = '#c0392b';
                testResult.innerText = '❌ Không thể kết nối: ' + e.message + '. Vui lòng kiểm tra quyền Anyone (Bất kỳ ai).';
            }
        }
    };
};

window.dataCacheTime = window.dataCacheTime || {};

window.loadTimRanhDataFromServer = function () {
    const statusEl = document.getElementById('utils-file-status');
    if (statusEl) {
        statusEl.innerText = '⏳ Đang kết nối máy chủ để lấy dữ liệu Tìm Rảnh chung...';
        statusEl.style.color = '#f39c12';
    }

    google.script.run
        .withSuccessHandler(data => {
            if (data && data.length > 0) {
                window.externalUtilsData = data;
                if (statusEl) {
                    statusEl.innerText = `✅ Đã tải ${data.length} ca dùng chung từ máy chủ (Sheet TimRanh)!`;
                    statusEl.style.color = '#27ae60';
                }
            } else if (statusEl) {
                statusEl.innerText = '(Chưa có dữ liệu chung. Đang dùng: Lịch phần mềm xếp)';
                statusEl.style.color = '#e67e22';
            }
        })
        .withFailureHandler(err => {
            if (statusEl) {
                statusEl.innerText = 'Không tải được dữ liệu Tìm Rảnh: ' + err;
                statusEl.style.color = '#c0392b';
            }
        })
        .getTimRanhData();
};

window.doLogin = function () {
    const user = document.getElementById('login-user')?.value || '';
    const pass = document.getElementById('login-pass')?.value || '';
    const errDiv = document.getElementById('login-error');
    const btn = document.getElementById('btn-do-login');

    if (!user || !pass) {
        if (errDiv) {
            errDiv.innerText = 'Vui lòng nhập đủ thông tin!';
            errDiv.style.display = 'block';
        }
        return;
    }

    if (btn) {
        btn.innerText = 'Đang kiểm tra...';
        btn.disabled = true;
    }

    google.script.run
        .withSuccessHandler(res => {
            if (res && res.success) {
                localStorage.setItem('meds_session', JSON.stringify({
                    username: res.username,
                    role: res.role,
                    permissions: res.permissions,
                    sessionId: res.sessionId
                }));

                const overlay = document.getElementById('login-overlay');
                if (overlay) overlay.style.display = 'none';
                if (typeof updateLogoutButton === 'function') updateLogoutButton(res.username);
                if (typeof applyPermissions === 'function') applyPermissions(res.role, res.permissions);

                let targetTab = 'tab-home';
                if (window.location.hash && window.location.hash.startsWith('#tab-')) {
                    targetTab = window.location.hash.substring(1);
                }
                const tabBtn = document.querySelector(`.nav-tab[data-tab="${targetTab}"]`) || document.querySelector(`.nav-item[data-tab="${targetTab}"]`);
                if (tabBtn) {
                    tabBtn.click();
                } else {
                    document.querySelector('.nav-tab[data-tab="tab-home"]')?.click();
                }
                if (res.role === 'Admin' && typeof loadAccounts === 'function') loadAccounts();
            } else {
                if (errDiv) {
                    errDiv.innerText = (res && res.message) ? res.message : 'Sai tài khoản hoặc mật khẩu!';
                    errDiv.style.display = 'block';
                }
                if (btn) {
                    btn.innerText = 'Đăng Nhập ➔';
                    btn.disabled = false;
                }
            }
        })
        .withFailureHandler(err => {
            if (errDiv) {
                errDiv.innerText = 'Lỗi kết nối máy chủ: ' + err;
                errDiv.style.display = 'block';
            }
            if (btn) {
                btn.innerText = 'Đăng Nhập ➔';
                btn.disabled = false;
            }
        })
        .verifyLogin(user, pass);
};