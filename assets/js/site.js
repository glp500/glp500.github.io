document.documentElement.classList.add("js");

const navToggle = document.querySelector("[data-nav-toggle]");
const siteNav = document.querySelector("[data-site-nav]");
const siteHeader = document.querySelector(".site-header");

if (navToggle && siteNav) {
  const closeMenu = () => {
    navToggle.setAttribute("aria-expanded", "false");
    siteNav.classList.remove("is-open");
  };

  navToggle.addEventListener("click", () => {
    const isOpen = navToggle.getAttribute("aria-expanded") === "true";
    navToggle.setAttribute("aria-expanded", String(!isOpen));
    siteNav.classList.toggle("is-open", !isOpen);
  });

  siteNav.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));
  window.addEventListener("resize", () => {
    if (window.innerWidth > 1040) closeMenu();
  });
}

if (siteHeader) {
  const updateHeader = () => siteHeader.classList.toggle("is-sticky", window.scrollY > 120);
  updateHeader();
  window.addEventListener("scroll", updateHeader, { passive: true });
}

const revealItems = document.querySelectorAll(".reveal");
if ("IntersectionObserver" in window && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08, rootMargin: "0px 0px -40px" });

  revealItems.forEach((item) => observer.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add("is-visible"));
}

class FlockField {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: true });
    this.options = {
      count: options.count || 86,
      groups: options.groups || 4,
      graph: options.graph !== false,
      interactive: options.interactive !== false,
      compact: options.compact || false
    };
    this.boids = [];
    this.width = 0;
    this.height = 0;
    this.dpr = 1;
    this.time = Math.random() * 100;
    this.focusGroup = -1;
    this.pointer = { x: 0, y: 0, active: false };
    this.motionReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.running = false;

    this.resize = this.resize.bind(this);
    this.animate = this.animate.bind(this);
    this.onPointerMove = this.onPointerMove.bind(this);
    this.onPointerLeave = this.onPointerLeave.bind(this);

    this.resize();
    this.createBoids();
    window.addEventListener("resize", this.resize, { passive: true });

    if (this.options.interactive) {
      canvas.addEventListener("pointermove", this.onPointerMove, { passive: true });
      canvas.addEventListener("pointerleave", this.onPointerLeave, { passive: true });
    }

    const visibilityObserver = new IntersectionObserver(([entry]) => {
      this.running = entry.isIntersecting;
      if (this.running && !this.motionReduced) requestAnimationFrame(this.animate);
    });
    visibilityObserver.observe(canvas);

    this.draw();
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.width = Math.max(1, rect.width);
    this.height = Math.max(1, rect.height);
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  createBoids() {
    const groupParams = [
      { speed: 1.08, turn: 0.035, spread: 0.9 },
      { speed: 0.92, turn: 0.028, spread: 1.16 },
      { speed: 1.2, turn: 0.045, spread: 0.78 },
      { speed: 0.82, turn: 0.025, spread: 1.28 }
    ];

    for (let i = 0; i < this.options.count; i += 1) {
      const group = i % this.options.groups;
      const parameter = groupParams[group % groupParams.length];
      const angle = Math.random() * Math.PI * 2;
      const speed = parameter.speed * (0.7 + Math.random() * 0.5);
      this.boids.push({
        x: this.width * (0.38 + Math.random() * 0.6),
        y: this.height * (0.18 + Math.random() * 0.58),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        group,
        phase: Math.random() * Math.PI * 2,
        size: 1.6 + Math.random() * 1.8,
        maxSpeed: parameter.speed * 2,
        maxForce: parameter.turn,
        spread: parameter.spread
      });
    }
  }

  onPointerMove(event) {
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.x = event.clientX - rect.left;
    this.pointer.y = event.clientY - rect.top;
    this.pointer.active = true;
  }

  onPointerLeave() {
    this.pointer.active = false;
  }

  setFocus(group) {
    this.focusGroup = Number.isFinite(group) ? group % this.options.groups : -1;
  }

  anchorFor(group) {
    const compact = this.options.compact;
    const anchors = compact
      ? [
          [0.64, 0.40],
          [0.78, 0.58],
          [0.50, 0.64],
          [0.83, 0.30]
        ]
      : [
          [0.64, 0.30],
          [0.78, 0.49],
          [0.57, 0.62],
          [0.84, 0.26]
        ];
    const base = anchors[group % anchors.length];
    const driftX = Math.sin(this.time * (0.12 + group * 0.015) + group) * this.width * 0.055;
    const driftY = Math.cos(this.time * (0.1 + group * 0.012) + group * 1.7) * this.height * 0.06;
    return { x: this.width * base[0] + driftX, y: this.height * base[1] + driftY };
  }

  limit(vector, max) {
    const magnitude = Math.hypot(vector.x, vector.y);
    if (magnitude > max && magnitude > 0) {
      vector.x = (vector.x / magnitude) * max;
      vector.y = (vector.y / magnitude) * max;
    }
    return vector;
  }

  steer(boid, targetX, targetY, weight) {
    const desired = { x: targetX - boid.x, y: targetY - boid.y };
    const magnitude = Math.hypot(desired.x, desired.y) || 1;
    desired.x = (desired.x / magnitude) * boid.maxSpeed;
    desired.y = (desired.y / magnitude) * boid.maxSpeed;
    const force = { x: desired.x - boid.vx, y: desired.y - boid.vy };
    this.limit(force, boid.maxForce);
    boid.vx += force.x * weight;
    boid.vy += force.y * weight;
  }

  updateBoid(boid) {
    let alignX = 0;
    let alignY = 0;
    let cohesionX = 0;
    let cohesionY = 0;
    let separationX = 0;
    let separationY = 0;
    let neighborCount = 0;
    let closeCount = 0;
    const sight = (this.options.compact ? 54 : 72) * boid.spread;

    for (const other of this.boids) {
      if (other === boid || other.group !== boid.group) continue;
      const dx = other.x - boid.x;
      const dy = other.y - boid.y;
      const distanceSq = dx * dx + dy * dy;
      if (distanceSq > sight * sight) continue;

      neighborCount += 1;
      alignX += other.vx;
      alignY += other.vy;
      cohesionX += other.x;
      cohesionY += other.y;

      if (distanceSq < 24 * 24 && distanceSq > 0.01) {
        const distance = Math.sqrt(distanceSq);
        separationX -= dx / distance;
        separationY -= dy / distance;
        closeCount += 1;
      }
    }

    if (neighborCount > 0) {
      alignX /= neighborCount;
      alignY /= neighborCount;
      const alignment = this.limit({ x: alignX - boid.vx, y: alignY - boid.vy }, boid.maxForce);
      boid.vx += alignment.x * 0.82;
      boid.vy += alignment.y * 0.82;

      this.steer(boid, cohesionX / neighborCount, cohesionY / neighborCount, 0.34);
    }

    if (closeCount > 0) {
      const separation = this.limit({
        x: separationX / closeCount,
        y: separationY / closeCount
      }, boid.maxForce * 1.7);
      boid.vx += separation.x * 1.45;
      boid.vy += separation.y * 1.45;
    }

    const anchor = this.anchorFor(boid.group);
    this.steer(boid, anchor.x, anchor.y, this.focusGroup === boid.group ? 0.25 : 0.09);

    if (this.pointer.active) {
      const dx = boid.x - this.pointer.x;
      const dy = boid.y - this.pointer.y;
      const distance = Math.hypot(dx, dy);
      const radius = 125;
      if (distance < radius && distance > 0.1) {
        const strength = (1 - distance / radius) * 0.22;
        boid.vx += (dx / distance) * strength;
        boid.vy += (dy / distance) * strength;
      }
    }

    const margin = 46;
    if (boid.x < margin) boid.vx += 0.045;
    if (boid.x > this.width - margin) boid.vx -= 0.045;
    if (boid.y < margin) boid.vy += 0.045;
    if (boid.y > this.height - margin) boid.vy -= 0.045;

    const velocity = this.limit({ x: boid.vx, y: boid.vy }, boid.maxSpeed);
    boid.vx = velocity.x;
    boid.vy = velocity.y;
    boid.x += boid.vx;
    boid.y += boid.vy;
  }

  drawGraph() {
    if (!this.options.graph) return;
    const ctx = this.ctx;
    const maxDistance = this.options.compact ? 56 : 66;

    for (let i = 0; i < this.boids.length; i += 1) {
      const boid = this.boids[i];
      if (this.focusGroup >= 0 && boid.group !== this.focusGroup) continue;
      let links = 0;
      for (let j = i + 1; j < this.boids.length && links < 2; j += 1) {
        const other = this.boids[j];
        if (other.group !== boid.group) continue;
        const distance = Math.hypot(other.x - boid.x, other.y - boid.y);
        if (distance > maxDistance) continue;
        const alpha = (1 - distance / maxDistance) * (this.focusGroup === boid.group ? 0.34 : 0.12);
        ctx.strokeStyle = `rgba(118, 177, 236, ${alpha})`;
        ctx.lineWidth = 0.55;
        ctx.beginPath();
        ctx.moveTo(boid.x, boid.y);
        ctx.lineTo(other.x, other.y);
        ctx.stroke();
        links += 1;
      }
    }
  }

  drawBird(boid) {
    const ctx = this.ctx;
    const angle = Math.atan2(boid.vy, boid.vx);
    const isFocused = this.focusGroup < 0 || this.focusGroup === boid.group;
    const groupAlpha = [0.88, 0.68, 0.76, 0.56][boid.group % 4];
    const sunDistance = Math.hypot(boid.x - this.width * 0.68, boid.y - this.height * 0.62);
    const crossesSun = !this.options.compact && sunDistance < Math.min(this.width, this.height) * 0.17;
    const groupColor = crossesSun
      ? "7, 22, 47"
      : ["248, 241, 223", "118, 177, 236", "219, 160, 39", "83, 145, 140"][boid.group % 4];
    const alpha = isFocused ? groupAlpha : 0.18;
    const size = boid.size * (this.options.compact ? 0.9 : 1);

    ctx.save();
    ctx.translate(boid.x, boid.y);
    ctx.rotate(angle);
    ctx.strokeStyle = `rgba(${groupColor}, ${alpha})`;
    ctx.lineWidth = isFocused ? 1 : 0.7;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-size * 1.5, -size * 0.75);
    ctx.lineTo(0, 0);
    ctx.lineTo(-size * 1.5, size * 0.75);
    ctx.stroke();
    ctx.restore();
  }

  draw() {
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.drawGraph();
    this.boids.forEach((boid) => this.drawBird(boid));
  }

  animate() {
    if (!this.running || this.motionReduced) return;
    this.time += 0.016;
    this.boids.forEach((boid) => this.updateBoid(boid));
    this.draw();
    requestAnimationFrame(this.animate);
  }
}

const mainCanvas = document.querySelector("[data-flock-canvas]");
let mainFlock = null;
if (mainCanvas) {
  mainFlock = new FlockField(mainCanvas, { count: window.innerWidth < 760 ? 68 : 128, groups: 4, graph: true });

  document.querySelectorAll("[data-swarm-focus], [data-swarm-link]").forEach((link) => {
    const rawGroup = link.dataset.swarmFocus ?? link.dataset.swarmLink;
    const group = Number(rawGroup);
    link.addEventListener("mouseenter", () => mainFlock.setFocus(group));
    link.addEventListener("focus", () => mainFlock.setFocus(group));
    link.addEventListener("mouseleave", () => mainFlock.setFocus(-1));
    link.addEventListener("blur", () => mainFlock.setFocus(-1));
  });
}

document.querySelectorAll("[data-mini-flock]").forEach((canvas) => {
  new FlockField(canvas, {
    count: window.innerWidth < 760 ? 26 : 44,
    groups: 3,
    graph: true,
    interactive: false,
    compact: true
  });
});
