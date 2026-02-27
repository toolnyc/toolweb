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

    // Gather visitor telemetry
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const lang = navigator.language;
    const platform = (navigator as any).userAgentData?.platform || navigator.platform || 'unknown';
    const cores = navigator.hardwareConcurrency || 0;
    const connection = (navigator as any).connection;
    const connType = connection?.effectiveType || '?';
    const downlink = connection?.downlink ? `${connection.downlink}Mbps` : '?';

    // GPU detection
    let gpuRenderer = 'unknown';
    try {
      const gl = document.createElement('canvas').getContext('webgl');
      if (gl) {
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        if (ext) gpuRenderer = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL);
      }
    } catch { /* noop */ }
    if (gpuRenderer.length > 32) gpuRenderer = gpuRenderer.slice(0, 30) + '..';

    // Dynamic telemetry — tracked per frame
    let mouseX = 0;
    let mouseY = 0;

    document.addEventListener('mousemove', (e) => { mouseX = e.clientX; mouseY = e.clientY; });

    // Location telemetry via Cloudflare /cdn-cgi/trace (no API key, works on any CF site)
    let cfLocation = '...';
    let cfIp = '...';
    let cfColo = '...';
    let cfTls = '...';
    let cfHttp = '...';

    fetch('/cdn-cgi/trace')
      .then((r) => r.text())
      .then((text) => {
        const data: Record<string, string> = {};
        text.split('\n').forEach((line) => {
          const [k, v] = line.split('=');
          if (k && v) data[k.trim()] = v.trim();
        });
        cfIp = data.ip || '?';
        cfLocation = data.loc || '?';
        cfColo = data.colo || '?';
        cfTls = data.tls ? `TLS ${data.tls}` : '?';
        cfHttp = data.http || '?';
      })
      .catch(() => { /* noop — not on Cloudflare */ });

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

      // Left column — Visitor telemetry (vertically centered)
      const leftLines = [
        'VISITOR TELEMETRY',
        '',
        `ip        ${cfIp}`,
        `loc       ${cfLocation}`,
        `colo      ${cfColo}`,
        `platform  ${platform}`,
        `cores     ${cores}`,
        `network   ${connType} / ${downlink}`,
        `gpu       ${gpuRenderer}`,
        '',
        `mouse     ${mouseX}, ${mouseY}`,
        `session   ${elapsed}s`,
        `frames    ${frameCount}`,
      ];
      const leftBlockH = leftLines.length * lineH;
      const availH = bounceBottom - bounceTop;
      let ly = bounceTop + (availH - leftBlockH) / 2;
      const lx = 12;
      ctx.fillStyle = `rgba(0, 0, 0, ${hudAlpha})`;
      ctx.textAlign = 'left';
      for (const line of leftLines) {
        if (line === '') { ly += lineH * 0.4; continue; }
        ctx.fillText(line, lx, ly);
        ly += lineH;
      }

      // Right column — Type + connection telemetry (vertically centered)
      const currentWght = 300 + (bounceCount % 5) * 100;
      const currentWdth = 75 + (bounceCount % 6) * 10;
      const rightLines = [
        'TYPE TELEMETRY',
        '',
        'Space Grotesk Variable',
        ...fontAxes,
        '',
        `wght: ${currentWght}  wdth: ${currentWdth}`,
        `optical-size: ${fontSize.toFixed(0)}px`,
        '',
        `tls       ${cfTls}`,
        `http      ${cfHttp}`,
        `timezone  ${timezone}`,
        `locale    ${lang}`,
      ];
      const rightBlockH = rightLines.length * lineH;
      let ry = bounceTop + (availH - rightBlockH) / 2;
      const rx = cw - 12;
      ctx.fillStyle = `rgba(0, 0, 0, ${hudAlpha})`;
      ctx.textAlign = 'right';
      for (const line of rightLines) {
        if (line === '') { ry += lineH * 0.4; continue; }
        ctx.fillText(line, rx, ry);
        ry += lineH;
      }

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

  // ── Hover Tier 1: "Punch" — nav buttons, squash/bounce + color invert ──
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

  // ── Hover Tier 2: "Flat" — service/process cards, subtle scale + CMYK fill ──
  const cmykColors: Record<string, string> = {
    cyan: '#00FFFF',
    magenta: '#FF00FF',
    yellow: '#FFEB00',
  };

  // Service cards — CMYK fill hover
  document.querySelectorAll<HTMLElement>('.service-card').forEach((card) => {
    const hoverAttr = card.dataset.hover;
    const hoverColor = (hoverAttr && cmykColors[hoverAttr]) || '#FFEB00';
    const isMagenta = hoverAttr === 'magenta';

    card.addEventListener('mouseenter', () => {
      gsap.to(card, {
        scale: 0.97,
        duration: 0.12,
        ease: 'power2.out',
        overwrite: true,
      });
      gsap.to(card, {
        scale: 1,
        duration: 0.2,
        delay: 0.12,
        ease: 'elastic.out(1, 0.6)',
        overwrite: false,
      });
      gsap.to(card, {
        backgroundColor: hoverColor,
        duration: 0.15,
        ease: 'power2.out',
      });
      card.querySelectorAll<HTMLElement>('p, span').forEach((el) => {
        gsap.to(el, {
          color: isMagenta ? '#fff' : '#000',
          duration: 0.15,
          ease: 'power2.out',
        });
      });
    });

    card.addEventListener('mouseleave', () => {
      gsap.to(card, {
        scale: 1,
        backgroundColor: '#fff',
        duration: 0.2,
        ease: 'power2.out',
        overwrite: true,
      });
      card.querySelectorAll<HTMLElement>('p, span').forEach((el) => {
        const isCaption = el.classList.contains('text-caption-gray');
        gsap.to(el, {
          color: isCaption ? '' : '#171717',
          duration: 0.2,
          ease: 'power2.out',
          clearProps: isCaption ? 'color' : undefined,
        });
      });
    });
  });

  // Process cards — progressive cyan opacity (step 1=20%, 2=40%, 3=60%, 4=80%, 5=100%)
  document.querySelectorAll<HTMLElement>('.process-card').forEach((card) => {
    const step = parseInt(card.dataset.step || '5', 10);
    const opacity = step * 0.2;
    // Blend cyan with white at the given opacity
    const r = Math.round(255 * (1 - opacity));
    const g = 255;
    const b = 255;
    const hoverColor = `rgb(${r}, ${g}, ${b})`;

    card.addEventListener('mouseenter', () => {
      gsap.to(card, {
        scale: 0.97,
        duration: 0.12,
        ease: 'power2.out',
        overwrite: true,
      });
      gsap.to(card, {
        scale: 1,
        duration: 0.2,
        delay: 0.12,
        ease: 'elastic.out(1, 0.6)',
        overwrite: false,
      });
      gsap.to(card, {
        backgroundColor: hoverColor,
        duration: 0.15,
        ease: 'power2.out',
      });
      card.querySelectorAll<HTMLElement>('p, span').forEach((el) => {
        gsap.to(el, { color: '#000', duration: 0.15, ease: 'power2.out' });
      });
    });

    card.addEventListener('mouseleave', () => {
      gsap.to(card, {
        scale: 1,
        backgroundColor: '#fff',
        duration: 0.2,
        ease: 'power2.out',
        overwrite: true,
      });
      card.querySelectorAll<HTMLElement>('p, span').forEach((el) => {
        const isCaption = el.classList.contains('text-caption-gray');
        gsap.to(el, {
          color: isCaption ? '' : '#171717',
          duration: 0.2,
          ease: 'power2.out',
          clearProps: isCaption ? 'color' : undefined,
        });
      });
    });
  });

  // ── Hover: "Let's talk" CTA — same punch as nav buttons ──
  document.querySelectorAll<HTMLElement>('.cmyk-highlight').forEach((btn) => {
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
        backgroundColor: '#00FFFF',
        duration: 0.12,
        ease: 'power2.out',
      });
    });

    btn.addEventListener('mouseleave', () => {
      gsap.to(btn, {
        scale: 1,
        backgroundColor: '#FFEB00',
        duration: 0.2,
        ease: 'power2.out',
        overwrite: true,
      });
    });
  });
}
