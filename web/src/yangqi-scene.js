import * as THREE from "three";
import { TCMScene3D } from "./scene3d.js?v=20261127atlas2";
import { createMeridianSystem } from "./meridians.js?v=20261127atlas2";

// 取网格上的真实顶点作为引线端点。双肾按模型矢状面分开，避免落在两肾之间。
function organSurface(mesh, side = 0, posterior = false) {
  const attr = mesh.geometry.attributes.position;
  const bounds = new THREE.Box3();
  const v = new THREE.Vector3();
  const onSide = x => !side || x * side > 0;
  for (let i = 0; i < attr.count; i++) {
    mesh.localToWorld(v.fromBufferAttribute(attr, i));
    if (onSide(v.x)) bounds.expandByPoint(v);
  }
  if (bounds.isEmpty()) return null;
  const target = bounds.getCenter(new THREE.Vector3());
  target.z = posterior ? bounds.min.z : bounds.max.z;
  const nearest = new THREE.Vector3();
  let distance = Infinity;
  for (let i = 0; i < attr.count; i++) {
    mesh.localToWorld(v.fromBufferAttribute(attr, i));
    if (!onSide(v.x)) continue;
    const d = v.distanceToSquared(target);
    if (d < distance) { nearest.copy(v); distance = d; }
  }
  return nearest;
}

export class YangqiScene extends TCMScene3D {
  buildMeridians(data) {
    const skin = this.skin;
    if (!skin) return super.buildMeridians(data);
    skin.updateWorldMatrix(true, false);
    const bounds = new THREE.Box3().setFromObject(skin);
    const h = bounds.max.y - bounds.min.y;
    const ray = new THREE.Raycaster();
    const direction = new THREE.Vector3(0, 0, -1);
    // 在当前网格上就近寻找前表面。超出邻域则保留原始路径，避免把线吸到邻近肢体。
    this.frontSurface = seed => {
      const origin = seed.clone();
      origin.z += h * 0.04;
      ray.set(origin, direction);
      ray.far = h * 0.08;
      const hit = ray.intersectObject(skin, false)[0];
      return hit?.point ?? null;
    };
    const system = createMeridianSystem(data, (path, radius) => {
      if (path.baseId !== "ST") return { points: path.points, radius };
      const points = path.points.map(p => {
        const hit = this.frontSurface(new THREE.Vector3(p.x, p.y, p.z));
        if (!hit) return p;
        hit.z += h * 0.0014;
        return hit;
      });
      return { points, radius: radius * 0.44 };
    });
    // 先绘制最近体表深度，让透明皮肤只混合一层，同时遮挡背面的胃经。
    const depthSkin = new THREE.Mesh(skin.geometry, new THREE.ShaderMaterial({
      vertexShader: this.skinMaterial.vertexShader,
      fragmentShader: "void main() { gl_FragColor = vec4(0.0); }",
      colorWrite: false, depthWrite: true, transparent: true, side: THREE.FrontSide,
    }));
    depthSkin.matrixAutoUpdate = false;
    depthSkin.renderOrder = 9;
    // 与皮肤共享几何，随该性别的 GLB 一起释放。
    depthSkin.matrix.copy(skin.matrix);
    skin.parent.add(depthSkin);
    this.routeDepthSkin = depthSkin;
    for (const m of system.meridians.filter(m => m.baseId === "ST")) {
      m.mesh.renderOrder = 12;
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(m.curve.getPoints(200)),
        new THREE.LineBasicMaterial({ color: 0xffcb64, transparent: true, opacity: 0.9, depthWrite: false }));
      line.renderOrder = 12;
      m.mesh.add(line);
      m.routeSpine = line;
    }
    system.flows.filter(f => f.baseId === "ST").forEach(f => { f.points.renderOrder = 13; });
    return system;
  }

  _updateOrganCenters() {
    super._updateOrganCenters();
    const stomach = this.organs.get("Stomach");
    if (stomach) {
      const anchor = organSurface(stomach.mesh, 1);
      if (anchor) stomach.center.copy(anchor);
    }
    const kidneys = this.organs.get("Kidneys");
    this.kidneyAnchors = kidneys ? [organSurface(kidneys.mesh, 1, true), organSurface(kidneys.mesh, -1, true)] : [];
  }

  _resetCameraForModel() {
    this.controls.target.set(0, this.modelHeight * 0.50, 0);
    const distance = this.modelHeight * 0.57 / Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    this.camera.position.set(0, this.controls.target.y, distance);
    this.controls.autoRotate = false;
    this.controls.update();
  }

  resetView() {
    this.clearInspection();
    this.selectedOrgan = null;
    this._cameraTween = null;
    this._resetCameraForModel();
    this._updateLabelClasses();
  }

  _setupLabels() {
    super._setupLabels();
    this.labels.get("Kidneys")?.remove();
    this.labels.delete("Kidneys");
    this._calloutPaths.get("Kidneys")?.remove();
    this._calloutDots.get("Kidneys")?.remove();
  }

  _syncOrganVisibility() {
    super._syncOrganVisibility();
    if (this.inspected) {
      for (const [key, o] of this.organs) o.mesh.visible = key === this.inspected;
    }
  }

  inspectOrgan(key, view) {
    const organ = this.organs.get(key);
    if (!organ) return;
    this.inspected = key;
    this.meridians.group.visible = false;
    this.skinMaterial.uniforms.uLightDir.value.set(2.2, 3.8, view === "back" ? -3.4 : 3.4).normalize();
    this._syncOrganVisibility();
    this.setCameraPreset(view, false);
    const center = new THREE.Box3().setFromObject(organ.mesh).getCenter(new THREE.Vector3());
    this.controls.target.copy(center);
    this.camera.position.copy(center);
    this.camera.position.z += view === "back" ? -1.25 : 1.25;
    this.controls.update();
    this.afterProjection?.();
  }

  focusRegion(number, side) {
    const path = this.meridians?.meridians.find(m => m.baseId === "ST" && m.side === side);
    if (!path) return;
    // 局部镜头取现有曲线上的区域中心，不作为穴位坐标。
    const u = number <= 8 ? 0.02 : number <= 18 ? 0.18 : number <= 30 ? 0.34 : number <= 35 ? 0.61 : number <= 40 ? 0.8 : 0.97;
    const target = path.curve.getPointAt(u);
    this.clearInspection();
    this.controls.autoRotate = false;
    this.controls.minDistance = this.modelHeight * 0.16;
    this._cameraTween = { target, pos: target.clone().add(new THREE.Vector3(0, 0.04, this.modelHeight * 0.35)) };
  }

  clearInspection() {
    if (!this.inspected) return;
    this.inspected = null;
    this.meridians.group.visible = this.layers.meridians;
    this.skinMaterial.uniforms.uLightDir.value.set(2.2, 3.8, 3.4).normalize();
    this._syncOrganVisibility();
  }

  _updateLabels() {
    // 本页只呈现可点名的穴位。隐藏共享引擎用于概览的无名白点。
    this.meridians?.meridians.forEach(m => {
      m.acuGroup.visible = false;
      if (m.routeSpine) m.routeSpine.visible = this.affectedMeridians.includes("ST");
    });
    if (this.routeDepthSkin) {
      this.routeDepthSkin.visible = this.layers.skin && (this.visualMode === "real" || this.affectedMeridians.includes("ST"));
    }
    super._updateLabels();
    this.afterProjection?.();
  }
}
