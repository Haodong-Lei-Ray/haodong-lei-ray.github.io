/**
 * Academic Personal Homepage — Haodong Lei
 * Lightweight vanilla JS for theme toggle & interactions
 */

(function () {
  'use strict';

  // ---- Theme Toggle ----
  const html = document.documentElement;
  const toggleBtn = document.getElementById('themeToggle');

  // Load saved preference
  const savedTheme = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

  if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
    html.setAttribute('data-theme', 'dark');
  } else {
    html.setAttribute('data-theme', 'light');
  }

  if (toggleBtn) {
    toggleBtn.addEventListener('click', function () {
      const current = html.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      html.setAttribute('data-theme', next);
      localStorage.setItem('theme', next);
    });
  }

  // ---- Smooth reveal on scroll (simple fade-in) ----
  const observerOptions = {
    root: null,
    rootMargin: '0px 0px -40px 0px',
    threshold: 0.1,
  };

  const observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
      }
    });
  }, observerOptions);

  // Observe section elements for subtle entrance animation
  document.querySelectorAll('.timeline-item, .pub-card').forEach(function (el) {
    el.style.opacity = '0';
    el.style.transform = 'translateY(16px)';
    el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    observer.observe(el);
  });

  // ---- Active nav link highlight on scroll (future nav) ----
  // Reserved for multi-page nav expansion if needed later.
})();
