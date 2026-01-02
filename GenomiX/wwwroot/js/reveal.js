(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;

    const items = document.querySelectorAll('.reveal');
    if (!items.length) return;

    const io = new IntersectionObserver((entries) => {
        for (const e of entries) {
            if (e.isIntersecting) {
                e.target.classList.add('is-in');
                io.unobserve(e.target);
            }
        }
    }, { threshold: 0.14, rootMargin: '0px 0px -10% 0px' });

    items.forEach(el => io.observe(el));

    requestAnimationFrame(() => {
        document.querySelectorAll('.home-hero .reveal').forEach(el => el.classList.add('is-in'));
    });
})();
