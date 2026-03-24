/* ============================================
   LinguaQuest — FX System
   Confetti · Particles · Visual Effects
   ============================================ */

/* ── CONFETTI ── */
(function() {
  const COLORS = ['#58cc02','#1cb0f6','#ff9600','#ff4b4b','#ce82ff','#ffc800','#ffffff'];

  window.launchConfetti = function(count) {
    const canvas = document.getElementById('confetti-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;

    const total = count || 80;
    const particles = [];

    for (let i = 0; i < total; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: -10 - Math.random() * 80,
        r: Math.random() * 6 + 3,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        vx: (Math.random() - 0.5) * 5,
        vy: Math.random() * 4 + 3,
        va: (Math.random() - 0.5) * 0.3,
        angle: Math.random() * Math.PI * 2,
        shape: Math.random() > 0.5 ? 'rect' : 'circle',
        life: 1,
        decay: Math.random() * 0.012 + 0.008
      });
    }

    let running = true;
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;
      particles.forEach(p => {
        if (p.life <= 0) return;
        alive = true;
        p.x    += p.vx;
        p.y    += p.vy;
        p.vy   += 0.12; // gravity
        p.angle += p.va;
        p.life -= p.decay;
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        if (p.shape === 'rect') {
          ctx.fillRect(-p.r, -p.r / 2, p.r * 2, p.r);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.r / 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });
      if (alive && running) requestAnimationFrame(draw);
      else ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    running = true;
    draw();
    setTimeout(() => { running = false; }, 2200);
  };
})();
