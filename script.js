/* ============================================================
   Jake Otte – Post List Loader
   ============================================================ */

let allPosts = [];

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('posts')) loadPosts();
    initCanvas();
});

async function loadPosts() {
    const container = document.getElementById('posts');
    try {
        const r = await fetch('posts/index.json', { cache: 'no-store' });
        if (!r.ok) throw new Error();
        allPosts = await r.json();
        allPosts.sort((a, b) => new Date(b.date) - new Date(a.date));

        const countEl = document.getElementById('post-count');
        if (countEl) countEl.textContent = allPosts.length + ' posts';

        // Fetch first paragraph from each post in parallel
        await Promise.all(allPosts.map(async post => {
            try {
                const r = await fetch(`posts/${encodeURIComponent(post.file)}`, { cache: 'no-store' });
                const md = await r.text();
                post._excerpt = extractExcerpt(md);
            } catch {
                post._excerpt = '';
            }
        }));

        renderPosts();
    } catch (e) {
        container.innerHTML = '<p style="color:var(--text-soft);font-size:0.82rem;padding:1.5rem 0;">Failed to load posts.</p>';
    }
}

/* Pull the first substantial prose paragraph out of raw markdown */
function extractExcerpt(md) {
    const lines = md.split('\n');
    let para = '';
    for (const line of lines) {
        const t = line.trim();
        // Skip headings, blank lines, images, code fences, blockquotes, html
        if (!t) { if (para) break; continue; }
        if (/^#{1,6}\s/.test(t)) continue;
        if (/^[`~]{3}/.test(t)) continue;
        if (/^!\[/.test(t)) continue;
        if (/^>/.test(t)) continue;
        if (/^</.test(t)) continue;
        if (/^[-*+]\s/.test(t)) continue;
        para += (para ? ' ' : '') + t;
        if (para.length > 200) break;
    }
    // Strip remaining inline markdown: bold, italic, code, links
    para = para
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')  // links
        .replace(/`[^`]+`/g, m => m.slice(1,-1))   // inline code
        .replace(/\*\*([^*]+)\*\*/g, '$1')          // bold
        .replace(/\*([^*]+)\*/g, '$1')              // italic
        .replace(/_([^_]+)_/g, '$1');               // underscore italic
    // Trim to ~480 chars at a word boundary
    if (para.length > 480) {
        para = para.slice(0, 480).replace(/\s+\S*$/, '');
    }
    return para;
}

function renderPosts() {
    const container = document.getElementById('posts');
    container.innerHTML = '';

    allPosts.forEach(post => {
        const a = document.createElement('a');
        a.className = 'post';
        a.href = `posts/post.html?slug=${post.slug}`;
        a.innerHTML = `
            <div class="post-header">
                <span class="post-date">${formatDate(post.date)}</span>
                <span class="post-arrow">→</span>
            </div>
            <p class="post-title">${post.title}</p>
            ${post._excerpt ? `
            <div class="post-excerpt-wrap">
                <p class="post-excerpt">${post._excerpt}</p>
                <div class="post-excerpt-fade"></div>
            </div>
            ` : ''}
        `;
        container.appendChild(a);
    });
}

function formatDate(s) {
    try {
        return new Date(s + 'T12:00:00').toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric'
        });
    } catch { return s; }
}

/* ---- Background canvas ---- */
function initCanvas() {
    const canvas = document.getElementById('bg-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let W, H, particles = [];

    const resize = () => { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; };
    const spawn  = () => ({
        x: Math.random() * W, y: Math.random() * H,
        r: Math.random() * 1.2 + 0.3,
        vx: (Math.random() - 0.5) * 0.18,
        vy: (Math.random() - 0.5) * 0.18,
        a: Math.random()
    });

    resize();
    window.addEventListener('resize', resize);
    for (let i = 0; i < 60; i++) particles.push(spawn());

    (function tick() {
        ctx.clearRect(0, 0, W, H);
        particles.forEach(p => {
            p.x += p.vx; p.y += p.vy;
            if (p.x < 0 || p.x > W || p.y < 0 || p.y > H) Object.assign(p, spawn());
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(220,220,220,${p.a * 0.4})`;
            ctx.fill();
        });
        requestAnimationFrame(tick);
    })();
}
