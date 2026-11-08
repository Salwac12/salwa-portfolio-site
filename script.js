// ==========================================
// 0. ACETERNITY UI CANVAS REVEAL EFFECT (SUBTLE PULSING SQUARES)
// ==========================================
function initCanvasRevealEffect() {
  const canvas = document.getElementById("reveal-canvas");
  if (!canvas) return;

  const gl = canvas.getContext("webgl", { alpha: true, antialias: false });
  if (!gl) {
    initCanvas2DFallback(canvas);
    return;
  }

  const vsSource = `
    attribute vec2 a_position;
    void main() {
      gl_Position = vec4(a_position, 0.0, 1.0);
    }
  `;

  // Fragment shader derived directly from Aceternity UI CanvasRevealEffect
  const fsSource = `
    precision mediump float;
    uniform float u_time;
    uniform vec2 u_resolution;
    uniform float u_total_size;
    uniform float u_dot_size;
    uniform vec3 u_color;
    uniform float u_is_dark;

    float PHI = 1.61803398874989484820459;
    float random(vec2 xy) {
      return fract(tan(distance(xy * PHI, xy) * 0.5) * xy.x);
    }

    void main() {
      vec2 st = gl_FragCoord.xy;
      st.y = u_resolution.y - st.y;

      vec2 st2 = floor(st / u_total_size);

      // Slow pulsation frequency (small blocks turning off and on slowly)
      float frequency = 4.8;
      float show_offset = random(st2);
      
      float phase = (u_time / frequency) + show_offset * 12.0;
      float t0 = floor(phase);
      float progress = fract(phase);

      float randA = random(st2 * (t0 + 1.0) + 0.123);
      float randB = random(st2 * (t0 + 2.0) + 0.123);

      // Smoothstep easing between on/off states
      float s = smoothstep(0.0, 1.0, progress);

      // Subtle metallic slate square blocks matching screenshot
      float maxOp = u_is_dark > 0.5 ? 0.18 : 0.10;
      float opA = randA < 0.35 ? 0.0 : ((randA - 0.35) / 0.65) * maxOp;
      float opB = randB < 0.35 ? 0.0 : ((randB - 0.35) / 0.65) * maxOp;

      float opacity = mix(opA, opB, s);

      // Small rounded square block mask (SDF smoothstep)
      vec2 cell = mod(st, u_total_size);
      vec2 d = abs(cell - vec2(u_total_size * 0.5)) - vec2(u_dot_size * 0.5);
      float dist = length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
      float shape = 1.0 - smoothstep(-0.5, 0.5, dist);

      opacity *= shape;

      gl_FragColor = vec4(u_color * opacity, opacity);
    }
  `;

  function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  const vs = createShader(gl, gl.VERTEX_SHADER, vsSource);
  const fs = createShader(gl, gl.FRAGMENT_SHADER, fsSource);
  if (!vs || !fs) {
    initCanvas2DFallback(canvas);
    return;
  }

  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    initCanvas2DFallback(canvas);
    return;
  }

  gl.useProgram(program);

  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
    gl.STATIC_DRAW
  );

  const aPosition = gl.getAttribLocation(program, "a_position");
  gl.enableVertexAttribArray(aPosition);
  gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

  const uTimeLoc = gl.getUniformLocation(program, "u_time");
  const uResLoc = gl.getUniformLocation(program, "u_resolution");
  const uTotalSizeLoc = gl.getUniformLocation(program, "u_total_size");
  const uDotSizeLoc = gl.getUniformLocation(program, "u_dot_size");
  const uColorLoc = gl.getUniformLocation(program, "u_color");
  const uIsDarkLoc = gl.getUniformLocation(program, "u_is_dark");

  const startTime = performance.now();

  function resize() {
    const isMobile = window.innerWidth < 640;
    const dpr = Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2);
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    gl.viewport(0, 0, canvas.width, canvas.height);
  }

  window.addEventListener("resize", resize);
  resize();

  function render(now) {
    const elapsed = (now - startTime) / 1000.0;
    const isDark = document.documentElement.classList.contains("dark");

    gl.useProgram(program);

    gl.uniform1f(uTimeLoc, elapsed);
    gl.uniform2f(uResLoc, canvas.width, canvas.height);

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    gl.uniform1f(uTotalSizeLoc, 16.0 * dpr);
    gl.uniform1f(uDotSizeLoc, 2.8 * dpr);

    if (isDark) {
      gl.uniform3f(uColorLoc, 0.82, 0.85, 0.90);
      gl.uniform1f(uIsDarkLoc, 1.0);
    } else {
      gl.uniform3f(uColorLoc, 0.12, 0.12, 0.14);
      gl.uniform1f(uIsDarkLoc, 0.0);
    }

    gl.drawArrays(gl.TRIANGLES, 0, 6);
    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
}

