import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// Presentation & TCM cross-reference metadata only. No model geometry or patient data.
// [zh, en, system, color, explodeVec, tcmElement, tcmMeridian, tcmNote]
const META = {
  Brain: ['脑', 'Brain', 'nervous', '#987ec2', [-0.32, 0.08, 0.16], '元神之府', '督脉', '奇恒之腑，髓海所在，督脉上行入脑。'],
  Trachea: ['气管', 'Trachea', 'respiratory', '#6fbcb3', [0.20, 0.12, 0.10], '金 · 肺系', '手太阴肺经', '呼吸气道主干，与肺宣发肃降功能相贯通。'],
  Airways: ['支气管', 'Airways', 'respiratory', '#459f9c', [0.22, 0.16, 0.06], '金 · 肺系', '手太阴肺经', '左右支气管分枝入肺叶，属呼吸通道参照。'],
  Lungs: ['肺', 'Lungs', 'respiratory', '#4da89f', [0.36, 0.03, 0.12], '五行属金', '手太阴肺经', '主气司呼吸、主宣发肃降，朝百脉而通调水道。'],
  Heart: ['心', 'Heart', 'circulatory', '#d65d57', [-0.42, 0.08, 0.08], '五行属火', '手少阴心经', '主血脉、藏神明，为阳中之太阳，心火下温肾水。'],
  Liver: ['肝', 'Liver', 'digestive', '#b57b45', [-0.45, 0.10, 0.02], '五行属木', '足厥阴肝经', '主疏泄、主藏血，调畅全身气机升降出入。'],
  Stomach: ['胃', 'Stomach', 'digestive', '#d98f5c', [0.42, 0.15, 0.03], '五行属土', '足阳明胃经', '主受纳腐熟水谷，以通降为顺，与脾相表里。'],
  Spleen: ['脾', 'Spleen', 'lymphatic', '#b05f8c', [0.48, 0.05, -0.10], '五行属土', '足太阴脾经', '主运化、主升清统血，为气血生化之源。'],
  Pancreas: ['胰', 'Pancreas', 'digestive', '#cca546', [0.36, 0.18, -0.13], '中焦土系', '足太阴脾经', '解剖消化与内分泌参照，中医多归入脾胃运化体系。'],
  Gallbladder: ['胆', 'Gallbladder', 'digestive', '#6f9c54', [-0.38, 0.20, -0.15], '五行属木', '足少阳胆经', '贮藏排泄胆汁、主决断，少阳为枢，与肝相表里。'],
  Kidneys: ['肾', 'Kidneys', 'urinary', '#5384c8', [-0.36, -0.10, -0.14], '五行属水', '足少阴肾经', '藏精、主水纳气，内寓元阴元阳，为先天之本。'],
  LargeIntestine: ['大肠', 'Large intestine', 'digestive', '#a6765e', [-0.36, 0.18, -0.30], '五行属金', '手阳明大肠经', '主传导糟粕，与肺相表里。'],
  SmallIntestine: ['小肠', 'Small intestine', 'digestive', '#c98a64', [0.36, 0.20, -0.28], '五行属火', '手太阳小肠经', '主受盛化物、泌别清浊，与心相表里。'],
  Bladder: ['膀胱', 'Bladder', 'urinary', '#4e9cb8', [0.24, 0.12, -0.38], '五行属水', '足太阳膀胱经', '贮尿排尿，赖肾阳气化而司开阖，与肾相表里。'],
};

const SYSTEMS = {
  all: '整体结构',
  respiratory: '呼吸结构',
  circulatory: '循环结构',
  digestive: '消化结构',
  urinary: '泌尿结构',
  nervous: '神经结构',
  lymphatic: '淋巴结构',
};

const $ = id => document.getElementById(id);
const stage = $('atlas-stage');
const centerPanel = document.querySelector('.atlas-center');

const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 100);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
renderer.localClippingEnabled = true;
stage.prepend(renderer.domElement);

