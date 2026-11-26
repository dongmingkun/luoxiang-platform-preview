import * as THREE from "three";

const CLOCK_ENTRIES = [
  { id: "GB", name: "胆经", shichen: "子时", start: 23, polarity: "yang" },
  { id: "LR", name: "肝经", shichen: "丑时", start: 1, polarity: "yin" },
  { id: "LU", name: "肺经", shichen: "寅时", start: 3, polarity: "yin" },
  { id: "LI", name: "大肠经", shichen: "卯时", start: 5, polarity: "yang" },
  { id: "ST", name: "胃经", shichen: "辰时", start: 7, polarity: "yang" },
  { id: "SP", name: "脾经", shichen: "巳时", start: 9, polarity: "yin" },
  { id: "HT", name: "心经", shichen: "午时", start: 11, polarity: "yin" },
  { id: "SI", name: "小肠经", shichen: "未时", start: 13, polarity: "yang" },
  { id: "BL", name: "膀胱经", shichen: "申时", start: 15, polarity: "yang" },
  { id: "KI", name: "肾经", shichen: "酉时", start: 17, polarity: "yin" },
  { id: "PC", name: "心包经", shichen: "戌时", start: 19, polarity: "yin" },
  { id: "TE", name: "三焦经", shichen: "亥时", start: 21, polarity: "yang" },
];

const TAIJI_FRAG = /* glsl */ `
  uniform vec3 uYinColor;
  uniform vec3 uYangColor;
  uniform vec3 uGlowColor;
  uniform float uTime;
  uniform float uIntensity;
  varying vec2 vUv;

  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    float r = length(p);
    float aa = fwidth(r) * 1.5 + 0.002;
    float disc = 1.0 - smoothstep(1.0 - aa, 1.0, r);
    if (disc < 0.01) discard;

    float top = length(p - vec2(0.0, 0.5));
    float bottom = length(p - vec2(0.0, -0.5));
    bool yin = (p.x < 0.0 && bottom > 0.5) || (top < 0.5);

    float whiteDot = 1.0 - smoothstep(0.115, 0.145, length(p - vec2(0.0, 0.5)));
    float darkDot = 1.0 - smoothstep(0.115, 0.145, length(p - vec2(0.0, -0.5)));

    vec3 col = yin ? uYinColor : uYangColor;
    col = mix(col, uYangColor, whiteDot);
    col = mix(col, uYinColor, darkDot);

    float angle = atan(p.y, p.x);
    float shimmer = 0.5 + 0.5 * sin(angle * 4.0 - uTime * 1.4 + r * 6.0);
    col *= 0.86 + 0.14 * shimmer;

    float edge = smoothstep(0.93, 1.0, r);
    col += uGlowColor * edge * 0.8;

    float sTop = abs(top - 0.5) + step(p.x, -0.0001) * 2.0;
    float sBottom = abs(bottom - 0.5) + step(0.0001, p.x) * 2.0;
    float sDist = min(sTop, sBottom);
    col += uGlowColor * smoothstep(0.02, 0.0, sDist) * (0.55 + 0.45 * sin(uTime * 2.0));

    float alpha = disc * (0.86 + edge * 0.14);
    gl_FragColor = vec4(col * uIntensity, alpha);
  }
`;

const TAIJI_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

function additive(color, opacity = 0.5) {
  return new THREE.MeshBasicMaterial({
    color, transparent: true, opacity,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  });
}

