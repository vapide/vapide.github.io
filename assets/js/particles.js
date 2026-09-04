/*
 * Hero background: a drifting network of points, nudged by the cursor.
 * The link pass is O(n^2), which is why the particle count is capped.
 * Tuning comes from `particles:` in _config.yml, via data attributes.
 */
(function () {
  "use strict";

  var canvas = document.getElementById("particle-canvas");
  if (!canvas || !canvas.getContext) return;

  var ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) return;

  var num = function (name, fallback) {
    var value = parseFloat(canvas.dataset[name]);
    return isFinite(value) && value > 0 ? value : fallback;
  };

  var DENSITY = num("density", 15000);
  var MAX_COUNT = num("max", 110);
  var LINK_DIST = num("link", 140);
  var CURSOR_DIST = num("cursor", 130);

  var ACCENT = "139,124,246";
  var NEUTRAL = "196,196,212";
  var LINE = "168,168,192";
  var DRIFT = 0.11; // px per frame at 60fps
  var CURSOR_PUSH = 0.55;
  var RETURN = 0.012; // pull back toward the drift path after a nudge

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var coarse = window.matchMedia("(hover: none), (pointer: coarse)");

  var particles = [];
  var width = 0;
  var height = 0;
  var dpr = 1;
  var raf = 0;
  var running = false;
  var onScreen = true;
  var pointer = { x: -9999, y: -9999, active: false };
  var lastFrame = 0;

  function isStatic() {
    return reduceMotion.matches || coarse.matches || window.innerWidth < 640;
  }

  function rand(lo, hi) {
    return lo + Math.random() * (hi - lo);
  }

  function build() {
    var area = width * height;
    var target = Math.round(area / DENSITY);
    var count = Math.max(18, Math.min(MAX_COUNT, target));
    if (isStatic()) count = Math.round(count * 0.75);

    particles = [];
    for (var i = 0; i < count; i++) {
      var angle = Math.random() * Math.PI * 2;
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: Math.cos(angle) * DRIFT * rand(0.4, 1.4),
        vy: Math.sin(angle) * DRIFT * rand(0.4, 1.4),
        ox: 0, // cursor displacement, eased back to zero
        oy: 0,
        r: rand(0.8, 1.9),
        // A violet minority, so the accent reads as a highlight in the field
        // rather than tinting the whole hero.
        accent: Math.random() < 0.28,
        a: rand(0.3, 0.72)
      });
    }
  }

  function resize() {
    var rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    width = rect.width;
    height = rect.height;
    dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    build();
  }

  function step(dt) {
    var linkSq = LINK_DIST * LINK_DIST;
    var cursorSq = CURSOR_DIST * CURSOR_DIST;

    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];

      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // Wrap rather than bounce: bouncing makes the edges visible.
      if (p.x < -20) p.x = width + 20;
      else if (p.x > width + 20) p.x = -20;
      if (p.y < -20) p.y = height + 20;
      else if (p.y > height + 20) p.y = -20;

      if (pointer.active) {
        var dx = p.x + p.ox - pointer.x;
        var dy = p.y + p.oy - pointer.y;
        var d2 = dx * dx + dy * dy;
        if (d2 < cursorSq && d2 > 0.01) {
          var d = Math.sqrt(d2);
          var force = (1 - d / CURSOR_DIST) * CURSOR_PUSH * dt;
          p.ox += (dx / d) * force;
          p.oy += (dy / d) * force;
        }
      }

      p.ox -= p.ox * RETURN * dt;
      p.oy -= p.oy * RETURN * dt;
    }

    return linkSq;
  }

  function draw(linkSq) {
    ctx.clearRect(0, 0, width, height);

    var i;
    var j;

    // Links first, so the dots sit on top of them.
    ctx.lineWidth = 1;
    for (i = 0; i < particles.length; i++) {
      var a = particles[i];
      var ax = a.x + a.ox;
      var ay = a.y + a.oy;

      for (j = i + 1; j < particles.length; j++) {
        var b = particles[j];
        var bx = b.x + b.ox;
        var by = b.y + b.oy;
        var dx = ax - bx;
        var dy = ay - by;
        var d2 = dx * dx + dy * dy;
        if (d2 > linkSq) continue;

        var t = 1 - Math.sqrt(d2) / LINK_DIST;
        ctx.strokeStyle = "rgba(" + LINE + "," + (t * t * 0.2).toFixed(3) + ")";
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
        ctx.stroke();
      }
    }

    for (i = 0; i < particles.length; i++) {
      var p = particles[i];
      ctx.fillStyle =
        "rgba(" +
        (p.accent ? ACCENT : NEUTRAL) +
        "," +
        (p.a * (p.accent ? 1 : 0.72)).toFixed(3) +
        ")";
      ctx.beginPath();
      ctx.arc(p.x + p.ox, p.y + p.oy, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function frame(now) {
    if (!running) return;

    // Normalise to 60fps units and clamp so a backgrounded tab does not
    // teleport every particle on the next frame.
    var dt = lastFrame ? Math.min((now - lastFrame) / 16.67, 3) : 1;
    lastFrame = now;

    draw(step(dt));
    raf = window.requestAnimationFrame(frame);
  }

  function start() {
    if (running || isStatic() || !onScreen || document.hidden) return;
    running = true;
    lastFrame = 0;
    raf = window.requestAnimationFrame(frame);
  }

  function stop() {
    running = false;
    if (raf) window.cancelAnimationFrame(raf);
    raf = 0;
  }

  function renderOnce() {
    if (!width || !height) return;
    var linkSq = LINK_DIST * LINK_DIST;
    draw(linkSq);
  }

  function refresh() {
    stop();
    resize();
    if (isStatic()) renderOnce();
    else start();
  }

  var resizeTimer = 0;
  window.addEventListener(
    "resize",
    function () {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(refresh, 180);
    },
    { passive: true }
  );

  window.addEventListener(
    "pointermove",
    function (event) {
      if (isStatic()) return;
      var rect = canvas.getBoundingClientRect();
      var x = event.clientX - rect.left;
      var y = event.clientY - rect.top;
      pointer.active =
        x >= -40 && y >= -40 && x <= rect.width + 40 && y <= rect.height + 40;
      pointer.x = x;
      pointer.y = y;
    },
    { passive: true }
  );

  window.addEventListener(
    "pointerleave",
    function () {
      pointer.active = false;
    },
    { passive: true }
  );

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) stop();
    else if (!isStatic() && onScreen) start();
  });

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(
      function (entries) {
        onScreen = entries[0].isIntersecting;
        if (onScreen) {
          if (!isStatic()) start();
        } else {
          stop();
        }
      },
      { threshold: 0 }
    ).observe(canvas);
  }

  // Safari only picked up addEventListener on MediaQueryList in 14.
  var onPrefChange = function () {
    refresh();
  };
  if (reduceMotion.addEventListener) {
    reduceMotion.addEventListener("change", onPrefChange);
    coarse.addEventListener("change", onPrefChange);
  } else if (reduceMotion.addListener) {
    reduceMotion.addListener(onPrefChange);
    coarse.addListener(onPrefChange);
  }

  refresh();
})();
