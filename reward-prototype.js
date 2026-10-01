// ==============================================================================
// VokabelGo - Prototype Hiệu Ứng Nhận Thưởng (Cat Fishing)
// Prototype trải nghiệm hình ảnh + âm thanh với catfishing.mp4
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

  // --- 2. SOUND PREFERENCE STORAGE ---
  const SOUND_STORAGE_KEY = 'vokabelgo_prototype_sound_enabled';
  let isSoundEnabled = (function() {
    const stored = localStorage.getItem(SOUND_STORAGE_KEY);
    return stored === null ? true : stored !== 'false';
  })();

  // --- 3. WEB AUDIO API SYNTHESIZER ---
  // Thiết kế âm thanh tinh tế, tự tạo hoàn toàn, trong trẻo, không chói gắt
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
    if (!isSoundEnabled) return;
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
    if (!isSoundEnabled) return;
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
    if (!isSoundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;

      // Wooden bucket tap - warm triangle fundamental + sine overtone
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

  // Âm Phase B: Chuông nhận thưởng 3 nốt đi lên (G5 -> C6 -> E6), dài ~0.8s, trong trẻo, vui, mềm mại (3.26s)
  function playRewardChime() {
    if (!isSoundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const baseTime = ctx.currentTime;

      // 3 nốt arpeggio Đô trưởng cao vút, ấm áp: G5 (784Hz) -> C6 (1046.5Hz) -> E6 (1318.5Hz)
      const notes = [
        { freq: 783.99, start: 0.00, dur: 0.28, vol: 0.22 },
        { freq: 1046.50, start: 0.16, dur: 0.32, vol: 0.25 },
        { freq: 1318.51, start: 0.32, dur: 0.52, vol: 0.28 }
      ];

      notes.forEach(note => {
        const t = baseTime + note.start;

        // Âm chính: Sine wave thuần khiết
        const oscMain = ctx.createOscillator();
        oscMain.type = 'sine';
        oscMain.frequency.setValueAtTime(note.freq, t);

        // Họa âm nhẹ tạo cảm giác marimba/chuông thủy tinh
        const oscHarmonic = ctx.createOscillator();
        oscHarmonic.type = 'sine';
        oscHarmonic.frequency.setValueAtTime(note.freq * 2, t);

        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(0.0001, t);
        // Attack mềm (15ms)
        gainNode.gain.linearRampToValueAtTime(note.vol, t + 0.015);
        // Exponential decay
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
    if (prefersReducedMotion) return; // Không bung sao nếu bật reduced-motion

    const starCount = 10; // 8-12 ngôi sao nhỏ
    for (let i = 0; i < starCount; i++) {
      const angle = (i * (360 / starCount) + (Math.random() * 16 - 8)) * (Math.PI / 180);
      const distance = 40 + Math.random() * 32; // 40px - 72px từ tâm miệng thùng
      const dx = Math.cos(angle) * distance;
      const dy = Math.sin(angle) * distance;

      const star = document.createElement('div');
      star.className = 'reward-star';
      star.style.setProperty('--dx', `${dx.toFixed(1)}px`);
      star.style.setProperty('--dy', `${dy.toFixed(1)}px`);
      star.style.color = STAR_COLORS[i % STAR_COLORS.length];
      star.innerHTML = STAR_SVG;

      // Kích thước ngẫu nhiên nhẹ: 14px - 18px
      const size = 14 + (i % 3) * 2;
      star.style.width = `${size}px`;
      star.style.height = `${size}px`;

      container.appendChild(star);

      // Kích hoạt animation
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

    if (bucketGlow) {
      bucketGlow.classList.remove('active');
    }
    if (plusFish) {
      plusFish.classList.remove('active');
    }
    if (celebration) {
      celebration.classList.remove('active');
    }
    if (stars) {
      stars.innerHTML = '';
    }

    // Reset timeline step badges
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

    // 1. Âm chạm vào thùng
    playBucketTap();

    // 2. Ngay sau đó là chuông nhận thưởng 3 nốt
    setTimeout(() => {
      if (isPlaying) playRewardChime();
    }, 60);

    // 3. Vòng sáng mềm quanh khu vực thùng
    const bucketGlow = document.getElementById('rewardBucketGlow');
    if (bucketGlow) {
      bucketGlow.classList.remove('active');
      void bucketGlow.offsetWidth; // Force reflow
      bucketGlow.classList.add('active');
    }

    // 4. Bung 8-12 ngôi sao nhỏ quanh thùng
    createStars();

    // 5. Hiện text "+1 🐟" nảy nhẹ và bay lên
    const plusFish = document.getElementById('rewardPlusFish');
    if (plusFish) {
      plusFish.classList.remove('active');
      void plusFish.offsetWidth; // Force reflow
      plusFish.classList.add('active');
    }
  }

  // GIAI ĐOẠN C: Mèo vui mừng (t >= 4.30s)
  function triggerPhaseC() {
    updateTimelineIndicator('C');

    // Hiện dòng chữ "Câu được cá rồi!"
    const celebration = document.getElementById('rewardCelebrationBanner');
    if (celebration) {
      celebration.classList.remove('active');
      void celebration.offsetWidth; // Force reflow
      celebration.classList.add('active');
    }

    // Sao và vòng sáng tan dần tự nhiên theo animation CSS
  }

  // Vòng lặp đồng bộ chính căn theo video.currentTime
  function syncLoop() {
    const video = document.getElementById('rewardCatVideo');
    if (!video) return;

    if (!video.paused && !video.ended) {
      const t = video.currentTime;

      // Căn mốc Phase A: 1.65s (khi cá vọt khỏi mặt nước)
      if (t >= 1.65 && !phaseAHandled) {
        phaseAHandled = true;
        triggerPhaseA();
      }

      // Căn mốc Phase B: 3.20s (khi cá rơi trúng miệng thùng)
      if (t >= 3.20 && !phaseBHandled) {
        phaseBHandled = true;
        triggerPhaseB();
      }

      // Căn mốc Phase C: 4.30s (khi mèo cười vui nhìn về phía trước)
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
    // Giữ khung hình cuối của video, không đặt lại 0, không hiện màn hình đen
    const video = document.getElementById('rewardCatVideo');
    if (video) {
      video.pause();
    }
  }

  // --- 6. PHÁT LẠI / DỪNG TRẢI NGHIỆM ---
  function startPlayback() {
    const video = document.getElementById('rewardCatVideo');
    if (!video) return;

    // Dừng lượt cũ nếu đang chạy
    stopPlayback();

    isPlaying = true;
    phaseAHandled = false;
    phaseBHandled = false;
    phaseCHandled = false;
    resetEffectElements();

    // Chuẩn bị AudioContext theo tương tác người dùng
    getAudioContext();

    // Video mặc định tắt tiếng gốc để tránh chồng âm
    video.muted = true;
    video.currentTime = 0;

    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          // Bắt đầu vòng lặp đồng bộ căn theo thời gian thực
          animFrameId = requestAnimationFrame(syncLoop);
        })
        .catch(err => {
          console.warn('[RewardPrototype] Không thể tự động phát video:', err);
          // Fallback an toàn: vẫn cho mô phỏng hiệu ứng chạy theo timer
          runFallbackTimerSimulation();
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

  // Fallback an toàn khi video lỗi tải
  function runFallbackTimerSimulation() {
    const fallbackEl = document.getElementById('rewardVideoFallback');
    if (fallbackEl) fallbackEl.classList.remove('hidden');

    isPlaying = true;
    phaseAHandled = false;
    phaseBHandled = false;
    phaseCHandled = false;

    // Mô phỏng dòng thời gian an toàn
    setTimeout(() => {
      if (isPlaying) triggerPhaseA();
    }, 1650);

    setTimeout(() => {
      if (isPlaying) triggerPhaseB();
    }, 3200);

    setTimeout(() => {
      if (isPlaying) triggerPhaseC();
    }, 4300);

    setTimeout(() => {
      if (isPlaying) onVideoEnded();
    }, 6800);
  }

  // --- 7. SOUND TOGGLE CONTROL ---
  function updateSoundUI() {
    const btn = document.getElementById('rewardSoundToggleBtn');
    const icon = document.getElementById('rewardSoundIcon');
    const label = document.getElementById('rewardSoundLabel');
    if (!btn || !icon || !label) return;

    if (isSoundEnabled) {
      btn.classList.remove('muted');
      icon.textContent = '🔊';
      label.textContent = 'Bật tiếng';
      btn.title = 'Âm thanh đang bật. Bấm để tắt tiếng';
    } else {
      btn.classList.add('muted');
      icon.textContent = '🔇';
      label.textContent = 'Tắt tiếng';
      btn.title = 'Âm thanh đang tắt. Bấm để bật tiếng';
    }
  }

  function toggleRewardSound() {
    isSoundEnabled = !isSoundEnabled;
    try {
      localStorage.setItem(SOUND_STORAGE_KEY, isSoundEnabled ? 'true' : 'false');
    } catch (e) {}

    updateSoundUI();

    if (!isSoundEnabled) {
      stopAllAudio();
    } else {
      getAudioContext();
    }
  }

  // --- 8. MODAL OPEN / CLOSE ---
  function openRewardPrototypeModal() {
    const modal = document.getElementById('rewardPrototypeModal');
    if (!modal) return;

    // Reset video fallback
    const fallbackEl = document.getElementById('rewardVideoFallback');
    if (fallbackEl) fallbackEl.classList.add('hidden');

    updateSoundUI();
    modal.classList.remove('hidden');

    // Bắt đầu phát từ đầu
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
    // 1. Phím ESC để đóng
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        const modal = document.getElementById('rewardPrototypeModal');
        if (modal && !modal.classList.contains('hidden')) {
          closeRewardPrototypeModal();
        }
      }
    });

    // 2. Click backdrop để đóng
    const backdrop = document.getElementById('rewardPrototypeModal');
    if (backdrop) {
      backdrop.addEventListener('click', function(e) {
        if (e.target === backdrop) {
          closeRewardPrototypeModal();
        }
      });
    }

    // 3. Xử lý video error
    const video = document.getElementById('rewardCatVideo');
    if (video) {
      video.addEventListener('error', function(e) {
        console.warn('[RewardPrototype] Video error:', e);
        const fallback = document.getElementById('rewardVideoFallback');
        if (fallback) fallback.classList.remove('hidden');
      });
    }

    // 4. Cập nhật hiển thị các nút Dev dựa trên môi trường
    const isDev = isDevEnvironment();
    const devBtnHeader = document.getElementById('devRewardPreviewBtn');
    const devBtnFeed = document.getElementById('devFeedRewardBtn');
    const floatingBtn = document.getElementById('floatingDevRewardBtn');

    if (devBtnHeader) {
      devBtnHeader.style.display = isDev ? 'inline-flex' : 'none';
    }
    if (devBtnFeed) {
      devBtnFeed.style.display = isDev ? 'block' : 'none';
    }
    if (floatingBtn) {
      floatingBtn.style.display = isDev ? 'inline-flex' : 'none';
    }

    updateSoundUI();
  }

  // Expose public API an toàn ra window cho UI triggers
  window.openRewardPrototypeModal = openRewardPrototypeModal;
  window.closeRewardPrototypeModal = closeRewardPrototypeModal;
  window.replayRewardPrototype = replayRewardPrototype;
  window.toggleRewardSound = toggleRewardSound;

  // Khởi tạo khi DOM sẵn sàng
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupPrototypeListeners);
  } else {
    setupPrototypeListeners();
  }

})();