function initCanvas2DFallback(canvas) {
  const ctx = canvas.getContext("2d");
  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  window.addEventListener("resize", () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  const cellSize = 16;
  const dotSize = 2.8;

  function render(time) {
    ctx.clearRect(0, 0, width, height);
    const isDark = document.documentElement.classList.contains("dark");
    const t = time * 0.0006;
    const cols = Math.ceil(width / cellSize);
    const rows = Math.ceil(height / cellSize);

    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        const offset = Math.sin(i * 12.9898 + j * 78.233) * 43758.5453;
        const seed = offset - Math.floor(offset);
        const pulse = Math.sin(t * 1.4 + seed * 10.0);
        if (pulse > 0.3) {
          const alpha = (pulse - 0.3) * (isDark ? 0.18 : 0.10);
          ctx.fillStyle = isDark
            ? `rgba(210, 220, 230, ${alpha})`
            : `rgba(25, 25, 30, ${alpha})`;
          ctx.fillRect(i * cellSize, j * cellSize, dotSize, dotSize);
        }
      }
    }
    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
}

// ==========================================
// 1. EXACT JAYJR CANVAS CURSOR WAVE FOLLOWER
// ==========================================
function initCanvasCursor() {
  const canvas = document.getElementById("canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  let running = true;
  let frame = 1;

  function hexToRgb(str) {
    if (!str) return { r: 237, g: 237, b: 237 };
    str = str.trim();
    if (str.startsWith("#")) {
      let t = str.slice(1);
      if (t.length === 3) t = t.split("").map(c => c + c).join("");
      let r = parseInt(t, 16);
      return { r: (r >> 16) & 255, g: (r >> 8) & 255, b: 255 & r };
    }
    if (str.startsWith("rgb")) {
      const match = str.match(/\d+/g);
      if (match && match.length >= 3) {
        return { r: parseInt(match[0]), g: parseInt(match[1]), b: parseInt(match[2]) };
      }
    }
    return { r: 128, g: 128, b: 128 };
  }

  let color = hexToRgb(getComputedStyle(document.documentElement).getPropertyValue("--fg") || "#ededed");

  function updateColor() {
    color = hexToRgb(getComputedStyle(document.documentElement).getPropertyValue("--fg") || "#ededed");
  }

  new MutationObserver(updateColor).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class", "style"]
  });

  const pos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  let trails = [];
  const config = {
    friction: 0.5,
    trails: 5,
    size: 18,
    dampening: 0.25,
    tension: 0.98
  };

  function Node() {
    this.x = pos.x;
    this.y = pos.y;
    this.vy = 0;
    this.vx = 0;
  }

  function Trail(opt) {
    this.spring = opt.spring + 0.1 * Math.random() - 0.02;
    this.friction = config.friction + 0.01 * Math.random() - 0.002;
    this.nodes = [];
    for (let i = 0; i < config.size; i++) {
      const node = new Node();
      node.x = pos.x;
      node.y = pos.y;
      this.nodes.push(node);
    }
  }

  Trail.prototype.update = function () {
    let spring = this.spring;
    let node = this.nodes[0];
    node.vx += (pos.x - node.x) * spring;
    node.vy += (pos.y - node.y) * spring;
    for (let i = 0; i < this.nodes.length; i++) {
      node = this.nodes[i];
      if (i > 0) {
        const prev = this.nodes[i - 1];
        node.vx += (prev.x - node.x) * spring;
        node.vy += (prev.y - node.y) * spring;
        node.vx += prev.vx * config.dampening;
        node.vy += prev.vy * config.dampening;
      }
      node.vx *= this.friction;
      node.vy *= this.friction;
      node.x += node.vx;
      node.y += node.vy;
      spring *= config.tension;
    }
  };

  Trail.prototype.draw = function () {
    let e, t, r = this.nodes[0].x, n = this.nodes[0].y;
    ctx.beginPath();
    ctx.moveTo(r, n);
    for (let o = 1, a = this.nodes.length - 2; o < a; o++) {
      e = this.nodes[o];
      t = this.nodes[o + 1];
      r = 0.5 * (e.x + t.x);
      n = 0.5 * (e.y + t.y);
      ctx.quadraticCurveTo(e.x, e.y, r, n);
    }
    e = this.nodes[this.nodes.length - 2];
    t = this.nodes[this.nodes.length - 1];
    ctx.quadraticCurveTo(e.x, e.y, t.x, t.y);
    ctx.stroke();
    ctx.closePath();
  };

  function onPointerMove(e) {
    function updatePos(ev) {
      if (ev.touches && ev.touches.length > 0) {
        pos.x = ev.touches[0].pageX;
        pos.y = ev.touches[0].pageY;
      } else {
        pos.x = ev.clientX;
        pos.y = ev.clientY;
      }
    }
    document.removeEventListener("mousemove", onPointerMove);
    document.removeEventListener("touchstart", onPointerMove);
    document.addEventListener("mousemove", updatePos);
    document.addEventListener("touchmove", updatePos, { passive: true });
    updatePos(e);
    trails = [];
    for (let i = 0; i < config.trails; i++) {
      trails.push(new Trail({ spring: 0.4 + (i / config.trails) * 0.025 }));
    }
    render();
  }

  function render() {
    if (running) {
      ctx.globalCompositeOperation = "source-over";
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 0.25)`;
      ctx.lineWidth = 1;
      for (let i = 0; i < config.trails; i++) {
        trails[i].update();
        trails[i].draw();
      }
      frame++;
      window.requestAnimationFrame(render);
    }
  }

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  window.addEventListener("resize", resize);
  window.addEventListener("focus", () => {
    if (!running) {
      running = true;
      render();
    }
  });

  document.addEventListener("mousemove", onPointerMove);
  document.addEventListener("touchstart", onPointerMove, { passive: true });
  resize();
}

// ==========================================
// 2. THEME TOGGLE (DARK / LIGHT)
// ==========================================
function initTheme() {
  const toggleBtn = document.getElementById("theme-toggle");
  const toggleLabel = document.getElementById("theme-toggle-label");
  const html = document.documentElement;

  const savedTheme = localStorage.getItem("portfolio_theme") || "dark";
  applyTheme(savedTheme);

  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      const isDark = html.classList.contains("dark");
      const nextTheme = isDark ? "light" : "dark";
      applyTheme(nextTheme);
    });
  }

  function applyTheme(theme) {
    if (theme === "dark") {
      html.classList.add("dark");
      html.classList.remove("light");
      if (toggleLabel) toggleLabel.textContent = "Light";
      else if (toggleBtn) toggleBtn.textContent = "Light";
    } else {
      html.classList.remove("dark");
      html.classList.add("light");
      if (toggleLabel) toggleLabel.textContent = "Dark";
      else if (toggleBtn) toggleBtn.textContent = "Dark";
    }
    localStorage.setItem("portfolio_theme", theme);
  }
}

// ==========================================
// 3. AVATAR 3D FLIP
// ==========================================
function initAvatarFlip() {
  const btn = document.getElementById("avatar-btn");
  const card = document.getElementById("avatar-card");
  if (!btn || !card) return;

  btn.addEventListener("click", () => {
    const isFlipped = card.classList.toggle("flipped");
    btn.setAttribute("aria-pressed", isFlipped ? "true" : "false");
  });
}

// ==========================================
// 4. HOBBIES INTERACTIVE POPOVER
// ==========================================
const hobbiesData = {
  Physical: {
    title: "Physical Activity & Fitness",
    items: ["Badminton", "Endurance Walking", "Core Fitness"],
    note: "Staying active and energized helps maintain strong mental focus during long coding and ML training sprints."
  },
  Intellectual: {
    title: "Deep Tech & Algorithmic Thinking",
    items: ["AI/ML Papers", "Cryptographic Forensics", "LeetCode & DSA"],
    note: "Diving into state-of-the-art zero-shot anomaly detection, packet inspection protocols, and solving complex DSA problems."
  },
  Social: {
    title: "Community & Collaborative Engineering",
    items: ["SIH 2026 Team Verdex", "AI Student Forums", "Hackathon Teaming"],
    note: "Collaborating with teammates to build real-world security tools, participating in hackathons, and exchanging ideas."
  },
  Creative: {
    title: "Visual Design & Tech Storytelling",
    items: ["CIE Technical Writing", "CV Heatmap Visuals", "Clean UI/UX"],
    note: "Crafting first-person engineering reflection blogs, designing intuitive heatmaps, and building sleek minimalist web tools."
  }
};

function initHobbies() {
  const container = document.getElementById("hobbies-container");
  const popover = document.getElementById("hobby-popover");
  const popoverTitle = document.getElementById("hobby-popover-title");
  const popoverNote = document.getElementById("hobby-popover-note");
  const popoverTags = document.getElementById("hobby-popover-tags");
  const pills = document.querySelectorAll(".hobby-pill");

  let currentActive = null;

  pills.forEach(pill => {
    const key = pill.dataset.hobby;
    const data = hobbiesData[key];
    if (!data) return;

    function show() {
      popoverTitle.textContent = data.title;
      popoverNote.textContent = data.note;
      popoverTags.innerHTML = data.items.map(it => `<span class="hobby-popover-tag">${it}</span>`).join("");
      
      const rect = pill.getBoundingClientRect();
      const parentRect = container.getBoundingClientRect();
      const offsetLeft = rect.left - parentRect.left;
      popover.style.left = `${Math.max(0, Math.min(offsetLeft, parentRect.width - 290))}px`;

      pills.forEach(p => p.classList.remove("active"));
      pill.classList.add("active");
      popover.classList.add("visible");
      currentActive = key;
    }

    function hide() {
      popover.classList.remove("visible");
      pills.forEach(p => p.classList.remove("active"));
      currentActive = null;
    }

    pill.addEventListener("mouseenter", show);
    pill.addEventListener("click", (e) => {
      e.stopPropagation();
      if (currentActive === key) {
        hide();
      } else {
        show();
      }
    });
  });

  container.addEventListener("mouseleave", () => {
    popover.classList.remove("visible");
    pills.forEach(p => p.classList.remove("active"));
    currentActive = null;
  });

  document.addEventListener("click", (e) => {
    if (!container.contains(e.target)) {
      popover.classList.remove("visible");
      pills.forEach(p => p.classList.remove("active"));
      currentActive = null;
    }
  });
}

// ==========================================
// 5. BLOG MODAL SYSTEM (CIE First-Person Narratives)
// ==========================================
const blogsData = [
  {
    id: 1,
    title: "MailShield AI: A Very Simple Explanation of the Email Security Solution",
    meta: "October 2026 | Team Verdex (SIH 2026 Prep)",
    tagline: "From packets to posture. From cryptographic evidence to action.",
    sections: [
      {
        heading: "Imagine Email Is Like Sending Letters",
        content: "When people send physical letters, they place them inside envelopes. Email does something similar when routing messages across the internet. But sometimes that envelope is weak, wide open, or secured with a broken, outdated lock.\n\nMailShield AI is like a smart security guard standing on the network perimeter. It monitors how email messages travel and verifies whether their digital locks are genuinely strong and tamper-resistant."
      },
      {
        heading: "What Problem Are We Solving?",
        content: "Organizations rely on email every single day—banks, universities, enterprises, and governments all depend on it. If email security is misconfigured, an adversary sitting on the network path can eavesdrop on confidential messages, pretend to be someone else, or tamper with the communication.\n\nThe core operational challenge is that security teams (SOC analysts) are routinely handed massive PCAP files. A PCAP is essentially a high-definition recording of network traffic containing millions of packets. Manually combing through Wireshark to locate broken cryptographic negotiations takes hours of tedious manual inspection."
      },
      {
        heading: "What Does MailShield AI Do? (7-Step Pipeline)",
        bullets: [
          "1. Accepts PCAP Files: The security analyst uploads raw network recordings without needing direct server access.",
          "2. Identifies Email Conversations: Automatically isolates SMTP, IMAP, and POP3 protocols from ambient network noise.",
          "3. Rebuilds the Conversation: Programmatically reassembles fragmented TCP streams into continuous chronological flows.",
          "4. Inspects the Security Locks: Examines STARTTLS negotiations, TLS version compliance, cipher suites, and X.509 certificates.",
          "5. Detects Dangerous Settings: Flags deprecated TLS versions (1.0/1.1), weak algorithms (DES, RC4, CBC ciphers), expired certificates, and unencrypted fallback logins.",
          "6. Computes Explainable Risk Scores: Evaluates session posture from 0–100, categorizing risks as Safe, Needs Attention, Dangerous, or Critical.",
          "7. Delivers Actionable Remediation: Provides system administrators with exact configuration fixes rather than cryptic hex dumps."
        ]
      },
      {
        heading: "Understanding the Protocol Fundamentals",
        content: "• SMTP: Used primarily to transfer mail between servers and handle outbound sending.\n• IMAP: Used by modern mail clients to read, organize, and sync mail across multiple devices.\n• POP3: Used to download email directly from the server onto a single local device.\n\nThe STARTTLS Analogy:\nImagine two people speaking in a public room where anyone can hear them. Suddenly, they say, 'Let us close the door and talk privately.' STARTTLS is that exact request to close the door and start a private conversation.\n\nMailShield AI inspects whether the door was really closed. It detects:\n- When the server advertises a private door, but the client ignores it and sends credentials in plaintext.\n- When the client requests privacy, but a man-in-the-middle attacker strips the response.\n- When the conversation continues in plain language after encryption was supposed to begin.\n- When a user logs in before the cryptographic handshake has finalized."
      },
      {
        heading: "TLS Locks & X.509 Certificates",
        content: "TLS is the digital lock protecting internet traffic. MailShield AI evaluates whether the TLS version is modern (TLS 1.3 preferred), whether the cipher suite enforces Forward Secrecy (PFS), and whether the handshake concluded cleanly.\n\nA Certificate is like an identity card for a mail server. MailShield AI verifies whether the certificate is expired, belongs to the correct hostname (CN/SAN), has a valid CA trust chain, and is signed with strong hashing algorithms (e.g., SHA-256 rather than broken SHA-1/MD5)."
      },
      {
        heading: "How Does the AI Help? (Rules Engine vs. AI Engine)",
        content: "• The Rules Engine is like a teacher with a strict checklist. It knows deterministically that SSLv3, TLS 1.0, and expired certificates violate security baselines.\n• The AI Engine (Isolation Forest) is like a detective. It models normal cryptographic negotiation patterns across the organization and spots subtle statistical anomalies and downgrade attacks that static rules miss.\n\nCrucially, our AI output is 100% explainable: MailShield AI does not simply emit a black-box 'danger' warning; it explains exactly what anomalous packets were observed, why it represents a threat, and which server configuration needs repair."
      },
      {
        heading: "Simple Risk Scoring Matrix",
        table: [
          { color: "Green", meaning: "Safe", example: "Modern TLS 1.3, strong cipher, valid X.509 certificate" },
          { color: "Yellow", meaning: "Needs Attention", example: "Certificate expiring in < 14 days, legacy TLS 1.2 suite" },
          { color: "Orange", meaning: "Dangerous", example: "Outdated TLS 1.0/1.1, CBC cipher suite, weak DH parameters" },
          { color: "Red", meaning: "Critical", example: "Plaintext authentication, stripped STARTTLS, active downgrade attack" }
        ]
      },
      {
        heading: "Architecture & Verification Pipeline",
        bullets: [
          "TCP Stream Reconstruction: Handled by custom PCAP analysis engine (Python & Scapy)",
          "STARTTLS Detection: Handled by protocol state machine",
          "TLS Handshake Reconstruction: Done by TLS parser",
          "Cipher-Suite & Certificate Extraction: OpenSSL and X.509 parser",
          "AI Risk Scoring & Anomaly Detection: Scikit-learn Isolation Forest ML model",
          "Tamper-Evident Reporting: Hash and timestamp final approved findings to prove evidence integrity",
          "Export Formats: SIEM-ready JSON, browser HTML, and executive PDF audit reports"
        ]
      },
      {
        heading: "Why This Solution Matters",
        content: "MailShield AI is completely passive: it analyzes existing recordings without generating intrusive probes or altering live production mail servers. It also respects user privacy by auditing only the cryptographic posture and packet headers without reading private email message content.\n\nSummary: From packets to posture. From cryptographic evidence to action."
      }
    ]
  },
  {
    id: 2,
    title: "Exploring Unsupervised Anomaly Detection with Anomalib",
    meta: "September 2026 | Self-Learning & AI Exploration",
    sections: [
      {
        heading: "What Happened",
        content: "This month, I explored industrial computer vision and how deep learning can spot product defects without needing thousands of labeled failure images. Implementing PatchCore via Anomalib was a great exercise in understanding memory-bank-based anomaly detection."
      },
      {
        heading: "Key Learnings",
        bullets: [
          "Quality defect datasets are scarce in industrial manufacturing, making unsupervised learning essential for real-world deployments.",
          "Integrating PyTorch models into an interactive Streamlit dashboard makes testing, parameter tuning, and defect heatmap inspection much faster."
        ]
      },
      {
        heading: "Next Steps & Closing Thoughts",
        content: "Next, I plan to deploy this model as a lightweight web app with real-time camera feed processing and edge inference optimization."
      }
    ]
  }
];

function initBlogModal() {
  const modal = document.getElementById("blog-modal");
  const modalBody = document.getElementById("blog-modal-body");
  const closeBtn = document.getElementById("blog-modal-close");
  const blogCards = document.querySelectorAll(".blog-card");

  function openBlog(id) {
    const blog = blogsData.find(b => b.id === Number(id));
    if (!blog) return;

    let html = `
      <div style="margin-bottom: 1.5rem; border-bottom: 1px solid var(--border); padding-bottom: 1rem;">
        <span style="font-family: var(--font-mono); font-size: 13px; color: var(--muted);">${blog.meta}</span>
        <h2 style="font-size: 22px; font-weight: 600; color: var(--fg); margin-top: 0.4rem; line-height: 1.3;">${blog.title}</h2>
        ${blog.tagline ? `<p style="font-family: var(--font-mono); font-size: 12.5px; color: var(--muted); margin-top: 0.35rem; font-style: italic;">${blog.tagline}</p>` : ''}
      </div>
      <div style="display: flex; flex-direction: column; gap: 1.5rem; color: var(--fg);">
    `;

    blog.sections.forEach(sec => {
      html += `<div><h3 style="font-size: 15px; font-weight: 600; color: var(--fg); margin-bottom: 0.4rem;">${sec.heading}</h3>`;
      if (sec.content) {
        const paragraphs = sec.content.split('\n\n');
        paragraphs.forEach(p => {
          html += `<p style="font-size: 14px; color: var(--muted); line-height: 1.65; margin-bottom: 0.5rem; white-space: pre-line;">${p}</p>`;
        });
      }
      if (sec.bullets) {
        html += `<ul style="margin-top: 0.4rem; padding-left: 1.25rem; font-size: 14px; color: var(--muted); line-height: 1.6;">`;
        sec.bullets.forEach(b => {
          html += `<li style="margin-bottom: 0.35rem;">${b}</li>`;
        });
        html += `</ul>`;
      }
      if (sec.table) {
        html += `<div style="overflow-x: auto; margin-top: 0.6rem; border: 1px solid var(--border); border-radius: 6px;"><table style="width: 100%; border-collapse: collapse; font-size: 13px; text-align: left;">
          <thead>
            <tr style="border-bottom: 1px solid var(--border); background: var(--card-hover); color: var(--muted); font-family: var(--font-mono);">
              <th style="padding: 8px 12px;">Severity</th>
              <th style="padding: 8px 12px;">Meaning</th>
              <th style="padding: 8px 12px;">Scenario & Findings</th>
            </tr>
          </thead>
          <tbody>`;
        sec.table.forEach(row => {
          let badgeColor = "#10b981";
          if (row.color === "Yellow") badgeColor = "#eab308";
          if (row.color === "Orange") badgeColor = "#f97316";
          if (row.color === "Red") badgeColor = "#ef4444";
          html += `<tr style="border-bottom: 1px solid var(--border);">
            <td style="padding: 8px 12px;"><span style="color: ${badgeColor}; font-weight: 600; font-family: var(--font-mono);">● ${row.color}</span></td>
            <td style="padding: 8px 12px; color: var(--fg); font-weight: 500;">${row.meaning}</td>
            <td style="padding: 8px 12px; color: var(--muted); font-size: 12.5px;">${row.example}</td>
          </tr>`;
        });
        html += `</tbody></table></div>`;
      }
      html += `</div>`;
    });

    html += `
      <div style="border-top: 1px solid var(--border); padding-top: 1.25rem; margin-top: 1rem; display: flex; justify-content: space-between; align-items: center;">
        <span style="font-family: var(--font-mono); font-size: 12px; color: var(--muted);">CIE Guideline Narrative Style</span>
        <button id="modal-read-done-btn" style="background: var(--fg); color: var(--bg); border: none; padding: 0.4rem 1rem; border-radius: 4px; font-size: 13px; font-weight: 500; cursor: pointer;">Close Article</button>
      </div>
    </div>`;

    modalBody.innerHTML = html;
    modal.classList.add("active");
    document.body.style.overflow = "hidden";

    document.getElementById("modal-read-done-btn").addEventListener("click", closeBlog);
  }

  function closeBlog() {
    modal.classList.remove("active");
    document.body.style.overflow = "";
  }

  blogCards.forEach(card => {
    card.addEventListener("click", () => {
      openBlog(card.dataset.blogId);
    });
  });

  closeBtn.addEventListener("click", closeBlog);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeBlog();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeBlog();
  });
}

// ==========================================
// 6. RESUME VIEWER MODAL & CURSOR-FOLLOW ZOOM
// ==========================================
function initResumeModal() {
  const modal = document.getElementById("resume-modal");
  const closeBtn = document.getElementById("resume-modal-close");
  const triggerBtns = document.querySelectorAll(".resume-trigger");

  function openResume() {
    if (!modal) return;
    modal.classList.add("active");
    document.body.style.overflow = "hidden";
  }

  function closeResume() {
    if (!modal) return;
    modal.classList.remove("active");
    document.body.style.overflow = "";
    if (window.resetResumeZoom) {
      window.resetResumeZoom();
    }
  }

  triggerBtns.forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      openResume();
    });
  });

  if (closeBtn) closeBtn.addEventListener("click", closeResume);
  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeResume();
    });
  }
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeResume();
  });
}

function initResumeZoom() {
  const img = document.getElementById("resume-page-img");
  const zoomBtn = document.getElementById("resume-zoom-btn");
  const zoomText = document.getElementById("resume-zoom-text");
  const viewport = document.getElementById("resume-scroll-viewport");
  if (!img) return;

  let isZoomed = false;
  let targetOriginX = 50;
  let targetOriginY = 20;
  let currentOriginX = 50;
  let currentOriginY = 20;
  let rafId = null;
  const LERP_FACTOR = 0.08; // Silky-smooth physics dampening (prevents jitter and edge snapping)

  function updateOriginLoop() {
    if (!isZoomed) return;

    // Dampen origin towards target smoothly
    currentOriginX += (targetOriginX - currentOriginX) * LERP_FACTOR;
    currentOriginY += (targetOriginY - currentOriginY) * LERP_FACTOR;

    img.style.transformOrigin = `${currentOriginX.toFixed(2)}% ${currentOriginY.toFixed(2)}%`;

    rafId = requestAnimationFrame(updateOriginLoop);
  }

  function toggleZoom(clientX, clientY) {
    isZoomed = !isZoomed;

    if (isZoomed) {
      img.classList.add("is-zoomed");
      if (zoomBtn) zoomBtn.classList.add("active");
      if (zoomText) zoomText.textContent = "Fit Page";

      // If triggered with click coordinates, set target and current origin directly there
      if (typeof clientX === "number" && typeof clientY === "number") {
        const rect = img.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          const xPct = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
          const yPct = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));
          targetOriginX = xPct;
          targetOriginY = yPct;
          currentOriginX = xPct;
          currentOriginY = yPct;
        }
      }

      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(updateOriginLoop);
    } else {
      resetZoom();
    }
  }

  function resetZoom() {
    isZoomed = false;
    if (rafId) cancelAnimationFrame(rafId);
    img.classList.remove("is-zoomed");
    if (zoomBtn) zoomBtn.classList.remove("active");
    if (zoomText) zoomText.textContent = "Zoom";
    img.style.transformOrigin = "50% 0%";
    currentOriginX = 50;
    currentOriginY = 20;
    targetOriginX = 50;
    targetOriginY = 20;
  }

  window.resetResumeZoom = resetZoom;

  // Clicking directly on the resume page smoothly toggles zoom at click location
  img.addEventListener("click", (e) => {
    toggleZoom(e.clientX, e.clientY);
  });

  // Clicking the Zoom button in the modal header
  if (zoomBtn) {
    zoomBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleZoom();
    });
  }

  // Pointer move smoothly updates target coords without instant transform snapping
  function handlePointerMove(clientX, clientY) {
    if (!isZoomed) return;
    const rect = img.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const xPct = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    const yPct = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));
    targetOriginX = xPct;
    targetOriginY = yPct;
  }

  if (viewport) {
    viewport.addEventListener("mousemove", (e) => {
      handlePointerMove(e.clientX, e.clientY);
    });

    viewport.addEventListener("touchmove", (e) => {
      if (e.touches && e.touches.length > 0) {
        handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: true });
  }
}

// ==========================================
// 7. TOAST NOTIFICATION
// ==========================================
function showToast(msg) {
  const toast = document.getElementById("toast-notice");
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add("show");
  setTimeout(() => {
    toast.classList.remove("show");
  }, 2200);
}

// ==========================================
// 8. CLIPBOARD COPY FOR DISCORD
// ==========================================
function initCopyButtons() {
  const discordBtns = document.querySelectorAll(".discord-copy-btn, #discord-copy-btn");
  discordBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      navigator.clipboard.writeText("salwatc_07");
      showToast("Discord username copied: salwatc_07");
    });
  });
}

// ==========================================
// 9. STICKY TOP MENU BAR & SECTION SCROLLSPY
// ==========================================
function initStickyMenuBar() {
  const stickyBar = document.getElementById("sticky-menu-bar");
  if (!stickyBar) return;

  function updateStickyBar() {
    // Menu bar is visible from the very start; adds subtle elevated shadow when scrolled
    if (window.scrollY > 20) {
      stickyBar.classList.add("is-scrolled");
    } else {
      stickyBar.classList.remove("is-scrolled");
    }
  }

  window.addEventListener("scroll", updateStickyBar, { passive: true });
  updateStickyBar();
}

function initMobileMenu() {
  const stickyBar = document.getElementById("sticky-menu-bar");
  const menuBtn = document.getElementById("nav-mobile-menu-btn");
  if (!stickyBar || !menuBtn) return;

  function closeMenu() {
    stickyBar.classList.remove("is-open");
    menuBtn.setAttribute("aria-expanded", "false");
  }

  function toggleMenu() {
    const isOpen = stickyBar.classList.toggle("is-open");
    menuBtn.setAttribute("aria-expanded", isOpen ? "true" : "false");
  }

  menuBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleMenu();
  });

  // Close when clicking anywhere outside sticky bar
  document.addEventListener("click", (e) => {
    if (!stickyBar.contains(e.target)) {
      closeMenu();
    }
  });

  // Close on Escape key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeMenu();
    }
  });

  // Auto-close when resizing to desktop
  window.addEventListener("resize", () => {
    if (window.innerWidth > 640 && stickyBar.classList.contains("is-open")) {
      closeMenu();
    }
  });

  window.closeMobileNav = closeMenu;
}

function initNavigation() {
  // Smooth scroll with offset for section links (desktop and mobile)
  const links = document.querySelectorAll(".nav-sec-link, .nav-brand-btn, .nav-mobile-sec-link");
  links.forEach(link => {
    link.addEventListener("click", (e) => {
      const href = link.getAttribute("href");
      if (href && href.startsWith("#")) {
        e.preventDefault();
        if (window.closeMobileNav) {
          window.closeMobileNav();
        }
        if (href === "#hero" || href === "#") {
          window.scrollTo({ top: 0, behavior: "smooth" });
        } else {
          const target = document.querySelector(href);
          if (target) {
            const topOffset = target.getBoundingClientRect().top + window.scrollY - 70;
            window.scrollTo({ top: topOffset, behavior: "smooth" });
          }
        }
      }
    });
  });

  // Dynamic ScrollSpy to highlight active section across navigation
  const sections = ["experience", "projects", "writing", "hackathons"];
  const navLinks = document.querySelectorAll(".nav-sec-link, .nav-mobile-sec-link");

  function updateActiveSection() {
    const scrollPosition = window.scrollY + 100;

    let currentSection = "";
    if (window.scrollY > 180) {
      sections.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPosition >= top && scrollPosition < top + height) {
            currentSection = id;
          }
        }
      });
    }

    navLinks.forEach(link => {
      if (currentSection && link.dataset.section === currentSection) {
        link.classList.add("active");
      } else {
        link.classList.remove("active");
      }
    });
  }

  window.addEventListener("scroll", updateActiveSection, { passive: true });
  updateActiveSection();
}

// Initialize everything on DOM ready
document.addEventListener("DOMContentLoaded", () => {
  initCanvasRevealEffect();
  initCanvasCursor();
  initTheme();
  initAvatarFlip();
  initHobbies();
  initBlogModal();
  initResumeModal();
  initResumeZoom();
  initCopyButtons();
  initStickyMenuBar();
  initMobileMenu();
  initNavigation();
});
