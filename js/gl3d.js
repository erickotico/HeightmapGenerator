/* Forja de Mundos — prévia 3D em WebGL2 puro (sem bibliotecas, funciona offline).
   A malha é uma grade N×N; a altura vem de uma textura float lida no vertex shader.
   Por cima: textura de detalhes (rios e estradas) na resolução cheia e superfície dos lagos no nível calculado. */
'use strict';

const VS_TERRAIN = `#version 300 es
precision highp float; precision highp sampler2D;
uniform sampler2D uH; uniform int uN; uniform float uCell; uniform float uExag; uniform mat4 uVP; uniform vec2 uOvMap;
layout(location=0) in vec2 aG;
out vec3 vW; out vec3 vNrm; out float vH; out float vSlope; out vec2 vUV;
float hAt(ivec2 p){ p = clamp(p, ivec2(0), ivec2(uN-1)); return texelFetch(uH, p, 0).r; }
void main(){
  ivec2 p = ivec2(aG);
  float h = hAt(p);
  float hx = hAt(p+ivec2(1,0)) - hAt(p-ivec2(1,0));
  float hz = hAt(p+ivec2(0,1)) - hAt(p-ivec2(0,1));
  vNrm = normalize(vec3(-hx*uExag, 2.0*uCell, -hz*uExag));
  vSlope = degrees(atan(length(vec2(hx,hz)) / (2.0*uCell)));
  float half_ = float(uN-1) * uCell * 0.5;
  vec3 w = vec3(aG.x*uCell - half_, h*uExag, aG.y*uCell - half_);
  vW = w; vH = h;
  vUV = aG / float(uN-1) * uOvMap.x + uOvMap.y; // grade da prévia → texel da textura de detalhes
  gl_Position = uVP * vec4(w, 1.0);
}`;

const FS_TERRAIN = `#version 300 es
precision highp float;
in vec3 vW; in vec3 vNrm; in float vH; in float vSlope; in vec2 vUV;
uniform sampler2D uOv;
uniform vec3 uSun; uniform vec3 uCam; uniform float uSnow; uniform float uBeach; uniform float uRock; uniform float uFog; uniform float uDeep;
uniform vec3 uSky;
out vec4 o;
void main(){
  vec3 n = normalize(vNrm);
  vec3 sand = vec3(.78,.72,.52), grass = vec3(.36,.52,.24), dgrass = vec3(.25,.40,.18), dirt = vec3(.47,.42,.31), rock = vec3(.50,.48,.45), snow = vec3(.95,.96,.98);
  vec3 c;
  if (vH < uBeach) c = sand;
  else {
    float t = clamp((vH - uBeach) / max(uSnow - uBeach, 1.0), 0.0, 1.0);
    c = mix(grass, dgrass, smoothstep(0.0, 0.4, t));
    c = mix(c, dirt, smoothstep(0.45, 0.85, t));
  }
  float r = smoothstep(uRock - 6.0, uRock + 6.0, vSlope);
  c = mix(c, rock, r);
  float s = smoothstep(uSnow - 60.0, uSnow + 60.0, vH) * (1.0 - r * 0.7);
  c = mix(c, snow, s);
  if (vH < 0.0) c = mix(sand, vec3(.28,.33,.30), clamp(-vH / uDeep, 0.0, 1.0));
  else { vec4 ov = texture(uOv, vUV); c = mix(c, ov.rgb, ov.a); } // rios e estradas
  float dif = max(dot(n, uSun), 0.0);
  vec3 col = c * (0.30 + 0.85 * dif);
  float d = length(vW - uCam);
  col = mix(col, uSky, (1.0 - exp(-d / uFog)) * 0.65);
  o = vec4(col, 1.0);
}`;

const VS_WATER = `#version 300 es
precision highp float;
uniform mat4 uVP; uniform float uHalf;
layout(location=0) in vec2 aP;
out vec3 vW;
void main(){ vW = vec3(aP.x*uHalf, 0.0, aP.y*uHalf); gl_Position = uVP * vec4(vW, 1.0); }`;

const FS_WATER = `#version 300 es
precision highp float;
in vec3 vW; uniform vec3 uCam; uniform float uFog; uniform vec3 uSky;
out vec4 o;
void main(){
  vec3 col = vec3(.12,.36,.58);
  float d = length(vW - uCam);
  col = mix(col, uSky, (1.0 - exp(-d / uFog)) * 0.65);
  o = vec4(col, 0.72);
}`;

