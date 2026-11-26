import * as THREE from "three";

const ELEMENT_COLORS = {
  木: new THREE.Color("#43d98b"),
  火: new THREE.Color("#f48c42"),
  土: new THREE.Color("#e8b856"),
  金: new THREE.Color("#cfe6f5"),
  水: new THREE.Color("#3ba4f5"),
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
const MERIDIAN_PROFILES = {
  taiyang:  { thick: 1.12, speed: 0.92, urgent: 0.86, depth: 1.00 }, // 多血少气，背为阳之表
  yangming: { thick: 1.32, speed: 1.05, urgent: 1.00, depth: 0.82 }, // 多气多血，最盛
  shaoyang: { thick: 0.88, speed: 0.86, urgent: 0.85, depth: 0.64 }, // 少血多气，枢
  taiyin:   { thick: 0.90, speed: 0.72, urgent: 0.58, depth: 0.50 }, // 多气少血，阴中最浮
  shaoyin:  { thick: 0.68, speed: 0.58, urgent: 0.44, depth: 0.30 }, // 少血多气，主藏主静
  jueyin:   { thick: 0.74, speed: 0.62, urgent: 0.48, depth: 0.24 }, // 多血少气，最深
  du:       { thick: 1.24, speed: 1.08, urgent: 1.05, depth: 0.96 }, // 阳脉之海
  ren:      { thick: 0.80, speed: 0.56, urgent: 0.46, depth: 0.38 }, // 阴脉之海
};

// 参考 GB/T 12346《经穴名称与定位》的示范代表穴位（沿经脉路径相对比例示意，完整体表定位持续精修）
const ACUPOINT_REFS = {
  DU: [{ u: 0.22, name: "命门 GV4" }, { u: 0.62, name: "大椎 GV14" }, { u: 0.90, name: "百会 GV20" }],
  RN: [{ u: 0.20, name: "关元 CV4" }, { u: 0.52, name: "中脘 CV12" }, { u: 0.78, name: "膻中 CV17" }],
  LU: [{ u: 0.24, name: "中府 LU1" }, { u: 0.56, name: "尺泽 LU5" }, { u: 0.88, name: "太渊 LU9" }],
  LI: [{ u: 0.14, name: "合谷 LI4" }, { u: 0.52, name: "曲池 LI11" }, { u: 0.86, name: "迎香 LI20" }],
  ST: [{ u: 0.34, name: "天枢 ST25" }, { u: 0.68, name: "足三里 ST36" }, { u: 0.90, name: "冲阳 ST42" }],
  SP: [{ u: 0.18, name: "三阴交 SP6" }, { u: 0.38, name: "阴陵泉 SP9" }, { u: 0.72, name: "大横 SP15" }],
  HT: [{ u: 0.22, name: "极泉 HT1" }, { u: 0.56, name: "少海 HT3" }, { u: 0.88, name: "神门 HT7" }],
  SI: [{ u: 0.16, name: "后溪 SI3" }, { u: 0.52, name: "小海 SI8" }, { u: 0.86, name: "听宫 SI19" }],
  BL: [{ u: 0.32, name: "肺俞 BL13" }, { u: 0.48, name: "肾俞 BL23" }, { u: 0.76, name: "委中 BL40" }],
  KI: [{ u: 0.08, name: "涌泉 KI1" }, { u: 0.18, name: "太溪 KI3" }, { u: 0.66, name: "气穴 KI13" }],
  PC: [{ u: 0.30, name: "曲泽 PC3" }, { u: 0.76, name: "内关 PC6" }, { u: 0.92, name: "劳宫 PC8" }],
  TE: [{ u: 0.20, name: "外关 TE5" }, { u: 0.52, name: "天井 TE10" }, { u: 0.86, name: "翳风 TE17" }],
  GB: [{ u: 0.24, name: "风池 GB20" }, { u: 0.56, name: "环跳 GB30" }, { u: 0.76, name: "阳陵泉 GB34" }],
  LR: [{ u: 0.10, name: "太冲 LR3" }, { u: 0.42, name: "曲泉 LR8" }, { u: 0.82, name: "期门 LR14" }],
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

// 有机拖尾流光着色器：使用连续积分相位 uPhase（切换状态绝不倒跳），
// 配合首尾柔化 endFade 与前亮后拖的彗尾波形，呈现舒缓温润的气血流动。
const FRAG = /* glsl */ `
  uniform float uTime;
  uniform float uPhase;
  uniform float uIntensity;
  uniform float uDirection;
  uniform float uPulseCount;
  uniform float uTailPower;
  uniform float uBaseGlow;
  uniform float uRimPower;
  uniform float uBlockage;
  uniform float uBlockPos;
  uniform float uHeartbeat;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform vec3 uCoreColor;
  uniform vec3 uBlockedColor;
  varying vec2 vUv;
  varying vec3 vNormalW;
  varying vec3 vWorldPos;

  void main() {
    float t = uTime;
    float f = fract(vUv.x * uPulseCount - uPhase);
    float oriented = uDirection >= 0.0 ? f : (1.0 - f);

    // 柔润彗尾波：前缘平滑亮起（0.88），尾部舒缓消散（0.08→0.88）
    float head = smoothstep(1.0, 0.88, oriented) * smoothstep(0.66, 0.88, oriented);
    float tail = pow(smoothstep(0.06, 0.88, oriented), uTailPower) * smoothstep(1.0, 0.88, oriented);
    float pulse = tail * 0.50 + pow(head, 1.55) * 0.92;

    // 开放经脉起止端渐隐，避免端点突兀闪烁
    float endFade = smoothstep(0.0, 0.055, vUv.x) * smoothstep(1.0, 0.945, vUv.x);

    float wave = 0.5 + 0.5 * sin(vUv.x * 12.0 - uPhase * 3.14159);
    float block = smoothstep(0.11, 0.0, abs(vUv.x - uBlockPos)) * uBlockage;
    float gate = 1.0 - uBlockage * smoothstep(0.03, 0.34, abs(vUv.x - uBlockPos));

    vec3 V = normalize(cameraPosition - vWorldPos);
    float rim = pow(1.0 - clamp(abs(dot(normalize(vNormalW), V)), 0.0, 1.0), uRimPower);

    vec3 col = mix(uColorA, uColorB, wave * 0.45);
    col = mix(col, uCoreColor, pow(head, 2.0) * 0.52);
    col = mix(col, uBlockedColor, block * 0.86);

    float energy = (uBaseGlow + pulse * 1.18 + rim * 0.38 +
      block * (0.55 + 0.30 * sin(t * 7.0 + vUv.x * 48.0))) * gate * endFade;
    col *= energy;

    float alpha = clamp((0.14 + pulse * 0.68 + rim * 0.24 + block * 0.78) * endFade, 0.0, 1.0);
    alpha = clamp(alpha * uIntensity, 0.0, 0.95);

    if (uHeartbeat > 0.001) {
      float beat = 0.5 + 0.5 * sin(t * 6.28318 * 1.15);
      col *= 1.0 + uHeartbeat * 0.45 * pow(beat, 7.0);
    }
    gl_FragColor = vec4(col, alpha);
  }
`;

// 柔和径向光晕气血微粒（替代直线 LineSegments，彻底消除跨躯干白色细直线）
const BEAD_VERT = /* glsl */ `
  attribute float aSize;
  attribute float aAlpha;
  uniform float uPixelRatio;
  varying float vAlpha;
  void main() {
    vAlpha = aAlpha;
    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
    float dist = max(0.35, -mvPos.z);
    gl_PointSize = clamp((aSize * uPixelRatio * 240.0) / dist, 2.0, 22.0);
    gl_Position = projectionMatrix * mvPos;
  }
`;

const BEAD_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uCoreColor;
  uniform float uOpacity;
  varying float vAlpha;
  void main() {
    if (vAlpha <= 0.004) discard;
    vec2 p = gl_PointCoord - 0.5;
    float r = length(p) * 2.0;
    if (r > 1.0) discard;
    float core = exp(-r * r * 6.5);
    float halo = exp(-r * r * 2.1) * 0.42;
    float a = (core + halo) * vAlpha * uOpacity;
    vec3 col = mix(uColor, uCoreColor, core * 0.68);
    gl_FragColor = vec4(col * a, a);
  }
`;

function flowMaterial(colorA, colorB, coreColor, opts = {}) {
  return new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms: {
      uTime: { value: 0 },
      uPhase: { value: 0 },
      uIntensity: { value: opts.intensity ?? 1.0 },
      uDirection: { value: 1 },
      uPulseCount: { value: opts.pulseCount ?? 4.0 },
      uTailPower: { value: opts.tailPower ?? 2.4 },
      uBaseGlow: { value: opts.baseGlow ?? 0.09 },
      uRimPower: { value: opts.rimPower ?? 2.2 },
      uBlockage: { value: 0 },
      uBlockPos: { value: 0.46 },
      uHeartbeat: { value: opts.heartbeat ?? 0 },
      uColorA: { value: colorA },
      uColorB: { value: colorB },
      uCoreColor: { value: coreColor },
      uBlockedColor: { value: new THREE.Color("#9e2eff") },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
}

function makeTube(points, radius, tubularSegments = 180) {
  const vec = points.map(p => new THREE.Vector3(p.x, p.y, p.z));
  const curve = new THREE.CatmullRomCurve3(vec, false, "catmullrom", 0.25);
  const geo = new THREE.TubeGeometry(curve, tubularSegments, radius, 7, false);
  return { curve, geo };
}

function smoothstep(edge0, edge1, x) {
  const t = THREE.MathUtils.clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

/**
 * 创建严格贴合经络曲线的柔光拖尾微粒组（每个波峰由 1 颗主光珠 + 3 颗渐隐尾珠组成）。
 * 不做首尾直线连接，越出 [0,1] 区间自动隐去，彻底杜绝直线拉扯与穿模白线。
 */
function createFlowBeads(curve, color, coreColor, pulseCount, kind, baseId, owner) {
  const slots = Math.max(3, Math.ceil(pulseCount) + 1);
  const trailSteps = 4; // 1 主珠 + 3 渐隐尾珠
  const total = slots * trailSteps;
  const positions = new Float32Array(total * 3);
  const sizes = new Float32Array(total);
  const alphas = new Float32Array(total);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
  geo.setAttribute("aAlpha", new THREE.BufferAttribute(alphas, 1));

  const material = new THREE.ShaderMaterial({
    vertexShader: BEAD_VERT,
    fragmentShader: BEAD_FRAG,
    uniforms: {
      uColor: { value: color.clone() },
      uCoreColor: { value: coreColor.clone() },
      uOpacity: { value: 0.75 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const points = new THREE.Points(geo, material);
  points.renderOrder = 6;
  points.frustumCulled = false;

  return {
    curve,
    points,
    geo,
    positions,
    sizes,
    alphas,
    slots,
    trailSteps,
    pulseCount,
    baseColor: color.clone(),
    coreColor: coreColor.clone(),
    kind,
    baseId,
    owner,
    material,
  };
}

export function createMeridianSystem(data, adaptPath = null) {
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
  const acupointGeo = new THREE.SphereGeometry(0.0085, 12, 10);

  for (const path of data.meridians || []) {
    const prof = profileFor(path.baseId);
    const radius = 0.0044 * prof.thick;
    const display = adaptPath?.(path, radius);
    const { curve, geo } = makeTube(display?.points ?? path.points, display?.radius ?? radius);
    const isYin = path.polarity === "yin";
    // 阳经呈温煦流金色，阴经呈清润青碧色，视觉柔和分明、不刺眼
    const base = new THREE.Color(isYin ? "#2fb8ea" : "#f0943b");
    const accent = isYin
      ? (ELEMENT_COLORS[path.element] || base).clone().lerp(new THREE.Color("#68d8ff"), 0.55)
      : (ELEMENT_COLORS[path.element] || base).clone().lerp(new THREE.Color("#f8c86a"), 0.62);
    const core = new THREE.Color(isYin ? "#d8f6ff" : "#fff1c9");
    const pulseCount = 3.2 + prof.urgent * 1.4; // 3.8 ~ 4.7 个舒缓波峰，告别生硬香肠点

    const mat = flowMaterial(base, accent, core, {
      pulseCount,
      tailPower: 2.0 + prof.urgent * 0.6,
      baseGlow: 0.08 * (0.55 + prof.depth * 0.85),
      rimPower: 2.2 * (0.75 + prof.depth * 0.6),
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.name = path.id;
    mesh.renderOrder = 4;
    mesh.userData = { path, curve, isYin };
    group.add(mesh);

    // 示范腧穴节点（参考 GB/T 12346）：仅在对应经脉高亮聚焦时清晰亮起，避免满身杂点
    const acuGroup = new THREE.Group();
    acuGroup.name = `${path.id}_Acupoints`;
    const acuMat = new THREE.MeshBasicMaterial({
      color: core.clone(),
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    for (const ref of ACUPOINT_REFS[path.baseId] || []) {
      const pt = curve.getPointAt(ref.u);
      const node = new THREE.Mesh(acupointGeo, acuMat);
      node.position.copy(pt);
      node.renderOrder = 7;
      node.userData.acupointName = ref.name;
      acuGroup.add(node);
    }
    group.add(acuGroup);

    const mEntry = {
      id: path.id,
      baseId: path.baseId,
      name: path.name,
      shortName: path.shortName,
      element: path.element,
      polarity: path.polarity,
      side: path.side,
      mesh,
      material: mat,
      acuGroup,
      acuMat,
      curve,
      isYin,
      prof,
      pulseCount,
      phase: Math.random() * 0.4, // 轻微错开初相，避免全身经络像节拍器齐步闪烁
      speed: 0.32 * prof.speed,
      direction: 1,
    };
    meridians.push(mEntry);

    const flow = createFlowBeads(
      curve,
      isYin ? new THREE.Color("#56d0ff") : new THREE.Color("#f7b24f"),
      core,
      pulseCount,
      "qi",
      path.baseId,
      mEntry,
    );
    flow.profile = prof;
    flowGroup.add(flow.points);
    flows.push(flow);
  }

  for (const path of data.vessels || []) {
    const { curve, geo } = makeTube(path.points, 0.0066, 150);
    const base = new THREE.Color("#b81a28");
    const accent = new THREE.Color("#eb5a46");
    const core = new THREE.Color("#ffbeaa");
    const pulseCount = 3.6;
    const mat = flowMaterial(base, accent, core, {
      pulseCount,
      tailPower: 2.2,
      baseGlow: 0.07,
      heartbeat: 1.0,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.name = path.id;
    mesh.renderOrder = 3;
    mesh.userData = { path, curve };
    vesselGroup.add(mesh);

    const vEntry = {
      id: path.id,
      name: path.name,
      mesh,
      material: mat,
      curve,
      pulseCount,
      phase: 0,
      speed: 0.28,
      direction: 1,
    };
    vessels.push(vEntry);

    const flow = createFlowBeads(curve, new THREE.Color("#f05a4f"), core, pulseCount, "blood", path.id, vEntry);
    flowGroup.add(flow.points);
    flows.push(flow);
  }

  let lastTime = 0;
  const tmpPt = new THREE.Vector3();

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
    currentDayNight: "day",
    setStyle(mode) { this.style = mode === "holo" ? "holo" : "real"; },
    setFlowVisible(visible) { flowGroup.visible = visible; },
    setVisible(visible) { group.visible = visible; },
    setVesselsVisible(visible) { vesselGroup.visible = visible; },
    tick(time, dtArg) {
      const dt = Number.isFinite(dtArg) ? Math.min(Math.max(dtArg, 0), 0.05) : Math.min(Math.max(time - lastTime, 0), 0.05);
      lastTime = time;

      for (const m of meridians) {
        m.phase += dt * m.speed * m.direction;
        m.material.uniforms.uTime.value = time;
        m.material.uniforms.uPhase.value = m.phase;
      }
      for (const v of vessels) {
        v.phase += dt * v.speed * v.direction;
        v.material.uniforms.uTime.value = time;
        v.material.uniforms.uPhase.value = v.phase;
      }

      if (!flowGroup.visible) return;
      const state = this.currentState || { qi: 1, blood: 1, stagnation: 0, blockedMeridian: "" };
      const real = this.style !== "holo";
      const night = this.currentDayNight === "night";

      for (const f of flows) {
        const owner = f.owner;
        const isQi = f.kind === "qi";
        const blocked = isQi && state.blockedMeridian && f.baseId === state.blockedMeridian && state.stagnation > 0.05;
        const stasis = f.kind === "blood" ? THREE.MathUtils.clamp(state.stagnation, 0, 1) : 0;
        const affected = isQi && (this.currentAffected || []).includes(f.baseId);
        const dir = owner.direction >= 0 ? 1 : -1;
        const headShift = dir > 0 ? 0.88 : 0.12;
        const baseStep = (owner.phase % 1 + 1) % 1;
        const pc = f.pulseCount;
        const spacing = 0.0085;

        const pos = f.positions;
        const sizes = f.sizes;
        const alphas = f.alphas;
        const thick = f.profile ? f.profile.thick : 1.0;

        let idx = 0;
        for (let s = 0; s < f.slots; s += 1) {
          // 与经络管体着色器的彗尾波峰严格锁相：uHead = (s - 1 + baseStep + headShift) / pc
          const uHead = (s - 1 + baseStep + headShift) / pc;
          for (let k = 0; k < f.trailSteps; k += 1) {
            const u = uHead - dir * k * spacing;
            if (u <= 0.005 || u >= 0.995) {
              alphas[idx] = 0;
              sizes[idx] = 0;
            } else {
              f.curve.getPointAt(u, tmpPt);
              pos[idx * 3] = tmpPt.x;
              pos[idx * 3 + 1] = tmpPt.y;
              pos[idx * 3 + 2] = tmpPt.z;
              const endFade = smoothstep(0.005, 0.085, u) * smoothstep(0.995, 0.915, u);
              const decay = k === 0 ? 1.0 : Math.pow(0.58, k);
              alphas[idx] = endFade * decay;
              sizes[idx] = (isQi ? 0.030 * thick : 0.028) * (k === 0 ? 1.0 : 0.82 - k * 0.12);
            }
            idx += 1;
          }
        }

        f.geo.attributes.position.needsUpdate = true;
        f.geo.attributes.aSize.needsUpdate = true;
        f.geo.attributes.aAlpha.needsUpdate = true;

        const depth = f.profile ? f.profile.depth : 1;
        let op;
        if (isQi) {
          op = real ? (affected ? 0.56 + depth * 0.34 : 0.14 + depth * 0.20) : 0.82;
          if (night) op *= owner.isYin ? 1.15 : 0.58;
        } else {
          op = real ? 0.48 : 0.82;
        }
        f.material.uniforms.uOpacity.value = THREE.MathUtils.clamp(op, 0.06, 0.95);
        f.material.uniforms.uColor.value.copy(
          blocked ? BLOCKED_FLOW : (f.kind === "blood" ? f.baseColor.clone().lerp(STASIS_FLOW, stasis * 0.35) : f.baseColor),
        );
      }
    },
    update(state, affectedBaseIds = [], dayNight = this.currentDayNight) {
      this.currentState = state;
      this.currentAffected = affectedBaseIds;
      this.currentDayNight = dayNight === "night" ? "night" : "day";
      const real = this.style !== "holo";
      const night = this.currentDayNight === "night";

      // 证候量: 以 0.5 为阴阳平衡基准
      const yangDef = THREE.MathUtils.clamp((0.5 - (state.yang ?? 0.5)) * 2, 0, 1);
      const yinDef = THREE.MathUtils.clamp((0.5 - (state.yin ?? 0.5)) * 2, 0, 1);
      const stag = THREE.MathUtils.clamp(state.stagnation ?? 0, 0, 1);
      const inflame = THREE.MathUtils.clamp(state.inflammation ?? 0, 0, 1);

      for (const m of meridians) {
        const blocked = state.blockedMeridian && m.baseId === state.blockedMeridian && state.stagnation > 0.05;
        const affected = affectedBaseIds.includes(m.baseId);
        const p = m.prof;
        const yinYang = m.isYin ? state.yin : state.yang;

        let intensity = 0.28 + state.qi * 0.40 + yinYang * 0.20 + (affected ? 0.34 : 0);
        // 舒缓流畅的基准流速（周期 ~2.5-4 秒/波峰），视觉自然从容
        let speed = (0.14 + state.qi * 0.34) * p.speed;
        let urgent = p.urgent;

        // 阳虚: 阳经先衰(更慢更暗更缓), 督脉尤甚
        const yangHit = yangDef * (m.isYin ? 0.28 : 0.60) * (m.baseId === "DU" ? 1.22 : 1);
        intensity *= 1 - yangHit;
        speed *= 1 - yangHit * 0.88;
        urgent *= 1 - yangDef * (m.isYin ? 0.15 : 0.40);

        // 阴虚: 阴经受累变缓变暗; 阳经虚火上浮——更快、更急、更亮
        if (m.isYin) {
          intensity *= 1 - yinDef * 0.48;
          speed *= 1 - yinDef * 0.42;
        } else {
          intensity *= 1 + yinDef * 0.22 + inflame * 0.10;
          speed *= 1 + yinDef * 0.30;
          urgent *= 1 + yinDef * 0.30;
        }

        // 昼夜节律：昼阳气敷布体表而畅，夜卫阳潜藏归阴而缓
        if (night) {
          if (m.isYin) {
            intensity *= 1.18;
          } else {
            intensity *= 0.62;
            speed *= 0.72;
          }
        } else if (!m.isYin) {
          intensity *= 1.08;
        }

        // 瘀滞: 整体脉势变缓(阻滞经另有局部紫晕)
        speed *= 1 - stag * 0.28;
        urgent *= 1 - stag * 0.22;
        if (blocked) { intensity *= 0.55; speed *= 0.20; urgent *= 0.65; }

        // 浮沉与聚焦对比：高亮当令/受累经脉，压暗非重点背景经脉，让十二正经循行路线清晰可辨
        const surf = 0.25 + p.depth * 0.75;
        const hasFocus = affectedBaseIds.length > 0;
        if (real) {
          intensity *= affected ? (0.52 + surf * 0.56) : (hasFocus ? (0.06 + surf * 0.11) : (0.14 + surf * 0.22));
        } else {
          intensity *= affected ? (0.72 + p.depth * 0.38) : (hasFocus ? (0.16 + p.depth * 0.18) : (0.52 + p.depth * 0.44));
        }

        m.speed = THREE.MathUtils.clamp(speed, 0.04, 1.05);
        m.direction = blocked ? -1 : 1;

        if (m.acuMat) {
          m.acuMat.opacity = affected ? (real ? 0.78 : 0.92) : 0.0;
          m.acuGroup.visible = affected;
        }

        const u = m.material.uniforms;
        u.uIntensity.value = THREE.MathUtils.clamp(intensity, real ? 0.03 : 0.06, 1.85);
        u.uDirection.value = m.direction;
        u.uTailPower.value = 1.9 + THREE.MathUtils.clamp(urgent, 0.25, 1.4) * 0.85;
        u.uBlockage.value = blocked ? state.stagnation : 0;
        u.uBlockPos.value = 0.46;
        u.uBaseGlow.value = blocked ? 0.02 : (affected ? 0.06 + p.depth * 0.07 : 0.025 + p.depth * 0.04);
      }

      for (const v of vessels) {
        const u = v.material.uniforms;
        v.speed = THREE.MathUtils.clamp((0.12 + state.blood * 0.30) * (1 - stag * 0.45), 0.05, 0.75);
        u.uIntensity.value = THREE.MathUtils.clamp((0.20 + state.blood * 0.40) * (real ? 0.42 : 0.95), 0.02, 1.3);
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
