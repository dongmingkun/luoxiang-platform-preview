import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// Presentation metadata only. No model geometry, meridians or patient data.
const META = {
  Brain: ['脑', 'Brain', 'nervous', '#b7a0d8', [-0.32, 0.08, 0.16]],
  Trachea: ['气管', 'Trachea', 'respiratory', '#9cd5c9', [0.20, 0.12, 0.10]],
  Airways: ['支气管', 'Airways', 'respiratory', '#459f9c', [0.22, 0.16, 0.06]],
  Lungs: ['肺', 'Lungs', 'respiratory', '#68bcb4', [0.36, 0.03, 0.12]],
  Heart: ['心', 'Heart', 'circulatory', '#de6c65', [-0.42, 0.08, 0.08]],
  Liver: ['肝', 'Liver', 'digestive', '#bc8653', [-0.45, 0.10, 0.02]],
  Stomach: ['胃', 'Stomach', 'digestive', '#e0a276', [0.42, 0.15, 0.03]],
  Spleen: ['脾', 'Spleen', 'lymphatic', '#bc7199', [0.48, 0.05, -0.10]],
  Pancreas: ['胰', 'Pancreas', 'digestive', '#e4c264', [0.36, 0.18, -0.13]],
  Gallbladder: ['胆', 'Gallbladder', 'digestive', '#8eae6b', [-0.38, 0.20, -0.15]],
  Kidneys: ['肾', 'Kidneys', 'urinary', '#789fda', [-0.36, -0.10, -0.14]],
  LargeIntestine: ['大肠', 'Large intestine', 'digestive', '#b68872', [-0.36, 0.18, -0.30]],
  SmallIntestine: ['小肠', 'Small intestine', 'digestive', '#d8a07e', [0.36, 0.20, -0.28]],
  Bladder: ['膀胱', 'Bladder', 'urinary', '#7cbbd2', [0.24, 0.12, -0.38]],
};
const SYSTEMS = { all: '整体结构', respiratory: '呼吸结构', circulatory: '循环结构', digestive: '消化结构', urinary: '泌尿结构', nervous: '神经结构', lymphatic: '淋巴结构' };
const $ = id => document.getElementById(id);
const stage = $('atlas-stage');
const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 100);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
stage.prepend(renderer.domElement);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.09;
controls.autoRotateSpeed = 0.45;
controls.minZoom = 0.5;
controls.maxZoom = 8;
controls.target.set(0, 0.86, 0);
camera.position.set(0, 0.86, 4);
scene.add(new THREE.HemisphereLight(0xfffcf1, 0x64867b, 2.0));
const keyLight = new THREE.DirectionalLight(0xffffff, 2.5);
keyLight.position.set(-2, 4, 5);
scene.add(keyLight);
const fill = new THREE.DirectionalLight(0xbadcd2, 1.8);
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
  const half = height * 0.59;
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

function standardView(view = 'front', preserveZoom = false) {
  currentView = view;
  const center = new THREE.Vector3(0, height * 0.50, 0);
  const vectors = { front: [0, 0, 4], back: [0, 0, -4], left: [4, 0, 0], right: [-4, 0, 0] };
  camera.position.copy(center).add(new THREE.Vector3(...vectors[view]));
  camera.up.set(0, 1, 0);
  if (!preserveZoom) camera.zoom = 1;
  controls.target.copy(center);
  controls.autoRotate = false;
  $('rotate-model').setAttribute('aria-pressed', 'false');
  document.querySelectorAll('[data-view]').forEach(button => {
    const active = button.dataset.view === view;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  camera.updateProjectionMatrix();
  controls.update();
}

function validateEmbeddedGLB(buffer) {
  if (buffer.byteLength < 28) throw new Error('文件过短，无法识别 GLB。');
  const view = new DataView(buffer);
  if (view.getUint32(0, true) !== 0x46546c67 || view.getUint32(4, true) !== 2 || view.getUint32(8, true) !== buffer.byteLength) throw new Error('请选择有效的 glTF 2.0 二进制 GLB。');
  const size = view.getUint32(12, true);
  if (20 + size > buffer.byteLength || view.getUint32(16, true) !== 0x4e4f534a) throw new Error('GLB JSON 数据块不完整。');
  const json = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 20, size)));
  if ([...(json.buffers || []), ...(json.images || [])].some(item => item.uri)) throw new Error('仅接受资源内嵌的 GLB；请在建模工具中打包纹理后导出。');
  return json;
}

