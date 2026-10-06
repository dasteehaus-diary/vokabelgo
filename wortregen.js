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
      this.keyboardCapture = document.getElementById('keyboard-capture');
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

      // Mechanics & Fast Tempo
      this.activeWords = [];
      this.lockedWord = null;
      this.wordIdCounter = 1;
      this.availableWords = [...WORD_POOL];
      this.baseSpeed = 65; // px per second (fast, snappy tempo)
      this.speedIncrement = 1.4; // slight progression
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

      // Sound Toggle
      this.btnMute.addEventListener('click', () => {
        this.sound.init();
        const isMuted = this.sound.toggleMute();
        this.updateSoundIcon(isMuted);
      });

      // Direct Keyboard Input (Desktop & Physical Keyboards)
      window.addEventListener('keydown', (e) => {
        this.handleKeyDown(e);
      });

      // Mobile Virtual Keyboard Capture
      if (this.keyboardCapture) {
        this.keyboardCapture.addEventListener('input', () => {
          if (this.state !== 'PLAYING') return;
          const val = this.keyboardCapture.value;
          if (val) {
            for (const char of val) {
              this.handleCharInput(char);
            }
            this.keyboardCapture.value = '';
          }
        });
      }

      // Tap / Click anywhere refocuses keyboard during play
      document.addEventListener('click', (e) => {
        if (this.state === 'PLAYING') {
          if (!e.target.closest('#btn-mute')) {
            this.focusKeyboard();
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

    focusKeyboard() {
      if (this.keyboardCapture) {
        this.keyboardCapture.focus();
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
      this.baseSpeed = 65;
      this.activeWords = [];
      this.lockedWord = null;
      this.availableWords = [...WORD_POOL];
      this.shuffleArray(this.availableWords);

      // Hide overlays
      this.startScreen.classList.add('hidden');
      this.gameOverScreen.classList.add('hidden');

      // Clear DOM falling cards
      this.fallingArea.querySelectorAll('.word-card, .floating-feedback').forEach(el => el.remove());

      // Update HUD
      this.renderHUD();

      // Focus invisible input for virtual keyboard
      this.focusKeyboard();

      // Start Loops
      this.lastFrameTime = performance.now();
      this.animFrameId = requestAnimationFrame(this.gameLoop.bind(this));
      this.scheduleSpawn(150); // 1st word spawn
      setTimeout(() => {
        if (this.state === 'PLAYING' && this.activeWords.length < this.maxConcurrent) {
          this.maybeSpawnWord(); // 2nd word spawn
        }
      }, 1200);
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
    scheduleSpawn(delay = 2000) {
      if (this.state !== 'PLAYING') return;

      this.spawnTimer = setTimeout(() => {
        if (this.state === 'PLAYING') {
          this.maybeSpawnWord();
          const nextDelay = Math.max(1600, 2400 - Math.min(600, this.solvedCount * 35));
          this.scheduleSpawn(nextDelay);
        }
      }, delay);
    }

    maybeSpawnWord() {
      if (this.activeWords.length >= this.maxConcurrent) {
        return;
      }

      if (this.availableWords.length === 0) {
        this.availableWords = [...WORD_POOL];
        this.shuffleArray(this.availableWords);
      }

      // Pick next word
      const wordData = this.availableWords.pop();
      const areaWidth = this.fallingArea.clientWidth || 340;
      const cardWidth = Math.min(230, Math.max(140, areaWidth * 0.5));
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

      if (spawnX === null) {
        if (topWords.length === 0) {
          spawnX = minX + (maxX - minX) * 0.5;
        } else {
          const avgX = topWords.reduce((s, w) => s + w.x, 0) / topWords.length;
          spawnX = avgX > areaWidth / 2 ? minX + 10 : maxX - 10;
        }
      }

      // Create DOM element with slots
      const cardEl = document.createElement('div');
      cardEl.className = 'word-card';
      cardEl.id = `word-${this.wordIdCounter}`;

      const innerEl = document.createElement('div');
      innerEl.className = 'word-card-inner';

      const viEl = document.createElement('div');
      viEl.className = 'word-card-vi';
      viEl.textContent = wordData.vi;
      innerEl.appendChild(viEl);

      const slotsEl = document.createElement('div');
      slotsEl.className = 'word-card-slots';

      // Parse letters and words
      const wordParts = wordData.de.trim().split(/\s+/);
      const letters = [];

      wordParts.forEach((part, partIdx) => {
        const partEl = document.createElement('div');
        partEl.className = 'slot-word';

        for (let i = 0; i < part.length; i++) {
          const char = part[i];
          const slotEl = document.createElement('span');
          slotEl.className = 'char-slot';
          slotEl.textContent = '_';
          slotEl.dataset.char = char;
          partEl.appendChild(slotEl);

          letters.push({
            char: char,
            slotEl: slotEl,
            wordIdx: partIdx,
            charIdx: i
          });
        }

        slotsEl.appendChild(partEl);
      });

      innerEl.appendChild(slotsEl);
      cardEl.appendChild(innerEl);
      this.fallingArea.appendChild(cardEl);

      // Measure real dimensions
      const rect = cardEl.getBoundingClientRect();
      const actualWidth = rect.width || cardWidth;
      const actualHeight = rect.height || 54;

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
        speed: this.baseSpeed + (Math.random() * 6 - 3),
        el: cardEl,
        innerEl: innerEl,
        letters: letters,
        typedCount: 0,
        isDying: false,
        isGrounded: false
      };

      cardEl.style.transform = `translate3d(${wordObj.x}px, ${wordObj.y}px, 0)`;
      this.activeWords.push(wordObj);
    }

    // -------------------------------------------------------------------------
    // Main Animation Loop
    // -------------------------------------------------------------------------
    gameLoop(timestamp) {
      if (this.state !== 'PLAYING' || this.lives <= 0) return;

      const dt = Math.min(0.1, (timestamp - this.lastFrameTime) / 1000);
      this.lastFrameTime = timestamp;

      const groundLimit = this.fallingArea.clientHeight;

      for (let i = this.activeWords.length - 1; i >= 0; i--) {
        if (this.state !== 'PLAYING' || this.lives <= 0) break;

        const w = this.activeWords[i];
        if (w.isDying || w.isGrounded) continue;

        w.y += w.speed * dt;
        w.el.style.transform = `translate3d(${w.x}px, ${w.y}px, 0)`;

        // Check if word hits ground threshold
        if (w.y + w.height >= groundLimit - 4) {
          this.handleWordMissed(w, i);
          if (this.lives <= 0) {
            break; // Halt processing remaining words in this frame
          }
        }
      }

      if (this.state === 'PLAYING' && this.lives > 0) {
        this.animFrameId = requestAnimationFrame(this.gameLoop.bind(this));
      }
    }

    // -------------------------------------------------------------------------
    // Word Missed (Hits Ground)
    // -------------------------------------------------------------------------
    handleWordMissed(word, index) {
      if (this.state !== 'PLAYING' || this.lives <= 0) return;
      if (word.isGrounded || word.isDying) return;

      word.isGrounded = true;
      const groundLimit = this.fallingArea.clientHeight;
      word.y = Math.max(0, groundLimit - word.height - 4);
      word.el.style.transform = `translate3d(${word.x}px, ${word.y}px, 0)`;

      // Unlock if it was active target
      if (this.lockedWord === word) {
        this.unlockTarget();
      }

      // Penalty (clamped so lives cannot go below 0)
      this.lives = Math.max(0, this.lives - 1);
      this.combo = 0;
      this.missedCount += 1;

      // Audio feedback
      this.sound.playMiss();

      // Floating -1 Heart feedback (positioned above card to keep German text unobstructed)
      this.showFloatingFeedback(word.x + word.width / 2, Math.max(10, word.y - 28), '-1 ❤️', 'life-loss');

      // Update HUD immediately
      this.renderHUD();

      // Visual ground reveal: highlight card and show full German answer for 1.2s
      word.el.classList.add('word-grounded-reveal');
      const inner = word.innerEl || word.el.querySelector('.word-card-inner');
      if (inner) {
        const slots = inner.querySelector('.word-card-slots');
        if (slots) slots.style.display = 'none';
        let revealEl = inner.querySelector('.word-card-reveal-de');
        if (!revealEl) {
          revealEl = document.createElement('div');
          revealEl.className = 'word-card-reveal-de';
          revealEl.textContent = word.de;
          inner.appendChild(revealEl);
        }
      }

      const isFatalMiss = this.lives <= 0;

      // Pause at bottom for 1.2s so the player can learn the correct answer
      setTimeout(() => {
        word.isDying = true;
        word.el.classList.add('word-missed');

        setTimeout(() => {
          if (word.el.parentNode) {
            word.el.remove();
          }
        }, 350);

        const idx = this.activeWords.indexOf(word);
        if (idx !== -1) {
          this.activeWords.splice(idx, 1);
        }

        if (isFatalMiss && this.state === 'PLAYING') {
          this.gameOver();
        }
      }, 1200);
    }

    // -------------------------------------------------------------------------
    // Direct Keyboard & In-Place Typing
    // -------------------------------------------------------------------------
    handleKeyDown(e) {
      if (this.state !== 'PLAYING') return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      if (e.key === 'Backspace') {
        e.preventDefault();
        this.handleBackspace();
        return;
      }

      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        // Auto-space is active; pressing Space is safely ignored
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        // Enter is not needed, ignore safely
        return;
      }

      if (e.key.length === 1) {
        e.preventDefault();
        this.handleCharInput(e.key);
        return;
      }
    }

    handleCharInput(rawChar) {
      if (this.state !== 'PLAYING') return;
      if (this.lives <= 0) return;

      const char = rawChar.toLowerCase();

      // If a locked target exists, verify it is still valid
      if (this.lockedWord) {
        if (this.lockedWord.isDying || this.lockedWord.isGrounded) {
          this.unlockTarget();
        }
      }

      // If NO locked target:
      if (!this.lockedWord) {
        const available = this.activeWords.filter(w => !w.isDying && !w.isGrounded);
        let candidate = null;

        for (const w of available) {
          if (!w.letters || w.letters.length === 0) continue;
          const expected = w.letters[0].char;
          if (this.charsMatch(char, expected)) {
            // Pick the one closest to the ground (highest y)
            if (!candidate || w.y > candidate.y) {
              candidate = w;
            }
          }
        }

        if (candidate) {
          this.lockTarget(candidate);
          this.fillNextSlot(candidate);
        }
        return;
      }

      // A target is locked:
      const word = this.lockedWord;
      const nextLetter = word.letters[word.typedCount];
      if (nextLetter && this.charsMatch(char, nextLetter.char)) {
        this.fillNextSlot(word);
      } else {
        // Wrong character typed on locked target: subtle shake error, NO life lost!
        this.shakeTargetError(word);
      }
    }

    charsMatch(inputChar, targetChar) {
      const a = inputChar.toLowerCase();
      const b = targetChar.toLowerCase();
      if (a === b) return true;
      // Friendly German umlauts / sharp s fallback
      if (b === 'ä' && a === 'a') return true;
      if (b === 'ö' && a === 'o') return true;
      if (b === 'ü' && a === 'u') return true;
      if (b === 'ß' && a === 's') return true;
      return false;
    }

    fillNextSlot(word) {
      const letter = word.letters[word.typedCount];
      if (!letter) return;

      letter.slotEl.textContent = letter.char;
      letter.slotEl.classList.add('typed');
      letter.slotEl.classList.remove('current');

      word.typedCount++;

      // Complete word: POP immediately!
      if (word.typedCount >= word.letters.length) {
        const idx = this.activeWords.indexOf(word);
        this.handleCorrectAnswer(word, idx);
        this.unlockTarget();

        // Maintain momentum: spawn next word quickly if board is open
        if (this.activeWords.filter(w => !w.isDying && !w.isGrounded).length < 2) {
          setTimeout(() => {
            if (this.state === 'PLAYING') {
              this.maybeSpawnWord();
            }
          }, 250);
        }
      } else {
        // Highlight next slot
        const nextLetter = word.letters[word.typedCount];
        if (nextLetter) {
          nextLetter.slotEl.classList.add('current');
        }
      }
    }

    handleBackspace() {
      if (this.state !== 'PLAYING' || !this.lockedWord) return;

      const word = this.lockedWord;
      if (word.isDying || word.isGrounded) {
        this.unlockTarget();
        return;
      }

      if (word.typedCount > 0) {
        if (word.typedCount < word.letters.length) {
          word.letters[word.typedCount].slotEl.classList.remove('current');
        }

        word.typedCount--;
        const letter = word.letters[word.typedCount];
        letter.slotEl.textContent = '_';
        letter.slotEl.classList.remove('typed');
        letter.slotEl.classList.add('current');

        if (word.typedCount === 0) {
          // Cleared all letters, unlock so player can switch to another word
          this.unlockTarget();
        }
      }
    }

    lockTarget(word) {
      if (this.lockedWord && this.lockedWord !== word) {
        this.unlockTarget();
      }
      this.lockedWord = word;
      word.el.classList.add('card-focused');
      if (word.typedCount < word.letters.length) {
        word.letters[word.typedCount].slotEl.classList.add('current');
      }
    }

    unlockTarget() {
      if (this.lockedWord) {
        const word = this.lockedWord;
        word.el.classList.remove('card-focused');
        if (word.typedCount < word.letters.length) {
          word.letters[word.typedCount].slotEl.classList.remove('current');
        }
        this.lockedWord = null;
      }
    }

    shakeTargetError(word) {
      const inner = word.innerEl || word.el.querySelector('.word-card-inner') || word.el;
      inner.classList.remove('shake-error');
      void inner.offsetWidth; // force reflow
      inner.classList.add('shake-error');
      setTimeout(() => {
        inner.classList.remove('shake-error');
      }, 280);
    }

    handleCorrectAnswer(word, index) {
      word.isDying = true;
      if (index !== -1) {
        this.activeWords.splice(index, 1);
      } else {
        const i = this.activeWords.indexOf(word);
        if (i !== -1) this.activeWords.splice(i, 1);
      }

      // Stats
      this.score += 100;
      this.combo += 1;
      if (this.combo > this.maxCombo) {
        this.maxCombo = this.combo;
      }
      this.solvedCount += 1;

      // Gentle speed progression
      this.baseSpeed = Math.min(84, this.baseSpeed + this.speedIncrement);

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
