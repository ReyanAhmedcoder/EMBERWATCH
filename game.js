/* =====================================================================
   EMBERWATCH — Night 1 — playable horror prototype (vertical slice)
   Single-file Three.js (r160, non-module build) + 100% procedural audio.
   No external assets besides the Three.js CDN script itself.
   ===================================================================== */
function bootGame() {
'use strict';

/* ---------------- tiny helpers ---------------- */
const clamp = (v,a,b) => v < a ? a : (v > b ? b : v);
const lerp  = (a,b,t) => a + (b - a) * t;
const rand  = (a,b) => a + Math.random() * (b - a);
const TAU = Math.PI * 2;
function $(id){ return document.getElementById(id); }

/* =====================================================================
   AUDIO — everything synthesized with the Web Audio API. No samples.
   ===================================================================== */
const S = {
  ctx:null, master:null, noiseBuf:null,
  windGain:null, started:false,
  heartOn:false, heartBpm:72, _nextBeat:0,
  _cricketT:0.5, cricketsOn:true, _horrorT:3,

  init() {
    if (this.started) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.85;
    this.master.connect(this.ctx.destination);

    // shared white-noise buffer (2s loop)
    const len = this.ctx.sampleRate * 2;
    this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;

    this._startWind();
    this.started = true;
  },
  resume(){ if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); },

  _noiseSrc() {
    const s = this.ctx.createBufferSource();
    s.buffer = this.noiseBuf; s.loop = true;
    return s;
  },

  /* --- looping wind: filtered noise with slow LFO swells --- */
  _startWind() {
    const c = this.ctx;
    const src = this._noiseSrc();
    const filt = c.createBiquadFilter();
    filt.type = 'lowpass'; filt.frequency.value = 420; filt.Q.value = 0.6;
    const g = c.createGain(); g.gain.value = 0.16;
    const lfo = c.createOscillator(); lfo.frequency.value = 0.07;
    const lfoG = c.createGain(); lfoG.gain.value = 0.09;
    lfo.connect(lfoG); lfoG.connect(g.gain);
    const lfo2 = c.createOscillator(); lfo2.frequency.value = 0.045;
    const lfo2G = c.createGain(); lfo2G.gain.value = 160;
    lfo2.connect(lfo2G); lfo2G.connect(filt.frequency);
    src.connect(filt); filt.connect(g); g.connect(this.master);
    src.start(); lfo.start(); lfo2.start();
    this.windGain = g;
  },

  /* --- crickets: scheduled chirps, called from the game loop --- */
  _chirp() {
    const c = this.ctx, t = c.currentTime;
    const o = c.createOscillator(); o.type = 'sine';
    o.frequency.value = rand(3800, 4700);
    const g = c.createGain(); g.gain.value = 0;
    const p = c.createStereoPanner ? c.createStereoPanner() : null;
    // a few quick pulses = one chirp
    for (let i = 0; i < 4; i++) {
      const st = t + i * 0.055;
      g.gain.setValueAtTime(0, st);
      g.gain.linearRampToValueAtTime(0.045, st + 0.012);
      g.gain.linearRampToValueAtTime(0, st + 0.045);
    }
    o.connect(g);
    if (p) { p.pan.value = rand(-0.9, 0.9); g.connect(p); p.connect(this.master); }
    else g.connect(this.master);
    o.start(t); o.stop(t + 0.3);
  },
  updateCrickets(dt) {
    if (!this.started || !this.cricketsOn) return;
    this._cricketT -= dt;
    if (this._cricketT <= 0) { this._chirp(); this._cricketT = rand(0.3, 1.4); }
  },

  /* --- footstep: short filtered noise thud --- */
  footstep(run) {
    if (!this.started) return;
    const c = this.ctx, t = c.currentTime;
    const s = this._noiseSrc();
    const f = c.createBiquadFilter(); f.type = 'lowpass';
    f.frequency.value = rand(280, 420);
    const g = c.createGain();
    const v = run ? 0.30 : 0.20;
    g.gain.setValueAtTime(v, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.11);
    s.connect(f); f.connect(g); g.connect(this.master);
    s.start(t, Math.random() * 1.5); s.stop(t + 0.14);
    const o = c.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(run ? 74 : 58, t);
    o.frequency.exponentialRampToValueAtTime(31, t + 0.18);
    const og = c.createGain(); og.gain.setValueAtTime(run ? 0.16 : 0.1, t);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    o.connect(og); og.connect(this.master); o.start(t); o.stop(t + 0.22);
  },

  horrorPulse() {
    if (!this.started) return;
    const c = this.ctx, t = c.currentTime;
    const o = c.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(rand(110, 170), t);
    o.frequency.exponentialRampToValueAtTime(rand(42, 58), t + 0.8);
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 380;
    const g = c.createGain();
    g.gain.setValueAtTime(0.001, t);
    g.gain.linearRampToValueAtTime(0.12, t + 0.12);
    g.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
    o.connect(f); f.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + 1.3);
    const n = this._noiseSrc();
    const nf = c.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = rand(700, 1200); nf.Q.value = 5;
    const ng = c.createGain(); ng.gain.setValueAtTime(0.001, t);
    ng.gain.linearRampToValueAtTime(0.08, t + 0.25);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
    n.connect(nf); nf.connect(ng); ng.connect(this.master);
    n.start(t, Math.random()); n.stop(t + 1);
  },

  /* --- radio static burst with crackle --- */
  staticBurst(dur, vol) {
    if (!this.started) return;
    dur = dur || 0.5; vol = vol || 0.22;
    const c = this.ctx, t = c.currentTime;
    const s = this._noiseSrc();
    const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 1100;
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.master);
    s.start(t, Math.random()); s.stop(t + dur + 0.05);
    // crackle blips
    const n = Math.floor(dur * 14);
    for (let i = 0; i < n; i++) {
      const bt = t + Math.random() * dur;
      const o = c.createOscillator(); o.type = 'square';
      o.frequency.value = rand(900, 3200);
      const bg = c.createGain();
      bg.gain.setValueAtTime(rand(0.02, 0.06), bt);
      bg.gain.exponentialRampToValueAtTime(0.001, bt + 0.02);
      o.connect(bg); bg.connect(this.master);
      o.start(bt); o.stop(bt + 0.03);
    }
  },

  /* --- heartbeat: scheduler driven from the game loop --- */
  _thump(at, vol) {
    const c = this.ctx;
    const o = c.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(62, at);
    o.frequency.exponentialRampToValueAtTime(38, at + 0.16);
    const g = c.createGain();
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(vol, at + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, at + 0.22);
    o.connect(g); g.connect(this.master);
    o.start(at); o.stop(at + 0.3);
  },
  updateHeart() {
    if (!this.started || !this.heartOn) return;
    const c = this.ctx, now = c.currentTime;
    if (this._nextBeat < now) this._nextBeat = now + 0.05;
    while (this._nextBeat < now + 0.35) {
      this._thump(this._nextBeat, 0.5);
      this._thump(this._nextBeat + 0.26, 0.38);
      this._nextBeat += 60 / this.heartBpm;
    }
  },

  /* --- figure vanish whoosh --- */
  whoosh() {
    if (!this.started) return;
    const c = this.ctx, t = c.currentTime;
    const s = this._noiseSrc();
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.4;
    f.frequency.setValueAtTime(350, t);
    f.frequency.exponentialRampToValueAtTime(3400, t + 0.45);
    const g = c.createGain();
    g.gain.setValueAtTime(0.001, t);
    g.gain.exponentialRampToValueAtTime(0.4, t + 0.12);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
    s.connect(f); f.connect(g); g.connect(this.master);
    s.start(t, Math.random()); s.stop(t + 0.6);
  },

  /* --- distant branch snap --- */
  snap() {
    if (!this.started) return;
    const c = this.ctx, t = c.currentTime;
    const s = this._noiseSrc();
    const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 2400;
    const g = c.createGain();
    g.gain.setValueAtTime(0.22, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
    s.connect(f); f.connect(g); g.connect(this.master);
    s.start(t, Math.random()); s.stop(t + 0.1);
  },

  /* --- wooden thunk (barring the door) --- */
  thunk() {
    if (!this.started) return;
    const c = this.ctx, t = c.currentTime;
    const s = this._noiseSrc();
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 320;
    const g = c.createGain();
    g.gain.setValueAtTime(0.55, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    s.connect(f); f.connect(g); g.connect(this.master);
    s.start(t, Math.random()); s.stop(t + 0.25);
    const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = 92;
    const og = c.createGain();
    og.gain.setValueAtTime(0.4, t);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    o.connect(og); og.connect(this.master);
    o.start(t); o.stop(t + 0.3);
  },

  /* --- UI blip for objective updates --- */
  blip() {
    if (!this.started) return;
    const c = this.ctx, t = c.currentTime;
    const o = c.createOscillator(); o.type = 'square'; o.frequency.value = 660;
    const g = c.createGain();
    g.gain.setValueAtTime(0.06, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + 0.1);
  },

  /* --- the scare sting: dissonant cluster + noise crash + sub drop --- */
  sting() {
    if (!this.started) return;
    const c = this.ctx, t = c.currentTime;
    this.cricketsOn = false;
    if (this.windGain) this.windGain.gain.setTargetAtTime(0.03, t, 0.1);
    const out = c.createGain();
    out.gain.setValueAtTime(0.001, t);
    out.gain.exponentialRampToValueAtTime(1.0, t + 0.03);
    out.gain.exponentialRampToValueAtTime(0.001, t + 2.0);
    out.connect(this.master);
    [104, 110.5, 220.7, 233.1, 466].forEach(function(fr, i) {
      const o = c.createOscillator();
      o.type = i < 2 ? 'sawtooth' : 'square';
      o.frequency.value = fr * rand(0.99, 1.01);
      o.detune.value = rand(-30, 30);
      const g = c.createGain(); g.gain.value = i < 2 ? 0.5 : 0.18;
      o.connect(g); g.connect(out);
      o.start(t); o.stop(t + 2.1);
    });
    // noise crash
    const s = this._noiseSrc();
    const hf = c.createBiquadFilter(); hf.type = 'highpass'; hf.frequency.value = 180;
    const ng = c.createGain(); ng.gain.value = 0.9;
    s.connect(hf); hf.connect(ng); ng.connect(out);
    s.start(t, Math.random()); s.stop(t + 2.1);
    // sub drop
    const sub = c.createOscillator(); sub.type = 'sine';
    sub.frequency.setValueAtTime(72, t);
    sub.frequency.exponentialRampToValueAtTime(27, t + 1.4);
    const sg = c.createGain(); sg.gain.value = 0.8;
    sub.connect(sg); sg.connect(out);
    sub.start(t); sub.stop(t + 2.1);
  }
};

/* =====================================================================
   SCENE
   ===================================================================== */
let renderer, scene, camera;
try {
  renderer = new THREE.WebGLRenderer({ antialias:true, powerPreference:'high-performance' });
} catch (e) {
  $('loaderr').classList.remove('hidden');
  $('title').classList.add('hidden');
  window.__emberwatchBooted = true; // stop the CDN fallback chain; error is shown
  return; // no WebGL — nothing more we can do
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
$('game').appendChild(renderer.domElement);

scene = new THREE.Scene();
scene.background = new THREE.Color(0x070b15);
scene.fog = new THREE.FogExp2(0x0a1120, 0.021);

camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.1, 700);
camera.rotation.order = 'YXZ'; // yaw (Y) then pitch (X) — classic FPS

/* ---------------- lights: cold moonlit night ---------------- */
scene.add(new THREE.HemisphereLight(0x2a3a5f, 0x0a0d08, 0.55));
const moonLight = new THREE.DirectionalLight(0x93a9e8, 0.65);
moonLight.position.set(-60, 90, -40);
scene.add(moonLight);
scene.add(new THREE.AmbientLight(0x141c30, 0.5));

/* ---------------- stars + moon ---------------- */
(function buildSky(){
  const n = 900, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const a = rand(0, TAU), e = rand(0.06, 1.4), r = 620;
    pos[i*3]   = Math.cos(a) * Math.cos(e) * r;
    pos[i*3+1] = Math.sin(e) * r;
    pos[i*3+2] = Math.sin(a) * Math.cos(e) * r;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const m = new THREE.PointsMaterial({ color:0xcdd8ff, size:1.6,
    sizeAttenuation:false, fog:false, transparent:true, opacity:0.75 });
  scene.add(new THREE.Points(g, m));

  // moon disc + halo (fog:false so they punch through)
  const moon = new THREE.Mesh(new THREE.CircleGeometry(16, 32),
    new THREE.MeshBasicMaterial({ color:0xe4ecff, fog:false }));
  moon.position.set(-180, 240, -320); moon.lookAt(0, 0, 0);
  scene.add(moon);
  const haloTex = makeGlowTexture('rgba(190,205,255,0.55)');
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map:haloTex,
    blending:THREE.AdditiveBlending, depthWrite:false, fog:false, opacity:0.5 }));
  halo.scale.set(120, 120, 1); halo.position.copy(moon.position);
  scene.add(halo);
})();

