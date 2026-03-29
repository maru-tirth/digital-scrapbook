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

  // --- ELEMENTS ---
  const landingView = document.getElementById("landing-view");
  const scrapbookView = document.getElementById("scrapbook-view");
  const wallView = document.getElementById("wall-view");
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
    const Q  = 60 / BPM;       // quarter  ≈ 0.714 s
    const E  = Q / 2;           // eighth   ≈ 0.357 s
    const DQ = Q * 1.5;         // dot-qtr  ≈ 1.071 s
    const DH = Q * 3;           // dot-half ≈ 2.143 s

    // Frequencies (C major)
    const C4=262, D4=294, E4=330, F4=349, G4=392, A4=440, Bb4=466, C5=523, F3=175;

    // Score: [freq, duration]  — null = rest
    const score = [
      [C4, E], [C4, E], [D4, DQ], [C4, Q], [F4, DQ], [E4, DH], [null, Q],
      [C4, E], [C4, E], [D4, DQ], [C4, Q], [G4, DQ], [F4, DH], [null, Q],
      [C4, E], [C4, E], [C5, DQ], [A4, Q], [F4, Q], [E4, Q], [D4, DH], [null, Q],
      [Bb4, E], [Bb4, E], [A4, DQ], [F4, Q], [G4, DQ], [F4, DH],
    ];

    let t = 0;
    score.forEach(([freq, dur], idx) => {
      if (freq !== null) {
        // Melody — triangle for a warm, music-box feel
        tone(freq, dur * 0.88, "triangle", 0.28, t);
        // Octave doubling — gives body and richness
        tone(freq / 2, dur * 0.85, "sine", 0.10, t);
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

  function playSparkleChime() {
    const pool = [1319, 1568, 1760, 2093, 2349];
    tone(pool[Math.floor(Math.random() * pool.length)], 0.5, "triangle", 0.08);
  }

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
    "Happy Birthday, my little Snorlax 💤💖 Or should I say… Virshh 😏 Still can’t decide which one suits you more — the cute sleepy one or the one who secretly drives me crazy (okay fine… both). You’re honestly the perfect mix of adorable and irresistible… like how do you even do that? It’s unfair 😌 But don’t get too comfortable, okay? I’m still going to tease you nonstop — birthday privilege doesn’t save you from that 😈💞 Stay cute, stay mine, and have the happiest birthday, Virrshh 💖✨";

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
  // THREE.JS LANDING SCENE
  // ============================================================
  let threeRaf = null;

  function initThreeLanding(onTransition) {
    const canvas = document.getElementById("three-canvas");
    if (!canvas || typeof THREE === "undefined") { onTransition(); return; }

    let W = window.innerWidth, H = window.innerHeight;

    // ── Scene / Camera / Renderer ──
    const scene    = new THREE.Scene();
    const camera   = new THREE.PerspectiveCamera(38, W / H, 0.1, 100);
    camera.position.z = 6.5;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));

    // ── Canvas Textures ──
    function makeCoverTex() {
      const c = document.createElement("canvas");
      c.width = 512; c.height = 740;
      const g = c.getContext("2d");

      const bg = g.createLinearGradient(0, 0, 512, 740);
      bg.addColorStop(0,    "#ffd6e0");
      bg.addColorStop(0.45, "#f7c8d4");
      bg.addColorStop(1,    "#ffb997");
      g.fillStyle = bg; g.fillRect(0, 0, 512, 740);

      // ruled lines
      g.strokeStyle = "rgba(255,255,255,0.15)"; g.lineWidth = 1;
      for (let y = 28; y < 740; y += 28) { g.beginPath(); g.moveTo(0,y); g.lineTo(512,y); g.stroke(); }

      // corner brackets
      g.strokeStyle = "rgba(75,56,50,0.28)"; g.lineWidth = 3; g.lineCap = "square";
      [[32,32,1,1],[480,32,-1,1],[32,708,1,-1],[480,708,-1,-1]].forEach(([x,y,sx,sy]) => {
        g.beginPath(); g.moveTo(x+sx*26,y); g.lineTo(x,y); g.lineTo(x,y+sy*26); g.stroke();
      });

      // ornament
      g.fillStyle = "rgba(75,56,50,0.22)"; g.font = "52px serif";
      g.textAlign = "center"; g.fillText("❀  ✦  ❀", 256, 188);

      // title
      g.shadowColor = "rgba(0,0,0,0.08)"; g.shadowBlur = 4;
      g.fillStyle = "rgba(75,56,50,0.9)"; g.font = "bold 76px Georgia,serif";
      g.fillText("Our", 256, 315); g.fillText("Scrapbook", 256, 412);
      g.shadowBlur = 0;

      // rule
      g.strokeStyle = "rgba(75,56,50,0.22)"; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(150,448); g.lineTo(362,448); g.stroke();

      // subtitle
      g.fillStyle = "rgba(75,56,50,0.52)"; g.font = "26px Georgia,serif";
      g.fillText("memories & moments", 256, 494);

      // bottom deco
      g.fillStyle = "rgba(75,56,50,0.18)"; g.font = "34px serif";
      g.fillText("· · ·", 256, 670);

      return new THREE.CanvasTexture(c);
    }

    function makeSpineTex() {
      const c = document.createElement("canvas"); c.width = 64; c.height = 740;
      const g = c.getContext("2d");
      const grad = g.createLinearGradient(0,0,64,0);
      grad.addColorStop(0,"#c09aae"); grad.addColorStop(0.5,"#d4b4c4"); grad.addColorStop(1,"#e2c8d4");
      g.fillStyle = grad; g.fillRect(0,0,64,740);
      g.fillStyle = "rgba(0,0,0,0.1)"; g.fillRect(58,0,6,740);
      return new THREE.CanvasTexture(c);
    }

    function makePagesTex() {
      const c = document.createElement("canvas"); c.width = 64; c.height = 740;
      const g = c.getContext("2d");
      for (let y = 0; y < 740; y += 3) {
        g.fillStyle = y % 6 === 0 ? "#ede8e2" : "#faf6f2";
        g.fillRect(0, y, 64, 3);
      }
      return new THREE.CanvasTexture(c);
    }

    // ── Book Geometry ──
    const BW = 1.5, BH = 2.1, BD = 0.2;
    const bookGeo  = new THREE.BoxGeometry(BW, BH, BD);
    const bookMats = [
      new THREE.MeshPhongMaterial({ map: makePagesTex(), shininess: 18 }), // +x pages
      new THREE.MeshPhongMaterial({ map: makeSpineTex(), shininess: 14 }), // -x spine
      new THREE.MeshPhongMaterial({ color: 0xf0e0e8,    shininess: 10 }), // +y top
      new THREE.MeshPhongMaterial({ color: 0xe8d4dc,    shininess: 10 }), // -y bottom
      new THREE.MeshPhongMaterial({ map: makeCoverTex(),shininess: 35 }), // +z front
      new THREE.MeshPhongMaterial({ color: 0xd4a8bc,    shininess: 10 }), // -z back
    ];
    const book = new THREE.Mesh(bookGeo, bookMats);
    book.rotation.y = -0.42;
    book.rotation.x =  0.09;
    // Move book to upper half of screen so overlay text clears it
    book.position.y = 0.35;
    scene.add(book);

    // ── Lights ──
    scene.add(new THREE.AmbientLight(0xfff8f4, 0.55));
    const sun  = new THREE.DirectionalLight(0xffffff, 0.9);
    sun.position.set(3, 4, 6);  scene.add(sun);
    const pink = new THREE.PointLight(0xffd6e0, 0.7, 20);
    pink.position.set(-4, 3, 4); scene.add(pink);
    const warm = new THREE.PointLight(0xffb997, 0.45, 20);
    warm.position.set(4, -3, 2); scene.add(warm);
    // Moving point light that follows mouse
    const mouseLight = new THREE.PointLight(0xfff0f5, 0.55, 15);
    mouseLight.position.set(0, 0, 4); scene.add(mouseLight);

    // ── Particles ──
    const N = 300;
    const pPos = new Float32Array(N * 3);
    const pVel = [];
    for (let i = 0; i < N; i++) {
      pPos[i*3]   = (Math.random() - 0.5) * 18;
      pPos[i*3+1] = (Math.random() - 0.5) * 14;
      pPos[i*3+2] = (Math.random() - 0.5) * 6 - 1;
      pVel.push({ x: (Math.random()-0.5)*0.003, y: -(Math.random()*0.006+0.002) });
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
    const pMat = new THREE.PointsMaterial({ color: 0xffd6e0, size: 0.055, transparent: true, opacity: 0.78, sizeAttenuation: true });
    const ptcls = new THREE.Points(pGeo, pMat);
    scene.add(ptcls);

    // ── Interaction ──
    let targetRotY = -0.42, targetRotX = 0.09;
    let isDragging = false, lastX = 0, lastY = 0;

    window.addEventListener("mousemove", (e) => {
      const nx = e.clientX / W - 0.5;
      const ny = e.clientY / H - 0.5;
      mouseLight.position.set(nx * 10, -ny * 7, 4);

      if (isDragging) {
        targetRotY += (e.clientX - lastX) * 0.008;
        targetRotX += (e.clientY - lastY) * 0.006;
        targetRotX = Math.max(-0.75, Math.min(0.75, targetRotX));
        lastX = e.clientX; lastY = e.clientY;
      } else if (landingView.classList.contains("active")) {
        targetRotY = -0.42 + nx * 0.7;
        targetRotX =  0.09 - ny * 0.38;
      }
    });

    canvas.addEventListener("mousedown", (e) => { isDragging = true; lastX = e.clientX; lastY = e.clientY; canvas.style.cursor = "grabbing"; });
    window.addEventListener("mouseup",   ()  => { isDragging = false; canvas.style.cursor = "grab"; });

    // Touch
    canvas.addEventListener("touchstart", (e) => { isDragging=true; lastX=e.touches[0].clientX; lastY=e.touches[0].clientY; });
    canvas.addEventListener("touchmove",  (e) => {
      e.preventDefault();
      targetRotY += (e.touches[0].clientX - lastX) * 0.008;
      targetRotX += (e.touches[0].clientY - lastY) * 0.006;
      targetRotX = Math.max(-0.75, Math.min(0.75, targetRotX));
      lastX = e.touches[0].clientX; lastY = e.touches[0].clientY;
    }, { passive: false });
    canvas.addEventListener("touchend", () => { isDragging = false; });

    window.addEventListener("resize", () => {
      W = window.innerWidth; H = window.innerHeight;
      camera.aspect = W / H; camera.updateProjectionMatrix();
      renderer.setSize(W, H);
    });

    // ── Animation loop ──
    let opening = false, openStart = null;

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
        bookMats.forEach(m => { m.transparent = true; m.opacity = 1 - ease * 0.96; });
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
        pa[i*3]   += pVel[i].x;
        pa[i*3+1] += pVel[i].y;
        if (pa[i*3+1] < -7) { pa[i*3+1] = 7; pa[i*3] = (Math.random()-0.5)*18; }
      }
      pGeo.attributes.position.needsUpdate = true;

      renderer.render(scene, camera);
    }
    tick();

    return { openBook() { opening = true; } };
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
    const TAPES   = ["wt-pink", "wt-blue", "wt-peach"];
    const DOODLES = ["✿ ⋆ ✦", "♡ ˚ ✧", "❀ · ☆", "◦ ♡ ◦", "✦ ✿ ✦", "˚ ⋆ ❀"];

    memories.forEach((memory, index) => {
      const page = document.createElement("div");
      page.className = "scrapbook-page";
      page.dataset.index = index;

      const tape   = TAPES[index % TAPES.length];
      const doodle = DOODLES[index % DOODLES.length];
      const dateStr = memory.date
        ? new Date(memory.date + "T12:00:00").toLocaleDateString("en-US", {
            month: "short", day: "numeric", year: "numeric",
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
          ${memory.song ? `
          <a href="${memory.song.url}" target="_blank" rel="noopener noreferrer" class="page-song-tag">
            <span class="song-note">♪</span>
            <div class="song-info">
              <span class="song-title">${memory.song.title}</span>
              <span class="song-artist">${memory.song.artist}</span>
            </div>
          </a>` : ""}
          <div class="page-message-doodle">${doodle}</div>
        </div>
      `;

      scrapbookContainer.appendChild(page);
    });

    // Surprise button on last page
    const lastPage = scrapbookContainer.querySelector(
      `[data-index="${memories.length - 1}"]`
    );
    if (lastPage) {
      const btn = document.createElement("button");
      btn.id        = "open-wall-btn";
      btn.className = "cta-button";
      btn.textContent = "Open Surprise ✨";
      btn.style.cssText = "margin-top:1rem;font-size:1rem;padding:0.6rem 1.3rem;";
      lastPage.querySelector(".page-right").appendChild(btn);
      btn.addEventListener("click", () => { playClick(); showBirthdayPage(); });
    }
  }

  function updatePageCounter() {
    pageCounter.textContent = `${currentPageIndex + 1} / ${memories.length}`;
    prevPageBtn.disabled = currentPageIndex === 0;
    nextPageBtn.disabled = currentPageIndex === memories.length - 1;
    // Update progress strip
    const fill = document.getElementById("progress-fill");
    if (fill && memories.length > 1) {
      fill.style.width = (currentPageIndex / (memories.length - 1) * 100) + "%";
    }
  }

  // Photo tilt on mouse move (CSS 3D perspective)
  function setupPhotoTilt() {
    document.querySelectorAll(".page-left").forEach(side => {
      const frame = side.querySelector(".photo-frame");
      if (!frame) return;
      side.addEventListener("mousemove", (e) => {
        const r = side.getBoundingClientRect();
        const x = ((e.clientX - r.left) / r.width  - 0.5) * 2;
        const y = ((e.clientY - r.top)  / r.height - 0.5) * 2;
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

    const pages  = document.querySelectorAll(".scrapbook-page");
    const outPage = pages[currentPageIndex];
    const inPage  = pages[newIndex];

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
    if (currentPageIndex < memories.length - 1) flipToPage(currentPageIndex + 1);
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

  document.addEventListener("keydown", (e) => {
    if (scrapbookView.classList.contains("active")) {
      if (e.key === "ArrowRight") showNextPage();
      if (e.key === "ArrowLeft") showPrevPage();
    }
  });

  // --- INIT ---
  initializeApp();

  // Start Three.js landing scene
  threeScene = initThreeLanding(() => {
    // Called when book-open animation finishes
    showScrapbook();
  });
});