function status(text, error = false) {
  $('source-status').textContent = text;
  $('source-status').classList.toggle('error', error);
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
  if (!found.length) { dispose(parsed.scene); throw new Error('模型中没有识别到 ORGAN_* 教学结构，请选择项目交付的 GLB。'); }
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
    triangles += (mesh.geometry.index?.count || mesh.geometry.attributes.position.count) / 3;
    const key = mesh.name.replace(/^ORGAN_/, '');
    const old = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const metadata = META[key];
    mesh.material = new THREE.MeshStandardMaterial({ color: metadata?.[3] || (mesh.name.startsWith('TCM_Body') ? '#a7bcc6' : '#d4cbb6'), roughness: 0.65, metalness: 0, side: THREE.DoubleSide });
    for (const material of old) { for (const value of Object.values(material)) if (value?.isTexture) value.dispose(); material.dispose(); }
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
      const dot = document.createElementNS(ns, 'circle'); dot.setAttribute('r', '2');
      $('leader-lines').append(line, dot);
      organs.set(key, { key, mesh, home: mesh.position.clone(), center: new THREE.Vector3(), label, line, dot });
    } else if (mesh.name.startsWith('TCM_Body')) skins.push(mesh);
    else if (mesh.name.includes('Skeleton')) bones.push(mesh);
  });
  const order = Object.keys(META);
  const sortedOrgans = [...organs].sort(([a], [b]) => order.indexOf(a)-order.indexOf(b));
  organs.clear();
  for (const [key, value] of sortedOrgans) organs.set(key, value);
  selected = null; isolated = false; expansion = 0; system = 'all';
  $('explode').value = '0';
  $('explode-value').textContent = '0%';
  $('explode-warning').hidden = true;
  $('empty-state').hidden = true;
  $('organ-count').textContent = String(organs.size);
  $('model-badge').textContent = /female/i.test(name) ? '女性 · 比例重建' : /male/i.test(name) ? '男性 · 教学模型' : '本机教学模型';
  $('mesh-count').textContent = `${organs.size} 个器官结构 · ${Math.round(triangles).toLocaleString()} 三角面`;
  status(`${name} · 本机已载入${json.asset?.extras?.project === '络象经纬' ? ' · Rhino 结构教学版' : ''}`);
  setSystem('all'); clearSelection(); resize(); standardView();
}

async function loadLocal(file) {
  const token = ++loadToken;
  if (!file) return;
  try {
    if (file.size > 40 * 1024 * 1024) throw new Error('模型超过 40 MB，请先导出教学用轻量版本。');
    status(`正在读取 ${file.name}…`);
    await loadBuffer(await file.arrayBuffer(), file.name, token);
  } catch (error) { if (token === loadToken) status(error.message || '模型读取失败。', true); }
}

function showOpacity(mesh, opacity) {
  mesh.material.opacity = opacity;
  mesh.material.transparent = opacity < 1;
  mesh.material.depthWrite = opacity >= 1;
  mesh.material.needsUpdate = true;
}

function refresh() {
  for (const mesh of skins) { mesh.visible = $('show-skin').checked && !isolated; showOpacity(mesh, Number($('skin-opacity').value)); }
  for (const mesh of bones) { mesh.visible = $('show-skeleton').checked && !isolated; showOpacity(mesh, selected || system !== 'all' ? 0.12 : 0.26); }
  for (const [key, organ] of organs) {
    const active = system === 'all' || META[key][2] === system;
    organ.mesh.visible = isolated ? key === selected : true;
    showOpacity(organ.mesh, selected ? (key === selected ? 1 : 0.10) : (active ? 1 : 0.07));
    organ.mesh.material.emissive.set(key === selected ? META[key][3] : '#000000');
    organ.mesh.material.emissiveIntensity = key === selected ? 0.10 : 0;
    organ.label.classList.toggle('selected', key === selected);
    const d = META[key][4];
    organ.mesh.position.copy(organ.home).add(new THREE.Vector3(...d).multiplyScalar(expansion));
  }
  if (root) root.updateWorldMatrix(true, true);
  $('isolate').disabled = !selected;
  $('isolate').textContent = isolated ? '返回带参照视图' : '单独观察';
  $('opacity-value').textContent = `${Math.round(Number($('skin-opacity').value) * 100)}%`;
}