/* ---------------- canvas texture helpers ---------------- */
function makeGlowTexture(rgba) {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(64, 64, 2, 64, 64, 64);
  g.addColorStop(0, rgba); g.addColorStop(0.35, rgba.replace(/[\d.]+\)$/, '0.28)'));
  g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); return t;
}

/* ---------------- ground: forest floor + winding dirt road ----------------
   Road curve shared by texture + tree rejection: x = roadX(z)            */
function roadX(z){ return 8 * Math.sin(z * 0.045) + 4 * Math.sin(z * 0.013); }

(function buildGround(){
  const S = 1024, c = document.createElement('canvas');
  c.width = c.height = S;
  const x = c.getContext('2d');
  // base: very dark blue-green forest floor
  x.fillStyle = '#0c120d'; x.fillRect(0, 0, S, S);
  // mottled noise patches
  for (let i = 0; i < 5200; i++) {
    const r = rand(2, 14);
    x.fillStyle = 'rgba(' + Math.floor(rand(14,34)) + ',' + Math.floor(rand(22,44)) +
      ',' + Math.floor(rand(12,26)) + ',' + rand(0.12, 0.4) + ')';
    x.beginPath(); x.arc(rand(0,S), rand(0,S), r, 0, TAU); x.fill();
  }
  const w2p = S / 240; // world units -> pixels (plane is 240 wide, z in [-120,120])
  // dirt road: soft wide strokes along the curve
  for (let pass = 0; pass < 3; pass++) {
    x.strokeStyle = ['rgba(74,60,40,0.55)','rgba(88,72,48,0.5)','rgba(64,52,36,0.6)'][pass];
    x.lineWidth = (7 - pass * 1.8) * w2p;
    x.lineCap = 'round';
    x.beginPath();
    for (let z = -120; z <= 120; z += 3) {
      const px = (roadX(z) / 240 + 0.5) * S;
      const py = ((z + 120) / 240) * S;
      if (z === -120) x.moveTo(px, py); else x.lineTo(px, py);
    }
    x.stroke();
  }
  // trampled clearing around the tower + cabin
  function clearing(wx, wz, r, alpha) {
    x.fillStyle = 'rgba(52,44,32,' + alpha + ')';
    x.beginPath();
    x.arc((wx/240+0.5)*S, ((wz+120)/240)*S, r*w2p, 0, TAU); x.fill();
  }
  clearing(0, 4, 11, 0.5);
  clearing(-28, 18, 9, 0.45);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const g = new THREE.PlaneGeometry(240, 240, 1, 1);
  const m = new THREE.MeshLambertMaterial({ map:tex });
  const ground = new THREE.Mesh(g, m);
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);
})();