// Real-time anatomical cross-section clipping plane + visual guide frame
const clipPlaneY = new THREE.Plane(new THREE.Vector3(0, -1, 0), 10);
const clipPlaneX = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 10);
let clipMode = 'off';
let clipRatio = 0.55;
const sliceGuide = new THREE.Mesh(
  new THREE.PlaneGeometry(0.92, 0.92),
  new THREE.MeshBasicMaterial({ color: 0x248a72, transparent: true, opacity: 0.14, side: THREE.DoubleSide, depthWrite: false }),
);
const sliceRing = new THREE.LineLoop(
  new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-0.46, -0.46, 0), new THREE.Vector3(0.46, -0.46, 0),
    new THREE.Vector3(0.46, 0.46, 0), new THREE.Vector3(-0.46, 0.46, 0),
  ]),
  new THREE.LineBasicMaterial({ color: 0x38b895, transparent: true, opacity: 0.72 }),
);
sliceGuide.add(sliceRing);
sliceGuide.visible = false;
scene.add(sliceGuide);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.09;
controls.autoRotateSpeed = 0.45;
controls.minZoom = 0.5;
controls.maxZoom = 8;
controls.target.set(0, 0.86, 0);
camera.position.set(0, 0.86, 4);

let camTween = null;
controls.addEventListener('start', () => { camTween = null; });

scene.add(new THREE.HemisphereLight(0xfffcf1, 0x5c7c72, 2.05));
const keyLight = new THREE.DirectionalLight(0xffffff, 2.55);
keyLight.position.set(-2, 4, 5);
scene.add(keyLight);
const fill = new THREE.DirectionalLight(0xb2dcd0, 1.85);
fill.position.set(3, 2, -3);
scene.add(fill);

const organs = new Map();
let root = null, skins = [], bones = [], height = 1.72, system = 'all', selected = null, isolated = false;
let expansion = 0, loadToken = 0, frame = 0, currentView = 'front';
const raycaster = new THREE.Raycaster();
const ns = 'http://www.w3.org/2000/svg';

function dispose(object) {
  const geometries = new Set(), materials = new Set(), textures = new Set();
  object.traverse(node => {
    if (node.geometry) geometries.add(node.geometry);
    if (node.material) for (const material of Array.isArray(node.material) ? node.material : [node.material]) {
      materials.add(material);
      for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
    }
  });
  geometries.forEach(g => g.dispose());
  textures.forEach(t => t.dispose());
  materials.forEach(m => m.dispose());
}

function resize() {
  const w = stage.clientWidth || 1, h = stage.clientHeight || 1;
  const half = height * 0.57;
  camera.left = -half * w / h;
  camera.right = half * w / h;
  camera.top = half;
  camera.bottom = -half;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h, false);
  $('leader-lines').setAttribute('viewBox', `0 0 ${w} ${h}`);
}
const observer = new ResizeObserver(resize);
observer.observe(stage);

function standardView(view = 'front', preserveZoom = false, animate = true) {
  currentView = view;
  const center = new THREE.Vector3(0, height * 0.50, 0);
  const vectors = { front: [0, 0, 4], back: [0, 0, -4], left: [4, 0, 0], right: [-4, 0, 0] };
  const targetPos = center.clone().add(new THREE.Vector3(...vectors[view]));
  const targetZoom = preserveZoom ? camera.zoom : 1;
  controls.autoRotate = false;
  $('rotate-model').setAttribute('aria-pressed', 'false');
  document.querySelectorAll('[data-view]').forEach(button => {
    const active = button.dataset.view === view;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  if (animate) {
    camTween = { pos: targetPos, target: center, zoom: targetZoom };
  } else {
    camTween = null;
    camera.position.copy(targetPos);
    controls.target.copy(center);
    camera.zoom = targetZoom;
    camera.updateProjectionMatrix();
    controls.update();
  }
}

function validateEmbeddedGLB(buffer) {
  if (buffer.byteLength < 28) throw new Error('文件过短，无法识别 GLB。');
  const view = new DataView(buffer);
  if (view.getUint32(0, true) !== 0x46546c67 || view.getUint32(4, true) !== 2 || view.getUint32(8, true) !== buffer.byteLength) {
    throw new Error('请选择有效的 glTF 2.0 二进制 GLB。');
  }
  const size = view.getUint32(12, true);
  if (20 + size > buffer.byteLength || view.getUint32(16, true) !== 0x4e4f534a) throw new Error('GLB JSON 数据块不完整。');
  const json = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 20, size)));
  if ([...(json.buffers || []), ...(json.images || [])].some(item => item.uri)) {
    throw new Error('仅接受资源内嵌的 GLB；请在建模工具中打包纹理后导出。');
  }
  return json;
}

