// The animated sky: drifting clouds, sun, moon, stars, rain, snow, fog and lightning.
// Everything is drawn on one canvas and fades smoothly between weather types.

export function createScene(canvas) {
  const ctx = canvas.getContext("2d");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  let W = window.innerWidth;
  let H = window.innerHeight;

  // Current values glide towards the target values
  const cur = { clouds: 0, dark: 0, rain: 0, snow: 0, storm: 0, stars: 0, sun: 0, moon: 0, fog: 0, wind: 0.35 };
  const target = { ...cur, clouds: 4, sun: 1 };

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener("resize", resize);
  resize();

  /* ---------- Clouds (soft puffs drawn once, then slid across the sky) ---------- */
  function makeSprite(w, h, puffs, rgb) {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const g = c.getContext("2d");
    for (const p of puffs) {
      const grad = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
      grad.addColorStop(0, `rgba(${rgb},0.9)`);
      grad.addColorStop(0.55, `rgba(${rgb},0.5)`);
      grad.addColorStop(1, `rgba(${rgb},0)`);
      g.fillStyle = grad;
      g.beginPath();
      g.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      g.fill();
    }
    return c;
  }

  const CLOUD_COUNT = 18;
  const ranks = [...Array(CLOUD_COUNT).keys()].sort(() => Math.random() - 0.5);
  const clouds = ranks
    .map((rank) => {
      const depth = Math.random(); // 0 = far away, 1 = close
      const w = Math.round(240 + depth * 340);
      const h = Math.round(w * 0.46);
      const puffs = [];
      for (let k = 0; k < 9; k++) {
        const x = w * (0.16 + Math.random() * 0.68);
        const mid = 1 - Math.abs(x / w - 0.5) * 2;
        const r = h * (0.2 + mid * 0.2 * Math.random() + Math.random() * 0.08);
        const y = h * 0.68 - mid * h * 0.26 * (0.5 + Math.random() * 0.5);
        puffs.push({ x, y, r });
      }
      return {
        rank,
        depth,
        w,
        h,
        light: makeSprite(w, h, puffs, "255,255,255"),
        dark: makeSprite(w, h, puffs, "58,78,115"),
        x: rnd(-w, W),
        y: rnd(0.02, 0.5) * H,
        speed: 6 + depth * 20,
        alpha: 0.4 + depth * 0.5,
        presence: 0
      };
    })
    .sort((a, b) => a.depth - b.depth);

  function drawClouds(dt, k) {
    for (const c of clouds) {
      c.presence += (clamp(cur.clouds - c.rank, 0, 1) - c.presence) * k;
      if (!reduce) c.x += c.speed * (0.6 + cur.wind) * dt;
      if (c.x > W + 40) {
        c.x = -c.w - 40;
        c.y = rnd(0.02, 0.5) * H;
      }
      const a = c.presence * c.alpha;
      if (a < 0.01) continue;
      ctx.globalAlpha = a * (1 - cur.dark);
      ctx.drawImage(c.light, c.x, c.y);
      ctx.globalAlpha = a * cur.dark;
      ctx.drawImage(c.dark, c.x, c.y);
    }
    ctx.globalAlpha = 1;
  }

  /* ---------- Sun, moon and stars ---------- */
  function drawSun(t) {
    if (cur.sun < 0.01) return;
    const cx = W * 0.78;
    const cy = H * 0.17 + Math.sin(t * 0.2) * 3;
    const R = Math.min(W, H) * 0.5;
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
    glow.addColorStop(0, `rgba(255,248,214,${0.75 * cur.sun})`);
    glow.addColorStop(0.18, `rgba(255,236,170,${0.35 * cur.sun})`);
    glow.addColorStop(1, "rgba(255,236,170,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(cx - R, cy - R, R * 2, R * 2);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(t * 0.03);
    ctx.globalAlpha = 0.1 * cur.sun;
    ctx.fillStyle = "#fff7d6";
    for (let i = 0; i < 14; i++) {
      ctx.rotate((Math.PI * 2) / 14);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(R * 0.9, -R * 0.035);
      ctx.lineTo(R * 0.9, R * 0.035);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    const pulse = 1 + Math.sin(t * 1.2) * 0.03;
    ctx.fillStyle = `rgba(255,252,236,${0.95 * cur.sun})`;
    ctx.beginPath();
    ctx.arc(cx, cy, 44 * pulse, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawMoon() {
    if (cur.moon < 0.01) return;
    const cx = W * 0.8;
    const cy = H * 0.18;
    const R = Math.min(W, H) * 0.3;
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
    glow.addColorStop(0, `rgba(190,215,255,${0.45 * cur.moon})`);
    glow.addColorStop(1, "rgba(190,215,255,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
    ctx.fillStyle = `rgba(236,243,255,${0.95 * cur.moon})`;
    ctx.beginPath();
    ctx.arc(cx, cy, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(170,190,225,${0.35 * cur.moon})`;
    [[-10, -6, 7], [8, 8, 5], [6, -12, 4]].forEach(([dx, dy, r]) => {
      ctx.beginPath();
      ctx.arc(cx + dx, cy + dy, r, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  const stars = Array.from({ length: 150 }, () => ({
    x: Math.random(),
    y: Math.random() * 0.65,
    r: rnd(0.5, 1.7),
    phase: rnd(0, 6.28),
    speed: rnd(0.6, 2)
  }));

  function drawStars(t) {
    if (cur.stars < 0.01) return;
    ctx.fillStyle = "#fff";
    for (const s of stars) {
      ctx.globalAlpha = cur.stars * (0.3 + 0.7 * (0.5 + 0.5 * Math.sin(t * s.speed + s.phase)));
      ctx.beginPath();
      ctx.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  /* ---------- Fog ---------- */
  const fogBlobs = Array.from({ length: 6 }, (_, i) => ({
    x: rnd(0, 1) * W,
    y: H * (0.5 + i * 0.09),
    w: rnd(300, 560),
    speed: rnd(6, 16)
  }));

  function drawFog(dt) {
    if (cur.fog < 0.01) return;
    for (const b of fogBlobs) {
      if (!reduce) b.x += b.speed * dt;
      if (b.x - b.w > W) b.x = -b.w;
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.scale(1, 0.22);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, b.w);
      g.addColorStop(0, `rgba(235,243,255,${0.35 * cur.fog})`);
      g.addColorStop(1, "rgba(235,243,255,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, b.w, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  /* ---------- Rain with splashes ---------- */
  const DROPS = 440;
  function spawnDrop(drop, initial) {
    drop.layer = Math.random();
    drop.len = 12 + drop.layer * 24;
    drop.speed = 650 + drop.layer * 650;
    drop.x = rnd(-220, W + 100);
    drop.y = initial ? rnd(-H, H) : rnd(-80, -10);
    drop.land = H * (0.58 + drop.layer * 0.42);
    return drop;
  }
  const drops = Array.from({ length: DROPS }, () => spawnDrop({}, true));
  const splashes = [];

  function drawRain(dt) {
    const n = Math.floor(cur.rain * DROPS);
    const slant = 0.18 + cur.wind * 0.22;
    for (let i = 0; i < n; i++) {
      const d = drops[i];
      d.y += d.speed * dt;
      d.x += d.speed * slant * dt;
      if (d.y > d.land) {
        if (d.layer > 0.35 && splashes.length < 90) {
          splashes.push({ x: d.x, y: d.land, age: 0, max: 4 + d.layer * 9 });
        }
        spawnDrop(d, false);
      }
    }
    if (n > 0) {
      ctx.lineCap = "round";
      for (let pass = 0; pass < 2; pass++) {
        ctx.beginPath();
        for (let i = 0; i < n; i++) {
          const d = drops[i];
          if (d.layer > 0.55 !== (pass === 1)) continue;
          ctx.moveTo(d.x, d.y);
          ctx.lineTo(d.x - slant * d.len, d.y - d.len);
        }
        ctx.lineWidth = pass ? 1.6 : 1;
        ctx.strokeStyle = pass ? "rgba(210,230,255,0.55)" : "rgba(210,230,255,0.28)";
        ctx.stroke();
      }
    }
    // splashes
    ctx.lineWidth = 1;
    for (let i = splashes.length - 1; i >= 0; i--) {
      const s = splashes[i];
      s.age += dt * 3.2;
      if (s.age >= 1) {
        splashes.splice(i, 1);
        continue;
      }
      const r = s.age * s.max;
      ctx.strokeStyle = `rgba(220,236,255,${0.5 * (1 - s.age)})`;
      ctx.beginPath();
      ctx.ellipse(s.x, s.y, r, r * 0.3, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  /* ---------- Snow ---------- */
  const FLAKES = 240;
  function spawnFlake(f, initial) {
    f.layer = Math.random();
    f.r = 1.2 + f.layer * 3;
    f.speed = 22 + f.layer * 50;
    f.sway = rnd(0.5, 1.6);
    f.phase = rnd(0, 6.28);
    f.x = rnd(0, W);
    f.y = initial ? rnd(-20, H) : -10;
    return f;
  }
  const flakes = Array.from({ length: FLAKES }, () => spawnFlake({}, true));

  function drawSnow(dt, t) {
    const n = Math.floor(cur.snow * FLAKES);
    if (n < 1) return;
    for (let i = 0; i < n; i++) {
      const f = flakes[i];
      f.y += f.speed * dt;
      f.x += (Math.sin(t * f.sway + f.phase) * 22 + cur.wind * 14) * dt;
      if (f.y > H + 10) spawnFlake(f, false);
      if (f.x > W + 10) f.x = -10;
      if (f.x < -10) f.x = W + 10;
      ctx.fillStyle = `rgba(255,255,255,${0.5 + f.layer * 0.45})`;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /* ---------- Lightning ---------- */
  let flash = 0;
  let again = false;
  let bolt = null;
  let nextBolt = 2.5;

  function strike() {
    flash = 1;
    again = Math.random() < 0.6;
    let x = rnd(0.15, 0.85) * W;
    let y = 0;
    const end = H * rnd(0.4, 0.65);
    const pts = [[x, y]];
    while (y < end) {
      y += rnd(18, 46);
      x += rnd(-28, 28);
      pts.push([x, y]);
    }
    bolt = pts;
  }

  function drawLightning(dt) {
    if (cur.storm > 0.5 && !reduce) {
      nextBolt -= dt;
      if (nextBolt <= 0) {
        strike();
        nextBolt = rnd(3, 8);
      }
    }
    if (again && flash < 0.35) {
      flash = 0.85;
      again = false;
    }
    if (flash > 0.01) {
      ctx.fillStyle = `rgba(215,232,255,${flash * 0.32})`;
      ctx.fillRect(0, 0, W, H);
      if (bolt) {
        ctx.save();
        ctx.strokeStyle = `rgba(240,246,255,${Math.min(1, flash * 1.2)})`;
        ctx.lineWidth = 2.4;
        ctx.lineJoin = "round";
        ctx.shadowColor = "rgba(170,205,255,0.9)";
        ctx.shadowBlur = 18;
        ctx.beginPath();
        bolt.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        ctx.stroke();
        ctx.restore();
      }
      flash *= Math.exp(-dt * 7);
    }
  }

  /* ---------- Main loop ---------- */
  let last = performance.now();
  let time = 0;

  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    time += dt;
    const k = 1 - Math.exp(-dt * 1.6);
    for (const key in cur) cur[key] += (target[key] - cur[key]) * k;

    ctx.clearRect(0, 0, W, H);
    drawStars(time);
    drawSun(time);
    drawMoon();
    drawFog(dt);
    drawClouds(dt, k);
    drawRain(dt);
    drawSnow(dt, time);
    drawLightning(dt);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  return {
    // Change the target weather. The scene fades there smoothly.
    set(values) {
      Object.assign(target, values);
      if (reduce) {
        target.rain = 0;
        target.snow = 0;
        target.storm = 0;
      }
    }
  };
}