/* ---------------- pine forest (instanced, low-poly) ---------------- */
const treeColliders = []; // {x, z, r}
(function buildForest(){
  const pts = [];
  const NOTE = { x:15.5, z:-46 };
  function clearOf(x, z) {
    if (Math.hypot(x, z - 4) < 10) return false;            // tower clearing
    if (Math.hypot(x + 28, z - 18) < 9) return false;       // cabin clearing
    if (Math.hypot(x - NOTE.x, z - NOTE.z) < 6) return false;// note site
    if (Math.hypot(x - 20, z + 54) < 7) return false;        // anomaly clearing
    if (Math.abs(x - roadX(z)) < 4) return false;           // the road
    return true;
  }
  let guard = 0;
  while (pts.length < 430 && guard++ < 20000) {
    const r = rand(11, 105), a = rand(0, TAU);
    const x = Math.cos(a) * r, z = Math.sin(a) * r * 0.92 - 4;
    if (clearOf(x, z)) pts.push({ x:x, z:z, s:rand(0.8, 1.45) });
  }
  // dense boundary ring keeps the player in
  for (let i = 0; i < 110; i++) {
    const a = (i / 110) * TAU + rand(-0.03, 0.03);
    const r = rand(88, 100);
    pts.push({ x:Math.cos(a)*r, z:Math.sin(a)*r*0.92 - 4, s:rand(1.0, 1.6) });
  }

  const n = pts.length;
  const dummy = new THREE.Object3D();
  const col = new THREE.Color();

  // trunks
  const trunkG = new THREE.CylinderGeometry(0.26, 0.46, 4.2, 5);
  trunkG.translate(0, 2.1, 0);
  const trunkM = new THREE.MeshLambertMaterial({ color:0x2e2117 });
  const trunks = new THREE.InstancedMesh(trunkG, trunkM, n);

  // foliage: 3 stacked cones per tree
  const layers = [
    { r:2.3, h:3.2, y:3.6 },
    { r:1.75, h:2.7, y:5.2 },
    { r:1.15, h:2.3, y:6.7 }
  ];
  const folMeshes = layers.map(function(L){
    const g = new THREE.ConeGeometry(L.r, L.h, 6);
    g.translate(0, L.y, 0);
    const m = new THREE.MeshLambertMaterial({ color:0xffffff });
    return new THREE.InstancedMesh(g, m, n);
  });

  for (let i = 0; i < n; i++) {
    const p = pts[i];
    dummy.position.set(p.x, 0, p.z);
    dummy.scale.set(p.s, p.s * rand(0.9, 1.1), p.s);
    dummy.rotation.set(0, rand(0, TAU), 0);
    dummy.updateMatrix();
    trunks.setMatrixAt(i, dummy.matrix);
    for (const fm of folMeshes) fm.setMatrixAt(i, dummy.matrix);
    // per-instance foliage tint: dark blue-greens
    col.setHSL(0.36 + rand(-0.03, 0.03), rand(0.28, 0.42), rand(0.06, 0.11));
    for (const fm of folMeshes) fm.setColorAt(i, col);
    treeColliders.push({ x:p.x, z:p.z, r:0.55 * p.s });
  }
  trunks.instanceMatrix.needsUpdate = true;
  scene.add(trunks);
  for (const fm of folMeshes) {
    fm.instanceMatrix.needsUpdate = true;
    if (fm.instanceColor) fm.instanceColor.needsUpdate = true;
    scene.add(fm);
  }
})();

/* =====================================================================
   FIRE LOOKOUT TOWER — legs, cross-braces, stairs, observation cab
   Cab floor is at y = 9. Stairs rise along +Z from z=9.2 (ground) to
   z=2.6 (cab door). groundHeight(x,z) mirrors this for the player.
   ===================================================================== */
const CAB_Y = 9;
const woodMat  = new THREE.MeshLambertMaterial({ color:0x4a3826 });
const woodDark = new THREE.MeshLambertMaterial({ color:0x33261a });
function box(w, h, d, mat, x, y, z, ry) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat || woodMat);
  m.position.set(x, y, z);
  if (ry) m.rotation.y = ry;
  scene.add(m); return m;
}

(function buildTower(){
  // legs (slightly splayed)
  const legPos = [[-2.3,-2.3],[2.3,-2.3],[-2.3,2.3],[2.3,2.3]];
  for (const [lx, lz] of legPos) {
    const leg = box(0.55, 9.6, 0.55, woodDark, lx * 0.94, 4.8, lz * 0.94);
    leg.rotation.z = -Math.sign(lx) * 0.035;
    leg.rotation.x = Math.sign(lz) * 0.035;
  }
  // cross braces on all four faces
  for (let s = 0; s < 4; s++) {
    const a = s * Math.PI / 2;
    for (const t of [-1, 1]) {
      const b = box(0.22, 10.4, 0.22, woodDark, 0, 4.6, 0);
      b.rotation.order = 'YXZ'; b.rotation.y = a;
      b.rotation.x = t * 0.42;
      b.translateZ(2.16); b.translateY(0);
    }
  }
  // horizontal girts
  for (const y of [2.6, 5.4, 8.0]) {
    box(4.9, 0.24, 0.24, woodDark, 0, y, 2.16);
    box(4.9, 0.24, 0.24, woodDark, 0, y, -2.16);
    box(0.24, 0.24, 4.9, woodDark, 2.16, y, 0);
    box(0.24, 0.24, 4.9, woodDark, -2.16, y, 0);
  }

  // stairs: 16 steps from (z=9.2,y=0) up to (z=2.6,y=9)
  const STEPS = 16, z0 = 9.2, z1 = 2.6;
  for (let i = 0; i < STEPS; i++) {
    const t = (i + 0.5) / STEPS;
    box(2.2, 0.22, 0.62, woodMat, 0, t * CAB_Y - 0.11, lerp(z0, z1, t));
  }
  // stringers (sloped side beams). Rotation about X maps local +Z to
  // (0,-sin t, cos t); we need direction (0, +CAB_Y, z1-z0) normalized,
  // so t = atan2(-CAB_Y, z1-z0).
  const slopeLen = Math.hypot(z0 - z1, CAB_Y);
  const slopeAng = Math.atan2(-CAB_Y, z1 - z0);
  for (const sx of [-1.15, 1.15]) {
    const s = box(0.24, 0.5, slopeLen + 0.6, woodDark, sx, CAB_Y / 2, (z0 + z1) / 2);
    s.rotation.x = slopeAng;
  }
  // stair railings
  for (const sx of [-1.28, 1.28]) {
    for (let i = 0; i <= 4; i++) {
      const t = i / 4, z = lerp(z0, z1, t);
      box(0.14, 1.1, 0.14, woodDark, sx, t * CAB_Y + 0.55, z);
    }
    const rail = box(0.12, 0.12, slopeLen + 0.4, woodMat, sx, CAB_Y / 2 + 1.05, (z0 + z1) / 2);
    rail.rotation.x = slopeAng;
  }

  // cab floor + support
  box(5.8, 0.35, 5.8, woodDark, 0, CAB_Y - 0.17, 0);
  // cab walls: sill (h1.0) + header, window band open between
  const W = 2.55, T = 0.18, sillH = 1.0, winH = 1.0, headH = 0.55;
  const wy = CAB_Y;
  function wallRun(x1, x2, z, ry) {
    const len = Math.abs(x2 - x1), cx = (x1 + x2) / 2;
    box(len, sillH, T, woodMat, cx, wy + sillH/2, z, ry);
    box(len, headH, T, woodMat, cx, wy + sillH + winH + headH/2, z, ry);
  }
  wallRun(-W, W, -W);            // north
  wallRun(-W, -0.78, W);         // south, left of door
  wallRun(0.78, W, W);           // south, right of door
  box(1.56, headH, T, woodMat, 0, wy + sillH + winH + headH/2, W); // header over door
  // east / west walls via rotated runs
  (function(){
    const len = W * 2;
    for (const sx of [-W, W]) {
      box(T, sillH, len, woodMat, sx, wy + sillH/2, 0);
      box(T, headH, len, woodMat, sx, wy + sillH + winH + headH/2, 0);
    }
  })();
  // corner posts
  for (const [px, pz] of [[-W,-W],[W,-W],[-W,W],[W,W]])
    box(0.3, sillH + winH + headH, 0.3, woodDark, px, wy + (sillH+winH+headH)/2, pz);
  // roof: low pyramid + eaves posts
  for (const [px, pz] of [[-2.7,-2.7],[2.7,-2.7],[-2.7,2.7],[2.7,2.7]])
    box(0.24, 2.0, 0.24, woodDark, px, wy + 2.6 + 1.0, pz);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(4.4, 1.7, 4),
    new THREE.MeshLambertMaterial({ color:0x1f1812 }));
  roof.position.set(0, wy + 2.6 + 2.0 + 0.85, 0);
  roof.rotation.y = Math.PI / 4;
  scene.add(roof);

  // radio table + radio prop in the cab
  box(1.0, 0.75, 0.7, woodDark, 1.7, wy + 0.375, -1.5);          // crate table
  const radio = box(0.55, 0.32, 0.34, new THREE.MeshLambertMaterial({ color:0x1c1c20 }),
    1.7, wy + 0.75 + 0.16, -1.5);
  const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.9),
    new THREE.MeshLambertMaterial({ color:0x555560 }));
  ant.position.set(1.9, wy + 1.35, -1.55); scene.add(ant);
  // little green "on air" LED
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8),
    new THREE.MeshBasicMaterial({ color:0x39ff6a }));
  led.position.set(1.52, wy + 0.98, -1.33); scene.add(led);

  // door bar plank (hidden until objective 6)
  const plank = box(2.3, 0.32, 0.1, woodDark, 0, wy + 1.35, W + 0.05);
  plank.visible = false;
  window.__plank = plank; // stashed for the scare sequence

  // warm lantern glow inside the cab
  const lamp = new THREE.PointLight(0xffb45e, 14, 14, 1.8);
  lamp.position.set(0, wy + 2.1, 0);
  scene.add(lamp);
})();