function status(text, error = false) {
  $('source-status').textContent = text;
  $('source-status').classList.toggle('error', error);
}

function updateSystemCounts() {
  const counts = { all: organs.size };
  for (const key of organs.keys()) {
    const sys = META[key]?.[2];
    if (sys) counts[sys] = (counts[sys] || 0) + 1;
  }
  document.querySelectorAll('[data-sys-count]').forEach(el => {
    const key = el.dataset.sysCount;
    el.textContent = String(counts[key] || 0);
  });
}

async function loadBuffer(buffer, name, token) {
  const json = validateEmbeddedGLB(buffer);
  const parsed = await new GLTFLoader().parseAsync(buffer, '');
  if (token !== loadToken) { dispose(parsed.scene); return; }
  const found = [];
  parsed.scene.traverse(mesh => {
    if (!mesh.isMesh) return;
    const key = mesh.name.replace(/^ORGAN_/, '');
    if (META[key]) found.push([key, mesh]);
  });
  if (!found.length) {
    dispose(parsed.scene);
    throw new Error('模型中没有识别到 ORGAN_* 教学结构，请选择项目交付的 GLB。');
  }
  if (root) { scene.remove(root); dispose(root); }
  root = parsed.scene;
  scene.add(root);
  root.updateWorldMatrix(true, true);
  height = Math.max(0.1, new THREE.Box3().setFromObject(root).getSize(new THREE.Vector3()).y);
  skins = []; bones = []; organs.clear();
  $('anatomy-labels').replaceChildren();
  $('leader-lines').replaceChildren();

  let triangles = 0;
  root.traverse(mesh => {
    if (!mesh.isMesh) return;
    const meshTris = Math.round((mesh.geometry.index?.count || mesh.geometry.attributes.position.count) / 3);
    triangles += meshTris;
    const key = mesh.name.replace(/^ORGAN_/, '');
    const old = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const metadata = META[key];
    mesh.material = new THREE.MeshStandardMaterial({
      color: metadata?.[3] || (mesh.name.startsWith('TCM_Body') ? '#9bb8c2' : '#d8cfb8'),
      roughness: 0.62,
      metalness: 0.02,
      side: THREE.DoubleSide,
    });
    for (const material of old) {
      for (const value of Object.values(material)) if (value?.isTexture) value.dispose();
      material.dispose();
    }
    if (metadata) {
      const label = document.createElement('button');
      label.className = 'anatomy-label';
      label.type = 'button';
      label.textContent = metadata[0];
      label.style.setProperty('--organ-color', metadata[3]);
      label.setAttribute('aria-label', `聚焦${metadata[0]}`);
      label.addEventListener('click', () => selectOrgan(key));
      $('anatomy-labels').append(label);

      const line = document.createElementNS(ns, 'polyline');
      const dot = document.createElementNS(ns, 'circle');
      dot.setAttribute('r', '2.4');
      $('leader-lines').append(line, dot);
      organs.set(key, { key, mesh, tris: meshTris, home: mesh.position.clone(), center: new THREE.Vector3(), label, line, dot });
    } else if (mesh.name.startsWith('TCM_Body')) skins.push(mesh);
    else if (mesh.name.includes('Skeleton')) bones.push(mesh);
  });

  const order = Object.keys(META);
  const sortedOrgans = [...organs].sort(([a], [b]) => order.indexOf(a) - order.indexOf(b));
  organs.clear();
  for (const [key, value] of sortedOrgans) organs.set(key, value);

  selected = null; isolated = false; expansion = 0; system = 'all';
  $('explode').value = '0';
  $('explode-value').textContent = '0%';
  $('explode-warning').hidden = true;
  $('empty-state').hidden = true;
  $('model-badge').textContent = /female/i.test(name) ? '女性 · 比例重建' : /male/i.test(name) ? '男性 · 教学模型' : '本机教学模型';
  $('mesh-count').textContent = `${organs.size} 个器官结构 · ${triangles.toLocaleString('zh-CN')} 三角面`;
  status(`${name} · 已就绪${json.asset?.extras?.project === '络象经纬' ? ' · Rhino 教学版' : ''}`);
  updateSystemCounts();
  setSystem('all', false);
  resize();
  standardView('front', false, false);
}

