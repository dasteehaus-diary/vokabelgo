// ==========================================================================
// VokabelGo - Cloud Sync & Multi-User Authentication Engine
// ==========================================================================

(function() {
  let fbApp = null;
  let fbAuth = null;
  let fbDb = null;
  let fbRtdb = null;
  let currentUser = null;
  let cloudSyncTimeout = null;
  let isSyncing = false;

  // Khởi tạo Firebase
  function initFirebase() {
    if (!window.firebase) {
      console.warn('[VokabelGo Cloud] Thư viện Firebase SDK chưa được tải.');
      updateAuthUI();
      return false;
    }

    if (!window.isFirebaseConfigured()) {
      console.log('[VokabelGo Cloud] Firebase chưa được cấu hình. Hệ thống tiếp tục dùng chế độ Khách (Offline/LocalStorage).');
      updateAuthUI();
      return false;
    }

    try {
      const config = window.getFirebaseConfig();
      if (!firebase.apps.length) {
        fbApp = firebase.initializeApp(config);
      } else {
        fbApp = firebase.app();
      }
      fbAuth = firebase.auth();
      try {
        if (firebase.database) fbRtdb = firebase.database();
      } catch (e) {
        console.warn('Realtime DB init:', e);
      }
      try {
        if (firebase.firestore) fbDb = firebase.firestore();
      } catch (e) {
        console.warn('Firestore init:', e);
      }

      // Lắng nghe trạng thái đăng nhập
      fbAuth.onAuthStateChanged(handleAuthStateChanged);
      console.log('[VokabelGo Cloud] Khởi tạo Firebase thành công!');
      return true;
    } catch (err) {
      console.error('[VokabelGo Cloud] Lỗi khởi tạo Firebase:', err);
      updateAuthUI();
      return false;
    }
  }

  // Khi trạng thái đăng nhập thay đổi
  async function handleAuthStateChanged(user) {
    currentUser = user;
    updateAuthUI();

    if (user) {
      console.log('[VokabelGo Cloud] Người dùng đã đăng nhập:', user.email);
      // Nạp dữ liệu của người dùng từ Cloud
      await syncDownFromCloud(user);
    } else {
      console.log('[VokabelGo Cloud] Chưa đăng nhập (Chế độ Khách).');
    }
  }

  // Lấy dữ liệu tổng hợp hiện tại ở máy khách (Local)
  function getLocalDataPayload() {
    let currentCards = [];
    let currentProg = {};
    let currentProf = {};
    let checkinHist = [];

    try {
      if (typeof userCards !== 'undefined') currentCards = userCards;
      else currentCards = JSON.parse(localStorage.getItem('dmf_flash_user_cards_v2') || '[]');
    } catch (e) {}

    try {
      if (typeof progress !== 'undefined') currentProg = progress;
      else currentProg = JSON.parse(localStorage.getItem('dmf_flash_progress_v2') || '{}');
    } catch (e) {}

    try {
      if (typeof currentProfile !== 'undefined') currentProf = currentProfile;
      else currentProf = JSON.parse(localStorage.getItem('vokabelgo_user_profile') || '{"nickname":"Bạn học","avatarType":"v2","catId":12}');
    } catch (e) {}

    try {
      if (typeof getCheckinHistory === 'function') checkinHist = getCheckinHistory();
      else checkinHist = JSON.parse(localStorage.getItem('vokabelgo_checkin_history') || '[]');
    } catch (e) {}

    let dailyProg = null;
    try {
      if (window.VokabelDaily && typeof window.VokabelDaily.exportData === 'function') {
        dailyProg = window.VokabelDaily.exportData();
      } else {
        const dp = localStorage.getItem('vokabelgo_daily_progress_v1');
        if (dp) dailyProg = JSON.parse(dp);
      }
    } catch (e) {}

    return {
      profile: currentProf,
      progress: currentProg,
      dailyProgress: dailyProg,
      userCards: currentCards,
      checkinHistory: checkinHist,
      matchBest: matchBest,
      lastClientUpdate: new Date().toISOString()
    };
  }

  // Tải dữ liệu từ Cloud (hỗ trợ cả Realtime Database lẫn Firestore)
  async function syncDownFromCloud(user, force = false) {
    if (!user) return;
    setSyncBadge('syncing', 'Đang tải...');

    try {
      let cloudData = null;

      if (fbRtdb) {
        try {
          const snap = await fbRtdb.ref('users/' + user.uid).once('value');
          cloudData = snap.val();
        } catch (e) {
          console.warn('[VokabelGo Cloud] Realtime DB read error:', e);
        }
      }

      if (!cloudData && fbDb) {
        try {
          const userDocRef = fbDb.collection('users').doc(user.uid);
          const doc = await userDocRef.get();
          if (doc.exists) cloudData = doc.data();
        } catch (e) {
          console.warn('[VokabelGo Cloud] Firestore read error:', e);
        }
      }

      if (cloudData) {
        console.log('[VokabelGo Cloud] Dữ liệu tải từ Cloud:', cloudData);
        applyCloudDataToLocal(cloudData, user);
        setSyncBadge('synced', 'Đã đồng bộ');
        if (typeof showRetroToast === 'function') {
          showRetroToast(`Chào mừng ${cloudData.profile?.nickname || user.displayName || 'bạn học'}! Dữ liệu đã đồng bộ ☁️`, '😺');
        }
      } else {
        // Tài khoản mới toanh chưa có dữ liệu trên Cloud -> Tải dữ liệu Local hiện tại lên Cloud
        console.log('[VokabelGo Cloud] Tạo tài khoản mới trên Cloud, tải dữ liệu hiện tại lên...');
        const initialData = getLocalDataPayload();
        initialData.email = user.email || '';
        initialData.displayName = user.displayName || initialData.profile.nickname || 'Bạn học';
        initialData.lastSyncedAt = new Date().toISOString();

        if (fbRtdb) {
          try { await fbRtdb.ref('users/' + user.uid).set(initialData); } catch (e) {}
        }
        if (fbDb) {
          try { await fbDb.collection('users').doc(user.uid).set(initialData); } catch (e) {}
        }
        setSyncBadge('synced', 'Đã lưu');
        if (typeof showRetroToast === 'function') {
          showRetroToast('Đã lưu tiến độ học đầu tiên lên Cloud!', '☁️');
        }
      }
    } catch (err) {
      console.error('[VokabelGo Cloud] Lỗi tải dữ liệu Cloud:', err);
      setSyncBadge('error', 'Lỗi đồng bộ');
    }
  }

  // Ghi đè dữ liệu Cloud vào bộ nhớ và refresh UI
  function applyCloudDataToLocal(cloudData, user) {
    if (!cloudData) return;

    // 1. Hồ sơ cá nhân (Mèo đại diện, Tên)
    if (cloudData.profile && cloudData.profile.nickname) {
      if (typeof currentProfile !== 'undefined') {
        currentProfile = { ...currentProfile, ...cloudData.profile };
      }
      localStorage.setItem('vokabelgo_user_profile', JSON.stringify(cloudData.profile));
      if (typeof applyUserProfileUI === 'function') applyUserProfileUI();
    } else if (user && user.displayName) {
      if (typeof currentProfile !== 'undefined') {
        currentProfile.nickname = user.displayName;
      }
    }

    // 2. Tiến độ thẻ học (Progress)
    if (cloudData.progress) {
      if (typeof progress !== 'undefined') {
        progress = cloudData.progress;
      }
      localStorage.setItem('dmf_flash_progress_v2', JSON.stringify(cloudData.progress));
    }

    // 3. Thẻ do người dùng tạo
    if (cloudData.userCards && Array.isArray(cloudData.userCards)) {
      if (typeof userCards !== 'undefined') {
        userCards = cloudData.userCards;
      }
      localStorage.setItem('dmf_flash_user_cards_v2', JSON.stringify(cloudData.userCards));
    }

    // 4. Lịch sử điểm danh (Check-in history)
    if (cloudData.checkinHistory && Array.isArray(cloudData.checkinHistory)) {
      localStorage.setItem('vokabelgo_checkin_history', JSON.stringify(cloudData.checkinHistory));
    }

    // 5. Kỷ lục ghép cặp
    if (cloudData.matchBest) {
      localStorage.setItem('vokabelgo_match_best_sec', cloudData.matchBest);
    }

    // 6. Tiến độ học hàng ngày (Daily Progress & Streak Engine)
    if (cloudData.dailyProgress) {
      if (window.VokabelDaily && typeof window.VokabelDaily.importData === 'function') {
        window.VokabelDaily.importData(cloudData.dailyProgress);
      } else {
        try {
          localStorage.setItem('vokabelgo_daily_progress_v1', typeof cloudData.dailyProgress === 'string' ? cloudData.dailyProgress : JSON.stringify(cloudData.dailyProgress));
        } catch (e) {}
      }
    }

    // Cập nhật lại toàn bộ giao diện Web
    try {
      if (typeof refreshDecks === 'function') refreshDecks();
      if (typeof applyFilter === 'function') applyFilter();
      if (typeof updateStats === 'function') updateStats();
      if (typeof updateFeedUI === 'function') updateFeedUI();
      if (typeof renderCalendar === 'function') renderCalendar();
      if (typeof renderGuestbook === 'function') renderGuestbook();
      if (typeof renderManageList === 'function') renderManageList();
    } catch (e) {
      console.warn('[VokabelGo Cloud] Lỗi cập nhật giao diện sau khi sync:', e);
    }
  }

  // Đẩy dữ liệu Local lên Cloud (Debounced để tránh spam request)
  function triggerCloudSave() {
    if (!currentUser || (!fbRtdb && !fbDb)) return;

    setSyncBadge('syncing', 'Đang lưu...');
    clearTimeout(cloudSyncTimeout);
    cloudSyncTimeout = setTimeout(async () => {
      try {
        const payload = getLocalDataPayload();
        payload.lastSyncedAt = new Date().toISOString();

        if (fbRtdb) {
          await fbRtdb.ref('users/' + currentUser.uid).update(payload);
        }
        if (fbDb) {
          await fbDb.collection('users').doc(currentUser.uid).set(payload, { merge: true });
        }
        setSyncBadge('synced', 'Đã lưu');
        console.log('[VokabelGo Cloud] Đã lưu dữ liệu lên Cloud thành công.');
      } catch (err) {
        console.error('[VokabelGo Cloud] Lỗi lưu lên Cloud:', err);
        setSyncBadge('error', 'Lỗi lưu');
      }
    }, 1200);
  }

  // Cập nhật Badge trên Header
  function setSyncBadge(status, text) {
    const iconEl = document.getElementById('authSyncIcon');
    const textEl = document.getElementById('authStatusText');
    const badgeEl = document.getElementById('openAuthBtn');

    if (!iconEl || !textEl || !badgeEl) return;

    badgeEl.classList.remove('is-logged-in', 'is-syncing', 'is-error', 'is-guest');

    if (currentUser) {
      badgeEl.classList.add('is-logged-in');
      const shortName = currentUser.displayName || (currentUser.email ? currentUser.email.split('@')[0] : 'Đã đăng nhập');

      if (status === 'syncing') {
        badgeEl.classList.add('is-syncing');
        iconEl.textContent = '🔄';
        textEl.textContent = text || 'Đang lưu...';
      } else if (status === 'error') {
        badgeEl.classList.add('is-error');
        iconEl.textContent = '⚠️';
        textEl.textContent = text || 'Lỗi mạng';
      } else {
        iconEl.textContent = '☁️';
        textEl.textContent = shortName;
      }
    } else {
      badgeEl.classList.add('is-guest');
      iconEl.textContent = '🔑';
      textEl.textContent = 'Đăng nhập';
    }
  }

  // Cập nhật giao diện toàn thể
  function updateAuthUI() {
    setSyncBadge('idle', '');

    const loggedOutSection = document.getElementById('authLoggedOutView');
    const loggedInSection = document.getElementById('authLoggedInView');
    const modalTitle = document.getElementById('authModalTitle');

    if (currentUser) {
      if (loggedOutSection) loggedOutSection.classList.add('hidden');
      if (loggedInSection) loggedInSection.classList.remove('hidden');
      if (modalTitle) modalTitle.textContent = 'Tài Khoản & Đồng Bộ Cloud';

      // Cập nhật thông tin người dùng trong modal
      const emailEl = document.getElementById('authProfileEmail');
      const nameEl = document.getElementById('authProfileName');
      const avatarEl = document.getElementById('authProfileAvatar');
      const syncTimeEl = document.getElementById('authLastSyncTime');

      if (emailEl) emailEl.textContent = currentUser.email || 'Tài khoản không email';
      if (nameEl) nameEl.textContent = currentUser.displayName || (typeof currentProfile !== 'undefined' ? currentProfile.nickname : 'Bạn học');
      if (avatarEl && typeof getAvatarSrc === 'function' && typeof currentProfile !== 'undefined') {
        avatarEl.src = getAvatarSrc(currentProfile.avatarType, currentProfile.catId);
      }
      if (syncTimeEl) syncTimeEl.textContent = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    } else {
      if (loggedOutSection) loggedOutSection.classList.remove('hidden');
      if (loggedInSection) loggedInSection.classList.add('hidden');
      if (modalTitle) modalTitle.textContent = 'Đăng Nhập Tài Khoản Học';
    }
  }

  // Giao diện mở/đóng modal Auth
  window.openAuthModal = function() {
    const modal = document.getElementById('authModal');
    if (!modal) return;

    if (!window.isFirebaseConfigured()) {
      // Nếu chưa cấu hình Firebase, gợi ý mở bảng cấu hình
      openFirebaseConfigModal(true);
      return;
    }

    updateAuthUI();
    modal.classList.remove('hidden');
  };

  window.closeAuthModal = function() {
    const modal = document.getElementById('authModal');
    if (modal) modal.classList.add('hidden');
  };

  // Mở/Đóng Modal Cấu hình Firebase
  window.openFirebaseConfigModal = function(showNotice = false) {
    const modal = document.getElementById('firebaseConfigModal');
    if (!modal) return;

    const noticeEl = document.getElementById('firebaseConfigNotice');
    if (noticeEl) {
      noticeEl.style.display = showNotice ? 'block' : 'none';
    }

    const input = document.getElementById('firebaseConfigJsonInput');
    if (input) {
      const current = window.getFirebaseConfig();
      if (current && current.apiKey) {
        input.value = JSON.stringify(current, null, 2);
      } else {
        input.value = '';
      }
    }

    modal.classList.remove('hidden');
  };

  window.closeFirebaseConfigModal = function() {
    const modal = document.getElementById('firebaseConfigModal');
    if (modal) modal.classList.add('hidden');
  };

  // Lưu cấu hình Firebase người dùng dán vào
  window.saveFirebaseConfigFromInput = function() {
    const input = document.getElementById('firebaseConfigJsonInput');
    const errEl = document.getElementById('firebaseConfigError');
    if (errEl) errEl.textContent = '';

    if (!input || !input.value.trim()) {
      if (errEl) errEl.textContent = 'Vui lòng dán mã cấu hình Firebase vào ô bên dưới!';
      return;
    }

    let raw = input.value.trim();
    let configObj = null;

    // Cho phép người dùng dán cả đoạn const firebaseConfig = { ... };
    try {
      if (raw.includes('{') && raw.includes('}')) {
        let jsonPart = raw.substring(raw.indexOf('{'), raw.lastIndexOf('}') + 1);
        // Sửa các key chưa có dấu ngoặc kép nếu người dùng paste JS object thuần
        jsonPart = jsonPart.replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2": ');
        // Thay nháy đơn bằng nháy kép
        jsonPart = jsonPart.replace(/'([^']*)'/g, '"$1"');
        configObj = JSON.parse(jsonPart);
      }
    } catch (e) {
      try {
        // Thử eval an toàn nếu JSON.parse không bắt được
        const fn = new Function('return ' + raw.replace(/^const\s+[a-zA-Z0-9_]+\s*=\s*/, ''));
        configObj = fn();
      } catch (err2) {
        if (errEl) errEl.textContent = 'Mã cấu hình không đúng định dạng JSON/JS. Vui lòng kiểm tra lại!';
        return;
      }
    }

    if (!configObj || !configObj.apiKey || !configObj.projectId) {
      if (errEl) errEl.textContent = 'Thiếu thông tin apiKey hoặc projectId trong cấu hình!';
      return;
    }

    localStorage.setItem('vokabelgo_custom_firebase_config', JSON.stringify(configObj));
    closeFirebaseConfigModal();
    if (typeof showRetroToast === 'function') {
      showRetroToast('Đã lưu cấu hình Firebase! Đang khởi động lại...', '⚙️');
    }

    setTimeout(() => {
      window.location.reload();
    }, 800);
  };

  // Đăng nhập Email / Mật khẩu
  window.handleEmailAuth = async function(mode) {
    const emailInput = document.getElementById('authEmailInput');
    const passInput = document.getElementById('authPasswordInput');
    const nameInput = document.getElementById('authNameInput');
    const errEl = document.getElementById('authFormError');

    if (errEl) errEl.textContent = '';

    const email = emailInput ? emailInput.value.trim() : '';
    const pass = passInput ? passInput.value : '';
    const name = nameInput ? nameInput.value.trim() : '';

    if (!email || !pass) {
      if (errEl) errEl.textContent = 'Vui lòng nhập đầy đủ Email và Mật khẩu!';
      return;
    }

    if (pass.length < 6) {
      if (errEl) errEl.textContent = 'Mật khẩu phải có ít nhất 6 ký tự!';
      return;
    }

    if (!fbAuth) {
      if (errEl) errEl.textContent = 'Firebase chưa được khởi tạo. Vui lòng kiểm tra cài đặt Firebase!';
      return;
    }

    try {
      if (mode === 'register') {
        const userCred = await fbAuth.createUserWithEmailAndPassword(email, pass);
        if (name && userCred.user) {
          await userCred.user.updateProfile({ displayName: name });
        }
        if (typeof showRetroToast === 'function') {
          showRetroToast('Đăng ký tài khoản thành công! 🎉', '✨');
        }
        closeAuthModal();
      } else {
        await fbAuth.signInWithEmailAndPassword(email, pass);
        if (typeof showRetroToast === 'function') {
          showRetroToast('Đăng nhập thành công! 💖', '✨');
        }
        closeAuthModal();
      }
    } catch (err) {
      console.error('[VokabelGo Cloud] Auth Error:', err);
      let msg = err.message;
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        msg = 'Sai email hoặc mật khẩu. Vui lòng thử lại!';
      } else if (err.code === 'auth/email-already-in-use') {
        msg = 'Email này đã được đăng ký. Bạn hãy chuyển sang tab "Đăng nhập"!';
      } else if (err.code === 'auth/invalid-email') {
        msg = 'Địa chỉ email không hợp lệ!';
      }
      if (errEl) errEl.textContent = msg;
    }
  };

  // Đăng nhập bằng Google
  window.handleGoogleAuth = async function() {
    const errEl = document.getElementById('authFormError');
    if (errEl) errEl.textContent = '';

    if (!fbAuth) {
      if (errEl) errEl.textContent = 'Firebase chưa được kích hoạt.';
      return;
    }

    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      await fbAuth.signInWithPopup(provider);
      if (typeof showRetroToast === 'function') {
        showRetroToast('Đăng nhập Google thành công! 🌟', '✨');
      }
      closeAuthModal();
    } catch (err) {
      console.error('[VokabelGo Cloud] Google Auth Error:', err);
      if (err.code !== 'auth/popup-closed-by-user') {
        if (errEl) errEl.textContent = 'Lỗi đăng nhập Google: ' + err.message;
      }
    }
  };

  // Quên mật khẩu
  window.handleForgotPassword = async function() {
    const emailInput = document.getElementById('authEmailInput');
    const errEl = document.getElementById('authFormError');
    if (errEl) errEl.textContent = '';

    const email = emailInput ? emailInput.value.trim() : '';
    if (!email) {
      if (errEl) errEl.textContent = 'Vui lòng nhập email vào ô trên rồi bấm Quên mật khẩu!';
      return;
    }

    try {
      await fbAuth.sendPasswordResetEmail(email);
      alert(`Đã gửi liên kết đặt lại mật khẩu đến ${email}. Hãy kiểm tra hòm thư của bạn!`);
    } catch (err) {
      if (errEl) errEl.textContent = 'Lỗi gửi email: ' + err.message;
    }
  };

  // Đăng xuất
  window.handleAuthLogout = async function() {
    if (!confirm('Bạn có chắc muốn đăng xuất? Tiến độ học đã được lưu an toàn trên Cloud.')) {
      return;
    }

    try {
      if (fbAuth) await fbAuth.signOut();
      closeAuthModal();

      // Reset dữ liệu về trạng thái Khách sạch để người khác vào máy này có không gian học riêng
      localStorage.removeItem('dmf_flash_progress_v2');
      localStorage.removeItem('vokabelgo_checkin_history');
      localStorage.removeItem('vokabelgo_user_profile');
      
      if (typeof progress !== 'undefined') progress = {};
      if (typeof currentProfile !== 'undefined') {
        currentProfile = { nickname: 'Bạn học', avatarType: 'v2', catId: 12 };
      }

      if (typeof updateStats === 'function') updateStats();
      if (typeof applyUserProfileUI === 'function') applyUserProfileUI();
      if (typeof renderCalendar === 'function') renderCalendar();
      if (typeof renderGuestbook === 'function') renderGuestbook();
      if (typeof applyFilter === 'function') applyFilter();

      if (typeof showRetroToast === 'function') {
        showRetroToast('Đã đăng xuất! Bạn đang ở chế độ Khách.', '👋');
      }
    } catch (err) {
      console.error('[VokabelGo Cloud] Logout Error:', err);
    }
  };

  // Đồng bộ thủ công ngay lập tức
  window.manualSyncCloud = function() {
    if (!currentUser) return;
    triggerCloudSave();
    if (typeof showRetroToast === 'function') {
      showRetroToast('Đang đồng bộ dữ liệu lên Cloud...', '🔄');
    }
  };

  // Chuyển tab Đăng nhập / Đăng ký
  let currentAuthTab = 'login';
  window.switchAuthTab = function(tab) {
    currentAuthTab = tab;
    const tabLogin = document.getElementById('authTabLogin');
    const tabReg = document.getElementById('authTabRegister');
    const nameField = document.getElementById('authNameField');
    const submitBtn = document.getElementById('authSubmitBtn');
    const errEl = document.getElementById('authFormError');
    if (errEl) errEl.textContent = '';

    if (tab === 'register') {
      if (tabReg) tabReg.classList.add('active');
      if (tabLogin) tabLogin.classList.remove('active');
      if (nameField) nameField.classList.remove('hidden');
      if (submitBtn) submitBtn.textContent = 'Tạo Tài Khoản Mới ✨';
    } else {
      if (tabLogin) tabLogin.classList.add('active');
      if (tabReg) tabReg.classList.remove('active');
      if (nameField) nameField.classList.add('hidden');
      if (submitBtn) submitBtn.textContent = 'Đăng Nhập ➔';
    }
  };

  window.submitAuthForm = function() {
    window.handleEmailAuth(currentAuthTab);
  };

  // Hook vào các hàm lưu cục bộ của trang web
  window.onLocalDataChanged = function(source) {
    if (currentUser) {
      triggerCloudSave();
    }
  };

  // Khởi động khi tải xong trang
  window.addEventListener('DOMContentLoaded', () => {
    initFirebase();
  });

  // Hỗ trợ nếu DOMContentLoaded đã chạy qua
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(initFirebase, 100);
  }
})();
