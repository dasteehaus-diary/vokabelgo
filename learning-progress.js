// ==============================================================================
// VokabelGo - Learning Progress Truth Layer (Phase 4B)
// Pure derived state truth for memory & learning status.
// Single source of truth derived on-the-fly from SRS, Learning State & Legacy progress.
// NO new LocalStorage keys. NO cloud sync fields. NO snapshot classification saved.
// ==============================================================================

(function() {
  'use strict';

  function getStorage() {
    if (typeof localStorage !== 'undefined') return localStorage;
    if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
    if (typeof global !== 'undefined' && global.localStorage) return global.localStorage;
    return null;
  }

  function getSRS() {
    if (typeof window !== 'undefined' && window.VokabelSRS) return window.VokabelSRS;
    if (typeof global !== 'undefined' && global.VokabelSRS) return global.VokabelSRS;
    if (typeof require === 'function') {
      try { return require('./fsrs-srs.js'); } catch(e) {}
    }
    return null;
  }

  function isDueForReview(dueAt, nowTime) {
    if (!dueAt) return false;
    const srs = getSRS();
    if (srs && typeof srs.isDueForDailySession === 'function') {
      return srs.isDueForDailySession(dueAt, nowTime);
    }
    const getLocalDateKey = (d) => {
      const dt = d ? new Date(d) : new Date();
      return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
    };
    return getLocalDateKey(dueAt) <= getLocalDateKey(nowTime);
  }

  function loadSrsState() {
    const storage = getStorage();
    if (!storage) return { cards: {} };
    try {
      const raw = storage.getItem('vokabelgo_srs_state_v1');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && parsed.cards) return parsed;
      }
    } catch (e) {}
    return { cards: {} };
  }

  function loadLearningState() {
    const storage = getStorage();
    if (!storage) return { cards: {} };
    try {
      const raw = storage.getItem('vokabelgo_learning_state_v1');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && parsed.cards) return parsed;
      }
    } catch (e) {}
    return { cards: {} };
  }

  function loadLegacyProgress() {
    const storage = getStorage();
    if (!storage) return {};
    try {
      const raw = storage.getItem('dmf_flash_progress_v2');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch (e) {}
    return {};
  }

  const VokabelProgressTruth = {
    STATUS: {
      UNSEEN: 'unseen',
      LEARNING: 'learning',
      NEEDS_REVIEW: 'needs_review',
      STABLE: 'stable'
    },

    LABELS: {
      unseen: 'Chưa học',
      learning: 'Đang học',
      needs_review: 'Cần ôn',
      stable: 'Nhớ ổn'
    },

    /**
     * Internal classifier using preloaded stores
     */
    _classifyWithStores: function(cardId, srsState, learningState, legacyProgress, nowTime) {
      if (!cardId && cardId !== 0) {
        return {
          cardId: '',
          status: 'unseen',
          label: this.LABELS.unseen,
          seen: false,
          dueNow: false,
          debug: { hasSrs: false, historyCount: 0, lastRating: null, learningNeedsReview: false, source: 'unseen' }
        };
      }

      const safeId = String(cardId);
      const srsCard = srsState && srsState.cards && srsState.cards[safeId] ? srsState.cards[safeId] : null;
      const lsCard = learningState && learningState.cards && learningState.cards[safeId] ? learningState.cards[safeId] : null;
      const legacyVal = legacyProgress ? legacyProgress[safeId] : undefined;

      // 1. SRS Evidence (Highest Priority)
      if (srsCard && srsCard.dueAt) {
        const dueNow = isDueForReview(srsCard.dueAt, nowTime);
        const historyCount = Number(srsCard.historyCount) || 0;
        const lastRating = Number(srsCard.lastRating) || 0;
        const learningNeedsReview = Boolean(lsCard && lsCard.needsReview === true);

        // Case 5.A: If due according to calendar date -> needs_review (even if lastRating === 3)
        if (dueNow) {
          return {
            cardId: safeId,
            status: 'needs_review',
            label: this.LABELS.needs_review,
            seen: true,
            dueNow: true,
            debug: {
              hasSrs: true,
              historyCount,
              lastRating,
              learningNeedsReview,
              source: 'srs'
            }
          };
        }

        // Case 5.B: Not due, lastRating === 3 (Good) AND historyCount >= 2 AND learningState.needsReview !== true -> stable
        if (lastRating === 3 && historyCount >= 2 && !learningNeedsReview) {
          return {
            cardId: safeId,
            status: 'stable',
            label: this.LABELS.stable,
            seen: true,
            dueNow: false,
            debug: {
              hasSrs: true,
              historyCount,
              lastRating,
              learningNeedsReview,
              source: 'srs'
            }
          };
        }

        // Case 5.C: Not due, but lastRating === 2 (Hard) OR lastRating === 1 (Again) OR historyCount < 2 OR learningNeedsReview === true -> learning
        return {
          cardId: safeId,
          status: 'learning',
          label: this.LABELS.learning,
          seen: true,
          dueNow: false,
          debug: {
            hasSrs: true,
            historyCount,
            lastRating,
            learningNeedsReview,
            source: 'srs'
          }
        };
      }

      // 2. Non-SRS Evidence (Learning State & Legacy Fallback)
      const isLegacyUnknownOrHard = legacyVal === 'unknown' || legacyVal === 'hard';
      const isLearningNeedsReview = Boolean(lsCard && lsCard.needsReview === true);

      // Case 6.A: Needs review in legacy or learning state -> needs_review
      if (isLegacyUnknownOrHard || isLearningNeedsReview) {
        return {
          cardId: safeId,
          status: 'needs_review',
          label: this.LABELS.needs_review,
          seen: true,
          dueNow: true,
          debug: {
            hasSrs: false,
            historyCount: 0,
            lastRating: null,
            learningNeedsReview: isLearningNeedsReview,
            source: isLearningNeedsReview ? 'learning_state' : 'legacy'
          }
        };
      }

      // Case 6.B & 7: Evidence of having learned (firstSeenAt, lastReviewedAt, legacy known, mastered) -> learning
      // IMPORTANT: legacy known or mastered WITHOUT sufficient SRS evidence NEVER maps to stable!
      const hasLearningStateEvidence = Boolean(lsCard && (lsCard.firstSeenAt || lsCard.lastReviewedAt || lsCard.status === 'learning' || lsCard.status === 'review' || lsCard.status === 'mastered'));
      const hasLegacyKnown = legacyVal === 'known';

      if (hasLearningStateEvidence || hasLegacyKnown) {
        return {
          cardId: safeId,
          status: 'learning',
          label: this.LABELS.learning,
          seen: true,
          dueNow: false,
          debug: {
            hasSrs: false,
            historyCount: 0,
            lastRating: null,
            learningNeedsReview: false,
            source: hasLearningStateEvidence ? 'learning_state' : 'legacy'
          }
        };
      }

      // Case 6.C: Unseen
      return {
        cardId: safeId,
        status: 'unseen',
        label: this.LABELS.unseen,
        seen: false,
        dueNow: false,
        debug: {
          hasSrs: false,
          historyCount: 0,
          lastRating: null,
          learningNeedsReview: false,
          source: 'unseen'
        }
      };
    },

    /**
     * Classify single card by cardId
     * Returns { cardId, status, label, seen, dueNow, debug }
     */
    classifyCard: function(cardId, nowTime) {
      const srsState = loadSrsState();
      const learningState = loadLearningState();
      const legacyProgress = loadLegacyProgress();
      return this._classifyWithStores(cardId, srsState, learningState, legacyProgress, nowTime);
    },

    /**
     * Get aggregate progress summary for a list of cards
     * Invariants:
     * - unseen + learning + needsReview + stable === total
     * - seen === learning + needsReview + stable
     * - Does NOT count orphan records for cards not in allCardsList
     * - Deduplicates allCardsList by card id
     */
    getSummary: function(allCardsList, nowTime) {
      let cards = allCardsList;
      if (!cards) {
        if (typeof window !== 'undefined' && typeof window.allCards === 'function') {
          cards = window.allCards();
        } else {
          cards = [];
        }
      }

      const summary = {
        total: 0,
        unseen: 0,
        learning: 0,
        needsReview: 0,
        stable: 0,
        seen: 0
      };

      if (!Array.isArray(cards) || cards.length === 0) {
        return summary;
      }

      // Deduplicate cards by ID to prevent double-counting
      const uniqueCards = [];
      const seenCardIds = new Set();

      for (let i = 0; i < cards.length; i++) {
        const c = cards[i];
        if (!c) continue;
        const cid = String(c.id || '');
        if (!cid || seenCardIds.has(cid)) continue;
        seenCardIds.add(cid);
        uniqueCards.push(c);
      }

      summary.total = uniqueCards.length;

      // Preload stores once for performance across all cards
      const srsState = loadSrsState();
      const learningState = loadLearningState();
      const legacyProgress = loadLegacyProgress();

      for (let i = 0; i < uniqueCards.length; i++) {
        const card = uniqueCards[i];
        const cid = String(card.id);
        const classification = this._classifyWithStores(cid, srsState, learningState, legacyProgress, nowTime);

        switch (classification.status) {
          case 'unseen':
            summary.unseen++;
            break;
          case 'learning':
            summary.learning++;
            break;
          case 'needs_review':
            summary.needsReview++;
            break;
          case 'stable':
            summary.stable++;
            break;
        }
      }

      summary.seen = summary.learning + summary.needsReview + summary.stable;

      return summary;
    }
  };

  // Expose
  if (typeof window !== 'undefined') {
    window.VokabelProgressTruth = VokabelProgressTruth;
  }
  if (typeof global !== 'undefined') {
    global.VokabelProgressTruth = VokabelProgressTruth;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = VokabelProgressTruth;
  }
})();
