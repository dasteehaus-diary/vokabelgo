// ==============================================================================
// VokabelGo - Supabase Cloud Sync & Authentication Engine
// ==============================================================================

(function() {
  let sbClient = null;
  let currentUser = null;
  let cloudSyncTimeout = null;
  let isSyncing = false;

  // Khởi tạo Supabase Client
  function initSupabase() {
    if (!window.supabase || typeof window.supabase.createClient !== 'function') {
      console.warn('[VokabelGo Cloud] Thư viện @supabase/supabase-js chưa sẵn sàng.');
      updateAuthUI();
      return false;
    }

    if (!window.isSupabaseConfigured()) {
      console.log('[VokabelGo Cloud] Supabase chưa được cấu hình. Ứng dụng chạy ở chế độ Khách (Offline/LocalStorage).');
      updateAuthUI();
      return false;
    }

    try {
      const config = window.getSupabaseConfig();
      sbClient = window.supabase.createClient(config.url, config.anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      });

      // Lắng nghe thay đổi trạng thái xác thực
      sbClient.auth.onAuthStateChange((event, session) => {
        handleAuthStateChanged(session ? session.user : null);
      });

      console.log('[VokabelGo Cloud] Khởi tạo Supabase thành công!');
      return true;
    } catch (err) {
      console.error('[VokabelGo Cloud] Lỗi khởi tạo Supabase:', err);
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
      await syncDownFromCloud(user);
    } else {
      console.log('[VokabelGo Cloud] Trạng thái: Chưa đăng nhập (Chế độ khách)');
    }
  }

  // Cập nhật giao diện Trạng thái Đăng nhập trên thanh công cụ & Modal
  function updateAuthUI() {
    const statusBtn = document.getElementById('cloudAuthStatusBtn');
    const statusText = document.getElementById('cloudAuthStatusText');
    const loggedInView = document.getElementById('authLoggedInView');
    const loggedOutView = document.getElementById('authLoggedOutView');
    const profileNameEl = document.getElementById('authProfileName');
    const profileEmailEl = document.getElementById('authProfileEmail');
    const profileAvatarEl = document.getElementById('authProfileAvatar');

    const isConfigured = window.isSupabaseConfigured();

    if (currentUser) {
      // Đã đăng nhập
      if (statusBtn) {
        statusBtn.classList.add('is-authenticated');
        statusBtn.title = 'Tài khoản: ' + (currentUser.email || 'Học viên');
      }
      if (statusText) {
        const metaName = currentUser.user_metadata?.display_name || currentUser.user_metadata?.full_name;
        statusText.textContent = metaName || (currentUser.email ? currentUser.email.split('@')[0] : 'Đã kết nối');
      }

      if (loggedInView) loggedInView.classList.remove('hidden');
      if (loggedOutView) loggedOutView.classList.add('hidden');

      const metaName = currentUser.user_metadata?.display_name || currentUser.user_metadata?.full_name || 'Bạn học';
      if (profileNameEl) profileNameEl.textContent = metaName;
      if (profileEmailEl) profileEmailEl.textContent = currentUser.email || '';

      const savedProf = getLocalUserProfile();
      if (profileAvatarEl && savedProf && savedProf.avatarType && savedProf.catId) {
        profileAvatarEl.src = `img/avatars/${savedProf.avatarType}/cat_${String(savedProf.catId).padStart(2, '0')}.png`;
      }
    } else {
      // Chưa đăng nhập
      if (statusBtn) {
        statusBtn.classList.remove('is-authenticated');
        statusBtn.title = isConfigured ? 'Nhấn để Đăng nhập hoặc Tạo tài khoản' : 'Nhấn để Cấu hình Supabase';
      }
      if (statusText) {
        statusText.textContent = isConfigured ? 'Đăng nhập' : 'Cấu hình Cloud';
      }

      if (loggedInView) loggedInView.classList.add('hidden');
      if (loggedOutView) loggedOutView.classList.remove('hidden');
    }
  }

  // Đọc profile người dùng cục bộ
  function getLocalUserProfile() {
    try {
      const saved = localStorage.getItem('vokabelgo_user_profile');
      return saved ? JSON.parse(saved) : { nickname: 'Bạn học', avatarType: 'v2', catId: 12 };
    } catch (e) {
      return { nickname: 'Bạn học', avatarType: 'v2', catId: 12 };
    }
  }

  // Gom toàn bộ tiến độ học hiện tại để lưu
  function getFullStudyPayload() {
    let currentProg = {};
    try {
      const p = localStorage.getItem('dmf_flash_progress_v2');
      if (p) currentProg = JSON.parse(p);
    } catch (e) {}

    let checkinHist = [];
    try {
      const c = localStorage.getItem('vokabelgo_checkin_history');
      if (c) checkinHist = JSON.parse(c);
    } catch (e) {}

    let userCards = [];
    try {
      const u = localStorage.getItem('dmf_custom_cards');
      if (u) userCards = JSON.parse(u);
    } catch (e) {}

    let matchBest = 0;
    try {
      matchBest = parseInt(localStorage.getItem('vokabelgo_match_best_score') || '0', 10);
    } catch (e) {}

    let streakCount = 0;
    try {
      streakCount = parseInt(localStorage.getItem('vokabelgo_study_streak') || '0', 10);
      if (!streakCount && checkinHist.length) streakCount = checkinHist.length;
    } catch (e) {}

    let learnedCount = 0;
    Object.keys(currentProg).forEach(k => {
      if (currentProg[k] && currentProg[k].box >= 1) learnedCount++;
    });

    let feedCount = 0;
    try {
      feedCount = parseInt(localStorage.getItem('vokabelgo_feed_count') || '0', 10);
    } catch (e) {}

    const prof = getLocalUserProfile();

    return {
      streak: streakCount,
      words_learned: learnedCount,
      blitz_score: matchBest,
      feed_count: feedCount,
      display_name: prof.nickname || (currentUser?.user_metadata?.display_name) || 'Bạn học',
      avatar: `img/avatars/${prof.avatarType || 'v2'}/cat_${String(prof.catId || 12).padStart(2, '0')}.png`,
      app_data: {
        profile: prof,
        progress: currentProg,
        checkinHistory: checkinHist,
        userCards: userCards,
        matchBest: matchBest,
        lastClientUpdate: new Date().toISOString()
      }
    };
  }

  // Tải dữ liệu từ Supabase Cloud về máy
  async function syncDownFromCloud(user) {
    if (!sbClient || !user) return;
    setSyncBadge('syncing', 'Đang tải...');

    try {
      const { data, error } = await sbClient
        .from('vokabelgo_users')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.warn('[VokabelGo Cloud] Supabase read warning:', error);
      }

      if (data && data.app_data) {
        console.log('[VokabelGo Cloud] Đã tải tiến độ từ Supabase:', data);
        applyCloudDataToLocal(data.app_data, user);
        setSyncBadge('synced', 'Đã đồng bộ');
      } else {
        // Chưa có bản ghi trên cloud, tự động đẩy bản ghi đầu tiên lên
        console.log('[VokabelGo Cloud] Khởi tạo hồ sơ đám mây đầu tiên cho học viên...');
        await triggerCloudSave(true);
      }
    } catch (err) {
      console.error('[VokabelGo Cloud] Lỗi syncDown:', err);
      setSyncBadge('error', 'Lỗi tải');
    }
  }

  // Áp dụng dữ liệu Cloud vào LocalStorage & cập nhật giao diện
  function applyCloudDataToLocal(cloudAppData, user) {
    if (!cloudAppData) return;

    try {
      // 1. Progress
      if (cloudAppData.progress && typeof cloudAppData.progress === 'object') {
        let localProg = {};
        try {
          const lp = localStorage.getItem('dmf_flash_progress_v2');
          if (lp) localProg = JSON.parse(lp);
        } catch (e) {}

        const merged = { ...localProg, ...cloudAppData.progress };
        localStorage.setItem('dmf_flash_progress_v2', JSON.stringify(merged));
        if (typeof progress !== 'undefined') {
          progress = merged;
        }
      }

      // 2. Profile
      if (cloudAppData.profile) {
        localStorage.setItem('vokabelgo_user_profile', JSON.stringify(cloudAppData.profile));
        if (typeof currentProfile !== 'undefined') {
          currentProfile = cloudAppData.profile;
        }
      }

      // 3. Check-in history
      if (cloudAppData.checkinHistory && Array.isArray(cloudAppData.checkinHistory)) {
        localStorage.setItem('vokabelgo_checkin_history', JSON.stringify(cloudAppData.checkinHistory));
      }

      // 4. Custom Cards
      if (cloudAppData.userCards && Array.isArray(cloudAppData.userCards)) {
        localStorage.setItem('dmf_custom_cards', JSON.stringify(cloudAppData.userCards));
      }

      // 5. Match best score
      if (cloudAppData.matchBest) {
        localStorage.setItem('vokabelgo_match_best_score', String(cloudAppData.matchBest));
      }

      // Cập nhật giao diện web
      if (typeof updateStats === 'function') updateStats();
      if (typeof applyUserProfileUI === 'function') applyUserProfileUI();
      if (typeof renderCalendar === 'function') renderCalendar();
      if (typeof renderGuestbook === 'function') renderGuestbook();
      if (typeof applyFilter === 'function') applyFilter();

      const timeEl = document.getElementById('authLastSyncTime');
      if (timeEl) {
        timeEl.textContent = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      }

      if (typeof showRetroToast === 'function') {
        showRetroToast('Đã đồng bộ tiến độ học từ Cloud! ✨', '☁️');
      }
    } catch (e) {
      console.error('[VokabelGo Cloud] Lỗi giải nén dữ liệu Cloud:', e);
    }
  }

  // Tự động đẩy dữ liệu lên Cloud (Debounced)
  function triggerCloudSave(immediate = false) {
    if (!sbClient || !currentUser) return;

    if (cloudSyncTimeout) clearTimeout(cloudSyncTimeout);

    const delay = immediate ? 0 : 1200;
    setSyncBadge('syncing', 'Đang lưu...');

    cloudSyncTimeout = setTimeout(async () => {
      try {
        const payload = getFullStudyPayload();
        payload.id = currentUser.id;
        payload.email = currentUser.email;

        const { error } = await sbClient
          .from('vokabelgo_users')
          .upsert(payload, { onConflict: 'id' });

        if (error) throw error;

        setSyncBadge('synced', 'Đã lưu');
        const timeEl = document.getElementById('authLastSyncTime');
        if (timeEl) {
          timeEl.textContent = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        }
        console.log('[VokabelGo Cloud] Đã lưu tiến độ lên Supabase thành công.');
      } catch (err) {
        console.error('[VokabelGo Cloud] Lỗi lưu lên Supabase:', err);
        setSyncBadge('error', 'Lỗi lưu');
      }
    }, delay);
  }

  // Huy hiệu trạng thái đồng bộ
  function setSyncBadge(state, label) {
    const badge = document.getElementById('cloudSyncBadge');
    if (!badge) return;
    badge.className = 'cloud-sync-badge ' + state;
    badge.textContent = label;
  }

  // ============================================================================
  // CÁC HÀM TƯƠNG TÁC TỪ GIAO DIỆN
  // ============================================================================

  window.openAuthModal = function() {
    const modal = document.getElementById('authModal');
    if (!modal) return;
    if (!window.isSupabaseConfigured()) {
      window.openSupabaseConfigModal(true);
      return;
    }
    updateAuthUI();
    modal.classList.remove('hidden');
  };

  window.closeAuthModal = function() {
    const modal = document.getElementById('authModal');
    if (modal) modal.classList.add('hidden');
  };

  // Đăng ký & Đăng nhập Email
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

    if (!sbClient) {
      if (errEl) errEl.textContent = 'Chưa kết nối Supabase. Vui lòng kiểm tra Cài đặt!';
      return;
    }

    try {
      if (mode === 'register') {
        const { data, error } = await sbClient.auth.signUp({
          email: email,
          password: pass,
          options: {
            data: { display_name: name || 'Bạn học' }
          }
        });
        if (error) throw error;

        if (data.session) {
          if (typeof showRetroToast === 'function') {
            showRetroToast('Đăng ký tài khoản thành công! 🎉', '✨');
          }
          closeAuthModal();
        } else {
          // Supabase yêu cầu xác nhận email nếu bật email confirmation
          alert(`Đã gửi email xác nhận đến ${email}. Bạn vui lòng kiểm tra hộp thư (hoặc tắt Confirm Email trong Supabase Dashboard để đăng nhập ngay)!`);
          closeAuthModal();
        }
      } else {
        const { data, error } = await sbClient.auth.signInWithPassword({
          email: email,
          password: pass
        });
        if (error) throw error;

        if (typeof showRetroToast === 'function') {
          showRetroToast('Đăng nhập thành công! 💖', '✨');
        }
        closeAuthModal();
      }
    } catch (err) {
      console.error('[VokabelGo Cloud] Supabase Auth Error:', err);
      let msg = err.message || 'Lỗi đăng nhập. Vui lòng kiểm tra lại!';
      if (msg.includes('Invalid login credentials')) {
        msg = 'Sai email hoặc mật khẩu. Vui lòng kiểm tra lại!';
      } else if (msg.includes('User already registered')) {
        msg = 'Email này đã đăng ký. Bạn hãy chọn tab "Đăng nhập"!';
      }
      if (errEl) errEl.textContent = msg;
    }
  };

  // Đăng nhập Google qua Supabase OAuth
  window.handleGoogleAuth = async function() {
    const errEl = document.getElementById('authFormError');
    if (errEl) errEl.textContent = '';

    if (!sbClient) {
      if (errEl) errEl.textContent = 'Chưa kết nối Supabase.';
      return;
    }

    try {
      const redirectUrl = window.location.origin + window.location.pathname;
      const { data, error } = await sbClient.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: redirectUrl }
      });
      if (error) throw error;
    } catch (err) {
      console.error('[VokabelGo Cloud] Google OAuth Error:', err);
      if (errEl) errEl.textContent = 'Lỗi Google OAuth: ' + err.message;
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
      const redirectUrl = window.location.origin + window.location.pathname;
      const { error } = await sbClient.auth.resetPasswordForEmail(email, { redirectTo: redirectUrl });
      if (error) throw error;
      alert(`Đã gửi hướng dẫn khôi phục mật khẩu đến ${email}. Hãy kiểm tra hòm thư của bạn!`);
    } catch (err) {
      if (errEl) errEl.textContent = 'Lỗi gửi email: ' + err.message;
    }
  };

  // Đăng xuất
  window.handleAuthLogout = async function() {
    if (!confirm('Bạn có chắc muốn đăng xuất? Tiến độ học đã được lưu an toàn trên Supabase Cloud.')) {
      return;
    }

    try {
      if (sbClient) await sbClient.auth.signOut();
      currentUser = null;
      closeAuthModal();

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
    triggerCloudSave(true);
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

  // Tải dữ liệu Bảng Xếp Hạng từ Supabase
  window.loadLeaderboardFromSupabase = async function() {
    if (!sbClient) return null;
    try {
      const { data, error } = await sbClient
        .from('vokabelgo_users')
        .select('id, display_name, avatar, streak, words_learned, blitz_score, last_active')
        .order('streak', { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data || []).map(row => ({
        uid: row.id,
        name: row.display_name || 'Bạn học',
        avatar: row.avatar || 'img/avatars/v2/cat_12.png',
        streak: row.streak || 0,
        words: row.words_learned || 0,
        blitz: row.blitz_score || 0,
        isMe: currentUser && currentUser.id === row.id
      }));
    } catch (e) {
      console.warn('[Leaderboard] Supabase fetch error:', e);
      return null;
    }
  };

  // Cấu hình Supabase Modal
  window.openSupabaseConfigModal = function(showNotice = false) {
    const modal = document.getElementById('supabaseConfigModal');
    if (!modal) return;

    const notice = document.getElementById('supabaseConfigNotice');
    if (notice) notice.style.display = showNotice ? 'block' : 'none';

    const cfg = window.getSupabaseConfig();
    const urlInput = document.getElementById('supabaseUrlInput');
    const keyInput = document.getElementById('supabaseKeyInput');
    const errEl = document.getElementById('supabaseConfigError');
    if (errEl) errEl.textContent = '';

    if (urlInput) urlInput.value = cfg.url || '';
    if (keyInput) keyInput.value = cfg.anonKey || '';

    modal.classList.remove('hidden');
  };

  window.closeSupabaseConfigModal = function() {
    const modal = document.getElementById('supabaseConfigModal');
    if (modal) modal.classList.add('hidden');
  };

  window.saveSupabaseConfigFromInput = function() {
    const urlInput = document.getElementById('supabaseUrlInput');
    const keyInput = document.getElementById('supabaseKeyInput');
    const errEl = document.getElementById('supabaseConfigError');

    const url = urlInput ? urlInput.value.trim() : '';
    const key = keyInput ? keyInput.value.trim() : '';

    if (!url || !key) {
      if (errEl) errEl.textContent = 'Vui lòng nhập đầy đủ Supabase URL và Anon Public Key!';
      return;
    }

    if (!url.startsWith('https://')) {
      if (errEl) errEl.textContent = 'Supabase URL phải bắt đầu bằng https:// (ví dụ https://xyz.supabase.co)';
      return;
    }

    localStorage.setItem('vokabelgo_custom_supabase_config', JSON.stringify({ url: url, anonKey: key }));
    closeSupabaseConfigModal();

    if (typeof showRetroToast === 'function') {
      showRetroToast('Đã lưu cấu hình Supabase! Đang tải lại...', '🚀');
    }

    setTimeout(() => {
      window.location.reload();
    }, 600);
  };

  // Hook dữ liệu thay đổi
  window.onLocalDataChanged = function(source) {
    if (currentUser) {
      triggerCloudSave();
    }
  };

  // Khởi động khi tải xong trang
  window.addEventListener('DOMContentLoaded', () => {
    initSupabase();
  });

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(initSupabase, 80);
  }
})();
