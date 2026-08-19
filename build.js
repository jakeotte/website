#!/usr/bin/env node
'use strict';

const fs   = require('fs');
const path = require('path');
const MarkdownIt = require('markdown-it');

const md = new MarkdownIt({ html: false, linkify: true, typographer: true });

// The page title owns the single h1. Markdown section headings start at h2.
for (const rule of ['heading_open', 'heading_close']) {
    md.renderer.rules[rule] = (tokens, idx, options, env, self) => {
        if (tokens[idx].tag === 'h1') tokens[idx].tag = 'h2';
        return self.renderToken(tokens, idx, options);
    };
}

const POSTS_DIR = path.join(__dirname, 'posts');
const ROOT_DIR  = __dirname;

const posts = JSON.parse(fs.readFileSync(path.join(POSTS_DIR, 'index.json'), 'utf-8'));
posts.sort((a, b) => new Date(b.date) - new Date(a.date));

function fmtLong(s) {
    return new Date(s + 'T12:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long',  day: 'numeric' });
}
function fmtShort(s) {
    return new Date(s + 'T12:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}
function esc(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function excerpt(mdText) {
    const lines = mdText.split('\n');
    let para = '';
    for (const line of lines) {
        const t = line.trim();
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
    para = para
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/`[^`]+`/g, m => m.slice(1, -1))
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/_([^_]+)_/g, '$1');
    if (para.length > 480) para = para.slice(0, 480).replace(/\s+\S*$/, '');
    return para;
}

function formatFigures(html) {
    return html
        .replace(
            /<blockquote>\s*<p>\s*(<img\b[^>]*>)\s*<em>([\s\S]*?)<\/em>\s*<\/p>\s*<\/blockquote>/g,
            '<figure>$1<figcaption>$2</figcaption></figure>'
        )
        .replace(
            /<blockquote>\s*<p>\s*(<img\b[^>]*>)\s*<\/p>\s*<\/blockquote>/g,
            '<figure>$1</figure>'
        );
}

// ── Generate post pages ────────────────────────────────────────────────────────

posts.forEach((post, idx) => {
    const mdPath = path.join(POSTS_DIR, post.file);
    if (!fs.existsSync(mdPath)) { console.warn(`SKIP (not found): ${post.file}`); return; }

    const markdown  = fs.readFileSync(mdPath, 'utf-8');
    const bodyHtml  = formatFigures(md.render(markdown));
    const words     = markdown.split(/\s+/).length;
    const mins      = Math.max(1, Math.round(words / 200));

    const prev = posts[idx + 1];
    const next = posts[idx - 1];

    const navHtml = `<div class="post-nav">
            ${prev
                ? `<a href="${prev.slug}.html" class="post-nav-link post-nav-prev">
                <span class="post-nav-dir">← Older</span>
                <span class="post-nav-title">${esc(prev.title)}</span>
            </a>`
                : '<span></span>'}
            ${next
                ? `<a href="${next.slug}.html" class="post-nav-link post-nav-next">
                <span class="post-nav-dir">Newer →</span>
                <span class="post-nav-title">${esc(next.title)}</span>
            </a>`
                : '<span></span>'}
        </div>`;

    const desc    = esc(post.summary || '');
    const title   = esc(post.title);
    const pageUrl = `https://jakeotte.com/posts/${post.slug}.html`;
    const ogImage = `https://jakeotte.com/${post.image || 'assets/square.jpg'}`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title} – Jake Otte</title>
    <meta name="description" content="${desc}" />
    <meta property="og:title" content="${title} – Jake Otte" />
    <meta property="og:description" content="${desc}" />
    <meta property="og:type" content="article" />
    <meta property="og:url" content="${pageUrl}" />
    <meta property="og:image" content="${ogImage}" />
    <meta property="og:site_name" content="Jake Otte" />
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content="${title} – Jake Otte" />
    <meta name="twitter:description" content="${desc}" />
    <link rel="canonical" href="${pageUrl}" />
    <link rel="stylesheet" href="../style.css" />
    <link rel="icon" href="../assets/img/favicons/favicon.ico" />
    <link rel="icon" type="image/png" sizes="32x32" href="../assets/img/favicons/favicon-32x32.png" />
    <link rel="icon" type="image/png" sizes="16x16" href="../assets/img/favicons/favicon-16x16.png" />
    <link rel="apple-touch-icon" sizes="180x180" href="../assets/img/favicons/apple-touch-icon.png" />
    <link rel="mask-icon" href="../assets/img/favicons/safari-pinned-tab.svg" color="#c9e3f6" />
</head>

<body class="page">

    <a class="skip-link" href="#post-main">Skip to article</a>
    <canvas id="bg-canvas"></canvas>

    <header>
        <div class="header-top">
            <a class="brand" href="../index.html">
                <h1>&gt; Jake Otte</h1>
                <p class="tag">Offensive Security</p>
            </a>
            <nav class="nav">
                <a href="../index.html">Home</a>
                <a href="../about.html">About</a>
                <a href="https://jotter.gitbook.io/red-team/" target="_blank" rel="noopener noreferrer">Notes <span aria-hidden="true">↗</span></a>
                <a href="../contact.html">Contact</a>
            </nav>
        </div>
    </header>

    <main id="post-main">
        <div class="post-view-content">
            <a href="../index.html#research" class="post-back-link">← Research &amp; Posts</a>
            <article class="post-article">
                <header class="post-heading">
                    <h1>${title}</h1>
                    <div class="post-meta">
                        <time datetime="${post.date}">${fmtLong(post.date)}</time>
                        <span aria-hidden="true">·</span>
                        <span>${mins} min read</span>
                    </div>
                    <p class="post-deck">${desc}</p>
                </header>
                <div class="post-body">${bodyHtml}</div>
            </article>
            ${navHtml}
        </div>
    </main>

    <footer>
        <div class="footer-inner">
            <div class="footer-left">
                <div class="footer-nav">
                    <a href="../index.html">Home</a>
                    <a href="../about.html">About</a>
                    <a href="https://jotter.gitbook.io/red-team/" target="_blank" rel="noopener noreferrer">Notes</a>
                    <a href="../contact.html">Contact</a>
                    <a href="https://github.com/jakeotte" target="_blank" rel="noopener noreferrer">GitHub</a>
                </div>
                <p class="copyright">© 2026 Jake Otte — Offensive Security</p>
            </div>
        </div>
    </footer>

    <div id="reading-progress"></div>

    <script>
    const bar = document.getElementById('reading-progress');
    window.addEventListener('scroll', () => {
        const h = document.documentElement.scrollHeight - window.innerHeight;
        bar.style.width = (h > 0 ? (window.scrollY / h) * 100 : 0) + '%';
    }, { passive: true });
    </script>

    <script defer src="../script.js"></script>
</body>
</html>`;

    fs.writeFileSync(path.join(POSTS_DIR, `${post.slug}.html`), html);
    console.log(`  posts/${post.slug}.html`);
});

// ── Update index.html ──────────────────────────────────────────────────────────

const postsHtml = posts.map((post, idx) => {
    const mdPath   = path.join(POSTS_DIR, post.file);
    const markdown = fs.existsSync(mdPath) ? fs.readFileSync(mdPath, 'utf-8') : '';
    const opening  = markdown ? excerpt(markdown) : '';
    const ex       = opening.length >= 100 && /[.!?][\"']?$/.test(opening.trim())
        ? opening
        : (post.summary || opening);
    const mins     = Math.max(1, Math.round(markdown.split(/\s+/).length / 200));
    const excerptBlock = ex
        ? `\n            <div class="post-excerpt-wrap">\n                <p class="post-excerpt">${esc(ex)}</p>\n                <div class="post-excerpt-fade"></div>\n            </div>`
        : '';
    return `        <a class="post${idx === 0 ? ' featured' : ''}" href="posts/${post.slug}.html">
            <div class="post-header">
                <div class="post-details">
                    <time class="post-date" datetime="${post.date}">${fmtShort(post.date)}</time>
                    <span class="post-meta-separator" aria-hidden="true">·</span>
                    <span class="post-card-read-time">${mins} min read</span>
                </div>
                <span class="post-arrow">→</span>
            </div>
            <p class="post-title">${esc(post.title)}</p>${excerptBlock}
        </a>`;
}).join('\n');

let indexHtml = fs.readFileSync(path.join(ROOT_DIR, 'index.html'), 'utf-8');

// Replace post count
indexHtml = indexHtml.replace(
    /<p class="section-subtitle" id="post-count">[^<]*<\/p>/,
    `<p class="section-subtitle" id="post-count">${posts.length} posts</p>`
);

// Replace between the BUILD markers (idempotent)
const BEGIN = '<!-- BEGIN:POSTS -->';
const END   = '<!-- END:POSTS -->';
if (indexHtml.includes(BEGIN)) {
    indexHtml = indexHtml.replace(
        new RegExp(`${BEGIN}[\\s\\S]*?${END}`),
        `${BEGIN}\n${postsHtml}\n        ${END}`
    );
} else {
    // First run: wrap existing posts div content
    indexHtml = indexHtml.replace(
        '<div id="posts"></div>',
        `<div id="posts">\n        ${BEGIN}\n${postsHtml}\n        ${END}\n        </div>`
    );
}

fs.writeFileSync(path.join(ROOT_DIR, 'index.html'), indexHtml);
console.log('  index.html');

// ── Generate sitemap.xml ───────────────────────────────────────────────────────

const SITE = 'https://jakeotte.com';
const today = new Date().toISOString().slice(0, 10);

const staticUrls = [
    { loc: `${SITE}/`,             lastmod: today },
    { loc: `${SITE}/about.html`,   lastmod: today },
    { loc: `${SITE}/contact.html`, lastmod: today },
];
const postUrls = posts.map(post => ({
    loc: `${SITE}/posts/${post.slug}.html`,
    lastmod: post.date,
}));

const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...staticUrls, ...postUrls].map(u => `    <url>
        <loc>${u.loc}</loc>
        <lastmod>${u.lastmod}</lastmod>
    </url>`).join('\n')}
</urlset>
`;

fs.writeFileSync(path.join(ROOT_DIR, 'sitemap.xml'), sitemapXml);
console.log('  sitemap.xml');
console.log(`\nBuilt ${posts.length} posts.`);
