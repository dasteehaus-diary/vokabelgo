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

  // P0-1: Helper kiểm tra ngày đến hạn ôn theo lịch local YYYY-MM-DD
  function isDueForDailySession(dueAt, nowTime) {
    const srsModule = (typeof window !== 'undefined' && window.VokabelSRS) || (typeof global !== 'undefined' && global.VokabelSRS);
    if (srsModule && typeof srsModule.isDueForDailySession === 'function') {
      return srsModule.isDueForDailySession(dueAt, nowTime);
    }
    if (!dueAt) return false;
    return getLocalDateKey(dueAt) <= getLocalDateKey(nowTime || new Date());
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

    // P0-3: Thử lại các SRS commit đang bị pending (do FSRS load chậm hoặc lỗi)
    flushPendingSrsCommits: function(sessionObj) {
      const session = sessionObj || this.loadSession();
      if (!session || !session.targetStates) return 0;
      const srs = (typeof window !== 'undefined' && window.VokabelSRS) || (typeof global !== 'undefined' && global.VokabelSRS);
      if (!srs || typeof srs.scheduleReview !== 'function') return 0;

      let flushedCount = 0;
      let stateChanged = false;

      const completed = session.completedTargets || [];
      for (const id of completed) {
        const ts = session.targetStates[id];
        if (ts && ts.srsPending === true && ts.srsCommitted !== true) {
          try {
            const rating = ts.finalRating || (ts.recallRatings && ts.recallRatings.includes('unknown') ? 1 : (ts.recallRatings && ts.recallRatings.includes('hard') ? 2 : 3)) || 3;
            const res = srs.scheduleReview(id, rating);
            if (res) {
              ts.srsCommitted = true;
              ts.srsPending = false;
              flushedCount++;
              stateChanged = true;
            }
          } catch (e) {
            console.error('[VokabelSession] Lỗi retry scheduleReview cho thẻ ' + id + ':', e);
          }
        }
      }

      if (stateChanged) {
        this.saveSession(session);
      }
      return flushedCount;
    },

    // Lấy session hôm nay nếu có và hợp lệ
    getTodaySession: function() {
      const session = this.loadSession();
      if (!session) return null;
      const todayKey = getLocalDateKey();
      if (session.date === todayKey) {
        this.flushPendingSrsCommits(session);
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
    // 3. TARGET SELECTION (FSRS-6 DUE REVIEW + NEW WORDS)
    // --------------------------------------------------------------------------
    selectTargets: function(allCardsList, count) {
      const totalNeeded = (typeof count === 'number' && count >= 0) ? count : 5;
      if (totalNeeded === 0 || !Array.isArray(allCardsList) || allCardsList.length === 0) {
        return [];
      }
      // P1-2: Tỷ lệ review/new tính linh hoạt dựa trên count
      const targetReviewCount = Math.min(3, Math.max(0, Math.ceil(totalNeeded * 0.6)));
      const targetNewCount = Math.max(0, totalNeeded - targetReviewCount);

      let legacyProgress = {};
      try {
        const raw = localStorage.getItem(LS_LEGACY_PROGRESS);
        if (raw) legacyProgress = JSON.parse(raw);
      } catch (e) {}

      const learningState = VokabelLearningState.load();
      const srsModule = (typeof window !== 'undefined' && window.VokabelSRS) || (typeof global !== 'undefined' && global.VokabelSRS);
      let srsState = { cards: {} };
      if (srsModule && typeof srsModule.load === 'function') {
        srsState = srsModule.load();
      } else {
        try {
          const rawSrs = localStorage.getItem('vokabelgo_srs_state_v1');
          if (rawSrs) srsState = JSON.parse(rawSrs) || { cards: {} };
        } catch (e) {}
      }

      const now = Date.now();

      // Phân loại thẻ vào các nhóm ưu tiên:
      // 1. tier1_dueSrs: thẻ có SRS state và dueAt <= now theo ngày lịch local (đến hạn ôn)
      // 2. tier2_legacyUrgent: thẻ legacy unknown/hard chưa có SRS state (bootstrap ưu tiên cao)
      // 3. tier3_legacyKnown: thẻ legacy known chưa có SRS state (bootstrap dần)
      // 4. newPool: thẻ hoàn toàn mới (chưa từng học, không có firstSeenAt, không có legacy/srs)
      // 5. tier4_futureSrs: thẻ có SRS state nhưng chưa đến hạn ôn trong ngày (CHỈ dùng khi cạn kiệt fallback)

      const tier1_dueSrs = [];
      const tier2_legacyUrgent = [];
      const tier3_legacyKnown = [];
      const tier4_futureSrs = [];
      const newPool = [];

      allCardsList.forEach(card => {
        const id = card.id;
        const srsCard = srsState.cards ? srsState.cards[id] : null;
        const leg = legacyProgress[id];
        const ls = learningState.cards[id];

        if (srsCard && srsCard.dueAt) {
          const dueMs = new Date(srsCard.dueAt).getTime();
          // P0-1: Xác định due bằng calendar date YYYY-MM-DD
          const isDue = isDueForDailySession(srsCard.dueAt, now);
          if (isDue) {
            // Đến hạn hoặc quá hạn
            const overdueMs = now - dueMs;
            const isAgain = (srsCard.lastRating === 1) || (ls && ls.needsReview);
            tier1_dueSrs.push({ id, dueMs, overdueMs, isAgain });
          } else {
            // Chưa đến hạn
            tier4_futureSrs.push({ id, dueMs });
          }
        } else if (ls && ls.firstSeenAt) {
          // Đã từng học nhưng chưa có SRS record
          if (leg === 'unknown' || (ls.needsReview && ls.failureCount > ls.successCount)) {
            tier2_legacyUrgent.push({ id, priority: 1 });
          } else if (leg === 'hard' || ls.needsReview) {
            tier2_legacyUrgent.push({ id, priority: 2 });
          } else {
            tier3_legacyKnown.push(id);
          }
        } else if (leg) {
          // Có legacy progress
          if (leg === 'unknown') {
            tier2_legacyUrgent.push({ id, priority: 1 });
          } else if (leg === 'hard') {
            tier2_legacyUrgent.push({ id, priority: 2 });
          } else if (leg === 'known') {
            tier3_legacyKnown.push(id);
          } else {
            newPool.push(id);
          }
        } else {
          // Thẻ mới tinh: chưa có firstSeenAt, chưa có legacy, chưa có SRS
          newPool.push(id);
        }
      });

      // P1-1: Sắp xếp Tier 1 (SRS Due):
      // PRIMARY: Thẻ overdue nhiều hơn lên trước (dueMs nhỏ hơn tức là quá hạn lâu hơn)
      // SECONDARY: Thẻ có isAgain / needsReview xếp trước nếu dueMs bằng nhau
      tier1_dueSrs.sort((a, b) => {
        if (a.dueMs !== b.dueMs) return a.dueMs - b.dueMs;
        if (a.isAgain !== b.isAgain) return a.isAgain ? -1 : 1;
        return 0;
      });

      // Sắp xếp Tier 2 (Legacy Urgent): unknown trước, rồi đến hard
      tier2_legacyUrgent.sort((a, b) => a.priority - b.priority);

      // Sắp xếp Tier 4 (Future SRS fallback): thẻ gần đến hạn nhất lên trước
      tier4_futureSrs.sort((a, b) => a.dueMs - b.dueMs);

      // Tạo review pool chuẩn: [Tier 1, Tier 2, Tier 3]
      // Tuyệt đối KHÔNG đưa tier4_futureSrs (chưa tới hạn) vào review pool bình thường
      const reviewPool = [
        ...tier1_dueSrs.map(x => x.id),
        ...tier2_legacyUrgent.map(x => x.id),
        ...tier3_legacyKnown
      ];

      const selectedTargets = [];
      const selectedSet = new Set();

      function pickFrom(pool, maxNeeded) {
        let picked = 0;
        const remainingToTotal = totalNeeded - selectedTargets.length;
        const limit = Math.min(maxNeeded, remainingToTotal);
        if (limit <= 0) return 0;
        for (let i = 0; i < pool.length; i++) {
          if (picked >= limit) break;
          const id = pool[i];
          if (!selectedSet.has(id)) {
            selectedSet.add(id);
            selectedTargets.push(id);
            picked++;
          }
        }
        return picked;
      }

      // 1. Chọn tối đa targetReviewCount due review
      const pickedReview = pickFrom(reviewPool, targetReviewCount);

      // 2. Chọn tối đa targetNewCount new
      const pickedNew = pickFrom(newPool, targetNewCount);

      // 3. Nếu thiếu review: bù bằng new
      const reviewDeficit = targetReviewCount - pickedReview;
      if (reviewDeficit > 0 && selectedTargets.length < totalNeeded) {
        pickFrom(newPool, Math.min(reviewDeficit, totalNeeded - selectedTargets.length));
      }

      // 4. Nếu thiếu new: bù bằng review
      const newDeficit = targetNewCount - pickedNew;
      if (newDeficit > 0 && selectedTargets.length < totalNeeded) {
        pickFrom(reviewPool, Math.min(newDeficit, totalNeeded - selectedTargets.length));
      }

      // 5. CẠN KIỆT FALLBACK POLICY:
      // Nếu đã vét hết cả reviewPool và newPool mà vẫn chưa đủ quota (ví dụ kho thẻ quá ít hoặc toàn bộ thẻ đã được học và chưa đến hạn):
      // Lấy từ tier4_futureSrs (thẻ có lịch ôn gần nhất) để hoàn thành mục tiêu học hôm nay
      if (selectedTargets.length < totalNeeded && tier4_futureSrs.length > 0) {
        pickFrom(tier4_futureSrs.map(x => x.id), totalNeeded - selectedTargets.length);
      }

      // 6. Fallback cuối cùng nếu vẫn thiếu thẻ
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
    // 4. QUEUE BUILDER (Xen kẽ Intro & Active Recall + Phase 3 Typing Verification)
    // --------------------------------------------------------------------------
    buildInitialQueue: function(targetIds, cardsMap) {
      let legacyProgress = {};
      try {
        const raw = localStorage.getItem(LS_LEGACY_PROGRESS);
        if (raw) legacyProgress = JSON.parse(raw);
      } catch (e) {}

      const learningState = VokabelLearningState.load();

      const srsModule = (typeof window !== 'undefined' && window.VokabelSRS) || (typeof global !== 'undefined' && global.VokabelSRS);
      let srsState = { cards: {} };
      if (srsModule && typeof srsModule.load === 'function') {
        srsState = srsModule.load();
      } else {
        try {
          const rawSrs = localStorage.getItem('vokabelgo_srs_state_v1');
          if (rawSrs) srsState = JSON.parse(rawSrs) || { cards: {} };
        } catch (e) {}
      }

      // Đảm bảo cardsMap luôn sẵn sàng
      if (!cardsMap || typeof cardsMap !== 'object' || Object.keys(cardsMap).length === 0) {
        cardsMap = {};
        let list = [];
        if (typeof window !== 'undefined' && typeof window.allCards === 'function') list = window.allCards();
        else if (typeof global !== 'undefined' && typeof global.allCards === 'function') list = global.allCards();
        (list || []).forEach(c => { if (c && c.id) cardsMap[c.id] = c; });
      }

      const introTargets = [];
      const reviewTargets = [];

      targetIds.forEach(id => {
        const leg = legacyProgress[id];
        const ls = learningState.cards[id];
        const hasSrs = Boolean(srsState.cards && srsState.cards[id]);
        // Là từ mới nếu chưa từng có legacy progress, chưa từng ghi nhận firstSeenAt, và chưa có SRS state
        const isNew = (!leg && (!ls || !ls.firstSeenAt) && !hasSrs);
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
      } else if (reviewTargets.length === 0) {
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
          queue.length = 0;
          queue.push(...interleaved);
        } else {
          queue.length = 0;
          queue.push(...intros, ...recalls);
        }
      } else {
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
      }

      // Phase 3: Chọn review targets trưởng thành đủ điều kiện để thực hiện Objective Typing Verification
      const tvModule = (typeof window !== 'undefined' && window.VokabelTypingVerification) ||
                       (typeof global !== 'undefined' && global.VokabelTypingVerification) ||
                       (typeof require === 'function' ? (function() { try { return require('./typing-verification.js'); } catch(e){ return null; } })() : null);

      if (tvModule && typeof tvModule.isTypingEligible === 'function' && reviewTargets.length > 0) {
        const typingCandidates = [];
        reviewTargets.forEach(id => {
          const card = cardsMap[id];
          if (!card || !tvModule.isTypingEligible(card)) return;

          const srsCard = (srsState.cards && srsState.cards[id]) ? srsState.cards[id] : null;
          const historyCount = (srsCard && typeof srsCard.historyCount === 'number') ? srsCard.historyCount : 0;
          // Chỉ chọn review target đã có lịch sử học FSRS >= 2
          if (!srsCard || historyCount < 2) return;

          const lastRating = srsCard.lastRating || 3;
          const ratingWeight = (lastRating === 3 ? 2 : (lastRating === 2 ? 1 : 0));
          typingCandidates.push({
            id: id,
            historyCount: historyCount,
            ratingWeight: ratingWeight,
            dueMs: srsCard.dueAt ? new Date(srsCard.dueAt).getTime() : 0
          });
        });

        if (typingCandidates.length > 0) {
          // Sắp xếp deterministic: ưu tiên nhiều lịch sử hơn, rating Good/Hard, quá hạn hơn, stable ID
          typingCandidates.sort((a, b) => {
            if (b.historyCount !== a.historyCount) return b.historyCount - a.historyCount;
            if (b.ratingWeight !== a.ratingWeight) return b.ratingWeight - a.ratingWeight;
            if (a.dueMs !== b.dueMs) return a.dueMs - b.dueMs;
            return a.id.localeCompare(b.id);
          });

          // Mặc định chọn 1; tối đa 2 CHỈ khi candidate thứ 2 rất mature (historyCount >= 3)
          const chosenTypingIds = [typingCandidates[0].id];
          if (typingCandidates.length >= 2 && typingCandidates[1].historyCount >= 3) {
            chosenTypingIds.push(typingCandidates[1].id);
          }

          // Gán vào queue: thay thế lượt recall đầu tiên của cardId bằng typing
          chosenTypingIds.forEach(tId => {
            const firstRecallIdx = queue.findIndex(it => it.cardId === tId && it.type === 'recall');
            if (firstRecallIdx !== -1) {
              queue[firstRecallIdx].type = 'typing';
            }
          });
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

      const cardsMap = {};
      (allCardsList || []).forEach(c => { if (c && c.id) cardsMap[c.id] = c; });
      this._lastCardsMap = cardsMap;

      const queue = this.buildInitialQueue(targetIds, cardsMap);

      const targetStates = {};
      targetIds.forEach(id => {
        const isTyping = queue.some(it => it.cardId === id && it.type === 'typing');
        targetStates[id] = {
          introduced: false,
          completed: false,
          attempts: 0,
          failures: 0,
          consecutiveSuccess: 0,
          needsReview: false,
          method: null,
          verificationMode: isTyping ? 'typing' : 'recall',
          typingSubmitted: false,
          lastObjectiveResult: null
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
      const targetState = session.targetStates[id] || { attempts: 0, failures: 0, completed: false, recallRatings: [] };
      targetState.attempts = (targetState.attempts || 0) + 1;
      targetState.recallRatings = targetState.recallRatings || [];
      targetState.recallRatings.push(rating);

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

          // Xác định FSRS rating cho toàn bộ session của target này:
          // - nếu có bất kỳ unknown -> final FSRS rating = Again (1)
          // - nếu không unknown nhưng có hard -> Hard (2)
          // - nếu tất cả recall thành công rõ -> Good (3)
          let fsrsRating = 3; // Good
          if (targetState.recallRatings.includes('unknown')) {
            fsrsRating = 1; // Again
          } else if (targetState.recallRatings.includes('hard')) {
            fsrsRating = 2; // Hard
          }
          targetState.finalRating = fsrsRating;

          // P0-2: Commit FSRS CHỈ MỘT LẦN DUY NHẤT khi target hoàn thành session và kiểm tra kết quả scheduler
          if (!targetState.srsCommitted) {
            const srs = (typeof window !== 'undefined' && window.VokabelSRS) || (typeof global !== 'undefined' && global.VokabelSRS);
            let srsRecord = null;
            if (srs && typeof srs.scheduleReview === 'function') {
              try {
                srsRecord = srs.scheduleReview(id, fsrsRating);
              } catch (e) {
                console.error('[VokabelSession] Lỗi scheduleReview:', e);
              }
            }
            if (srsRecord) {
              targetState.srsCommitted = true;
              targetState.srsPending = false;
            } else {
              targetState.srsCommitted = false;
              targetState.srsPending = true;
            }
          }

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
      targetState.recallRatings = targetState.recallRatings || [];
      targetState.recallRatings.push('unknown');
      targetState.finalRating = 1; // Again

      VokabelLearningState.recordReinforce(id);
      // P1-3: Chắc chắn thẻ không bị đánh dấu là 'known' trong legacy progress
      try {
        const rawProg = localStorage.getItem(LS_LEGACY_PROGRESS);
        const pObj = rawProg ? JSON.parse(rawProg) : {};
        if (!pObj[id] || pObj[id] === 'known') {
          this._updateLegacyProgress(id, 'unknown');
        }
      } catch (e) {}

      let justCompletedTarget = false;
      let justCompletedSession = false;

      if (!session.completedTargets.includes(id)) {
        session.completedTargets.push(id);
        justCompletedTarget = true;

        // P0-2: Guided Reinforcement: commit FSRS rating = Again (1) và kiểm tra kết quả scheduler
        if (!targetState.srsCommitted) {
          const srs = (typeof window !== 'undefined' && window.VokabelSRS) || (typeof global !== 'undefined' && global.VokabelSRS);
          let srsRecord = null;
          if (srs && typeof srs.scheduleReview === 'function') {
            try {
              srsRecord = srs.scheduleReview(id, 1);
            } catch (e) {
              console.error('[VokabelSession] Lỗi scheduleReview reinforcement:', e);
            }
          }
          if (srsRecord) {
            targetState.srsCommitted = true;
            targetState.srsPending = false;
          } else {
            targetState.srsCommitted = false;
            targetState.srsPending = true;
          }
        }

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

    // --------------------------------------------------------------------------
    // Phase 3: OBJECTIVE RECALL / TYPING VERIFICATION HANDLERS
    // --------------------------------------------------------------------------
    handleTypingSubmit: function(userInput) {
      const session = this.getTodaySession();
      if (!session || session.completed) return null;

      const currentItem = session.queue[session.queueIndex];
      if (!currentItem || currentItem.type !== 'typing') return null;

      const id = currentItem.cardId;
      const targetState = session.targetStates[id] || { attempts: 0, failures: 0, completed: false, recallRatings: [] };

      // Idempotency: Nếu đã submit trong bước này và đang chờ Continue
      if (targetState.typingSubmitted) {
        return {
          session: session,
          cardId: id,
          result: targetState.lastObjectiveResult,
          feedback: targetState.typingFeedback,
          canonical: targetState.canonicalAnswer,
          targetState: targetState,
          alreadySubmitted: true
        };
      }

      // Tìm kiếm thông tin card
      let card = null;
      if (typeof window !== 'undefined' && typeof window.allCards === 'function') {
        const list = window.allCards();
        card = (list || []).find(c => c.id === id);
      } else if (typeof global !== 'undefined' && typeof global.allCards === 'function') {
        const list = global.allCards();
        card = (list || []).find(c => c.id === id);
      }
      if (!card && this._lastCardsMap && this._lastCardsMap[id]) {
        card = this._lastCardsMap[id];
      }
      if (!card) {
        card = { id: id, term: id, meaning: '' };
      }

      const tvModule = (typeof window !== 'undefined' && window.VokabelTypingVerification) ||
                       (typeof global !== 'undefined' && global.VokabelTypingVerification) ||
                       (typeof require === 'function' ? (function() { try { return require('./typing-verification.js'); } catch(e){ return null; } })() : null);

      let canonical = card.term || card.de || '';
      let graded = {
        result: 'wrong',
        mappedRating: 'unknown',
        canonical: canonical,
        feedback: `Chưa chính xác — đáp án: ${canonical}`
      };

      if (tvModule && typeof tvModule.gradeTypingAnswer === 'function') {
        canonical = tvModule.getCanonicalTypingAnswer(card);
        graded = tvModule.gradeTypingAnswer(userInput, canonical, card);
      } else {
        const normIn = String(userInput || '').trim().toLowerCase();
        const normCan = String(canonical || '').trim().toLowerCase();
        if (normIn === normCan) {
          graded = { result: 'correct', mappedRating: 'known', canonical: canonical, feedback: 'Chính xác! Rất tốt.' };
        } else {
          graded = { result: 'wrong', mappedRating: 'unknown', canonical: canonical, feedback: `Chưa chính xác — đáp án: ${canonical}` };
        }
      }

      targetState.attempts = (targetState.attempts || 0) + 1;
      targetState.recallRatings = targetState.recallRatings || [];
      targetState.recallRatings.push(graded.mappedRating);
      targetState.lastObjectiveResult = graded.result;
      targetState.lastTypingAnswer = userInput;
      targetState.canonicalAnswer = canonical;
      targetState.typingFeedback = graded.feedback;
      targetState.typingSubmitted = true;

      let justCompletedTarget = false;
      let justCompletedSession = false;

      if (graded.result === 'correct') {
        // CORRECT: Hoàn thành target ngay lập tức nếu đúng
        targetState.completed = true;
        targetState.needsReview = false;
        targetState.method = 'typing';
        targetState.consecutiveSuccess = (targetState.consecutiveSuccess || 0) + 1;

        VokabelLearningState.recordRecallSuccess(id);
        this._updateLegacyProgress(id, 'known');

        if (!session.completedTargets.includes(id)) {
          session.completedTargets.push(id);
          justCompletedTarget = true;

          // Xác định FSRS rating cho toàn bộ session của target này
          let fsrsRating = 3; // Good
          if (targetState.recallRatings.includes('unknown')) {
            fsrsRating = 1; // Again
          } else if (targetState.recallRatings.includes('hard')) {
            fsrsRating = 2; // Hard
          }
          targetState.finalRating = fsrsRating;

          // P0-2: Commit FSRS CHỈ MỘT LẦN DUY NHẤT và kiểm tra kết quả scheduler
          if (!targetState.srsCommitted) {
            const srs = (typeof window !== 'undefined' && window.VokabelSRS) || (typeof global !== 'undefined' && global.VokabelSRS);
            let srsRecord = null;
            if (srs && typeof srs.scheduleReview === 'function') {
              try {
                srsRecord = srs.scheduleReview(id, fsrsRating);
              } catch (e) {
                console.error('[VokabelSession] Lỗi scheduleReview typing:', e);
              }
            }
            if (srsRecord) {
              targetState.srsCommitted = true;
              targetState.srsPending = false;
            } else {
              targetState.srsCommitted = false;
              targetState.srsPending = true;
            }
          }

          if (typeof window !== 'undefined' && typeof window.onCardReviewedForFeed === 'function') {
            try { window.onCardReviewedForFeed(id); } catch (e) {}
          } else if (typeof window !== 'undefined' && window.VokabelDaily && typeof window.VokabelDaily.reviewCard === 'function') {
            window.VokabelDaily.reviewCard(id);
          }
        }

        // Xóa mọi item thừa của thẻ này trong tương lai
        for (let k = session.queue.length - 1; k > session.queueIndex; k--) {
          if (session.queue[k].cardId === id) {
            session.queue.splice(k, 1);
          }
        }
      } else {
        // ALMOST hoặc WRONG: Chưa hoàn thành, ghi nhận thất bại và requeue
        targetState.failures = (targetState.failures || 0) + 1;
        targetState.consecutiveSuccess = 0;
        targetState.needsReview = true;

        VokabelLearningState.recordRecallFailure(id, graded.mappedRating);
        this._updateLegacyProgress(id, graded.mappedRating);

        // FAIL-SAFE: Nếu sai 3 lần trong session -> Guided Reinforcement
        if (targetState.failures >= 3) {
          const insertPos = Math.min(session.queueIndex + 3, session.queue.length);
          session.queue.splice(insertPos, 0, { type: 'reinforce', cardId: id });
        } else {
          // Re-queue thành bước recall sau 2-3 items
          const insertPos = Math.min(session.queueIndex + 3, session.queue.length);
          session.queue.splice(insertPos, 0, { type: 'recall', cardId: id });
        }
      }

      session.targetStates[id] = targetState;

      // P0-2: Không set session.completed ngay trong handleTypingSubmit
      // vì người học vẫn đang xem feedback và tương tác typing chưa kết thúc (chờ Continue hoặc auto-delay).
      // session.completed sẽ được set khi gọi handleTypingContinue() sau bước feedback.
      justCompletedSession = false;

      this.saveSession(session);

      return {
        session: session,
        cardId: id,
        result: graded.result,
        mappedRating: graded.mappedRating,
        feedback: graded.feedback,
        canonical: canonical,
        justCompletedTarget: justCompletedTarget,
        justCompletedSession: justCompletedSession,
        targetState: targetState
      };
    },

    // Tiếp tục sau bước Typing Verification
    handleTypingContinue: function() {
      const session = this.getTodaySession();
      if (!session) return null;

      const currentItem = session.queue[session.queueIndex];
      if (!currentItem || currentItem.type !== 'typing') return null;

      const id = currentItem.cardId;
      const targetState = session.targetStates[id];
      // P0-2 Guard: Chỉ cho phép continue nếu targetState tồn tại và typingSubmitted === true
      // Chặn double-click Continue, timer cũ, gọi nhầm, và race giữa manual continue và auto-continue.
      if (!targetState || targetState.typingSubmitted !== true) {
        return null;
      }

      targetState.typingSubmitted = false;

      session.queueIndex = (session.queueIndex || 0) + 1;

      // P0-2: Kiểm tra hoàn thành session khi kết thúc bước typing cuối cùng
      let justCompletedSession = false;
      if (session.completedTargets.length >= session.targetIds.length && !session.completed) {
        session.completed = true;
        session.completedAt = new Date().toISOString();
        justCompletedSession = true;
      }

      session.justCompletedSession = justCompletedSession;

      this.saveSession(session);
      return session;
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