export function createTaiji(data) {
  const group = new THREE.Group();
  group.name = "TaijiCore";
  if (data.taiji) {
    group.position.set(data.taiji.position.x, data.taiji.position.y, data.taiji.position.z);
    group.scale.setScalar(data.taiji.radius);
  }

  const discGroup = new THREE.Group();
  const discMat = new THREE.ShaderMaterial({
    vertexShader: TAIJI_VERT,
    fragmentShader: TAIJI_FRAG,
    uniforms: {
      uYinColor: { value: new THREE.Color("#2fb8ff") },
      uYangColor: { value: new THREE.Color("#ff6a3a") },
      uGlowColor: { value: new THREE.Color("#dff5ff") },
      uTime: { value: 0 },
      uIntensity: { value: 1.0 },
    },
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const disc = new THREE.Mesh(new THREE.CircleGeometry(1, 96), discMat);
  disc.renderOrder = 6;
  discGroup.add(disc);
  group.add(discGroup);

  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.18, 0.012, 8, 96), additive(0x9fe8ff, 0.55));
  ring.renderOrder = 6;
  group.add(ring);

  const bead = new THREE.Mesh(new THREE.SphereGeometry(0.055, 16, 12), additive(0xffe3a6, 0.9));
  bead.renderOrder = 6;
  group.add(bead);

  let angle = 0;
  return {
    group,
    update(state, dt, elapsed) {
      const imbalance = Math.abs(state.yang - state.yin);
      angle += dt * (0.18 + imbalance * 1.8);
      discGroup.rotation.z = angle;
      ring.rotation.z = -angle * 0.45;
      bead.position.set(Math.cos(angle * 1.8) * 1.38, Math.sin(angle * 1.8) * 1.38, 0.02);
      discMat.uniforms.uTime.value = elapsed;
      discMat.uniforms.uIntensity.value = 0.75 + state.qi * 0.35;
      discMat.uniforms.uYinColor.value.setRGB(0.12 + state.yin * 0.35, 0.45 + state.yin * 0.4, 1.0);
      discMat.uniforms.uYangColor.value.setRGB(1.0, 0.18 + state.yang * 0.38, 0.05);
    },
    setVisible(v) { group.visible = v; },
  };
}

export function createDantians(data) {
  const group = new THREE.Group();
  group.name = "Dantians";
  const orbs = [];
  const colors = [0xffb84d, 0xff9a45, 0xc7f0ff];
  (data.dantians || []).forEach((d, i) => {
    const root = new THREE.Group();
    root.position.set(d.position.x, d.position.y, d.position.z);
    const color = colors[i % colors.length];
    const core = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), additive(color, 0.75));
    const halo = new THREE.Mesh(new THREE.SphereGeometry(2.6, 20, 14), additive(color, 0.08));
    core.scale.setScalar(d.radius * 1.2);
    halo.scale.setScalar(d.radius * 1.2);
    root.add(core, halo);
    group.add(root);
    orbs.push({ root, core, halo, base: d.radius, phase: i * 1.7 });
  });
  return {
    group,
    update(state, dt, elapsed) {
      for (const o of orbs) {
        const pulse = 0.9 + 0.1 * Math.sin(elapsed * (0.9 + state.qi * 0.7) + o.phase);
        o.root.scale.setScalar(pulse);
        o.core.material.opacity = 0.25 + 0.35 * state.qi * (1 - state.stagnation * 0.4);
        o.halo.material.opacity = 0.03 + 0.05 * state.qi;
      }
    },
    setVisible(v) { group.visible = v; },
  };
}

