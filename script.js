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

// Subtle ASCII particle spawn on mousemove (index only)
(function(){
  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return; // only run on pages with canvas (index)

  // respect users who prefer reduced motion
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const ctx = canvas.getContext('2d');
  let w = 0, h = 0;
  const DPR = Math.max(1, window.devicePixelRatio || 1);

  function resize(){
    w = canvas.clientWidth = window.innerWidth;
    h = canvas.clientHeight = window.innerHeight;
    canvas.width = Math.floor(w * DPR);
    canvas.height = Math.floor(h * DPR);
    ctx.setTransform(DPR,0,0,DPR,0,0);
  }
  resize();
  window.addEventListener('resize', resize);

  // broader ASCII-like character set for a codey feel
  const chars = '01{}[]()<>/\\-+=*&^%$#@!~`|;:\"\',.?abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const palette = ['#7dd3fc','#60a5fa','#91c2ff'];
  const particles = [];
  const MAX = 250;

  function make(x,y,vx,vy,ch){
    const size = 15 + Math.random()*6; // smaller, subtle
    const life = 700 + Math.random()*700;
    const color = palette[Math.floor(Math.random()*palette.length)];
    return { x, y, vx, vy, size, life, age:0, ch, color };
  }

  function spawnMany(x,y,mx,my,speed){
    const count = Math.max(1, Math.min(3, 1 + Math.floor(speed * 0.01)));
    for (let i=0;i<count;i++){
      const ang = Math.random() * Math.PI * 2;
      const sp = 0.4 + Math.random()*0.8 + Math.min(1.2, speed*0.005);
      const vx = Math.cos(ang) * sp + mx * 0.02;
      const vy = Math.sin(ang) * sp * -1 + my * 0.01 - Math.random()*0.3;
      const ch = chars.charAt(Math.floor(Math.random()*chars.length));
      particles.push(make(x + (Math.random()-0.5)*4, y + (Math.random()-0.5)*4, vx, vy, ch));
    }
    if (particles.length > MAX) particles.splice(0, particles.length - MAX);
  }

  let lastTime = performance.now();
  function frame(now){
    const dt = now - lastTime; lastTime = now;
    ctx.clearRect(0,0,w,h);

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.age += dt;
      if (p.age >= p.life) { particles.splice(i,1); continue; }
      const t = p.age / p.life;

      // gentle motion
      p.vx *= 0.997;
      p.vy += 0.0005 * dt; // very subtle gravity
      p.x += p.vx * dt * 0.06;
      p.y += p.vy * dt * 0.06;

      const alpha = Math.max(0, 1 - t) * 0.9;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = `${p.size}px JetBrains Mono, monospace`;
      ctx.textBaseline = 'middle';
      ctx.fillStyle = p.color;
      ctx.shadowColor = 'rgba(0,0,0,0)';
      ctx.shadowBlur = 0; // no heavy glow for subtlety
      ctx.fillText(p.ch, p.x, p.y);
      ctx.restore();
    }

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // mouse tracking (throttled for subtlety)
  let lastSpawn = 0;
  let lastX = 0, lastY = 0;
  window.addEventListener('mousemove', (e) => {
    const now = performance.now();
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    const speed = Math.sqrt(dx*dx + dy*dy);
    lastX = e.clientX; lastY = e.clientY;

    const interval = speed > 20 ? 30 : 45;
    if (now - lastSpawn > interval) {
      const mx = dx / Math.max(1, now - lastSpawn);
      const my = dy / Math.max(1, now - lastSpawn);
      spawnMany(e.clientX, e.clientY, mx, my, speed);
      lastSpawn = now;
    }
  }, { passive: true });

  // intentionally no click burst — keep it professional and subtle

})();