/* stair / cab ground height: the player walks up the steps smoothly */
function groundHeight(x, z) {
  // stairs footprint
  if (Math.abs(x) <= 1.25 && z >= 2.4 && z <= 9.4) {
    const t = clamp((9.4 - z) / (9.4 - 2.4), 0, 1);
    return t * CAB_Y;
  }
  // cab floor
  if (Math.abs(x) <= 2.85 && Math.abs(z) <= 2.85) return CAB_Y;
  return 0;
}

/* =====================================================================
   CABIN — small wooden hut west of the tower, warm window, open door
   ===================================================================== */
(function buildCabin(){
  const cx = -28, cz = 18, hw = 4.5, hd = 3.5, wh = 3.0;
  box(hw*2, 0.3, hd*2, woodDark, cx, 0.15, cz);                    // floor slab
  // walls (door gap on east side, z in [16.8, 19.2])
  box(hw*2, wh, 0.25, woodMat, cx, wh/2, cz - hd);                // north
  box(hw*2, wh, 0.25, woodMat, cx, wh/2, cz + hd);                // south
  box(0.25, wh, hd*2, woodMat, cx - hw, wh/2, cz);                // west
  const ez = cx + hw;
  box(0.25, wh, 1.7, woodMat, ez, wh/2, cz - hd + 0.85);          // east seg A
  box(0.25, wh, 1.7, woodMat, ez, wh/2, cz + hd - 0.85);          // east seg B
  box(0.25, 0.7, 2.4, woodMat, ez, wh - 0.35, cz);                // lintel over door
  // gable roof: two slabs
  const r1 = box(hw*2 + 1.2, 0.16, hd + 1.1, woodDark, cx, wh + 0.85, cz - hd/2);
  r1.rotation.x = 0.42;
  const r2 = box(hw*2 + 1.2, 0.16, hd + 1.1, woodDark, cx, wh + 0.85, cz + hd/2);
  r2.rotation.x = -0.42;
  // glowing window on the south wall
  const win = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.9),
    new THREE.MeshBasicMaterial({ color:0xffc06a }));
  win.position.set(cx - 1.6, 1.7, cz + hd + 0.14); scene.add(win);
  const winLight = new THREE.PointLight(0xffa54e, 22, 20, 1.8);
  winLight.position.set(cx - 1.6, 1.8, cz + hd + 1.2); scene.add(winLight);
  // crate + lantern inside
  box(1.1, 1.1, 1.1, woodDark, cx - 2.4, 0.85, cz - 1.6);
  const inLight = new THREE.PointLight(0xff9a4e, 8, 9, 1.8);
  inLight.position.set(cx, 2.2, cz); scene.add(inLight);
})();

/* =====================================================================
   THE ANOMALY — pulsing light deep in the northern trees
   ===================================================================== */
const ANOM = new THREE.Vector3(20, 2.3, -54);
let anomGlow, anomCore, anomLight;
(function buildAnomaly(){
  const tex = makeGlowTexture('rgba(255,110,40,0.9)');
  anomGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map:tex,
    blending:THREE.AdditiveBlending, depthWrite:false, depthTest:false,
    fog:false, opacity:0.9 }));
  anomGlow.renderOrder = 5;
  anomGlow.scale.set(7, 7, 1);
  anomGlow.position.copy(ANOM);
  scene.add(anomGlow);
  anomCore = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 12),
    new THREE.MeshBasicMaterial({ color:0xffd9a0, fog:false }));
  anomCore.position.copy(ANOM);
  scene.add(anomCore);
  anomLight = new THREE.PointLight(0xff7a2e, 26, 26, 1.8);
  anomLight.position.copy(ANOM);
  scene.add(anomLight);
})();

/* ---------------- torn note ---------------- */
const NOTE_POS = new THREE.Vector3(15.5, 0, -46);
(function buildNote(){
  const paper = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.75),
    new THREE.MeshLambertMaterial({ color:0xd8cdb4, side:THREE.DoubleSide }));
  paper.rotation.x = -Math.PI/2 + 0.08;
  paper.rotation.z = 0.7;
  paper.position.set(NOTE_POS.x, 0.05, NOTE_POS.z);
  scene.add(paper);
  // faint glint so it catches the flashlight
  const glint = new THREE.PointLight(0xfff2cc, 2.5, 4, 2);
  glint.position.set(NOTE_POS.x, 0.7, NOTE_POS.z);
  scene.add(glint);
})();

/* ---------------- footprints: note site -> back toward the tower ---------------- */
const PRINT_END = new THREE.Vector3(3, 0, -14);
let footprintGroup;
(function buildFootprints(){
  footprintGroup = new THREE.Group();
  const c = document.createElement('canvas'); c.width = 64; c.height = 96;
  const x = c.getContext('2d');
  x.fillStyle = 'rgba(8,8,8,0.85)';
  x.beginPath(); x.ellipse(32, 48, 20, 38, 0, 0, TAU); x.fill();
  const tex = new THREE.CanvasTexture(c);
  const g = new THREE.PlaneGeometry(0.42, 0.6);
  const from = NOTE_POS.clone(), to = PRINT_END.clone();
  const dir = to.clone().sub(from); const dist = dir.length(); dir.normalize();
  const perp = new THREE.Vector3(-dir.z, 0, dir.x);
  const nPrints = 18;
  for (let i = 0; i < nPrints; i++) {
    const t = i / (nPrints - 1);
    const side = (i % 2 === 0 ? 1 : -1) * 0.32;
    const p = from.clone().addScaledVector(dir, t * dist).addScaledVector(perp, side);
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map:tex,
      transparent:true, opacity:0.6, depthWrite:false }));
    m.rotation.x = -Math.PI/2;
    m.rotation.z = Math.atan2(dir.x, dir.z) + (side > 0 ? 0.12 : -0.12);
    m.position.set(p.x, 0.02 + (i % 3) * 0.002, p.z);
    footprintGroup.add(m);
  }
  footprintGroup.visible = false; // revealed when the note is read
  scene.add(footprintGroup);
})();

/* =====================================================================
   THE FIGURE — tall dark humanoid with faint glowing eyes
   ===================================================================== */
const figure = { group:null, eyes:[], state:'hidden', stage:0, swayT:0, waitT:0 };
/* How far from the player the figure materializes on each of its 3 visits.
   Positions are computed from the player's current spot (outward from the
   tower) so the escalation works wherever the player happens to be. */
const FIG_DISTANCES = [18, 10, 4.5];
(function buildFigure(){
  const g = new THREE.Group();
  const dark = new THREE.MeshBasicMaterial({ color:0x020202 });
  function part(geo, x, y, z) {
    const m = new THREE.Mesh(geo, dark);
    m.position.set(x, y, z); g.add(m); return m;
  }
  part(new THREE.BoxGeometry(0.62, 1.5, 0.36), 0, 1.62, 0);      // torso
  part(new THREE.SphereGeometry(0.21, 10, 10), 0, 2.56, 0.02);   // head
  part(new THREE.BoxGeometry(0.14, 1.35, 0.14), -0.44, 1.62, 0); // arms
  part(new THREE.BoxGeometry(0.14, 1.35, 0.14), 0.44, 1.62, 0);
  part(new THREE.BoxGeometry(0.2, 1.0, 0.2), -0.16, 0.5, 0);     // legs
  part(new THREE.BoxGeometry(0.2, 1.0, 0.2), 0.16, 0.5, 0);
  const eyeMat = new THREE.MeshBasicMaterial({ color:0xffe6a3 });
  for (const ex of [-0.085, 0.085]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.038, 8, 8), eyeMat);
    e.position.set(ex, 2.58, 0.185);
    g.add(e); figure.eyes.push(e);
  }
  g.visible = false;
  g.rotation.x = 0.04; // faint forward hunch
  figure.group = g;
  scene.add(g);
})();

/* =====================================================================
   COLLIDERS — circles + AABBs, each with an optional Y band
   ===================================================================== */
