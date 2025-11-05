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

/* --- Code/number particle background --- */
(function(){
  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;
  
  // Determine if this is the site's index page. We treat any path that ends
  // with a slash (site root like '/website/') or ends with '/index.html' as
  // the index so this works when the site is served from a subpath.
  const p = window.location.pathname || '/';
  const isIndexPage = p.endsWith('/') || p.endsWith('/index.html');
  // Always play the intro on the index page (play on every full page load)
  
  // If not index page, just hide the overlay immediately
  if (!isIndexPage) {
    const overlay = document.getElementById('intro-overlay');
    if (overlay) {
      overlay.style.opacity = '0';
      overlay.addEventListener('transitionend', () => {
        overlay.style.display = 'none';
        document.body.classList.remove('intro');
      }, { once: true });
    }
    document.body.classList.remove('intro');
  }
  
  const ctx = canvas.getContext('2d');
  let DPR = window.devicePixelRatio || 1;
  let w = 0, h = 0;
  const particles = [];
  // lowered cap to reduce CPU on mouse-heavy movement
  const maxParticles = 360;
  const chars = '01{}[]();<>/\\-+=*&^%$#@!abcdefghijklmnopqrstuvwxyz0123456789';

  function resize(){
    DPR = window.devicePixelRatio || 1;
    w = canvas.clientWidth = window.innerWidth;
    h = canvas.clientHeight = window.innerHeight;
    canvas.width = Math.floor(w * DPR);
    canvas.height = Math.floor(h * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }

  // particle factory
  function spawn(x, y, quantity=1, opts={}){
    for(let i=0;i<quantity;i++){
      if (particles.length > maxParticles) break;
      const char = opts.char || chars.charAt(Math.floor(Math.random()*chars.length));
      const size = (opts.size) || (8 + Math.random()*18); // px
      const life = (opts.life) || (500 + Math.random()*900); // ms
      const angle = (Math.random() * Math.PI * 2);
      const speed = (opts.speed) || (0.2 + Math.random()*1.2);
      const vx = Math.cos(angle) * speed * (0.3 + Math.random());
      const vy = Math.sin(angle) * speed * (0.3 + Math.random()) - Math.random()*0.45; // slight upward drift
      particles.push({ x, y, vx, vy, size, char, life, age: 0, alpha: 1 });
    }
  }

  // spawn many particles arranged from an ASCII art (explodes outward)
  // spawn many particles arranged from an ASCII art (explodes outward)
  // This implementation renders the ASCII to an offscreen canvas and samples
  // pixels to robustly pick where characters are, then spawns particles at
  // those positions so the entire art breaks apart (fixes missing-line issues).
  function spawnAscii(asciiLines, centerX, centerY, scale=1.0){
    const fontSize = 10 * scale;
    const cols = Math.max(...asciiLines.map(l=>l.length));
    const rows = asciiLines.length;
    const cellW = fontSize * 0.6;
    const cellH = fontSize * 1.0;

    const canvasW = Math.max(1, Math.ceil(cols * cellW));
    const canvasH = Math.max(1, Math.ceil(rows * cellH));

    const off = document.createElement('canvas');
    const odpr = Math.max(1, window.devicePixelRatio || 1);
    off.width = canvasW * odpr;
    off.height = canvasH * odpr;
    off.style.width = canvasW + 'px';
    off.style.height = canvasH + 'px';
    const ox = off.getContext('2d');
    ox.setTransform(odpr,0,0,odpr,0,0);
    ox.clearRect(0,0,canvasW,canvasH);
    ox.fillStyle = '#fff';
    ox.font = `${fontSize}px JetBrains Mono, monospace`;
    ox.textBaseline = 'middle';
    // draw each line left-aligned in the offscreen canvas
    for (let r = 0; r < rows; r++){
      const line = asciiLines[r] || '';
      ox.fillText(line, 0, r * cellH + cellH/2);
    }

    // sample the offscreen canvas on a grid matching the cell size
    const img = ox.getImageData(0,0,canvasW,canvasH).data;
    const baseX = centerX - canvasW/2;
    const baseY = centerY - canvasH/2;
    for (let row = 0; row < rows; row++){
      for (let col = 0; col < cols; col++){
        const sx = Math.floor(col * cellW + cellW/2);
        const sy = Math.floor(row * cellH + cellH/2);
        if (sx < 0 || sx >= canvasW || sy < 0 || sy >= canvasH) continue;
        const idx = (sy * canvasW + sx) * 4 + 3; // alpha channel
        const a = img[idx];
        if (a <= 10) continue; // mostly transparent, skip

        // determine the character at this cell (if any)
        const ch = (asciiLines[row] && asciiLines[row].charAt(col)) || chars.charAt(Math.floor(Math.random()*chars.length));

        const x = baseX + col * cellW + (Math.random()-0.5) * 4;
        const y = baseY + row * cellH + (Math.random()-0.5) * 4;
        const angle = Math.atan2(y - centerY, x - centerX) + (Math.random()-0.5)*0.6;
        const speed = 1.2 + Math.random()*2.4;
        const vx = Math.cos(angle) * speed * (0.8 + Math.random()*0.8);
        const vy = Math.sin(angle) * speed * (0.8 + Math.random()*0.8);
        const size = fontSize * (0.9 + Math.random()*1.4);
        const life = 900 + Math.random() * 1200;
        particles.push({ x, y, vx, vy, size, char: ch, life, age: 0, alpha: 1 });
      }
    }
  }

  let last = performance.now();
  function frame(now){
    const dt = now - last;
    last = now;
    ctx.clearRect(0,0,w,h);

    // If skull is in 'static' state, draw it centered each frame so it stays visible
    if (skullState === 'static' && staticSkullLines) {
      const skullScale = Math.max(1, Math.min(2.2, Math.min(w/800, h/600)));
      const fontSize = 10 * skullScale;
      const cols = Math.max(...staticSkullLines.map(l=>l.length));
      const rows = staticSkullLines.length;
      const cellW = fontSize * 0.6;
      const cellH = fontSize * 1.0;
      const baseX = (w/2) - (cols * cellW)/2;
      const baseY = (h/2 - 20) - (rows * cellH)/2;

      ctx.save();
      ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(220,230,255,1)';
      ctx.shadowColor = 'rgba(30,111,255,0.95)';
      ctx.shadowBlur = 20;
      ctx.font = `${fontSize}px JetBrains Mono, monospace`;
      ctx.textBaseline = 'middle';
      for (let row = 0; row < staticSkullLines.length; row++) {
        const line = staticSkullLines[row];
        for (let col = 0; col < line.length; col++) {
          const ch = line[col];
          if (ch === ' ' || ch === undefined) continue;
          const x = baseX + col * cellW;
          const y = baseY + row * cellH;
          ctx.fillText(ch, x, y);
        }
      }
      ctx.restore();
    }

    for(let i = particles.length -1; i >= 0; i--){
      const p = particles[i];
      p.age += dt;
      if (p.age >= p.life){
        particles.splice(i,1);
        continue;
      }
      const t = p.age / p.life;
      // apply gravity-ish and small damping
  // apply motion with much-reduced downward bias so top-half particles fly outwards
  p.x += p.vx * dt * 0.06;
  p.y += p.vy * dt * 0.06 + 0.008 * dt * (t);
  p.vx *= 0.999;
  p.vy += 0.0004 * dt; // much gentler downward pull
      p.alpha = 1 - easeOutQuad(t);

      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);
  ctx.fillStyle = `rgba(200,215,255,${Math.min(0.95, 0.5 + (1-p.alpha)*0.45)})`;
  ctx.shadowColor = 'rgba(30,111,255,0.7)';
      ctx.shadowBlur = 8;
      ctx.font = `${p.size}px JetBrains Mono, monospace`;
      ctx.textBaseline = 'middle';
      ctx.fillText(p.char, p.x, p.y);
      ctx.restore();
    }

    if (particles.length > maxParticles){
      particles.splice(0, particles.length - maxParticles);
    }

    requestAnimationFrame(frame);
  }

  function easeOutQuad(t){ return t*(2-t); }

  // slower spawn on mouse move to reduce clutter (user requested fewer characters)
  let lastSpawn = 0;
  window.addEventListener('mousemove', (e) => {
    const now = performance.now();
    // only spawn at most ~30 times per second
    if (now - lastSpawn > 32) {
      // single small particle per tick
      spawn(e.clientX + (Math.random()-0.5)*4, e.clientY + (Math.random()-0.5)*4, 1);
      lastSpawn = now;
    }
  }, { passive: true });

  // On first load, show ASCII skull static for a short hold, then break it apart
  function explodeSkull(){
    const skull = [
      "                       .,,uod8B8bou,,.",
      "              ..,uod8BBBBBBBBBBBBBBBBRPFT?l!i:.",
      "         ,=m8BBBBBBBBBBBBBBBRPFT?!||||||||||||||",
      "         !...:!TVBBBRPFT||||||||||!!^^\"\"'   ||||",
      "         !.......:!?|||||!!^^\"\"'            ||||",
      "         !.........||||                     ||||",
      "         !.........||||  ##                 ||||",
      "         !.........||||                     ||||",
      "         !.........||||                     ||||",
      "         !.........||||                     ||||",
      "         !.........||||                     ||||",
      "         `.........||||                    ,||||",
      "          .;.......||||               _.-!!|||||",
      "   .,uodWBBBBb.....||||       _.-!!|||||||||!:'",
      "!YBBBBBBBBBBBBBBb..!|||:..-!!|||||||!iof68BBBBBb....",
      "!..YBBBBBBBBBBBBBBb!!||||||||!iof68BBBBBBRPFT?!::   `.",
      "!....YBBBBBBBBBBBBBBbaaitf68BBBBBBRPFT?!:::::::::     `.",
      "!......YBBBBBBBBBBBBBBBBBBBRPFT?!::::::;:!^\"`;:::       `.",
      "!........YBBBBBBBBBBRPFT?!::::::::::^''...::::::;         iBBbo.",
      "`..........YBRPFT?!::::::::::::::::::::::::;iof68bo.      WBBBBbo.",
      "  `..........:::::::::::::::::::::::;iof688888888888b.     `YBBBP^'",
      "    `........::::::::::::::::;iof688888888888888888888b.     `",
      "      `......:::::::::;iof688888888888888888888888888888b.",
      "        `....:::;iof688888888888888888888888888888888899fT!",
      "          `..::!8888888888888888888888888888888899fT|!^\"'",
      "            `' !!988888888888888888888888899fT|!^\"'",
      "                `!!8888888888888888899fT|!^\"'",
      "                  `!988888888888899fT|!^\"'",
      "                    `!9899fT|!^\"'",
      "                      `!^\"'",
      "",
      "",
      "                                            " + [
        "Exploiting ESC8 on your CA...",
        "Updating your authorized_keys file...", 
        "Sandblasting your EDR...",
        "Relaying to LDAP...",
        "Unhooking NTDLL...",
        "Getting kernel offsets..."
      ][Math.floor(Math.random() * 6)]
    ];
    const cx = w / 2;
    const cy = h / 2 - 20;

    // draw static skull for a little while before explosion
    skullState = 'static';
    staticSkullLines = skull; // store so frame() can draw it each frame

    const holdMs = 1800; // how long the skull shows before breaking
    setTimeout(() => {
      // start explosion
      skullState = 'exploding';
      spawnAscii(skull, cx, cy, Math.max(1, Math.min(2.2, Math.min(w/800, h/600))));
      // fade overlay after explosion
      const fadeAfter = 800;
      if (overlay) setTimeout(()=> { overlay.style.opacity = '0'; }, fadeAfter);
    }, holdMs);
  }

  // keep track of intro overlay & skull rendering state
  let skullState = 'pending'; // 'pending' | 'static' | 'exploding'
  let staticSkullLines = null;

  window.addEventListener('resize', resize);
  resize();
  // initial skull explosion: make intro state so canvas & overlay sit above everything
  document.body.classList.add('intro');
  const overlay = document.getElementById('intro-overlay');
  if (overlay) overlay.style.opacity = '1';

  // Only show skull animation on index page (play every load)
  if (isIndexPage) {
    // small timeout so canvas has correct size and everything settled
    const explodeDelay = 120;
    setTimeout(() => {
      explodeSkull();
    }, explodeDelay);

    // cleanup after overlay fades
    if (overlay) {
      overlay.addEventListener('transitionend', () => {
        overlay.style.display = 'none';
        // remove intro class so canvas returns behind content
        document.body.classList.remove('intro');
      }, { once: true });
    }
  } else {
    // Skip animation on subsequent visits or other pages
    if (overlay) {
      overlay.style.opacity = '0';
      overlay.addEventListener('transitionend', () => {
        overlay.style.display = 'none';
      }, { once: true });
    }
    document.body.classList.remove('intro');
  }

  requestAnimationFrame(frame);
})();
