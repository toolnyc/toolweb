import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { TextPlugin } from 'gsap/TextPlugin';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger, TextPlugin);

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

  // ── DVD Bouncing TOOL wordmark + Cockpit HUD ──────────────────
  const canvas = document.getElementById('dvd-canvas') as HTMLCanvasElement | null;
  if (canvas) {
    const ctx = canvas.getContext('2d')!;
    const dpr = window.devicePixelRatio || 1;

    const CMYK = ['#00FFFF', '#FF00FF', '#FFEB00', '#000000'];
    let colorIndex = 0;
    let cornerHits = 0;
    let bounceCount = 0;
    let frameCount = 0;
    const startTime = Date.now();

    // Gather visitor telemetry (privacy exposure)
    const screenRes = `${screen.width}×${screen.height}`;
    const colorDepth = `${screen.colorDepth}bit`;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const lang = navigator.language;
    const platform = (navigator as any).userAgentData?.platform || navigator.platform || 'unknown';
    const cores = navigator.hardwareConcurrency || 0;
    const memory = (navigator as any).deviceMemory || '?';
    const connection = (navigator as any).connection;
    const connType = connection?.effectiveType || '?';
    const downlink = connection?.downlink ? `${connection.downlink}Mbps` : '?';
    const touchPoints = navigator.maxTouchPoints || 0;

    // GPU detection
    let gpuRenderer = 'unknown';
    try {
      const gl = document.createElement('canvas').getContext('webgl');
      if (gl) {
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        if (ext) gpuRenderer = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL);
      }
    } catch { /* noop */ }
    // Truncate long GPU strings
    if (gpuRenderer.length > 40) gpuRenderer = gpuRenderer.slice(0, 38) + '..';

    // Design telemetry
    const fontAxes = ['wght: 300→700', 'wdth: 75→125', 'MONO: 0→1'];
    const glyphMetrics = {
      T: { advance: 0.65, lsb: 0.03, rsb: 0.03 },
      O: { advance: 0.78, lsb: 0.06, rsb: 0.06 },
      L: { advance: 0.58, lsb: 0.08, rsb: 0.02 },
    };
    const kerningPairs = ['T/O: -42', 'O/O: -8', 'O/L: -12'];

    function resizeCanvas() {
      canvas!.width = canvas!.offsetWidth * dpr;
      canvas!.height = canvas!.offsetHeight * dpr;
      ctx.scale(dpr, dpr);
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Measure text size — responsive to viewport
    const fontSize = Math.min(canvas.offsetWidth * 0.15, 120);
    ctx.font = `bold ${fontSize}px "Space Grotesk", sans-serif`;
    const textMetrics = ctx.measureText('TOOL');
    const textW = textMetrics.width;
    const textH = fontSize * 0.8;

    // Starting position and velocity
    let x = 40;
    let y = canvas.offsetHeight * 0.3;
    const speed = 1.2;
    let vx = speed;
    let vy = speed * 0.7;

    const CORNER_THRESHOLD = 30;

    // Header height for top boundary
    const headerH = document.querySelector('header')?.offsetHeight ?? 48;

    function isNearCorner(px: number, py: number, w: number, h: number): boolean {
      const cw = canvas!.offsetWidth;
      const ch = canvas!.offsetHeight;
      const bottomPad = 80;
      const corners = [
        [0, headerH],
        [cw - w, headerH],
        [0, ch - bottomPad - h],
        [cw - w, ch - bottomPad - h],
      ];
      return corners.some(
        ([cx, cy]) => Math.abs(px - cx) < CORNER_THRESHOLD && Math.abs(py - cy) < CORNER_THRESHOLD,
      );
    }

    function drawFrame() {
      const cw = canvas!.offsetWidth;
      const ch = canvas!.offsetHeight;
      // Bottom padding for sticky bar
      const bottomPad = 80;
      const bounceBottom = ch - bottomPad;
      const bounceTop = headerH;
      // Right boundary — tighter on mobile
      const rightPad = cw < 600 ? 8 : 0;

      ctx.clearRect(0, 0, cw, ch);
      frameCount++;

      // Update position
      x += vx;
      y += vy;

      // Bounce off edges
      let bounced = false;
      if (x <= 0) { x = 0; vx = Math.abs(vx); bounced = true; }
      if (x + textW >= cw - rightPad) { x = cw - rightPad - textW; vx = -Math.abs(vx); bounced = true; }
      if (y <= bounceTop) { y = bounceTop; vy = Math.abs(vy); bounced = true; }
      if (y + textH >= bounceBottom) { y = bounceBottom - textH; vy = -Math.abs(vy); bounced = true; }

      if (bounced) {
        bounceCount++;
        colorIndex = (colorIndex + 1) % CMYK.length;
        if (isNearCorner(x, y, textW, textH)) {
          cornerHits++;
        }
      }

      // ── HUD Layer (behind bounce) ──────────────────────────────
      const hudAlpha = 0.08;
      const hudFont = cw < 600 ? '10px' : '11px';
      ctx.font = `${hudFont} "Space Grotesk", sans-serif`;
      ctx.textBaseline = 'top';
      const lineH = cw < 600 ? 16 : 18;
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

      // Left column — Privacy / visitor telemetry
      ctx.fillStyle = `rgba(0, 0, 0, ${hudAlpha})`;
      ctx.textAlign = 'left';
      const lx = 12;
      let ly = headerH + 16;

      ctx.fillText('VISITOR TELEMETRY', lx, ly);
      ly += lineH * 1.4;
      ctx.fillText(`screen    ${screenRes} @ ${dpr}x`, lx, ly); ly += lineH;
      ctx.fillText(`color     ${colorDepth}`, lx, ly); ly += lineH;
      ctx.fillText(`timezone  ${timezone}`, lx, ly); ly += lineH;
      ctx.fillText(`locale    ${lang}`, lx, ly); ly += lineH;
      ctx.fillText(`platform  ${platform}`, lx, ly); ly += lineH;
      ctx.fillText(`cores     ${cores}`, lx, ly); ly += lineH;
      ctx.fillText(`memory    ${memory}GB`, lx, ly); ly += lineH;
      ctx.fillText(`network   ${connType} / ${downlink}`, lx, ly); ly += lineH;
      ctx.fillText(`touch     ${touchPoints} points`, lx, ly); ly += lineH;
      ctx.fillText(`gpu       ${gpuRenderer}`, lx, ly); ly += lineH;
      ly += lineH * 0.5;
      ctx.fillText(`session   ${elapsed}s`, lx, ly); ly += lineH;
      ctx.fillText(`frames    ${frameCount}`, lx, ly);

      // Right column — Design telemetry
      ctx.textAlign = 'right';
      const rx = cw - 12;
      let ry = headerH + 16;

      ctx.fillStyle = `rgba(0, 0, 0, ${hudAlpha})`;
      ctx.fillText('TYPE TELEMETRY', rx, ry);
      ry += lineH * 1.4;
      ctx.fillText('Space Grotesk Variable', rx, ry); ry += lineH;
      fontAxes.forEach((axis) => {
        ctx.fillText(axis, rx, ry);
        ry += lineH;
      });
      ry += lineH * 0.5;
      ctx.fillText('KERNING PAIRS', rx, ry); ry += lineH * 1.2;
      kerningPairs.forEach((pair) => {
        ctx.fillText(pair, rx, ry);
        ry += lineH;
      });
      ry += lineH * 0.5;
      ctx.fillText('GLYPH METRICS', rx, ry); ry += lineH * 1.2;
      for (const [glyph, m] of Object.entries(glyphMetrics)) {
        ctx.fillText(`${glyph}  adv:${m.advance}  lsb:${m.lsb}  rsb:${m.rsb}`, rx, ry);
        ry += lineH;
      }
      ry += lineH * 0.5;

      // Dynamic type data — changes with bounce
      const currentWght = 300 + (bounceCount % 5) * 100;
      const currentWdth = 75 + (bounceCount % 6) * 10;
      ctx.fillText(`wght: ${currentWght}  wdth: ${currentWdth}`, rx, ry); ry += lineH;
      ctx.fillText(`optical-size: ${fontSize.toFixed(0)}px`, rx, ry); ry += lineH;

      // Bottom center — tracking data
      ctx.textAlign = 'center';
      const bx = cw / 2;
      const by = ch - bottomPad + 10;
      ctx.fillStyle = `rgba(0, 0, 0, ${hudAlpha * 0.8})`;
      ctx.fillText(
        `pos(${Math.round(x)}, ${Math.round(y)})  vel(${vx > 0 ? '+' : ''}${vx.toFixed(1)}, ${vy > 0 ? '+' : ''}${vy.toFixed(1)})  bounces: ${bounceCount}  corners: ${cornerHits}`,
        bx,
        by,
      );

      // ── Bouncing TOOL wordmark (on top of HUD) ──────────────────
      const fSize = Math.min(cw * 0.15, 120);
      ctx.font = `bold ${fSize}px "Space Grotesk", sans-serif`;
      ctx.fillStyle = CMYK[colorIndex];
      ctx.textBaseline = 'top';
      ctx.textAlign = 'left';
      ctx.fillText('TOOL', x, y);

      requestAnimationFrame(drawFrame);
    }

    requestAnimationFrame(drawFrame);
  }

  // ── Hero typing animation ──────────────────────────────────────
  const heroTypingEl = document.querySelector('[data-anim="hero-typing"]');
  const heroTextEl = document.querySelector('.hero-typing-text') as HTMLElement | null;
  const heroCursorEl = document.querySelector('.hero-cursor') as HTMLElement | null;

  if (heroTypingEl && heroTextEl) {
    const fullText = heroTextEl.textContent || '';
    heroTextEl.textContent = '';

    // Show the container
    gsap.set(heroTypingEl, { opacity: 1 });
    if (heroCursorEl) gsap.set(heroCursorEl, { opacity: 1 });

    // Type out the text
    gsap.to(heroTextEl, {
      text: { value: fullText, delimiter: '' },
      duration: fullText.length * 0.04,
      ease: 'none',
      delay: 0.8,
      onComplete: () => {
        // Blink cursor a few times then fade out
        if (heroCursorEl) {
          gsap.to(heroCursorEl, {
            opacity: 0,
            delay: 2,
            duration: 0.3,
          });
        }
      },
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

  // ── Nav button GSAP hovers — blocky, mechanical ────────────────
  document.querySelectorAll<HTMLElement>('.nav-btn').forEach((btn) => {
    const bg = btn.style.backgroundColor || getComputedStyle(btn).backgroundColor;

    btn.addEventListener('mouseenter', () => {
      gsap.to(btn, {
        scale: 0.92,
        duration: 0.1,
        ease: 'power4.out',
        overwrite: true,
      });
      gsap.to(btn, {
        scale: 1,
        duration: 0.15,
        delay: 0.1,
        ease: 'elastic.out(1.2, 0.5)',
        overwrite: false,
      });
      gsap.to(btn, {
        backgroundColor: '#000',
        color: '#fff',
        duration: 0.12,
        ease: 'power2.out',
      });
    });

    btn.addEventListener('mouseleave', () => {
      gsap.to(btn, {
        scale: 1,
        backgroundColor: bg,
        color: '#000',
        duration: 0.2,
        ease: 'power2.out',
        overwrite: true,
      });
    });
  });
}
