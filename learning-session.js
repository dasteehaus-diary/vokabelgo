// ==============================================================================
// VokabelGo - Core Learning Loop & Session Manager (Phase 1)
// LocalStorage Keys:
//   - vokabelgo_learning_state_v1: Persistent card learning states
//   - vokabelgo_learning_session_v1: Daily 5-target active session
// Backward compatible with:
//   - dmf_flash_progress_v2: cardId -> 'known' | 'hard' | 'unknown'
//   - vokabelgo_daily_progress_v1: VokabelDaily daily goal & streak engine
// ==============================================================================

(function() {
  'use strict';

  const LS_LEARNING_STATE = 'vokabelgo_learning_state_v1';
  const LS_LEARNING_SESSION = 'vokabelgo_learning_session_v1';
  const LS_LEGACY_PROGRESS = 'dmf_flash_progress_v2';

  // Helper lấy ngày local YYYY-MM-DD đồng bộ với VokabelDaily
  function getLocalDateKey(date) {
    if (window.VokabelDaily && typeof window.VokabelDaily.getLocalDateKey === 'function') {
      return window.VokabelDaily.getLocalDateKey(date);
    }
    const d = date ? new Date(date) : new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // ============================================================================
  // 1. LEARNING STATE MANAGER (vokabelgo_learning_state_v1)
  // ============================================================================
  const VokabelLearningState = {
    load: function() {
      try {
        const raw = localStorage.getItem(LS_LEARNING_STATE);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') {
            if (!parsed.cards || typeof parsed.cards !== 'object') parsed.cards = {};
            parsed.version = 1;
            return parsed;
          }
        }
      } catch (e) {
        console.warn('[VokabelLearningState] Lỗi đọc storage:', e);
      }
      return { version: 1, cards: {} };
    },

    save: function(state) {
      try {
        state.version = 1;
        state.updatedAt = new Date().toISOString();
        localStorage.setItem(LS_LEARNING_STATE, JSON.stringify(state));
      } catch (e) {
        console.error('[VokabelLearningState] Lỗi ghi storage:', e);
      }
      if (typeof window.onLocalDataChanged === 'function') {
        try { window.onLocalDataChanged('learningState'); } catch (err) {}
      }
    },

    getCardState: function(cardId) {
      if (!cardId) return null;
      const state = this.load();
      return state.cards[String(cardId)] || null;
    },

    ensureCardState: function(cardId, initialStatus) {
      const safeId = String(cardId);
      const state = this.load();
      if (!state.cards[safeId]) {
        state.cards[safeId] = {
          status: initialStatus || 'new',
          firstSeenAt: null,
          lastReviewedAt: null,
          successCount: 0,
          failureCount: 0,
          consecutiveSuccess: 0,
          needsReview: false
        };
        this.save(state);
      }
      return state.cards[safeId];
    },

    recordIntroSeen: function(cardId) {
      const safeId = String(cardId);
      const state = this.load();
      const card = state.cards[safeId] || {
        status: 'new',
        firstSeenAt: null,
        lastReviewedAt: null,
        successCount: 0,
        failureCount: 0,
        consecutiveSuccess: 0,
        needsReview: false
      };
      if (!card.firstSeenAt) {
        card.firstSeenAt = new Date().toISOString();
      }
      card.status = 'learning';
      state.cards[safeId] = card;
      this.save(state);
      return card;
    },

    recordRecallSuccess: function(cardId) {
      const safeId = String(cardId);
      const state = this.load();
      const card = state.cards[safeId] || {
        status: 'learning',
        firstSeenAt: new Date().toISOString(),
        lastReviewedAt: null,
        successCount: 0,
        failureCount: 0,
        consecutiveSuccess: 0,
        needsReview: false
      };

      card.successCount = (card.successCount || 0) + 1;
      card.consecutiveSuccess = (card.consecutiveSuccess || 0) + 1;
      card.lastReviewedAt = new Date().toISOString();
      card.needsReview = false;
      card.status = card.consecutiveSuccess >= 3 ? 'mastered' : 'review';

      state.cards[safeId] = card;
      this.save(state);
      return card;
    },

    recordRecallFailure: function(cardId, rating) {
      const safeId = String(cardId);
      const state = this.load();
      const card = state.cards[safeId] || {
        status: 'learning',
        firstSeenAt: new Date().toISOString(),
        lastReviewedAt: null,
        successCount: 0,
        failureCount: 0,
        consecutiveSuccess: 0,
        needsReview: false
      };

      card.failureCount = (card.failureCount || 0) + 1;
      card.consecutiveSuccess = 0;
      card.lastReviewedAt = new Date().toISOString();
      card.needsReview = true;
      card.status = 'learning';

      state.cards[safeId] = card;
      this.save(state);
      return card;
    },

    recordReinforce: function(cardId) {
      const safeId = String(cardId);
      const state = this.load();
      const card = state.cards[safeId] || {
        status: 'learning',
        firstSeenAt: new Date().toISOString(),
        lastReviewedAt: null,
        successCount: 0,
        failureCount: 0,
        consecutiveSuccess: 0,
        needsReview: true
      };

      card.lastReviewedAt = new Date().toISOString();
      card.needsReview = true; // Reinforcement is a fail-safe, card still needs future review
      card.status = 'learning';

      state.cards[safeId] = card;
      this.save(state);
      return card;
    },

    exportData: function() {
      return this.load();
    },

    importData: function(incoming) {
      if (!incoming || typeof incoming !== 'object') return false;
      const current = this.load();
      const mergedCards = { ...current.cards, ...(incoming.cards || {}) };
      this.save({ version: 1, cards: mergedCards });
      return true;
    }
  };

  // ============================================================================
  // 2. SESSION MANAGER (vokabelgo_learning_session_v1)
  // ============================================================================
  const VokabelSession = {
    // Tải session hiện tại từ LocalStorage
    loadSession: function() {
      try {
        const raw = localStorage.getItem(LS_LEARNING_SESSION);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object' && parsed.sessionId) {
            return parsed;
          }
        }
      } catch (e) {
        console.warn('[VokabelSession] Lỗi đọc session:', e);
      }
      return null;
    },

    // Lưu session vào LocalStorage
    saveSession: function(session) {
      if (!session) {
        localStorage.removeItem(LS_LEARNING_SESSION);
      } else {
        session.updatedAt = new Date().toISOString();
        localStorage.setItem(LS_LEARNING_SESSION, JSON.stringify(session));
      }
      if (typeof window.onLocalDataChanged === 'function') {
        try { window.onLocalDataChanged('learningSession'); } catch (err) {}
      }
    },

    // Lấy session hôm nay nếu có và hợp lệ
    getTodaySession: function() {
      const session = this.loadSession();
      if (!session) return null;
      const todayKey = getLocalDateKey();
      if (session.date === todayKey) {
        return session;
      }
      return null;
    },

    // Kiểm tra xem hôm nay có session đang học dở không
    hasActiveTodaySession: function() {
      const s = this.getTodaySession();
      return Boolean(s && !s.completed);
    },

    // Trả về tóm tắt trạng thái session hôm nay để Hôm Nay hiển thị
    getTodaySessionState: function() {
      const s = this.getTodaySession();
      if (!s) return null;
      return {
        sessionId: s.sessionId,
        date: s.date,
        deck: s.deck,
        targetIds: [...s.targetIds],
        completedTargets: [...(s.completedTargets || [])],
        completedCount: (s.completedTargets || []).length,
        totalTargets: (s.targetIds || []).length,
        isCompleted: Boolean(s.completed),
        queueLength: (s.queue || []).length,
        queueIndex: s.queueIndex || 0
      };
    },

    // --------------------------------------------------------------------------
    // 3. TARGET SELECTION (3 REVIEW + 2 NEW)
    // --------------------------------------------------------------------------
    selectTargets: function(allCardsList, count) {
      const totalNeeded = typeof count === 'number' ? count : 5;
      const targetReviewCount = 3;
      const targetNewCount = 2;

      let legacyProgress = {};
      try {
        const raw = localStorage.getItem(LS_LEGACY_PROGRESS);
        if (raw) legacyProgress = JSON.parse(raw);
      } catch (e) {}

      const learningState = VokabelLearningState.load();

      const unknownPool = [];
      const hardPool = [];
      const otherReviewPool = [];
      const newPool = [];

      allCardsList.forEach(card => {
        const id = card.id;
        const leg = legacyProgress[id];
        const ls = learningState.cards[id];

        if (leg === 'unknown' || (ls && ls.needsReview && ls.failureCount > ls.successCount)) {
          unknownPool.push(id);
        } else if (leg === 'hard' || (ls && ls.needsReview)) {
          hardPool.push(id);
        } else if (leg === 'known' || (ls && ls.status === 'review') || (ls && ls.status === 'mastered')) {
          otherReviewPool.push(id);
        } else {
          // Chưa có legacy progress và chưa có learning state -> new
          newPool.push(id);
        }
      });

      // Review pool: unknown trước, rồi đến hard, rồi đến các từ review khác
      const reviewPool = [...unknownPool, ...hardPool, ...otherReviewPool];

      const selectedTargets = [];
      const selectedSet = new Set();

      function pickFrom(pool, maxNeeded) {
        let picked = 0;
        for (let i = 0; i < pool.length; i++) {
          if (picked >= maxNeeded) break;
          const id = pool[i];
          if (!selectedSet.has(id)) {
            selectedSet.add(id);
            selectedTargets.push(id);
            picked++;
          }
        }
        return picked;
      }

      // 1. Chọn tối đa 3 review
      const pickedReview = pickFrom(reviewPool, targetReviewCount);

      // 2. Chọn tối đa 2 new
      const pickedNew = pickFrom(newPool, targetNewCount);

      // 3. Nếu thiếu review: bù bằng new
      const reviewDeficit = targetReviewCount - pickedReview;
      if (reviewDeficit > 0 && selectedTargets.length < totalNeeded) {
        pickFrom(newPool, reviewDeficit);
      }

      // 4. Nếu thiếu new: bù bằng review
      const newDeficit = targetNewCount - pickedNew;
      if (newDeficit > 0 && selectedTargets.length < totalNeeded) {
        pickFrom(reviewPool, newDeficit);
      }

      // 5. Nếu cả 2 đều thiếu: lấy bất kỳ thẻ nào còn lại trong allCardsList
      if (selectedTargets.length < totalNeeded) {
        for (let i = 0; i < allCardsList.length; i++) {
          if (selectedTargets.length >= totalNeeded) break;
          const id = allCardsList[i].id;
          if (!selectedSet.has(id)) {
            selectedSet.add(id);
            selectedTargets.push(id);
          }
        }
      }

      return selectedTargets;
    },

    // --------------------------------------------------------------------------
    // 4. QUEUE BUILDER (Xen kẽ Intro & Active Recall)
    // --------------------------------------------------------------------------
    buildInitialQueue: function(targetIds) {
      let legacyProgress = {};
      try {
        const raw = localStorage.getItem(LS_LEGACY_PROGRESS);
        if (raw) legacyProgress = JSON.parse(raw);
      } catch (e) {}

      const learningState = VokabelLearningState.load();

      const introTargets = [];
      const reviewTargets = [];

      targetIds.forEach(id => {
        const leg = legacyProgress[id];
        const ls = learningState.cards[id];
        // Là từ mới nếu chưa từng có legacy progress và chưa từng ghi nhận firstSeenAt
        const isNew = (!leg && (!ls || !ls.firstSeenAt));
        if (isNew) {
          introTargets.push(id);
        } else {
          reviewTargets.push(id);
        }
      });

      const queue = [];

      if (introTargets.length === 0) {
        // Cả 5 đều là review targets -> vào thẳng Active Recall
        reviewTargets.forEach(id => {
          queue.push({ type: 'recall', cardId: id });
        });
        return queue;
      }

      if (reviewTargets.length === 0) {
        // Cả 5 đều là từ mới: xen kẽ thông minh để luôn có ít nhất 2 items giữa Intro và Recall
        // [Intro 0, Intro 1, Intro 2, Recall 0, Intro 3, Recall 1, Intro 4, Recall 2, Recall 3, Recall 4]
        introTargets.forEach((id, idx) => {
          queue.push({ type: 'intro', cardId: id });
        });
        introTargets.forEach((id, idx) => {
          queue.push({ type: 'recall', cardId: id });
        });
        // Sắp xếp xen kẽ: chuyển các Recall vào giữa
        const interleaved = [];
        const intros = introTargets.map(id => ({ type: 'intro', cardId: id }));
        const recalls = introTargets.map(id => ({ type: 'recall', cardId: id }));

        if (intros.length >= 3) {
          interleaved.push(intros[0]);
          interleaved.push(intros[1]);
          interleaved.push(intros[2]);
          interleaved.push(recalls[0]); // Cách Intro 0 hai bước
          if (intros.length > 3) interleaved.push(intros[3]);
          interleaved.push(recalls[1]); // Cách Intro 1 ba bước
          if (intros.length > 4) interleaved.push(intros[4]);
          interleaved.push(recalls[2]);
          if (recalls.length > 3) interleaved.push(recalls[3]);
          if (recalls.length > 4) interleaved.push(recalls[4]);
          return interleaved;
        }
        return [...intros, ...recalls];
      }

      // Hỗn hợp Review + New (ví dụ: 3 Review + 2 New)
      // Intro N0, Recall R0, Intro N1, Recall N0 (cách 2 bước), Recall R1, Recall N1 (cách 2 bước), Recall R2
      let revIdx = 0;
      let newIdx = 0;

      while (newIdx < introTargets.length || revIdx < reviewTargets.length) {
        if (newIdx < introTargets.length) {
          queue.push({ type: 'intro', cardId: introTargets[newIdx] });
        }
        if (revIdx < reviewTargets.length) {
          queue.push({ type: 'recall', cardId: reviewTargets[revIdx] });
          revIdx++;
        }
        if (newIdx < introTargets.length) {
          queue.push({ type: 'recall', cardId: introTargets[newIdx] });
          newIdx++;
        }
      }

      return queue;
    },

    // --------------------------------------------------------------------------
    // 5. SESSION LIFECYCLE
    // --------------------------------------------------------------------------
    createTodaySession: function(allCardsList, deckName) {
      const todayKey = getLocalDateKey();
      const existing = this.getTodaySession();
      if (existing) {
        return existing;
      }

      const deck = deckName || 'Tất cả bộ';
      const targetIds = this.selectTargets(allCardsList, 5);
      const queue = this.buildInitialQueue(targetIds);

      const targetStates = {};
      targetIds.forEach(id => {
        targetStates[id] = {
          introduced: false,
          completed: false,
          attempts: 0,
          failures: 0,
          consecutiveSuccess: 0,
          needsReview: false,
          method: null
        };
      });

      const session = {
        version: 1,
        sessionId: 'sess_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
        date: todayKey,
        deck: deck,
        targetIds: targetIds,
        targetStates: targetStates,
        queue: queue,
        queueIndex: 0,
        completedTargets: [],
        completed: false,
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      this.saveSession(session);
      return session;
    },

    // Lấy thông tin interaction hiện tại
    getCurrentInteraction: function(cardsMap) {
      const session = this.getTodaySession();
      if (!session) return null;
      if (session.completed) return { completed: true, session: session };

      const q = session.queue || [];
      const idx = session.queueIndex || 0;

      if (idx >= q.length) {
        // Hàng đợi đã duyệt hết nhưng chưa đủ 5 target (phòng ngừa hiếm gặp)
        const uncompleted = session.targetIds.filter(id => !session.completedTargets.includes(id));
        if (uncompleted.length > 0) {
          uncompleted.forEach(id => {
            q.push({ type: 'recall', cardId: id });
          });
          this.saveSession(session);
        } else {
          session.completed = true;
          this.saveSession(session);
          return { completed: true, session: session };
        }
      }

      const currentItem = q[idx];
      if (!currentItem) return null;

      const card = cardsMap[currentItem.cardId] || null;
      const targetState = session.targetStates[currentItem.cardId] || {};

      return {
        completed: false,
        type: currentItem.type, // 'intro' | 'recall' | 'reinforce'
        cardId: currentItem.cardId,
        card: card,
        targetState: targetState,
        queueIndex: idx,
        queueTotal: q.length,
        completedCount: (session.completedTargets || []).length,
        totalTargets: session.targetIds.length,
        session: session
      };
    },

    // --------------------------------------------------------------------------
    // 6. ACTION HANDLERS
    // --------------------------------------------------------------------------

    // Xử lý bước INTRO: bấm "Tiếp tục"
    handleIntroContinue: function() {
      const session = this.getTodaySession();
      if (!session) return null;

      const currentItem = session.queue[session.queueIndex];
      if (currentItem && currentItem.type === 'intro') {
        const id = currentItem.cardId;
        if (session.targetStates[id]) {
          session.targetStates[id].introduced = true;
        }
        VokabelLearningState.recordIntroSeen(id);
      }

      session.queueIndex = (session.queueIndex || 0) + 1;
      this.saveSession(session);
      return session;
    },

    // Xử lý bước RECALL: người học đánh giá 'known' | 'hard' | 'unknown'
    handleRecallAnswer: function(rating) {
      const session = this.getTodaySession();
      if (!session) return null;

      const currentItem = session.queue[session.queueIndex];
      if (!currentItem || currentItem.type !== 'recall') return null;

      const id = currentItem.cardId;
      const targetState = session.targetStates[id] || { attempts: 0, failures: 0, completed: false };
      targetState.attempts = (targetState.attempts || 0) + 1;

      let justCompletedTarget = false;
      let justCompletedSession = false;

      if (rating === 'known') {
        // THÀNH CÔNG: Vượt qua Active Recall!
        targetState.completed = true;
        targetState.needsReview = false;
        targetState.method = 'recall';
        targetState.consecutiveSuccess = (targetState.consecutiveSuccess || 0) + 1;

        // Cập nhật learning-state mới
        VokabelLearningState.recordRecallSuccess(id);

        // Cập nhật legacy progress (backward compatibility)
        this._updateLegacyProgress(id, 'known');

        // Ghi nhận completedTargets CHỈ MỘT LẦN DUY NHẤT
        if (!session.completedTargets.includes(id)) {
          session.completedTargets.push(id);
          justCompletedTarget = true;

          // ĐÚNG MỤC TIÊU: Chỉ gọi VokabelDaily khi target HOÀN THÀNH (qua onCardReviewedForFeed hoặc trực tiếp)
          if (typeof window.onCardReviewedForFeed === 'function') {
            try { window.onCardReviewedForFeed(id); } catch (e) {}
          } else if (window.VokabelDaily && typeof window.VokabelDaily.reviewCard === 'function') {
            window.VokabelDaily.reviewCard(id);
          }
        }

        // Xóa mọi item recall trùng lặp còn lại của từ này trong queue tương lai
        for (let k = session.queue.length - 1; k > session.queueIndex; k--) {
          if (session.queue[k].cardId === id) {
            session.queue.splice(k, 1);
          }
        }
      } else {
        // THẤT BẠI: Người học chọn 'unknown' hoặc 'hard'
        targetState.failures = (targetState.failures || 0) + 1;
        targetState.consecutiveSuccess = 0;
        targetState.needsReview = true;

        // Cập nhật learning-state mới
        VokabelLearningState.recordRecallFailure(id, rating);

        // Cập nhật legacy progress (backward compatibility)
        this._updateLegacyProgress(id, rating);

        // FAIL-SAFE: Nếu sai 3 lần trong cùng session -> chuyển sang GUIDED REINFORCEMENT
        if (targetState.failures >= 3) {
          const insertPos = Math.min(session.queueIndex + 3, session.queue.length);
          session.queue.splice(insertPos, 0, { type: 'reinforce', cardId: id });
        } else {
          // RE-QUEUE: Chèn lại sau khoảng 2–3 items (tránh hỏi lại ngay câu kế tiếp)
          const insertPos = Math.min(session.queueIndex + 3, session.queue.length);
          session.queue.splice(insertPos, 0, { type: 'recall', cardId: id });
        }
      }

      session.targetStates[id] = targetState;
      session.queueIndex = (session.queueIndex || 0) + 1;

      // Kiểm tra hoàn thành session (đủ 5 targets)
      if (session.completedTargets.length >= session.targetIds.length) {
        session.completed = true;
        session.completedAt = new Date().toISOString();
        justCompletedSession = true;
      }

      this.saveSession(session);

      return {
        session: session,
        rating: rating,
        cardId: id,
        justCompletedTarget: justCompletedTarget,
        justCompletedSession: justCompletedSession,
        targetState: targetState
      };
    },

    // Xử lý bước GUIDED REINFORCEMENT (Fail-safe cho từ quá khó): bấm "Tiếp tục"
    handleReinforceContinue: function() {
      const session = this.getTodaySession();
      if (!session) return null;

      const currentItem = session.queue[session.queueIndex];
      if (!currentItem || currentItem.type !== 'reinforce') return null;

      const id = currentItem.cardId;
      const targetState = session.targetStates[id] || {};

      // Sau bước guided reinforcement, target được tính hoàn thành PHIÊN HỌC
      // nhưng KHÔNG đánh dấu mastered, giữ needsReview = true
      targetState.completed = true;
      targetState.needsReview = true;
      targetState.method = 'reinforce';

      VokabelLearningState.recordReinforce(id);

      let justCompletedTarget = false;
      let justCompletedSession = false;

      if (!session.completedTargets.includes(id)) {
        session.completedTargets.push(id);
        justCompletedTarget = true;

        if (typeof window.onCardReviewedForFeed === 'function') {
          try { window.onCardReviewedForFeed(id); } catch (e) {}
        } else if (window.VokabelDaily && typeof window.VokabelDaily.reviewCard === 'function') {
          window.VokabelDaily.reviewCard(id);
        }
      }

      // Xóa mọi item thừa của thẻ này trong tương lai
      for (let k = session.queue.length - 1; k > session.queueIndex; k--) {
        if (session.queue[k].cardId === id) {
          session.queue.splice(k, 1);
        }
      }

      session.targetStates[id] = targetState;
      session.queueIndex = (session.queueIndex || 0) + 1;

      if (session.completedTargets.length >= session.targetIds.length) {
        session.completed = true;
        session.completedAt = new Date().toISOString();
        justCompletedSession = true;
      }

      this.saveSession(session);

      return {
        session: session,
        cardId: id,
        justCompletedTarget: justCompletedTarget,
        justCompletedSession: justCompletedSession,
        targetState: targetState
      };
    },

    // Helper cập nhật legacy dmf_flash_progress_v2
    _updateLegacyProgress: function(cardId, rating) {
      try {
        let prog = {};
        const raw = localStorage.getItem(LS_LEGACY_PROGRESS);
        if (raw) prog = JSON.parse(raw);
        prog[cardId] = rating;
        localStorage.setItem(LS_LEGACY_PROGRESS, JSON.stringify(prog));
        if (typeof window.saveProgress === 'function') {
          // Sync with runtime progress object in index.html
          window.progress = prog;
        }
      } catch (e) {}
    },

    // TEST ONLY: reset để test runner chạy
    resetTodayForTesting: function() {
      localStorage.removeItem(LS_LEARNING_SESSION);
    }
  };

  // Expose to window namespace
  window.VokabelLearningState = VokabelLearningState;
  window.VokabelSession = VokabelSession;

})();
