// ==============================================================================
// VokabelGo - Long-Term Spaced Repetition System (Phase 2: FSRS-6)
// Official implementation via ts-fsrs@5.4.2
// LocalStorage Key: vokabelgo_srs_state_v1
// ==============================================================================

(function() {
  'use strict';

  const LS_SRS_STATE = 'vokabelgo_srs_state_v1';
  const ENGINE_NAME = 'fsrs6';
  const ENGINE_VERSION = 'ts-fsrs@5.4.2';
  const DEFAULT_REQUEST_RETENTION = 0.90;

  // Helper lấy tham chiếu FSRS library
  function getFSRSLibrary() {
    if (typeof window !== 'undefined' && window.FSRS) {
      return window.FSRS;
    }
    if (typeof global !== 'undefined' && global.FSRS) {
      return global.FSRS;
    }
    if (typeof require === 'function') {
      try {
        return require('./vendor/ts-fsrs/index.cjs');
      } catch (e) {}
    }
    return null;
  }

  // Khởi tạo instance FSRS với cấu hình chuẩn
  function getFSRSInstance() {
    const lib = getFSRSLibrary();
    if (!lib || typeof lib.fsrs !== 'function') {
      console.warn('[VokabelSRS] Thư viện FSRS (ts-fsrs) chưa sẵn sàng.');
      return null;
    }
    const params = lib.generatorParameters({
      request_retention: DEFAULT_REQUEST_RETENTION,
      enable_short_term: false
    });
    return {
      lib: lib,
      f: lib.fsrs(params)
    };
  }

  // Deserializer chuyển đổi từ JSON storage sang FSRS Card
  function deserializeFsrsCard(raw, lib) {
    if (!raw) {
      return lib.createEmptyCard();
    }
    return {
      due: new Date(raw.due),
      stability: Number(raw.stability) || 0,
      difficulty: Number(raw.difficulty) || 0,
      elapsed_days: Number(raw.elapsed_days) || 0,
      scheduled_days: Number(raw.scheduled_days) || 0,
      reps: Number(raw.reps) || 0,
      lapses: Number(raw.lapses) || 0,
      learning_steps: Number(raw.learning_steps) || 0,
      state: Number(raw.state) || 0,
      last_review: raw.last_review ? new Date(raw.last_review) : undefined
    };
  }

  // Serializer chuyển đổi từ FSRS Card sang JSON storage an toàn
  function serializeFsrsCard(card) {
    return {
      due: card.due instanceof Date ? card.due.toISOString() : new Date(card.due).toISOString(),
      stability: Number(card.stability) || 0,
      difficulty: Number(card.difficulty) || 0,
      elapsed_days: Number(card.elapsed_days) || 0,
      scheduled_days: Number(card.scheduled_days) || 0,
      reps: Number(card.reps) || 0,
      lapses: Number(card.lapses) || 0,
      learning_steps: Number(card.learning_steps) || 0,
      state: Number(card.state) || 0,
      last_review: card.last_review
        ? (card.last_review instanceof Date ? card.last_review.toISOString() : new Date(card.last_review).toISOString())
        : undefined
    };
  }

  function getStorage() {
    if (typeof localStorage !== 'undefined') return localStorage;
    if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
    if (typeof global !== 'undefined' && global.localStorage) return global.localStorage;
    return null;
  }

  const VokabelSRS = {
    ENGINE_NAME: ENGINE_NAME,
    ENGINE_VERSION: ENGINE_VERSION,
    DEFAULT_REQUEST_RETENTION: DEFAULT_REQUEST_RETENTION,

    // Tải state SRS độc lập từ LocalStorage
    load: function() {
      const storage = getStorage();
      if (!storage) {
        return {
          version: 1,
          engine: ENGINE_NAME,
          engineVersion: ENGINE_VERSION,
          updatedAt: new Date().toISOString(),
          cards: {}
        };
      }
      try {
        const raw = storage.getItem(LS_SRS_STATE);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') {
            if (!parsed.cards || typeof parsed.cards !== 'object') parsed.cards = {};
            parsed.version = 1;
            parsed.engine = ENGINE_NAME;
            parsed.engineVersion = ENGINE_VERSION;
            return parsed;
          }
        }
      } catch (e) {
        console.warn('[VokabelSRS] Lỗi đọc srs_state:', e);
      }
      return {
        version: 1,
        engine: ENGINE_NAME,
        engineVersion: ENGINE_VERSION,
        updatedAt: new Date().toISOString(),
        cards: {}
      };
    },

    // Lưu state SRS độc lập vào LocalStorage
    save: function(state) {
      const storage = getStorage();
      if (!storage) return;
      try {
        state.version = 1;
        state.engine = ENGINE_NAME;
        state.engineVersion = ENGINE_VERSION;
        state.updatedAt = new Date().toISOString();
        storage.setItem(LS_SRS_STATE, JSON.stringify(state));
      } catch (e) {
        console.error('[VokabelSRS] Lỗi ghi srs_state:', e);
      }
      if (typeof window !== 'undefined' && typeof window.onLocalDataChanged === 'function') {
        try { window.onLocalDataChanged('srsState'); } catch (err) {}
      }
    },

    // Lấy thông tin SRS của 1 thẻ
    getCard: function(cardId) {
      if (!cardId) return null;
      const state = this.load();
      return state.cards[String(cardId)] || null;
    },

    // Kiểm tra xem thẻ đã đến hạn ôn tập chưa (dueAt <= now)
    isDue: function(cardId, nowTime) {
      if (!cardId) return false;
      const card = this.getCard(cardId);
      if (!card || !card.dueAt) return false;
      const dueMs = new Date(card.dueAt).getTime();
      const nowMs = nowTime ? new Date(nowTime).getTime() : Date.now();
      return dueMs <= nowMs;
    },

    // Độ trễ quá hạn (mili-giây). Số dương lớn = càng quá hạn lâu
    getDueGap: function(cardId, nowTime) {
      if (!cardId) return 0;
      const card = this.getCard(cardId);
      if (!card || !card.dueAt) return 0;
      const dueMs = new Date(card.dueAt).getTime();
      const nowMs = nowTime ? new Date(nowTime).getTime() : Date.now();
      return nowMs - dueMs;
    },

    // Rating mapping helper
    // unknown -> Again (1), hard -> Hard (2), known -> Good (3)
    mapRating: function(rating) {
      if (typeof rating === 'number') {
        if (rating >= 1 && rating <= 3) return rating;
      }
      if (typeof rating === 'string') {
        const lower = rating.toLowerCase();
        if (lower === 'unknown' || lower === 'again' || lower === '1') return 1;
        if (lower === 'hard' || lower === '2') return 2;
        if (lower === 'known' || lower === 'good' || lower === '3') return 3;
      }
      return 1; // Mặc định an toàn
    },

    // Lên lịch ôn tập tiếp theo bằng FSRS-6
    // Gọi CHỈ MỘT LẦN khi target hoàn thành Daily Session
    scheduleReview: function(cardId, rating, reviewTime) {
      const safeId = String(cardId);
      const fsrsInstance = getFSRSInstance();
      if (!fsrsInstance) {
        console.error('[VokabelSRS] Không thể schedule: FSRS instance không khả dụng');
        return null;
      }

      const { lib, f } = fsrsInstance;
      const finalRating = this.mapRating(rating);
      const now = reviewTime ? new Date(reviewTime) : new Date();

      const state = this.load();
      const existing = state.cards[safeId] || null;

      const fsrsCard = deserializeFsrsCard(existing ? existing.fsrsCard : null, lib);
      const schedulingCards = f.repeat(fsrsCard, now);
      const resultCard = schedulingCards[finalRating].card;

      const newRecord = {
        fsrsCard: serializeFsrsCard(resultCard),
        dueAt: resultCard.due instanceof Date ? resultCard.due.toISOString() : new Date(resultCard.due).toISOString(),
        lastRating: finalRating,
        lastScheduledAt: now.toISOString(),
        historyCount: (existing?.historyCount || 0) + 1
      };

      state.cards[safeId] = newRecord;
      this.save(state);
      return newRecord;
    },

    // Thống kê due cards cho Today Dashboard
    getDueStats: function(nowTime) {
      const state = this.load();
      const nowMs = nowTime ? new Date(nowTime).getTime() : Date.now();
      let totalWithSrs = 0;
      let dueCount = 0;
      let overdueCount = 0;

      for (const id in state.cards) {
        totalWithSrs++;
        const card = state.cards[id];
        if (card.dueAt) {
          const dueMs = new Date(card.dueAt).getTime();
          if (dueMs <= nowMs) {
            dueCount++;
            if (nowMs - dueMs > 86400000) { // Quá hạn hơn 1 ngày
              overdueCount++;
            }
          }
        }
      }

      return {
        totalWithSrs: totalWithSrs,
        dueCount: dueCount,
        overdueCount: overdueCount
      };
    },

    // Reset testing
    resetForTesting: function() {
      const storage = getStorage();
      if (storage) storage.removeItem(LS_SRS_STATE);
    }
  };

  // Expose to window / global namespace
  if (typeof window !== 'undefined') {
    window.VokabelSRS = VokabelSRS;
  }
  if (typeof global !== 'undefined') {
    global.VokabelSRS = VokabelSRS;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = VokabelSRS;
  }
})();
