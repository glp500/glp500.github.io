(() => {
  "use strict";

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const lerp = (a, b, amount) => a + (b - a) * amount;
  const slug = (value) =>
    String(value || "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

  const header = document.querySelector("[data-site-header]");
  const nav = document.querySelector("[data-site-nav]");
  const navToggle = document.querySelector("[data-nav-toggle]");
  const menuLabel = document.querySelector("[data-menu-label]");

  const closeMenu = () => {
    if (!nav || !navToggle) return;
    nav.classList.remove("is-open");
    header?.classList.remove("nav-active");
    document.body.classList.remove("nav-open");
    navToggle.setAttribute("aria-expanded", "false");
    if (menuLabel) menuLabel.textContent = "Menu";
  };

  navToggle?.addEventListener("click", () => {
    const willOpen = !nav?.classList.contains("is-open");
    nav?.classList.toggle("is-open", willOpen);
    header?.classList.toggle("nav-active", willOpen);
    document.body.classList.toggle("nav-open", willOpen);
    navToggle.setAttribute("aria-expanded", String(willOpen));
    if (menuLabel) menuLabel.textContent = willOpen ? "Close" : "Menu";
  });

  nav?.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));
  window.addEventListener("resize", () => {
    if (window.innerWidth > 820) closeMenu();
  });

  const updateHeader = () => header?.classList.toggle("is-scrolled", window.scrollY > 36);
  updateHeader();
  window.addEventListener("scroll", updateHeader, { passive: true });

  document.documentElement.classList.add("js");
  const revealItems = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    const revealObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -4% 0px" }
    );
    revealItems.forEach((item) => revealObserver.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add("is-visible"));
  }

  document.querySelectorAll("[data-filter-root]").forEach((root) => {
    const items = [...root.querySelectorAll("[data-filter-item]")];
    const search = root.querySelector("[data-filter-search]");
    const buttons = [...root.querySelectorAll("[data-filter-button]")];
    const count = root.querySelector("[data-filter-count]");
    const reset = root.querySelector("[data-filter-reset]");
    const empty = root.querySelector("[data-filter-empty]");
    let activeFilter = "all";
    const requestedFilter = slug(new URLSearchParams(window.location.search).get("filter"));

    if (requestedFilter && buttons.some((button) => button.dataset.filterValue === requestedFilter)) {
      activeFilter = requestedFilter;
      buttons.forEach((button) =>
        button.classList.toggle("is-active", button.dataset.filterValue === activeFilter)
      );
    }

    const applyFilters = () => {
      const query = (search?.value || "").trim().toLowerCase();
      let visible = 0;

      items.forEach((item) => {
        const searchable = (item.dataset.search || item.textContent || "").toLowerCase();
        // An item may belong to several groups at once (e.g. a project's
        // context plus each research field it sits in), so treat the
        // attribute as a whitespace-separated token list.
        const itemFilters = String(item.dataset.filter || "")
          .split(/\s+/)
          .map(slug)
          .filter(Boolean);
        const matchesText = !query || searchable.includes(query);
        const matchesFilter = activeFilter === "all" || itemFilters.includes(activeFilter);
        const show = matchesText && matchesFilter;
        item.hidden = !show;
        if (show) visible += 1;
      });

      if (count) count.textContent = `${visible} of ${items.length}`;
      if (empty) empty.hidden = items.length === 0 || visible !== 0;
    };

    search?.addEventListener("input", applyFilters);
    buttons.forEach((button) => {
      button.addEventListener("click", () => {
        activeFilter = button.dataset.filterValue || "all";
        buttons.forEach((candidate) => candidate.classList.toggle("is-active", candidate === button));
        applyFilters();
      });
    });
    reset?.addEventListener("click", () => {
      activeFilter = "all";
      if (search) search.value = "";
      buttons.forEach((button) =>
        button.classList.toggle("is-active", button.dataset.filterValue === "all")
      );
      applyFilters();
      search?.focus();
    });
    applyFilters();
  });

  // Copy-to-clipboard. Takes its text from data-copy-text when present,
  // otherwise from the citation block on publication pages.
  document.querySelectorAll("[data-copy-citation]").forEach((button) => {
    const original = button.textContent;
    button.addEventListener("click", async () => {
      const text =
        button.dataset.copyText ||
        document.querySelector("[data-citation-text]")?.textContent?.trim();
      if (!text) return;
      try {
        await navigator.clipboard.writeText(text);
        button.textContent = "Copied";
        button.classList.add("is-copied");
        window.setTimeout(() => {
          button.textContent = original;
          button.classList.remove("is-copied");
        }, 1800);
      } catch {
        button.textContent = "Copy failed";
        window.setTimeout(() => {
          button.textContent = original;
        }, 1800);
      }
    });
  });

  class AgentWorld {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d", { alpha: true });
      if (!this.ctx) return;

      this.storageKey = "gavin-agent-world-v3";
      this.modeNames = ["home", "research", "projects", "publications", "media", "resources", "experience", "notes"];
      this.mode = this.cleanMode(document.body.dataset.worldMode);
      this.previousMode = this.mode;
      this.previewMode = null;
      this.transitionStarted = performance.now();
      this.transitionDuration = 1150;
      this.agents = [];
      this.grid = new Map();
      this.cellSize = 82;
      this.pointer = {
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
        vx: 0,
        vy: 0,
        lastX: window.innerWidth / 2,
        lastY: window.innerHeight / 2,
        active: false,
        down: false,
      };
      this.attractors = [];
      this.flow = [];
      this.engagedUntil = 0;
      this.regimeUntil = 0;
      this.lastFrame = performance.now();
      this.running = true;
      this.frame = 0;
      this.isReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      this.isCoarse = window.matchMedia("(pointer: coarse)").matches;
      this.isStatic = this.isReduced || (this.isCoarse && window.innerWidth < 740);
      this.dpr = 1;
      this.width = window.innerWidth;
      this.height = window.innerHeight;

      this.resize();
      this.restoreOrCreate();
      this.bind();
      this.observeModes();

      if (this.isStatic) {
        this.buildGrid();
        this.draw(performance.now(), true);
      } else {
        requestAnimationFrame((time) => this.tick(time));
      }
    }

    cleanMode(value) {
      return this.modeNames.includes(value) ? value : "home";
    }

    desiredCount() {
      const area = this.width * this.height;
      if (this.isStatic) return clamp(Math.round(area / 14000), 46, 82);
      if (this.width < 700) return clamp(Math.round(area / 8500), 62, 92);
      return clamp(Math.round(area / 9200), 96, 165);
    }

    resize() {
      const previousWidth = this.width || window.innerWidth;
      const previousHeight = this.height || window.innerHeight;
      this.width = window.innerWidth;
      this.height = window.innerHeight;
      this.dpr = Math.min(window.devicePixelRatio || 1, 1.6);
      this.canvas.width = Math.floor(this.width * this.dpr);
      this.canvas.height = Math.floor(this.height * this.dpr);
      this.canvas.style.width = `${this.width}px`;
      this.canvas.style.height = `${this.height}px`;
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

      if (this.agents.length) {
        const scaleX = this.width / Math.max(previousWidth, 1);
        const scaleY = this.height / Math.max(previousHeight, 1);
        this.agents.forEach((agent) => {
          agent.x *= scaleX;
          agent.y *= scaleY;
        });
        this.reconcilePopulation();
      }
    }

    createAgent(index, restored = null) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.25 + Math.random() * 0.55;
      return {
        x: restored ? restored[0] * this.width : Math.random() * this.width,
        y: restored ? restored[1] * this.height : Math.random() * this.height,
        vx: restored ? restored[2] : Math.cos(angle) * speed,
        vy: restored ? restored[3] : Math.sin(angle) * speed,
        seed: restored ? restored[4] : Math.random(),
        phase: restored ? restored[5] : Math.random() * Math.PI * 2,
        index,
      };
    }

    restoreOrCreate() {
      let stored = null;
      try {
        stored = JSON.parse(sessionStorage.getItem(this.storageKey) || "null");
      } catch {
        stored = null;
      }

      const valid =
        stored &&
        stored.version === 3 &&
        Array.isArray(stored.agents) &&
        Date.now() - stored.savedAt < 1000 * 60 * 60 * 4;

      if (valid) {
        this.previousMode = this.cleanMode(stored.mode);
        this.agents = stored.agents.map((agent, index) => this.createAgent(index, agent));
      }

      const target = this.desiredCount();
      while (this.agents.length < target) this.agents.push(this.createAgent(this.agents.length));
      if (this.agents.length > target) this.agents.length = target;
    }

    reconcilePopulation() {
      const target = this.desiredCount();
      while (this.agents.length < target) this.agents.push(this.createAgent(this.agents.length));
      if (this.agents.length > target) this.agents.length = target;
      this.agents.forEach((agent, index) => {
        agent.index = index;
      });
    }

    save() {
      try {
        const sample = this.agents.slice(0, 100).map((agent) => [
          clamp(agent.x / this.width, 0, 1),
          clamp(agent.y / this.height, 0, 1),
          Number(agent.vx.toFixed(3)),
          Number(agent.vy.toFixed(3)),
          Number(agent.seed.toFixed(3)),
          Number(agent.phase.toFixed(3)),
        ]);
        sessionStorage.setItem(
          this.storageKey,
          JSON.stringify({
            version: 3,
            savedAt: Date.now(),
            mode: this.previewMode || this.mode,
            agents: sample,
          })
        );
      } catch {
        // Storage is an enhancement; the world still works when unavailable.
      }
    }

    bind() {
      let resizeTimer = 0;
      window.addEventListener("resize", () => {
        window.clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(() => {
          this.resize();
          if (this.isStatic) {
            this.buildGrid();
            this.draw(performance.now(), true);
          }
        }, 120);
      });

      window.addEventListener(
        "pointermove",
        (event) => {
          const dx = event.clientX - this.pointer.lastX;
          const dy = event.clientY - this.pointer.lastY;
          this.pointer.vx = lerp(this.pointer.vx, dx, 0.35);
          this.pointer.vy = lerp(this.pointer.vy, dy, 0.35);
          this.pointer.x = event.clientX;
          this.pointer.y = event.clientY;
          this.pointer.lastX = event.clientX;
          this.pointer.lastY = event.clientY;
          this.pointer.active = true;
          this.engagedUntil = performance.now() + 900;
          if (this.pointer.down) {
            this.flow.push({
              x: event.clientX,
              y: event.clientY,
              vx: dx * 0.08,
              vy: dy * 0.08,
              born: performance.now(),
            });
            if (this.flow.length > 32) this.flow.shift();
          }
        },
        { passive: true }
      );

      window.addEventListener("pointerdown", (event) => {
        this.pointer.down = true;
        this.pointer.x = event.clientX;
        this.pointer.y = event.clientY;
      });
      window.addEventListener("pointerup", () => {
        this.pointer.down = false;
      });
      window.addEventListener("pointercancel", () => {
        this.pointer.down = false;
      });
      document.documentElement.addEventListener("mouseleave", () => {
        this.pointer.active = false;
      });

      window.addEventListener("click", (event) => {
        this.attractors.push({
          x: event.clientX,
          y: event.clientY,
          born: performance.now(),
          strength: this.attractors.length % 2 === 0 ? 1 : -0.72,
        });
        if (this.attractors.length > 5) this.attractors.shift();
        this.engagedUntil = performance.now() + 2600;
      });

      window.addEventListener("dblclick", () => {
        this.regimeUntil = performance.now() + 5200;
        this.engagedUntil = this.regimeUntil;
      });

      document.addEventListener("visibilitychange", () => {
        this.running = !document.hidden;
        if (this.running && !this.isStatic) {
          this.lastFrame = performance.now();
          requestAnimationFrame((time) => this.tick(time));
        }
      });

      window.addEventListener("pagehide", () => this.save());
      document.querySelectorAll("a[href]").forEach((link) => {
        link.addEventListener("click", () => this.save(), { capture: true });
      });

      document.querySelectorAll("[data-world-link]").forEach((link) => {
        const targetMode = this.cleanMode(link.dataset.worldLink);
        link.addEventListener("mouseenter", () => {
          this.previewMode = targetMode;
          this.engagedUntil = performance.now() + 1200;
        });
        link.addEventListener("mouseleave", () => {
          this.previewMode = null;
        });
        link.addEventListener("focus", () => {
          this.previewMode = targetMode;
          this.engagedUntil = performance.now() + 1200;
        });
        link.addEventListener("blur", () => {
          this.previewMode = null;
        });
      });
    }

    observeModes() {
      const sections = [...document.querySelectorAll("main [data-world-mode], footer[data-world-mode]")];
      if (!("IntersectionObserver" in window) || sections.length === 0) return;

      const visibility = new Map();
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => visibility.set(entry.target, entry.intersectionRatio));
          let strongest = null;
          let ratio = 0;
          visibility.forEach((value, element) => {
            if (value > ratio) {
              strongest = element;
              ratio = value;
            }
          });
          if (strongest && ratio > 0.1) this.setMode(strongest.dataset.worldMode);
        },
        { threshold: [0.1, 0.25, 0.45, 0.65], rootMargin: "-18% 0px -25% 0px" }
      );
      sections.forEach((section) => observer.observe(section));
    }

    setMode(nextMode) {
      const clean = this.cleanMode(nextMode);
      if (clean === this.mode) return;
      this.previousMode = this.mode;
      this.mode = clean;
      this.transitionStarted = performance.now();
      this.agents.forEach((agent) => {
        agent.phase += (Math.random() - 0.5) * 0.8;
      });
    }

    activeMode() {
      return this.previewMode || this.mode;
    }

    buildGrid() {
      this.grid.clear();
      this.agents.forEach((agent) => {
        const gx = Math.floor(agent.x / this.cellSize);
        const gy = Math.floor(agent.y / this.cellSize);
        const key = `${gx}:${gy}`;
        if (!this.grid.has(key)) this.grid.set(key, []);
        this.grid.get(key).push(agent);
      });
    }

    neighbors(agent) {
      const gx = Math.floor(agent.x / this.cellSize);
      const gy = Math.floor(agent.y / this.cellSize);
      const result = [];
      for (let x = gx - 1; x <= gx + 1; x += 1) {
        for (let y = gy - 1; y <= gy + 1; y += 1) {
          const bucket = this.grid.get(`${x}:${y}`);
          if (bucket) result.push(...bucket);
        }
      }
      return result;
    }

    targetFor(agent, mode, time) {
      const t = time * 0.00025;
      const seedAngle = agent.seed * Math.PI * 2;
      const margin = 42;

      switch (mode) {
        case "research": {
          const anchors = [
            [0.22, 0.28],
            [0.52, 0.2],
            [0.77, 0.36],
            [0.34, 0.7],
            [0.7, 0.73],
          ];
          const anchor = anchors[agent.index % anchors.length];
          const radius = 28 + (agent.index % 9) * 4;
          return {
            x: this.width * anchor[0] + Math.cos(seedAngle + t) * radius,
            y: this.height * anchor[1] + Math.sin(seedAngle + t * 1.2) * radius,
          };
        }
        case "projects": {
          const columns = Math.max(4, Math.floor(this.width / 170));
          const rows = Math.max(3, Math.ceil(this.agents.length / columns));
          const column = agent.index % columns;
          const row = Math.floor(agent.index / columns) % rows;
          return {
            x: margin + (column / Math.max(columns - 1, 1)) * (this.width - margin * 2),
            y:
              margin +
              (row / Math.max(rows - 1, 1)) * (this.height - margin * 2) +
              Math.sin(t * 2 + column) * 16,
          };
        }
        case "publications": {
          const ring = 0.15 + (agent.index % 5) * 0.058;
          const angle = seedAngle + t * (agent.index % 2 ? 1 : -0.72);
          return {
            x: this.width * 0.5 + Math.cos(angle) * this.width * ring,
            y: this.height * 0.5 + Math.sin(angle) * this.height * ring * 0.55,
          };
        }
        case "media": {
          const centers = [
            [0.25, 0.48],
            [0.53, 0.3],
            [0.73, 0.65],
          ];
          const center = centers[agent.index % 3];
          const radius = 35 + (agent.index % 12) * 5;
          return {
            x: this.width * center[0] + Math.cos(seedAngle + t * 1.3) * radius,
            y: this.height * center[1] + Math.sin(seedAngle * 1.2 + t) * radius,
          };
        }
        case "resources": {
          const columns = Math.max(4, Math.floor(this.width / 145));
          const row = Math.floor(agent.index / columns);
          const column = agent.index % columns;
          const spacingX = this.width / (columns + 1);
          const spacingY = 92;
          return {
            x: spacingX * (column + 1) + (row % 2) * spacingX * 0.5,
            y: 55 + (row * spacingY) % Math.max(this.height - 90, 120),
          };
        }
        case "experience": {
          const bands = 7;
          const band = agent.index % bands;
          return {
            x: margin + ((agent.seed + t * 0.028 * (band % 2 ? -1 : 1) + 2) % 1) * (this.width - margin * 2),
            y: ((band + 1) / (bands + 1)) * this.height + Math.sin(t * 2 + seedAngle) * 5,
          };
        }
        case "notes": {
          const columns = 4;
          return {
            x: ((agent.index % columns) + 0.5) * (this.width / columns) + Math.sin(t + seedAngle) * 22,
            y: ((agent.seed + t * 0.04) % 1) * this.height,
          };
        }
        case "home":
        default: {
          const angle = seedAngle + t * 0.7;
          const radiusX = this.width * (0.25 + agent.seed * 0.24);
          const radiusY = this.height * (0.12 + agent.seed * 0.17);
          return {
            x: this.width * 0.5 + Math.cos(angle) * radiusX,
            y: this.height * 0.5 + Math.sin(angle * 1.7 + agent.phase) * radiusY,
          };
        }
      }
    }

    update(time, delta) {
      this.buildGrid();
      const mode = this.activeMode();
      const transition = clamp((time - this.transitionStarted) / this.transitionDuration, 0, 1);
      const easeTransition = 1 - Math.pow(1 - transition, 3);
      const regime = time < this.regimeUntil;

      this.attractors = this.attractors.filter((point) => time - point.born < 2800);
      this.flow = this.flow.filter((point) => time - point.born < 4200);

      this.agents.forEach((agent) => {
        let ax = Math.sin(agent.phase + time * 0.00018) * 0.008;
        let ay = Math.cos(agent.phase * 1.7 + time * 0.00015) * 0.008;
        let centerX = 0;
        let centerY = 0;
        let alignX = 0;
        let alignY = 0;
        let separationX = 0;
        let separationY = 0;
        let count = 0;

        this.neighbors(agent).forEach((other) => {
          if (other === agent) return;
          const dx = other.x - agent.x;
          const dy = other.y - agent.y;
          const distanceSquared = dx * dx + dy * dy;
          if (distanceSquared > this.cellSize * this.cellSize || distanceSquared < 0.01) return;
          const distance = Math.sqrt(distanceSquared);
          centerX += other.x;
          centerY += other.y;
          alignX += other.vx;
          alignY += other.vy;
          count += 1;
          if (distance < 25) {
            separationX -= dx / distanceSquared;
            separationY -= dy / distanceSquared;
          }
        });

        if (count) {
          centerX = centerX / count - agent.x;
          centerY = centerY / count - agent.y;
          alignX = alignX / count - agent.vx;
          alignY = alignY / count - agent.vy;
          ax += centerX * 0.00022 + alignX * 0.018 + separationX * 0.32;
          ay += centerY * 0.00022 + alignY * 0.018 + separationY * 0.32;
        }

        const oldTarget = this.targetFor(agent, this.previousMode, time);
        const newTarget = this.targetFor(agent, mode, time);
        const targetX = lerp(oldTarget.x, newTarget.x, easeTransition);
        const targetY = lerp(oldTarget.y, newTarget.y, easeTransition);
        const targetStrength = mode === "home" ? 0.000055 : 0.000085;
        ax += (targetX - agent.x) * targetStrength;
        ay += (targetY - agent.y) * targetStrength;

        if (this.pointer.active) {
          const dx = agent.x - this.pointer.x;
          const dy = agent.y - this.pointer.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < 190 && distance > 1) {
            const influence = (1 - distance / 190) * 0.055;
            ax += this.pointer.vx * influence * 0.035 - (dy / distance) * influence;
            ay += this.pointer.vy * influence * 0.035 + (dx / distance) * influence;
          }
        }

        this.attractors.forEach((point) => {
          const age = (time - point.born) / 2800;
          const dx = point.x - agent.x;
          const dy = point.y - agent.y;
          const distance = Math.max(Math.sqrt(dx * dx + dy * dy), 24);
          const fade = 1 - age;
          const strength = point.strength * fade * 0.12;
          ax += (dx / distance) * strength - (dy / distance) * strength * 0.55;
          ay += (dy / distance) * strength + (dx / distance) * strength * 0.55;
        });

        this.flow.forEach((point) => {
          const dx = agent.x - point.x;
          const dy = agent.y - point.y;
          const distanceSquared = dx * dx + dy * dy;
          if (distanceSquared < 22000) {
            const fade = 1 - (time - point.born) / 4200;
            const influence = fade * (1 - distanceSquared / 22000);
            ax += point.vx * influence * 0.022;
            ay += point.vy * influence * 0.022;
          }
        });

        if (regime) {
          const dx = agent.x - this.width / 2;
          const dy = agent.y - this.height / 2;
          const distance = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
          const pulse = 0.075 + Math.sin(time * 0.006 + agent.phase) * 0.035;
          ax += (-dy / distance) * pulse + (dx / distance) * 0.012;
          ay += (dx / distance) * pulse + (dy / distance) * 0.012;
        }

        agent.vx = (agent.vx + ax * delta) * 0.992;
        agent.vy = (agent.vy + ay * delta) * 0.992;
        const speed = Math.sqrt(agent.vx * agent.vx + agent.vy * agent.vy);
        const maximum = regime ? 3.1 : time < this.engagedUntil ? 2.2 : 1.35;
        const minimum = 0.16;
        if (speed > maximum) {
          agent.vx = (agent.vx / speed) * maximum;
          agent.vy = (agent.vy / speed) * maximum;
        } else if (speed < minimum) {
          agent.vx = (agent.vx / Math.max(speed, 0.001)) * minimum;
          agent.vy = (agent.vy / Math.max(speed, 0.001)) * minimum;
        }

        agent.x += agent.vx * delta;
        agent.y += agent.vy * delta;

        const pad = 18;
        if (agent.x < -pad) agent.x = this.width + pad;
        if (agent.x > this.width + pad) agent.x = -pad;
        if (agent.y < -pad) agent.y = this.height + pad;
        if (agent.y > this.height + pad) agent.y = -pad;
      });

      this.pointer.vx *= 0.82;
      this.pointer.vy *= 0.82;
    }

    drawAgent(agent, mode, alpha) {
      const ctx = this.ctx;
      const angle = Math.atan2(agent.vy, agent.vx);
      const size = 2.4 + agent.seed * 2.2;
      ctx.save();
      ctx.translate(agent.x, agent.y);
      ctx.rotate(angle);
      ctx.globalAlpha = alpha;
      ctx.lineWidth = 0.9;

      if (mode === "research") {
        ctx.strokeStyle = agent.index % 7 === 0 ? "#f0fd71" : "#ffffff";
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.72, 0, Math.PI * 2);
        ctx.stroke();
      } else if (mode === "projects") {
        ctx.fillStyle = agent.index % 6 === 0 ? "#f0fd71" : "#070807";
        ctx.fillRect(-size * 0.65, -size * 0.65, size * 1.3, size * 1.3);
      } else if (mode === "publications") {
        ctx.strokeStyle = agent.index % 5 === 0 ? "#f0fd71" : "#ffffff";
        ctx.beginPath();
        ctx.ellipse(0, 0, size * 1.4, size * 0.55, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = "#070807";
        ctx.fillRect(-0.8, -0.8, 1.6, 1.6);
      } else if (mode === "media") {
        ctx.fillStyle = agent.index % 4 === 0 ? "#f0fd71" : "#ffffff";
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.72, 0, Math.PI * 2);
        ctx.fill();
      } else if (mode === "resources") {
        ctx.strokeStyle = agent.index % 5 === 0 ? "#f0fd71" : "#ffffff";
        ctx.beginPath();
        ctx.moveTo(size, 0);
        ctx.lineTo(0, size * 0.8);
        ctx.lineTo(-size, 0);
        ctx.lineTo(0, -size * 0.8);
        ctx.closePath();
        ctx.stroke();
      } else if (mode === "experience") {
        ctx.strokeStyle = agent.index % 7 === 0 ? "#f0fd71" : "#ffffff";
        ctx.beginPath();
        ctx.moveTo(-size * 1.6, 0);
        ctx.lineTo(size * 1.6, 0);
        ctx.stroke();
      } else if (mode === "notes") {
        ctx.strokeStyle = agent.index % 6 === 0 ? "#f0fd71" : "#ffffff";
        ctx.strokeRect(-size, -size * 0.7, size * 2, size * 1.4);
      } else {
        ctx.strokeStyle = agent.index % 8 === 0 ? "#f0fd71" : "#ffffff";
        ctx.beginPath();
        ctx.moveTo(-size * 1.5, size * 0.65);
        ctx.lineTo(0, 0);
        ctx.lineTo(-size * 1.5, -size * 0.65);
        ctx.stroke();
      }
      ctx.restore();
    }

    draw(time, staticFrame = false) {
      const ctx = this.ctx;
      const mode = this.activeMode();
      const engaged = staticFrame || time < this.engagedUntil || mode === "research" || mode === "resources";
      ctx.clearRect(0, 0, this.width, this.height);

      if (engaged) {
        ctx.save();
        ctx.lineWidth = 0.55;
        this.agents.forEach((agent) => {
          const nearby = this.neighbors(agent);
          let lines = 0;
          nearby.forEach((other) => {
            if (other.index <= agent.index || lines >= 3) return;
            const dx = other.x - agent.x;
            const dy = other.y - agent.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance > 66) return;
            const opacity = (1 - distance / 66) * (mode === "resources" ? 0.34 : 0.22);
            ctx.strokeStyle =
              mode === "projects" || mode === "experience"
                ? `rgba(7,8,7,${opacity})`
                : `rgba(255,255,255,${opacity})`;
            ctx.beginPath();
            ctx.moveTo(agent.x, agent.y);
            ctx.lineTo(other.x, other.y);
            ctx.stroke();
            lines += 1;
          });
        });
        ctx.restore();
      }

      const baseAlpha = staticFrame ? 0.58 : time < this.engagedUntil ? 0.74 : 0.5;
      this.agents.forEach((agent) => this.drawAgent(agent, mode, baseAlpha));

      if (!staticFrame) {
        ctx.save();
        this.attractors.forEach((point) => {
          const age = (time - point.born) / 2800;
          ctx.globalAlpha = clamp((1 - age) * 0.4, 0, 0.4);
          ctx.strokeStyle = point.strength > 0 ? "#f0fd71" : "#ffffff";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(point.x, point.y, 18 + age * 90, 0, Math.PI * 2);
          ctx.stroke();
        });
        if (this.pointer.down && this.flow.length > 1) {
          ctx.globalAlpha = 0.36;
          ctx.strokeStyle = "#f0fd71";
          ctx.beginPath();
          this.flow.forEach((point, index) => {
            if (index === 0) ctx.moveTo(point.x, point.y);
            else ctx.lineTo(point.x, point.y);
          });
          ctx.stroke();
        }
        ctx.restore();
      }
    }

    tick(time) {
      if (!this.running || this.isStatic) return;
      const delta = clamp((time - this.lastFrame) / 16.667, 0.35, 2);
      this.lastFrame = time;
      this.frame += 1;
      this.update(time, delta);
      this.draw(time);
      requestAnimationFrame((nextTime) => this.tick(nextTime));
    }
  }

  const worldCanvas = document.querySelector("[data-agent-world]");
  if (worldCanvas) new AgentWorld(worldCanvas);
})();
