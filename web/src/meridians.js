import * as THREE from "three";

const ELEMENT_COLORS = {
  木: new THREE.Color("#43d98b"),
  火: new THREE.Color("#ff6a4a"),
  土: new THREE.Color("#e8b44c"),
  金: new THREE.Color("#d8eaff"),
  水: new THREE.Color("#3b8cff"),
};
const BLOCKED_FLOW = new THREE.Color("#b06cff");
const STASIS_FLOW = new THREE.Color("#7a1f5a");

// —— 六经气血多少（《素问·血气形志》）与浮沉：决定每条经络的粗细/快慢/急缓/浮沉 ——
const SIX_STAGE = {
  BL: "taiyang", SI: "taiyang",
  ST: "yangming", LI: "yangming",
  GB: "shaoyang", TE: "shaoyang",
  SP: "taiyin", LU: "taiyin",
  KI: "shaoyin", HT: "shaoyin",
  LR: "jueyin", PC: "jueyin",
  DU: "du", RN: "ren",
};

// thick 粗细 / speed 快慢 / urgent 急缓 / depth 浮沉（1=最浮于表，0=最深于里）
// 对比刻意放大:阳明(多气多血)最粗最快,少阴(主藏)最细最缓,肉眼一望可分
const MERIDIAN_PROFILES = {
  taiyang:  { thick: 1.20, speed: 0.95, urgent: 0.90, depth: 1.00 }, // 多血少气，背为阳之表
  yangming: { thick: 1.50, speed: 1.10, urgent: 1.05, depth: 0.80 }, // 多气多血，最盛
  shaoyang: { thick: 0.85, speed: 0.88, urgent: 0.90, depth: 0.62 }, // 少血多气，枢
  taiyin:   { thick: 0.90, speed: 0.70, urgent: 0.55, depth: 0.48 }, // 多气少血，阴中最浮
  shaoyin:  { thick: 0.60, speed: 0.55, urgent: 0.40, depth: 0.28 }, // 少血多气，主藏主静
  jueyin:   { thick: 0.70, speed: 0.60, urgent: 0.45, depth: 0.20 }, // 多血少气，最深
  du:       { thick: 1.30, speed: 1.15, urgent: 1.15, depth: 0.95 }, // 阳脉之海
  ren:      { thick: 0.75, speed: 0.52, urgent: 0.45, depth: 0.35 }, // 阴脉之海
};

function profileFor(baseId) {
  return MERIDIAN_PROFILES[SIX_STAGE[baseId]] || MERIDIAN_PROFILES.taiyang;
}

