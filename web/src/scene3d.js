import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { createMeridianSystem } from "./meridians.js?v=20261107defense";
import { createTaiji, createDantians, createClock, createStasis, createStage } from "./fx.js?v=20261107defense";
import { ORGAN_META, ZANG_KEYS, NORMAL_STATE } from "./knowledge.js?v=20261107defense";

const SKIN_VERT = /* glsl */ `
  varying vec3 vN;
  varying vec3 vW;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vW = wp.xyz;
    vN = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const SKIN_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uRim;
  uniform vec3 uSkin;
  uniform vec3 uSkinDeep;
  uniform vec3 uLightDir;
  uniform float uTime;
  uniform float uOpacity;
  uniform float uBlocked;
  uniform float uInflame;
  uniform float uMode;
  varying vec3 vN;
  varying vec3 vW;

  void main() {
    vec3 N = normalize(vN);
    vec3 V = normalize(cameraPosition - vW);
    float fres = pow(1.0 - clamp(abs(dot(N, V)), 0.0, 1.0), 2.7);

    if (uMode > 0.5) {
      // 真实皮肤：柔和的包裹光 + 世界坐标细颗粒 + 轻 subsurface 色偏，不做扫描线。
      float ndl = clamp(dot(N, normalize(uLightDir)), 0.0, 1.0);
      float wrap = ndl * 0.55 + 0.45;
      float grain = fract(sin(dot(floor(vW.xy * 380.0), vec2(12.9898, 78.233))) * 43758.5453);
      vec3 col = mix(uSkinDeep, uSkin, wrap);
      col *= 0.82 + ndl * 0.28;
      col *= 0.975 + grain * 0.05;
      col += vec3(0.16, 0.045, 0.03) * pow(wrap, 2.0) * 0.35;
      col += uRim * fres * 0.16;
      col = mix(col, vec3(0.72, 0.18, 0.14), uInflame * 0.20);
      col = mix(col, vec3(0.38, 0.22, 0.48), uBlocked * 0.16);
      float alpha = uOpacity + fres * 0.55 + 0.20;
      gl_FragColor = vec4(col, clamp(alpha, 0.0, 0.92));
      return;
    }

    float scan = pow(0.5 + 0.5 * sin(vW.y * 22.0 - uTime * 1.2), 10.0);
    float sweep = smoothstep(0.03, 0.0, abs(fract(vW.y * 0.32 - uTime * 0.05) - 0.5));
    vec3 col = uColor * (0.5 + scan * 0.12 + sweep * 0.18) + uRim * fres * 0.85;
    col = mix(col, vec3(1.0, 0.30, 0.12), uInflame * 0.45);
    col = mix(col, vec3(0.62, 0.22, 1.0), uBlocked * 0.45);
    float alpha = uOpacity + fres * 0.38 + scan * 0.02 + sweep * 0.05;
    gl_FragColor = vec4(col, clamp(alpha, 0.0, 0.86));
  }
`;

// 真实解剖色：接近参考视频里的皮肤/脏器观感，不再全部用高饱和五行色。
const ANATOMY_COLORS = {
  Heart: "#9e3b35",
  Liver: "#6e4233",
  Spleen: "#7c4a52",
  Lungs: "#c99b96",
  Kidneys: "#7b4543",
  Stomach: "#c58a76",
  SmallIntestine: "#c79a7b",
  LargeIntestine: "#b98b6c",
  Gallbladder: "#597a4f",
  Bladder: "#b39c72",
  Pancreas: "#c7a07c",
  Brain: "#d6c3b1",
  Trachea: "#c9b5a7",
  Airways: "#d8bcae",
  Uterus: "#b56b78",
  Ovaries: "#c9939a",
  FallopianTubes: "#c88f98",
};

function colorOf(key) {
  return new THREE.Color(ORGAN_META[key]?.color || "#aaaaaa");
}