function buildIndex() {
  const query = $('organ-search').value.trim().toLowerCase();
  $('organ-list').replaceChildren();
  let count = 0;
  for (const [key, organ] of organs) {
    const meta = META[key];
    if ((system !== 'all' && meta[2] !== system) || (query && !`${meta[0]} ${meta[1]} ${key}`.toLowerCase().includes(query))) continue;
    count++;
    const button = document.createElement('button');
    button.className = `organ-row${selected === key ? ' active' : ''}`;
    button.style.setProperty('--organ-color', meta[3]);
    button.type = 'button'; button.setAttribute('aria-pressed', String(selected === key));
    const dot = document.createElement('i'), text = document.createElement('span'), en = document.createElement('small'), arrow = document.createElement('em');
    text.textContent = meta[0]; en.textContent = meta[1]; text.append(en); arrow.textContent = '↗';
    button.append(dot, text, arrow); button.addEventListener('click', () => selectOrgan(key));
    $('organ-list').append(button);
    organ.label.classList.toggle('selected', selected === key);
  }
  if (!count) { const message = document.createElement('p'); message.className = 'quiet'; message.textContent = root ? '没有匹配的结构，请调整筛选。' : '载入模型后显示实际包含的结构。'; $('organ-list').append(message); }
}

function selectOrgan(key) {
  const organ = organs.get(key);
  if (!organ) return;
  selected = key; isolated = false;
  refresh();
  const box = new THREE.Box3().setFromObject(organ.mesh);
  box.getCenter(organ.center);
  const direction = camera.position.clone().sub(controls.target).normalize();
  controls.target.copy(organ.center);
  camera.position.copy(organ.center).addScaledVector(direction, 4);
  const size = box.getSize(new THREE.Vector3());
  camera.zoom = Math.min(3.8, height * 0.63 / Math.max(size.y, size.x, 0.15));
  camera.updateProjectionMatrix(); controls.autoRotate = false; controls.update();
  $('rotate-model').setAttribute('aria-pressed', 'false');
  $('selected-name').textContent = `${META[key][0]} / ${META[key][1]}`;
  $('selected-detail').textContent = `${SYSTEMS[META[key][2]]} · 已载入模型中的教学网格。颜色仅作区分；分离后位置不代表解剖原位。`;
  buildIndex();
}

function clearSelection() {
  selected = null; isolated = false;
  $('selected-name').textContent = SYSTEMS[system];
  $('selected-detail').textContent = '选择结构可聚焦局部；关闭体表或骨骼可看清内部。';
  refresh(); buildIndex(); standardView(currentView);
}

function setSystem(value) {
  system = value; selected = null; isolated = false;
  $('scene-title').textContent = `${SYSTEMS[value]} · 分层观察`;
  document.querySelectorAll('[data-system]').forEach(button => { const on = button.dataset.system === value; button.classList.toggle('active', on); button.setAttribute('aria-pressed', String(on)); });
  clearSelection();
}

function updateLabels() {
  const w = stage.clientWidth, h = stage.clientHeight;
  const columns = [[], []];
  let index = 0;
  for (const [key, organ] of organs) {
    const active = (system === 'all' || META[key][2] === system) && (!selected || key === selected);
    const shown = $('show-labels').checked && organ.mesh.visible && active;
    organ.label.hidden = !shown; organ.line.style.display = organ.dot.style.display = shown ? '' : 'none';
    if (!shown) continue;
    new THREE.Box3().setFromObject(organ.mesh).getCenter(organ.center);
    const p = organ.center.clone().project(camera);
    if (p.z < -1 || p.z > 1 || Math.abs(p.x) > 1 || Math.abs(p.y) > 1) { organ.label.hidden = true; organ.line.style.display = organ.dot.style.display = 'none'; continue; }
    columns[index++ % 2].push({ organ, x: (p.x + 1)*w/2, y: (1-p.y)*h/2 });
  }
  columns.forEach((items, side) => {
    items.sort((a, b) => a.y - b.y);
    const gap = Math.min(32, (h - 140) / Math.max(1, items.length - 1));
    let last = 38;
    items.forEach((item, i) => {
      const y = Math.min(h - 68 - (items.length - 1 - i)*gap, Math.max(last + gap, item.y));
      last = y;
      const { organ, x, y: sourceY } = item;
      const labelWidth = organ.label.offsetWidth || 66;
      const labelX = side === 0 ? 18 : w - labelWidth - 18;
      const edge = side === 0 ? labelX + labelWidth : labelX;
      organ.label.style.left = `${labelX}px`; organ.label.style.top = `${y}px`;
      organ.line.setAttribute('points', `${x},${sourceY} ${edge + (side === 0 ? 12 : -12)},${y} ${edge},${y}`);
      organ.dot.setAttribute('cx', String(x)); organ.dot.setAttribute('cy', String(sourceY));
    });
  });
}

