// ==============================================================================
// VokabelGo - Objective Recall / Listening Verification (Phase 5)
// German Audio -> German Active Dictation for mature review targets
// ==============================================================================

(function() {
  'use strict';

  let schemaModule = null;
  function getSchema() {
    if (typeof window !== 'undefined' && window.VokabelCardSchema) return window.VokabelCardSchema;
    if (typeof global !== 'undefined' && global.VokabelCardSchema) return global.VokabelCardSchema;
    if (schemaModule) return schemaModule;
    if (typeof require !== 'undefined') {
      try {
        schemaModule = require('./vocabulary-schema.js');
        return schemaModule;
      } catch (e) {}
    }
    return null;
  }

  let typingModule = null;
  function getTypingVerification() {
    if (typeof window !== 'undefined' && window.VokabelTypingVerification) return window.VokabelTypingVerification;
    if (typeof global !== 'undefined' && global.VokabelTypingVerification) return global.VokabelTypingVerification;
    if (typingModule) return typingModule;
    if (typeof require !== 'undefined') {
      try {
        typingModule = require('./typing-verification.js');
        return typingModule;
      } catch (e) {}
    }
    return null;
  }

  const VokabelListeningVerification = {
    /**
     * Kiểm tra tính khả dụng của SpeechSynthesis API trong runtime hiện tại
     * Yêu cầu tối thiểu:
     * - window.speechSynthesis tồn tại
     * - typeof window.speechSynthesis.speak === 'function'
     * - typeof window.speechSynthesis.cancel === 'function'
     * - typeof window.SpeechSynthesisUtterance === 'function'
     */
    canUseSpeech: function() {
      if (typeof window === 'undefined') return false;
      if (!window.speechSynthesis) return false;
      if (typeof window.speechSynthesis.speak !== 'function') return false;
      if (typeof window.speechSynthesis.cancel !== 'function') return false;
      if (typeof window.SpeechSynthesisUtterance !== 'function') return false;
      return true;
    },

    /**
     * Dừng phát âm listening hiện tại một cách an toàn
     */
    stopListeningSpeech: function() {
      try {
        if (
          typeof window !== 'undefined' &&
          window.speechSynthesis &&
          typeof window.speechSynthesis.cancel === 'function'
        ) {
          window.speechSynthesis.cancel();
        }
      } catch (e) {}
    },

    /**
     * Rút trích văn bản tiếng Đức chuẩn để phát âm (Canonical Spoken Text)
     * TUYỆT ĐỐI KHÔNG đọc displayTerm có annotation plural (vd: ", -n", ", -er")
     * Ví dụ: "die Geste, -n" -> "die Geste"
     * "der Gesichtsausdruck, die Gesichtsausdrücke" -> "der Gesichtsausdruck"
     */
    getListeningText: function(card) {
      if (!card || typeof card !== 'object') return '';
      const schema = getSchema();
      if (schema && typeof schema.normalizeCard === 'function') {
        const profile = schema.normalizeCard(card);
        if (profile && profile.canonicalAnswer) {
          return profile.canonicalAnswer;
        }
      }
      let term = (card.term || card.de || '').trim();
      if (!term) return '';
      term = term.replace(/,\s*(-[^\s,]*|pl\.?|Pl\.?|die\s+[^,]+)$/i, '').trim();
      term = term.replace(/\s+/g, ' ').trim();
      return term;
    },

    /**
     * Kiểm tra thẻ có đủ điều kiện làm mục tiêu Listening Recall không:
     * - Thẻ review trưởng thành (SRS record với historyCount >= 2);
     * - Đạt chuẩn lexical normalization Phase 4A (objectiveTypingEligible);
     * - canonicalAnswer tồn tại, độ dài từ 2 đến 45 ký tự, tối đa 4 từ;
     * - Loại trừ grammar, content, question;
     * - Không chứa cấu trúc ngữ pháp mơ hồ (+ Dat., /, ;, ..., →).
     *
     * @param {Object} card Thẻ từ vựng
     * @param {Object} [srsRecord] Bản ghi SRS tùy chọn để kiểm tra độ trưởng thành
     * @returns {boolean}
     */
    isListeningEligible: function(card, srsRecord) {
      if (!card || typeof card !== 'object') return false;

      // 1. Kiểm tra SRS record (Review target mature với historyCount >= 2)
      let srs = srsRecord;
      if (srs === undefined) {
        if (card.srs && typeof card.srs === 'object') {
          srs = card.srs;
        } else if (typeof card.historyCount === 'number') {
          srs = { historyCount: card.historyCount };
        } else if (card.isNew === true) {
          return false;
        } else {
          try {
            const srsMod = (typeof window !== 'undefined' && window.VokabelSRS) || (typeof global !== 'undefined' && global.VokabelSRS);
            if (srsMod && typeof srsMod.load === 'function' && card.id) {
              const srsState = srsMod.load();
              if (srsState && srsState.cards) {
                srs = srsState.cards[card.id];
              }
            }
          } catch (e) {}
        }
      }

      if (!srs) return false;
      const historyCount = (typeof srs.historyCount === 'number')
        ? srs.historyCount
        : (Array.isArray(srs.history) ? srs.history.length : 0);
      if (historyCount < 2) return false;

      // 2. Lexical Schema Normalization check
      const schema = getSchema();
      const profile = (schema && typeof schema.normalizeCard === 'function')
        ? schema.normalizeCard(card)
        : null;

      if (!profile) return false;
      if (!profile.objectiveTypingEligible) return false;
      if (profile.needsManualReview) return false;
      if (['grammar', 'content', 'question'].includes(profile.cardType)) return false;

      const canonical = profile.canonicalAnswer;
      if (!canonical || canonical.length < 2 || canonical.length > 45) return false;
      const words = canonical.split(/\s+/).filter(Boolean);
      if (words.length > 4) return false;

      // 3. Bảo vệ thêm với raw fields
      const rawTerm = (card.term || card.de || '').trim();
      const rawMeaning = (card.meaning || card.vi || '').trim();
      if (!rawTerm || !rawMeaning) return false;
      if (rawTerm.includes('?') || rawMeaning.includes('?')) return false;
      if (rawTerm.includes('/') || rawTerm.includes(';')) return false;
      if (rawTerm.includes('...') || rawTerm.includes('…')) return false;
      if (rawTerm.includes('+')) return false;

      return true;
    },

    /**
     * Phát âm từ tiếng Đức bằng Browser SpeechSynthesis
     * Rate: 0.9, Lang: de-DE, ưu tiên giọng Đức nếu có
     *
     * @param {Object} card Thẻ từ vựng
     * @param {Function} [onEndCallback] Callback khi phát xong
     * @param {Function} [onErrorCallback] Callback riêng khi gặp utterance.onerror
     * @returns {boolean} true nếu speak thành công, false nếu lỗi synchronous hoặc không thể phát
     */
    speakPrompt: function(card, onEndCallback, onErrorCallback) {
      if (!this.canUseSpeech()) return false;
      const text = this.getListeningText(card);
      if (!text) return false;

      try {
        this.stopListeningSpeech();
        const utterance = new window.SpeechSynthesisUtterance(text);
        utterance.lang = 'de-DE';
        utterance.rate = 0.9;

        if (typeof window.speechSynthesis.getVoices === 'function') {
          const voices = window.speechSynthesis.getVoices();
          if (Array.isArray(voices) && voices.length > 0) {
            const deVoice = voices.find(v => v && v.lang && v.lang.toLowerCase().startsWith('de'));
            if (deVoice) {
              utterance.voice = deVoice;
            }
          }
        }

        if (typeof onEndCallback === 'function') {
          utterance.onend = onEndCallback;
        }

        if (typeof onErrorCallback === 'function') {
          utterance.onerror = onErrorCallback;
        } else if (typeof onEndCallback === 'function') {
          utterance.onerror = onEndCallback;
        }

        window.speechSynthesis.speak(utterance);
        return true;
      } catch (err) {
        console.warn('[VokabelListeningVerification] Speech error:', err);
        return false;
      }
    },

    /**
     * Chấm điểm câu trả lời nghe của người học
     * Tái sử dụng VokabelTypingVerification.gradeTypingAnswer()
     */
    gradeListeningAnswer: function(userInput, card) {
      const canonical = this.getListeningText(card);
      const tv = getTypingVerification();
      if (tv && typeof tv.gradeTypingAnswer === 'function') {
        return tv.gradeTypingAnswer(userInput, canonical, card);
      }
      const normInput = String(userInput || '').trim().toLowerCase();
      const normCanonical = String(canonical || '').trim().toLowerCase();
      if (normInput === normCanonical) {
        return {
          result: 'correct',
          mappedRating: 'known',
          canonical: canonical,
          feedback: 'Chính xác! Rất tốt.'
        };
      }
      return {
        result: 'wrong',
        mappedRating: 'unknown',
        canonical: canonical,
        feedback: `Chưa chính xác — đáp án: ${canonical}`
      };
    }
  };

  // Expose
  if (typeof window !== 'undefined') {
    window.VokabelListeningVerification = VokabelListeningVerification;
  }
  if (typeof global !== 'undefined') {
    global.VokabelListeningVerification = VokabelListeningVerification;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = VokabelListeningVerification;
  }
})();