export class TCMScene3D {
  constructor(container, labelLayer, loadingTextEl) {
    this.container = container;
    this.labelLayer = labelLayer;
    this.loadingTextEl = loadingTextEl;
    this.clock = new THREE.Clock();
    this.elapsed = 0;
    this.state = { ...NORMAL_STATE };
    this.affectedOrgans = [];
    this.affectedMeridians = [];
    this.organs = new Map();
    this.labels = new Map();
    this.skin = null;
    this.skeleton = null;
    this.glbScene = null;
    this.sex = "male";
    this.modelHeight = 1.72;
    this._loadToken = 0;
    this._sexToken = 0;
    this.layers = { skin: true, organs: true, skeleton: true, meridians: true, vessels: true, flow: true, clock: true, taiji: true };
    this.skinOpacity = 0.10;
    this.visualMode = "real";
    this.dayNight = "day";
  }

  async init() {
    this._setupScene();
    await this._loadGLB(this.sex);
    await this._loadMeridians(this.sex);
    this._resetCameraForModel();
    this._setupLabels();
    this._applyOrgans();
    this._animate();
  }

  _setupScene() {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x02070d, 0.035);
    this.camera = new THREE.PerspectiveCamera(36, 1, 0.05, 100);
    this.camera.position.set(1.45, 1.45, 3.15);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(0, 0.98, 0);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.07;
    this.controls.minDistance = 1.45;
    this.controls.maxDistance = 6.2;
    this.controls.maxPolarAngle = Math.PI * 0.93;
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 0.45;

    this.hemiLight = new THREE.HemisphereLight(0xfff3e8, 0x0a1018, 1.1);
    this.scene.add(this.hemiLight);
    this.keyLight = new THREE.DirectionalLight(0xfff4ea, 2.6);
    this.keyLight.position.set(2.5, 4, 3.5);
    this.scene.add(this.keyLight);
    this.rimLight = new THREE.PointLight(0x9fc7ff, 5.0, 8);
    this.rimLight.position.set(-2.2, 2.1, -2.2);
    this.scene.add(this.rimLight);
    this.warmLight = new THREE.PointLight(0xffc2a1, 2.8, 6);
    this.warmLight.position.set(1.3, 1.2, 2.2);
    this.scene.add(this.warmLight);

    this.stage = createStage();
    this.scene.add(this.stage.group);

    this.taiji = createTaiji({ taiji: { position: { x: 0, y: 1.02, z: 0.17 }, radius: 0.1 } });
    this.scene.add(this.taiji.group);
    this.clockRing = createClock();
    this.scene.add(this.clockRing.group);
    this.stasis = createStasis();
    this.scene.add(this.stasis.group);
    this.dantians = createDantians({ dantians: [] });
    this.scene.add(this.dantians.group);

