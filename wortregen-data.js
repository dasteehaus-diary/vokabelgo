/**
 * Wortregen V0.1 — Vocabulary Provider (Phase 2)
 * Connects the real VokabelGo vocabulary repository (allCards) to Wortregen
 * Reuses VokabelCardSchema for normalization, tiering, and priority queueing
 */

(function() {
  'use strict';

  class WortregenVocabularyProvider {
    constructor(options = {}) {
      this.schema = options.schema || 
        (typeof window !== 'undefined' ? window.VokabelCardSchema : null) || 
        (typeof global !== 'undefined' ? global.VokabelCardSchema : null);
      
      this.cardsSource = options.cardsSource || null;
      this.deck = options.deck || null;
      this.sessionQueue = [];
      this.usedCardIds = new Set();
      this.eligiblePool = [];
      this.tier1Pool = [];
      this.tier2Pool = [];
      this.tier3Pool = [];
      
      this.stats = {
        totalCards: 0,
        eligibleCount: 0,
        tier1Count: 0,
        tier2Count: 0,
        tier3Count: 0,
        excludedCount: 0,
        exclusionReasons: {}
      };
    }

    /**
     * Retrieve all available raw cards from repository
     */
    getAllCards() {
      if (typeof this.cardsSource === 'function') {
        return this.cardsSource();
      }
      if (Array.isArray(this.cardsSource)) {
        return this.cardsSource;
      }
      if (typeof window !== 'undefined' && typeof window.allCards === 'function') {
        return window.allCards();
      }
      if (typeof global !== 'undefined' && typeof global.allCards === 'function') {
        return global.allCards();
      }
      throw new Error("Wortregen vocabulary source unavailable");
    }

    /**
     * Classify card into lexical tiers:
     * Tier 1: Single lexical items (noun with/without article, single verbs, adjectives/other short words)
     * Tier 2: Short phrases (sich bewerben, Angst haben, Bescheid sagen, <= 3 words, <= 28 clean chars)
     * Tier 3: Longer phrases (3-4 words, <= 40 clean chars)
     */
    classifyTier(card, profile) {
      const canonical = (profile.canonicalAnswer || '').trim();
      const cleanAns = canonical.replace(/\s+/g, '');
      const cleanLen = cleanAns.length;
      const words = canonical.split(/\s+/).filter(Boolean);

      // Safety limits: <= 40 chars, <= 4 words
      if (cleanLen < 2 || cleanLen > 40 || words.length > 4) {
        return null;
      }

      // Tier 1: Single lexical items
      // 1. Nouns: der Termin, die Entscheidung, das Haus (with article, still 1 lexical item)
      if (profile.cardType === 'noun') {
        if (cleanLen <= 22) return 1;
        if (cleanLen <= 30) return 2;
        return 3;
      }

      // 2. Single non-reflexive verbs: helfen, lernen, verstehen
      if (profile.cardType === 'verb' && !canonical.toLowerCase().startsWith('sich ') && words.length === 1) {
        if (cleanLen <= 22) return 1;
        return 2;
      }

      // 3. Adjectives or single-word other lexical items: wichtig, zuverlässig
      if ((profile.cardType === 'other' || profile.cardType === 'adjective') && words.length === 1) {
        if (cleanLen <= 22) return 1;
        return 2;
      }

      // Tier 2: Short phrases (e.g. sich bewerben, Angst haben, Bescheid sagen, 2-3 words, cleanLen <= 28)
      if (words.length <= 3 && cleanLen <= 28) {
        return 2;
      }

      // Tier 3: Longer phrases (3-4 words or cleanLen <= 40)
      if (cleanLen <= 40) {
        return 3;
      }

      return null;
    }

    /**
     * Calculate fall duration based on card tier and answer length:
     * Tier 1 short: 18.5s
     * Tier 1 long: 21.0s
     * Tier 2 short: 24.0s
     * Tier 2 long: 26.5s
     * Tier 3: 28.5s
     */
    getFallDuration(card, profile) {
      const canonical = (profile && profile.canonicalAnswer ? profile.canonicalAnswer : card.de || '').trim();
      const cleanLen = canonical.replace(/\s+/g, '').length;
      const tier = card.tier || 1;

      if (tier === 1) {
        return cleanLen <= 8 ? 18.5 : 21.0;
      } else if (tier === 2) {
        return cleanLen <= 18 ? 24.0 : 26.5;
      } else {
        return 28.5;
      }
    }

    /**
     * Future SRS priority hook (FSRS / weak words / memory difficulty)
     */
    calculatePriorityScore(card, profile) {
      // Extensibility point: return priority weight
      const tier = card.tier || 1;
      return tier === 1 ? 100 : tier === 2 ? 60 : 30;
    }

    /**
     * Filter and normalize all cards from repository
     */
    getEligibleCards(options = {}) {
      if (!this.schema) {
        if (typeof window !== 'undefined' && window.VokabelCardSchema) {
          this.schema = window.VokabelCardSchema;
        } else if (typeof global !== 'undefined' && global.VokabelCardSchema) {
          this.schema = global.VokabelCardSchema;
        }
      }
      if (!this.schema) {
        throw new Error("VokabelCardSchema unavailable");
      }

      const deck = options.deck !== undefined ? options.deck : this.deck;
      const rawCards = this.getAllCards();

      this.stats.totalCards = rawCards.length;
      this.stats.eligibleCount = 0;
      this.stats.tier1Count = 0;
      this.stats.tier2Count = 0;
      this.stats.tier3Count = 0;
      this.stats.excludedCount = 0;
      this.stats.exclusionReasons = {};

      const eligibleList = [];

      for (const card of rawCards) {
        if (!card || typeof card !== 'object') continue;

        // Deck filter if specified
        if (deck && card.deck !== deck) {
          continue;
        }

        // Basic structural requirements
        const rawTerm = (card.term || card.de || '').trim();
        const rawMeaning = (card.meaning || card.vi || '').trim();
        const cardId = card.id ? String(card.id).trim() : '';

        if (!cardId || !rawTerm || !rawMeaning) {
          this.recordExclusion('missing_required_fields');
          continue;
        }

        // Normalize card using VokabelCardSchema
        const profile = this.schema.normalizeCard(card);

        // Eligibility validation
        if (profile.needsManualReview) {
          const reason = profile.ambiguityReasons && profile.ambiguityReasons.length > 0
            ? profile.ambiguityReasons.join('+')
            : 'needs_manual_review';
          this.recordExclusion(reason);
          continue;
        }

        if (profile.cardType === 'grammar') {
          this.recordExclusion('grammar_card');
          continue;
        }
        if (profile.cardType === 'content') {
          this.recordExclusion('content_card');
          continue;
        }
        if (profile.cardType === 'question') {
          this.recordExclusion('question_card');
          continue;
        }

        if (!profile.objectiveTypingEligible) {
          this.recordExclusion('not_objective_typing_eligible');
          continue;
        }

        const canonical = (profile.canonicalAnswer || '').trim();
        if (!canonical) {
          this.recordExclusion('empty_canonical_answer');
          continue;
        }

        // Tier classification
        const tier = this.classifyTier(card, profile);
        if (!tier) {
          this.recordExclusion('length_or_word_count_exceeded');
          continue;
        }

        const cleanLen = canonical.replace(/\s+/g, '').length;
        const duration = this.getFallDuration({ tier }, profile);

        const eligibleCard = {
          id: cardId,
          vi: rawMeaning,
          de: canonical,
          term: rawTerm,
          meaning: rawMeaning,
          deck: card.deck || '',
          tier: tier,
          cleanLen: cleanLen,
          duration: duration,
          cardType: profile.cardType,
          profile: profile
        };

        eligibleList.push(eligibleCard);

        if (tier === 1) this.stats.tier1Count++;
        else if (tier === 2) this.stats.tier2Count++;
        else if (tier === 3) this.stats.tier3Count++;
      }

      this.stats.eligibleCount = eligibleList.length;
      this.stats.excludedCount = this.stats.totalCards - eligibleList.length;

      return eligibleList;
    }

    recordExclusion(reason) {
      this.stats.exclusionReasons[reason] = (this.stats.exclusionReasons[reason] || 0) + 1;
    }

    /**
     * Build structured Wortregen queue according to section 5:
     * Items 1-10: 100% Tier 1 (if available)
     * Items 11-20: ~80% Tier 1, ~20% Tier 2
     * Items 21+: ~60% Tier 1, ~30% Tier 2, up to 10% Tier 3
     */
    buildQueue(options = {}) {
      const eligible = this.getEligibleCards(options);
      if (eligible.length === 0) {
        throw new Error("No eligible vocabulary cards available for Wortregen");
      }

      this.eligiblePool = eligible;
      this.usedCardIds.clear();

      // Separate pools by tier
      this.tier1Pool = eligible.filter(c => c.tier === 1);
      this.tier2Pool = eligible.filter(c => c.tier === 2);
      this.tier3Pool = eligible.filter(c => c.tier === 3);

      this.shuffleArray(this.tier1Pool);
      this.shuffleArray(this.tier2Pool);
      this.shuffleArray(this.tier3Pool);

      // Pointers into tier pools
      let p1 = 0;
      let p2 = 0;
      let p3 = 0;

      const takeFromTier = (t) => {
        if (t === 1 && p1 < this.tier1Pool.length) return this.tier1Pool[p1++];
        if (t === 2 && p2 < this.tier2Pool.length) return this.tier2Pool[p2++];
        if (t === 3 && p3 < this.tier3Pool.length) return this.tier3Pool[p3++];
        // Fallback to closest available tier
        if (p1 < this.tier1Pool.length) return this.tier1Pool[p1++];
        if (p2 < this.tier2Pool.length) return this.tier2Pool[p2++];
        if (p3 < this.tier3Pool.length) return this.tier3Pool[p3++];
        return null;
      };

      const queue = [];
      const totalEligible = eligible.length;

      for (let i = 0; i < totalEligible; i++) {
        let desiredTier = 1;
        if (i < 10) {
          // Items 1-10: 100% Tier 1
          desiredTier = 1;
        } else if (i < 20) {
          // Items 11-20: 75-80% Tier 1, 20-25% Tier 2
          // Pick Tier 2 at index 13 and index 18
          desiredTier = (i === 13 || i === 18) ? 2 : 1;
        } else {
          // Items 21+: 60-70% Tier 1, 25-30% Tier 2, max 10% Tier 3
          const mod = (i - 20) % 10;
          if (mod === 3 || mod === 7) {
            desiredTier = 2;
          } else if (mod === 9) {
            desiredTier = 3;
          } else {
            desiredTier = 1;
          }
        }

        const picked = takeFromTier(desiredTier);
        if (picked) {
          queue.push(picked);
          this.usedCardIds.add(picked.id);
        } else {
          break;
        }
      }

      this.sessionQueue = queue;
      this.currentIndex = 0;
      return this.sessionQueue;
    }

    /**
     * Get next card for gameplay, ensuring no immediate duplication with active cards on screen
     */
    getNextCard(activeScreenCardIds = []) {
      const activeSet = new Set(activeScreenCardIds.map(id => String(id)));

      // If queue is exhausted or empty, refill from eligible pool without duplicating active cards
      if (this.sessionQueue.length === 0) {
        this.refillQueue(activeSet);
      }

      // Find first card in queue not currently active on screen
      for (let i = 0; i < this.sessionQueue.length; i++) {
        const candidate = this.sessionQueue[i];
        if (!activeSet.has(String(candidate.id))) {
          this.sessionQueue.splice(i, 1);
          return candidate;
        }
      }

      // If all remaining candidates are in activeSet, force refill
      this.refillQueue(activeSet);
      if (this.sessionQueue.length > 0) {
        return this.sessionQueue.shift();
      }

      throw new Error("Wortregen vocabulary source unavailable: no valid cards remaining");
    }

    refillQueue(activeSet = new Set()) {
      if (!this.eligiblePool || this.eligiblePool.length === 0) {
        this.buildQueue();
      } else {
        // Re-shuffle pools while avoiding active screen cards at the head of queue
        const candidates = this.eligiblePool.filter(c => !activeSet.has(String(c.id)));
        this.shuffleArray(candidates);
        this.sessionQueue.push(...candidates);
      }
    }

    shuffleArray(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    }
  }

  if (typeof window !== 'undefined') {
    window.WortregenVocabularyProvider = WortregenVocabularyProvider;
  }
  if (typeof global !== 'undefined') {
    global.WortregenVocabularyProvider = WortregenVocabularyProvider;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = WortregenVocabularyProvider;
  }
})();
