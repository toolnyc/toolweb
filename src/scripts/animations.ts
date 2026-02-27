import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

// ── Reduced-motion bailout ────────────────────────────────────
const prefersReducedMotion = window.matchMedia(
  '(prefers-reduced-motion: reduce)',
).matches;

if (prefersReducedMotion) {
  // Remove hidden-state classes so content is visible immediately
  document
    .querySelectorAll('.anim-fade-up, .anim-fade')
    .forEach((el) => el.classList.remove('anim-fade-up', 'anim-fade'));

  // Also reveal StickyBar
  const stickyBar = document.querySelector<HTMLElement>(
    '[data-anim="sticky-bar"]',
  );
  if (stickyBar) stickyBar.style.transform = 'none';

  // Show static TOOL on canvas for reduced-motion
  const canvas = document.getElementById('dvd-canvas') as HTMLCanvasElement | null;
  if (canvas) {
    const ctx = canvas.getContext('2d');
    if (ctx) {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      ctx.font = 'bold clamp(3rem, 8vw, 7rem) "Space Grotesk", sans-serif';
      ctx.fillStyle = 'rgba(0, 0, 0, 0.06)';
      ctx.textBaseline = 'middle';
      ctx.fillText('TOOL', 40, canvas.offsetHeight / 2);
    }
  }
} else {
  // ── Lenis smooth scroll ───────────────────────────────────────
  const lenis = new Lenis();

  lenis.on('scroll', ScrollTrigger.update);

  gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
  });
  gsap.ticker.lagSmoothing(0);

  // ── DVD Bouncing TOOL wordmark ──────────────────────────────
  const canvas = document.getElementById('dvd-canvas') as HTMLCanvasElement | null;
  if (canvas) {
    const ctx = canvas.getContext('2d')!;
    const dpr = window.devicePixelRatio || 1;

    const CMYK = ['#00FFFF', '#FF00FF', '#FFEB00', '#000000'];
    let colorIndex = 0;
    let cornerHits = 0;

    function resizeCanvas() {
      canvas!.width = canvas!.offsetWidth * dpr;
      canvas!.height = canvas!.offsetHeight * dpr;
      ctx.scale(dpr, dpr);
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Measure text size
    const fontSize = Math.min(canvas.offsetWidth * 0.15, 120);
    ctx.font = `bold ${fontSize}px "Space Grotesk", sans-serif`;
    const textMetrics = ctx.measureText('TOOL');
    const textW = textMetrics.width;
    const textH = fontSize * 0.8; // approximate height

    // Starting position and velocity
    let x = 40;
    let y = canvas.offsetHeight * 0.4;
    const speed = 1.2;
    let vx = speed;
    let vy = speed * 0.7;

    const CORNER_THRESHOLD = 30; // pixels from corner to count as "hit"

    function isNearCorner(px: number, py: number, w: number, h: number): boolean {
      const cw = canvas!.offsetWidth;
      const ch = canvas!.offsetHeight;
      const corners = [
        [0, 0],
        [cw - w, 0],
        [0, ch - h],
        [cw - w, ch - h],
      ];
      return corners.some(
        ([cx, cy]) => Math.abs(px - cx) < CORNER_THRESHOLD && Math.abs(py - cy) < CORNER_THRESHOLD,
      );
    }

    function drawFrame() {
      const cw = canvas!.offsetWidth;
      const ch = canvas!.offsetHeight;

      ctx.clearRect(0, 0, cw, ch);

      // Update position
      x += vx;
      y += vy;

      // Bounce off edges
      let bounced = false;
      if (x <= 0) { x = 0; vx = Math.abs(vx); bounced = true; }
      if (x + textW >= cw) { x = cw - textW; vx = -Math.abs(vx); bounced = true; }
      if (y <= 0) { y = 0; vy = Math.abs(vy); bounced = true; }
      if (y + textH >= ch) { y = ch - textH; vy = -Math.abs(vy); bounced = true; }

      if (bounced) {
        colorIndex = (colorIndex + 1) % CMYK.length;
        if (isNearCorner(x, y, textW, textH)) {
          cornerHits++;
        }
      }

      // Draw text
      const fSize = Math.min(cw * 0.15, 120);
      ctx.font = `bold ${fSize}px "Space Grotesk", sans-serif`;
      ctx.fillStyle = CMYK[colorIndex] + '18'; // low opacity
      ctx.textBaseline = 'top';
      ctx.fillText('TOOL', x, y);

      // Corner hit counter — small, bottom-right
      if (cornerHits > 0) {
        ctx.font = '11px "Space Grotesk", sans-serif';
        ctx.fillStyle = 'rgba(138, 138, 138, 0.5)';
        ctx.textBaseline = 'bottom';
        ctx.textAlign = 'right';
        ctx.fillText(`corners: ${cornerHits}`, cw - 8, ch - 8);
        ctx.textAlign = 'left';
      }

      requestAnimationFrame(drawFrame);
    }

    requestAnimationFrame(drawFrame);
  }

  // ── Hero entrance (on page load, not scroll) ─────────────────
  const heroSubtitle = document.querySelector('[data-anim="hero-subtitle"]');
  const heroCta = document.querySelector('[data-anim="hero-cta"]');

  if (heroSubtitle) {
    gsap.to(heroSubtitle, {
      opacity: 1,
      y: 0,
      duration: 1,
      ease: 'power3.out',
      delay: 0.3,
    });
  }

  if (heroCta) {
    gsap.to(heroCta, {
      opacity: 1,
      y: 0,
      duration: 1,
      ease: 'power3.out',
      delay: 0.5,
    });
  }

  // ── Portfolio items — reveal on scroll ────────────────────────
  document
    .querySelectorAll<HTMLElement>('[data-md-span]')
    .forEach((item) => {
      gsap.to(item, {
        scrollTrigger: {
          trigger: item,
          start: 'top 85%',
          once: true,
        },
        opacity: 1,
        y: 0,
        duration: 0.8,
        ease: 'power2.out',
      });
    });

  // ── Writing blocks — fade in ──────────────────────────────────
  document
    .querySelectorAll<HTMLElement>('.text-snippet')
    .forEach((snippet) => {
      const wrapper = snippet.closest(
        '.col-span-6.lg\\:col-span-24',
      ) as HTMLElement | null;
      if (!wrapper) return;

      // Set initial state via GSAP (these elements don't have a CSS class)
      gsap.set(wrapper, { opacity: 0, y: 20 });

      gsap.to(wrapper, {
        scrollTrigger: {
          trigger: wrapper,
          start: 'top 80%',
          once: true,
        },
        opacity: 1,
        y: 0,
        duration: 0.6,
        ease: 'power2.out',
      });
    });

  // ── Client logos section — fade in ────────────────────────────
  document
    .querySelectorAll<HTMLElement>('[data-anim="clients"]')
    .forEach((section) => {
      gsap.to(section, {
        scrollTrigger: {
          trigger: section,
          start: 'top 85%',
          once: true,
        },
        opacity: 1,
        duration: 0.5,
        ease: 'power2.out',
      });
    });

  // ── Accordion section — fade in ───────────────────────────────
  document
    .querySelectorAll<HTMLElement>('[data-anim="accordion"]')
    .forEach((section) => {
      gsap.to(section, {
        scrollTrigger: {
          trigger: section,
          start: 'top 85%',
          once: true,
        },
        opacity: 1,
        duration: 0.5,
        ease: 'power2.out',
      });
    });

  // ── StickyBar — slide up from bottom ──────────────────────────
  const stickyBar = document.querySelector<HTMLElement>(
    '[data-anim="sticky-bar"]',
  );
  if (stickyBar) {
    gsap.set(stickyBar, { yPercent: 100 });
    gsap.to(stickyBar, {
      yPercent: 0,
      duration: 0.5,
      ease: 'power2.out',
      delay: 1,
    });
  }
}