export function createClock() {
  const group = new THREE.Group();
  group.name = "MeridianClock";
  group.position.y = 0.9;
  const radius = 0.445;
  const segments = [];

  CLOCK_ENTRIES.forEach((entry, i) => {
    const center = 90 - i * 30;
    const span = 24;
    const points = [];
    for (let k = 0; k <= 12; k++) {
      const a = THREE.MathUtils.degToRad(center + span / 2 - (span * k) / 12);
      points.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius));
    }
    const curve = new THREE.CatmullRomCurve3(points);
    const geo = new THREE.TubeGeometry(curve, 16, 0.0055, 6, false);
    const color = entry.polarity === "yin" ? 0x2fb8ff : 0xff6a3a;
    const mat = additive(color, 0.16);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.renderOrder = 5;
    group.add(mesh);
    segments.push({ entry, mesh, material: mat, baseColor: new THREE.Color(color) });
  });

  for (const y of [-0.055, 0.055]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(radius + 0.05, 0.0018, 6, 96), additive(0x3aa0c8, 0.25));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = y;
    group.add(ring);
  }

  const pointer = new THREE.Mesh(new THREE.SphereGeometry(0.016, 12, 10), additive(0xffe4a0, 0.95));
  pointer.position.y = 0.01;
  group.add(pointer);

  let timeOfDay = 3.4;
  function apply(state) {
    const idx = Math.floor((((timeOfDay + 1) % 24) + 24) % 24 / 2) % 12;
    const entry = CLOCK_ENTRIES[idx];
    const fraction = (((timeOfDay - entry.start) % 24) + 24) % 24 / 2;
    const baseAngle = 90 - idx * 30;
    const angle = THREE.MathUtils.degToRad(baseAngle + (0.5 - Math.min(1, fraction)) * 24);
    pointer.position.x = Math.cos(angle) * radius;
    pointer.position.z = Math.sin(angle) * radius;
    segments.forEach((s, i) => {
      const active = i === idx;
      const blocked = state.blockedMeridian && s.entry.id === state.blockedMeridian && state.stagnation > 0.1;
      s.material.color.copy(blocked ? new THREE.Color("#a82eff") : s.baseColor);
      s.material.opacity = active ? 0.85 : 0.16;
      if (blocked) s.material.opacity *= 0.55;
    });
    return entry;
  }

  return {
    group,
    update(state, dt) {
      timeOfDay = (timeOfDay + dt * 0.55) % 24;
      return apply(state);
    },
    get timeOfDay() { return timeOfDay; },
    setVisible(v) { group.visible = v; },
  };
}

export function createStasis() {
  const group = new THREE.Group();
  group.name = "Stasis";
  const nodes = [];
  for (let i = 0; i < 5; i++) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), additive(0xa82eff, 0.8));
    mesh.visible = false;
    mesh.renderOrder = 5;
    group.add(mesh);
    nodes.push(mesh);
  }
  let pulse = 0;
  return {
    group,
    update(state, dt, meridianSystem) {
      pulse += dt * 2.2;
      const active = state.stagnation > 0.12 && state.blockedMeridian;
      const curve = active ? meridianSystem.getBlockedCurve(state.blockedMeridian) : null;
      const positions = [0.24, 0.38, 0.52, 0.66, 0.80];
      nodes.forEach((n, i) => {
        if (!curve) { n.visible = false; return; }
        n.visible = true;
        const p = curve.getPointAt(positions[i]);
        n.position.copy(p);
        const s = (0.009 + state.stagnation * 0.017) * (0.75 + 0.25 * Math.sin(pulse + i * 1.3));
        n.scale.setScalar(s);
      });
    },
    setVisible(v) { group.visible = v; },
  };
}

export function createStage() {
  const group = new THREE.Group();
  group.name = "Stage";

  const platform = new THREE.Mesh(
    new THREE.CylinderGeometry(0.96, 0.96, 0.035, 96),
    new THREE.MeshStandardMaterial({ color: 0x07131f, metalness: 0.45, roughness: 0.55 }),
  );
  platform.position.y = -0.018;
  group.add(platform);

  for (const [radius, opacity] of [[0.56, 0.18], [0.76, 0.22], [0.93, 0.28]]) {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(radius - 0.003, radius + 0.003, 128),
      new THREE.MeshBasicMaterial({
        color: 0x3fa8d8, transparent: true, opacity,
        blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false,
      }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.003;
    group.add(ring);
  }

  const starGeo = new THREE.BufferGeometry();
  const starPos = new Float32Array(500 * 3);
  for (let i = 0; i < 500; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 1.4 + Math.random() * 3.2;
    starPos[i * 3] = Math.cos(a) * r;
    starPos[i * 3 + 1] = Math.random() * 3.2;
    starPos[i * 3 + 2] = Math.sin(a) * r;
  }
  starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({
    color: 0x3b8ccc, size: 0.008, transparent: true, opacity: 0.5,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  group.add(stars);

  return { group: group, setVisible(v) { group.visible = v; } };
}