const VERT = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormalW;
  varying vec3 vWorldPos;
  void main() {
    vUv = uv;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    vNormalW = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const FRAG = /* glsl */ `
  uniform float uTime;
  uniform float uSpeed;
  uniform float uIntensity;
  uniform float uDirection;
  uniform float uPulseCount;
  uniform float uSharpness;
  uniform float uBaseGlow;
  uniform float uRimPower;
  uniform float uBlockage;
  uniform float uBlockPos;
  uniform float uHeartbeat;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform vec3 uBlockedColor;
  varying vec2 vUv;
  varying vec3 vNormalW;
  varying vec3 vWorldPos;

  void main() {
    float t = uTime;
    float flow = vUv.x * uPulseCount - t * uSpeed * uDirection;
    float pulse = pow(saturate(1.0 - abs(fract(flow) - 0.5) * 2.0), uSharpness);
    float wave = 0.5 + 0.5 * sin(vUv.x * 18.0 - t * uSpeed * 2.0 * uDirection);
    float block = smoothstep(0.12, 0.0, abs(vUv.x - uBlockPos)) * uBlockage;
    float gate = 1.0 - uBlockage * smoothstep(0.02, 0.35, abs(vUv.x - uBlockPos));
    vec3 V = normalize(cameraPosition - vWorldPos);
    float rim = pow(1.0 - saturate(abs(dot(normalize(vNormalW), V))), uRimPower);
    vec3 col = mix(uColorA, uColorB, wave * 0.55);
    col = mix(col, uBlockedColor, block * 0.88);
    col *= (uBaseGlow + pulse * 1.65 + rim * 0.7 +
            block * (0.65 + 0.35 * sin(t * 9.0 + vUv.x * 60.0))) * gate;
    float alpha = saturate(0.22 + pulse * 0.85 + rim * 0.35 + block * 0.9);
    alpha = saturate(alpha * uIntensity);
    if (uHeartbeat > 0.001) {
      float beat = 0.5 + 0.5 * sin(t * 6.28318 * 1.2);
      col *= 1.0 + uHeartbeat * 0.55 * pow(beat, 8.0);
    }
    gl_FragColor = vec4(col, alpha);
  }
`;

function flowMaterial(colorA, colorB, opts = {}) {
  return new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms: {
      uTime: { value: 0 },
      uSpeed: { value: opts.speed ?? 0.45 },
      uIntensity: { value: opts.intensity ?? 1.0 },
      uDirection: { value: 1 },
      uPulseCount: { value: opts.pulseCount ?? 6.2 },
      uSharpness: { value: opts.sharpness ?? 7 },
      uBaseGlow: { value: opts.baseGlow ?? 0.12 },
      uRimPower: { value: opts.rimPower ?? 2.1 },
      uBlockage: { value: 0 },
      uBlockPos: { value: 0.46 },
      uHeartbeat: { value: opts.heartbeat ?? 0 },
      uColorA: { value: colorA },
      uColorB: { value: colorB },
      uBlockedColor: { value: new THREE.Color("#9e2eff") },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
}

function makeTube(points, radius, tubularSegments = 190) {
  const vec = points.map(p => new THREE.Vector3(p.x, p.y, p.z));
  const curve = new THREE.CatmullRomCurve3(vec, false, "catmullrom", 0.25);
  const geo = new THREE.TubeGeometry(curve, tubularSegments, radius, 7, false);
  return { curve, geo };
}

function createFlowPoints(curve, color, count, trailLength, kind, baseId) {
  // 用短线段而不是圆点：静态画面也能看出“流向”，运动时像沿经络/血管移动的光流。
  const positions = new Float32Array(count * 6);
  const offsets = new Float32Array(count);
  for (let i = 0; i < count; i += 1) {
    offsets[i] = i / count;
    const u0 = offsets[i];
    const u1 = (u0 - trailLength + 1) % 1;
    const a = curve.getPointAt(u0);
    const b = curve.getPointAt(u1);
    positions[i * 6] = a.x;
    positions[i * 6 + 1] = a.y;
    positions[i * 6 + 2] = a.z;
    positions[i * 6 + 3] = b.x;
    positions[i * 6 + 4] = b.y;
    positions[i * 6 + 5] = b.z;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const material = new THREE.LineBasicMaterial({
    color: color.clone(),
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const points = new THREE.LineSegments(geo, material);
  points.renderOrder = 6;
  points.frustumCulled = false;
  return { curve, points, geo, positions, offsets, trailLength, baseColor: color.clone(), kind, baseId, material };
}

export function createMeridianSystem(data) {
  const group = new THREE.Group();
  group.name = "MeridianSystem";
  const vesselGroup = new THREE.Group();
  vesselGroup.name = "BloodVessels";
  group.add(vesselGroup);
  const flowGroup = new THREE.Group();
  flowGroup.name = "QiBloodFlow";
  group.add(flowGroup);

  const meridians = [];
  const vessels = [];
  const flows = [];

  for (const path of data.meridians || []) {
    const prof = profileFor(path.baseId);
    const { curve, geo } = makeTube(path.points, 0.0058 * prof.thick);
    const isYin = path.polarity === "yin";
    const base = new THREE.Color(isYin ? "#2fb8ff" : "#ff6a3a");
    const accent = (ELEMENT_COLORS[path.element] || base).clone().lerp(base, 0.55);
    const mat = flowMaterial(base, accent, {
      speed: 0.42 * prof.speed,
      pulseCount: 6.2 * (0.75 + prof.urgent * 0.5),
      sharpness: 7 * (0.6 + prof.urgent * 0.6),
      baseGlow: 0.10 * (0.5 + prof.depth * 0.9),
      rimPower: 2.1 * (0.7 + prof.depth * 0.8),
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.name = path.id;
    mesh.renderOrder = 4;
    mesh.userData = { path, curve, isYin };
    group.add(mesh);
    meridians.push({
      id: path.id, baseId: path.baseId, name: path.name, shortName: path.shortName,
      element: path.element, polarity: path.polarity, side: path.side,
      mesh, material: mat, curve, isYin, prof,
    });
    const flow = createFlowPoints(
      curve,
      base.clone().lerp(new THREE.Color("#eaffff"), 0.22),
      Math.round(4 + prof.urgent * 6),
      0.055 - prof.urgent * 0.02,
      "qi",
      path.baseId,
    );
    flow.profile = prof;
    flowGroup.add(flow.points);
    flows.push(flow);
  }

  for (const path of data.vessels || []) {
    const { curve, geo } = makeTube(path.points, 0.0078, 150);
    const mat = flowMaterial(new THREE.Color("#c10a18"), new THREE.Color("#ff6a3a"), {
      speed: 0.24, pulseCount: 4.0, baseGlow: 0.08, heartbeat: 1.0,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.name = path.id;
    mesh.renderOrder = 3;
    mesh.userData = { path, curve };
    vesselGroup.add(mesh);
    vessels.push({ id: path.id, name: path.name, mesh, material: mat, curve });
    const flow = createFlowPoints(curve, new THREE.Color("#ff5a4a"), 12, 0.038, "blood", path.id);
    flowGroup.add(flow.points);
    flows.push(flow);
  }

  return {
    group,
    vesselGroup,
    flowGroup,
    meridians,
    vessels,
    flows,
    style: "real",
    currentState: null,
    currentAffected: [],
    setStyle(mode) { this.style = mode === "holo" ? "holo" : "real"; },
    setFlowVisible(visible) { flowGroup.visible = visible; },
    setVisible(visible) { group.visible = visible; },
    setVesselsVisible(visible) { vesselGroup.visible = visible; },
    tick(time) {
      for (const m of meridians) m.material.uniforms.uTime.value = time;
      for (const v of vessels) v.material.uniforms.uTime.value = time;
      if (!flowGroup.visible) return;
      const state = this.currentState || { qi: 1, blood: 1, stagnation: 0, blockedMeridian: "" };
      const real = this.style !== "holo";
      for (const f of flows) {
        const blocked = f.kind === "qi" && state.blockedMeridian && f.baseId === state.blockedMeridian && state.stagnation > 0.05;
        const stasis = f.kind === "blood" ? THREE.MathUtils.clamp(state.stagnation, 0, 1) : 0;
        const affected = f.kind === "qi" && (this.currentAffected || []).includes(f.baseId);
        const baseSpeed = f.kind === "qi"
          ? (0.045 + state.qi * 0.13) * (f.profile ? f.profile.speed : 1)
          : 0.055 + state.blood * 0.14;
        const syn = f.kind === "qi" && this._flowSyn ? (this._flowSyn[f.baseId] ?? 1) : 1;
        const speed = baseSpeed * syn * (blocked ? 0.15 : 1) * (1 - stasis * 0.55);
        const pos = f.positions;
        for (let i = 0; i < f.offsets.length; i += 1) {
          const u0 = (f.offsets[i] + time * speed) % 1;
          const u1 = (u0 - f.trailLength + 1) % 1;
          const a = f.curve.getPointAt(u0 < 0 ? u0 + 1 : u0);
          const b = f.curve.getPointAt(u1 < 0 ? u1 + 1 : u1);
          pos[i * 6] = a.x;
          pos[i * 6 + 1] = a.y;
          pos[i * 6 + 2] = a.z;
          pos[i * 6 + 3] = b.x;
          pos[i * 6 + 4] = b.y;
          pos[i * 6 + 5] = b.z;
        }
        f.geo.attributes.position.needsUpdate = true;
        const depth = f.profile ? f.profile.depth : 1;
        f.material.opacity = f.kind === "qi"
          ? (real ? (affected ? 0.55 + depth * 0.45 : 0.16 + depth * 0.28) : 0.95)
          : (real ? 0.62 : 1.0);
        f.material.color.copy(
          blocked ? BLOCKED_FLOW : (f.kind === "blood" ? f.baseColor.clone().lerp(STASIS_FLOW, stasis * 0.35) : f.baseColor),
        );
      }
    },
    update(state, affectedBaseIds = []) {
      this.currentState = state;
      this.currentAffected = affectedBaseIds;
      const real = this.style !== "holo";
      // 证候量: 以 0.5 为阴阳平衡基准
      const yangDef = THREE.MathUtils.clamp((0.5 - (state.yang ?? 0.5)) * 2, 0, 1); // 阳虚程度
      const yinDef = THREE.MathUtils.clamp((0.5 - (state.yin ?? 0.5)) * 2, 0, 1);   // 阴虚程度
      const stag = THREE.MathUtils.clamp(state.stagnation ?? 0, 0, 1);
      const inflame = THREE.MathUtils.clamp(state.inflammation ?? 0, 0, 1);
      this._flowSyn = {};
      for (const m of meridians) {
        const blocked = state.blockedMeridian && m.baseId === state.blockedMeridian && state.stagnation > 0.05;
        const affected = affectedBaseIds.includes(m.baseId);
        const p = m.prof;
        const yinYang = m.isYin ? state.yin : state.yang;
        let intensity = 0.30 + state.qi * 0.45 + yinYang * 0.20 + (affected ? 0.35 : 0);
        // 快慢: 六经本气 × 全身气机; 急缓: 六经本气, 随证候伸缩
        let speed = (0.16 + state.qi * 0.55) * p.speed;
        let urgent = p.urgent;
        // 阳虚: 阳经先衰(更慢更暗更缓), 督脉(阳脉之海)尤甚
        const yangHit = yangDef * (m.isYin ? 0.30 : 0.62) * (m.baseId === "DU" ? 1.25 : 1);
        intensity *= 1 - yangHit;
        speed *= 1 - yangHit * 1.15;
        urgent *= 1 - yangDef * (m.isYin ? 0.15 : 0.45);
        // 阴虚: 阴经受累变缓变暗; 阳经虚火上浮——更快、更急、更亮(浮躁)
        if (m.isYin) {
          intensity *= 1 - yinDef * 0.50;
          speed *= 1 - yinDef * 0.45;
        } else {
          intensity *= 1 + yinDef * 0.25 + inflame * 0.10;
          speed *= 1 + yinDef * 0.35;
          urgent *= 1 + yinDef * 0.35;
        }
        // 瘀滞: 整体脉势变钝变慢(阻滞经另有剧变)
        speed *= 1 - stag * 0.28;
        urgent *= 1 - stag * 0.25;
        if (blocked) { intensity *= 0.5; speed *= 0.18; urgent *= 0.6; }
        // 浮沉: 真实模式下浮者透肤而显、沉者藏里而隐
        const surf = 0.25 + p.depth * 0.75;
        if (real) intensity *= affected ? (0.40 + surf * 0.55) : (0.14 + surf * 0.26);
        else intensity *= 0.55 + p.depth * 0.45;
        const u = m.material.uniforms;
        u.uIntensity.value = THREE.MathUtils.clamp(intensity, real ? 0.02 : 0.05, 2.2);
        u.uSpeed.value = speed;
        u.uSharpness.value = 7 * (0.6 + THREE.MathUtils.clamp(urgent, 0.2, 1.5) * 0.6);
        u.uDirection.value = blocked ? -1 : 1;
        u.uBlockage.value = blocked ? state.stagnation : 0;
        u.uBlockPos.value = 0.46;
        u.uBaseGlow.value = blocked ? 0.02 : (affected ? 0.05 + p.depth * 0.07 : 0.02 + p.depth * 0.04);
        // 供流光线段复用的证候速度修正(相对本气基准)
        this._flowSyn[m.baseId] = speed / ((0.16 + state.qi * 0.55) * p.speed);
      }
      for (const v of vessels) {
        const u = v.material.uniforms;
        u.uIntensity.value = THREE.MathUtils.clamp((0.22 + state.blood * 0.42) * (real ? 0.42 : 1), 0.02, 1.4);
        u.uSpeed.value = 0.10 + state.blood * 0.38;
        u.uBlockage.value = state.stagnation * 0.35;
        u.uBaseGlow.value = real ? 0.03 : 0.07;
      }
    },
    getBlockedCurve(baseId) {
      const m = meridians.find(x => x.baseId === baseId);
      return m ? m.curve : null;
    },
    getMeridian(baseId) {
      return meridians.find(x => x.baseId === baseId) || null;
    },
    centerOf(baseId) {
      const m = this.getMeridian(baseId);
      if (!m) return new THREE.Vector3(0, 1.0, 0);
      return m.curve.getPointAt(0.5);
    },
  };
}
