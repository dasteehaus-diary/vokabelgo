/**
 * Wortregen V0.1 — Mưa Từ Vựng (VokabelGo Prototype)
 * Isolated Prototype for Gameplay Mechanics Verification
 */

(function() {
  'use strict';

  // ---------------------------------------------------------------------------
  // 1. Vocabulary Dataset (30 Core German Words)
  // ---------------------------------------------------------------------------
  const WORD_POOL = [
    { vi: "quyết định", de: "die Entscheidung" },
    { vi: "cuộc hẹn", de: "der Termin" },
    { vi: "đáng tin cậy", de: "zuverlässig" },
    { vi: "ứng tuyển", de: "sich bewerben" },
    { vi: "siêu thị", de: "der Supermarkt" },
    { vi: "bánh mì", de: "das Brot" },
    { vi: "quả táo", de: "der Apfel" },
    { vi: "thành phố", de: "die Stadt" },
    { vi: "ngôi nhà", de: "das Haus" },
    { vi: "người bạn", de: "der Freund" },
    { vi: "công việc", de: "die Arbeit" },
    { vi: "thời gian", de: "die Zeit" },
    { vi: "trường học", de: "die Schule" },
    { vi: "tiền bạc", de: "das Geld" },
    { vi: "cuốn sách", de: "das Buch" },
    { vi: "câu hỏi", de: "die Frage" },
    { vi: "câu trả lời", de: "die Antwort" },
    { vi: "nước uống", de: "das Wasser" },
    { vi: "gia đình", de: "die Familie" },
    { vi: "chiếc xe", de: "das Auto" },
    { vi: "học tập", de: "lernen" },
    { vi: "hiểu", de: "verstehen" },
    { vi: "nói", de: "sprechen" },
    { vi: "viết", de: "schreiben" },
    { vi: "đọc", de: "lesen" },
    { vi: "giúp đỡ", de: "helfen" },
    { vi: "bắt đầu", de: "beginnen" },
    { vi: "nhanh", de: "schnell" },
    { vi: "quan trọng", de: "wichtig" },
    { vi: "đơn giản", de: "einfach" }
  ];

  // ---------------------------------------------------------------------------
  // 2. Sound Effects Engine (Web Audio API Synthesizer)
  // ---------------------------------------------------------------------------
  class SoundEngine {
    constructor() {
      this.ctx = null;
      this.muted = false;
    }

    init() {
      try {
        if (!this.ctx) {
          const AudioCtx = window.AudioContext || window.webkitAudioContext;
          if (AudioCtx) {
            this.ctx = new AudioCtx();
          }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
          this.ctx.resume().catch(() => {});
        }
      } catch (e) {
        // Headless audio fallback
      }
    }

    setMuted(muted) {
      this.muted = muted;
    }

    toggleMute() {
      this.muted = !this.muted;
      return this.muted;
    }

    playCorrect(combo = 0) {
      if (this.muted || !this.ctx) return;
      try {
        const now = this.ctx.currentTime;
        // Pitch shifts up as combo increases
        const baseFreq = combo >= 3 ? 659.25 : 523.25; // E5 or C5
        const secondFreq = combo >= 3 ? 987.77 : 783.99; // B5 or G5

        // Note 1
        const osc1 = this.ctx.createOscillator();
        const gain1 = this.ctx.createGain();
        osc1.type = 'triangle';
        osc1.frequency.setValueAtTime(baseFreq, now);

        gain1.gain.setValueAtTime(0.001, now);
        gain1.gain.exponentialRampToValueAtTime(0.25, now + 0.02);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

        osc1.connect(gain1);
        gain1.connect(this.ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.25);

        // Note 2 (slightly delayed harmony)
        const osc2 = this.ctx.createOscillator();
        const gain2 = this.ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(secondFreq, now + 0.08);

        gain2.gain.setValueAtTime(0.001, now + 0.08);
        gain2.gain.exponentialRampToValueAtTime(0.3, now + 0.1);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

        osc2.connect(gain2);
        gain2.connect(this.ctx.destination);
        osc2.start(now + 0.08);
        osc2.stop(now + 0.35);
      } catch (e) {
        // Audio error fail-safe
      }
    }

    playMiss() {
      if (this.muted || !this.ctx) return;
      try {
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        // Downward soft slide
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(110, now + 0.2);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.exponentialRampToValueAtTime(0.22, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.25);
      } catch (e) {
        // Audio error fail-safe
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 3. Normalization Helper
  // ---------------------------------------------------------------------------
  function normalizeAnswer(text) {
    if (!text) return '';
    return String(text)
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');
  }

  // ---------------------------------------------------------------------------
  // 4. Wortregen Game Engine
  // ---------------------------------------------------------------------------
  class WortregenGame {
    constructor() {
      // DOM Elements
      this.appEl = document.getElementById('wortregen-app');
      this.fallingArea = document.getElementById('falling-area');
      this.inputEl = document.getElementById('word-input');
      this.inputForm = document.getElementById('input-dock');
      this.hudLives = document.getElementById('hud-lives');
      this.hudScore = document.getElementById('hud-score-val');
      this.hudCombo = document.getElementById('hud-combo');
      this.btnMute = document.getElementById('btn-mute');
      this.soundIconOn = document.getElementById('icon-sound-on');
      this.soundIconOff = document.getElementById('icon-sound-off');

      // Screens
      this.startScreen = document.getElementById('start-screen');
      this.gameOverScreen = document.getElementById('game-over-screen');
      this.btnStart = document.getElementById('btn-start');
      this.btnReplay = document.getElementById('btn-replay');

      // Summary Elements
      this.summaryScore = document.getElementById('summary-score');
      this.summarySolved = document.getElementById('summary-solved');
      this.summaryMissed = document.getElementById('summary-missed');
      this.summaryCombo = document.getElementById('summary-combo');

      // Audio
      this.sound = new SoundEngine();

      // State
      this.state = 'IDLE'; // 'IDLE', 'PLAYING', 'GAME_OVER'
      this.lives = 3;
      this.score = 0;
      this.combo = 0;
      this.maxCombo = 0;
      this.solvedCount = 0;
      this.missedCount = 0;

      // Mechanics
      this.activeWords = [];
      this.wordIdCounter = 1;
      this.availableWords = [...WORD_POOL];
      this.baseSpeed = 46; // px per second
      this.speedIncrement = 1.2; // slight increment after correct answers
      this.maxConcurrent = 3;
      this.spawnTimer = null;
      this.animFrameId = null;
      this.lastFrameTime = 0;

      this.initEvents();
    }

    initEvents() {
      // Start & Replay
      this.btnStart.addEventListener('click', () => {
        try { this.sound.init(); } catch (e) {}
        this.startGame();
      });

      this.btnReplay.addEventListener('click', () => {
        try { this.sound.init(); } catch (e) {}
        this.startGame();
      });

      // Answer Submission
      this.inputForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleSubmit();
      });

      // Sound Toggle
      this.btnMute.addEventListener('click', () => {
        this.sound.init();
        const isMuted = this.sound.toggleMute();
        this.updateSoundIcon(isMuted);
      });

      // Auto-refocus input during active play
      document.addEventListener('click', (e) => {
        if (this.state === 'PLAYING') {
          // If not clicking mute button, refocus input
          if (!e.target.closest('#btn-mute')) {
            this.focusInput();
          }
        }
      });

      // Visual Viewport Handling for Mobile Virtual Keyboard
      if (window.visualViewport) {
        const handleResize = () => {
          if (this.appEl) {
            this.appEl.style.height = `${window.visualViewport.height}px`;
          }
        };
        window.visualViewport.addEventListener('resize', handleResize);
        window.visualViewport.addEventListener('scroll', handleResize);
        handleResize();
      }
    }

    updateSoundIcon(isMuted) {
      if (isMuted) {
        this.soundIconOn.style.display = 'none';
        this.soundIconOff.style.display = 'block';
      } else {
        this.soundIconOn.style.display = 'block';
        this.soundIconOff.style.display = 'none';
      }
    }

    focusInput() {
      if (this.inputEl) {
        this.inputEl.focus();
      }
    }

    // -------------------------------------------------------------------------
    // Game Lifecycle
    // -------------------------------------------------------------------------
    startGame() {
      this.cleanup();

      this.state = 'PLAYING';
      this.lives = 3;
      this.score = 0;
      this.combo = 0;
      this.maxCombo = 0;
      this.solvedCount = 0;
      this.missedCount = 0;
      this.baseSpeed = 46;
      this.activeWords = [];
      this.availableWords = [...WORD_POOL];
      this.shuffleArray(this.availableWords);

      // Hide overlays
      this.startScreen.classList.add('hidden');
      this.gameOverScreen.classList.add('hidden');

      // Clear DOM falling cards
      this.fallingArea.querySelectorAll('.word-card, .floating-feedback').forEach(el => el.remove());

      // Update HUD
      this.renderHUD();

      // Reset input
      this.inputEl.value = '';
      this.focusInput();

      // Start Loops
      this.lastFrameTime = performance.now();
      this.animFrameId = requestAnimationFrame(this.gameLoop.bind(this));
      this.scheduleSpawn(300); // 1st word spawn
      setTimeout(() => {
        if (this.state === 'PLAYING' && this.activeWords.length < this.maxConcurrent) {
          this.maybeSpawnWord(); // 2nd word spawn
        }
      }, 1500);
    }

    gameOver() {
      this.state = 'GAME_OVER';
      this.cleanup();

      // Update Summary Card
      this.summaryScore.textContent = this.score;
      this.summarySolved.textContent = this.solvedCount;
      this.summaryMissed.textContent = this.missedCount;
      this.summaryCombo.textContent = `x${this.maxCombo}`;

      // Show Game Over Screen
      this.gameOverScreen.classList.remove('hidden');
    }

    cleanup() {
      if (this.animFrameId) {
        cancelAnimationFrame(this.animFrameId);
        this.animFrameId = null;
      }
      if (this.spawnTimer) {
        clearTimeout(this.spawnTimer);
        this.spawnTimer = null;
      }
    }

    // -------------------------------------------------------------------------
    // Word Spawning & Collision Prevention
    // -------------------------------------------------------------------------
    scheduleSpawn(delay = 2800) {
      if (this.state !== 'PLAYING') return;

      this.spawnTimer = setTimeout(() => {
        if (this.state === 'PLAYING') {
          this.maybeSpawnWord();
          // Dynamic interval slightly faster as score increases
          const nextDelay = Math.max(1900, 2900 - Math.min(800, this.solvedCount * 30));
          this.scheduleSpawn(nextDelay);
        }
      }, delay);
    }

    maybeSpawnWord() {
      if (this.activeWords.length >= this.maxConcurrent) {
        return; // Don't crowd the screen
      }

      if (this.availableWords.length === 0) {
        // Refill and reshuffle pool
        this.availableWords = [...WORD_POOL];
        this.shuffleArray(this.availableWords);
      }

      // Pick next word
      const wordData = this.availableWords.pop();
      const areaWidth = this.fallingArea.clientWidth || 340;
      const cardWidth = Math.min(180, Math.max(130, areaWidth * 0.42)); // estimated card width
      const minX = 10;
      const maxX = Math.max(minX, areaWidth - cardWidth - 10);

      // Find collision-free X coordinate at top zone (y < 95px)
      let spawnX = null;
      const topWords = this.activeWords.filter(w => !w.isDying && w.y < 95);

      for (let attempt = 0; attempt < 12; attempt++) {
        const candidateX = minX + Math.random() * (maxX - minX);
        const collides = topWords.some(w => Math.abs(candidateX - w.x) < cardWidth + 14);
        if (!collides) {
          spawnX = candidateX;
          break;
        }
      }

      // If crowded, pick position furthest from existing top cards
      if (spawnX === null) {
        if (topWords.length === 0) {
          spawnX = minX + (maxX - minX) * 0.5;
        } else {
          // Average position of top words, place on opposite side
          const avgX = topWords.reduce((s, w) => s + w.x, 0) / topWords.length;
          spawnX = avgX > areaWidth / 2 ? minX + 10 : maxX - 10;
        }
      }

      // Create DOM element
      const cardEl = document.createElement('div');
      cardEl.className = 'word-card';
      cardEl.id = `word-${this.wordIdCounter}`;

      const viEl = document.createElement('div');
      viEl.className = 'word-card-vi';
      viEl.textContent = wordData.vi;
      cardEl.appendChild(viEl);

      this.fallingArea.appendChild(cardEl);

      // Measure real dimensions
      const rect = cardEl.getBoundingClientRect();
      const actualWidth = rect.width || cardWidth;
      const actualHeight = rect.height || 48;

      // Keep inside bounds
      const clampedMaxX = Math.max(minX, areaWidth - actualWidth - 14);
      spawnX = Math.max(minX, Math.min(spawnX, clampedMaxX));
      const startY = 8;

      const wordObj = {
        id: this.wordIdCounter++,
        vi: wordData.vi,
        de: wordData.de,
        x: spawnX,
        y: startY,
        width: actualWidth,
        height: actualHeight,
        speed: this.baseSpeed + (Math.random() * 6 - 3), // slight random variance
        el: cardEl,
        isDying: false
      };

      cardEl.style.transform = `translate3d(${wordObj.x}px, ${wordObj.y}px, 0)`;
      this.activeWords.push(wordObj);
    }

    // -------------------------------------------------------------------------
    // Main Animation Loop
    // -------------------------------------------------------------------------
    gameLoop(timestamp) {
      if (this.state !== 'PLAYING') return;

      const dt = Math.min(0.1, (timestamp - this.lastFrameTime) / 1000);
      this.lastFrameTime = timestamp;

      const groundLimit = this.fallingArea.clientHeight;

      for (let i = this.activeWords.length - 1; i >= 0; i--) {
        const w = this.activeWords[i];
        if (w.isDying) continue;

        w.y += w.speed * dt;
        w.el.style.transform = `translate3d(${w.x}px, ${w.y}px, 0)`;

        // Check if word hits ground threshold
        if (w.y + w.height >= groundLimit - 4) {
          this.handleWordMissed(w, i);
        }
      }

      if (this.state === 'PLAYING') {
        this.animFrameId = requestAnimationFrame(this.gameLoop.bind(this));
      }
    }

    // -------------------------------------------------------------------------
    // Word Missed (Hits Ground)
    // -------------------------------------------------------------------------
    handleWordMissed(word, index) {
      word.isDying = true;
      this.activeWords.splice(index, 1);

      // Penalty
      this.lives -= 1;
      this.combo = 0;
      this.missedCount += 1;

      // Audio feedback
      this.sound.playMiss();

      // Visual feedback: animate card drop miss
      word.el.classList.add('word-missed');
      setTimeout(() => {
        if (word.el.parentNode) {
          word.el.remove();
        }
      }, 350);

      // Floating -1 Heart feedback
      this.showFloatingFeedback(word.x + word.width / 2, this.fallingArea.clientHeight - 35, '-1 ❤️', 'life-loss');

      // Update HUD
      this.renderHUD();

      // Check Game Over
      if (this.lives <= 0) {
        this.gameOver();
      }
    }

    // -------------------------------------------------------------------------
    // Answer Submission
    // -------------------------------------------------------------------------
    handleSubmit() {
      if (this.state !== 'PLAYING') return;

      const rawVal = this.inputEl.value;
      const normalizedInput = normalizeAnswer(rawVal);

      if (!normalizedInput) {
        return;
      }

      // Check against all active non-dying words
      // If multiple match, choose the one closest to the ground (highest y)
      let matchedWord = null;
      let matchedIdx = -1;

      for (let i = 0; i < this.activeWords.length; i++) {
        const w = this.activeWords[i];
        if (!w.isDying && normalizeAnswer(w.de) === normalizedInput) {
          if (!matchedWord || w.y > matchedWord.y) {
            matchedWord = w;
            matchedIdx = i;
          }
        }
      }

      if (matchedWord) {
        // CORRECT
        this.handleCorrectAnswer(matchedWord, matchedIdx);
      } else {
        // INCORRECT
        this.handleIncorrectAnswer();
      }

      // Always clear and refocus input
      this.inputEl.value = '';
      this.focusInput();
    }

    handleCorrectAnswer(word, index) {
      word.isDying = true;
      this.activeWords.splice(index, 1);

      // Stats
      this.score += 100;
      this.combo += 1;
      if (this.combo > this.maxCombo) {
        this.maxCombo = this.combo;
      }
      this.solvedCount += 1;

      // Gentle speed progression
      this.baseSpeed = Math.min(76, this.baseSpeed + this.speedIncrement);

      // Audio
      this.sound.playCorrect(this.combo);

      // Visual Pop Animation
      word.el.classList.add('word-popped');
      setTimeout(() => {
        if (word.el.parentNode) {
          word.el.remove();
        }
      }, 360);

      // Floating Score Indicator
      const scoreText = this.combo >= 3 ? `+100 (Combo x${this.combo})` : '+100';
      const scoreClass = this.combo >= 3 ? 'score combo-burst' : 'score';
      this.showFloatingFeedback(word.x + word.width / 2, Math.max(20, word.y), scoreText, scoreClass);

      // Update HUD
      this.renderHUD();
    }

    handleIncorrectAnswer() {
      // Combo resets to 0
      this.combo = 0;

      // Subtle shake on input (no loud red, gentle amber shake)
      this.inputEl.classList.remove('shake-subtle');
      void this.inputEl.offsetWidth; // Force reflow
      this.inputEl.classList.add('shake-subtle');
      setTimeout(() => {
        this.inputEl.classList.remove('shake-subtle');
      }, 320);

      // Update HUD
      this.renderHUD();
    }

    // -------------------------------------------------------------------------
    // HUD Rendering
    // -------------------------------------------------------------------------
    renderHUD() {
      // Lives (❤️ ❤️ ❤️)
      const hearts = this.hudLives.querySelectorAll('.hud-heart');
      hearts.forEach((h, idx) => {
        if (idx < this.lives) {
          h.classList.remove('lost');
          h.textContent = '❤️';
        } else {
          h.classList.add('lost');
          h.textContent = '🤍';
        }
      });

      // Score
      this.hudScore.textContent = this.score;

      // Combo
      this.hudCombo.textContent = `Combo x${this.combo}`;
      this.hudCombo.classList.remove('active', 'fire');

      if (this.combo >= 5) {
        this.hudCombo.classList.add('fire');
      } else if (this.combo >= 2) {
        this.hudCombo.classList.add('active');
      }
    }

    // -------------------------------------------------------------------------
    // Floating Feedback Popup
    // -------------------------------------------------------------------------
    showFloatingFeedback(x, y, text, extraClass = '') {
      const fb = document.createElement('div');
      fb.className = `floating-feedback ${extraClass}`;
      fb.textContent = text;
      fb.style.left = `${x}px`;
      fb.style.top = `${y}px`;

      this.fallingArea.appendChild(fb);

      setTimeout(() => {
        if (fb.parentNode) {
          fb.remove();
        }
      }, 820);
    }

    // -------------------------------------------------------------------------
    // Utilities
    // -------------------------------------------------------------------------
    shuffleArray(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    }
  }

  // ---------------------------------------------------------------------------
  // Bootstrapping
  // ---------------------------------------------------------------------------
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.wortregenGame = new WortregenGame();
    });
  } else {
    window.wortregenGame = new WortregenGame();
  }
})();
