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

      // Mechanics & FIFO Queue
      this.activeWords = [];
      this.wordIdCounter = 1;
      this.availableWords = [...WORD_POOL];
      this.baseSpeed = 40;
      this.maxConcurrent = 2; // Strict 2 cards maximum: 1 target, 1 waiting
      this.spawnTimer = null;
      this.animFrameId = null;
      this.lastFrameTime = 0;
      this.lastProcessed = { char: '', time: 0, source: '' };

      this.initEvents();
    }

    // FIFO Target Helper: Always returns the oldest active, non-grounded, non-dying word
    getTargetWord() {
      return this.activeWords.find(w => !w.isDying && !w.isGrounded) || null;
    }

    // Backwards compatibility getter
    get lockedWord() {
      return this.getTargetWord();
    }

    lockTarget(word) {
      this.updateCardVisuals();
    }

    unlockTarget() {
      this.updateCardVisuals();
    }

    // Update visual classes for Target vs Waiting cards
    updateCardVisuals() {
      const target = this.getTargetWord();
      this.activeWords.forEach(w => {
        if (w.isDying || w.isGrounded) return;
        if (w === target) {
          w.el.classList.add('card-target', 'card-focused');
          w.el.classList.remove('card-waiting');
          w.letters.forEach((l, idx) => {
            if (idx === w.typedCount) {
              l.slotEl.classList.add('current');
            } else {
              l.slotEl.classList.remove('current');
            }
          });
        } else {
          w.el.classList.remove('card-target', 'card-focused');
          w.el.classList.add('card-waiting');
          w.letters.forEach(l => l.slotEl.classList.remove('current'));
        }
      });
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

      // Mobile Virtual Keyboard Capture with strict deduplication against keydown
      if (this.keyboardCapture) {
        this.keyboardCapture.addEventListener('input', () => {
          if (this.state !== 'PLAYING') return;
          const val = this.keyboardCapture.value;
          this.keyboardCapture.value = '';
          if (!val) return;

          const now = performance.now();
          for (const char of val) {
            // Check if this character was already handled by keydown within the last 120ms
            if (
              this.lastProcessed &&
              this.lastProcessed.source === 'keydown' &&
              this.lastProcessed.char === char.toLowerCase() &&
              (now - this.lastProcessed.time) < 120
            ) {
              continue;
            }
            this.lastProcessed = { char: char.toLowerCase(), time: now, source: 'capture-input' };
            this.handleCharInput(char, 'capture-input');
          }
        });

        this.keyboardCapture.addEventListener('beforeinput', (e) => {
          if (this.state !== 'PLAYING') return;
          if (e.inputType === 'deleteContentBackward') {
            const now = performance.now();
            if (
              this.lastProcessed &&
              this.lastProcessed.source === 'keydown' &&
              this.lastProcessed.char === 'backspace' &&
              (now - this.lastProcessed.time) < 120
            ) {
              return;
            }
            this.lastProcessed = { char: 'backspace', time: now, source: 'capture-input' };
            this.handleBackspace();
          }
        });
      }

      // Tap / Click anywhere refocuses keyboard on touch devices only
      const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
      if (isTouch) {
        document.addEventListener('click', (e) => {
          if (this.state === 'PLAYING') {
            if (!e.target.closest('#btn-mute')) {
              this.focusKeyboard();
            }
          }
        });
      }

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

      // Focus invisible input for virtual keyboard on touch devices
      const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
      if (isTouch) {
        this.focusKeyboard();
      }

      // Start Loops
      this.lastFrameTime = performance.now();
      this.animFrameId = requestAnimationFrame(this.gameLoop.bind(this));
      this.scheduleSpawn(150); // 1st word spawn (target)
      setTimeout(() => {
        if (this.state === 'PLAYING' && this.activeWords.filter(w => !w.isDying && !w.isGrounded).length < this.maxConcurrent) {
          this.maybeSpawnWord(); // 2nd word spawn (waiting)
        }
      }, 2200);
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
    // Word Spawning & Viewport-Scaled Fall Velocity
    // -------------------------------------------------------------------------
    scheduleSpawn(delay = 2000) {
      if (this.state !== 'PLAYING') return;

      this.spawnTimer = setTimeout(() => {
        if (this.state === 'PLAYING') {
          this.maybeSpawnWord();
          const activeCount = this.activeWords.filter(w => !w.isDying && !w.isGrounded).length;
          const nextDelay = activeCount < this.maxConcurrent ? 1800 : 3200;
          this.scheduleSpawn(nextDelay);
        }
      }, delay);
    }

    maybeSpawnWord() {
      const activeNonDying = this.activeWords.filter(w => !w.isDying && !w.isGrounded);
      if (activeNonDying.length >= this.maxConcurrent) {
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
      let isFirstChar = true;

      wordParts.forEach((part, partIdx) => {
        const partEl = document.createElement('div');
        partEl.className = 'slot-word';

        for (let i = 0; i < part.length; i++) {
          const char = part[i];
          const slotEl = document.createElement('span');
          slotEl.className = 'char-slot';
          // Subtle first-character hint (video reference style)
          if (isFirstChar) {
            slotEl.classList.add('first-char-hint');
            slotEl.textContent = char;
            isFirstChar = false;
          } else {
            slotEl.textContent = '_';
          }
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

      // Fall Duration: short words ~18-20s, longer words ~21-25s
      const cleanLettersCount = letters.length;
      let targetDuration = 18.5;
      if (cleanLettersCount <= 6) {
        targetDuration = 18.0;
      } else if (cleanLettersCount <= 10) {
        targetDuration = 19.5;
      } else if (cleanLettersCount <= 15) {
        targetDuration = 22.0;
      } else {
        targetDuration = 25.0;
      }

      const areaHeight = this.fallingArea.clientHeight || 560;
      const totalDistance = Math.max(120, areaHeight - actualHeight - startY - 4);
      let cardSpeed = totalDistance / targetDuration;

      // Invariant: newer word must NEVER fall faster or overtake older word ahead of it
      const precedingWord = this.activeWords.find(w => !w.isDying && !w.isGrounded);
      if (precedingWord) {
        targetDuration = Math.max(targetDuration, precedingWord.duration || 18.5);
        cardSpeed = Math.min(cardSpeed, precedingWord.speed);
      }

      const wordObj = {
        id: this.wordIdCounter++,
        vi: wordData.vi,
        de: wordData.de,
        x: spawnX,
        y: startY,
        width: actualWidth,
        height: actualHeight,
        duration: targetDuration,
        speed: cardSpeed,
        el: cardEl,
        innerEl: innerEl,
        letters: letters,
        typedCount: 0,
        isDying: false,
        isGrounded: false
      };

      cardEl.style.transform = `translate3d(${wordObj.x}px, ${wordObj.y}px, 0)`;
      this.activeWords.push(wordObj);

      // Update FIFO target highlight and slot states
      this.updateCardVisuals();
    }

    // -------------------------------------------------------------------------
    // Main Animation Loop
    // -------------------------------------------------------------------------
    gameLoop(timestamp) {
      if (this.state !== 'PLAYING' || this.lives <= 0) return;

      const dt = Math.min(0.1, (timestamp - this.lastFrameTime) / 1000);
      this.lastFrameTime = timestamp;

      const groundLimit = this.fallingArea.clientHeight;

      for (let i = 0; i < this.activeWords.length; i++) {
        if (this.state !== 'PLAYING' || this.lives <= 0) break;

        const w = this.activeWords[i];
        if (w.isDying || w.isGrounded) continue;

        w.y += w.speed * dt;

        // Prevent younger word from catching up/overlapping preceding word
        if (i > 0) {
          const prev = this.activeWords[i - 1];
          if (prev && !prev.isDying && !prev.isGrounded) {
            const minGap = Math.max(65, w.height + 12);
            if (w.y > prev.y - minGap) {
              w.y = prev.y - minGap;
            }
          }
        }

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

      // Penalty (clamped so lives cannot go below 0)
      this.lives = Math.max(0, this.lives - 1);
      this.combo = 0;
      this.missedCount += 1;

      // Audio feedback
      this.sound.playMiss();

      // Floating -1 Heart feedback
      this.showFloatingFeedback(word.x + word.width / 2, Math.max(10, word.y - 28), '-1 ❤️', 'life-loss');

      // Update HUD immediately
      this.renderHUD();

      // FIFO: The next waiting word immediately becomes the active target!
      this.updateCardVisuals();

      // Visual ground reveal: highlight card and show full German answer for 1.2s
      word.el.classList.add('word-grounded-reveal');
      word.el.classList.remove('card-target', 'card-focused', 'card-waiting');
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
        } else if (this.state === 'PLAYING') {
          // Refill waiting queue if needed
          if (this.activeWords.filter(w => !w.isDying && !w.isGrounded).length < this.maxConcurrent) {
            this.maybeSpawnWord();
          }
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
        this.lastProcessed = { char: 'backspace', time: performance.now(), source: 'keydown' };
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
        const char = e.key;
        this.lastProcessed = { char: char.toLowerCase(), time: performance.now(), source: 'keydown' };
        this.handleCharInput(char, 'keydown');
        return;
      }
    }

    handleCharInput(rawChar, source = 'unknown') {
      if (this.state !== 'PLAYING') return;
      if (this.lives <= 0) return;

      // Strict FIFO: Only the current target word accepts input
      const target = this.getTargetWord();
      if (!target) return;

      const nextLetter = target.letters[target.typedCount];
      if (!nextLetter) return;

      if (this.charsMatch(rawChar, nextLetter.char)) {
        this.fillNextSlot(target);
      } else {
        // Wrong character typed on target: subtle shake error, NO life lost, NO card switch!
        this.shakeTargetError(target);
      }
    }

    // German Characters Strict Equality: a ≠ ä, o ≠ ö, u ≠ ü, s ≠ ß
    charsMatch(inputChar, targetChar) {
      if (!inputChar || !targetChar) return false;
      return inputChar.toLowerCase() === targetChar.toLowerCase();
    }

    fillNextSlot(word) {
      const letter = word.letters[word.typedCount];
      if (!letter) return;

      letter.slotEl.textContent = letter.char;
      letter.slotEl.classList.remove('first-char-hint', 'current');
      letter.slotEl.classList.add('typed');

      word.typedCount++;

      // Complete word: POP immediately!
      if (word.typedCount >= word.letters.length) {
        this.handleCorrectAnswer(word);
      } else {
        this.updateCardVisuals();
      }
    }

    handleBackspace() {
      if (this.state !== 'PLAYING') return;
      const word = this.getTargetWord();
      if (!word) return;

      if (word.typedCount > 0) {
        if (word.typedCount < word.letters.length) {
          word.letters[word.typedCount].slotEl.classList.remove('current');
        }

        word.typedCount--;
        const letter = word.letters[word.typedCount];
        letter.slotEl.classList.remove('typed');

        if (word.typedCount === 0) {
          // Cleared back to slot 0: restore subtle first-char hint
          letter.slotEl.textContent = letter.char;
          letter.slotEl.classList.add('first-char-hint');
        } else {
          letter.slotEl.textContent = '_';
        }

        this.updateCardVisuals();
      }
      // Note: Target is strictly retained even if typedCount reaches 0
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

    handleCorrectAnswer(word) {
      word.isDying = true;
      const idx = this.activeWords.indexOf(word);
      if (idx !== -1) {
        this.activeWords.splice(idx, 1);
      }

      // Stats
      const wordLen = word.letters ? word.letters.length : 10;
      this.score += wordLen * 10;
      this.combo += 1;
      if (this.combo > this.maxCombo) {
        this.maxCombo = this.combo;
      }
      this.solvedCount += 1;

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
      const scoreGain = wordLen * 10;
      const scoreText = this.combo >= 3 ? `+${scoreGain} (Combo x${this.combo})` : `+${scoreGain}`;
      const scoreClass = this.combo >= 3 ? 'score combo-burst' : 'score';
      this.showFloatingFeedback(word.x + word.width / 2, Math.max(20, word.y), scoreText, scoreClass);

      // Update HUD
      this.renderHUD();

      // FIFO: Next word in queue immediately becomes the active target!
      this.updateCardVisuals();

      // Maintain flow: Spawn next word smoothly if board has space
      if (this.activeWords.filter(w => !w.isDying && !w.isGrounded).length < this.maxConcurrent) {
        setTimeout(() => {
          if (this.state === 'PLAYING') {
            this.maybeSpawnWord();
          }
        }, 1200);
      }
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