async function loadLocal(file) {
  const token = ++loadToken;
  if (!file) return;
  try {
    if (file.size > 40 * 1024 * 1024) throw new Error('模型超过 40 MB，请先导出教学用轻量版本。');
    status(`正在读取 ${file.name}…`);
    await loadBuffer(await file.arrayBuffer(), file.name, token);
  } catch (error) {
    if (token === loadToken) status(error.message || '模型读取失败。', true);
  }
}

async function loadIntegrated(sex = $('integrated-sex').value, silentIfMissing = false) {
  const token = ++loadToken;
  const name = `anatomy_${sex}.glb`;
  try {
    status(`正在载入 ${name}…`);
    const response = await fetch(`assets/${name}`);
    if (!response.ok) {
      if (silentIfMissing) {
        status('未检测到本机预置模型，请点击上方按钮载入本机 GLB 文件。');
        return;
      }
      throw new Error('本地未放置该模型，请选择本机 GLB，或完成本地整合后重试。');
    }
    await loadBuffer(await response.arrayBuffer(), name, token);
  } catch (error) {
    if (token === loadToken) {
      if (silentIfMissing) status('支持原解剖 GLB 与 Rhino 结构教学版。点击上方载入本机文件。');
      else status(error.message, true);
    }
  }
}

function showOpacity(mesh, opacity) {
  mesh.material.opacity = opacity;
  mesh.material.transparent = opacity < 1;
  mesh.material.depthWrite = opacity >= 1;
  mesh.material.needsUpdate = true;
}

function applyClipping() {
  const slider = $('clip-slider');
  const out = $('clip-value');
  let activePlanes = [];
  if (clipMode === 'y') {
    const yCut = height * clipRatio;
    clipPlaneY.constant = yCut;
    activePlanes = [clipPlaneY];
    sliceGuide.visible = true;
    sliceGuide.rotation.set(Math.PI / 2, 0, 0);
    sliceGuide.position.set(0, yCut, 0);
    if (out) out.textContent = `横断面 ${(yCut * 100).toFixed(0)} cm`;
  } else if (clipMode === 'x') {
    const xCut = (clipRatio - 0.5) * 0.72;
    clipPlaneX.constant = xCut;
    activePlanes = [clipPlaneX];
    sliceGuide.visible = true;
    sliceGuide.rotation.set(0, Math.PI / 2, 0);
    sliceGuide.position.set(xCut, height * 0.5, 0);
    if (out) out.textContent = `矢状面 ${xCut >= 0 ? '+' : ''}${(xCut * 100).toFixed(0)} cm`;
  } else {
    sliceGuide.visible = false;
    if (out) out.textContent = '关闭';
  }
  if (slider) slider.disabled = clipMode === 'off';
  const applyTo = mesh => {
    if (!mesh?.material) return;
    mesh.material.clippingPlanes = activePlanes;
    mesh.material.needsUpdate = true;
  };
  for (const m of skins) applyTo(m);
  for (const m of bones) applyTo(m);
  for (const o of organs.values()) applyTo(o.mesh);
}

function refresh() {
  for (const mesh of skins) {
    mesh.visible = $('show-skin').checked && !isolated;
    showOpacity(mesh, Number($('skin-opacity').value));
  }
  for (const mesh of bones) {
    mesh.visible = $('show-skeleton').checked && !isolated;
    showOpacity(mesh, selected || system !== 'all' ? 0.12 : 0.28);
  }
  for (const [key, organ] of organs) {
    const active = system === 'all' || META[key][2] === system;
    organ.mesh.visible = isolated ? key === selected : true;
    showOpacity(organ.mesh, selected ? (key === selected ? 1 : 0.09) : (active ? 1 : 0.07));
    organ.mesh.material.emissive.set(key === selected ? META[key][3] : '#000000');
    organ.mesh.material.emissiveIntensity = key === selected ? 0.14 : 0;
    organ.label.classList.toggle('selected', key === selected);
    const d = META[key][4];
    organ.mesh.position.copy(organ.home).add(new THREE.Vector3(...d).multiplyScalar(expansion));
  }
  applyClipping();
  if (root) root.updateWorldMatrix(true, true);
  $('isolate').disabled = !selected;
  $('isolate').textContent = isolated ? '返回带参照视图' : '单独观察';
  $('opacity-value').textContent = `${Math.round(Number($('skin-opacity').value) * 100)}%`;
}

