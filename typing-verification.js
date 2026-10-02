// ==============================================================================
// VokabelGo - Objective Recall / Typing Verification (Phase 3)
// Vietnamese -> German Typing Verification for mature review targets
// ==============================================================================

(function() {
  'use strict';

  const GERMAN_ARTICLES = ['der', 'die', 'das', 'den', 'dem', 'des', 'ein', 'eine', 'einen', 'einem', 'einer', 'eines'];
  const EXCLUDED_TAGS = ['inhalt', 'grammatik', 'fragen', 'qa', 'q&a', 'redemittel_lang'];

  const VokabelTypingVerification = {
    // 1. Chuẩn hóa câu trả lời (trim, collapse spaces, lowercase, strip edge punctuation)
    normalizeAnswer: function(text) {
      if (!text) return '';
      let s = String(text).trim().toLowerCase();
      // Remove non-lexical punctuation at edges: quotes, periods, commas, brackets, etc.
      s = s.replace(/^[„“"'`«»(\[\{.,!?:;\-_—–]+|[„“"'`«»(\]\},.!?:;\-_—–]+$/g, '').trim();
      // Collapse internal whitespace
      s = s.replace(/\s+/g, ' ').trim();
      return s;
    },

    // 2. Rút trích đáp án chuẩn (Canonical German Answer)
    // Ví dụ: "die Geste, -n" -> "die Geste"
    getCanonicalTypingAnswer: function(card) {
      if (!card) return '';
      let term = (card.term || card.de || '').trim();
      if (!term) return '';

      // Loại bỏ annotation plural sau dấu phẩy: ", -n", ", -er", ", -¨er", ", pl.", ", die ..."
      term = term.replace(/,\s*(-[^\s,]*|pl\.?|Pl\.?|die\s+[a-zA-ZäöüÄÖÜß]+)$/i, '').trim();

      // Collapse whitespace
      term = term.replace(/\s+/g, ' ').trim();

      return term;
    },

    // 3. Kiểm tra tính hợp lệ của thẻ cho Typing Verification
    isTypingEligible: function(card) {
      if (!card) return false;
      const rawTerm = (card.term || card.de || '').trim();
      const rawMeaning = (card.meaning || card.vi || '').trim();
      if (!rawTerm || !rawMeaning) return false;

      // Loại trừ câu hỏi
      if (rawTerm.includes('?') || rawMeaning.includes('?')) return false;

      // Loại trừ placeholder kiểu ... hoặc …
      if (rawTerm.includes('...') || rawTerm.includes('…')) return false;

      // Loại trừ nhiều biến thể ngăn cách bằng / hoặc ;
      if (rawTerm.includes('/') || rawTerm.includes(';')) return false;

      // Loại trừ các tags: Inhalt, Grammatik, Fragen
      const tags = Array.isArray(card.tags) ? card.tags : [];
      for (const t of tags) {
        if (EXCLUDED_TAGS.includes(String(t).toLowerCase().trim())) {
          return false;
        }
      }

      // Loại trừ deck nếu chứa Grammatik hoặc Inhalt
      const deck = String(card.deck || '').toLowerCase();
      if (deck.includes('grammatik') || deck.includes('inhalt')) {
        return false;
      }

      // Phải rút trích được canonical answer an toàn
      const canonical = this.getCanonicalTypingAnswer(card);
      if (!canonical || canonical.length < 2) return false;

      // Giới hạn độ dài: tối đa 45 ký tự và tối đa 4 từ
      if (canonical.length > 45) return false;
      const words = canonical.split(/\s+/).filter(Boolean);
      if (words.length > 4) return false;

      return true;
    },

    // 4. Tính khoảng cách Levenshtein giữa 2 chuỗi
    levenshteinDistance: function(s1, s2) {
      if (s1 === s2) return 0;
      if (!s1.length) return s2.length;
      if (!s2.length) return s1.length;

      let prev = [];
      for (let j = 0; j <= s2.length; j++) prev[j] = j;

      for (let i = 1; i <= s1.length; i++) {
        const curr = [i];
        for (let j = 1; j <= s2.length; j++) {
          if (s1[i - 1] === s2[j - 1]) {
            curr[j] = prev[j - 1];
          } else {
            curr[j] = Math.min(prev[j - 1] + 1, prev[j] + 1, curr[j - 1] + 1);
          }
        }
        prev = curr;
      }
      return prev[s2.length];
    },

    // 5. Bỏ Umlaut và ß để kiểm tra lỗi biến âm
    stripUmlauts: function(str) {
      return (str || '')
        .replace(/ä/g, 'a')
        .replace(/ö/g, 'o')
        .replace(/ü/g, 'u')
        .replace(/ß/g, 'ss');
    },

    // 6. Tách mạo từ và phần danh từ chính
    extractArticleAndCore: function(normalizedText) {
      const parts = (normalizedText || '').split(' ');
      if (parts.length >= 2 && GERMAN_ARTICLES.includes(parts[0])) {
        return {
          article: parts[0],
          core: parts.slice(1).join(' ')
        };
      }
      return {
        article: null,
        core: normalizedText || ''
      };
    },

    // 7. Chấm điểm câu trả lời gõ từ người học
    // Phân loại: CORRECT (known / Good), ALMOST (hard / Hard), WRONG (unknown / Again)
    gradeTypingAnswer: function(userInput, canonicalAnswer, card) {
      const rawInput = (userInput || '').trim();
      const rawCanonical = (canonicalAnswer || (card ? this.getCanonicalTypingAnswer(card) : '') || '').trim();

      const normInput = this.normalizeAnswer(rawInput);
      const normCanonical = this.normalizeAnswer(rawCanonical);

      if (!normInput) {
        return {
          result: 'wrong',
          mappedRating: 'unknown',
          canonical: rawCanonical,
          feedback: `Chưa chính xác — đáp án: ${rawCanonical}`
        };
      }

      // A. CORRECT: Trùng khớp hoàn toàn sau chuẩn hóa
      if (normInput === normCanonical) {
        return {
          result: 'correct',
          mappedRating: 'known',
          canonical: rawCanonical,
          feedback: 'Chính xác! Rất tốt.'
        };
      }

      const inputParsed = this.extractArticleAndCore(normInput);
      const canonicalParsed = this.extractArticleAndCore(normCanonical);

      // B. ALMOST - THIẾU MẠO TỪ (Ví dụ: "Entscheidung" thay vì "die Entscheidung")
      if (canonicalParsed.article && !inputParsed.article) {
        if (inputParsed.core === canonicalParsed.core) {
          return {
            result: 'almost',
            mappedRating: 'hard',
            canonical: rawCanonical,
            feedback: `Gần đúng — nhớ cả mạo từ: ${rawCanonical}`
          };
        }
      }

      // C. ALMOST - SAI MẠO TỪ (Ví dụ: "der Entscheidung" thay vì "die Entscheidung")
      if (canonicalParsed.article && inputParsed.article && inputParsed.article !== canonicalParsed.article) {
        if (inputParsed.core === canonicalParsed.core) {
          return {
            result: 'almost',
            mappedRating: 'hard',
            canonical: rawCanonical,
            feedback: `Gần đúng — mạo từ đúng là ${canonicalParsed.article}: ${rawCanonical}`
          };
        }
      }

      // D. ALMOST - LỖI BIẾN ÂM UMLAUT / ß (Ví dụ: "uber" thay vì "über", "grosse" thay vì "große")
      const inputDeUmlaut = this.stripUmlauts(normInput);
      const canonicalDeUmlaut = this.stripUmlauts(normCanonical);
      if (inputDeUmlaut === canonicalDeUmlaut) {
        return {
          result: 'almost',
          mappedRating: 'hard',
          canonical: rawCanonical,
          feedback: `Gần đúng — chú ý âm biến (Umlaut/ß): ${rawCanonical}`
        };
      }

      // Thiếu mạo từ kèm biến âm
      if (canonicalParsed.article && !inputParsed.article) {
        const inputCoreDeUmlaut = this.stripUmlauts(inputParsed.core);
        const canonicalCoreDeUmlaut = this.stripUmlauts(canonicalParsed.core);
        if (inputCoreDeUmlaut === canonicalCoreDeUmlaut) {
          return {
            result: 'almost',
            mappedRating: 'hard',
            canonical: rawCanonical,
            feedback: `Gần đúng — nhớ mạo từ ${canonicalParsed.article} và âm biến: ${rawCanonical}`
          };
        }
      }

      // E. ALMOST - TYPO NHỎ (Edit distance <= 1 cho từ đủ dài >= 5 ký tự)
      // Ví dụ: "die Entscheidun" thay vì "die Entscheidung"
      if (normCanonical.length >= 5) {
        const dist = this.levenshteinDistance(normInput, normCanonical);
        if (dist === 1) {
          return {
            result: 'almost',
            mappedRating: 'hard',
            canonical: rawCanonical,
            feedback: `Gần đúng (lỗi chính tả nhỏ) — đáp án: ${rawCanonical}`
          };
        }
      }

      // Typo nhỏ ở phần danh từ khi thiếu mạo từ (Ví dụ: "Entscheidun" vs "die Entscheidung")
      if (canonicalParsed.article && !inputParsed.article && canonicalParsed.core.length >= 5) {
        const coreDist = this.levenshteinDistance(inputParsed.core, canonicalParsed.core);
        if (coreDist === 1) {
          return {
            result: 'almost',
            mappedRating: 'hard',
            canonical: rawCanonical,
            feedback: `Gần đúng — nhớ mạo từ ${canonicalParsed.article} và chính tả: ${rawCanonical}`
          };
        }
      }

      // Typo nhỏ ở phần danh từ khi đúng mạo từ
      if (canonicalParsed.article && inputParsed.article === canonicalParsed.article && canonicalParsed.core.length >= 5) {
        const coreDist = this.levenshteinDistance(inputParsed.core, canonicalParsed.core);
        if (coreDist === 1) {
          return {
            result: 'almost',
            mappedRating: 'hard',
            canonical: rawCanonical,
            feedback: `Gần đúng (lỗi chính tả nhỏ) — đáp án: ${rawCanonical}`
          };
        }
      }

      // F. WRONG - KHÁC BIỆT RÕ HOẶC KHÔNG CHẮC CHẮN
      return {
        result: 'wrong',
        mappedRating: 'unknown',
        canonical: rawCanonical,
        feedback: `Chưa chính xác — đáp án: ${rawCanonical}`
      };
    }
  };

  // Expose
  if (typeof window !== 'undefined') {
    window.VokabelTypingVerification = VokabelTypingVerification;
  }
  if (typeof global !== 'undefined') {
    global.VokabelTypingVerification = VokabelTypingVerification;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = VokabelTypingVerification;
  }
})();
