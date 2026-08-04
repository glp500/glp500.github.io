(() => {
  "use strict";

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const slug = (value) =>
    String(value || "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

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
  /* ----------------------------------------------------------
     The flock.

     A small number of birds, drawn as two strokes each, held
     inside the sky. On the homepage the sky ends at the roofline
     of the photograph; everywhere else it is the whole window.
     They enter from one random point on the sky's edge, drift on
     the usual three boid rules, and swerve away from the cursor.
     ---------------------------------------------------------- */

  const ROOF_FRACTION = 0.282; // of the photograph's height, below the roofline

  class BirdSky {
    constructor(canvas) {
      this.ctx = canvas.getContext("2d", { alpha: true });
      if (!this.ctx) return;

      this.canvas = canvas;
      // Every page stands on the photograph now, so the roofline is always
      // measurable; the homepage just shows it undimmed.
      this.photo = document.querySelector("[data-sky-photo]");
      this.isReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      this.pointer = { x: -999, y: -999, active: false };
      this.last = performance.now();

      this.measure();
      this.hatch();
      this.bind();

      if (this.isReduced) this.draw();
      else requestAnimationFrame((t) => this.tick(t));
    }

    measure() {
      this.width = window.innerWidth;
      this.height = window.innerHeight;
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.canvas.width = Math.round(this.width * this.dpr);
      this.canvas.height = Math.round(this.height * this.dpr);
      this.canvas.style.width = `${this.width}px`;
      this.canvas.style.height = `${this.height}px`;
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

      // The photo is bottom-anchored `cover`, so the roofline sits a fixed
      // fraction of the *displayed image* height up from the window bottom.
      let floor = this.height;
      if (this.photo && this.photo.naturalWidth) {
        const shown = Math.max(
          this.height,
          (this.width * this.photo.naturalHeight) / this.photo.naturalWidth
        );
        floor = this.height - ROOF_FRACTION * shown;
      }
      this.skyBottom = clamp(floor, this.height * 0.2, this.height);
      // A subpage holds the photograph back, so its birds are drawn a shade
      // lighter to stay readable as silhouettes against the dimmed sky.
      this.dimmedSky = !document.body.classList.contains("page-home");
    }

    count() {
      return this.width > 900 ? 15 : 9;
    }

    /* Every bird enters from one shared point on the edge of the sky,
       chosen at random, so no two visits open the same way. */
    hatch() {
      const fromSide = Math.random() < 0.62;
      const entry = fromSide
        ? { x: Math.random() < 0.5 ? -60 : this.width + 60, y: Math.random() * this.skyBottom * 0.8 }
        : { x: Math.random() * this.width, y: -50 };
      const heading = Math.atan2(this.skyBottom * 0.45 - entry.y, this.width / 2 - entry.x);

      this.birds = Array.from({ length: this.count() }, () => {
        const speed = 0.9 + Math.random() * 0.7;
        const spread = heading + (Math.random() - 0.5) * 0.5;
        return {
          x: entry.x + (Math.random() - 0.5) * 150,
          y: entry.y + (Math.random() - 0.5) * 110,
          vx: Math.cos(spread) * speed,
          vy: Math.sin(spread) * speed,
          size: 5 + Math.random() * 5,
          phase: Math.random() * Math.PI * 2,
        };
      });
    }

    bind() {
      let resizeTimer = 0;
      window.addEventListener("resize", () => {
        window.clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(() => {
          this.measure();
          if (this.isReduced) this.draw();
        }, 150);
      });

      // The photo decides where the sky ends, so remeasure once it is decoded.
      if (this.photo && !this.photo.complete) {
        this.photo.addEventListener("load", () => this.measure(), { once: true });
      }

      window.addEventListener(
        "pointermove",
        (event) => {
          this.pointer.x = event.clientX;
          this.pointer.y = event.clientY;
          this.pointer.active = true;
        },
        { passive: true }
      );

      window.addEventListener("pointerleave", () => {
        this.pointer.active = false;
      });

      document.addEventListener("visibilitychange", () => {
        // Skips the delta that would otherwise pile up while hidden.
        this.last = performance.now();
      });
    }

    // ponytail: every pair is compared each frame. Fifteen birds is 105
    // comparisons; add a spatial grid only if the flock ever grows.
    update(delta) {
      const birds = this.birds;
      const margin = 70;

      birds.forEach((bird) => {
        let sepX = 0;
        let sepY = 0;
        let alignX = 0;
        let alignY = 0;
        let cohX = 0;
        let cohY = 0;
        let seen = 0;

        birds.forEach((other) => {
          if (other === bird) return;
          const dx = other.x - bird.x;
          const dy = other.y - bird.y;
          const d2 = dx * dx + dy * dy;
          if (d2 > 20000 || d2 === 0) return;
          seen += 1;
          alignX += other.vx;
          alignY += other.vy;
          cohX += other.x;
          cohY += other.y;
          if (d2 < 1400) {
            const d = Math.sqrt(d2);
            sepX -= dx / d;
            sepY -= dy / d;
          }
        });

        if (seen) {
          bird.vx += (alignX / seen - bird.vx) * 0.035 * delta;
          bird.vy += (alignY / seen - bird.vy) * 0.035 * delta;
          bird.vx += (cohX / seen - bird.x) * 0.0006 * delta;
          bird.vy += (cohY / seen - bird.y) * 0.0006 * delta;
        }
        bird.vx += sepX * 0.06 * delta;
        bird.vy += sepY * 0.06 * delta;

        // A little wander, so a settled flock never goes rigid.
        bird.vx += (Math.random() - 0.5) * 0.05 * delta;
        bird.vy += (Math.random() - 0.5) * 0.04 * delta;

        if (this.pointer.active) {
          const dx = bird.x - this.pointer.x;
          const dy = bird.y - this.pointer.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 24000 && d2 > 1) {
            const push = (1 - d2 / 24000) * 0.9;
            const d = Math.sqrt(d2);
            bird.vx += (dx / d) * push * delta;
            bird.vy += (dy / d) * push * delta;
          }
        }

        // Held inside the sky: steered off the roofline and the top edge,
        // wrapped left to right so they keep arriving from somewhere new.
        if (bird.y > this.skyBottom - margin) {
          bird.vy -= (0.055 + (bird.y - this.skyBottom + margin) * 0.002) * delta;
        }
        if (bird.y < margin) bird.vy += 0.05 * delta;

        const speed = Math.hypot(bird.vx, bird.vy);
        const capped = clamp(speed, 0.55, 2.1);
        if (speed > 0) {
          bird.vx = (bird.vx / speed) * capped;
          bird.vy = (bird.vy / speed) * capped;
        }

        bird.x += bird.vx * delta;
        bird.y += bird.vy * delta;
        bird.phase += (0.1 + speed * 0.06) * delta;

        if (bird.x < -90) {
          bird.x = this.width + 80;
          bird.y = Math.random() * this.skyBottom * 0.85;
        } else if (bird.x > this.width + 90) {
          bird.x = -80;
          bird.y = Math.random() * this.skyBottom * 0.85;
        }
        bird.y = clamp(bird.y, -40, this.skyBottom);
      });
    }

    draw() {
      const ctx = this.ctx;
      ctx.clearRect(0, 0, this.width, this.height);
      ctx.strokeStyle = this.dimmedSky ? "rgba(9, 16, 22, 0.95)" : "rgba(7, 12, 17, 0.92)";
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      this.birds.forEach((bird) => {
        const s = bird.size;
        // Wings sweep between flat and raised; never mirrored into a W,
        // because the bank is capped well short of a half turn.
        const flap = 0.45 + (Math.sin(bird.phase) * 0.5 + 0.5) * 0.7;
        const bank = clamp(Math.atan2(bird.vy, Math.abs(bird.vx)) * 0.55, -0.5, 0.5);

        ctx.save();
        ctx.translate(bird.x, bird.y);
        ctx.rotate(bank);
        ctx.lineWidth = Math.max(1, s * 0.16);
        ctx.beginPath();
        ctx.moveTo(-s, 0);
        ctx.quadraticCurveTo(-s * 0.5, -s * flap, 0, -s * 0.12);
        ctx.quadraticCurveTo(s * 0.5, -s * flap, s, 0);
        ctx.stroke();
        ctx.restore();
      });
    }

    tick(time) {
      const delta = clamp((time - this.last) / 16.667, 0.3, 2.5);
      this.last = time;
      this.update(delta);
      this.draw();
      requestAnimationFrame((next) => this.tick(next));
    }
  }

  const sky = document.querySelector("[data-bird-sky]");
  if (sky) new BirdSky(sky);
})();