$('pick-model').addEventListener('click', () => $('model-file').click());
$('empty-pick').addEventListener('click', () => $('model-file').click());
$('model-file').addEventListener('change', event => { loadLocal(event.target.files[0]); event.target.value = ''; });
$('load-integrated').addEventListener('click', async () => {
  const token = ++loadToken, sex = $('integrated-sex').value;
  const name = `anatomy_${sex}.glb`;
  try {
    status(`正在载入已由队长放置的 ${name}…`);
    // Relative platform path only; never fetch from a model repository.
    const response = await fetch(`assets/${name}`);
    if (!response.ok) throw new Error('本地未放置该模型，请选择本机 GLB，或由队长手动整合后重试。');
    await loadBuffer(await response.arrayBuffer(), name, token);
  } catch (error) { if (token === loadToken) status(error.message, true); }
});
stage.addEventListener('dragover', event => event.preventDefault());
stage.addEventListener('drop', event => { event.preventDefault(); loadLocal(event.dataTransfer.files[0]); });
document.querySelectorAll('[data-system]').forEach(button => button.addEventListener('click', () => setSystem(button.dataset.system)));
document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => standardView(button.dataset.view)));
for (const id of ['show-skin', 'show-skeleton', 'show-labels', 'skin-opacity']) $(id).addEventListener('input', refresh);
$('organ-search').addEventListener('input', buildIndex);
$('explode').addEventListener('input', () => {
  expansion = Number($('explode').value);
  $('explode-value').textContent = `${Math.round(expansion*100)}%`;
  $('explode-warning').hidden = expansion === 0;
  isolated = false; selected = null;
  clearSelection(); standardView();
});
$('reset-view').addEventListener('click', () => { expansion = 0; $('explode').value = '0'; $('explode-value').textContent = '0%'; $('explode-warning').hidden = true; $('organ-search').value = ''; setSystem('all'); standardView(); });
$('clear-selection').addEventListener('click', () => setSystem('all'));
$('isolate').addEventListener('click', () => { if (selected) { isolated = !isolated; refresh(); } });
$('rotate-model').addEventListener('click', () => { controls.autoRotate = !controls.autoRotate; $('rotate-model').setAttribute('aria-pressed', String(controls.autoRotate)); });
let down = null;
renderer.domElement.addEventListener('pointerdown', event => { down = [event.clientX, event.clientY]; });
renderer.domElement.addEventListener('pointerup', event => {
  if (!down || Math.hypot(event.clientX-down[0], event.clientY-down[1]) > 5) { down = null; return; }
  down = null;
  const rect = renderer.domElement.getBoundingClientRect();
  raycaster.setFromCamera(new THREE.Vector2((event.clientX-rect.left)/rect.width*2-1, -(event.clientY-rect.top)/rect.height*2+1), camera);
  const candidates = [...organs.values()].filter(o => o.mesh.visible && o.mesh.material.opacity > 0.2).map(o => o.mesh);
  const hit = raycaster.intersectObjects(candidates, false)[0];
  if (hit) selectOrgan(hit.object.name.replace(/^ORGAN_/, ''));
});
function animate() { frame = requestAnimationFrame(animate); controls.update(); renderer.render(scene, camera); updateLabels(); }
resize(); standardView(); animate();
window.addEventListener('pagehide', event => { if (event.persisted) return; cancelAnimationFrame(frame); observer.disconnect(); controls.dispose(); if (root) dispose(root); renderer.dispose(); });
