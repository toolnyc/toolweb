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
} else {
  // ── Lenis smooth scroll ───────────────────────────────────────
  const lenis = new Lenis();

  lenis.on('scroll', ScrollTrigger.update);

  gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
  });
  gsap.ticker.lagSmoothing(0);

  // ── Hero entrance (on page load, not scroll) ─────────────────
  const heroTitle = document.querySelector('[data-anim="hero-title"]');
  const heroSubtitle = document.querySelector('[data-anim="hero-subtitle"]');

  if (heroTitle) {
    gsap.to(heroTitle, {
      opacity: 1,
      y: 0,
      duration: 1,
      ease: 'power3.out',
      delay: 0.1,
    });
  }

  if (heroSubtitle) {
    gsap.to(heroSubtitle, {
      opacity: 1,
      y: 0,
      duration: 1,
      ease: 'power3.out',
      delay: 0.3,
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