// Lagos: a mesma grade, na altura do nível da água; fora dos lagos o fragmento é descartado.
const VS_LAKE = `#version 300 es
precision highp float; precision highp sampler2D;
uniform sampler2D uH; uniform sampler2D uL; uniform int uN; uniform float uCell; uniform float uExag; uniform mat4 uVP;
layout(location=0) in vec2 aG;
out vec3 vW; out float vOn;
void main(){
  ivec2 p = ivec2(aG);
  float lv = texelFetch(uL, p, 0).r, h = texelFetch(uH, p, 0).r;
  vOn = lv > -1e5 ? 1.0 : 0.0;
  float half_ = float(uN-1) * uCell * 0.5;
  vW = vec3(aG.x*uCell - half_, (vOn > 0.5 ? lv : h - 50.0) * uExag, aG.y*uCell - half_);
  gl_Position = uVP * vec4(vW, 1.0);
}`;

const FS_LAKE = `#version 300 es
precision highp float;
in vec3 vW; in float vOn; uniform vec3 uCam; uniform float uFog; uniform vec3 uSky;
out vec4 o;
void main(){
  if (vOn < 0.5) discard;
  vec3 col = vec3(.16,.45,.62);
  float d = length(vW - uCam);
  col = mix(col, uSky, (1.0 - exp(-d / uFog)) * 0.65);
  o = vec4(col, 0.8);
}`;

const M4 = {
  persp(fovy, asp, n, f) {
    const t = 1 / Math.tan(fovy / 2);
    return [t / asp, 0, 0, 0, 0, t, 0, 0, 0, 0, (f + n) / (n - f), -1, 0, 0, (2 * f * n) / (n - f), 0];
  },
  lookAt(e, c, u) {
    let zx = e[0] - c[0], zy = e[1] - c[1], zz = e[2] - c[2];
    let l = Math.hypot(zx, zy, zz); zx /= l; zy /= l; zz /= l;
    let xx = u[1] * zz - u[2] * zy, xy = u[2] * zx - u[0] * zz, xz = u[0] * zy - u[1] * zx;
    l = Math.hypot(xx, xy, xz); xx /= l; xy /= l; xz /= l;
    const yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
    return [xx, yx, zx, 0, xy, yy, zy, 0, xz, yz, zz, 0,
      -(xx * e[0] + xy * e[1] + xz * e[2]), -(yx * e[0] + yy * e[1] + yz * e[2]), -(zx * e[0] + zy * e[1] + zz * e[2]), 1];
  },
  mul(a, b) {
    const o = new Array(16);
    for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
      let s = 0;
      for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k];
      o[c * 4 + r] = s;
    }
    return o;
  }
};

