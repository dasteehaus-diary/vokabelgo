// ==============================================================================
// VokabelGo - Prototype Hiệu Ứng Nhận Thưởng (Cat Fishing)
// Prototype trải nghiệm hình ảnh + âm thanh với catfishing.mp4
// HỖ TRỢ TRỰC TIẾP: Âm thanh gốc của chị, Hiệu ứng mới, hoặc Kết hợp cả hai
// TUYỆT ĐỐI KHÔNG can thiệp dữ liệu học, Daily Goal, streak hay Fishdex thật.
// ==============================================================================

(function() {
  'use strict';

  // --- 1. DEV ENVIRONMENT DETECTION ---
  // Chỉ kích hoạt khi có cờ dev rõ ràng: ?dev=true, ?dev=1, ?prototype=true hoặc storage vokabelgo_dev_mode
  // Tuyệt đối KHÔNG hiển thị controls dev trong production hoặc chế độ học viên
  function isDevEnvironment() {
    try {
      if (typeof window === 'undefined' || !window.location) return false;
      const params = new URLSearchParams(window.location.search);
      if (params.get('dev') === 'true' || params.get('dev') === '1' || params.get('prototype') === 'true' || params.get('debug') === '1') {
        return true;
      }
      if (typeof localStorage !== 'undefined' && localStorage.getItem('vokabelgo_dev_mode') === 'true') {
        return true;
      }
    } catch (e) {}
    return false;
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

  // Helper phát nốt tổng hợp âm thanh Web Audio
  function playSynthNote(ctx, startTime, freq, duration, vol, addHarmonic) {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, startTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(vol, startTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.02);
    activeAudioNodes.push(osc);

    if (addHarmonic) {
      const harm = ctx.createOscillator();
      harm.type = 'triangle';
      harm.frequency.setValueAtTime(freq * 2, startTime);
      const harmGain = ctx.createGain();
      harmGain.gain.setValueAtTime(0.0001, startTime);
      harmGain.gain.linearRampToValueAtTime(vol * 0.25, startTime + 0.012);
      harmGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration * 0.7);
      harm.connect(harmGain);
      harmGain.connect(ctx.destination);
      harm.start(startTime);
      harm.stop(startTime + duration + 0.02);
      activeAudioNodes.push(harm);
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
        playSynthNote(ctx, t, note.freq, note.dur, note.vol, true);
      });
    } catch (e) {
      console.warn('[RewardPrototype] Lỗi phát chuông nhận thưởng:', e);
    }
  }

  // Âm Fanfare theo độ hiếm khi bung Thẻ Cá
  function playCatchFanfare(rarity) {
    if (currentAudioMode === 'mute') return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      if (rarity === 'common') {
        const notes = [
          { f: 523.25, t: 0.00, d: 0.20, v: 0.18 }, // C5
          { f: 659.25, t: 0.12, d: 0.25, v: 0.22 }, // E5
          { f: 783.99, t: 0.24, d: 0.45, v: 0.25 }  // G5
        ];
        notes.forEach(n => playSynthNote(ctx, now + n.t, n.f, n.d, n.v, false));
      } else if (rarity === 'rare') {
        const notes = [
          { f: 587.33, t: 0.00, d: 0.20, v: 0.20 }, // D5
          { f: 739.99, t: 0.11, d: 0.24, v: 0.22 }, // F#5
          { f: 880.00, t: 0.22, d: 0.30, v: 0.24 }, // A5
          { f: 1174.66, t: 0.33, d: 0.65, v: 0.28 } // D6
        ];
        notes.forEach(n => playSynthNote(ctx, now + n.t, n.f, n.d, n.v, true));
      } else if (rarity === 'legendary') {
        const notes = [
          { f: 523.25, t: 0.00, d: 0.18, v: 0.20 }, // C5
          { f: 783.99, t: 0.09, d: 0.22, v: 0.22 }, // G5
          { f: 1046.50, t: 0.18, d: 0.26, v: 0.25 }, // C6
          { f: 1318.51, t: 0.28, d: 0.35, v: 0.28 }, // E6
          { f: 1567.98, t: 0.40, d: 0.85, v: 0.32 }  // G6
        ];
        notes.forEach(n => playSynthNote(ctx, now + n.t, n.f, n.d, n.v, true));
      }
    } catch (e) {
      console.warn('[RewardPrototype] Lỗi phát fanfare cá:', e);
    }
  }

  // --- 4. HỆ THỐNG LOÀI CÁ (FISH DATABASE & SVGs) ---
  const FISH_DATABASE = [
    {
      id: 'lachs',
      article: 'der',
      german: 'Lachs',
      plural: 'die Lachse',
      vietnamese: 'Cá hồi Bắc Đại Tây Dương',
      rarity: 'rare',
      rarityLabel: '★ HIẾM · SELTEN ★',
      minLen: 42.0, maxLen: 68.0,
      minWeight: 1.8, maxWeight: 4.5,
      exp: 60,
      quote: 'Meow! Một chú cá hồi béo ngậy hồng hào! Tối nay Titi mở tiệc sashimi thịnh soạn rồi!',
      color: '#F59E0B'
    },
    {
      id: 'forelle',
      article: 'die',
      german: 'Forelle',
      plural: 'die Forellen',
      vietnamese: 'Cá hồi hương / Cá tráp suối',
      rarity: 'common',
      rarityLabel: 'PHỔ THÔNG · GEWÖHNLICH',
      minLen: 22.0, maxLen: 34.0,
      minWeight: 0.35, maxWeight: 0.85,
      exp: 25,
      quote: 'Cá suối nước ngọt tươi rói! Titi thích nhất là món cá này áp chảo bơ tỏi!',
      color: '#0284C7'
    },
    {
      id: 'karpfen',
      article: 'der',
      german: 'Karpfen',
      plural: 'die Karpfen',
      vietnamese: 'Cá chép sông Danube',
      rarity: 'common',
      rarityLabel: 'PHỔ THÔNG · GEWÖHNLICH',
      minLen: 28.0, maxLen: 46.0,
      minWeight: 0.9, maxWeight: 2.8,
      exp: 30,
      quote: 'Cá chép sông Danube vảy óng ánh! Báo hiệu một ngày học từ vựng đại cát đại lợi!',
      color: '#059669'
    },
    {
      id: 'goldfisch',
      article: 'der',
      german: 'Goldfisch',
      plural: 'die Goldfische',
      vietnamese: 'Cá vàng tri thức Goethe',
      rarity: 'rare',
      rarityLabel: '★ HIẾM · SELTEN ★',
      minLen: 16.0, maxLen: 25.0,
      minWeight: 0.2, maxWeight: 0.5,
      exp: 75,
      quote: 'Ôi chao! Chú cá vàng tri thức của đại thi hào Goethe! Titi ngắm mãi không nỡ ăn đâu!',
      color: '#EA580C'
    },
    {
      id: 'riesenwels',
      article: 'der',
      german: 'Riesenwels',
      plural: 'die Riesenwelse',
      vietnamese: 'Thủy quái sông Rhine',
      rarity: 'legendary',
      rarityLabel: '★ HUYỀN THOẠI · LEGENDÄR ★',
      minLen: 95.0, maxLen: 145.0,
      minWeight: 14.0, maxWeight: 32.0,
      exp: 150,
      quote: 'MEOWWW! Con cá khổng lồ to gấp 3 lần Titi! Cần câu suýt gãy đôi rồi, chủ nhân quá đỉnh!',
      color: '#7C3AED'
    },
    {
      id: 'b2_meisterfisch',
      article: 'der',
      german: 'B2-Meisterfisch',
      plural: 'die Meisterfische',
      vietnamese: 'Cá Thần Đạt Chuẩn B2',
      rarity: 'legendary',
      rarityLabel: '★ HUYỀN THOẠI · LEGENDÄR ★',
      minLen: 77.7, maxLen: 88.8,
      minWeight: 7.7, maxWeight: 9.9,
      exp: 200,
      quote: 'ĐỈNH CAO! Chú cá đội mũ cử nhân đem theo chứng chỉ Goethe B2! Nắm chắc vé đi Đức rồi nha!',
      color: '#F59E0B'
    },
    {
      id: 'regenbogenforelle',
      article: 'die',
      german: 'Regenbogenforelle',
      plural: 'die Regenbogenforellen',
      vietnamese: 'Cá hồi cầu vồng bảy sắc',
      rarity: 'rare',
      rarityLabel: '★ HIẾM · SELTEN ★',
      minLen: 35.0, maxLen: 55.0,
      minWeight: 1.4, maxWeight: 3.2,
      exp: 80,
      quote: 'Vảy lấp lánh như dải ngân hà sau cơn mưa! Chú cá này đẹp quá đi thôi chủ nhân ơi!',
      color: '#BE185D'
    },
    {
      id: 'sardine',
      article: 'die',
      german: 'Sardine',
      plural: 'die Sardinen',
      vietnamese: 'Cá mòi bạc đại dương',
      rarity: 'common',
      rarityLabel: 'PHỔ THÔNG · GEWÖHNLICH',
      minLen: 12.0, maxLen: 18.5,
      minWeight: 0.05, maxWeight: 0.12,
      exp: 15,
      quote: 'Nhỏ mà có võ! Titi nhai giòn rụm trong một nốt nhạc, meow~',
      color: '#64748B'
    },
    {
      id: 'barsch',
      article: 'der',
      german: 'Barsch',
      plural: 'die Barsche',
      vietnamese: 'Cá vược sông',
      rarity: 'common',
      rarityLabel: 'PHỔ THÔNG · GEWÖHNLICH',
      minLen: 18.0, maxLen: 29.0,
      minWeight: 0.25, maxWeight: 0.65,
      exp: 20,
      quote: 'Vây lưng nhọn hoắt nhưng thịt thơm ngon hảo hạng! Điểm 10 cho chủ nhân!',
      color: '#475569'
    }
  ];

  function getFishSvg(fish) {
    const id = fish.id;
    if (id === 'sardine') {
      return `<svg viewBox="0 0 120 70" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M15 35 C25 20, 75 18, 95 32 C105 34, 112 28, 115 25 C114 35, 114 35, 115 45 C112 42, 105 36, 95 38 C75 52, 25 50, 15 35 Z" fill="#94A3B8"/>
        <path d="M15 35 C25 24, 75 22, 95 33 C85 46, 35 46, 15 35 Z" fill="#CBD5E1"/>
        <path d="M22 36 C40 48, 80 46, 92 37 C80 43, 40 43, 22 36 Z" fill="#F8FAFC"/>
        <circle cx="28" cy="32" r="4.5" fill="#0F172A"/>
        <circle cx="27" cy="30.5" r="1.8" fill="#FFFFFF"/>
        <path d="M50 38 C58 39, 62 44, 58 46 C52 46, 48 42, 50 38 Z" fill="#64748B"/>
        <path d="M36 28 C38 33, 38 37, 36 42" stroke="#64748B" stroke-width="1.8" stroke-linecap="round"/>
      </svg>`;
    }
    if (id === 'forelle') {
      return `<svg viewBox="0 0 120 70" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M92 35 L112 22 C108 32, 108 38, 112 48 Z" fill="#0284C7"/>
        <path d="M12 35 C22 16, 75 16, 95 35 C75 54, 22 54, 12 35 Z" fill="#38BDF8"/>
        <path d="M18 35 C35 34, 65 34, 90 35 C70 41, 35 41, 18 35 Z" fill="#F472B6" opacity="0.85"/>
        <circle cx="45" cy="28" r="1.5" fill="#0369A1"/><circle cx="55" cy="25" r="1.5" fill="#0369A1"/>
        <circle cx="65" cy="28" r="1.5" fill="#0369A1"/><circle cx="75" cy="26" r="1.5" fill="#0369A1"/>
        <circle cx="50" cy="33" r="1.2" fill="#BE185D"/><circle cx="60" cy="33" r="1.2" fill="#BE185D"/>
        <circle cx="26" cy="32" r="5" fill="#0F172A"/>
        <circle cx="24.5" cy="30.5" r="2" fill="#FFFFFF"/>
        <path d="M52 38 C60 40, 64 47, 58 48 C50 48, 48 42, 52 38 Z" fill="#0284C7"/>
        <path d="M48 20 C54 13, 62 13, 66 18 Z" fill="#0284C7"/>
      </svg>`;
    }
    if (id === 'karpfen') {
      return `<svg viewBox="0 0 120 70" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M88 35 L110 20 C105 32, 105 38, 110 50 Z" fill="#059669"/>
        <path d="M14 36 C22 14, 72 14, 90 35 C72 58, 22 58, 14 36 Z" fill="#10B981"/>
        <path d="M40 28 C45 28, 48 32, 45 36" stroke="#047857" stroke-width="1.8" stroke-linecap="round"/>
        <path d="M52 28 C57 28, 60 32, 57 36" stroke="#047857" stroke-width="1.8" stroke-linecap="round"/>
        <path d="M64 28 C69 28, 72 32, 69 36" stroke="#047857" stroke-width="1.8" stroke-linecap="round"/>
        <path d="M46 36 C51 36, 54 40, 51 44" stroke="#047857" stroke-width="1.8" stroke-linecap="round"/>
        <path d="M58 36 C63 36, 66 40, 63 44" stroke="#047857" stroke-width="1.8" stroke-linecap="round"/>
        <path d="M16 40 C14 46, 18 48, 20 45" stroke="#F59E0B" stroke-width="2" stroke-linecap="round"/>
        <circle cx="26" cy="30" r="5" fill="#0F172A"/>
        <circle cx="24.5" cy="28.5" r="2" fill="#FFFFFF"/>
        <path d="M42 18 C55 12, 70 14, 76 22 Z" fill="#047857"/>
        <path d="M46 42 C54 44, 58 50, 50 51 Z" fill="#F59E0B"/>
      </svg>`;
    }
    if (id === 'barsch') {
      return `<svg viewBox="0 0 120 70" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M38 23 L44 8 L50 20 L56 7 L62 20 L68 10 L74 24 Z" fill="#EA580C"/>
        <path d="M88 35 L112 18 C106 32, 106 38, 112 52 Z" fill="#EA580C"/>
        <path d="M12 36 C22 17, 72 17, 90 35 C72 55, 22 55, 12 36 Z" fill="#84CC16"/>
        <path d="M42 22 L45 42" stroke="#3F6212" stroke-width="3" stroke-linecap="round"/>
        <path d="M54 20 L56 44" stroke="#3F6212" stroke-width="3" stroke-linecap="round"/>
        <path d="M66 22 L68 42" stroke="#3F6212" stroke-width="3" stroke-linecap="round"/>
        <circle cx="25" cy="32" r="5.5" fill="#0F172A"/>
        <circle cx="23.5" cy="30.5" r="2" fill="#FEF08A"/>
        <circle cx="23" cy="30" r="1" fill="#FFFFFF"/>
        <path d="M45 40 C55 42, 60 48, 52 50 Z" fill="#F97316"/>
      </svg>`;
    }
    if (id === 'lachs') {
      return `<svg viewBox="0 0 120 70" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M90 35 L114 18 C108 30, 108 40, 114 52 Z" fill="#D97706"/>
        <path d="M10 37 C14 34, 18 36, 22 33 C32 17, 75 16, 92 35 C75 55, 28 54, 15 42 C12 42, 10 39, 10 37 Z" fill="#F59E0B"/>
        <path d="M18 38 C32 48, 70 48, 86 37 C70 43, 32 43, 18 38 Z" fill="#FB7185"/>
        <path d="M25 27 C45 20, 70 20, 85 30 C70 24, 45 24, 25 27 Z" fill="#FEF3C7" opacity="0.8"/>
        <circle cx="48" cy="27" r="1.5" fill="#92400E"/><circle cx="58" cy="25" r="1.5" fill="#92400E"/>
        <circle cx="68" cy="27" r="1.5" fill="#92400E"/><circle cx="78" cy="29" r="1.5" fill="#92400E"/>
        <circle cx="26" cy="31" r="5" fill="#0F172A"/>
        <circle cx="24.5" cy="29.5" r="2" fill="#FFFFFF"/>
        <path d="M48 19 C55 13, 64 14, 68 20 Z" fill="#B45309"/>
        <path d="M48 40 C56 42, 60 48, 54 49 Z" fill="#D97706"/>
      </svg>`;
    }
    if (id === 'goldfisch') {
      return `<svg viewBox="0 0 120 70" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M78 35 C90 12, 114 10, 116 26 C110 32, 95 34, 88 35 Z" fill="#FB923C" opacity="0.85"/>
        <path d="M78 35 C90 58, 114 60, 116 44 C110 38, 95 36, 88 35 Z" fill="#F97316"/>
        <ellipse cx="48" cy="35" rx="36" ry="24" fill="#F59E0B"/>
        <ellipse cx="46" cy="40" rx="26" ry="14" fill="#FEF08A" opacity="0.9"/>
        <path d="M42 14 C48 6, 62 8, 64 18 Z" fill="#FB923C"/>
        <path d="M38 48 C44 58, 56 56, 52 46 Z" fill="#FB923C"/>
        <circle cx="26" cy="30" r="7" fill="#0F172A"/>
        <circle cx="24" cy="28" r="3" fill="#FFFFFF"/>
        <circle cx="28" cy="32" r="1.2" fill="#FFFFFF"/>
        <path d="M68 22 L70 17 L72 22 L77 24 L72 26 L70 31 L68 26 L63 24 Z" fill="#FFFFFF" opacity="0.9"/>
      </svg>`;
    }
    if (id === 'regenbogenforelle') {
      return `<svg viewBox="0 0 120 70" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M90 35 L112 18 C106 32, 106 38, 112 52 Z" fill="#A855F7"/>
        <path d="M12 35 C22 16, 75 16, 92 35 C75 54, 22 54, 12 35 Z" fill="#06B6D4"/>
        <path d="M16 35 C35 32, 65 32, 90 35 C70 42, 35 42, 16 35 Z" fill="#EC4899" opacity="0.85"/>
        <circle cx="45" cy="26" r="1.6" fill="#F43F5E"/><circle cx="58" cy="24" r="1.6" fill="#8B5CF6"/>
        <circle cx="70" cy="26" r="1.6" fill="#06B6D4"/>
        <circle cx="25" cy="31" r="5" fill="#0F172A"/>
        <circle cx="23.5" cy="29.5" r="2" fill="#FCE7F3"/>
      </svg>`;
    }
    if (id === 'riesenwels') {
      return `<svg viewBox="0 0 120 70" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M10 36 C18 12, 75 16, 96 34 C106 36, 114 30, 116 26 C114 36, 114 36, 116 46 C112 42, 106 36, 96 38 C75 58, 18 58, 10 36 Z" fill="#6B21A8"/>
        <path d="M16 32 C6 22, -2 30, 4 40" stroke="#C084FC" stroke-width="3" stroke-linecap="round"/>
        <path d="M16 42 C8 52, 2 58, 10 64" stroke="#C084FC" stroke-width="2.5" stroke-linecap="round"/>
        <path d="M22 38 C40 54, 75 52, 90 38 C75 46, 40 46, 22 38 Z" fill="#9333EA"/>
        <circle cx="45" cy="28" r="3" fill="#4C1D95"/><circle cx="62" cy="26" r="3.5" fill="#4C1D95"/>
        <circle cx="78" cy="30" r="3" fill="#4C1D95"/>
        <circle cx="28" cy="28" r="5.5" fill="#FEF08A"/>
        <circle cx="28" cy="28" r="3.5" fill="#0F172A"/>
        <circle cx="26.5" cy="26.5" r="1.5" fill="#FFFFFF"/>
        <path d="M14 37 C18 42, 24 43, 28 41" stroke="#FDE047" stroke-width="2" stroke-linecap="round"/>
      </svg>`;
    }
    // Default: b2_meisterfisch
    return `<svg viewBox="0 0 120 70" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="58" cy="35" r="30" fill="#FEF08A" opacity="0.4"/>
      <path d="M88 35 L114 16 C106 32, 106 38, 114 54 Z" fill="#D97706"/>
      <path d="M14 36 C22 14, 72 14, 90 35 C72 58, 22 58, 14 36 Z" fill="#F59E0B"/>
      <ellipse cx="48" cy="40" rx="25" ry="12" fill="#FEF08A"/>
      <path d="M18 18 L34 12 L50 18 L34 24 Z" fill="#0F172A"/>
      <rect x="28" y="21" width="12" height="6" fill="#1E293B" rx="1"/>
      <path d="M34 18 C38 18, 44 24, 46 29" stroke="#EAB308" stroke-width="2" stroke-linecap="round"/>
      <circle cx="46" cy="30" r="1.5" fill="#EAB308"/>
      <rect x="8" y="38" width="16" height="5" rx="2" fill="#FFFFFF" stroke="#DC2626" stroke-width="1.2"/>
      <circle cx="28" cy="30" r="5" fill="#0F172A"/>
      <circle cx="26.5" cy="28.5" r="2" fill="#FFFFFF"/>
    </svg>`;
  }

  // Phát âm tiếng Đức với Web Speech API
  function speakCurrentFish(event) {
    if (event) event.stopPropagation();
    if (!currentCaughtFish) return;
    try {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const textToSpeak = `${currentCaughtFish.article} ${currentCaughtFish.german}`;
        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        utterance.lang = 'de-DE';
        utterance.rate = 0.88;

        const voices = window.speechSynthesis.getVoices();
        const deVoice = voices.find(v => v.lang && (v.lang.startsWith('de') || v.lang.includes('DE')));
        if (deVoice) utterance.voice = deVoice;

        window.speechSynthesis.speak(utterance);
      }
    } catch (e) {
      console.warn('[RewardPrototype] Lỗi phát âm từ vựng:', e);
    }
  }

  // --- 5. VISUAL EFFECT GENERATORS ---
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

  // --- 6. TIMELINE & SYNCHRONIZATION ENGINE ---
  let isPlaying = false;
  let animFrameId = null;
  let phaseAHandled = false;
  let phaseBHandled = false;
  let phaseCHandled = false;
  let catchRevealHandled = false;
  let selectedFishId = 'random';
  let currentCaughtFish = null;

  function resetEffectElements() {
    const bucketGlow = document.getElementById('rewardBucketGlow');
    const plusFish = document.getElementById('rewardPlusFish');
    const celebration = document.getElementById('rewardCelebrationBanner');
    const stars = document.getElementById('rewardStarsContainer');
    const catchLayer = document.getElementById('rewardCatchRevealLayer');
    const modalCard = document.getElementById('rewardModalCard');
    const catchCard = document.getElementById('rewardCatchCard');
    const catchWordCard = document.getElementById('catchWordCard');
    const collectZone = document.getElementById('catchCollectZone');

    if (bucketGlow) bucketGlow.classList.remove('active');
    if (plusFish) plusFish.classList.remove('active');
    if (celebration) celebration.classList.remove('active');
    if (stars) stars.innerHTML = '';
    if (catchLayer) catchLayer.classList.add('hidden');
    if (modalCard) {
      modalCard.classList.remove('reward-state-reveal', 'reward-state-collect');
      modalCard.classList.add('reward-state-fishing');
    }
    if (catchCard) catchCard.classList.remove('collecting');
    if (catchWordCard) catchWordCard.classList.remove('revealed');
    if (collectZone) collectZone.classList.remove('visible');

    updateTimelineIndicator('idle');
  }

  function updateTimelineIndicator(phase) {
    const stepA = document.getElementById('stepPhaseA');
    const stepB = document.getElementById('stepPhaseB');
    const stepC = document.getElementById('stepPhaseC');
    const stepD = document.getElementById('stepPhaseD');
    if (!stepA || !stepB || !stepC) return;

    stepA.className = 'timeline-step';
    stepB.className = 'timeline-step';
    stepC.className = 'timeline-step';
    if (stepD) stepD.className = 'timeline-step';

    if (phase === 'A') {
      stepA.className = 'timeline-step active';
    } else if (phase === 'B') {
      stepA.className = 'timeline-step done';
      stepB.className = 'timeline-step active';
    } else if (phase === 'C') {
      stepA.className = 'timeline-step done';
      stepB.className = 'timeline-step done';
      stepC.className = 'timeline-step active';
    } else if (phase === 'D' || phase === 'done') {
      stepA.className = 'timeline-step done';
      stepB.className = 'timeline-step done';
      stepC.className = 'timeline-step done';
      if (stepD) stepD.className = 'timeline-step active';
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

  // GIAI ĐOẠN C: Mèo vui mừng (t >= 4.00s)
  function triggerPhaseC() {
    updateTimelineIndicator('C');

    const celebration = document.getElementById('rewardCelebrationBanner');
    if (celebration) {
      celebration.classList.remove('active');
      void celebration.offsetWidth;
      celebration.classList.add('active');
    }
  }

  // GIAI ĐOẠN D: Bung Thẻ Loài Cá Ngẫu Nhiên (Gacha Catch Reveal)
  function triggerCatchReveal(forcedFishId) {
    catchRevealHandled = true;
    updateTimelineIndicator('D');

    // Chọn loài cá: theo test selector hoặc random trọng số
    let fish = null;
    const targetId = forcedFishId || selectedFishId;

    if (targetId && targetId !== 'random') {
      fish = FISH_DATABASE.find(f => f.id === targetId);
    }

    if (!fish) {
      // Random theo tỉ lệ game: 60% Common, 30% Rare, 10% Legendary
      const roll = Math.random() * 100;
      let rarityPool = 'common';
      if (roll < 10) {
        rarityPool = 'legendary';
      } else if (roll < 40) {
        rarityPool = 'rare';
      } else {
        rarityPool = 'common';
      }
      const candidates = FISH_DATABASE.filter(f => f.rarity === rarityPool);
      fish = candidates[Math.floor(Math.random() * candidates.length)] || FISH_DATABASE[0];
    }

    currentCaughtFish = fish;

    // Sinh kích thước và cân nặng ngẫu nhiên
    const lengthVal = (fish.minLen + Math.random() * (fish.maxLen - fish.minLen)).toFixed(1);
    const weightVal = (fish.minWeight + Math.random() * (fish.maxWeight - fish.minWeight)).toFixed(2);
    const isNewRecord = lengthVal >= (fish.maxLen * 0.92);

    // Điền thông tin vào DOM tối giản (State B)
    const rarityBadge = document.getElementById('catchRarityBadge') || document.getElementById('catchRarityPill');
    const fishArt = document.getElementById('catchFishArt');
    const articlePill = document.getElementById('catchArticlePill');
    const germanWord = document.getElementById('catchGermanWord');
    const vietnameseText = document.getElementById('catchVietnameseText');
    const catchLayer = document.getElementById('rewardCatchRevealLayer');
    const modalCard = document.getElementById('rewardModalCard');

    if (rarityBadge) {
      let label = 'Phổ thông';
      let cls = 'rarity-common';
      if (fish.rarity === 'rare') {
        label = 'Hiếm';
        cls = 'rarity-rare';
      } else if (fish.rarity === 'legendary') {
        label = 'Rất hiếm';
        cls = 'rarity-legendary';
      }
      rarityBadge.className = `catch-rarity-badge ${cls}`;
      rarityBadge.textContent = label;
    }

    if (fishArt) {
      fishArt.innerHTML = getFishSvg(fish);
    }

    if (articlePill) {
      articlePill.className = `article-pill ${fish.article}`;
      articlePill.textContent = fish.article;
    }

    if (germanWord) {
      germanWord.textContent = fish.german;
    }

    if (vietnameseText) {
      vietnameseText.textContent = fish.vietnamese;
    }

    // Đảm bảo khu vực thu cá ban đầu ẩn để người học ngắm cá trước
    const collectZone = document.getElementById('catchCollectZone');
    if (collectZone) {
      collectZone.classList.remove('visible');
    }
    const catchCard = document.getElementById('rewardCatchCard');
    if (catchCard) {
      catchCard.classList.remove('collecting');
    }

    if (modalCard) {
      modalCard.classList.remove('reward-state-fishing');
      modalCard.classList.add('reward-state-reveal');
    }

    // Hiển thị layer Catch Reveal
    if (catchLayer) {
      catchLayer.classList.remove('hidden');
    }

    // Persist fish to collection if catchStatus is 'pending' (Single transaction guard)
    let isPendingReward = false;
    if (window.VokabelDaily && typeof window.VokabelDaily.getCatchStatus === 'function') {
      isPendingReward = (window.VokabelDaily.getCatchStatus() === 'pending');
    }

    if (isPendingReward) {
      try {
        const collectionRaw = localStorage.getItem('vokabelgo_fish_collection_v1');
        const collection = collectionRaw ? JSON.parse(collectionRaw) : [];
        const newFishEntry = {
          id: 'fish_' + Date.now(),
          fishId: fish.id,
          german: fish.german,
          article: fish.article,
          vietnamese: fish.vietnamese,
          plural: fish.plural,
          rarity: fish.rarity,
          rarityLabel: fish.rarityLabel,
          length: lengthVal,
          weight: weightVal,
          exp: fish.exp,
          quote: fish.quote,
          color: fish.color,
          caughtAt: new Date().toISOString()
        };
        collection.unshift(newFishEntry);
        localStorage.setItem('vokabelgo_fish_collection_v1', JSON.stringify(collection));
        window.VokabelDaily.setCatchStatus('claimed');
        if (typeof window.updateTodayDashboard === 'function') {
          window.updateTodayDashboard();
        }
        if (typeof window.renderLibraryFishCollection === 'function') {
          window.renderLibraryFishCollection();
        }
      } catch (err) {
        console.warn('[Reward] Lỗi lưu bộ sưu tập cá:', err);
      }
    }

    // STATE B: Suspense Pause & Reveal (450ms)
    // Con cá to bơi lượn ngay lập tức, khối chữ tạm ẩn 450ms để tạo khoảnh khắc hồi hộp
    const catchWordCard = document.getElementById('catchWordCard');
    if (catchWordCard) {
      catchWordCard.classList.remove('revealed');
    }

    if (suspenseTimerId) clearTimeout(suspenseTimerId);
    suspenseTimerId = setTimeout(() => {
      if (catchWordCard) {
        catchWordCard.classList.add('revealed');
      }
      // Phát âm thanh Fanfare theo độ hiếm khi chữ xuất hiện
      playCatchFanfare(fish.rarity);
    }, 450);

    // STATE C: Tự động chuyển sang giai đoạn thu cá và hiển thị nút "Học tiếp" sau 1.5s
    if (collectTimerId) clearTimeout(collectTimerId);
    collectTimerId = setTimeout(triggerCollectState, 1500);
  }

  // STATE C: Collect (Sau 1.5s reveal: card thu nhẹ, hiện "+1 vào Hồ cá" và nút "Học tiếp")
  let collectPhaseHandled = false;
  let suspenseTimerId = null;
  let collectTimerId = null;

  function triggerCollectState() {
    collectPhaseHandled = true;
    const modalCard = document.getElementById('rewardModalCard');
    if (modalCard) {
      modalCard.classList.remove('reward-state-reveal');
      modalCard.classList.add('reward-state-collect');
    }
    const catchCard = document.getElementById('rewardCatchCard');
    if (catchCard) {
      catchCard.classList.add('collecting');
    }
    const collectZone = document.getElementById('catchCollectZone');
    if (collectZone) {
      collectZone.classList.add('visible');
    }
  }

  function collectFishAndContinue(event) {
    if (event) event.stopPropagation();
    closeRewardPrototypeModal();
    if (typeof exitSessionToFreeStudy === 'function') {
      exitSessionToFreeStudy();
    } else {
      window.isStudySessionMode = false;
      if (typeof setStudySessionUiLock === 'function') setStudySessionUiLock(false);
    }
    if (typeof setPrimaryHub === 'function') setPrimaryHub('study');
    if (typeof setStudySubMode === 'function') setStudySubMode('flash');
  }

  function collectFishToBucket(event) {
    collectFishAndContinue(event);
  }

  // Câu con khác (Reroll gacha)
  function rerollFishCatch(event) {
    if (event) event.stopPropagation();
    const catchLayer = document.getElementById('rewardCatchRevealLayer');
    if (catchLayer) catchLayer.classList.add('hidden');

    setTimeout(() => {
      triggerCatchReveal();
    }, 150);
  }

  // Chọn loài cá thử nghiệm từ footer
  function selectTestFish(fishId) {
    selectedFishId = fishId;
    updateFishPickerUI();
    // Bung xem ngay loài cá vừa chọn
    triggerCatchReveal(fishId);
  }

  function updateFishPickerUI() {
    const pills = document.querySelectorAll('.reward-fish-pill');
    pills.forEach(pill => {
      if (pill.dataset.fishId === selectedFishId) {
        pill.classList.add('active');
      } else {
        pill.classList.remove('active');
      }
    });
  }

  function renderFishPickerPills() {
    const container = document.getElementById('rewardFishPickerPills');
    if (!container) return;

    let html = `
      <button type="button" class="reward-fish-pill ${selectedFishId === 'random' ? 'active' : ''}" data-fish-id="random" onclick="selectTestFish('random')">
        <span>🎲</span>
        <span>Ngẫu nhiên (Gacha)</span>
      </button>
    `;

    FISH_DATABASE.forEach(f => {
      const isAct = selectedFishId === f.id ? 'active' : '';
      let badge = '';
      if (f.rarity === 'rare') badge = '<span class="pill-badge rare">Hiếm</span>';
      if (f.rarity === 'legendary') badge = '<span class="pill-badge legendary">Thần</span>';

      html += `
        <button type="button" class="reward-fish-pill ${isAct}" data-fish-id="${f.id}" onclick="selectTestFish('${f.id}')" title="${f.vietnamese}">
          <span>${f.article} ${f.german}</span>
          ${badge}
        </button>
      `;
    });

    container.innerHTML = html;
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

      // Bung thẻ loài cá ngay khi cá vừa vào thùng và mèo nhảy mừng
      if (t >= 3.75 && !catchRevealHandled) {
        triggerCatchReveal();
      }

      if (t >= 4.00 && !phaseCHandled) {
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
    catchRevealHandled = false;
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

    if (suspenseTimerId) {
      clearTimeout(suspenseTimerId);
      suspenseTimerId = null;
    }

    if (collectTimerId) {
      clearTimeout(collectTimerId);
      collectTimerId = null;
    }

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
    catchRevealHandled = false;

    setTimeout(() => { if (isPlaying) triggerPhaseA(); }, 1650);
    setTimeout(() => { if (isPlaying) triggerPhaseB(); }, 3200);
    setTimeout(() => { if (isPlaying) triggerCatchReveal(); }, 3800);
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

  // --- 8. DYNAMIC DEV TESTING PANEL (DEV ONLY) ---
  function renderDevTestingPanel() {
    if (!isDevEnvironment()) return;
    let panel = document.getElementById('rewardDevTestingPanel');
    if (panel) {
      panel.classList.remove('hidden');
      return;
    }
    const modalCard = document.getElementById('rewardModalCard') || document.querySelector('.reward-modal-card');
    if (!modalCard) return;

    panel = document.createElement('div');
    panel.id = 'rewardDevTestingPanel';
    panel.className = 'reward-dev-testing-panel';
    panel.innerHTML = `
      <div class="reward-dev-header">
        <span>🛠️ BẢNG ĐIỀU KHIỂN THỬ NGHIỆM</span>
        <span class="reward-dev-tag">DEV ONLY</span>
      </div>

      <!-- Selector chọn nguồn âm thanh -->
      <div class="reward-audio-selector-row">
        <span class="reward-audio-selector-label">
          <span>🔊</span>
          <span>Nguồn âm:</span>
        </span>
        <div class="reward-audio-mode-group" role="radiogroup" aria-label="Nguồn âm thanh">
          <button type="button" class="reward-audio-mode-pill ${currentAudioMode === 'original' ? 'active' : ''}" data-mode="original" onclick="setAudioMode('original')">
            🎵 Âm gốc của chị
          </button>
          <button type="button" class="reward-audio-mode-pill ${currentAudioMode === 'new_fx' ? 'active' : ''}" data-mode="new_fx" onclick="setAudioMode('new_fx')">
            ✨ Hiệu ứng mới
          </button>
          <button type="button" class="reward-audio-mode-pill ${currentAudioMode === 'both' ? 'active' : ''}" data-mode="both" onclick="setAudioMode('both')">
            🎶 Cả hai
          </button>
          <button type="button" class="reward-audio-mode-pill ${currentAudioMode === 'mute' ? 'active' : ''}" data-mode="mute" onclick="setAudioMode('mute')">
            🔇 Tắt tiếng
          </button>
        </div>
      </div>

      <!-- Selector chọn loài cá test -->
      <div class="reward-fish-selector-row">
        <span class="reward-fish-selector-label">
          <span>🐠</span>
          <span>Thử loài cá:</span>
        </span>
        <div class="reward-fish-picker-pills" id="rewardFishPickerPills" role="radiogroup" aria-label="Chọn loài cá thử nghiệm"></div>
      </div>

      <div style="display:flex;gap:8px;margin-top:8px;">
        <button type="button" id="rewardReplayBtn" class="reward-action-btn primary" onclick="replayRewardPrototype()" style="font-size:11px;padding:4px 8px;">
          <span>🔄 Phát lại từ đầu</span>
        </button>
        <button type="button" class="reward-action-btn outline" onclick="skipToCatchReveal(event)" style="font-size:11px;padding:4px 8px;">
          <span>⚡ Bung thẻ cá ngay</span>
        </button>
      </div>
    `;
    modalCard.appendChild(panel);
    renderFishPickerPills();
  }

  // --- 9. MODAL OPEN / CLOSE ---
  function openRewardPrototypeModal() {
    const modal = document.getElementById('rewardPrototypeModal');
    if (!modal) return;

    const fallbackEl = document.getElementById('rewardVideoFallback');
    if (fallbackEl) fallbackEl.classList.add('hidden');

    const catchLayer = document.getElementById('rewardCatchRevealLayer');
    if (catchLayer) catchLayer.classList.add('hidden');

    const catchCard = document.getElementById('rewardCatchCard');
    if (catchCard) catchCard.classList.remove('collecting');

    const collectZone = document.getElementById('catchCollectZone');
    if (collectZone) collectZone.classList.remove('visible');

    const modalCard = document.getElementById('rewardModalCard');
    if (modalCard) {
      modalCard.className = 'reward-modal-card reward-state-fishing';
    }

    collectPhaseHandled = false;
    if (collectTimerId) {
      clearTimeout(collectTimerId);
      collectTimerId = null;
    }

    updateAudioUI();
    if (isDevEnvironment()) {
      renderDevTestingPanel();
    }

    modal.classList.remove('hidden');
    startPlayback();
  }

  function closeRewardPrototypeModal() {
    const modal = document.getElementById('rewardPrototypeModal');
    if (!modal) return;

    if (suspenseTimerId) {
      clearTimeout(suspenseTimerId);
      suspenseTimerId = null;
    }

    if (collectTimerId) {
      clearTimeout(collectTimerId);
      collectTimerId = null;
    }

    stopPlayback();
    modal.classList.add('hidden');
  }

  function replayRewardPrototype() {
    startPlayback();
  }

  // --- 10. EVENT LISTENERS & SETUP ---
  function setupPrototypeListeners() {
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        const modal = document.getElementById('rewardPrototypeModal');
        if (modal && !modal.classList.contains('hidden')) {
          closeRewardPrototypeModal();
        }
      } else if (e.key === ' ' || e.key === 'Enter') {
        const modal = document.getElementById('rewardPrototypeModal');
        if (modal && !modal.classList.contains('hidden')) {
          if (collectPhaseHandled) {
            e.preventDefault();
            collectFishAndContinue();
          }
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

    if (isDev) {
      renderDevTestingPanel();
    }

    updateAudioUI();
  }

  // Expose API cho UI
  window.openRewardPrototypeModal = openRewardPrototypeModal;
  window.closeRewardPrototypeModal = closeRewardPrototypeModal;
  window.replayRewardPrototype = replayRewardPrototype;
  window.toggleRewardSound = toggleRewardSound;
  window.setAudioMode = setAudioMode;
  window.cycleAudioMode = cycleAudioMode;
  window.skipToCatchReveal = skipToCatchReveal;
  window.collectFishAndContinue = collectFishAndContinue;
  window.collectFishToBucket = collectFishToBucket;
  window.rerollFishCatch = rerollFishCatch;
  window.speakCurrentFish = speakCurrentFish;
  window.selectTestFish = selectTestFish;
  window.renderDevTestingPanel = renderDevTestingPanel;
  window.VokabelFishDatabase = FISH_DATABASE;
  window.getVokabelFishSvg = getFishSvg;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupPrototypeListeners);
  } else {
    setupPrototypeListeners();
  }

})();
