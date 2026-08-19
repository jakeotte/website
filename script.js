/* ---- Background canvas ---- */
document.addEventListener('DOMContentLoaded', initCanvas);

function initCanvas() {
    const canvas = document.getElementById('bg-canvas');
    if (!canvas || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const ctx = canvas.getContext('2d');
    let W, H, frameId;
    const particles = [];

    const resize = () => {
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        W = window.innerWidth;
        H = window.innerHeight;
        canvas.width = Math.floor(W * ratio);
        canvas.height = Math.floor(H * ratio);
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    };
    const spawn  = () => ({
        x: Math.random() * W, y: Math.random() * H,
        r: Math.random() * 1.2 + 0.3,
        vx: (Math.random() - 0.5) * 0.18,
        vy: (Math.random() - 0.5) * 0.18,
        a: Math.random()
    });

    resize();
    window.addEventListener('resize', resize, { passive: true });
    for (let i = 0; i < 42; i++) particles.push(spawn());

    function tick() {
        ctx.clearRect(0, 0, W, H);
        particles.forEach(p => {
            p.x += p.vx; p.y += p.vy;
            if (p.x < 0 || p.x > W || p.y < 0 || p.y > H) Object.assign(p, spawn());
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(220,220,220,${p.a * 0.4})`;
            ctx.fill();
        });
        frameId = requestAnimationFrame(tick);
    }

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            cancelAnimationFrame(frameId);
        } else {
            frameId = requestAnimationFrame(tick);
        }
    });

    frameId = requestAnimationFrame(tick);
}