function buildIndex() {
  const query = $('organ-search').value.trim().toLowerCase();
  $('clear-search').hidden = !query;
  $('organ-list').replaceChildren();
  let count = 0;
  for (const [key, organ] of organs) {
    const meta = META[key];
    if ((system !== 'all' && meta[2] !== system) || (query && !`${meta[0]} ${meta[1]} ${key} ${meta[5]} ${meta[6]}`.toLowerCase().includes(query))) continue;
    count++;
    const button = document.createElement('button');
    button.className = `organ-row${selected === key ? ' active' : ''}`;
    button.style.setProperty('--organ-color', meta[3]);
    button.type = 'button';
    button.setAttribute('aria-pressed', String(selected === key));

    const dot = document.createElement('i');
    const text = document.createElement('span');
    const en = document.createElement('small');
    const elTag = document.createElement('span');
    text.textContent = meta[0];
    en.textContent = meta[1];
    text.append(en);
    elTag.className = 'row-el';
    elTag.textContent = meta[5].replace('五行属', '');
    button.append(dot, text, elTag);
    button.addEventListener('click', () => selectOrgan(key));
    $('organ-list').append(button);
    organ.label.classList.toggle('selected', selected === key);
  }
  $('organ-count').textContent = organs.size ? `${count} / ${organs.size}` : '—';
  if (!count) {
    const message = document.createElement('p');
    message.className = 'quiet';
    message.textContent = root ? '没有匹配的结构，请调整系统筛选或搜索词。' : '载入模型后显示实际包含的结构。';
    $('organ-list').append(message);
  }
}

function selectOrgan(key) {
  const organ = organs.get(key);
  if (!organ) return;
  selected = key; isolated = false;
  refresh();
  const box = new THREE.Box3().setFromObject(organ.mesh);
  box.getCenter(organ.center);
  const direction = camera.position.clone().sub(controls.target).normalize();
  const targetPos = organ.center.clone().addScaledVector(direction, 4);
  const size = box.getSize(new THREE.Vector3());
  const targetZoom = Math.min(3.8, height * 0.60 / Math.max(size.y, size.x, 0.16));
  controls.autoRotate = false;
  $('rotate-model').setAttribute('aria-pressed', 'false');
  camTween = { pos: targetPos, target: organ.center.clone(), zoom: targetZoom };

  const meta = META[key];
  $('selected-name').textContent = `${meta[0]} / ${meta[1]}`;
  $('selected-detail').textContent = meta[7];
  const badge = $('selected-tcm-badge');
  badge.textContent = meta[5];
  badge.hidden = false;

  const tcmMeta = $('selected-tcm-meta');
  tcmMeta.replaceChildren();
  const dimText = `${(size.x * 100).toFixed(1)}×${(size.y * 100).toFixed(1)}×${(size.z * 100).toFixed(1)} cm（网格参考）`;
  const relH = `${Math.round((organ.center.y / Math.max(0.1, height)) * 100)}% 身高位`;
  for (const tagText of [SYSTEMS[meta[2]], meta[6], dimText, relH, `${organ.tris.toLocaleString('zh-CN')} 三角面`]) {
    const span = document.createElement('span');
    span.textContent = tagText;
    tcmMeta.append(span);
  }
  tcmMeta.hidden = false;
  buildIndex();
}

function clearSelection(animate = true) {
  selected = null; isolated = false;
  $('selected-name').textContent = SYSTEMS[system];
  $('selected-detail').textContent = '点击 3D 器官、双侧标注或上方索引列表，查看空间参照、五行归经与教学要点。';
  $('selected-tcm-badge').hidden = true;
  $('selected-tcm-meta').hidden = true;
  refresh();
  buildIndex();
  standardView(currentView, false, animate);
}

function setSystem(value, animate = true) {
  system = value; selected = null; isolated = false;
  $('scene-title').textContent = `${SYSTEMS[value]} · 分层观察`;
  document.querySelectorAll('[data-system]').forEach(button => {
    const on = button.dataset.system === value;
    button.classList.toggle('active', on);
    button.setAttribute('aria-pressed', String(on));
  });
  clearSelection(animate);
}

