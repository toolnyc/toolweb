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
  const canvas = document.getElementById('eyes-canvas') as HTMLCanvasElement | null;
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

  // ── TOOL Eyes Wordmark + Cockpit HUD ──────────────────────────
  const canvas = document.getElementById('eyes-canvas') as HTMLCanvasElement | null;
  if (canvas) {
    const ctx = canvas.getContext('2d')!;
    const dpr = window.devicePixelRatio || 1;

    // Mouse tracking for eye pupils
    let mouseX = 0;
    let mouseY = 0;

    document.addEventListener('mousemove', (e) => { mouseX = e.clientX; mouseY = e.clientY; });

    // SVG coordinate reference (from wordmark-k.svg viewBox 0 0 597.93 164.33)
    const SVG_W = 597.93;
    const SVG_H = 164.33;
    const SVG_EYE1 = { cx: 249.17, cy: 82.17, r: 77.67 };
    const SVG_EYE2 = { cx: 370.03, cy: 82.17, r: 77.67 };

    // Generate tinted wordmark SVGs as data URIs (T and L only, no circles — we draw those)
    function makeWordmarkSvg(tFill: string, lFill: string): string {
      return `<svg xmlns="http://www.w3.org/2000/svg" width="597.93" height="164.33" viewBox="0 0 597.93 164.33">
        <g><polygon points="30.63 148.22 30.63 96.51 4.5 96.51 4.5 16.12 181.12 16.12 181.12 96.51 154.99 96.51 154.99 148.22 30.63 148.22" fill="${tFill}"/>
        <path d="M176.62,20.62v71.4h-26.13v51.7H35.13v-51.7H9V20.62h167.62M185.62,11.62H0v89.4h26.13v51.7h133.36v-51.7h26.13V11.62h0Z" fill="#231f20"/></g>
        <g><polygon points="438.1 148.22 438.1 16.12 562.46 16.12 562.46 86.67 593.43 86.67 593.43 148.22 438.1 148.22" fill="${lFill}"/>
        <path d="M557.96,20.62v70.55h30.97v52.55h-146.33V20.62h115.36M566.96,11.62h-133.36v141.1h164.33v-70.55h-30.97V11.62h0Z" fill="#231f20"/></g>
      </svg>`;
    }

    // Single white variant — no color changes
    const variant = { tFill: '#fff', lFill: '#fff', lidFill: '#fff' };

    const wordmarkImg = new Image();
    let wordmarkLoaded = false;
    wordmarkImg.onload = () => { wordmarkLoaded = true; };
    wordmarkImg.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(makeWordmarkSvg('#fff', '#fff'));

    function resizeCanvas() {
      canvas!.width = canvas!.offsetWidth * dpr;
      canvas!.height = canvas!.offsetHeight * dpr;
      ctx.scale(dpr, dpr);
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const headerH = document.querySelector('header')?.offsetHeight ?? 48;

    // Blink state — droopy lids default ~48% closed (stoned)
    const DROOP = 0.48;
    let blinkPhase = 0;
    let lastBlinkTime = Date.now();
    const BLINK_INTERVAL = 6000; // less frequent
    const BLINK_DURATION = 200;

    // No color cycle — stays white

    function drawFrame() {
      const cw = canvas!.offsetWidth;
      const ch = canvas!.offsetHeight;
      const availH = ch - headerH - 80;

      ctx.clearRect(0, 0, cw, ch);
      const now = Date.now();

      // ── Blink logic — elastic human-like blink ───
      if (now - lastBlinkTime > BLINK_INTERVAL) {
        blinkPhase = 1;
        lastBlinkTime = now;
      }
      let lidClose = DROOP;
      if (blinkPhase > 0) {
        const blinkElapsed = now - lastBlinkTime;
        // Asymmetric blink: fast close (40%), slower open with elastic overshoot (60%)
        const closeTime = BLINK_DURATION * 0.35;
        const openTime = BLINK_DURATION * 0.65;
        if (blinkElapsed < closeTime) {
          // Fast ease-in close
          const t = blinkElapsed / closeTime;
          const eased = t * t; // accelerate into close
          lidClose = DROOP + (1 - DROOP) * eased;
        } else if (blinkElapsed < BLINK_DURATION) {
          // Slower open with slight overshoot (opens past droop then settles)
          const t = (blinkElapsed - closeTime) / openTime;
          // Elastic ease-out: overshoots slightly then settles
          const eased = 1 - Math.pow(1 - t, 3) * Math.cos(t * Math.PI * 0.5);
          lidClose = DROOP + (1 - DROOP) * (1 - eased);
        } else {
          blinkPhase = 0;
          lidClose = DROOP;
        }
      }
      // ── Draw the TOOL wordmark ─────────────────────────────────
      if (wordmarkLoaded) {
        const targetW = Math.min(cw < 768 ? cw * 0.7 : cw * 0.45, 420);
        const scale = targetW / SVG_W;
        const targetH = SVG_H * scale;
        const wmX = (cw - targetW) / 2;
        const wmY = headerH + availH * 0.35 - targetH / 2;

        // Draw T and L (white fill, black strokes from the SVG path)
        ctx.drawImage(wordmarkImg, wmX, wmY, targetW, targetH);

        // Map SVG eye coordinates to canvas
        const eye1X = wmX + SVG_EYE1.cx * scale;
        const eye1Y = wmY + SVG_EYE1.cy * scale;
        const eye2X = wmX + SVG_EYE2.cx * scale;
        const eye2Y = wmY + SVG_EYE2.cy * scale;
        const eyeR = SVG_EYE1.r * scale;
        const strokeW = 9 * scale;

        const rect = canvas!.getBoundingClientRect();

        for (const [ex, ey] of [[eye1X, eye1Y], [eye2X, eye2Y]]) {
          const innerR = eyeR - strokeW * 0.5;
          const lidBottom = ey - innerR + (innerR * 2) * lidClose;
          const sag = eyeR * 0.15;

          // Circle base — CMYK fill, always black stroke (like the T/L)
          ctx.beginPath();
          ctx.arc(ex, ey, eyeR, 0, Math.PI * 2);
          ctx.fillStyle = variant.lidFill;
          ctx.fill();
          ctx.strokeStyle = '#231f20';
          ctx.lineWidth = strokeW;
          ctx.stroke();

          // Clip to the exposed eye area (below the lid arc, inside the circle)
          // This ensures pupils can't draw on top of the lid
          ctx.save();
          ctx.beginPath();
          // Start with the lid arc
          ctx.moveTo(ex - innerR, lidBottom);
          ctx.quadraticCurveTo(ex, lidBottom + sag, ex + innerR, lidBottom);
          // Down and around the bottom half of the circle
          ctx.arc(ex, ey, innerR, Math.acos(Math.max(-1, Math.min(1, (ex + innerR - ex) / innerR))), Math.PI, false);
          // Use a proper arc for the bottom
          ctx.closePath();
          // Actually, let's use a simpler clip: lid arc down to bottom of circle
          ctx.restore();

          ctx.save();
          ctx.beginPath();
          // Build clip path: lid arc across top, then circle arc around the bottom
          ctx.moveTo(ex - innerR, lidBottom);
          ctx.quadraticCurveTo(ex, lidBottom + sag, ex + innerR, lidBottom);
          // Arc from right side down around bottom to left side
          const startAngle = Math.atan2(lidBottom - ey, innerR);
          const endAngle = Math.atan2(lidBottom - ey, -innerR);
          ctx.arc(ex, ey, innerR, startAngle, endAngle, false);
          ctx.closePath();
          ctx.clip();

          // White eye area
          ctx.fillStyle = '#fff';
          ctx.fillRect(ex - innerR, lidBottom - sag, innerR * 2, innerR * 2);

          // Pupil — always black, tracks mouse, default position slightly lower
          const relX = mouseX - rect.left - ex;
          const relY = mouseY - rect.top - ey;
          const dist = Math.sqrt(relX * relX + relY * relY);
          const pupilR = eyeR * 0.42;
          const maxTravel = eyeR - pupilR - strokeW;
          const clampDist = Math.min(dist, maxTravel);
          const angle = Math.atan2(relY, relX);
          // Default resting position is slightly below center
          const restY = ey + eyeR * 0.12;
          const dotX = ex + Math.cos(angle) * clampDist * 0.4;
          const dotY = restY + Math.sin(angle) * clampDist * 0.4;

          ctx.beginPath();
          ctx.ellipse(dotX, dotY, pupilR, pupilR * 1.08, 0, 0, Math.PI * 2);
          ctx.fillStyle = '#231f20';
          ctx.fill();

          // Cute highlight — small white circle for cartoonish reflection
          const hlX = dotX - pupilR * 0.28;
          const hlY = dotY - pupilR * 0.3;
          ctx.beginPath();
          ctx.arc(hlX, hlY, pupilR * 0.22, 0, Math.PI * 2);
          ctx.fillStyle = '#fff';
          ctx.fill();

          ctx.restore(); // removes clip

          // Lid arc stroke on top — always black, same weight as logo
          ctx.save();
          ctx.beginPath();
          ctx.arc(ex, ey, innerR, 0, Math.PI * 2);
          ctx.clip();
          ctx.strokeStyle = '#231f20';
          ctx.lineWidth = strokeW;
          ctx.beginPath();
          ctx.moveTo(ex - innerR, lidBottom);
          ctx.quadraticCurveTo(ex, lidBottom + sag, ex + innerR, lidBottom);
          ctx.stroke();
          ctx.restore();

          // Re-stroke circle — always black
          ctx.beginPath();
          ctx.arc(ex, ey, eyeR, 0, Math.PI * 2);
          ctx.strokeStyle = '#231f20';
          ctx.lineWidth = strokeW;
          ctx.stroke();
        }
      }

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

  // ── Portfolio items — staggered reveal on scroll ─────────────
  ScrollTrigger.batch('.portfolio-item', {
    start: 'top 85%',
    once: true,
    onEnter: (batch) => {
      gsap.to(batch, {
        opacity: 1,
        y: 0,
        duration: 0.8,
        stagger: 0.1,
        ease: 'power2.out',
      });
    },
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