const colliders = [];
function addCircle(x, z, r, yMin, yMax) {
  colliders.push({ kind:'c', x:x, z:z, r:r,
    yMin:(yMin===undefined?-99:yMin), yMax:(yMax===undefined?99:yMax) });
}
function addBox(minX, maxX, minZ, maxZ, yMin, yMax) {
  colliders.push({ kind:'b', minX:minX, maxX:maxX, minZ:minZ, maxZ:maxZ,
    yMin:(yMin===undefined?-99:yMin), yMax:(yMax===undefined?99:yMax) });
}
(function buildColliders(){
  for (const t of treeColliders) addCircle(t.x, t.z, t.r);
  // tower legs (only matter at ground level)
  for (const [lx, lz] of [[-2.16,-2.16],[2.16,-2.16],[-2.16,2.16],[2.16,2.16]])
    addCircle(lx, lz, 0.55, -99, 7.5);
  // stair side rails
  addBox(-1.62, -1.14, 2.4, 9.4, -99, 99);
  addBox(1.14, 1.62, 2.4, 9.4, -99, 99);
  // cab walls (only matter up in the cab)
  const W = 2.55, CY = 7.5;
  addBox(-2.9, 2.9, -2.9, -2.28, CY, 99);          // north
  addBox(-2.9, -2.28, -2.9, 2.9, CY, 99);          // west
  addBox(2.28, 2.9, -2.9, 2.9, CY, 99);           // east
  addBox(-2.9, -0.72, 2.28, 2.9, CY, 99);         // south, left of door
  addBox(0.72, 2.9, 2.28, 2.9, CY, 99);           // south, right of door
  // cabin walls (door gap on east side)
  const cx = -28, cz = 18;
  addBox(cx-4.7, cx+4.7, cz-3.7, cz-3.3);         // north
  addBox(cx-4.7, cx+4.7, cz+3.3, cz+3.7);         // south
  addBox(cx-4.7, cx-4.3, cz-3.7, cz+3.7);          // west
  addBox(cx+4.3, cx+4.7, cz-3.7, cz-2.0);          // east seg A
  addBox(cx+4.3, cx+4.7, cz+2.0, cz+3.7);          // east seg B
  // the anomaly core: don't walk through the glow
  addCircle(ANOM.x, ANOM.z, 0.9);
})();

function resolveCollision(p, feetY) {
  const PR = 0.42; // player radius
  for (const c of colliders) {
    if (feetY < c.yMin || feetY > c.yMax) continue;
    if (c.kind === 'c') {
      const dx = p.x - c.x, dz = p.z - c.z;
      const d = Math.hypot(dx, dz), min = c.r + PR;
      if (d < min && d > 0.0001) {
        const push = (min - d) / d;
        p.x += dx * push; p.z += dz * push;
      }
    } else {
      // AABB: find closest point, push out along min-penetration axis
      const nx = clamp(p.x, c.minX, c.maxX), nz = clamp(p.z, c.minZ, c.maxZ);
      const dx = p.x - nx, dz = p.z - nz;
      const d2 = dx*dx + dz*dz;
      if (d2 < PR * PR) {
        if (d2 > 0.000001) {
          const d = Math.sqrt(d2), push = (PR - d) / d;
          p.x += dx * push; p.z += dz * push;
        } else {
          // center inside box: push along smallest exit
          const exL = p.x - c.minX + PR, exR = c.maxX - p.x + PR;
          const ezL = p.z - c.minZ + PR, ezR = c.maxZ - p.z + PR;
          const m = Math.min(exL, exR, ezL, ezR);
          if (m === exL) p.x = c.minX - PR;
          else if (m === exR) p.x = c.maxX + PR;
          else if (m === ezL) p.z = c.minZ - PR;
          else p.z = c.maxZ + PR;
        }
      }
    }
  }
  // world boundary: dense trees ring
  const bd = Math.hypot(p.x, p.z - (-4));
  if (bd > 84) { const s = 84 / bd; p.x *= s; p.z = -4 + (p.z + 4) * s; }
}

/* =====================================================================
   PLAYER
   ===================================================================== */
const P = {
  pos: new THREE.Vector3(0, 0, 12.5), // start at the foot of the stairs
  yaw: Math.PI,   // facing the tower (stairs are at +Z... see note below)
  pitch: 0,
  vel: new THREE.Vector3(),
  eye: 1.65, bobPhase: 0, stride: 0,
  flashOn: true, bino: false, binoToggle: false,
  fov: 72, moving: false, frozen: false
};
// Yaw convention: forward = (-sin(yaw), 0, -cos(yaw)).
// Stairs/tower sit at z < 12.5 relative to the player, i.e. toward -Z,
// so yaw = 0 faces them. Start looking at the tower:
P.yaw = 0;

/* ---------------- visible player avatar ---------------- */
const avatar = { group:null, arms:[], legs:[], torso:null, head:null, flashlight:null };
(function buildPlayerAvatar(){
  const g = new THREE.Group();
  const coat = new THREE.MeshLambertMaterial({ color:0x26313a });
  const cloth = new THREE.MeshLambertMaterial({ color:0x4b2d25 });
  const skin = new THREE.MeshLambertMaterial({ color:0xb4775c });
  function part(geo, mat, x, y, z) {
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); g.add(m); return m;
  }
  avatar.torso = part(new THREE.BoxGeometry(0.78, 1.05, 0.42), coat, 0, 1.18, 0);
  avatar.head = part(new THREE.SphereGeometry(0.25, 10, 8), skin, 0, 1.95, 0);
  part(new THREE.BoxGeometry(0.44, 0.16, 0.48), cloth, 0, 2.15, 0);
  avatar.arms.push(part(new THREE.BoxGeometry(0.18, 0.95, 0.18), coat, -0.52, 1.18, 0));
  avatar.arms.push(part(new THREE.BoxGeometry(0.18, 0.95, 0.18), coat, 0.52, 1.18, 0));
  avatar.flashlight = part(new THREE.CylinderGeometry(0.06, 0.08, 0.38, 8),
    new THREE.MeshLambertMaterial({ color:0x17191c }), 0.56, 0.78, -0.28);
  avatar.flashlight.rotation.x = Math.PI / 2;
  avatar.legs.push(part(new THREE.BoxGeometry(0.23, 0.95, 0.24), cloth, -0.2, 0.48, 0));
  avatar.legs.push(part(new THREE.BoxGeometry(0.23, 0.95, 0.24), cloth, 0.2, 0.48, 0));
  part(new THREE.BoxGeometry(0.3, 0.14, 0.52), new THREE.MeshLambertMaterial({ color:0x11151a }), -0.2, 0.07, -0.08);
  part(new THREE.BoxGeometry(0.3, 0.14, 0.52), new THREE.MeshLambertMaterial({ color:0x11151a }), 0.2, 0.07, -0.08);
  avatar.group = g;
  avatar.group.visible = false;
  scene.add(g);
})();

const keys = {};
let pointerLocked = false;
let gameStarted = false, gameOver = false;

/* flashlight: spotlight that follows the camera */
const flash = new THREE.SpotLight(0xfff1d6, 130, 75, 0.46, 0.45, 1.4);
flash.visible = true;
scene.add(flash); scene.add(flash.target);
// faint cool fill so the player is never in pure black
const fill = new THREE.PointLight(0x8fa8ff, 1.6, 7, 1.8);
scene.add(fill);

const _fwd = new THREE.Vector3();
function camForward(out) {
  out = out || _fwd;
  out.set(-Math.sin(P.yaw) * Math.cos(P.pitch),
           Math.sin(P.pitch),
          -Math.cos(P.yaw) * Math.cos(P.pitch));
  return out;
}