function updateLabels() {
  const w = stage.clientWidth, h = stage.clientHeight;
  if (!w || !h) return;
  const visible = [];
  for (const [key, organ] of organs) {
    const active = (system === 'all' || META[key][2] === system) && (!selected || key === selected);
    const shown = $('show-labels').checked && organ.mesh.visible && active;
    organ.label.hidden = !shown;
    organ.line.style.display = organ.dot.style.display = shown ? '' : 'none';
    if (!shown) continue;
    new THREE.Box3().setFromObject(organ.mesh).getCenter(organ.center);
    const p = organ.center.clone().project(camera);
    if (p.z < -1 || p.z > 1 || Math.abs(p.x) > 1.04 || Math.abs(p.y) > 1.04) {
      organ.label.hidden = true;
      organ.line.style.display = organ.dot.style.display = 'none';
      continue;
    }
    visible.push({ organ, x: (p.x + 1) * w / 2, y: (1 - p.y) * h / 2 });
  }
  if (!visible.length) return;

  // Partition left/right by projected X so leader lines never cross unnecessarily
  const sortedX = visible.slice().sort((a, b) => a.x - b.x);
  const split = Math.ceil(sortedX.length / 2);
  const columns = [sortedX.slice(0, split), sortedX.slice(split)];

  const topPad = 36;
  const bottomPad = 64; // keeps labels well clear of bottom S/R/L & caption bar
  columns.forEach((items, side) => {
    items.sort((a, b) => a.y - b.y);
    const maxUsable = Math.max(40, h - topPad - bottomPad);
    const gap = Math.min(34, maxUsable / Math.max(1, items.length - 1));
    let ys = items.map(it => THREE.MathUtils.clamp(it.y, topPad, h - bottomPad));
    for (let i = 1; i < ys.length; i++) {
      if (ys[i] - ys[i - 1] < gap) ys[i] = ys[i - 1] + gap;
    }
    if (ys.length && ys[ys.length - 1] > h - bottomPad) {
      const over = ys[ys.length - 1] - (h - bottomPad);
      ys = ys.map(y => y - over);
      for (let i = ys.length - 2; i >= 0; i--) {
        if (ys[i + 1] - ys[i] < gap) ys[i] = ys[i + 1] - gap;
      }
      ys = ys.map(y => THREE.MathUtils.clamp(y, topPad, h - bottomPad));
    }

    items.forEach((item, i) => {
      const y = ys[i];
      const { organ, x, y: sourceY } = item;
      const labelWidth = organ.label.offsetWidth || 68;
      const labelX = side === 0 ? 16 : w - labelWidth - 16;
      const edge = side === 0 ? labelX + labelWidth : labelX;
      organ.label.style.left = `${labelX}px`;
      organ.label.style.top = `${y}px`;
      organ.line.setAttribute('points', `${x.toFixed(1)},${sourceY.toFixed(1)} ${(edge + (side === 0 ? 14 : -14)).toFixed(1)},${y.toFixed(1)} ${edge.toFixed(1)},${y.toFixed(1)}`);
      organ.dot.setAttribute('cx', x.toFixed(1));
      organ.dot.setAttribute('cy', sourceY.toFixed(1));
    });
  });
}

function setExplode(val) {
  expansion = THREE.MathUtils.clamp(Number(val) || 0, 0, 1);
  $('explode').value = String(expansion);
  $('explode-value').textContent = `${Math.round(expansion * 100)}%`;
  $('explode-warning').hidden = expansion === 0;
  refresh();
}

function applyPreset(name) {
  document.querySelectorAll('[data-atlas-preset]').forEach(b => b.classList.toggle('is-on', b.dataset.atlasPreset === name));
  if (name === 'organs') {
    $('show-skin').checked = false;
    $('show-skeleton').checked = false;
    setExplode(0);
  } else if (name === 'explode') {
    $('show-skin').checked = false;
    $('show-skeleton').checked = false;
    selected = null; isolated = false;
    setExplode(0.65);
    standardView('front', false, true);
  } else {
    $('show-skin').checked = true;
    $('skin-opacity').value = '0.10';
    $('show-skeleton').checked = true;
    setExplode(0);
  }
  refresh();
}

// Event bindings
$('pick-model').addEventListener('click', () => $('model-file').click());
$('empty-pick').addEventListener('click', () => $('model-file').click());
$('model-file').addEventListener('change', event => { loadLocal(event.target.files[0]); event.target.value = ''; });
$('load-integrated').addEventListener('click', () => loadIntegrated($('integrated-sex').value, false));
$('integrated-sex').addEventListener('change', () => { if (root) loadIntegrated($('integrated-sex').value, false); });

