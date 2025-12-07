/* ============================================================
   Jake Otte – Dynamic Post Loader (using posts/index.json)
   ============================================================ */

let md = null;
let allPosts = [];

// Load markdown-it library for rendering Markdown
function loadMarkdownLibrary() {
    return new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/markdown-it@13/dist/markdown-it.min.js';
        script.onload = () => {
            md = window.markdownit();
            resolve();
        };
        script.onerror = () => {
            console.error("Failed to load markdown-it library");
            resolve(); // Resolve anyway so posts still load
        };
        document.head.appendChild(script);
    });
}

// Initialize on DOMContentLoaded
document.addEventListener("DOMContentLoaded", async () => {
    const postsContainer = document.getElementById("posts");
    if (!postsContainer) return;
    
    // Wait for markdown library to load
    await loadMarkdownLibrary();
    loadPosts();
});

/* Load posts from /posts/index.json */
async function loadPosts() {
    const postsContainer = document.getElementById("posts");

    try {
        const response = await fetch("posts/index.json", { cache: "no-store" });
        if (!response.ok) throw new Error("Failed to load posts index");

        allPosts = await response.json();

        // Sort by date (newest first)
        allPosts.sort((a, b) => new Date(b.date) - new Date(a.date));

        renderPostsList();

    } catch (err) {
        console.error("Error loading posts:", err);

        postsContainer.innerHTML = `
            <p style="color:#888; font-size:0.9rem;">
                Failed to load posts. Check console for details.
            </p>
        `;
    }
}

/* Render the posts list view */
function renderPostsList() {
    const postsContainer = document.getElementById("posts");
    postsContainer.innerHTML = "";

    allPosts.forEach(post => {
        const postLink = document.createElement("a");
        postLink.href = "#";
        postLink.className = "post";
        postLink.style.textDecoration = "none";
        postLink.style.color = "inherit";
        postLink.style.display = "block";
        postLink.onclick = (e) => {
            e.preventDefault();
            openPost(post);
        };
        
        postLink.innerHTML = `
            <p>${formatDate(post.date)}</p>
            <h2>${post.title}</h2>
            <p>${post.summary}</p>
        `;

        postsContainer.appendChild(postLink);
    });
}

/* Open a post and replace the page layout */
async function openPost(post) {
    try {
        const response = await fetch(`posts/${post.file}`, { cache: "no-store" });
        if (!response.ok) throw new Error(`Failed to load post: ${post.file}`);

        const markdown = await response.text();
        const htmlContent = md.render(markdown);

        // Hide hero section
        const heroSection = document.querySelector(".hero");
        heroSection.style.display = "none";

        // Get the posts section
        const section = document.querySelector(".section");
        
        // Replace section content with post view
        section.innerHTML = `
            <div class="post-view-header">
                <button class="post-back-btn" onclick="backToPostsList()">← Back to Posts</button>
            </div>
            <div class="post-view-content">
                <article class="post-article">
                    <h1>${post.title}</h1>
                    <p class="post-meta">${formatDate(post.date)}</p>
                    <div class="post-body">
                        ${htmlContent}
                    </div>
                </article>
            </div>
        `;

        // Scroll to top
        window.scrollTo(0, 0);

    } catch (err) {
        console.error("Error opening post:", err);
        alert("Failed to load post. Check console for details.");
    }
}

/* Go back to posts list */
function backToPostsList() {
    // Show hero section again
    const heroSection = document.querySelector(".hero");
    heroSection.style.display = "";

    const section = document.querySelector(".section");
    section.innerHTML = `
        <div class="section-header">
            <h3 class="section-title">Latest Notes</h3>
            <p class="section-subtitle">Technical breakdowns, research logs, malware ideas</p>
        </div>
        <div id="posts"></div>
    `;
    renderPostsList();
    window.scrollTo(0, 0);
}

/* Convert date → nice human format */
function formatDate(dateString) {
    try {
        const d = new Date(dateString);
        return d.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric"
        });
    } catch (e) {
        return dateString;
    }
}