    this._resize();
    new ResizeObserver(() => this._resize()).observe(this.container);
  }

  _resize() {
    const w = this.container.clientWidth || 1;
    const h = this.container.clientHeight || 1;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }

  _setLoading(text) {
    if (this.loadingTextEl) this.loadingTextEl.textContent = text;
  }

  async _loadGLB(sex = this.sex) {
    const token = ++this._loadToken;
    const female = sex === "female";
    const path = female ? "assets/anatomy_female.glb?v=20261107defense" : "assets/anatomy_male.glb?v=20261107defense";
    const loader = new GLTFLoader();
    this._setLoading(female ? "正在载入女性教学模型…" : "正在载入男性教学模型…");
    const gltf = await new Promise((resolve, reject) => {
      loader.load(path, resolve, xhr => {
        if (xhr.total) {
          const pct = Math.min(100, Math.round((xhr.loaded / xhr.total) * 100));
          this._setLoading(`正在载入解剖模型 ${pct}%`);
        }
      }, err => {
        console.error(err);
        this._setLoading("解剖模型加载失败");
        reject(err);
      });
    });
    if (token !== this._loadToken) {
      this._disposeObject(gltf.scene);
      return false;
    }

    if (this.glbScene) {
      this.scene.remove(this.glbScene);
      this._disposeObject(this.glbScene);
    }
    this.glbScene = gltf.scene;
    this.scene.add(gltf.scene);
    this.skin = null;
    this.skeleton = null;
    this.skinMaterial = null;
    this.organs.clear();
    this.labels.forEach(el => { el.style.display = "none"; });

    gltf.scene.updateWorldMatrix(true, true);
    gltf.scene.traverse(obj => {
      if (!obj.isMesh) return;
      const name = obj.name || "";
      obj.castShadow = false;
      obj.receiveShadow = false;
      if (name === "TCM_Body" || name.startsWith("TCM_Body")) {
        this._setupSkin(obj);
      } else if (name.startsWith("ORGAN_")) {
        const key = Object.keys(ORGAN_META).find(k => name.startsWith(`ORGAN_${k}`));
        if (key) this._setupOrgan(obj, key);
      } else if (name.includes("Skeleton")) {
        this._setupSkeleton(obj);
      }
    });

    const box = new THREE.Box3().setFromObject(gltf.scene);
    this.modelHeight = Math.max(0.1, box.getSize(new THREE.Vector3()).y);
    this._updateOrganCenters();
    this._setLoading("");
    return true;
  }

  _disposeObject(root) {
    const geometries = new Set();
    const materials = new Set();
    root.traverse(obj => {
      if (obj.geometry) geometries.add(obj.geometry);
      if (obj.material) {
        for (const m of Array.isArray(obj.material) ? obj.material : [obj.material]) materials.add(m);
      }
    });
    geometries.forEach(g => g.dispose());
    materials.forEach(m => {
      for (const key of Object.keys(m)) {
        const value = m[key];
        if (value && value.isTexture) value.dispose();
      }
      m.dispose();
    });
  }

  _setupSkin(mesh) {
    this.skin = mesh;
    this.skinMaterial = new THREE.ShaderMaterial({
      vertexShader: SKIN_VERT,
      fragmentShader: SKIN_FRAG,
      uniforms: {
        uColor: { value: new THREE.Color("#5ca8e8") },
        uRim: { value: new THREE.Color("#ffd9c7") },
        uSkin: { value: new THREE.Color("#f2cbb7") },
        uSkinDeep: { value: new THREE.Color("#c58c77") },
        uLightDir: { value: new THREE.Vector3(2.5, 4, 3.5).normalize() },
        uTime: { value: 0 },
        uOpacity: { value: this.skinOpacity },
        uBlocked: { value: 0 },
        uInflame: { value: 0 },
        uMode: { value: 1 },
      },
      transparent: true,
      depthWrite: false,
      side: THREE.FrontSide,
    });
    this.skin.material = this.skinMaterial;
    this.skin.renderOrder = 10;
  }

  _setupOrgan(mesh, key) {
    const color = colorOf(key);
    const anatomy = new THREE.Color(ANATOMY_COLORS[key] || "#a97f6a");
    const material = new THREE.MeshStandardMaterial({
      color: anatomy.clone(),
      emissive: anatomy.clone(),
      emissiveIntensity: 0.08,
      roughness: 0.62,
      metalness: 0.02,
    });
    mesh.material = material;
    mesh.renderOrder = 2;
    mesh.userData.organKey = key;
    const baseScale = mesh.scale.clone();
    this.organs.set(key, {
      mesh, material, key, baseScale,
      baseColor: color,
      anatomyColor: anatomy,
      center: new THREE.Vector3(),
    });
  }

  _setupSkeleton(mesh) {
    this.skeleton = mesh;
    mesh.material = new THREE.MeshStandardMaterial({
      color: new THREE.Color("#e0d8c2"),
      emissive: new THREE.Color("#6c7b8a"),
      emissiveIntensity: 0.22,
      roughness: 0.58,
      metalness: 0.02,
      transparent: true,
      opacity: 0.82,
      depthWrite: true,
    });
    mesh.renderOrder = 1;
  }

  async _loadMeridians(sex = this.sex) {
    const path = sex === "female" ? "assets/meridians_female.json?v=20261107defense" : "assets/meridians.json?v=20261107defense";
    const data = await fetch(path).then(r => r.json());
    this.data = data;

    if (this.meridians) {
      this.scene.remove(this.meridians.group);
      this._disposeObject(this.meridians.group);
    }
    this.meridians = createMeridianSystem(data);
    this.scene.add(this.meridians.group);
    this.meridians.setVesselsVisible(this.layers.vessels);

    if (this.taiji) {
      this.scene.remove(this.taiji.group);
      this._disposeObject(this.taiji.group);
    }
    this.taiji = createTaiji(data.taiji ? data : { taiji: { position: { x: 0, y: 1.02, z: 0.17 }, radius: 0.1 } });
    this.scene.add(this.taiji.group);

    if (this.dantians) {
      this.scene.remove(this.dantians.group);
      this._disposeObject(this.dantians.group);
    }
    this.dantians = createDantians(data);
    this.scene.add(this.dantians.group);
    this._updateOrganCenters();
  }

  _updateOrganCenters() {
    this.organs.forEach(o => {
      const box = new THREE.Box3().setFromObject(o.mesh);
      box.getCenter(o.center);
    });
  }

  async setSex(sex) {
    const next = sex === "female" ? "female" : "male";
    if (next === this.sex && this.glbScene) return true;
    const token = ++this._sexToken;
    const previous = this.sex;
    this.sex = next;
    try {
      const ok = await this._loadGLB(next);
      if (!ok || token !== this._sexToken) {
        if (token === this._sexToken) this.sex = previous;
        return false;
      }
      await this._loadMeridians(next);
      if (token !== this._sexToken) return false;
      this._applyOrgans();
      this.setLayers(this.layers);
      this.setVisualMode(this.visualMode);
      this.setSkinOpacity(this.skinOpacity);
      this._resetCameraForModel();
      return true;
    } catch (err) {
      console.error(err);
      if (token === this._sexToken) this.sex = previous;
      this._setLoading("性别模型加载失败");
      return false;
    }
  }

  _resetCameraForModel() {
    const y = this.modelHeight * 0.565;
    this.controls.target.set(0, y, 0);
    this.camera.position.set(1.22, y + 0.40, 2.72);
    this.controls.autoRotate = true;
  }

  _setupLabels() {
    if (!this.labelLayer) return;
    for (const key of [...ZANG_KEYS, "Uterus", "Ovaries"]) {
      if (!ORGAN_META[key]) continue;
      const el = document.createElement("div");
      el.className = "organ-label";
      el.innerHTML = `<span class="dot" style="background:${ORGAN_META[key].color}"></span>${ORGAN_META[key].zh}`;
      this.labelLayer.appendChild(el);
      this.labels.set(key, el);
    }
  }

  _applyOrgans() {
    const s = this.state;
    const real = this.visualMode === "real";
    for (const [key, o] of this.organs) {
      let intensity = real ? 0.58 : 0.8;
      let color = (real ? o.anatomyColor : o.baseColor).clone();
      if (key === "Heart") {
        if (real) {
          intensity = 0.66 + s.qi * 0.12 + s.inflammation * 0.18;
          color.lerp(new THREE.Color("#b64a3d"), s.inflammation * 0.22);
        } else {
          intensity = 1.0 + s.qi * 0.22 + s.inflammation * 0.5;
          color.lerp(new THREE.Color("#ff8a5b"), s.inflammation * 0.45);
        }
      } else if (key === "Lungs") {
        if (real) {
          intensity = 0.54 + s.qi * 0.12 - s.inflammation * 0.05;
          color.lerp(new THREE.Color("#b56b67"), s.inflammation * 0.15);
        } else {
          intensity = 0.52 + s.qi * 0.16 - s.inflammation * 0.08;
          color.lerp(new THREE.Color("#ff9a90"), s.inflammation * 0.25);
        }
      } else if (key === "Liver") {
        const blockage = THREE.MathUtils.clamp(s.stagnation, 0, 1);
        if (real) {
          intensity = 0.55 + s.qi * 0.12;
          color.lerp(new THREE.Color("#4b2b24"), blockage * 0.30);
        } else {
          intensity = 0.6 + s.qi * 0.18;
          color.lerp(new THREE.Color("#a82eff"), blockage * 0.55);
        }
      } else if (key === "Kidneys") {
        if (real) {
          intensity = 0.48 + s.yang * 0.28 + (1 - s.yin) * 0.08;
          if (s.yang < 0.36) color.lerp(new THREE.Color("#4a3540"), 0.25);
        } else {
          intensity = 0.36 + s.yang * 0.85 + (1 - s.yin) * 0.14;
          if (s.yang < 0.36) color.lerp(new THREE.Color("#344066"), 0.45);
        }
      } else if (key === "Spleen") {
        intensity = real ? 0.50 + s.yang * 0.24 : 0.45 + s.yang * 0.6;
      } else if (key === "Brain") {
        intensity = real ? 0.58 + s.qi * 0.12 : 0.6 + s.qi * 0.22 + s.inflammation * 0.25;
      } else {
        intensity = real ? 0.55 + s.qi * 0.10 : 0.48 + s.qi * 0.18;
      }
      intensity *= 1 - s.stagnation * (real ? 0.08 : 0.10);
      if (this.affectedOrgans.includes(key)) intensity += real ? 0.18 : 0.22;
      o.material.color.copy(color);
      o.material.emissive.copy(color);
      o.material.roughness = real ? 0.62 : 0.48;
      o.material.metalness = real ? 0.01 : 0.04;
      o.material.emissiveIntensity = real
        ? THREE.MathUtils.clamp(0.03 + intensity * 0.12, 0.02, 0.45)
        : THREE.MathUtils.clamp(0.15 + intensity * 0.30, 0.1, 1.8);
      o.material.opacity = 1;
    }
    if (this.skinMaterial) {
      this.skinMaterial.uniforms.uBlocked.value = s.stagnation;
      this.skinMaterial.uniforms.uInflame.value = s.inflammation;
    }
    if (this.meridians) this.meridians.update(s, this.affectedMeridians);
    this._updateLabelClasses();
  }

  _updateLabelClasses() {
    for (const [key, el] of this.labels) {
      el.classList.toggle("affected", this.affectedOrgans.includes(key));
    }
  }

  setAffected(organs = [], meridians = []) {
    this.affectedOrgans = organs.slice();
    this.affectedMeridians = meridians.slice();
    this._updateLabelClasses();
    if (this.meridians) this.meridians.update(this.state, this.affectedMeridians);
  }

  setState(state, affectedOrgans = [], affectedMeridians = []) {
    this.state = { ...state };
    this.affectedOrgans = affectedOrgans;
    this.affectedMeridians = affectedMeridians;
    this._applyOrgans();
  }

  setVisualMode(mode) {
    this.visualMode = mode === "holo" ? "holo" : "real";
    const real = this.visualMode === "real";
    if (this.skinMaterial) {
      this.skinMaterial.uniforms.uMode.value = real ? 1 : 0;
      this.skinMaterial.uniforms.uRim.value.set(real ? "#ffd9c7" : "#b9ecff");
      this.skinMaterial.uniforms.uColor.value.set("#5ca8e8");
    }
    this._applyLighting();
    if (this.meridians) this.meridians.setStyle(this.visualMode);
    if (this.stage) this.stage.group.visible = !real;
    if (this.container) this.container.classList.toggle("is-real", real);
    this._applyOrgans();
  }

  _applyLighting() {
    const real = this.visualMode === "real";
    const night = this.dayNight === "night";
    const dim = night ? 0.48 : 1;
    if (this.hemiLight) {
      this.hemiLight.color.set(night ? (real ? "#8fa8c8" : "#6f9fff") : (real ? "#fff3e8" : "#8fcfff"));
      this.hemiLight.groundColor.set(real ? "#0a1018" : "#081018");
      this.hemiLight.intensity = (real ? 1.1 : 1.0) * dim;
    }
    if (this.keyLight) {
      this.keyLight.color.set(night ? "#a9c4ff" : (real ? "#fff4ea" : "#cfe8ff"));
      this.keyLight.intensity = (real ? 2.6 : 2.2) * (night ? 0.38 : 1);
    }
    if (this.rimLight) {
      this.rimLight.color.set(real ? "#9fc7ff" : "#2f7fff");
      this.rimLight.intensity = (real ? 5.0 : 11) * (night ? 0.55 : 1);
    }
    if (this.warmLight) {
      this.warmLight.color.set(real ? "#ffc2a1" : "#ff7a45");
      this.warmLight.intensity = (real ? 2.8 : 5) * (night ? 0.35 : 1);
    }
    if (this.container) this.container.classList.toggle("is-night", night);
  }

  setDayNight(phase) {
    this.dayNight = phase === "night" ? "night" : "day";
    this._applyLighting();
    this._applyOrgans();
  }


  setLayers(layers) {
    this.layers = { ...this.layers, ...layers };
    if (this.skin) this.skin.visible = this.layers.skin;
    for (const o of this.organs.values()) o.mesh.visible = this.layers.organs;
    if (this.skeleton) this.skeleton.visible = this.layers.skeleton;
    if (this.meridians) {
      this.meridians.setVisible(this.layers.meridians);
      this.meridians.setVesselsVisible(this.layers.vessels);
      this.meridians.setFlowVisible(this.layers.flow !== false);
    }
    this.clockRing.group.visible = this.layers.clock;
    this.taiji.group.visible = this.layers.taiji;
    this.dantians.group.visible = this.layers.taiji;
  }

  setSkinOpacity(v) {
    this.skinOpacity = v;
    if (this.skinMaterial) this.skinMaterial.uniforms.uOpacity.value = v;
  }

  focusOrgan(key) {
    const o = this.organs.get(key);
    if (!o) return;
    this.controls.target.copy(o.center);
    this.camera.position.copy(o.center).add(new THREE.Vector3(1.0, 0.25, 2.0));
    this.controls.autoRotate = false;
  }

  focusMeridian(baseId) {
    if (!this.meridians) return;
    const center = this.meridians.centerOf(baseId);
    this.controls.target.copy(center);
    this.camera.position.copy(center).add(new THREE.Vector3(1.2, 0.3, 2.2));
    this.controls.autoRotate = false;
  }

  resetView() {
    this._resetCameraForModel();
  }

  _updateLabels() {
    if (!this.labels.size) return;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    for (const [key, el] of this.labels) {
      const o = this.organs.get(key);
      if (!o) { el.style.display = "none"; continue; }
      const p = o.center.clone().project(this.camera);
      if (p.z > 1 || p.x < -1.2 || p.x > 1.2 || p.y < -1.2 || p.y > 1.2) {
        el.style.display = "none";
        continue;
      }
      el.style.display = "flex";
      el.style.transform = `translate(-50%,-50%) translate(${(p.x * 0.5 + 0.5) * w}px, ${(-p.y * 0.5 + 0.5) * h}px)`;
    }
  }

  _animate() {
    requestAnimationFrame(() => this._animate());
    const dt = Math.min(this.clock.getDelta(), 0.05);
    this.elapsed += dt;
    this.controls.update();

    if (this.skinMaterial) this.skinMaterial.uniforms.uTime.value = this.elapsed;
    if (this.meridians) {
      this.meridians.tick(this.elapsed);
      this.meridians.update(this.state, this.affectedMeridians);
    }
    if (this.taiji) this.taiji.update(this.state, dt, this.elapsed);
    if (this.dantians) this.dantians.update(this.state, dt, this.elapsed);
    if (this.clockRing) this.clockRing.update(this.state, dt);
    if (this.stasis && this.meridians) this.stasis.update(this.state, dt, this.meridians);

    for (const [key, o] of this.organs) {
      if (key === "Heart") {
        const bpm = 62 + this.state.blood * 26 + this.state.inflammation * 8;
        const beat = 0.5 + 0.5 * Math.sin(this.elapsed * Math.PI * 2 * (bpm / 60));
        o.mesh.scale.copy(o.baseScale).multiplyScalar(1 + 0.055 * beat);
      } else if (key === "Lungs") {
        const breath = 1 + 0.015 * Math.sin(this.elapsed * 1.2);
        o.mesh.scale.copy(o.baseScale).multiplyScalar(breath);
      }
    }

    this._updateLabels();
    this.renderer.render(this.scene, this.camera);
  }
}