class Terrain3D {
  constructor(canvas) {
    this.cv = canvas;
    const gl = canvas.getContext('webgl2', { antialias: true });
    this.gl = gl;
    this.ok = !!gl;
    this.exag = 1.5;
    if (!gl) return;
    this.yaw = 0.7; this.pitch = 0.55; this.dist = 0; this.target = [0, 0, 0];
    this.N = 0; this.world = 1000; this.cell = 1;
    this.params = { snow: 1100, beach: 3, rock: 38, deep: 140 };
    this.sky = [0.62, 0.72, 0.84];
    this.pT = this.program(VS_TERRAIN, FS_TERRAIN);
    this.pW = this.program(VS_WATER, FS_WATER);
    this.pL = this.program(VS_LAKE, FS_LAKE);
    this.maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    const mkTex = (filter) => {
      const t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return t;
    };
    this.ovTex = mkTex(gl.LINEAR); this.ovMap = [1, 0];
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
    this.lkTex = mkTex(gl.NEAREST); this.lakes = null;
    this.tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.vao = gl.createVertexArray();
    this.vbo = gl.createBuffer();
    this.ibo = gl.createBuffer();
    this.wvao = gl.createVertexArray();
    gl.bindVertexArray(this.wvao);
    const wb = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, wb);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
    this.bindInput();
    new ResizeObserver(() => this.draw()).observe(canvas);
  }

  program(vs, fs) {
    const gl = this.gl;
    const mk = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    };
    const p = gl.createProgram();
    gl.attachShader(p, mk(gl.VERTEX_SHADER, vs));
    gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    const u = {};
    const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) { const info = gl.getActiveUniform(p, i); u[info.name] = gl.getUniformLocation(p, info.name); }
    return { p, u };
  }

  buildGrid(N) {
    const gl = this.gl;
    const v = new Float32Array(N * N * 2);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { v[(y * N + x) * 2] = x; v[(y * N + x) * 2 + 1] = y; }
    const idx = new Uint32Array((N - 1) * (N - 1) * 6);
    let k = 0;
    for (let y = 0; y < N - 1; y++) for (let x = 0; x < N - 1; x++) {
      const a = y * N + x, b = a + 1, c = a + N, d = c + 1;
      idx[k++] = a; idx[k++] = c; idx[k++] = b; idx[k++] = b; idx[k++] = c; idx[k++] = d;
    }
    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    gl.bufferData(gl.ARRAY_BUFFER, v, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
    gl.bindVertexArray(null);
    this.N = N; this.count = idx.length;
  }

  // Reduz a altura de trabalho para no máximo 512×512 (média por bloco) e envia para a GPU.
  setHeights(H, W, worldM) {
    if (!this.ok) return;
    const gl = this.gl;
    const N = Math.min(W, 512);
    let data;
    if (N === W) data = H;
    else {
      data = new Float32Array(N * N);
      const k = W / N;
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        const sx = Math.floor(x * k), sy = Math.floor(y * k), kk = Math.max(1, Math.floor(k));
        let s = 0;
        for (let j = 0; j < kk; j++) for (let i = 0; i < kk; i++) s += H[(sy + j) * W + sx + i];
        data[y * N + x] = s / (kk * kk);
      }
    }
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, N, N, 0, gl.RED, gl.FLOAT, data);
    if (N !== this.N) this.buildGrid(N);
    this.data = data; // cópia na CPU para o modo caminhada saber a altura do chão
    const changedWorld = Math.abs(worldM - this.world) > 1;
    this.world = worldM; this.cell = worldM / (N - 1);
    if (!this.dist || changedWorld) this.resetCamera();
    this.draw();
  }

  // Textura de detalhes (canvas RGBA de qualquer tamanho cobrindo o mapa); srcW = resolução da grade do mapa.
  setOverlay(canvas, srcW) {
    if (!this.ok) return;
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.ovTex);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
    this.ovMap = [(srcW - 1) / srcW, 0.5 / srcW]; // célula g (0..srcW-1) → centro do texel (g + 0,5) / srcW
    this.draw();
  }

  // Nível dos lagos (NaN = sem lago) reduzido para a grade da prévia: maior nível do bloco, alargado 1 célula
  // para a água encostar na margem (o terreno da margem tampa o excesso).
  setLakes(L, W) {
    if (!this.ok || !this.N) return;
    const gl = this.gl, N = this.N;
    this.lakes = null;
    if (L) {
      const k = W / N, kk = Math.max(1, Math.ceil(k)), blk = new Float32Array(N * N).fill(-1e9);
      let any = false;
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        const sx = Math.floor(x * k), sy = Math.floor(y * k);
        let m = -1e9;
        for (let j = 0; j < kk && sy + j < W; j++) for (let i = 0; i < kk && sx + i < W; i++) { const v = L[(sy + j) * W + sx + i]; if (v > m) m = v; }
        if (m > -1e5) { blk[y * N + x] = m; any = true; }
      }
      if (any) {
        const out = Float32Array.from(blk);
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          if (blk[y * N + x] > -1e5) continue;
          let m = -1e9;
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx, ny = y + dy;
            if (nx >= 0 && ny >= 0 && nx < N && ny < N && blk[ny * N + nx] > m) m = blk[ny * N + nx];
          }
          out[y * N + x] = m;
        }
        this.lakes = out;
      }
    }
    gl.bindTexture(gl.TEXTURE_2D, this.lkTex);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, this.lakes ? N : 1, this.lakes ? N : 1, 0, gl.RED, gl.FLOAT, this.lakes || new Float32Array([-1e9]));
    this.draw();
  }

  resetCamera() { this.dist = this.world * 1.05; this.target = [0, 0, 0]; this.yaw = 0.7; this.pitch = 0.6; this.draw(); }

  // Altura do terreno (m, sem exagero) num ponto do mundo — bilinear na malha da prévia.
  heightAt(x, z) {
    const N = this.N, half = ((N - 1) * this.cell) / 2;
    const gx = Math.min(N - 1.001, Math.max(0, (x + half) / this.cell)), gz = Math.min(N - 1.001, Math.max(0, (z + half) / this.cell));
    const x0 = Math.floor(gx), z0 = Math.floor(gz), fx = gx - x0, fz = gz - z0, d = this.data, i = z0 * N + x0;
    return (d[i] * (1 - fx) + d[i + 1] * fx) * (1 - fz) + (d[i + N] * (1 - fx) + d[i + N + 1] * fx) * fz;
  }

  // Nível da água do lago naquele ponto (ou -Infinity fora dos lagos): na caminhada se anda por cima da água.
  lakeAt(x, z) {
    if (!this.lakes) return -Infinity;
    const N = this.N, half = ((N - 1) * this.cell) / 2;
    const gx = Math.round((x + half) / this.cell), gz = Math.round((z + half) / this.cell);
    const v = this.lakes[Math.min(N - 1, Math.max(0, gz)) * N + Math.min(N - 1, Math.max(0, gx))];
    return v > -1e5 ? v : -Infinity;
  }

  // Modo caminhada: câmera a 1,8 m do chão, escala real (sem exagero vertical). WASD move, arrastar olha.
  enterWalk(onInfo, onExit) {
    if (!this.ok || !this.N || this.walk) return;
    this.walk = { x: this.target[0], z: this.target[2], yaw: this.yaw, pitch: 0, keys: new Set(), last: performance.now(), onInfo, onExit };
    this.savedExag = this.exag; this.exag = 1;
    this.onKey = (e) => {
      if (e.key === 'Escape') { this.exitWalk(); return; }
      const k = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'shift'].includes(k)) {
        e.preventDefault();
        if (e.type === 'keydown') this.walk.keys.add(k); else this.walk.keys.delete(k);
      }
    };
    window.addEventListener('keydown', this.onKey);
    window.addEventListener('keyup', this.onKey);
    const loop = (t) => {
      if (!this.walk) return;
      this.tickWalk(t);
      this.render();
      this.walkRaf = requestAnimationFrame(loop);
    };
    this.walkRaf = requestAnimationFrame(loop);
  }

  exitWalk() {
    if (!this.walk) return;
    const cb = this.walk.onExit;
    cancelAnimationFrame(this.walkRaf);
    window.removeEventListener('keydown', this.onKey);
    window.removeEventListener('keyup', this.onKey);
    this.target = [this.walk.x, 0, this.walk.z];
    this.walk = null; this.exag = this.savedExag;
    this.draw();
    if (cb) cb();
  }

  tickWalk(t) {
    const w = this.walk, dt = Math.min(0.1, (t - w.last) / 1000);
    w.last = t;
    const k = w.keys, run = k.has('shift'), speed = run ? 40 : 6;
    let f = 0, s = 0;
    if (k.has('w') || k.has('arrowup')) f++;
    if (k.has('s') || k.has('arrowdown')) f--;
    if (k.has('d') || k.has('arrowright')) s++;
    if (k.has('a') || k.has('arrowleft')) s--;
    const fx = -Math.sin(w.yaw), fz = -Math.cos(w.yaw), rx = Math.cos(w.yaw), rz = -Math.sin(w.yaw);
    const len = Math.hypot(f, s) || 1, half = this.world / 2 - 1;
    w.x = Math.min(half, Math.max(-half, w.x + ((fx * f + rx * s) / len) * speed * dt * (f || s ? 1 : 0)));
    w.z = Math.min(half, Math.max(-half, w.z + ((fz * f + rz * s) / len) * speed * dt * (f || s ? 1 : 0)));
    if (w.onInfo) w.onInfo({ ground: this.heightAt(w.x, w.z), speed: f || s ? speed : 0 });
  }

  bindInput() {
    const cv = this.cv;
    let drag = null;
    cv.addEventListener('contextmenu', (e) => e.preventDefault());
    cv.addEventListener('pointerdown', (e) => { cv.setPointerCapture(e.pointerId); drag = { x: e.clientX, y: e.clientY, b: e.button }; });
    cv.addEventListener('pointerup', () => { drag = null; });
    cv.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      drag.x = e.clientX; drag.y = e.clientY;
      if (this.walk) {
        this.walk.yaw -= dx * 0.004;
        this.walk.pitch = Math.min(1.4, Math.max(-1.4, this.walk.pitch - dy * 0.004));
        return;
      }
      if (drag.b === 0) {
        this.yaw -= dx * 0.005;
        this.pitch = Math.min(1.5, Math.max(0.05, this.pitch + dy * 0.005));
      } else {
        const k = this.dist * 0.0015;
        const rx = Math.cos(this.yaw), rz = -Math.sin(this.yaw);
        const fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw);
        this.target[0] -= (rx * dx - fx * dy) * k;
        this.target[2] -= (rz * dx - fz * dy) * k;
      }
      this.draw();
    });
    cv.addEventListener('wheel', (e) => {
      e.preventDefault();
      if (this.walk) return;
      this.dist = Math.min(this.world * 4, Math.max(this.world * 0.02, this.dist * Math.exp(e.deltaY * 0.001)));
      this.draw();
    }, { passive: false });
  }

  draw() {
    if (!this.ok || this.raf) return;
    this.raf = requestAnimationFrame(() => { this.raf = 0; this.render(); });
  }

  render() {
    const gl = this.gl, cv = this.cv;
    const dpr = window.devicePixelRatio || 1;
    const w = Math.max(1, Math.round(cv.clientWidth * dpr)), h = Math.max(1, Math.round(cv.clientHeight * dpr));
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    gl.viewport(0, 0, w, h);
    gl.clearColor(this.sky[0], this.sky[1], this.sky[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    if (!this.N) return;
    let eye, look, proj;
    if (this.walk) {
      const wk = this.walk, cp = Math.cos(wk.pitch);
      eye = [wk.x, Math.max(this.heightAt(wk.x, wk.z), 0, this.lakeAt(wk.x, wk.z)) + 1.8, wk.z];
      look = [eye[0] - Math.sin(wk.yaw) * cp, eye[1] + Math.sin(wk.pitch), eye[2] - Math.cos(wk.yaw) * cp];
      proj = M4.persp(1.1, w / h, 0.3, this.world * 2);
    } else {
      const cp = Math.cos(this.pitch);
      eye = [this.target[0] + this.dist * cp * Math.sin(this.yaw), this.target[1] + this.dist * Math.sin(this.pitch), this.target[2] + this.dist * cp * Math.cos(this.yaw)];
      look = this.target;
      proj = M4.persp(0.9, w / h, Math.max(1, this.dist * 0.002), this.dist * 4 + this.world * 2);
    }
    const vp = M4.mul(proj, M4.lookAt(eye, look, [0, 1, 0]));
    const sun = [0.45, 0.75, 0.35], sl = Math.hypot(...sun);
    const fog = this.world * 1.6;

    gl.enable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
    gl.depthMask(true);
    const T = this.pT;
    gl.useProgram(T.p);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.uniform1i(T.u.uH, 0);
    gl.uniform1i(T.u.uN, this.N);
    gl.uniform1f(T.u.uCell, this.cell);
    gl.uniform1f(T.u.uExag, this.exag);
    gl.uniformMatrix4fv(T.u.uVP, false, vp);
    gl.uniform3f(T.u.uSun, sun[0] / sl, sun[1] / sl, sun[2] / sl);
    gl.uniform3fv(T.u.uCam, eye);
    gl.uniform1f(T.u.uSnow, this.params.snow);
    gl.uniform1f(T.u.uBeach, this.params.beach);
    gl.uniform1f(T.u.uRock, this.params.rock);
    gl.uniform1f(T.u.uDeep, this.params.deep);
    gl.uniform1f(T.u.uFog, fog);
    gl.uniform3fv(T.u.uSky, this.sky);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.ovTex);
    gl.uniform1i(T.u.uOv, 1);
    gl.uniform2f(T.u.uOvMap, this.ovMap[0], this.ovMap[1]);
    gl.bindVertexArray(this.vao);
    gl.drawElements(gl.TRIANGLES, this.count, gl.UNSIGNED_INT, 0);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.depthMask(false);
    const Wp = this.pW;
    gl.useProgram(Wp.p);
    gl.uniformMatrix4fv(Wp.u.uVP, false, vp);
    gl.uniform1f(Wp.u.uHalf, this.world * 0.5);
    gl.uniform3fv(Wp.u.uCam, eye);
    gl.uniform1f(Wp.u.uFog, fog);
    gl.uniform3fv(Wp.u.uSky, this.sky);
    gl.bindVertexArray(this.wvao);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    if (this.lakes) {
      const L = this.pL;
      gl.useProgram(L.p);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.tex); gl.uniform1i(L.u.uH, 0);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.lkTex); gl.uniform1i(L.u.uL, 1);
      gl.uniform1i(L.u.uN, this.N);
      gl.uniform1f(L.u.uCell, this.cell);
      gl.uniform1f(L.u.uExag, this.exag);
      gl.uniformMatrix4fv(L.u.uVP, false, vp);
      gl.uniform3fv(L.u.uCam, eye);
      gl.uniform1f(L.u.uFog, fog);
      gl.uniform3fv(L.u.uSky, this.sky);
      gl.bindVertexArray(this.vao);
      gl.drawElements(gl.TRIANGLES, this.count, gl.UNSIGNED_INT, 0);
    }
    gl.bindVertexArray(null);
    gl.depthMask(true);
  }
}
