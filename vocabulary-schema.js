// ==============================================================================
// VokabelGo - Vocabulary Data Model & Normalization Layer (Phase 4A)
// Pure deterministic schema normalization for German lexical items
// ==============================================================================

(function() {
  'use strict';

  // Constants
  const GERMAN_ARTICLES = ['der', 'die', 'das'];
  const EXCLUDED_TAGS = ['inhalt', 'grammatik', 'fragen', 'qa', 'q&a', 'redemittel_lang'];
  const EXCLUDED_DECKS = ['grammatik', 'inhalt'];

  // Grammar metadata pattern: e.g. "+ Dat.", "+ Akk.", "+ Genitiv", "+ Passiv", "+ Infinitiv Perfekt"
  const GRAMMAR_META_REGEX = /\s*(\+\s*(?:Dat\.|Akk\.|Genitiv|Gen\.|Passiv|Infinitiv(?: Perfekt)?|[A-Z][a-zA-ZäöüßÄÖÜ.]*(?:\s+[A-Z][a-zA-ZäöüßÄÖÜ.]*)*))$/i;

  // Plural notation pattern at end of term: e.g. ", -n", ", -er", ", -¨er", ", pl.", ", die ..."
  const PLURAL_NOTATION_REGEX = /,\s*(-[^\s,]*|pl\.?|Pl\.?|die\s+[^,]+)$/i;

  // In-memory cache for high-frequency runtime normalization (no localStorage writes)
  const profileCache = new Map();

  /**
   * Deterministic cache fingerprint capturing all fields influencing normalization:
   * id, term/de, meaning/vi, grammar, deck, tags
   */
  function computeCacheFingerprint(card) {
    if (!card || typeof card !== 'object') return null;
    const id = card.id || '';
    const term = (card.term || card.de || '').trim();
    const meaning = (card.meaning || card.vi || '').trim();
    const grammar = (card.grammar || '').trim();
    const deck = String(card.deck || '').trim();
    const tags = Array.isArray(card.tags)
      ? card.tags.map(t => String(t).trim().toLowerCase()).sort().join('|')
      : '';
    if (!id && !term) return null;
    return `${id}\x1f${term}\x1f${meaning}\x1f${grammar}\x1f${deck}\x1f${tags}`;
  }

  /**
   * Deep clone of profile to ensure caller cannot mutate cached objects
   */
  function cloneProfile(p) {
    if (!p) return null;
    return {
      displayTerm: p.displayTerm,
      canonicalAnswer: p.canonicalAnswer,
      headword: p.headword,
      article: p.article,
      plural: p.plural,
      pluralNotation: p.pluralNotation,
      grammarMeta: p.grammarMeta,
      cardType: p.cardType,
      objectiveTypingEligible: p.objectiveTypingEligible,
      needsManualReview: p.needsManualReview,
      ambiguityReasons: Array.isArray(p.ambiguityReasons) ? p.ambiguityReasons.slice() : []
    };
  }

  const VokabelCardSchema = {
    /**
     * Clear profile cache (useful for testing or hot-reload)
     */
    clearCache: function() {
      profileCache.clear();
    },

    /**
     * Expose cache fingerprint generator for validation / testing
     */
    computeCacheFingerprint: computeCacheFingerprint,

    /**
     * Normalize a card into its derived lexical profile
     * Pure function: does NOT mutate source card, does NOT write to localStorage.
     *
     * @param {Object} card Source card object
     * @returns {Object} Derived profile
     */
    normalizeCard: function(card) {
      if (!card || typeof card !== 'object') {
        return {
          displayTerm: '',
          canonicalAnswer: '',
          headword: '',
          article: null,
          plural: null,
          pluralNotation: null,
          grammarMeta: null,
          cardType: 'other',
          objectiveTypingEligible: false,
          needsManualReview: false,
          ambiguityReasons: ['invalid_card']
        };
      }

      // Check cache key using composite deterministic fingerprint
      const cacheKey = computeCacheFingerprint(card);
      if (cacheKey && profileCache.has(cacheKey)) {
        return cloneProfile(profileCache.get(cacheKey));
      }

      const rawTerm = (card.term || card.de || '').trim();
      const displayTerm = rawTerm;
      const rawMeaning = (card.meaning || card.vi || '').trim();
      const rawGrammar = (card.grammar || '').trim();
      const tags = (Array.isArray(card.tags) ? card.tags : []).map(t => String(t).trim());
      const lowerTags = tags.map(t => t.toLowerCase());
      const rawDeck = String(card.deck || '').trim();
      const lowerDeck = rawDeck.toLowerCase();

      let canonicalAnswer = '';
      let headword = '';
      let article = null;
      let plural = null;
      let pluralNotation = null;
      let grammarMeta = null;
      let cardType = 'other';
      let needsManualReview = false;
      const ambiguityReasons = [];

      // 1. Detect Grammar Metadata on Term (+ Dat., + Akk., + Passiv, etc.)
      let termWithoutGrammarMeta = rawTerm;
      const metaMatch = rawTerm.match(GRAMMAR_META_REGEX);
      if (metaMatch) {
        grammarMeta = metaMatch[1].trim();
        termWithoutGrammarMeta = rawTerm.slice(0, metaMatch.index).trim();
      }

      // 2. Detect Plural Notation on Term (, -n, , die ...)
      let termWithoutPlural = termWithoutGrammarMeta;
      const pluralMatch = termWithoutGrammarMeta.match(PLURAL_NOTATION_REGEX);
      if (pluralMatch) {
        pluralNotation = pluralMatch[1].trim();
        termWithoutPlural = termWithoutGrammarMeta.slice(0, pluralMatch.index).trim();
        if (/^die\s+/i.test(pluralNotation)) {
          plural = pluralNotation;
        }
      }

      // If plural was not on term, check card.grammar for e.g. "die Pizzaläden (m.)"
      if (!plural && rawGrammar) {
        const gramPluralMatch = rawGrammar.match(/,\s*(die\s+[A-ZÄÖÜ][a-zA-ZäöüÄÖÜß]+)/i);
        if (gramPluralMatch) {
          plural = gramPluralMatch[1].trim();
          if (!pluralNotation) {
            pluralNotation = plural;
          }
        }
      }

      // 3. Ambiguity / Anomaly checks
      const hasQuestion = rawTerm.includes('?') || rawMeaning.includes('?');
      const hasEllipsis = rawTerm.includes('...') || rawTerm.includes('…');
      const hasSlashOrSemicolon = rawTerm.includes('/') || rawTerm.includes(';');
      const hasArrow = rawTerm.includes('→') || rawTerm.includes('->');

      if (hasSlashOrSemicolon) ambiguityReasons.push('has_slash_or_semicolon');
      if (hasEllipsis) ambiguityReasons.push('has_ellipsis');
      if (hasArrow) ambiguityReasons.push('has_flow_arrow');

      // 4. Card Type Classification
      // A. Question
      if (hasQuestion || lowerTags.includes('fragen') || lowerTags.includes('qa') || lowerTags.includes('q&a')) {
        cardType = 'question';
        canonicalAnswer = termWithoutPlural;
        headword = termWithoutPlural;
      }
      // B. Content
      else if (lowerTags.includes('inhalt') || lowerDeck.includes('inhalt')) {
        cardType = 'content';
        canonicalAnswer = termWithoutPlural;
        headword = termWithoutPlural;
      }
      // C. Grammar
      else if (lowerTags.includes('grammatik') || lowerDeck.includes('grammatik') ||
               /\b(modalverb|passiv|infinitiv|partizip|konjunktiv|genitiv)\b/i.test(rawTerm)) {
        cardType = 'grammar';
        canonicalAnswer = termWithoutPlural;
        headword = termWithoutPlural;
      }
      // D. Expression
      else if (lowerTags.includes('redewendung') || lowerTags.includes('umgangssprache') ||
               /\b(Interjektion|Ausruf)\b/i.test(rawGrammar) || rawTerm.endsWith('!')) {
        cardType = 'expression';
        canonicalAnswer = termWithoutPlural;
        headword = termWithoutPlural;
      }
      // E. Noun vs Verb vs Phrase vs Other
      else {
        const artNounMatch = termWithoutPlural.match(/^(der|die|das)\s+([A-ZÄÖÜ][a-zA-ZäöüÄÖÜß\-_]*)$/i);
        const gramNounMatch = rawGrammar.match(/\((m\.|f\.|n\.)\)/i) || rawGrammar.match(/^(der|die|das)\s+[A-ZÄÖÜ]/i);
        const words = termWithoutPlural.split(/\s+/).filter(Boolean);
        const lastWord = words.length > 0 ? words[words.length - 1] : '';
        const isVerbalEnding = words.length > 2 && /^[a-zäöüß]+(en|eln|ern)$/.test(lastWord) && !artNounMatch;

        if ((artNounMatch || (pluralMatch && /^(der|die|das)\s+[A-ZÄÖÜ]/i.test(rawTerm)) ||
            (gramNounMatch && /^[A-ZÄÖÜ]/.test(termWithoutPlural) && words.length === 1)) && !isVerbalEnding) {
          cardType = 'noun';
          if (artNounMatch) {
            article = artNounMatch[1].toLowerCase();
            headword = artNounMatch[2].trim();
            canonicalAnswer = `${article} ${headword}`;
          } else {
            const startArt = termWithoutPlural.match(/^(der|die|das)\s+(.*)$/i);
            if (startArt) {
              article = startArt[1].toLowerCase();
              headword = startArt[2].trim();
              canonicalAnswer = `${article} ${headword}`;
            } else {
              if (rawGrammar) {
                const gArt = rawGrammar.match(/^(der|die|das)\b/i);
                if (gArt) article = gArt[1].toLowerCase();
              }
              headword = termWithoutPlural;
              canonicalAnswer = article ? `${article} ${headword}` : headword;
            }
          }
        }
        else if (termWithoutPlural.startsWith('sich ') || /^[a-zäöüß]+(en|eln|ern)$/.test(termWithoutPlural) ||
                 /(\bđộng từ\b|\bVerb\b|hat\s+[a-zäöüß]+t|ist\s+[a-zäöüß]+t|Infinitiv)/i.test(rawGrammar)) {
          cardType = 'verb';
          canonicalAnswer = termWithoutPlural;
          headword = termWithoutPlural;
        }
        else if (lowerTags.includes('kollokation') || lowerTags.includes('sprechen') || lowerTags.includes('schreiben') ||
                 (words.length >= 2 && !hasSlashOrSemicolon && !hasEllipsis && !hasArrow)) {
          cardType = 'phrase';
          canonicalAnswer = termWithoutPlural;
          headword = termWithoutPlural;
        }
        else {
          cardType = 'other';
          canonicalAnswer = termWithoutPlural;
          headword = termWithoutPlural;
        }
      }

      // Check if manual review needed (ambiguity safety)
      if (hasSlashOrSemicolon || hasArrow || (hasEllipsis && cardType !== 'phrase') ||
          (rawTerm.length > 50 && cardType !== 'content' && cardType !== 'question')) {
        needsManualReview = true;
      }

      // Strict Phase 3 eligibility policy
      let objectiveTypingEligible = true;
      if (!rawTerm || !rawMeaning) {
        objectiveTypingEligible = false;
      } else if (hasQuestion) {
        objectiveTypingEligible = false;
      } else if (hasEllipsis) {
        objectiveTypingEligible = false;
      } else if (hasSlashOrSemicolon) {
        objectiveTypingEligible = false;
      } else if (rawTerm.includes('+') || /\b(dat\.|akk\.|genitiv|gen\.|passiv|infinitiv)\b/i.test(rawTerm)) {
        objectiveTypingEligible = false;
      } else if (cardType === 'grammar' || cardType === 'content' || cardType === 'question') {
        objectiveTypingEligible = false;
      } else {
        for (const t of lowerTags) {
          if (EXCLUDED_TAGS.includes(t)) {
            objectiveTypingEligible = false;
            break;
          }
        }
        if (objectiveTypingEligible) {
          for (const d of EXCLUDED_DECKS) {
            if (lowerDeck.includes(d)) {
              objectiveTypingEligible = false;
              break;
            }
          }
        }
        if (objectiveTypingEligible) {
          const words = canonicalAnswer.split(/\s+/).filter(Boolean);
          if (canonicalAnswer.length < 2 || canonicalAnswer.length > 45 || words.length > 4) {
            objectiveTypingEligible = false;
          }
        }
      }

      const profile = {
        displayTerm,
        canonicalAnswer,
        headword,
        article,
        plural,
        pluralNotation,
        grammarMeta,
        cardType,
        objectiveTypingEligible,
        needsManualReview,
        ambiguityReasons
      };

      if (cacheKey) {
        profileCache.set(cacheKey, cloneProfile(profile));
      }

      return cloneProfile(profile);
    }
  };

  // Expose across environments
  if (typeof window !== 'undefined') {
    window.VokabelCardSchema = VokabelCardSchema;
  }
  if (typeof global !== 'undefined') {
    global.VokabelCardSchema = VokabelCardSchema;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = VokabelCardSchema;
  }
})();
