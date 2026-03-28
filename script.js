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

  // --- ELEMENTS ---
  const landingView      = document.getElementById("landing-view");
  const scrapbookView    = document.getElementById("scrapbook-view");
  const wallView         = document.getElementById("wall-view");
  const openScrapbookBtn = document.getElementById("open-scrapbook-btn");
  const scrapbookContainer = document.getElementById("scrapbook-container");
  const prevPageBtn      = document.getElementById("prev-page-btn");
  const nextPageBtn      = document.getElementById("next-page-btn");
  const pageCounter      = document.getElementById("page-counter");

  // ============================================================
  // SOUND SYSTEM (Web Audio API — no files needed)
  // ============================================================
  function getCtx() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
  }

  function tone(freq, dur, type = "sine", vol = 0.25, delay = 0) {
    try {
      const ctx = getCtx();
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
      gain.gain.setValueAtTime(0, ctx.currentTime + delay);
      gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + delay + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + dur);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + dur);
    } catch (_) {}
  }

  function noise(dur, cutoff = 600, vol = 0.3, delay = 0) {
    try {
      const ctx    = getCtx();
      const size   = ctx.sampleRate * dur;
      const buf    = ctx.createBuffer(1, size, ctx.sampleRate);
      const data   = buf.getChannelData(0);
      for (let i = 0; i < size; i++) data[i] = Math.random() * 2 - 1;
      const src    = ctx.createBufferSource();
      src.buffer   = buf;
      const filt   = ctx.createBiquadFilter();
      filt.type    = "lowpass";
      filt.frequency.value = cutoff;
      const gain   = ctx.createGain();
      gain.gain.setValueAtTime(vol, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + dur);
      src.connect(filt); filt.connect(gain); gain.connect(ctx.destination);
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
    // Happy Birthday to You — first line
    const n = [
      [262, 0],   [262, 0.32], [294, 0.48], [262, 0.90],
      [349, 1.30],[330, 1.70], [262, 2.50], [262, 2.82],
      [294, 2.98],[262, 3.40], [392, 3.80], [349, 4.20],
    ];
    n.forEach(([f, t]) => tone(f, 0.38, "triangle", 0.22, t));
    // Harmony layer
    const h = [
      [330, 0], [330, 0.32],[349, 0.48],[330, 0.90],
      [440, 1.30],[415,1.70],
    ];
    h.forEach(([f, t]) => tone(f, 0.38, "sine", 0.08, t));
  }

  function playCandleBlow() {
    noise(0.32, 350, 0.4);
    tone(200, 0.2, "sine", 0.08, 0.05);
  }

  function playCelebration() {
    [262,330,392,523,659,784,1047].forEach((f, i) =>
      tone(f, 0.45, "triangle", 0.28, i * 0.11)
    );
    setTimeout(() => {
      [1047,1175,1319,1568,2093].forEach((f, i) =>
        tone(f, 0.3, "sine", 0.18, i * 0.09)
      );
    }, 900);
  }

  function playBalloonPop() {
    noise(0.12, 2000, 0.7);
    tone(180, 0.1, "sawtooth", 0.3, 0.02);
  }

  function playWishSound() {
    [523,659,784,1047,1319,1568,2093].forEach((f, i) =>
      tone(f, 0.55, "triangle", 0.2, i * 0.07)
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
  const COLORS = ["#ffd6e0","#ffb997","#a7bed3","#ffffff","#ffe066","#ff6b9d","#c3f0ca"];

  function resizeCanvas() {
    confettiCanvas.width  = window.innerWidth;
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
    for (let i = 0; i < count; i++) confettiParticles.push(mkParticle(x, y, true));
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
      p => p.opacity > 0.02 && p.y < confettiCanvas.height + 20
    );

    confettiParticles.forEach(p => {
      p.x   += p.vx;
      p.y   += p.vy;
      p.vy  += p.g;
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
    "Wishing you a day as magical as you are! 🌟 May this year bring you endless joy, laughter, and all the love you deserve. Here's to you! 🎉";

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

  function showBirthdayPage() {
    scrapbookView.classList.remove("active");
    wallView.classList.add("active");

    // Reset state for this visit
    candlesBlown = 0;
    confettiParticles = [];
    confettiActive = false;
    confettiRafId = null;

    // Reset candles
    document.querySelectorAll(".candle").forEach(c => c.classList.remove("blown"));

    // Reset typewriter
    const tw = document.getElementById("birthday-typewriter");
    if (tw) tw.textContent = "";

    // Reset wish button
    const wb = document.getElementById("wish-btn");
    if (wb) { wb.textContent = "Make a Wish! ✨"; wb.disabled = false; }

    // Reset hint
    const hint = document.getElementById("blow-hint");
    if (hint) hint.textContent = "Click the candles to blow them out! 🌬️";

    setTimeout(playBirthdayFanfare, 300);
    setTimeout(startRainConfetti, 700);
    setTimeout(startTypewriter, 1800);
    startSparkles();
    startChimes();
  }

  function buildCandles() {
    const row = document.getElementById("candles-row");
    if (!row || row.children.length > 0) return;
    const colors = [
      "var(--accent-1)", "var(--accent-2)", "var(--accent-3)",
      "var(--accent-2)", "var(--accent-1)",
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
      hint.textContent = "🎉 You made a wish! 🎉";
      hint.style.animation = "none";
      hint.style.opacity   = "1";
    }

    const cake = document.getElementById("birthday-cake");
    if (cake) cake.style.animation = "cakeShake 0.6s ease-in-out, cakeAppear 0s";
  }

  function setupBalloons() {
    document.querySelectorAll(".balloon").forEach(b => {
      b.addEventListener("click", e => {
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
      s.style.left     = Math.random() * 98 + "vw";
      s.style.top      = Math.random() * 95 + "vh";
      s.style.fontSize = (Math.random() * 1.4 + 0.7) + "rem";
      const dur = Math.random() * 3 + 2.5;
      s.style.animationDuration = dur + "s";
      s.style.animationDelay   = (Math.random() * 1.5) + "s";
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
    memories.forEach((memory, index) => {
      const page = document.createElement("div");
      page.className = "scrapbook-page";
      page.dataset.index = index;

      const photoSide   = `<div class="page-photo"><img src="${memory.photo}" alt="Memory ${index + 1}" loading="lazy"></div>`;
      const messageSide = `<div class="page-message"><p>"${memory.message}"</p></div>`;

      page.innerHTML = index % 2 === 0 ? photoSide + messageSide : messageSide + photoSide;
      scrapbookContainer.appendChild(page);
    });

    const lastPage = scrapbookContainer.querySelector(`[data-index="${memories.length - 1}"]`);
    if (lastPage) {
      const btn = document.createElement("button");
      btn.id        = "open-wall-btn";
      btn.className = "cta-button";
      btn.textContent = "Open Surprise Wall ✨";
      btn.style.marginTop = "2rem";
      lastPage.querySelector(".page-message").appendChild(btn);
      btn.addEventListener("click", () => {
        playClick();
        showBirthdayPage();
      });
    }
  }

  function updateScrapbookView() {
    document.querySelectorAll(".scrapbook-page").forEach((page, index) => {
      page.classList.toggle("active", index === currentPageIndex);
    });
    pageCounter.textContent = `${currentPageIndex + 1} / ${memories.length}`;
    prevPageBtn.disabled = currentPageIndex === 0;
    nextPageBtn.disabled = currentPageIndex === memories.length - 1;
  }

  function showNextPage() {
    if (currentPageIndex < memories.length - 1) {
      currentPageIndex++;
      updateScrapbookView();
      playPageTurn();
    }
  }

  function showPrevPage() {
    if (currentPageIndex > 0) {
      currentPageIndex--;
      updateScrapbookView();
      playPageTurn();
    }
  }

  function showScrapbook() {
    landingView.classList.remove("active");
    scrapbookView.classList.add("active");
    playClick();
  }

  // --- EVENT LISTENERS ---
  openScrapbookBtn.addEventListener("click", showScrapbook);
  nextPageBtn.addEventListener("click", showNextPage);
  prevPageBtn.addEventListener("click", showPrevPage);

  document.addEventListener("keydown", e => {
    if (scrapbookView.classList.contains("active")) {
      if (e.key === "ArrowRight") showNextPage();
      if (e.key === "ArrowLeft")  showPrevPage();
    }
  });

  // --- INIT ---
  initializeApp();
});
