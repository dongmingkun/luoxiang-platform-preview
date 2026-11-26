const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

function animateCount(el) {
  const target = Number(el.dataset.count || 0);
  if (!Number.isFinite(target) || target <= 0) {
    el.textContent = '0';
    return;
  }
  if (reduceMotion) {
    el.textContent = target.toLocaleString('zh-CN');
    return;
  }
  const start = performance.now();
  const duration = 850;
  const tick = now => {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = Math.round(target * eased).toLocaleString('zh-CN');
    if (t < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

document.querySelectorAll('[data-count]').forEach(el => {
  animateCount(el);
});

const revealItems = document.querySelectorAll('.show-section, .show-stats, .show-boundary');
revealItems.forEach(el => el.classList.add('show-reveal'));

if (reduceMotion || !('IntersectionObserver' in window)) {
  revealItems.forEach(el => el.classList.add('is-in'));
} else {
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-in');
        observer.unobserve(entry.target);
      }
    }
  }, { threshold: 0.08 });
  revealItems.forEach(el => observer.observe(el));
}
