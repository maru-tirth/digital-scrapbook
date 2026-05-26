document.addEventListener("DOMContentLoaded", () => {
  // --- STATE ---
  let memories = [];
  let currentPageIndex = 0;
  let audioCtx = null;
  let candlesBlown = 0;
  const TOTAL_CANDLES = 5;
  let confettiParticles = [];
  let confettiActive = false;
  let confettiRafId = null;
  let sparkleInterval = null;
  let chimeInterval = null;
  let songLoopTimeout = null;
  let isFlipping = false;
  const FLIP_MS = 210;
  let universeCleanup = null;

  // --- ELEMENTS ---
  const landingView = document.getElementById("landing-view");
  const scrapbookView = document.getElementById("scrapbook-view");
  const wallView = document.getElementById("wall-view");
  const universeView = document.getElementById("universe-view");
  const universeHud = document.getElementById("universe-hud");
  const universeBackBtn = document.getElementById("universe-back-btn");
  const openScrapbookBtn = document.getElementById("open-scrapbook-btn");
  const scrapbookContainer = document.getElementById("scrapbook-container");
  const prevPageBtn = document.getElementById("prev-page-btn");
  const nextPageBtn = document.getElementById("next-page-btn");
  const pageCounter = document.getElementById("page-counter");

  // ============================================================
  // SOUND SYSTEM (Web Audio API — no files needed)
  // ============================================================
  function getCtx() {
    if (!audioCtx)
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
  }

  function tone(freq, dur, type = "sine", vol = 0.25, delay = 0) {
    try {
      const ctx = getCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
      gain.gain.setValueAtTime(0, ctx.currentTime + delay);
      gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + delay + 0.01);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        ctx.currentTime + delay + dur,
      );
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + dur);
    } catch (_) {}
  }

  function noise(dur, cutoff = 600, vol = 0.3, delay = 0) {
    try {
      const ctx = getCtx();
      const size = ctx.sampleRate * dur;
      const buf = ctx.createBuffer(1, size, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < size; i++) data[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const filt = ctx.createBiquadFilter();
      filt.type = "lowpass";
      filt.frequency.value = cutoff;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(vol, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        ctx.currentTime + delay + dur,
      );
      src.connect(filt);
      filt.connect(gain);
      gain.connect(ctx.destination);
      src.start(ctx.currentTime + delay);
      src.stop(ctx.currentTime + delay + dur);
    } catch (_) {}
  }

  function playClick() {
    tone(900, 0.08, "sine", 0.18);
  }

  function playPageTurn() {
    noise(0.14, 900, 0.25);
    tone(440, 0.1, "sine", 0.12, 0.05);
  }

  function playBirthdayFanfare() {
    const BPM = 84;
    const Q = 60 / BPM; // quarter  ≈ 0.714 s
    const E = Q / 2; // eighth   ≈ 0.357 s
    const DQ = Q * 1.5; // dot-qtr  ≈ 1.071 s
    const DH = Q * 3; // dot-half ≈ 2.143 s

    // Frequencies (C major)
    const C4 = 262,
      D4 = 294,
      E4 = 330,
      F4 = 349,
      G4 = 392,
      A4 = 440,
      Bb4 = 466,
      C5 = 523,
      F3 = 175;

    // Score: [freq, duration]  — null = rest
    const score = [
      [C4, E],
      [C4, E],
      [D4, DQ],
      [C4, Q],
      [F4, DQ],
      [E4, DH],
      [null, Q],
      [C4, E],
      [C4, E],
      [D4, DQ],
      [C4, Q],
      [G4, DQ],
      [F4, DH],
      [null, Q],
      [C4, E],
      [C4, E],
      [C5, DQ],
      [A4, Q],
      [F4, Q],
      [E4, Q],
      [D4, DH],
      [null, Q],
      [Bb4, E],
      [Bb4, E],
      [A4, DQ],
      [F4, Q],
      [G4, DQ],
      [F4, DH],
    ];

    let t = 0;
    score.forEach(([freq, dur], idx) => {
      if (freq !== null) {
        // Melody — triangle for a warm, music-box feel
        tone(freq, dur * 0.88, "triangle", 0.28, t);
        // Octave doubling — gives body and richness
        tone(freq / 2, dur * 0.85, "sine", 0.1, t);
        if (idx >= 15 && idx <= 22) {
          tone(freq * 1.5, dur * 0.82, "sine", 0.07, t);
        }
      }
      t += dur;
    });

    // Subtle bass pulse on beats 1 of key measures
    const bass = [
      [F3, 0],
      [F3, Q * 7],
      [F3, Q * 14],
      [F3, Q * 21],
    ];
    bass.forEach(([f, start]) => tone(f, Q * 2, "sine", 0.08, start));
  }

  function playCandleBlow() {
    noise(0.32, 350, 0.4);
    tone(200, 0.2, "sine", 0.08, 0.05);
  }

  function playCelebration() {
    [262, 330, 392, 523, 659, 784, 1047].forEach((f, i) =>
      tone(f, 0.45, "triangle", 0.28, i * 0.11),
    );
    setTimeout(() => {
      [1047, 1175, 1319, 1568, 2093].forEach((f, i) =>
        tone(f, 0.3, "sine", 0.18, i * 0.09),
      );
    }, 900);
  }

  function playBalloonPop() {
    noise(0.12, 2000, 0.7);
    tone(180, 0.1, "sawtooth", 0.3, 0.02);
  }

  function playWishSound() {
    [523, 659, 784, 1047, 1319, 1568, 2093].forEach((f, i) =>
      tone(f, 0.55, "triangle", 0.2, i * 0.07),
    );
  }

  // function playSparkleChime() {
  //   const pool = [1319, 1568, 1760, 2093, 2349];
  //   tone(pool[Math.floor(Math.random() * pool.length)], 0.5, "triangle", 0.08);
  // }

  // ============================================================
  // CONFETTI SYSTEM
  // ============================================================
  const confettiCanvas = document.getElementById("confetti-canvas");
  const cCtx = confettiCanvas.getContext("2d");
  const COLORS = [
    "#ffd6e0",
    "#ffb997",
    "#a7bed3",
    "#ffffff",
    "#ffe066",
    "#ff6b9d",
    "#c3f0ca",
  ];

  function resizeCanvas() {
    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;
  }
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);

  function mkParticle(x, y, burst = false) {
    return {
      x: x ?? Math.random() * confettiCanvas.width,
      y: y ?? -12,
      w: Math.random() * 10 + 6,
      h: Math.random() * 5 + 3,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      rot: Math.random() * Math.PI * 2,
      rotV: (Math.random() - 0.5) * 0.18,
      vx: burst ? (Math.random() - 0.5) * 16 : (Math.random() - 0.5) * 2,
      vy: burst ? -(Math.random() * 12 + 4) : Math.random() * 3 + 1.5,
      g: burst ? 0.35 : 0.06,
      opacity: 1,
    };
  }

  function burstConfetti(x, y, count = 80) {
    for (let i = 0; i < count; i++)
      confettiParticles.push(mkParticle(x, y, true));
    if (!confettiRafId) animateConfetti();
  }

  function startRainConfetti() {
    confettiActive = true;
    for (let i = 0; i < 60; i++) confettiParticles.push(mkParticle());
    if (!confettiRafId) animateConfetti();
  }

  function animateConfetti() {
    cCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);

    confettiParticles = confettiParticles.filter(
      (p) => p.opacity > 0.02 && p.y < confettiCanvas.height + 20,
    );

    confettiParticles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.g;
      p.rot += p.rotV;
      if (p.y > confettiCanvas.height * 0.75) p.opacity -= 0.012;

      cCtx.save();
      cCtx.globalAlpha = Math.max(0, p.opacity);
      cCtx.translate(p.x, p.y);
      cCtx.rotate(p.rot);
      cCtx.fillStyle = p.color;
      cCtx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      cCtx.restore();
    });

    if (confettiActive && confettiParticles.length < 180) {
      confettiParticles.push(mkParticle());
    }

    if (confettiParticles.length > 0) {
      confettiRafId = requestAnimationFrame(animateConfetti);
    } else {
      cCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
      confettiRafId = null;
    }
  }

  // ============================================================
  // BIRTHDAY PAGE
  // ============================================================
  const BIRTHDAY_MSG =
    "Happy Birthday, my little Snorlax 💤💖 You’re honestly the perfect mix of adorable and dangerously irresistible… like seriously, save some charm for the rest of us? It’s getting unfair 😌✨ I still don’t understand how someone can be this cute and this sleepy at the same time, but somehow you make it work. Stay cute, stay a tiny bit dramatic, keep stealing attention without even trying… and maybe keep being a little mine too 🤭💖 Hope your birthday is full of naps, chaos, good food, and enough compliments to match your ego (if it fits 😏). Happy Birthday, Virrshh 💖✨";

  function initBirthdayPage() {
    buildCandles();
    setupBalloons();

    const wishBtn = document.getElementById("wish-btn");
    if (wishBtn) {
      wishBtn.addEventListener("click", () => {
        playWishSound();
        burstConfetti(confettiCanvas.width / 2, confettiCanvas.height / 2, 120);
        wishBtn.textContent = "🌟 Wish Sent! 🌟";
        wishBtn.disabled = true;
      });
    }
  }

  // Complete Happy Birthday song ~26 s; loops until typewriter finishes
  const SONG_DURATION_MS = 26500;
  function startBirthdaySongLoop() {
    stopBirthdaySongLoop();
    playBirthdayFanfare();
    songLoopTimeout = setTimeout(startBirthdaySongLoop, SONG_DURATION_MS);
  }
  function stopBirthdaySongLoop() {
    clearTimeout(songLoopTimeout);
    songLoopTimeout = null;
  }

  function showBirthdayPage() {
    scrapbookView.classList.remove("active");
    wallView.classList.add("active");

    // Reset state for this visit
    stopBirthdaySongLoop();
    candlesBlown = 0;
    confettiParticles = [];
    confettiActive = false;
    confettiRafId = null;

    // Reset candles
    document
      .querySelectorAll(".candle")
      .forEach((c) => c.classList.remove("blown"));

    // Reset typewriter
    const tw = document.getElementById("birthday-typewriter");
    if (tw) tw.textContent = "";

    // Reset wish button
    const wb = document.getElementById("wish-btn");
    if (wb) {
      wb.disabled = false;
    }

    // Reset hint
    const hint = document.getElementById("blow-hint");
    if (hint) hint.textContent = "Click the candles to blow them out! 🌬️";

    startBirthdaySongLoop();
    setTimeout(startRainConfetti, 700);
    setTimeout(startTypewriter, 1800);
    startSparkles();
    startChimes();
  }

  function buildCandles() {
    const row = document.getElementById("candles-row");
    if (!row || row.children.length > 0) return;
    const colors = [
      "var(--accent-1)",
      "var(--accent-2)",
      "var(--accent-3)",
      "var(--accent-2)",
      "var(--accent-1)",
    ];
    for (let i = 0; i < TOTAL_CANDLES; i++) {
      const c = document.createElement("div");
      c.className = "candle";
      c.dataset.index = i;
      c.innerHTML = `
        <div class="flame-wrap"><div class="flame"></div></div>
        <div class="candle-stick" style="background:${colors[i]}"></div>
      `;
      c.addEventListener("click", () => blowCandle(c));
      row.appendChild(c);
    }
  }

  function blowCandle(el) {
    if (el.classList.contains("blown")) return;
    el.classList.add("blown");
    playCandleBlow();
    candlesBlown++;

    const r = el.getBoundingClientRect();
    burstConfetti(r.left + r.width / 2, r.top, 18);

    if (candlesBlown >= TOTAL_CANDLES) setTimeout(allCandlesBlown, 450);
  }

  function allCandlesBlown() {
    playCelebration();
    burstConfetti(confettiCanvas.width / 2, confettiCanvas.height / 3, 140);

    const hint = document.getElementById("blow-hint");
    if (hint) {
      hint.style.animation = "none";
      hint.style.opacity = "1";
    }

    const cake = document.getElementById("birthday-cake");
    if (cake)
      cake.style.animation = "cakeShake 0.6s ease-in-out, cakeAppear 0s";
  }

  function setupBalloons() {
    document.querySelectorAll(".balloon").forEach((b) => {
      b.addEventListener("click", (e) => {
        e.stopPropagation();
        if (b.classList.contains("popped")) return;
        playBalloonPop();
        b.classList.add("popped");
        burstConfetti(e.clientX, e.clientY, 22);
        setTimeout(() => b.remove(), 320);
      });
    });
  }

  function startTypewriter() {
    const el = document.getElementById("birthday-typewriter");
    if (!el) return;
    el.textContent = "";
    let i = 0;
    (function type() {
      if (i < BIRTHDAY_MSG.length) {
        el.textContent += BIRTHDAY_MSG[i++];
        setTimeout(type, 42);
      } else {
        stopBirthdaySongLoop();
      }
    })();
  }

  function startSparkles() {
    const container = document.getElementById("sparkles-container");
    if (!container) return;
    if (sparkleInterval) clearInterval(sparkleInterval);

    const emojis = ["✨", "⭐", "🌟", "💫", "🎊", "🎉"];

    function spawn() {
      const s = document.createElement("span");
      s.className = "sparkle";
      s.textContent = emojis[Math.floor(Math.random() * emojis.length)];
      s.style.left = Math.random() * 98 + "vw";
      s.style.top = Math.random() * 95 + "vh";
      s.style.fontSize = Math.random() * 1.4 + 0.7 + "rem";
      const dur = Math.random() * 3 + 2.5;
      s.style.animationDuration = dur + "s";
      s.style.animationDelay = Math.random() * 1.5 + "s";
      container.appendChild(s);
      setTimeout(() => s.remove(), (dur + 1.5) * 1000);
    }

    for (let i = 0; i < 10; i++) setTimeout(spawn, i * 180);
    sparkleInterval = setInterval(spawn, 550);
  }

  function startChimes() {
    if (chimeInterval) clearInterval(chimeInterval);
    chimeInterval = setInterval(() => {
      if (Math.random() > 0.45) playSparkleChime();
    }, 2800);
  }

  // ============================================================
  // UNIVERSE SOUNDS
  // ============================================================
  function playUniverseEntry() {
    // Ascending ethereal arpeggio — "launch into space"
    const freqs = [131, 165, 196, 247, 294, 330, 392, 523, 659, 784];
    freqs.forEach((f, i) => tone(f, 1.4, "triangle", 0.1, i * 0.11));
    // Deep resonant bass under it
    tone(65, 3.5, "sine", 0.18, 0.2);
    tone(98, 3.0, "sine", 0.09, 0.5);
  }

  function playGalaxyReveal() {
    // Ethereal high cluster — wonder moment
    [1047, 1319, 1568, 1760, 2093].forEach((f, i) =>
      tone(f, 3.5, "triangle", 0.09, i * 0.18),
    );
    tone(131, 5.0, "sine", 0.18);
    tone(196, 4.0, "sine", 0.1, 0.3);
  }

  function playZoomWhoosh() {
    noise(0.4, 1200, 0.22);
    tone(180, 0.4, "sine", 0.1, 0.05);
  }

  // ============================================================
  // UNIVERSE — TEXTURE BUILDERS
  // ============================================================
  function makeEarthTex() {
    const c = document.createElement("canvas");
    c.width = 1024;
    c.height = 512;
    const g = c.getContext("2d");

    // Ocean gradient
    const ocean = g.createLinearGradient(0, 0, 0, 512);
    ocean.addColorStop(0, "#0d2b4a");
    ocean.addColorStop(0.18, "#1a5a90");
    ocean.addColorStop(0.5, "#1e7fc0");
    ocean.addColorStop(0.82, "#1a5a90");
    ocean.addColorStop(1, "#0d2b4a");
    g.fillStyle = ocean;
    g.fillRect(0, 0, 1024, 512);

    // Helper: draw a land polygon
    const land = (pts, color) => {
      g.beginPath();
      g.moveTo(pts[0][0], pts[0][1]);
      for (let k = 1; k < pts.length; k++) g.lineTo(pts[k][0], pts[k][1]);
      g.closePath();
      g.fillStyle = color;
      g.fill();
    };

    // North America
    land(
      [
        [240, 95],
        [320, 85],
        [380, 105],
        [415, 170],
        [400, 255],
        [355, 318],
        [308, 348],
        [258, 296],
        [235, 215],
        [242, 138],
      ],
      "#3d7a3d",
    );
    land(
      [
        [245, 100],
        [260, 140],
        [248, 215],
        [228, 210],
        [230, 150],
      ],
      "#4a8a40",
    );
    land(
      [
        [308, 320],
        [368, 332],
        [378, 382],
        [328, 422],
        [288, 402],
        [278, 358],
      ],
      "#5a8a30",
    );
    // South America
    land(
      [
        [358, 402],
        [398, 390],
        [428, 422],
        [440, 502],
        [418, 582],
        [388, 642],
        [348, 622],
        [338, 552],
        [342, 462],
      ],
      "#4a8020",
    );
    land(
      [
        [355, 450],
        [395, 440],
        [408, 490],
        [388, 520],
        [358, 510],
      ],
      "#6a9a20",
    );
    // Europe
    land(
      [
        [898, 98],
        [958, 88],
        [988, 108],
        [998, 148],
        [978, 188],
        [948, 198],
        [908, 178],
        [888, 138],
      ],
      "#4a8030",
    );
    // Africa
    land(
      [
        [918, 198],
        [968, 188],
        [998, 228],
        [1008, 302],
        [988, 382],
        [958, 432],
        [928, 422],
        [908, 358],
        [900, 278],
        [905, 218],
      ],
      "#8a7030",
    );
    land(
      [
        [920, 380],
        [960, 390],
        [978, 442],
        [958, 504],
        [928, 510],
        [905, 460],
        [905, 398],
      ],
      "#a08040",
    );
    // Middle East
    land(
      [
        [1000, 200],
        [1060, 195],
        [1080, 230],
        [1060, 270],
        [1020, 265],
        [998, 240],
      ],
      "#b89050",
    );
    // Asia
    land(
      [
        [1000, 98],
        [1100, 78],
        [1200, 88],
        [1350, 108],
        [1450, 128],
        [1498, 98],
        [1600, 118],
        [1650, 158],
        [1598, 218],
        [1498, 238],
        [1398, 228],
        [1298, 248],
        [1198, 228],
        [1098, 198],
        [1000, 168],
      ],
      "#4a8020",
    );
    land(
      [
        [1098, 228],
        [1298, 238],
        [1398, 268],
        [1448, 328],
        [1398, 378],
        [1298, 368],
        [1198, 348],
        [1098, 308],
      ],
      "#6a8030",
    );
    land(
      [
        [1448, 318],
        [1548, 338],
        [1598, 398],
        [1548, 438],
        [1488, 428],
        [1448, 378],
      ],
      "#8a9020",
    );
    land(
      [
        [1200, 350],
        [1260, 380],
        [1240, 430],
        [1195, 420],
        [1185, 380],
      ],
      "#4a8030",
    );
    // Japan
    land(
      [
        [1620, 200],
        [1648, 192],
        [1655, 220],
        [1638, 238],
        [1618, 228],
      ],
      "#3a7030",
    );
    // Australia
    land(
      [
        [1478, 568],
        [1598, 558],
        [1678, 588],
        [1698, 658],
        [1668, 718],
        [1578, 728],
        [1488, 698],
        [1458, 638],
      ],
      "#a07030",
    );
    land(
      [
        [1488, 580],
        [1560, 576],
        [1578, 600],
        [1548, 620],
        [1498, 615],
      ],
      "#8a9020",
    );
    // Greenland
    land(
      [
        [538, 58],
        [608, 53],
        [648, 78],
        [638, 138],
        [588, 158],
        [538, 138],
        [518, 88],
      ],
      "#c8e4ff",
    );

    // Polar ice caps
    g.fillStyle = "rgba(215,238,255,0.94)";
    g.fillRect(0, 0, 1024, 50);
    g.fillStyle = "rgba(215,238,255,0.96)";
    g.fillRect(0, 452, 1024, 60);

    // Ocean shimmer streaks
    g.fillStyle = "rgba(255,255,255,0.035)";
    for (let i = 0; i < 160; i++) {
      const sx = Math.random() * 1024;
      const sy = Math.random() * 512;
      g.save();
      g.translate(sx, sy);
      g.rotate(Math.random() * Math.PI);
      g.scale(1, 0.15);
      g.beginPath();
      g.arc(0, 0, Math.random() * 55 + 8, 0, Math.PI * 2);
      g.fill();
      g.restore();
    }

    return new THREE.CanvasTexture(c);
  }

  function makeCloudTex() {
    const c = document.createElement("canvas");
    c.width = 1024;
    c.height = 512;
    const g = c.getContext("2d");
    for (let i = 0; i < 110; i++) {
      const x = Math.random() * 1024;
      const y = Math.random() * 512;
      const rx = Math.random() * 130 + 28;
      const ry = Math.random() * 38 + 12;
      const grad = g.createRadialGradient(x, y, 0, x, y, rx);
      grad.addColorStop(0, "rgba(255,255,255,0.88)");
      grad.addColorStop(0.42, "rgba(255,255,255,0.45)");
      grad.addColorStop(1, "rgba(255,255,255,0)");
      g.save();
      g.translate(x, y);
      g.scale(1, ry / rx);
      g.translate(-x, -y);
      g.beginPath();
      g.arc(x, y, rx, 0, Math.PI * 2);
      g.fillStyle = grad;
      g.fill();
      g.restore();
    }
    return new THREE.CanvasTexture(c);
  }

  function makeMoonTex() {
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 256;
    const g = c.getContext("2d");
    g.fillStyle = "#b8b8b8";
    g.fillRect(0, 0, 256, 256);
    // Surface variation
    const surf = g.createRadialGradient(110, 100, 0, 128, 128, 140);
    surf.addColorStop(0, "#d0d0d0");
    surf.addColorStop(1, "#909090");
    g.fillStyle = surf;
    g.fillRect(0, 0, 256, 256);
    // Craters
    for (let i = 0; i < 22; i++) {
      const cx = Math.random() * 256;
      const cy = Math.random() * 256;
      const cr = Math.random() * 22 + 3;
      const cg = g.createRadialGradient(cx, cy, 0, cx, cy, cr);
      cg.addColorStop(0, "rgba(80,80,80,0.7)");
      cg.addColorStop(0.65, "rgba(120,120,120,0.3)");
      cg.addColorStop(1, "rgba(200,200,200,0)");
      g.beginPath();
      g.arc(cx, cy, cr, 0, Math.PI * 2);
      g.fillStyle = cg;
      g.fill();
    }
    return new THREE.CanvasTexture(c);
  }

  // ============================================================
  // UNIVERSE SCENE — Three.js Earth → Galaxy
  // ============================================================
  function initUniverseScene() {
    const canvas = document.getElementById("universe-canvas");
    const el = document.getElementById("universe-view");
    if (typeof THREE === "undefined" || !canvas) return () => {};

    let W = window.innerWidth,
      H = window.innerHeight;

    // ── Renderer / Scene / Camera ──
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(58, W / H, 0.005, 6000);
    camera.position.set(0, 0, 2.5);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setClearColor(0x000008);

    // ── Lights ──
    scene.add(new THREE.AmbientLight(0x111133, 0.6));
    const sunDir = new THREE.DirectionalLight(0xfff8e0, 1.6);
    sunDir.position.set(5, 2, 4);
    scene.add(sunDir);
    const sunPoint = new THREE.PointLight(0xfff8e0, 2.2, 900);
    sunPoint.position.set(100, 15, -165);
    scene.add(sunPoint);
    const rimLight = new THREE.PointLight(0x4488ff, 0.4, 30);
    rimLight.position.set(-4, 2, 2);
    scene.add(rimLight);

    // ── Earth ──
    const earthMesh = new THREE.Mesh(
      new THREE.SphereGeometry(1, 64, 64),
      new THREE.MeshPhongMaterial({
        map: makeEarthTex(),
        shininess: 22,
        specular: new THREE.Color(0x223355),
      }),
    );
    scene.add(earthMesh);

    // Atmosphere inner
    scene.add(
      new THREE.Mesh(
        new THREE.SphereGeometry(1.026, 32, 32),
        new THREE.MeshPhongMaterial({
          color: 0x4488ff,
          transparent: true,
          opacity: 0.13,
          side: THREE.BackSide,
        }),
      ),
    );

    // Atmosphere outer glow
    scene.add(
      new THREE.Mesh(
        new THREE.SphereGeometry(1.09, 32, 32),
        new THREE.MeshBasicMaterial({
          color: 0x2244cc,
          transparent: true,
          opacity: 0.055,
          side: THREE.BackSide,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      ),
    );

    // Clouds
    const cloudMesh = new THREE.Mesh(
      new THREE.SphereGeometry(1.013, 48, 48),
      new THREE.MeshPhongMaterial({
        map: makeCloudTex(),
        transparent: true,
        opacity: 0.68,
        depthWrite: false,
      }),
    );
    scene.add(cloudMesh);

    // ── Moon ──
    const moonMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.27, 32, 32),
      new THREE.MeshPhongMaterial({ map: makeMoonTex(), shininess: 4 }),
    );
    moonMesh.position.set(3.5, 0.4, -0.8);
    scene.add(moonMesh);

    // ── Jupiter ──
    const jupiterC = document.createElement("canvas");
    jupiterC.width = 256;
    jupiterC.height = 128;
    const jupG = jupiterC.getContext("2d");
    const bands = [
      "#c98a55",
      "#e8b070",
      "#d4956a",
      "#b87850",
      "#e0a868",
      "#c8885a",
      "#dca060",
    ];
    bands.forEach((col, i) => {
      jupG.fillStyle = col;
      jupG.fillRect(0, i * 18, 256, 18);
    });
    jupG.strokeStyle = "rgba(0,0,0,0.12)";
    jupG.lineWidth = 1;
    for (let i = 0; i <= 7; i++) {
      jupG.beginPath();
      jupG.moveTo(0, i * 18);
      jupG.lineTo(256, i * 18);
      jupG.stroke();
    }
    // Great Red Spot
    jupG.fillStyle = "rgba(180,60,40,0.75)";
    jupG.beginPath();
    jupG.ellipse(160, 65, 22, 14, 0, 0, Math.PI * 2);
    jupG.fill();

    const jupiterMesh = new THREE.Mesh(
      new THREE.SphereGeometry(1.5, 32, 32),
      new THREE.MeshPhongMaterial({
        map: new THREE.CanvasTexture(jupiterC),
        shininess: 12,
      }),
    );
    jupiterMesh.position.set(22, -2, -35);
    scene.add(jupiterMesh);

    // ── Saturn ──
    const saturnMesh = new THREE.Mesh(
      new THREE.SphereGeometry(1.1, 32, 32),
      new THREE.MeshPhongMaterial({ color: 0xe4c878, shininess: 10 }),
    );
    saturnMesh.position.set(-45, 3, -75);
    scene.add(saturnMesh);

    // Saturn rings
    const ringGeo = new THREE.RingGeometry(1.7, 2.9, 80);
    // Taper ring UVs for gradient-like look
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xd4b882,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.62,
    });
    const saturnRing = new THREE.Mesh(ringGeo, ringMat);
    saturnRing.position.copy(saturnMesh.position);
    saturnRing.rotation.x = Math.PI / 3.2;
    saturnRing.rotation.z = 0.18;
    scene.add(saturnRing);

    // ── Distant planet (Uranus-like) ──
    const uranusMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.85, 24, 24),
      new THREE.MeshPhongMaterial({ color: 0x88ddcc, shininess: 18 }),
    );
    uranusMesh.position.set(70, -8, -130);
    scene.add(uranusMesh);

    // ── Sun ──
    const sunMesh = new THREE.Mesh(
      new THREE.SphereGeometry(8, 32, 32),
      new THREE.MeshBasicMaterial({ color: 0xffffbb }),
    );
    sunMesh.position.set(100, 15, -165);
    scene.add(sunMesh);

    // Sun corona glow
    [14, 20, 28].forEach((r, i) => {
      const corona = new THREE.Mesh(
        new THREE.SphereGeometry(r, 24, 24),
        new THREE.MeshBasicMaterial({
          color: 0xffcc33,
          transparent: true,
          opacity: 0.055 - i * 0.015,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      );
      corona.position.copy(sunMesh.position);
      scene.add(corona);
    });

    // ── Background stars ──
    {
      const N = 9000;
      const sPos = new Float32Array(N * 3);
      const sCol = new Float32Array(N * 3);
      for (let i = 0; i < N; i++) {
        const r = 220 + Math.random() * 680;
        const th = Math.random() * Math.PI * 2;
        const ph = Math.acos(2 * Math.random() - 1);
        sPos[i * 3] = r * Math.sin(ph) * Math.cos(th);
        sPos[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th);
        sPos[i * 3 + 2] = r * Math.cos(ph);
        const t = Math.random();
        if (t < 0.18) {
          sCol[i * 3] = 0.72;
          sCol[i * 3 + 1] = 0.82;
          sCol[i * 3 + 2] = 1.0; // blue
        } else if (t < 0.32) {
          sCol[i * 3] = 1.0;
          sCol[i * 3 + 1] = 0.92;
          sCol[i * 3 + 2] = 0.68; // yellow
        } else if (t < 0.4) {
          sCol[i * 3] = 1.0;
          sCol[i * 3 + 1] = 0.75;
          sCol[i * 3 + 2] = 0.7; // red dwarf
        } else {
          sCol[i * 3] = 1.0;
          sCol[i * 3 + 1] = 1.0;
          sCol[i * 3 + 2] = 1.0; // white
        }
      }
      const sGeo = new THREE.BufferGeometry();
      sGeo.setAttribute("position", new THREE.BufferAttribute(sPos, 3));
      sGeo.setAttribute("color", new THREE.BufferAttribute(sCol, 3));
      scene.add(
        new THREE.Points(
          sGeo,
          new THREE.PointsMaterial({
            size: 0.9,
            vertexColors: true,
            transparent: true,
            opacity: 0.88,
            sizeAttenuation: true,
          }),
        ),
      );
    }

    // ── Nebula wisps (large faint colored volumes) ──
    [
      { color: 0x3322aa, x: -200, y: 80, z: -350, r: 80 },
      { color: 0xaa2244, x: 280, y: -60, z: -420, r: 70 },
      { color: 0x228899, x: -120, y: -90, z: -280, r: 55 },
      { color: 0x554422, x: 180, y: 50, z: -300, r: 65 },
    ].forEach(({ color, x, y, z, r }) => {
      const neb = new THREE.Mesh(
        new THREE.SphereGeometry(r, 8, 8),
        new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.014,
          side: THREE.BackSide,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      );
      neb.position.set(x, y, z);
      scene.add(neb);
    });

    // ── Galaxy (Milky Way spiral) ──
    {
      const TOTAL = 28000;
      const gPos = new Float32Array(TOTAL * 3);
      const gCol = new Float32Array(TOTAL * 3);
      const cIn = new THREE.Color(0xffddaa);
      const cOut = new THREE.Color(0x6688ff);
      let idx = 0;

      // Core bulge
      for (let i = 0; i < 5000 && idx < TOTAL; i++, idx++) {
        const r = Math.pow(Math.random(), 1.4) * 38;
        const a = Math.random() * Math.PI * 2;
        const elev = (Math.random() - 0.5) * r * 0.18;
        gPos[idx * 3] = r * Math.cos(a);
        gPos[idx * 3 + 1] = elev;
        gPos[idx * 3 + 2] = r * Math.sin(a);
        const cc = cIn
          .clone()
          .lerp(new THREE.Color(0xffffff), Math.random() * 0.55);
        gCol[idx * 3] = cc.r;
        gCol[idx * 3 + 1] = cc.g;
        gCol[idx * 3 + 2] = cc.b;
      }

      // 4 spiral arms
      const PER = Math.floor((TOTAL - 5000) / 4);
      for (let arm = 0; arm < 4; arm++) {
        const offset = (arm / 4) * Math.PI * 2;
        for (let i = 0; i < PER && idx < TOTAL; i++, idx++) {
          const t = i / PER;
          const r = 18 + t * 280;
          const angle = offset + t * Math.PI * 3.6;
          const spread = r * 0.2;
          gPos[idx * 3] = r * Math.cos(angle) + (Math.random() - 0.5) * spread;
          gPos[idx * 3 + 1] = (Math.random() - 0.5) * (2 + t * 9);
          gPos[idx * 3 + 2] =
            r * Math.sin(angle) + (Math.random() - 0.5) * spread;
          const cc = cIn.clone().lerp(cOut, t);
          const bright = 0.38 + Math.random() * 0.62;
          gCol[idx * 3] = cc.r * bright;
          gCol[idx * 3 + 1] = cc.g * bright;
          gCol[idx * 3 + 2] = cc.b * bright;
        }
      }

      const gGeo = new THREE.BufferGeometry();
      gGeo.setAttribute("position", new THREE.BufferAttribute(gPos, 3));
      gGeo.setAttribute("color", new THREE.BufferAttribute(gCol, 3));
      const galaxy = new THREE.Points(
        gGeo,
        new THREE.PointsMaterial({
          size: 1.4,
          vertexColors: true,
          transparent: true,
          opacity: 0.88,
          sizeAttenuation: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      );
      galaxy.position.set(0, -85, -620);
      galaxy.rotation.x = -0.38;
      galaxy.rotation.z = 0.14;
      scene.add(galaxy);
    }

    // ── Scroll → camera zoom ──
    let scrollProg = 0;
    let lastLabelKey = "";
    let galaxyRevealPlayed = false;
    const labelEl = document.getElementById("universe-label");
    const hintEl = document.getElementById("universe-scroll-hint");

    const LABELS = [
      { at: 0.0, text: "🌍 Earth" },
      { at: 0.08, text: "🌙 Earth & The Moon" },
      { at: 0.22, text: "🪐 Inner Solar System" },
      { at: 0.42, text: "☀️ Our Solar System" },
      { at: 0.66, text: "⭐ The Stars" },
      { at: 0.86, text: "🌌 The Milky Way Galaxy" },
    ];

    function getLabelText(p) {
      let text = LABELS[0].text;
      for (const L of LABELS) if (p >= L.at) text = L.text;
      return text;
    }

    function onUniverseScroll() {
      const max = el.scrollHeight - el.clientHeight;
      scrollProg = max > 0 ? el.scrollTop / max : 0;

      if (scrollProg > 0.025 && hintEl) hintEl.style.opacity = "0";

      const lbl = getLabelText(scrollProg);
      if (lbl !== lastLabelKey) {
        lastLabelKey = lbl;
        if (labelEl) {
          labelEl.style.opacity = "0";
          setTimeout(() => {
            labelEl.textContent = lbl;
            labelEl.style.opacity = "1";
          }, 300);
        }
        if (scrollProg >= 0.35) playZoomWhoosh();
        if (scrollProg >= 0.86 && !galaxyRevealPlayed) {
          galaxyRevealPlayed = true;
          playGalaxyReveal();
        }
      }
    }

    el.addEventListener("scroll", onUniverseScroll);

    // ── Animation loop ──
    let camZ = 2.5;
    let camY = 0;
    let universeRaf;

    function tick() {
      universeRaf = requestAnimationFrame(tick);
      const now = performance.now();

      // Earth
      earthMesh.rotation.y += 0.0014;
      cloudMesh.rotation.y += 0.0017;
      cloudMesh.rotation.x += 0.00025;

      // Moon orbit
      const mAngle = now * 0.00023;
      moonMesh.position.x = Math.cos(mAngle) * 3.5;
      moonMesh.position.z = Math.sin(mAngle) * 3.5 - 0.5;
      moonMesh.rotation.y += 0.003;

      // Planets
      jupiterMesh.rotation.y += 0.0032;
      saturnMesh.rotation.y += 0.0025;
      saturnRing.rotation.z += 0.0002;
      uranusMesh.rotation.y += 0.002;

      // Sun subtle pulse
      sunPoint.intensity = 2.2 + Math.sin(now * 0.0018) * 0.14;

      // Camera zoom — exponential based on scroll
      const targetZ = 2.5 * Math.pow(340, scrollProg);
      const targetY = scrollProg * 9;
      camZ += (targetZ - camZ) * 0.055;
      camY += (targetY - camY) * 0.055;
      camera.position.z = camZ;
      camera.position.y = camY;
      camera.lookAt(0, camY * 0.4, 0);

      renderer.render(scene, camera);
    }
    tick();

    // Resize
    const onResize = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      camera.aspect = W / H;
      camera.updateProjectionMatrix();
      renderer.setSize(W, H);
    };
    window.addEventListener("resize", onResize);

    // Cleanup
    return () => {
      cancelAnimationFrame(universeRaf);
      el.removeEventListener("scroll", onUniverseScroll);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
    };
  }

  // ============================================================
  // UNIVERSE VIEW — show / hide
  // ============================================================
  function showUniverseView() {
    wallView.classList.remove("active");
    universeView.classList.add("active");
    universeView.scrollTop = 0;
    universeHud.classList.add("active");
    universeBackBtn.classList.add("active");
    if (document.getElementById("universe-label"))
      document.getElementById("universe-label").textContent = "🌍 Earth";
    if (document.getElementById("universe-scroll-hint"))
      document.getElementById("universe-scroll-hint").style.opacity = "1";
    playUniverseEntry();
    universeCleanup = initUniverseScene();
  }

  function hideUniverseView() {
    universeView.classList.remove("active");
    universeHud.classList.remove("active");
    universeBackBtn.classList.remove("active");
    wallView.classList.add("active");
    if (universeCleanup) {
      universeCleanup();
      universeCleanup = null;
    }
  }

  // ============================================================
  // THREE.JS LANDING SCENE
  // ============================================================
  let threeRaf = null;

  function initThreeLanding(onTransition) {
    const canvas = document.getElementById("three-canvas");
    if (!canvas || typeof THREE === "undefined") {
      onTransition();
      return;
    }

    let W = window.innerWidth,
      H = window.innerHeight;

    // ── Scene / Camera / Renderer ──
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, W / H, 0.1, 100);
    camera.position.z = 6.5;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
    });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));

    // ── Canvas Textures ──
    function makeCoverTex() {
      const c = document.createElement("canvas");
      c.width = 512;
      c.height = 740;
      const g = c.getContext("2d");

      const bg = g.createLinearGradient(0, 0, 512, 740);
      bg.addColorStop(0, "#ffd6e0");
      bg.addColorStop(0.45, "#f7c8d4");
      bg.addColorStop(1, "#ffb997");
      g.fillStyle = bg;
      g.fillRect(0, 0, 512, 740);

      // ruled lines
      g.strokeStyle = "rgba(255,255,255,0.15)";
      g.lineWidth = 1;
      for (let y = 28; y < 740; y += 28) {
        g.beginPath();
        g.moveTo(0, y);
        g.lineTo(512, y);
        g.stroke();
      }

      // corner brackets
      g.strokeStyle = "rgba(75,56,50,0.28)";
      g.lineWidth = 3;
      g.lineCap = "square";
      [
        [32, 32, 1, 1],
        [480, 32, -1, 1],
        [32, 708, 1, -1],
        [480, 708, -1, -1],
      ].forEach(([x, y, sx, sy]) => {
        g.beginPath();
        g.moveTo(x + sx * 26, y);
        g.lineTo(x, y);
        g.lineTo(x, y + sy * 26);
        g.stroke();
      });

      // ornament
      g.fillStyle = "rgba(75,56,50,0.22)";
      g.font = "52px serif";
      g.textAlign = "center";
      g.fillText("❀  ✦  ❀", 256, 188);

      // title
      g.shadowColor = "rgba(0,0,0,0.08)";
      g.shadowBlur = 4;
      g.fillStyle = "rgba(75,56,50,0.9)";
      g.font = "bold 76px Georgia,serif";
      g.fillText("Your", 256, 315);
      g.fillText("Scrapbook", 256, 412);
      g.shadowBlur = 0;

      // rule
      g.strokeStyle = "rgba(75,56,50,0.22)";
      g.lineWidth = 1.5;
      g.beginPath();
      g.moveTo(150, 448);
      g.lineTo(362, 448);
      g.stroke();

      // subtitle
      g.fillStyle = "rgba(75,56,50,0.52)";
      g.font = "26px Georgia,serif";
      g.fillText("memories & moments", 256, 494);

      // bottom deco
      g.fillStyle = "rgba(75,56,50,0.18)";
      g.font = "34px serif";
      g.fillText("· · ·", 256, 670);

      return new THREE.CanvasTexture(c);
    }

    function makeSpineTex() {
      const c = document.createElement("canvas");
      c.width = 64;
      c.height = 740;
      const g = c.getContext("2d");
      const grad = g.createLinearGradient(0, 0, 64, 0);
      grad.addColorStop(0, "#c09aae");
      grad.addColorStop(0.5, "#d4b4c4");
      grad.addColorStop(1, "#e2c8d4");
      g.fillStyle = grad;
      g.fillRect(0, 0, 64, 740);
      g.fillStyle = "rgba(0,0,0,0.1)";
      g.fillRect(58, 0, 6, 740);
      return new THREE.CanvasTexture(c);
    }

    function makePagesTex() {
      const c = document.createElement("canvas");
      c.width = 64;
      c.height = 740;
      const g = c.getContext("2d");
      for (let y = 0; y < 740; y += 3) {
        g.fillStyle = y % 6 === 0 ? "#ede8e2" : "#faf6f2";
        g.fillRect(0, y, 64, 3);
      }
      return new THREE.CanvasTexture(c);
    }

    // ── Book Geometry ──
    const BW = 1.5,
      BH = 2.1,
      BD = 0.2;
    const bookGeo = new THREE.BoxGeometry(BW, BH, BD);
    const bookMats = [
      new THREE.MeshPhongMaterial({ map: makePagesTex(), shininess: 18 }), // +x pages
      new THREE.MeshPhongMaterial({ map: makeSpineTex(), shininess: 14 }), // -x spine
      new THREE.MeshPhongMaterial({ color: 0xf0e0e8, shininess: 10 }), // +y top
      new THREE.MeshPhongMaterial({ color: 0xe8d4dc, shininess: 10 }), // -y bottom
      new THREE.MeshPhongMaterial({ map: makeCoverTex(), shininess: 35 }), // +z front
      new THREE.MeshPhongMaterial({ color: 0xd4a8bc, shininess: 10 }), // -z back
    ];
    const book = new THREE.Mesh(bookGeo, bookMats);
    book.rotation.y = -0.42;
    book.rotation.x = 0.09;
    // Move book to upper half of screen so overlay text clears it
    book.position.y = 0.35;
    scene.add(book);

    // ── Lights ──
    scene.add(new THREE.AmbientLight(0xfff8f4, 0.55));
    const sun = new THREE.DirectionalLight(0xffffff, 0.9);
    sun.position.set(3, 4, 6);
    scene.add(sun);
    const pink = new THREE.PointLight(0xffd6e0, 0.7, 20);
    pink.position.set(-4, 3, 4);
    scene.add(pink);
    const warm = new THREE.PointLight(0xffb997, 0.45, 20);
    warm.position.set(4, -3, 2);
    scene.add(warm);
    // Moving point light that follows mouse
    const mouseLight = new THREE.PointLight(0xfff0f5, 0.55, 15);
    mouseLight.position.set(0, 0, 4);
    scene.add(mouseLight);

    // ── Particles ──
    const N = 300;
    const pPos = new Float32Array(N * 3);
    const pVel = [];
    for (let i = 0; i < N; i++) {
      pPos[i * 3] = (Math.random() - 0.5) * 18;
      pPos[i * 3 + 1] = (Math.random() - 0.5) * 14;
      pPos[i * 3 + 2] = (Math.random() - 0.5) * 6 - 1;
      pVel.push({
        x: (Math.random() - 0.5) * 0.003,
        y: -(Math.random() * 0.006 + 0.002),
      });
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
    const pMat = new THREE.PointsMaterial({
      color: 0xffd6e0,
      size: 0.055,
      transparent: true,
      opacity: 0.78,
      sizeAttenuation: true,
    });
    const ptcls = new THREE.Points(pGeo, pMat);
    scene.add(ptcls);

    // ── Interaction ──
    let targetRotY = -0.42,
      targetRotX = 0.09;
    let isDragging = false,
      lastX = 0,
      lastY = 0;

    window.addEventListener("mousemove", (e) => {
      const nx = e.clientX / W - 0.5;
      const ny = e.clientY / H - 0.5;
      mouseLight.position.set(nx * 10, -ny * 7, 4);

      if (isDragging) {
        targetRotY += (e.clientX - lastX) * 0.008;
        targetRotX += (e.clientY - lastY) * 0.006;
        targetRotX = Math.max(-0.75, Math.min(0.75, targetRotX));
        lastX = e.clientX;
        lastY = e.clientY;
      } else if (landingView.classList.contains("active")) {
        targetRotY = -0.42 + nx * 0.7;
        targetRotX = 0.09 - ny * 0.38;
      }
    });

    canvas.addEventListener("mousedown", (e) => {
      isDragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      canvas.style.cursor = "grabbing";
    });
    window.addEventListener("mouseup", () => {
      isDragging = false;
      canvas.style.cursor = "grab";
    });

    // Touch
    canvas.addEventListener("touchstart", (e) => {
      isDragging = true;
      lastX = e.touches[0].clientX;
      lastY = e.touches[0].clientY;
    });
    canvas.addEventListener(
      "touchmove",
      (e) => {
        e.preventDefault();
        targetRotY += (e.touches[0].clientX - lastX) * 0.008;
        targetRotX += (e.touches[0].clientY - lastY) * 0.006;
        targetRotX = Math.max(-0.75, Math.min(0.75, targetRotX));
        lastX = e.touches[0].clientX;
        lastY = e.touches[0].clientY;
      },
      { passive: false },
    );
    canvas.addEventListener("touchend", () => {
      isDragging = false;
    });

    window.addEventListener("resize", () => {
      W = window.innerWidth;
      H = window.innerHeight;
      camera.aspect = W / H;
      camera.updateProjectionMatrix();
      renderer.setSize(W, H);
    });

    // ── Animation loop ──
    let opening = false,
      openStart = null;

    function tick() {
      threeRaf = requestAnimationFrame(tick);
      const now = performance.now();

      if (opening) {
        if (!openStart) openStart = now;
        const t = Math.min((now - openStart) / 850, 1);
        const ease = 1 - Math.pow(1 - t, 3);
        book.rotation.y = targetRotY + ease * 2.6;
        book.scale.setScalar(1 + ease * 0.22);
        book.position.z = ease * 2.8;
        bookMats.forEach((m) => {
          m.transparent = true;
          m.opacity = 1 - ease * 0.96;
        });
        ptcls.material.opacity = 0.78 * (1 - ease);
        if (t >= 1) {
          opening = false;
          cancelAnimationFrame(threeRaf);
          onTransition();
          return;
        }
      } else {
        // Smooth follow rotation
        book.rotation.y += (targetRotY - book.rotation.y) * 0.055;
        book.rotation.x += (targetRotX - book.rotation.x) * 0.055;
        // Float bob
        book.position.y = 0.35 + Math.sin(now * 0.0009) * 0.09;
      }

      // Particle drift
      const pa = pGeo.attributes.position.array;
      for (let i = 0; i < N; i++) {
        pa[i * 3] += pVel[i].x;
        pa[i * 3 + 1] += pVel[i].y;
        if (pa[i * 3 + 1] < -7) {
          pa[i * 3 + 1] = 7;
          pa[i * 3] = (Math.random() - 0.5) * 18;
        }
      }
      pGeo.attributes.position.needsUpdate = true;

      renderer.render(scene, camera);
    }
    tick();

    return {
      openBook() {
        opening = true;
      },
    };
  }

  // ============================================================
  // SCRAPBOOK LOGIC
  // ============================================================
  async function initializeApp() {
    try {
      const response = await fetch("data/memories.json");
      memories = await response.json();
      if (memories.length > 0) {
        renderScrapbookPages();
        initBirthdayPage();
        updateScrapbookView();
      }
    } catch (error) {
      console.error("Could not load memories:", error);
    }
  }

  function renderScrapbookPages() {
    scrapbookContainer.innerHTML = "";
    const TAPES = ["wt-pink", "wt-blue", "wt-peach"];
    const DOODLES = ["✿ ⋆ ✦", "♡ ˚ ✧", "❀ · ☆", "◦ ♡ ◦", "✦ ✿ ✦", "˚ ⋆ ❀"];

    memories.forEach((memory, index) => {
      const page = document.createElement("div");
      page.className = "scrapbook-page";
      page.dataset.index = index;

      const tape = TAPES[index % TAPES.length];
      const doodle = DOODLES[index % DOODLES.length];
      const dateStr = memory.date
        ? new Date(memory.date + "T12:00:00").toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })
        : "";

      page.innerHTML = `
        <div class="page-left">
          <div class="photo-frame">
            <div class="washi-tape ${tape}"></div>
            <div class="corner-mount cm-tl"></div>
            <div class="corner-mount cm-tr"></div>
            <div class="corner-mount cm-bl"></div>
            <div class="corner-mount cm-br"></div>
            <img src="${memory.photo}" alt="Memory ${index + 1}" loading="lazy">
            ${dateStr ? `<div class="date-stamp">${dateStr}</div>` : ""}
          </div>
        </div>
        <div class="page-right">
          <p class="page-memory-label">Memory ${String(index + 1).padStart(2, "0")}</p>
          <p class="page-message-text">"${memory.message}"</p>
          ${
            memory.embedUrl
              ? `<div class="spotify-wrap"><span class="spotify-note">♪</span><iframe class="spotify-embed" src="${memory.embedUrl}" width="100%" height="80" frameborder="0" allowfullscreen allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe></div>`
              : memory.song
                ? `
          <a href="${memory.song.url}" target="_blank" rel="noopener noreferrer" class="page-song-tag">
            <span class="song-note">♪</span>
            <div class="song-info">
              <span class="song-title">${memory.song.title}</span>
              <span class="song-artist">${memory.song.artist}</span>
            </div>
          </a>`
                : ""
          }
          <div class="page-message-doodle">${doodle}</div>
        </div>
      `;

      scrapbookContainer.appendChild(page);
    });

    // Surprise button on last page
    const lastPage = scrapbookContainer.querySelector(
      `[data-index="${memories.length - 1}"]`,
    );
    if (lastPage) {
      const btn = document.createElement("button");
      btn.id = "open-wall-btn";
      btn.className = "cta-button";
      btn.textContent = "Open Surprise ✨";
      btn.style.cssText =
        "margin-top:0.6rem;font-size:1rem;padding:0.6rem 1.3rem;flex-shrink:0;";
      lastPage.querySelector(".page-right").appendChild(btn);
      btn.addEventListener("click", () => {
        playClick();
        showBirthdayPage();
      });
    }
  }

  function updatePageCounter() {
    pageCounter.textContent = `${currentPageIndex + 1} / ${memories.length}`;
    prevPageBtn.disabled = currentPageIndex === 0;
    nextPageBtn.disabled = currentPageIndex === memories.length - 1;
    // Update progress strip
    const fill = document.getElementById("progress-fill");
    if (fill && memories.length > 1) {
      fill.style.width = (currentPageIndex / (memories.length - 1)) * 100 + "%";
    }
  }

  // Photo tilt on mouse move (CSS 3D perspective)
  function setupPhotoTilt() {
    document.querySelectorAll(".page-left").forEach((side) => {
      const frame = side.querySelector(".photo-frame");
      if (!frame) return;
      side.addEventListener("mousemove", (e) => {
        const r = side.getBoundingClientRect();
        const x = ((e.clientX - r.left) / r.width - 0.5) * 2;
        const y = ((e.clientY - r.top) / r.height - 0.5) * 2;
        frame.style.transform = `perspective(600px) rotateY(${x * 8}deg) rotateX(${-y * 6}deg) scale(1.03)`;
      });
      side.addEventListener("mouseleave", () => {
        frame.style.transform = "";
      });
    });
  }

  function updateScrapbookView() {
    document.querySelectorAll(".scrapbook-page").forEach((page, index) => {
      page.classList.remove("flip-in", "flip-out");
      page.classList.toggle("active", index === currentPageIndex);
    });
    updatePageCounter();
  }

  function flipToPage(newIndex) {
    if (isFlipping) return;
    if (newIndex < 0 || newIndex >= memories.length) return;
    isFlipping = true;
    playPageTurn();

    const pages = document.querySelectorAll(".scrapbook-page");
    const outPage = pages[currentPageIndex];
    const inPage = pages[newIndex];

    outPage.classList.add("flip-out");

    setTimeout(() => {
      outPage.classList.remove("active", "flip-out");
      currentPageIndex = newIndex;
      inPage.classList.add("active", "flip-in");
      updatePageCounter();
      setTimeout(() => {
        inPage.classList.remove("flip-in");
        isFlipping = false;
      }, FLIP_MS);
    }, FLIP_MS);
  }

  function showNextPage() {
    if (currentPageIndex < memories.length - 1)
      flipToPage(currentPageIndex + 1);
  }

  function showPrevPage() {
    if (currentPageIndex > 0) flipToPage(currentPageIndex - 1);
  }

  function showScrapbook() {
    landingView.classList.remove("active");
    scrapbookView.classList.add("active");
    playClick();
    setupPhotoTilt();
  }

  // --- EVENT LISTENERS ---
  let threeScene = null;

  openScrapbookBtn.addEventListener("click", () => {
    playClick();
    if (threeScene) {
      // Animate book opening, then transition
      threeScene.openBook();
    } else {
      showScrapbook();
    }
  });
  nextPageBtn.addEventListener("click", showNextPage);
  prevPageBtn.addEventListener("click", showPrevPage);

  // Universe view buttons
  const universeBtn = document.getElementById("universe-btn");
  if (universeBtn) {
    universeBtn.addEventListener("click", () => {
      playClick();
      showUniverseView();
    });
  }
  if (universeBackBtn) {
    universeBackBtn.addEventListener("click", () => {
      playClick();
      hideUniverseView();
    });
  }

  document.addEventListener("keydown", (e) => {
    if (scrapbookView.classList.contains("active")) {
      if (e.key === "ArrowRight") showNextPage();
      if (e.key === "ArrowLeft") showPrevPage();
    }
  });

  // Touch swipe to flip pages
  let touchStartX = 0;
  let touchStartY = 0;
  scrapbookView.addEventListener(
    "touchstart",
    (e) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    },
    { passive: true },
  );
  scrapbookView.addEventListener(
    "touchend",
    (e) => {
      const dx = e.changedTouches[0].clientX - touchStartX;
      const dy = e.changedTouches[0].clientY - touchStartY;
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
        if (dx < 0) showNextPage();
        else showPrevPage();
      }
    },
    { passive: true },
  );

  // --- INIT ---
  initializeApp();

  // Start Three.js landing scene
  threeScene = initThreeLanding(() => {
    // Called when book-open animation finishes
    showScrapbook();
  });
});