/* ---------------- input ---------------- */
document.addEventListener('keydown', function(e){
  if (e.code === 'Tab') e.preventDefault();
  keys[e.code] = true;
  if (!gameStarted || gameOver) return;
  if (e.code === 'KeyF') { P.flashOn = !P.flashOn; flash.visible = P.flashOn; }
  if (e.code === 'KeyB') {
    P.binoToggle = !P.binoToggle;
    setBino(P.binoToggle);
  }
  if (e.code === 'KeyE') onInteractKey();
});
document.addEventListener('keyup', function(e){ keys[e.code] = false; });
document.addEventListener('mousemove', function(e){
  if (!pointerLocked || !gameStarted || gameOver) return;
  P.yaw   -= e.movementX * 0.0023;
  P.pitch -= e.movementY * 0.0023;
  P.pitch = clamp(P.pitch, -1.45, 1.45);
});
document.addEventListener('mousedown', function(e){
  if (!gameStarted || gameOver) return;
  if (!pointerLocked) { lockPointer(); return; }
  if (e.button === 2) setBino(true);   // hold right mouse = binoculars
  if (e.button === 0) onInteractKey(); // left click also interacts (note overlay)
});
document.addEventListener('mouseup', function(e){
  if (e.button === 2 && !P.binoToggle) setBino(false);
});
document.addEventListener('contextmenu', function(e){ e.preventDefault(); });
function setBino(on) {
  P.bino = on;
  $('bino').classList.toggle('hidden', !on);
}
function lockPointer() {
  const el = renderer.domElement;
  try {
    const r = el.requestPointerLock && el.requestPointerLock();
    if (r && r.catch) r.catch(function(){});
  } catch (e) { /* pointer lock unavailable; mouse-look just won't work */ }
}
document.addEventListener('pointerlockchange', function(){
  pointerLocked = (document.pointerLockElement === renderer.domElement);
  if (gameStarted && !gameOver && !pointerLocked) $('pausehint').classList.remove('hidden');
  else $('pausehint').classList.add('hidden');
});
$('pausehint').addEventListener('click', function(){ lockPointer(); });
window.addEventListener('resize', function(){
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

/* =====================================================================
   OBJECTIVES
   ===================================================================== */
const OBJECTIVES = [
  { title:'CLIMB THE TOWER',          hint:'Head up the stairs to the lookout cab' },
  { title:'RADIO CHECK-IN',           hint:'Use the radio in the cab — E' },
  { title:'SCAN THE TREELINE',        hint:'Binoculars: hold RIGHT-CLICK or press B — scan the northern treeline' },
  { title:'INVESTIGATE THE LIGHT',    hint:'Take the stairs down and follow the pulsing light into the trees' },
  { title:'SOMETHING IS WATCHING',    hint:'Keep your flashlight on it or run. If it reaches you, it is over.' },
  { title:'GET BACK TO THE TOWER',    hint:'Return to the cab and bar the door — E' },
  { title:'',                         hint:'' } // index 6: all done
];
let curObj = 0, spotted = false, noteRead = false;
let figureTimer = -1, scareTimer = -1, endTimer = -1, fadeTimer = -1, shakeT = 0;

function refreshHUD() {
  const o = OBJECTIVES[curObj];
  document.querySelector('#objective .obj-title').textContent =
    o.title === '' ? '—' : '◈ ' + o.title;
  document.querySelector('#objective .obj-hint').textContent = o.hint;
}
function setHint(h) {
  OBJECTIVES[curObj].hint = h;
  document.querySelector('#objective .obj-hint').textContent = h;
}
function setObjective(i) {
  curObj = i;
  refreshHUD();
  S.blip();
  if (i === 4) figureTimer = 1.4;      // the figure steps out of the trees…
  if (i === 6) scareTimer = 1.8;       // …then, after the door is barred
}
function completeObjective(i) { if (i === curObj) setObjective(i + 1); }

let toastTimer = 0;
function showToast(text, dur) {
  $('toast').textContent = text;
  toastTimer = dur || 4;
}

/* =====================================================================
   DIALOGUE — typewriter radio conversations
   ===================================================================== */
const DLG = { active:false, lines:[], i:0, shown:0, t:0, full:'', onDone:null };
const DLG_OPENING = [
  { who:'DISPATCH', you:false, text:'Tower 7, confirm visual. You are replacing Ranger Merritt until dawn.' },
  { who:'YOU', you:true, text:'Confirmed. I have the tower and the north ridge in sight.' },
  { who:'DISPATCH', you:false, text:'Merritt stopped answering three nights ago. Her last log mentioned a light below the tree line.' },
  { who:'YOU', you:true, text:'A light? What kind of light?' },
  { who:'DISPATCH', you:false, text:'She called it a signal. Do not follow it. Check in, keep the door barred, and wait for morning.' },
  { who:'YOU', you:true, text:'Understood. I will find out what happened to her.' }
];
const DLG_CHECKIN = [
  { who:'RANGER ELLIS', you:false, text:'Tower 7, this is Ellis at base. Radio check, over.' },
  { who:'YOU', you:true, text:"Loud and clear, Ellis. Just climbed up. It's... a lot of trees out here. Over." },
  { who:'RANGER ELLIS', you:false, text:"Ha. You'll get used to it. Quiet night so far — keep your eyes on the north ridge. Dry lightning earlier." },
  { who:'YOU', you:true, text:'Copy that. Anything else I should know? Over.' },
  { who:'RANGER ELLIS', you:false, text:'...Yeah. Bar your door after midnight. Old habit up there. Ellis out.' }
];
const DLG_REPORT = [
  { who:'YOU', you:true, text:"Ellis, Tower 7 — there's a light past the north treeline. Pulsing. It's not a campfire. Over." },
  { who:'RANGER ELLIS', you:false, text:"...Say again? There's nothing past that ridge, kid. No trails, no camps. Over." },
  { who:'YOU', you:true, text:"It's there. I'm going down for a closer look. Over." },
  { who:'RANGER ELLIS', you:false, text:"Negative — stay in the tower, that's an order— *KSSSH* —Tower 7? ...Damn it. *static*" }
];
const DLG_MERRITT = [
  { who:'MERRITT — RECORDED LOG', you:false, text:'If this page made it back to the tower, then it has learned the path.' },
  { who:'MERRITT — RECORDED LOG', you:false, text:'The light is not a lamp. It is looking for someone who will answer.' },
  { who:'YOU', you:true, text:'Merritt? Where are you?' },
  { who:'MERRITT — RECORDED LOG', you:false, text:'Do not let it hear your name. Do not let it reach the door.' }
];
function showDlgLine() {
  const L = DLG.lines[DLG.i];
  const whoEl = $('dlgWho');
  whoEl.textContent = L.who;
  whoEl.classList.toggle('you', !!L.you);
  DLG.full = L.text; DLG.shown = 0; DLG.t = 0;
  $('dlgLine').textContent = '';
}
function startDialogue(lines, onDone) {
  DLG.active = true; DLG.lines = lines; DLG.i = 0; DLG.onDone = onDone || null;
  P.frozen = true;
  $('dialogue').classList.remove('hidden');
  S.staticBurst(0.4, 0.16);
  showDlgLine();
}
function advanceDialogue() {
  if (DLG.shown < DLG.full.length) { // finish the line instantly
    DLG.shown = DLG.full.length;
    $('dlgLine').textContent = DLG.full;
    return;
  }
  DLG.i++;
  if (DLG.i >= DLG.lines.length) {
    DLG.active = false;
    $('dialogue').classList.add('hidden');
    P.frozen = false;
    S.staticBurst(0.6, 0.14);
    const cb = DLG.onDone; DLG.onDone = null;
    if (cb) cb();
  } else {
    S.staticBurst(0.22, 0.1);
    showDlgLine();
  }
}
function updateDialogue(dt) {
  if (!DLG.active || DLG.shown >= DLG.full.length) return;
  DLG.t += dt;
  while (DLG.t > 0.024 && DLG.shown < DLG.full.length) {
    DLG.t -= 0.024; DLG.shown++;
  }
  $('dlgLine').textContent = DLG.full.slice(0, DLG.shown);
}

/* =====================================================================
   INTERACTABLES
   ===================================================================== */
const RADIO_POS = new THREE.Vector3(1.7, CAB_Y + 1.0, -1.5);
const DOOR_POS  = new THREE.Vector3(0, CAB_Y + 1.0, 2.55);
const interactables = [
  { id:'radio',
    pos:RADIO_POS, r:2.8,
    prompt:function(){ return (curObj === 2 && spotted) ? 'Report the light' : 'Use radio'; },
    avail:function(){ return curObj === 1 || (curObj === 2 && spotted); },
    action:function(){
      if (curObj === 1) startDialogue(DLG_CHECKIN, function(){ completeObjective(1); });
      else startDialogue(DLG_REPORT, function(){ completeObjective(2); });
    } },
  { id:'note',
    pos:NOTE_POS, r:2.4,
    prompt:function(){ return 'Read torn page'; },
    avail:function(){ return curObj === 3 && !noteRead; },
    action:function(){ openNote(); } },
  { id:'door',
    pos:DOOR_POS, r:2.6,
    prompt:function(){ return 'Bar the door'; },
    avail:function(){ return curObj === 5 && P.pos.y > 7.5; },
    action:function(){ barDoor(); } }
];
const _itFwd = new THREE.Vector3();
function nearestInteractable() {
  let best = null, bd = 1e9;
  camForward(_itFwd);
  const eyeY = P.pos.y + P.eye;
  for (const it of interactables) {
    if (!it.avail()) continue;
    const dx = it.pos.x - P.pos.x, dy = it.pos.y - eyeY, dz = it.pos.z - P.pos.z;
    const d = Math.sqrt(dx*dx + dy*dy + dz*dz);
    if (d < it.r && d < bd) {
      const dot = (dx*_itFwd.x + dy*_itFwd.y + dz*_itFwd.z) / (d || 1);
      if (dot > 0.3) { best = it; bd = d; }
    }
  }
  return best;
}
function onInteractKey() {
  if (!gameStarted || gameOver) return;
  if (!$('note').classList.contains('hidden')) { closeNote(); return; }
  if (DLG.active) { advanceDialogue(); return; }
  if (P.frozen) return;
  const it = nearestInteractable();
  if (it) it.action();
}

/* ---------------- note overlay ---------------- */
function openNote() {
  $('note').classList.remove('hidden');
  P.frozen = true;
}
function closeNote() {
  $('note').classList.add('hidden');
  P.frozen = false;
  if (!noteRead) {
    noteRead = true;
    footprintGroup.visible = true;
    setHint('Follow the footprints back toward the tower');
    S.blip();
    showToast('The prints lead back toward your tower.', 5);
    startDialogue(DLG_MERRITT, function(){
      showToast('Something in the trees just answered.', 4);
    });
  }
}
$('note').addEventListener('click', function(){ closeNote(); });

/* ---------------- bar the door -> final scare ---------------- */
function barDoor() {
  S.thunk();
  if (window.__plank) window.__plank.visible = true;
  P.frozen = true; // hold still; something is coming
  completeObjective(5); // -> index 6, arms scareTimer
}
function finalScare() {
  figure.state = 'scare';
  figure.group.position.set(0.6, CAB_Y, -5.4);
  figure.group.lookAt(P.pos.x, CAB_Y + 1.6, P.pos.z);
  figure.group.visible = true;
  S.sting();
  S.heartOn = false;
  const dmg = $('damage');
  dmg.style.opacity = '1';
  setTimeout(function(){ dmg.style.opacity = '0'; }, 900);
  shakeT = 1.5;
  endTimer = 2.3;
}
function figureCaught() {
  if (figure.state !== 'stalking') return;
  figure.state = 'caught';
  P.frozen = true;
  P.vel.set(0, 0, 0);
  S.sting();
  S.heartOn = false;
  $('damage').style.opacity = '1';
  endTimer = 1.2;
}
function updateScare(dt) {
  if (scareTimer > 0) { scareTimer -= dt; if (scareTimer <= 0) finalScare(); }
  if (endTimer > 0) {
    endTimer -= dt;
    // the figure lunges a step closer during the sting
    if (figure.state === 'scare' || figure.state === 'caught') {
      const targetY = figure.state === 'scare' ? CAB_Y : P.pos.y;
      figure.group.position.lerp(new THREE.Vector3(P.pos.x, targetY, P.pos.z), dt * 0.55);
      figure.group.lookAt(P.pos.x, targetY + 1.6, P.pos.z);
    }
    if (endTimer <= 0) {
      $('fade').style.opacity = '1';
      fadeTimer = 2.9;
    }
  }
  if (fadeTimer > 0) {
    fadeTimer -= dt;
    if (fadeTimer <= 0) {
      gameOver = true;
      if (document.exitPointerLock) document.exitPointerLock();
      if (figure.state === 'caught') {
        $('endingTitle').textContent = 'THE SIGNAL FOUND ME';
        $('endingText').textContent =
          'I heard it outside the trees. I turned too late. By the time Ellis called, the tower was empty.';
        $('endingDetail').textContent = 'MERRITT WAS RIGHT. IT LEARNS THE WAY HOME.';
      } else {
        nightMinutes = DAWN_MINUTES;
        $('game-clock').textContent = '6:00 AM';
      }
      $('ending').classList.remove('hidden');
      S.cricketsOn = false;
      S.heartOn = false;
    }
  }
}
$('endingRestart').addEventListener('click', function(){ location.reload(); });

/* =====================================================================
   FIGURE BEHAVIOR — appears 3x, closer each time; vanishes in the beam
   ===================================================================== */
const _toFig = new THREE.Vector3(), _camP = new THREE.Vector3();
function figureAppear(stage) {
  figure.stage = stage;
  // materialize outward from the tower, at the staged distance from the player
  const dir = new THREE.Vector3(P.pos.x, 0, P.pos.z);
  if (dir.lengthSq() < 0.01) dir.set(0, 0, -1);
  dir.normalize();
  const spot = new THREE.Vector3(P.pos.x, 0, P.pos.z)
    .addScaledVector(dir, FIG_DISTANCES[stage]);
  if (spot.length() > 78) spot.setLength(78);
  figure.group.position.set(spot.x, 0, spot.z);
  figure.group.visible = true;
  figure.state = 'stalking';
  S.snap();
  showToast(stage === 0 ? 'Movement in the trees.' : 'It is closer.', 3);
}
function figureVanish() {
  S.whoosh();
  figure.group.visible = false;
  figure.state = 'gone';
  S.heartOn = false;
  figure.stage++;
  if (figure.stage < FIG_DISTANCES.length) {
    figure.state = 'waiting';
    figure.waitT = rand(1.1, 2.1);
  } else {
    completeObjective(4); // survived all three appearances
    showToast('It is gone. Get back to the tower. NOW.', 5);
  }
}
function updateFigure(dt, t) {
  if (figureTimer > 0) {
    figureTimer -= dt;
    if (figureTimer <= 0) figureAppear(0);
  }
  if (figure.state === 'waiting') {
    figure.waitT -= dt;
    if (figure.waitT <= 0) figureAppear(figure.stage);
    return;
  }
  if (figure.state !== 'stalking') return;

  // sway + face the player (lookAt first, then add the sway tilt)
  figure.swayT += dt;
  figure.group.lookAt(P.pos.x, 1.5, P.pos.z);
  figure.group.rotation.z += Math.sin(figure.swayT * 1.3) * 0.035;
  figure.group.position.y = Math.sin(figure.swayT * 2.1) * 0.03;
  const es = 1 + Math.sin(figure.swayT * 5.2) * 0.18;
  for (const e of figure.eyes) e.scale.set(es, es, es);

  // heartbeat scales with proximity
  _camP.set(P.pos.x, P.pos.y + P.eye, P.pos.z);
  const dist = _camP.distanceTo(
    _toFig.set(figure.group.position.x, 1.8, figure.group.position.z));
  S.heartOn = true;
  S.heartBpm = clamp(165 - dist * 4.5, 62, 150);
  S._horrorT -= dt;
  if (S._horrorT <= 0) {
    S.horrorPulse();
    S._horrorT = clamp(dist * 0.16, 1.2, 3.4);
  }

  // vanish when the flashlight beam pins it
  if (P.flashOn && dist < 48) {
    _toFig.sub(_camP).normalize();
    camForward(_fwd);
    if (_fwd.dot(_toFig) > 0.986) figureVanish();
  }
  if (figure.state !== 'stalking') return;

  // The figure steadily closes in unless the flashlight drives it away.
  const dx = P.pos.x - figure.group.position.x;
  const dz = P.pos.z - figure.group.position.z;
  const groundDist = Math.hypot(dx, dz);
  if (groundDist <= 1.4) {
    figureCaught();
    return;
  }
  const approach = Math.min(groundDist - 1.4, (2.2 + figure.stage * 0.65) * dt);
  figure.group.position.x += dx / groundDist * approach;
  figure.group.position.z += dz / groundDist * approach;
}

/* =====================================================================
   TITLE / BOOT WIRING
   ===================================================================== */
$('title').addEventListener('click', function(){
  S.init(); S.resume();
  $('title').classList.add('hidden');
  $('hud').classList.remove('hidden');
  gameStarted = true;
  refreshHUD();
  showToast('Ironbark Ridge — 11:47 PM', 5);
  startDialogue(DLG_OPENING, function(){
    showToast('The tower is yours until dawn.', 4);
  });
  lockPointer();
});

/* =====================================================================
   PER-FRAME UPDATES
   ===================================================================== */
const _wish = new THREE.Vector3(), _camPos = new THREE.Vector3();
function updatePlayer(dt) {
  const run = !!(keys['ShiftLeft'] || keys['ShiftRight']);
  const speed = run ? 7.0 : 4.2;
  let ix = 0, iz = 0;
  if (!P.frozen) {
    if (keys['KeyW'] || keys['ArrowUp']) iz += 1;
    if (keys['KeyS'] || keys['ArrowDown']) iz -= 1;
    if (keys['KeyA'] || keys['ArrowLeft']) ix -= 1;
    if (keys['KeyD'] || keys['ArrowRight']) ix += 1;
  }
  const moving = (ix !== 0 || iz !== 0);
  P.moving = moving;
  // wish direction in world space (yaw=0 faces -Z)
  const fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw);
  const rx = Math.cos(P.yaw),  rz = -Math.sin(P.yaw);
  _wish.set(fx * iz + rx * ix, 0, fz * iz + rz * ix);
  if (_wish.lengthSq() > 0) _wish.normalize().multiplyScalar(speed);
  // accelerate toward wish velocity
  const k = 1 - Math.exp(-10 * dt);
  P.vel.x += (_wish.x - P.vel.x) * k;
  P.vel.z += (_wish.z - P.vel.z) * k;
  P.pos.x += P.vel.x * dt;
  P.pos.z += P.vel.z * dt;
  resolveCollision(P.pos, P.pos.y);
  // ride stairs / cab floor smoothly
  const targetY = groundHeight(P.pos.x, P.pos.z);
  P.pos.y += (targetY - P.pos.y) * (1 - Math.exp(-14 * dt));
  if (Math.abs(targetY - P.pos.y) < 0.01) P.pos.y = targetY;

  // head bob + footsteps
  const hSpeed = Math.hypot(P.vel.x, P.vel.z);
  let bobY = 0;
  if (hSpeed > 0.6 && !P.frozen) {
    P.bobPhase += dt * hSpeed * 1.55;
    bobY = Math.sin(P.bobPhase) * 0.05;
    P.stride += hSpeed * dt;
    if (P.stride > (run ? 2.7 : 2.15)) { P.stride = 0; S.footstep(run); }
  }

  // Animate the visible ranger so movement reads clearly from the camera.
  avatar.group.position.set(P.pos.x, P.pos.y, P.pos.z);
  avatar.group.rotation.y = P.yaw;
  const strideWave = Math.sin(P.bobPhase);
  const strideScale = hSpeed > 0.6 && !P.frozen ? Math.min(hSpeed / 4.2, 1.5) : 0;
  const breathing = Math.sin(elapsed * 1.8) * 0.018;
  avatar.legs[0].rotation.x = strideWave * 0.55 * strideScale;
  avatar.legs[1].rotation.x = -strideWave * 0.55 * strideScale;
  avatar.arms[0].rotation.x = -strideWave * 0.32 * strideScale;
  avatar.arms[1].rotation.x = P.flashOn ? -0.48 + Math.sin(elapsed * 2.5) * 0.025 : strideWave * 0.32 * strideScale;
  avatar.arms[1].rotation.z = P.flashOn ? -0.16 : 0;
  avatar.flashlight.visible = P.flashOn;
  avatar.flashlight.rotation.z = P.flashOn ? -0.18 : 0;
  avatar.torso.rotation.z = hSpeed > 0.6 ? Math.sin(P.bobPhase * 0.5) * 0.025 : 0;
  avatar.torso.scale.y = 1 + breathing;
  avatar.head.rotation.z = hSpeed > 0.6 ? Math.sin(P.bobPhase * 0.5) * 0.035 : Math.sin(elapsed * 0.7) * 0.018;

  // camera
  _camPos.set(P.pos.x, P.pos.y + P.eye + bobY, P.pos.z);
  camera.position.copy(_camPos);
  camForward(_fwd);
  camera.lookAt(P.pos.x + _fwd.x * 8, P.pos.y + P.eye + _fwd.y * 8, P.pos.z + _fwd.z * 8);
  if (hSpeed > 0.6 && !P.frozen) {
    camera.rotation.z += Math.sin(P.bobPhase * 0.5) * 0.008;
    camera.position.y += Math.cos(P.bobPhase) * 0.025;
  }
  if (shakeT > 0) { // scare shake
    shakeT -= dt;
    const s = Math.max(0, shakeT) * 0.05;
    camera.rotation.x += (Math.random() - 0.5) * s;
    camera.rotation.y += (Math.random() - 0.5) * s;
    camera.rotation.z += (Math.random() - 0.5) * s * 0.5;
  }
  // binocular zoom
  const targetFov = P.bino ? 24 : 72;
  if (Math.abs(camera.fov - targetFov) > 0.05) {
    camera.fov += (targetFov - camera.fov) * (1 - Math.exp(-10 * dt));
    camera.updateProjectionMatrix();
  }
  // flashlight follows the view
  flash.position.copy(_camPos);
  camForward(_fwd);
  flash.target.position.copy(_camPos).addScaledVector(_fwd, 14);
  fill.position.copy(_camPos);
}

function updateAnomaly(t) {
  const pulse = 0.72 + 0.28 * Math.sin(t * 6.3) + 0.12 * Math.sin(t * 15.7);
  const s = 6.2 * pulse + 1.2;
  anomGlow.scale.set(s, s, 1);
  anomGlow.material.opacity = 0.55 + 0.4 * pulse;
  anomLight.intensity = 20 + 14 * pulse + Math.random() * 3;
  const cs = 1 + 0.25 * Math.sin(t * 6.3);
  anomCore.scale.set(cs, cs, cs);
}

const _toAnom = new THREE.Vector3();
function updateTriggers(dt) {
  // 1. reached the cab?
  if (curObj === 0 && P.pos.y > 8.5 &&
      Math.abs(P.pos.x) <= 2.9 && Math.abs(P.pos.z) <= 2.9) {
    completeObjective(0);
    showToast('The radio crackles on the crate.', 4);
  }
  // 3. spot the light through binoculars
  if (curObj === 2 && !spotted && P.bino) {
    _toAnom.copy(ANOM).sub(_camPos).normalize();
    camForward(_fwd);
    if (_fwd.dot(_toAnom) > 0.9925) {
      spotted = true;
      S.blip();
      setHint('You saw it. Get on the radio — E');
      showToast('A pulsing light. Deep in the northern treeline.', 5);
    }
  }
  // 4. followed the footprints back toward the tower?
  if (curObj === 3 && noteRead) {
    const d = Math.hypot(P.pos.x - PRINT_END.x, P.pos.z - PRINT_END.z);
    if (d < 6) setObjective(4);
  }
}

function updatePrompt() {
  const el = $('prompt');
  if (DLG.active || P.frozen || !$('note').classList.contains('hidden')) {
    el.classList.add('hidden');
    return;
  }
  const it = nearestInteractable();
  if (it) {
    $('promptText').textContent = '— ' + it.prompt();
    el.classList.remove('hidden');
  } else el.classList.add('hidden');
}

/* ---------------- main loop ---------------- */
const clock = new THREE.Clock();
let elapsed = 0;
let nightMinutes = 11 * 60 + 47;
const DAWN_MINUTES = 24 * 60 + 6 * 60;
let nightClockRemainder = 0;
function updateGameClock(dt) {
  nightClockRemainder += dt;
  const elapsedMinutes = Math.floor(nightClockRemainder);
  if (elapsedMinutes > 0) {
    nightMinutes = Math.min(nightMinutes + elapsedMinutes, DAWN_MINUTES);
    nightClockRemainder -= elapsedMinutes;
    const timeOfDay = nightMinutes % (24 * 60);
    const hour24 = Math.floor(timeOfDay / 60);
    const hour12 = hour24 % 12 || 12;
    const minute = String(timeOfDay % 60).padStart(2, '0');
    const period = hour24 < 12 ? 'AM' : 'PM';
    $('game-clock').textContent = hour12 + ':' + minute + ' ' + period;
  }
}
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  elapsed += dt;
  if (gameStarted && !gameOver) {
    updateGameClock(dt);
    updatePlayer(dt);
    updateTriggers(dt);
    updateFigure(dt, elapsed);
    updateScare(dt);
    updateDialogue(dt);
    updateAnomaly(elapsed);
    updatePrompt();
    S.updateCrickets(dt);
    S.updateHeart();
    if (toastTimer > 0) {
      toastTimer -= dt;
      if (toastTimer <= 0) $('toast').textContent = '';
    }
  } else if (!gameStarted) {
    // idle camera drift behind the title screen
    camera.position.set(Math.sin(elapsed * 0.05) * 6, 3.2, 16);
    camera.lookAt(0, 7, 0);
    updateAnomaly(elapsed);
  }
  renderer.render(scene, camera);
}
// place the camera at the spawn before the first frame
camera.position.set(P.pos.x, P.eye, P.pos.z);
camera.lookAt(0, 2, 0);
animate();
window.__emberwatchBooted = true;

} // ================= end bootGame() =================
