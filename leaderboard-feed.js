// ==========================================================================
// VokabelGo - Leaderboard & Gentle Nudges Engine
// ==========================================================================

(function() {
  let activeLeaderboardTab = 'streak'; // 'streak' | 'words' | 'blitz'
  let cachedLeaderboardUsers = [];

  // Lấy số từ đã học trong ngày hôm nay
  function getTodayKey() {
    return new Date().toISOString().slice(0, 10);
  }

  function getDailyLearnedCount() {
    try {
      const savedDate = localStorage.getItem('vokabelgo_feed_date');
      const today = getTodayKey();
      if (savedDate !== today) {
        localStorage.setItem('vokabelgo_feed_date', today);
        localStorage.setItem('vokabelgo_feed_count', '0');
        return 0;
      }
      return parseInt(localStorage.getItem('vokabelgo_feed_count') || '0', 10);
    } catch (e) {
      return 0;
    }
  }

  function addDailyLearned() {
    const today = getTodayKey();
    let count = getDailyLearnedCount();
    const oldCount = count;
    count++;
    try {
      localStorage.setItem('vokabelgo_feed_date', today);
      localStorage.setItem('vokabelgo_feed_count', String(count));
    } catch (e) {}

    updateFeedUI(count, oldCount < 5 && count >= 5);
  }

  // Cập nhật giao diện Huy hiệu Cho Mèo Ăn & Popover
  function updateFeedUI(count, justCompleted = false) {
    if (typeof count === 'undefined') count = getDailyLearnedCount();

    const badgeEl = document.getElementById('openFeedNudgeBtn');
    const badgeTextEl = document.getElementById('feedBadgeText');
    const badgeIconEl = document.getElementById('feedBadgeIcon');
    const barFillEl = document.getElementById('feedProgressBarFill');
    const ratioEl = document.getElementById('feedProgressRatio');
    const statusEl = document.getElementById('feedStatusLabel');
    const quoteEl = document.getElementById('feedCatQuote');

    const pct = Math.min(100, Math.round((count / 5) * 100));

    if (barFillEl) barFillEl.style.width = pct + '%';
    if (ratioEl) ratioEl.textContent = `Đã học: ${count} / 5 từ`;

    if (count >= 5) {
      if (badgeEl) badgeEl.classList.add('is-fed');
      if (badgeIconEl) badgeIconEl.textContent = '🐟';
      if (badgeTextEl) badgeTextEl.textContent = 'No bụng ✨';
      if (statusEl) {
        statusEl.textContent = 'Đã no bụng! 💖';
        statusEl.style.color = '#15803D';
      }
      if (quoteEl) {
        quoteEl.innerHTML = '“Măm măm... No nê rồi meow! Cảm ơn bạn học chăm chỉ nha! <b>Chuỗi ngày chăm chỉ +1</b> ✨”';
      }

      if (justCompleted && typeof showRetroToast === 'function') {
        showRetroToast('Măm măm... Bé mèo đã được ăn no nê hôm nay! 🐟💖', '😺');
      }
    } else {
      if (badgeEl) badgeEl.classList.remove('is-fed');
      if (badgeIconEl) badgeIconEl.textContent = '🐟';
      if (badgeTextEl) badgeTextEl.textContent = `${count}/5 từ`;
      if (statusEl) {
        statusEl.textContent = `Còn thiếu ${5 - count} từ 🐾`;
        statusEl.style.color = '#D97706';
      }
      if (quoteEl) {
        quoteEl.innerHTML = `“Đói bụng quá meow... Bạn học thêm <b>${5 - count} từ</b> nữa cho mình ăn cá với nha! 💭”`;
      }
    }
  }

  // Mở / Đóng Popover Nuôi Mèo
  window.toggleFeedNudgePopover = function() {
    const pop = document.getElementById('feedNudgePopover');
    if (!pop) return;
    if (pop.classList.contains('hidden')) {
      updateFeedUI();
      pop.classList.remove('hidden');
    } else {
      pop.classList.add('hidden');
    }
  };

  window.closeFeedNudgePopover = function() {
    const pop = document.getElementById('feedNudgePopover');
    if (pop) pop.classList.add('hidden');
  };

  // Hook khi người dùng học 1 từ mới
  window.onCardReviewedForFeed = function() {
    addDailyLearned();
  };

  // ==========================================================================
  // LEADERBOARD ENGINE
  // ==========================================================================

  window.openLeaderboardModal = async function() {
    const modal = document.getElementById('leaderboardModal');
    if (!modal) return;
    modal.classList.remove('hidden');
    await refreshLeaderboardData();
  };

  window.closeLeaderboardModal = function() {
    const modal = document.getElementById('leaderboardModal');
    if (modal) modal.classList.add('hidden');
  };

  window.switchLeaderboardTab = function(tab) {
    activeLeaderboardTab = tab;
    ['streak', 'words', 'blitz'].forEach(t => {
      const el = document.getElementById('lbTab' + t.charAt(0).toUpperCase() + t.slice(1));
      if (el) el.classList.toggle('active', t === tab);
    });
    renderLeaderboard(cachedLeaderboardUsers);
  };

  // Tải danh sách người dùng từ Firebase Cloud
  window.refreshLeaderboardData = async function() {
    let users = [];

    // 1. Đọc từ Firebase Realtime Database
    try {
      if (window.firebase && firebase.database) {
        const snap = await firebase.database().ref('users').once('value');
        const val = snap.val();
        if (val) {
          Object.keys(val).forEach(uid => {
            const u = val[uid];
            users.push(formatUserForLeaderboard(uid, u));
          });
        }
      }
    } catch (e) {
      console.warn('[Leaderboard] Realtime DB read error:', e);
    }

    // 2. Nếu Realtime DB rỗng, thử Firestore
    if (!users.length && window.firebase && firebase.firestore) {
      try {
        const snap = await firebase.firestore().collection('users').get();
        snap.forEach(doc => {
          users.push(formatUserForLeaderboard(doc.id, doc.data()));
        });
      } catch (e) {
        console.warn('[Leaderboard] Firestore read error:', e);
      }
    }

    // 3. Đảm bảo người dùng hiện tại có mặt
    const localUser = getLocalCurrentUserForLeaderboard();
    const existingIdx = users.findIndex(u => u.isMe || (localUser.uid && u.uid === localUser.uid));
    if (existingIdx >= 0) {
      users[existingIdx] = { ...users[existingIdx], ...localUser, isMe: true };
    } else {
      users.push(localUser);
    }

    // 4. Nếu ít hơn 3 người, bổ sung 2 bạn mẫu dễ thương cho bục vinh danh luôn sinh động
    if (users.length < 3) {
      users.push({
        uid: 'demo_mai_lan',
        name: 'Mai Lan 🐱',
        catId: 3, // Bé mèo vàng dễ thương (1-12)
        avatarType: 'v2',
        streak: 12,
        words: 78,
        matchBest: 28.5,
        isMe: false
      });
      users.push({
        uid: 'demo_minh_duc',
        name: 'Minh Đức 🐱',
        catId: 7, // Bé mèo xám lanh lợi (1-12)
        avatarType: 'v2',
        streak: 8,
        words: 64,
        matchBest: 32.0,
        isMe: false
      });
    }

    cachedLeaderboardUsers = users;
    renderLeaderboard(users);
  };

  function formatUserForLeaderboard(uid, data) {
    const isMe = (window.firebase && firebase.auth && firebase.auth().currentUser && firebase.auth().currentUser.uid === uid);
    
    // Đếm số từ đã thuộc
    let words = 0;
    if (data.progress && typeof data.progress === 'object') {
      words = Object.values(data.progress).filter(v => v === 'known' || v === 1 || v === '1').length;
    }

    // Tính chuỗi streak
    let streak = 0;
    if (data.checkinHistory && Array.isArray(data.checkinHistory)) {
      streak = data.checkinHistory.length;
    }

    let matchBest = 9999;
    if (data.matchBest) {
      matchBest = parseFloat(data.matchBest) || 9999;
    }

    let safeCat = parseInt(data.profile?.catId || 12, 10);
    if (isNaN(safeCat) || safeCat < 1 || safeCat > 12) safeCat = 12;

    return {
      uid: uid,
      name: data.profile?.nickname || data.displayName || 'Bạn học',
      catId: safeCat,
      avatarType: data.profile?.avatarType || 'v2',
      streak: streak,
      words: words,
      matchBest: matchBest,
      isMe: Boolean(isMe)
    };
  }

  function getLocalCurrentUserForLeaderboard() {
    let name = 'Bạn';
    let catId = 12;
    let avatarType = 'v2';
    try {
      if (typeof currentProfile !== 'undefined') {
        name = currentProfile.nickname || 'Bạn';
        catId = currentProfile.catId || 12;
        avatarType = currentProfile.avatarType || 'v2';
      }
    } catch (e) {}

    let safeCat = parseInt(catId, 10);
    if (isNaN(safeCat) || safeCat < 1 || safeCat > 12) safeCat = 12;

    let words = 0;
    try {
      if (typeof progress !== 'undefined') {
        words = Object.values(progress).filter(v => v === 'known' || v === 1 || v === '1').length;
      }
    } catch (e) {}

    let streak = 0;
    try {
      if (typeof getCheckinHistory === 'function') {
        streak = getCheckinHistory().length;
      }
    } catch (e) {}

    let matchBest = parseFloat(localStorage.getItem('vokabelgo_match_best_sec') || '9999');

    let currentUid = 'local_me';
    if (window.firebase && firebase.auth && firebase.auth().currentUser) {
      currentUid = firebase.auth().currentUser.uid;
    }

    return {
      uid: currentUid,
      name: name,
      catId: safeCat,
      avatarType: avatarType,
      streak: streak,
      words: words,
      matchBest: matchBest,
      isMe: true
    };
  }

  function renderLeaderboard(users) {
    const podiumEl = document.getElementById('leaderboardPodium');
    const listEl = document.getElementById('leaderboardList');
    if (!podiumEl || !listEl) return;

    // Sắp xếp theo tab đang chọn
    let sorted = [...users];
    if (activeLeaderboardTab === 'streak') {
      sorted.sort((a, b) => b.streak - a.streak || b.words - a.words);
    } else if (activeLeaderboardTab === 'words') {
      sorted.sort((a, b) => b.words - a.words || b.streak - a.streak);
    } else if (activeLeaderboardTab === 'blitz') {
      sorted.sort((a, b) => a.matchBest - b.matchBest);
    }

    // Lấy Top 3 cho Honor Cards
    const top1 = sorted[0];
    const top2 = sorted[1];
    const top3 = sorted[2];

    const getScoreStr = (u) => {
      if (!u) return '';
      if (activeLeaderboardTab === 'streak') return `${u.streak} ngày 🔥`;
      if (activeLeaderboardTab === 'words') return `${u.words} từ 📚`;
      if (activeLeaderboardTab === 'blitz') return u.matchBest < 9000 ? `${u.matchBest}s ⚡` : '--';
      return '';
    };

    const getAvatar = (u) => {
      if (!u) return 'img/avatars/v2/cat_12.png';
      const type = (u.avatarType === 'v1' || u.avatarType === 'v2') ? u.avatarType : 'v2';
      let num = parseInt(u.catId, 10);
      if (isNaN(num) || num < 1 || num > 12) num = 12;
      const padId = String(num).padStart(2, '0');
      return `img/avatars/${type}/cat_${padId}.png`;
    };

    // Vẽ 3 Thẻ Vinh Danh (Thứ tự: Á Quân [Trái] - Quán Quân [Giữa] - Quý Quân [Phải])
    podiumEl.innerHTML = `
      <div class="top3-cards-grid">
        <!-- TOP 2 (Á QUÂN) -->
        ${top2 ? `
          <div class="honor-card rank-2 ${top2.isMe ? 'is-me' : ''}">
            <span class="honor-badge">🥈 Á Quân</span>
            <div class="honor-avatar-wrap">
              <img src="${getAvatar(top2)}" alt="${top2.name}" class="honor-avatar" onerror="this.onerror=null;this.src='img/avatars/v2/cat_12.png';">
            </div>
            <div class="honor-name" title="${top2.name}">${top2.name} ${top2.isMe ? '<span class="honor-is-me">Bạn</span>' : ''}</div>
            <div class="honor-score-pill">${getScoreStr(top2)}</div>
          </div>
        ` : '<div style="visibility:hidden"></div>'}

        <!-- TOP 1 (QUÁN QUÂN) -->
        ${top1 ? `
          <div class="honor-card rank-1 ${top1.isMe ? 'is-me' : ''}">
            <span class="honor-badge">👑 Quán Quân</span>
            <div class="honor-avatar-wrap">
              <span class="honor-crown">👑</span>
              <img src="${getAvatar(top1)}" alt="${top1.name}" class="honor-avatar" onerror="this.onerror=null;this.src='img/avatars/v2/cat_12.png';">
            </div>
            <div class="honor-name" title="${top1.name}">${top1.name} ${top1.isMe ? '<span class="honor-is-me">Bạn</span>' : ''}</div>
            <div class="honor-score-pill">${getScoreStr(top1)}</div>
          </div>
        ` : '<div style="visibility:hidden"></div>'}

        <!-- TOP 3 (QUÝ QUÂN) -->
        ${top3 ? `
          <div class="honor-card rank-3 ${top3.isMe ? 'is-me' : ''}">
            <span class="honor-badge">🥉 Quý Quân</span>
            <div class="honor-avatar-wrap">
              <img src="${getAvatar(top3)}" alt="${top3.name}" class="honor-avatar" onerror="this.onerror=null;this.src='img/avatars/v2/cat_12.png';">
            </div>
            <div class="honor-name" title="${top3.name}">${top3.name} ${top3.isMe ? '<span class="honor-is-me">Bạn</span>' : ''}</div>
            <div class="honor-score-pill">${getScoreStr(top3)}</div>
          </div>
        ` : '<div style="visibility:hidden"></div>'}
      </div>
    `;

    // Nếu có từ 4 bạn học trở lên, vẽ danh sách tiếp theo
    if (sorted.length > 3) {
      const rest = sorted.slice(3);
      listEl.innerHTML = `
        <div class="leaderboard-list-wrap">
          <div class="leaderboard-list-title">
            <span>BẢNG XẾP HẠNG TIẾP THEO</span>
            <span>THÀNH TÍCH</span>
          </div>
          ${rest.map((u, idx) => {
            const rank = idx + 4;
            return `
              <div class="leaderboard-row ${u.isMe ? 'is-me' : ''}">
                <span class="lb-rank">#${rank}</span>
                <img src="${getAvatar(u)}" alt="${u.name}" class="lb-avatar" onerror="this.onerror=null;this.src='img/avatars/v2/cat_12.png';">
                <span class="lb-name">${u.name} ${u.isMe ? '<span class="honor-is-me">Bạn</span>' : ''}</span>
                <span class="lb-score">${getScoreStr(u)}</span>
              </div>
            `;
          }).join('')}
        </div>
      `;
    } else {
      listEl.innerHTML = `
        <div class="leaderboard-empty-hint">
          🌱 <strong>Bạn đang trong Top 3 xuất sắc!</strong> Mời bạn bè cùng đăng nhập để cùng thi đua học tập trên Bảng Vàng nha! 🐾
        </div>
      `;
    }
  }

  // Khởi động khi tải xong trang
  window.addEventListener('DOMContentLoaded', () => {
    updateFeedUI();
  });

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(updateFeedUI, 100);
  }
})();
