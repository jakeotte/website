#!/usr/bin/env node
'use strict';

const fs   = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
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

// External posts live on another site (e.g. the company blog). We render a
// card that links out, but generate no local page and no sitemap entry.
function postHref(post, fromIndex) {
    if (post.external) return post.url;
    return `${fromIndex ? 'posts/' : ''}${post.slug}.html`;
}
function postLinkAttrs(post) {
    return post.external ? ' target="_blank" rel="noopener noreferrer"' : '';
}

function fmtLong(s) {
    return new Date(s + 'T12:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long',  day: 'numeric' });
}
function fmtShort(s) {
    return new Date(s + 'T12:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}
function esc(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
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

// ── Images ────────────────────────────────────────────────────────────────────
// Read pixel dimensions from the file header so the browser can reserve space
// before the image loads (no layout shift). Supports PNG, JPEG, and GIF.
function imageSize(file) {
    const b = fs.readFileSync(file);
    if (b.length > 24 && b.readUInt32BE(0) === 0x89504e47) {
        return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
    }
    if (b.length > 10 && b.toString('ascii', 0, 3) === 'GIF') {
        return { w: b.readUInt16LE(6), h: b.readUInt16LE(8) };
    }
    if (b[0] === 0xff && b[1] === 0xd8) {
        let i = 2;
        while (i + 9 < b.length) {
            if (b[i] !== 0xff) { i++; continue; }
            const marker = b[i + 1];
            const len = b.readUInt16BE(i + 2);
            // SOF0–SOF15, excluding DHT (C4), JPG (C8), DAC (CC)
            if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
                return { w: b.readUInt16BE(i + 7), h: b.readUInt16BE(i + 5) };
            }
            i += 2 + len;
        }
    }
    return null;
}

let cwebpAvailable = null;
function hasCwebp() {
    if (cwebpAvailable === null) {
        try { execFileSync('cwebp', ['-version'], { stdio: 'ignore' }); cwebpAvailable = true; }
        catch { cwebpAvailable = false; console.warn('  cwebp not found: skipping WebP generation (brew install webp)'); }
    }
    return cwebpAvailable;
}

// Create a WebP copy next to a PNG/JPEG if it's missing or older than the source.
// The original stays as the fallback and as the social preview image.
function ensureWebp(file) {
    if (!/\.(png|jpe?g)$/i.test(file)) return null;
    const out = file.replace(/\.(png|jpe?g)$/i, '.webp');
    const fresh = fs.existsSync(out) && fs.statSync(out).mtimeMs >= fs.statSync(file).mtimeMs;
    if (!fresh) {
        if (!hasCwebp()) return null;
        execFileSync('cwebp', ['-quiet', '-q', '82', '-m', '6', '-sharp_yuv', file, '-o', out]);
    }
    // Only use the WebP when it actually saves bytes.
    return fs.statSync(out).size < fs.statSync(file).size ? out : null;
}

// Add dimensions, lazy loading (all but the first image), and a WebP source.
function optimizeImages(html, baseDir) {
    let count = 0;
    return html.replace(/<img\b([^>]*?)\s*\/?>/g, (tag, attrs) => {
        const srcMatch = attrs.match(/\ssrc="([^"]+)"/);
        if (!srcMatch || /^https?:/i.test(srcMatch[1])) return tag;
        const src  = srcMatch[1];
        const file = path.join(baseDir, decodeURIComponent(src));
        if (!fs.existsSync(file)) { console.warn(`  missing image: ${src}`); return tag; }

        const size = imageSize(file);
        const loading = count++ === 0 ? '' : ' loading="lazy"';
        const dims = size ? ` width="${size.w}" height="${size.h}"` : '';
        const img = `<img${attrs}${dims}${loading} decoding="async">`;

        const webp = ensureWebp(file);
        if (!webp) return img;
        const webpSrc = src.replace(/\.(png|jpe?g)$/i, '.webp');
        return `<picture><source srcset="${webpSrc}" type="image/webp">${img}</picture>`;
    });
}

const FONT_LINKS = `<link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap" />`;

// JSON for a <script type="application/ld+json"> block. Escape "<" so post
// text can never close the script tag.
function jsonLd(obj) {
    return JSON.stringify(obj, null, 4).replace(/</g, '\\u003c').replace(/\n/g, '\n    ');
}

// ── Generate post pages ────────────────────────────────────────────────────────

posts.forEach((post, idx) => {
    if (post.external) return; // no local page for off-site posts
    const mdPath = path.join(POSTS_DIR, post.file);
    if (!fs.existsSync(mdPath)) { console.warn(`SKIP (not found): ${post.file}`); return; }

    const markdown  = fs.readFileSync(mdPath, 'utf-8');
    const bodyHtml  = optimizeImages(formatFigures(md.render(markdown)), POSTS_DIR);
    const words     = markdown.split(/\s+/).length;
    const mins      = Math.max(1, Math.round(words / 200));

    const prev = posts[idx + 1];
    const next = posts[idx - 1];

    const navHtml = `<div class="post-nav">
            ${prev
                ? `<a href="${postHref(prev)}"${postLinkAttrs(prev)} class="post-nav-link post-nav-prev">
                <span class="post-nav-dir">Older</span>
                <span class="post-nav-title">${esc(prev.title)}</span>
            </a>`
                : '<span></span>'}
            ${next
                ? `<a href="${postHref(next)}"${postLinkAttrs(next)} class="post-nav-link post-nav-next">
                <span class="post-nav-dir">Newer</span>
                <span class="post-nav-title">${esc(next.title)}</span>
            </a>`
                : '<span></span>'}
        </div>`;

    const desc    = esc(post.summary || '');
    const title   = esc(post.title);
    const pageUrl = `https://jakeotte.com/posts/${post.slug}.html`;
    const ogImage = `https://jakeotte.com/${post.image || 'assets/og.png'}`;

    const articleLd = jsonLd({
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: post.title,
        description: post.summary || '',
        datePublished: post.date,
        dateModified: post.updated || post.date,
        image: ogImage,
        url: pageUrl,
        mainEntityOfPage: pageUrl,
        wordCount: words,
        author: { '@type': 'Person', name: 'Jake Otte', url: 'https://jakeotte.com/' },
    });

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title} – Jake Otte</title>
    <meta name="description" content="${desc}" />
    <meta name="author" content="Jake Otte" />
    <meta property="og:title" content="${title} – Jake Otte" />
    <meta property="og:description" content="${desc}" />
    <meta property="og:type" content="article" />
    <meta property="og:url" content="${pageUrl}" />
    <meta property="og:image" content="${ogImage}" />
    <meta property="og:site_name" content="Jake Otte" />
    <meta property="article:published_time" content="${post.date}" />
    <meta property="article:author" content="https://jakeotte.com/" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title} – Jake Otte" />
    <meta name="twitter:description" content="${desc}" />
    <meta name="twitter:image" content="${ogImage}" />
    <link rel="canonical" href="${pageUrl}" />
    ${FONT_LINKS}
    <link rel="stylesheet" href="../style.css" />
    <link rel="icon" href="../assets/img/favicons/favicon.ico" />
    <link rel="icon" type="image/png" sizes="32x32" href="../assets/img/favicons/favicon-32x32.png" />
    <link rel="icon" type="image/png" sizes="16x16" href="../assets/img/favicons/favicon-16x16.png" />
    <link rel="apple-touch-icon" sizes="180x180" href="../assets/img/favicons/apple-touch-icon.png" />
    <link rel="mask-icon" href="../assets/img/favicons/safari-pinned-tab.svg" color="#c9e3f6" />
    <script type="application/ld+json">
    ${articleLd}
    </script>
</head>

<body class="page">

    <a class="skip-link" href="#post-main">Skip to article</a>
    <header>
        <div class="header-top">
            <a class="brand" href="/">
                <span class="brand-name">Jake Otte</span>
            </a>
            <nav class="nav">
                <a href="/">Home</a>
                <a href="../about.html">About</a>
                <a href="https://jotter.gitbook.io/red-team/" target="_blank" rel="noopener noreferrer">Notes <span aria-hidden="true">↗</span></a>
            </nav>
        </div>
    </header>

    <main id="post-main">
        <div class="post-view-content">
            <a href="/#research" class="post-back-link">All posts</a>
            <article class="post-article">
                <header class="post-heading">
                    <h1>${title}</h1>
                    <div class="post-meta">
                        <time datetime="${post.date}">${fmtLong(post.date)}</time>
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
                    <a href="/">Home</a>
                    <a href="../about.html">About</a>
                    <a href="https://jotter.gitbook.io/red-team/" target="_blank" rel="noopener noreferrer">Notes</a>
                    <a href="https://github.com/jakeotte" target="_blank" rel="noopener noreferrer">GitHub</a>
                    <a href="https://linkedin.com/in/jake-otte" target="_blank" rel="noopener noreferrer">LinkedIn</a>
                </div>
                <p class="copyright">© 2026 Jake Otte</p>
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

    <!-- Cloudflare Web Analytics --><script type="module" src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token": "6d0653b4bd99413e93536ad07920dba9"}'></script><!-- End Cloudflare Web Analytics -->
</body>
</html>`;

    fs.writeFileSync(path.join(POSTS_DIR, `${post.slug}.html`), html);
    console.log(`  posts/${post.slug}.html`);
});

// ── Update index.html ──────────────────────────────────────────────────────────

const postsHtml = posts.map((post, idx) => {
    const mdPath   = post.external ? '' : path.join(POSTS_DIR, post.file);
    const markdown = mdPath && fs.existsSync(mdPath) ? fs.readFileSync(mdPath, 'utf-8') : '';
    const mins     = Math.max(1, Math.round(markdown.split(/\s+/).length / 200));
    const detail   = post.external ? `On ${esc(post.source || 'another site')}` : `${mins} min read`;
    return `        <a class="post${idx === 0 ? ' post-latest' : ''}" href="${postHref(post, true)}"${postLinkAttrs(post)}>
            <div class="post-details">
                <time class="post-date" datetime="${post.date}">${fmtShort(post.date)}</time>
                <span class="post-card-read-time">${detail}</span>
            </div>
            <h3 class="post-title">${esc(post.title)}${post.external ? ' <span class="post-external" aria-label="(opens in a new tab)">↗</span>' : ''}</h3>
            <p class="post-excerpt">${esc(post.summary || '')}</p>
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

// contact.html is intentionally unlinked (contact details live in the sidebar)
// and marked noindex, so it stays out of the sitemap.
const staticUrls = [
    { loc: `${SITE}/`,             lastmod: today },
    { loc: `${SITE}/about.html`,   lastmod: today },
];
const postUrls = posts.filter(post => !post.external).map(post => ({
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