stage.addEventListener('dragover', event => event.preventDefault());
stage.addEventListener('drop', event => { event.preventDefault(); loadLocal(event.dataTransfer.files[0]); });

document.querySelectorAll('[data-system]').forEach(button => button.addEventListener('click', () => setSystem(button.dataset.system)));
document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => standardView(button.dataset.view)));
document.querySelectorAll('[data-atlas-preset]').forEach(button => button.addEventListener('click', () => applyPreset(button.dataset.atlasPreset)));

for (const id of ['show-skin', 'show-skeleton', 'show-labels', 'skin-opacity']) $(id).addEventListener('input', refresh);
$('organ-search').addEventListener('input', buildIndex);
$('clear-search').addEventListener('click', () => { $('organ-search').value = ''; buildIndex(); $('organ-search').focus(); });

$('explode').addEventListener('input', () => {
  isolated = false;
  selected = null;
  $('selected-tcm-badge').hidden = true;
  $('selected-tcm-meta').hidden = true;
  setExplode($('explode').value);
});

$('reset-view').addEventListener('click', () => {
  $('organ-search').value = '';
  clipMode = 'off';
  document.querySelectorAll('[data-clip]').forEach(b => b.classList.toggle('is-on', b.dataset.clip === 'off'));
  applyPreset('standard');
  setSystem('all', true);
  standardView('front', false, true);
});
document.querySelectorAll('[data-clip]').forEach(btn => {
  btn.addEventListener('click', () => {
    clipMode = btn.dataset.clip;
    document.querySelectorAll('[data-clip]').forEach(b => b.classList.toggle('is-on', b === btn));
    applyClipping();
  });
});
$('clip-slider')?.addEventListener('input', e => {
  clipRatio = Number(e.currentTarget.value) / 100;
  applyClipping();
});
$('clear-selection').addEventListener('click', () => setSystem('all', true));
$('isolate').addEventListener('click', () => { if (selected) { isolated = !isolated; refresh(); } });
$('rotate-model').addEventListener('click', () => {
  controls.autoRotate = !controls.autoRotate;
  $('rotate-model').setAttribute('aria-pressed', String(controls.autoRotate));
});

$('toggle-stage-theme').addEventListener('click', e => {
  const dark = centerPanel.classList.toggle('is-dark');
  e.currentTarget.setAttribute('aria-pressed', String(dark));
  e.currentTarget.textContent = dark ? '浅色图谱' : '深色光学';
});

let down = null;
renderer.domElement.addEventListener('pointerdown', event => { down = [event.clientX, event.clientY]; });
renderer.domElement.addEventListener('pointerup', event => {
  if (!down || Math.hypot(event.clientX - down[0], event.clientY - down[1]) > 5) { down = null; return; }
  down = null;
  const rect = renderer.domElement.getBoundingClientRect();
  raycaster.setFromCamera(
    new THREE.Vector2((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1),
    camera,
  );
  const candidates = [...organs.values()].filter(o => o.mesh.visible && o.mesh.material.opacity > 0.2).map(o => o.mesh);
  const hit = raycaster.intersectObjects(candidates, false)[0];
  if (hit) selectOrgan(hit.object.name.replace(/^ORGAN_/, ''));
});

function animate() {
  frame = requestAnimationFrame(animate);
  if (camTween) {
    const k = 0.14;
    camera.position.lerp(camTween.pos, k);
    controls.target.lerp(camTween.target, k);
    camera.zoom += (camTween.zoom - camera.zoom) * k;
    camera.updateProjectionMatrix();
    if (camera.position.distanceTo(camTween.pos) < 0.01 && Math.abs(camera.zoom - camTween.zoom) < 0.01) {
      camera.position.copy(camTween.pos);
      controls.target.copy(camTween.target);
      camera.zoom = camTween.zoom;
      camera.updateProjectionMatrix();
      camTween = null;
    }
  }
  controls.update();
  renderer.render(scene, camera);
  updateLabels();
}

resize();
standardView('front', false, false);
animate();
// Automatically load local integrated male model if available on the preview server; silently fallback if absent.
loadIntegrated('male', true);

window.addEventListener('pagehide', event => {
  if (event.persisted) return;
  cancelAnimationFrame(frame);
  observer.disconnect();
  controls.dispose();
  if (root) dispose(root);
  renderer.dispose();
});
