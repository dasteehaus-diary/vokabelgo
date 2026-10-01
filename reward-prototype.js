// ==============================================================================
// VokabelGo - Prototype Hiệu Ứng Nhận Thưởng (Cat Fishing)
// Prototype trải nghiệm hình ảnh + âm thanh với catfishing.mp4
// HỖ TRỢ TRỰC TIẾP: Âm thanh gốc của chị, Hiệu ứng mới, hoặc Kết hợp cả hai
// TUYỆT ĐỐI KHÔNG can thiệp dữ liệu học, Daily Goal, streak hay Fishdex thật.
// ==============================================================================

(function() {
  'use strict';

  // --- 1. DEV ENVIRONMENT DETECTION ---
  function isDevEnvironment() {
    const host = window.location.hostname;
    return (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '' || // file:// protocol
      window.location.protocol === 'file:' ||
      window.location.search.includes('dev=true') ||
      window.location.search.includes('prototype=true') ||
      localStorage.getItem('vokabelgo_dev_mode') === 'true'
    );
  }

  // --- 2. AUDIO MODE & STORAGE ---
  // Các chế độ:
  // 'original': Âm thanh gốc có sẵn trong video của chị (MẶC ĐỊNH)
  // 'new_fx': Hiệu ứng chuông nhận thưởng 3 nốt nhẹ nhàng
  // 'both': Kết hợp cả âm thanh gốc và chuông nhận thưởng
  // 'mute': Tắt tiếng hoàn toàn
  const AUDIO_MODE_KEY = 'vokabelgo_prototype_audio_mode';
  const VALID_MODES = ['original', 'new_fx', 'both', 'mute'];

  let currentAudioMode = (function() {
    const stored = localStorage.getItem(AUDIO_MODE_KEY);
    if (stored && VALID_MODES.includes(stored)) {
      return stored;
    }
    return 'original'; // Mặc định luôn nghe được âm thanh gốc của chị!
  })();

  // --- 3. WEB AUDIO API SYNTHESIZER ---
  let audioCtx = null;
  let activeAudioNodes = [];

  function getAudioContext() {
    if (!audioCtx) {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (AudioCtxClass) {
        audioCtx = new AudioCtxClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  }

  function stopAllAudio() {
    activeAudioNodes.forEach(node => {
      try {
        if (typeof node.stop === 'function') node.stop();
        if (typeof node.disconnect === 'function') node.disconnect();
      } catch (e) {}
    });
    activeAudioNodes = [];
  }

  // Âm Phase A: Tiếng nước bật nhẹ (1.65s)
  function playWaterSplash() {
    if (currentAudioMode !== 'new_fx' && currentAudioMode !== 'both') return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;

      // 1. Damped downward sine pop
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(160, now + 0.12);

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.18, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.13);
      activeAudioNodes.push(osc);

      // 2. Soft filtered water bubble burst
      const bufferSize = ctx.sampleRate * 0.06;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1100, now);
      filter.Q.setValueAtTime(2.5, now);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.01, now);
      noiseGain.gain.linearRampToValueAtTime(0.09, now + 0.01);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

      whiteNoise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(ctx.destination);

      whiteNoise.start(now);
      whiteNoise.stop(now + 0.07);
      activeAudioNodes.push(whiteNoise);
    } catch (e) {
      console.warn('[RewardPrototype] Lỗi phát âm nước bật:', e);
    }
  }

  // Âm Phase A: Tiếng "vút" / kéo cần nhẹ (1.85s)
  function playWhoosh() {
    if (currentAudioMode !== 'new_fx' && currentAudioMode !== 'both') return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const bufferSize = ctx.sampleRate * 0.22;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(350, now);
      filter.frequency.exponentialRampToValueAtTime(1050, now + 0.1);
      filter.frequency.exponentialRampToValueAtTime(320, now + 0.22);
      filter.Q.setValueAtTime(2.0, now);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.08, now + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      noise.start(now);
      noise.stop(now + 0.23);
      activeAudioNodes.push(noise);
    } catch (e) {
      console.warn('[RewardPrototype] Lỗi phát âm kéo cần:', e);
    }
  }

  // Âm Phase B: Tiếng chạm nhỏ khi cá vào thùng (3.20s)
  function playBucketTap() {
    if (currentAudioMode !== 'new_fx' && currentAudioMode !== 'both') return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(320, now);
      osc1.frequency.exponentialRampToValueAtTime(140, now + 0.05);

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(680, now);
      osc2.frequency.exponentialRampToValueAtTime(280, now + 0.04);

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.2, now + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.065);
      osc2.stop(now + 0.065);

      activeAudioNodes.push(osc1, osc2);
    } catch (e) {
      console.warn('[RewardPrototype] Lỗi phát âm cá chạm thùng:', e);
    }
  }

  // Âm Phase B: Chuông nhận thưởng 3 nốt đi lên (G5 -> C6 -> E6), dài ~0.8s (3.26s)
  function playRewardChime() {
    if (currentAudioMode !== 'new_fx' && currentAudioMode !== 'both') return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const baseTime = ctx.currentTime;

      const notes = [
        { freq: 783.99, start: 0.00, dur: 0.28, vol: 0.22 },
        { freq: 1046.50, start: 0.16, dur: 0.32, vol: 0.25 },
        { freq: 1318.51, start: 0.32, dur: 0.52, vol: 0.28 }
      ];

      notes.forEach(note => {
        const t = baseTime + note.start;

        const oscMain = ctx.createOscillator();
        oscMain.type = 'sine';
        oscMain.frequency.setValueAtTime(note.freq, t);

        const oscHarmonic = ctx.createOscillator();
        oscHarmonic.type = 'sine';
        oscHarmonic.frequency.setValueAtTime(note.freq * 2, t);

        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(0.0001, t);
        gainNode.gain.linearRampToValueAtTime(note.vol, t + 0.015);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, t + note.dur);

        const harmGain = ctx.createGain();
        harmGain.gain.setValueAtTime(0.0001, t);
        harmGain.gain.linearRampToValueAtTime(note.vol * 0.2, t + 0.012);
        harmGain.gain.exponentialRampToValueAtTime(0.0001, t + note.dur * 0.6);

        oscMain.connect(gainNode);
        oscHarmonic.connect(harmGain);
        harmGain.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscMain.start(t);
        oscHarmonic.start(t);
        oscMain.stop(t + note.dur + 0.02);
        oscHarmonic.stop(t + note.dur + 0.02);

        activeAudioNodes.push(oscMain, oscHarmonic);
      });
    } catch (e) {
      console.warn('[RewardPrototype] Lỗi phát chuông nhận thưởng:', e);
    }
  }

  // --- 4. VISUAL EFFECT GENERATORS ---
  const STAR_SVG = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 0L14.4 9.6L24 12L14.4 14.4L12 24L9.6 14.4L0 12L9.6 9.6L12 0Z" fill="currentColor"/>
  </svg>`;

  const STAR_COLORS = ['#F59E0B', '#FBBF24', '#38BDF8', '#34D399', '#F472B6', '#FCD34D'];

  function createStars() {
    const container = document.getElementById('rewardStarsContainer');
    if (!container) return;
    container.innerHTML = '';

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const starCount = 10;
    for (let i = 0; i < starCount; i++) {
      const angle = (i * (360 / starCount) + (Math.random() * 16 - 8)) * (Math.PI / 180);
      const distance = 40 + Math.random() * 32;
      const dx = Math.cos(angle) * distance;
      const dy = Math.sin(angle) * distance;

      const star = document.createElement('div');
      star.className = 'reward-star';
      star.style.setProperty('--dx', `${dx.toFixed(1)}px`);
      star.style.setProperty('--dy', `${dy.toFixed(1)}px`);
      star.style.color = STAR_COLORS[i % STAR_COLORS.length];
      star.innerHTML = STAR_SVG;

      const size = 14 + (i % 3) * 2;
      star.style.width = `${size}px`;
      star.style.height = `${size}px`;

      container.appendChild(star);

      requestAnimationFrame(() => {
        star.classList.add('burst');
      });
    }
  }

  // --- 5. TIMELINE & SYNCHRONIZATION ENGINE ---
  let isPlaying = false;
  let animFrameId = null;
  let phaseAHandled = false;
  let phaseBHandled = false;
  let phaseCHandled = false;

  function resetEffectElements() {
    const bucketGlow = document.getElementById('rewardBucketGlow');
    const plusFish = document.getElementById('rewardPlusFish');
    const celebration = document.getElementById('rewardCelebrationBanner');
    const stars = document.getElementById('rewardStarsContainer');

    if (bucketGlow) bucketGlow.classList.remove('active');
    if (plusFish) plusFish.classList.remove('active');
    if (celebration) celebration.classList.remove('active');
    if (stars) stars.innerHTML = '';

    updateTimelineIndicator('idle');
  }

  function updateTimelineIndicator(phase) {
    const stepA = document.getElementById('stepPhaseA');
    const stepB = document.getElementById('stepPhaseB');
    const stepC = document.getElementById('stepPhaseC');
    if (!stepA || !stepB || !stepC) return;

    stepA.className = 'timeline-step';
    stepB.className = 'timeline-step';
    stepC.className = 'timeline-step';

    if (phase === 'A') {
      stepA.className = 'timeline-step active';
    } else if (phase === 'B') {
      stepA.className = 'timeline-step done';
      stepB.className = 'timeline-step active';
    } else if (phase === 'C' || phase === 'done') {
      stepA.className = 'timeline-step done';
      stepB.className = 'timeline-step done';
      stepC.className = 'timeline-step active';
    }
  }

  // GIAI ĐOẠN A: Mèo kéo cá khỏi nước (t >= 1.65s)
  function triggerPhaseA() {
    updateTimelineIndicator('A');
    playWaterSplash();
    setTimeout(() => {
      if (isPlaying) playWhoosh();
    }, 200);
  }

  // GIAI ĐOẠN B: Cá rơi vào thùng - MỐC NHẬN THƯỞNG CHÍNH (t >= 3.20s)
  function triggerPhaseB() {
    updateTimelineIndicator('B');

    playBucketTap();
    setTimeout(() => {
      if (isPlaying) playRewardChime();
    }, 60);

    const bucketGlow = document.getElementById('rewardBucketGlow');
    if (bucketGlow) {
      bucketGlow.classList.remove('active');
      void bucketGlow.offsetWidth;
      bucketGlow.classList.add('active');
    }

    createStars();

    const plusFish = document.getElementById('rewardPlusFish');
    if (plusFish) {
      plusFish.classList.remove('active');
      void plusFish.offsetWidth;
      plusFish.classList.add('active');
    }
  }

  // GIAI ĐOẠN C: Mèo vui mừng (t >= 4.30s)
  function triggerPhaseC() {
    updateTimelineIndicator('C');

    const celebration = document.getElementById('rewardCelebrationBanner');
    if (celebration) {
      celebration.classList.remove('active');
      void celebration.offsetWidth;
      celebration.classList.add('active');
    }
  }

  function syncLoop() {
    const video = document.getElementById('rewardCatVideo');
    if (!video) return;

    if (!video.paused && !video.ended) {
      const t = video.currentTime;

      if (t >= 1.65 && !phaseAHandled) {
        phaseAHandled = true;
        triggerPhaseA();
      }

      if (t >= 3.20 && !phaseBHandled) {
        phaseBHandled = true;
        triggerPhaseB();
      }

      if (t >= 4.30 && !phaseCHandled) {
        phaseCHandled = true;
        triggerPhaseC();
      }
    }

    if (video.ended) {
      onVideoEnded();
      return;
    }

    animFrameId = requestAnimationFrame(syncLoop);
  }

  function onVideoEnded() {
    isPlaying = false;
    updateTimelineIndicator('done');
    const video = document.getElementById('rewardCatVideo');
    if (video) {
      video.pause();
    }
  }

  // --- 6. PHÁT LẠI / DỪNG TRẢI NGHIỆM ---
  function applyAudioModeToVideo(video) {
    if (!video) return;
    if (currentAudioMode === 'original') {
      video.muted = false;
      video.volume = 1.0;
    } else if (currentAudioMode === 'both') {
      video.muted = false;
      video.volume = 0.85;
    } else {
      video.muted = true;
    }
  }

  function startPlayback() {
    const video = document.getElementById('rewardCatVideo');
    if (!video) return;

    stopPlayback();

    isPlaying = true;
    phaseAHandled = false;
    phaseBHandled = false;
    phaseCHandled = false;
    resetEffectElements();

    getAudioContext();

    // Bật/tắt âm video theo chế độ được chọn (MẶC ĐỊNH LÀ BẬT TIẾNG GỐC CỦA CHỊ)
    applyAudioModeToVideo(video);
    video.currentTime = 0;

    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          animFrameId = requestAnimationFrame(syncLoop);
        })
        .catch(err => {
          console.warn('[RewardPrototype] Autoplay với tiếng bị giới hạn, thử phát muted:', err);
          // Nếu trình duyệt chặn phát tiếng unmuted lúc autoplay, phát muted trước
          video.muted = true;
          video.play()
            .then(() => {
              animFrameId = requestAnimationFrame(syncLoop);
            })
            .catch(() => {
              runFallbackTimerSimulation();
            });
        });
    }
  }

  function stopPlayback() {
    isPlaying = false;

    if (animFrameId) {
      cancelAnimationFrame(animFrameId);
      animFrameId = null;
    }

    const video = document.getElementById('rewardCatVideo');
    if (video) {
      video.pause();
    }

    stopAllAudio();
    resetEffectElements();
  }

  function runFallbackTimerSimulation() {
    const fallbackEl = document.getElementById('rewardVideoFallback');
    if (fallbackEl) fallbackEl.classList.remove('hidden');

    isPlaying = true;
    phaseAHandled = false;
    phaseBHandled = false;
    phaseCHandled = false;

    setTimeout(() => { if (isPlaying) triggerPhaseA(); }, 1650);
    setTimeout(() => { if (isPlaying) triggerPhaseB(); }, 3200);
    setTimeout(() => { if (isPlaying) triggerPhaseC(); }, 4300);
    setTimeout(() => { if (isPlaying) onVideoEnded(); }, 6800);
  }

  // --- 7. AUDIO MODE CONTROLS ---
  function updateAudioUI() {
    const btn = document.getElementById('rewardSoundToggleBtn');
    const icon = document.getElementById('rewardSoundIcon');
    const label = document.getElementById('rewardSoundLabel');

    const modeConfigs = {
      original: { icon: '🎵', label: 'Âm gốc của chị', class: 'mode-original', title: 'Đang phát âm thanh gốc của chị. Bấm để đổi chế độ.' },
      new_fx: { icon: '✨', label: 'Hiệu ứng mới', class: 'mode-new_fx', title: 'Đang phát hiệu ứng nhận thưởng 3 nốt. Bấm để đổi chế độ.' },
      both: { icon: '🎶', label: 'Cả hai (Hòa âm)', class: 'mode-both', title: 'Đang phát đồng thời âm gốc và hiệu ứng mới. Bấm để đổi chế độ.' },
      mute: { icon: '🔇', label: 'Tắt tiếng', class: 'mode-mute', title: 'Âm thanh đang tắt. Bấm để bật tiếng.' }
    };

    const cfg = modeConfigs[currentAudioMode] || modeConfigs.original;

    if (btn && icon && label) {
      btn.className = `reward-sound-btn ${cfg.class}`;
      icon.textContent = cfg.icon;
      label.textContent = cfg.label;
      btn.title = cfg.title;
    }

    // Cập nhật các pill trong footer
    const pills = document.querySelectorAll('.reward-audio-mode-pill');
    pills.forEach(pill => {
      if (pill.dataset.mode === currentAudioMode) {
        pill.classList.add('active');
      } else {
        pill.classList.remove('active');
      }
    });
  }

  function setAudioMode(mode) {
    if (!VALID_MODES.includes(mode)) return;
    currentAudioMode = mode;
    try {
      localStorage.setItem(AUDIO_MODE_KEY, mode);
    } catch (e) {}

    const video = document.getElementById('rewardCatVideo');
    if (video) {
      applyAudioModeToVideo(video);
    }

    updateAudioUI();

    if (mode === 'mute') {
      stopAllAudio();
    } else {
      getAudioContext();
    }
  }

  function cycleAudioMode() {
    const nextMap = {
      original: 'new_fx',
      new_fx: 'both',
      both: 'mute',
      mute: 'original'
    };
    const nextMode = nextMap[currentAudioMode] || 'original';
    setAudioMode(nextMode);
  }

  function toggleRewardSound() {
    cycleAudioMode();
  }

  // --- 8. MODAL OPEN / CLOSE ---
  function openRewardPrototypeModal() {
    const modal = document.getElementById('rewardPrototypeModal');
    if (!modal) return;

    const fallbackEl = document.getElementById('rewardVideoFallback');
    if (fallbackEl) fallbackEl.classList.add('hidden');

    updateAudioUI();
    modal.classList.remove('hidden');

    startPlayback();
  }

  function closeRewardPrototypeModal() {
    const modal = document.getElementById('rewardPrototypeModal');
    if (!modal) return;

    stopPlayback();
    modal.classList.add('hidden');
  }

  function replayRewardPrototype() {
    startPlayback();
  }

  // --- 9. EVENT LISTENERS & SETUP ---
  function setupPrototypeListeners() {
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        const modal = document.getElementById('rewardPrototypeModal');
        if (modal && !modal.classList.contains('hidden')) {
          closeRewardPrototypeModal();
        }
      }
    });

    const backdrop = document.getElementById('rewardPrototypeModal');
    if (backdrop) {
      backdrop.addEventListener('click', function(e) {
        if (e.target === backdrop) {
          closeRewardPrototypeModal();
        }
      });
    }

    const video = document.getElementById('rewardCatVideo');
    if (video) {
      video.addEventListener('error', function(e) {
        console.warn('[RewardPrototype] Video error:', e);
        const fallback = document.getElementById('rewardVideoFallback');
        if (fallback) fallback.classList.remove('hidden');
      });
    }

    const isDev = isDevEnvironment();
    const devBtnHeader = document.getElementById('devRewardPreviewBtn');
    const devBtnFeed = document.getElementById('devFeedRewardBtn');
    const floatingBtn = document.getElementById('floatingDevRewardBtn');

    if (devBtnHeader) devBtnHeader.style.display = isDev ? 'inline-flex' : 'none';
    if (devBtnFeed) devBtnFeed.style.display = isDev ? 'block' : 'none';
    if (floatingBtn) floatingBtn.style.display = isDev ? 'inline-flex' : 'none';

    updateAudioUI();
  }

  // Expose API cho UI
  window.openRewardPrototypeModal = openRewardPrototypeModal;
  window.closeRewardPrototypeModal = closeRewardPrototypeModal;
  window.replayRewardPrototype = replayRewardPrototype;
  window.toggleRewardSound = toggleRewardSound;
  window.setAudioMode = setAudioMode;
  window.cycleAudioMode = cycleAudioMode;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupPrototypeListeners);
  } else {
    setupPrototypeListeners();
  }

})();
