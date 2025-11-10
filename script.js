async function loadPosts() {
  const res = await fetch('posts/index.json');
  const posts = await res.json();
  const container = document.getElementById('posts');
  container.innerHTML = '';

  posts.forEach(post => {
    const div = document.createElement('div');
    div.className = 'post';
    div.innerHTML = `<h2>${post.title}</h2><p>${post.date}</p><p>${post.summary}</p>`;
    div.onclick = () => openPost(post.file);

    // Card tilt / hover interaction
    div.addEventListener('mousemove', cardMouseMove);
    div.addEventListener('mouseleave', cardMouseLeave);
    div.addEventListener('mouseenter', cardMouseEnter);
    container.appendChild(div);
  });
}

async function openPost(file) {
  const res = await fetch(`posts/${file}`);
  const text = await res.text();
  document.getElementById('posts').style.display = 'none';
  const viewer = document.getElementById('viewer');
  viewer.classList.remove('hidden');
  document.getElementById('content').innerHTML = marked.parse(text);
}

document.getElementById('back').onclick = () => {
  document.getElementById('viewer').classList.add('hidden');
  document.getElementById('posts').style.display = '';
};

loadPosts();

// Smooth blob that follows the mouse
(() => {
  const blob = document.getElementById('blob');
  if (!blob) return;
  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;
  let blobX = mouseX;
  let blobY = mouseY;
  const speed = 0.12; // smoothing

  window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    // subtle size/opacity change based on speed
    blob.style.opacity = 0.95;
  });

  function animate() {
    blobX += (mouseX - blobX) * speed;
    blobY += (mouseY - blobY) * speed;
    blob.style.transform = `translate(${blobX - 210}px, ${blobY - 210}px)`;
    requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);
})();

// Card tilt handlers
function cardMouseEnter(e) {
  this.style.transition = 'transform 0.12s ease, box-shadow 0.12s ease';
}
function cardMouseMove(e) {
  const rect = this.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const cx = rect.width / 2;
  const cy = rect.height / 2;
  const dx = (x - cx) / cx; // -1 .. 1
  const dy = (y - cy) / cy; // -1 .. 1
  const rotX = (dy * 8).toFixed(2);
  const rotY = (dx * -8).toFixed(2);
  const scale = 1.02;
  this.style.transform = `perspective(700px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale(${scale})`;
  this.style.boxShadow = `${-rotY * 2}px ${rotX * 2}px 30px rgba(30,111,255,0.10)`;
}
function cardMouseLeave(e) {
  this.style.transition = 'transform 0.25s cubic-bezier(.2,.9,.3,1), box-shadow 0.25s ease';
  this.style.transform = '';
  this.style.boxShadow = '';
}

/* Intro animation removed -- ASCII art and particle background were intentionally deleted.
   Kept the rest of the site scripts intact. */

// Typewriter effect for hero name on index page
(function(){
  try {
    const el = document.getElementById('hero-name');
    if (!el) return;
    const text = el.getAttribute('data-text') || el.textContent || '';
    el.textContent = '';
    let i = 0;
    const speed = 80; // ms per character

    function typeNext(){
      if (i < text.length) {
        el.textContent += text.charAt(i);
        i++;
        setTimeout(typeNext, speed + Math.floor(Math.random()*40));
      } else {
        // finished typing: add blink class so ::after blinks
        el.classList.add('hero-cursor-blink');
      }
    }

    // Delay slightly to let layout settle on load
    if (document.readyState === 'loading') {
      window.addEventListener('DOMContentLoaded', () => setTimeout(typeNext, 180));
    } else {
      setTimeout(typeNext, 180);
    }
  } catch (e) {
    // fail gracefully
    console.error('typewriter init failed', e);
  }
})();
