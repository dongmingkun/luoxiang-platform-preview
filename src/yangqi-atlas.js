import * as THREE from "three";
import { ST_POINTS } from "./stomach-atlas.js";

const byId = new Map(ST_POINTS.map(p => [p.id, p]));
const $ = id => document.getElementById(id);

// 保存顶点号而非屏幕像素。导入时核对性别、体表网格指纹和顶点范围。
function skinSignature(attribute) {
  let hash = 2166136261;
  const bytes = new Uint8Array(attribute.array.buffer, attribute.array.byteOffset, attribute.array.byteLength);
  for (const byte of bytes) hash = Math.imul(hash ^ byte, 16777619);
  return attribute.count + "-" + (hash >>> 0).toString(16);
}

export function setupStomachAtlas() {
  const select = $("st-point"), side = $("st-side"), locate = $("st-locate");
  const status = $("st-status"), tags = $("surface-tags");
  const atlasBySkin = new Map();
  const projection = new THREE.Vector3();
  const ray = new THREE.Raycaster();
  const labels = [];
  let scene, skinId, saved, armed = false, channel = null, lastDown = null;
  for (const point of ST_POINTS) select.add(new Option(point.id + " · " + point.name, point.id));
  select.value = "ST25";

  function key(id) { return side.value + ":" + id; }
  function vertex(index) {
    return scene.skin.localToWorld(new THREE.Vector3().fromBufferAttribute(scene.skin.geometry.attributes.position, index));
  }
  function manual(id) {
    const index = saved?.get(key(id));
    return index == null ? null : vertex(index);
  }
  function named(id) {
    const node = scene?.glbScene?.getObjectByName("ACU_" + id + "_" + side.value);
    return node?.getWorldPosition(new THREE.Vector3());
  }
  function proportionalCandidate(id) {
    // 用同侧、同模型上有标记的两端按骨度分寸内插，再投至皮肤。
    const n = Number(id.slice(2));
    let span;
    if (n > 19 && n < 25) span = [19, 25, (n - 19) / 6];
    if (n > 25 && n < 30) span = [25, 30, (n - 25) / 5];
    if (n >= 36 && n <= 39) span = [35, 41, [3, 6, 8, 9][n - 36] / 16];
    if (span) {
      const a = manual("ST" + span[0]) ?? named("ST" + span[0]);
      const b = manual("ST" + span[1]) ?? named("ST" + span[1]);
      if (a && b) {
        const hit = scene.frontSurface?.(a.clone().lerp(b, span[2]));
        if (hit) return hit;
      }
    }
    return null;
  }
  function placement(id) {
    const marked = manual(id);
    if (marked) return { pos: marked, type: "本机标记 · 待复核" };
    const anchor = named(id);
    if (anchor) return { pos: anchor, type: "模型随附标记 · 待复核" };
    const candidate = proportionalCandidate(id);
    if (candidate) return { pos: candidate, type: "骨度比例候选 · 待复核" };
    const path = scene?.meridians?.meridians.find(m => m.baseId === "ST" && m.side === side.value);
    const sample = path?.acuGroup?.children.find(o => o.userData.acupointName.endsWith(" " + id));
    return sample ? { pos: sample.getWorldPosition(new THREE.Vector3()), type: "经线示意 · 待标定" } : null;
  }
  function disarm() {
    armed = false;
    lastDown = null;
    locate.textContent = "在体表标定";
    locate.setAttribute("aria-pressed", "false");
    $("canvas-wrap").classList.remove("is-marking");
  }
  function marker(label, pos, kind, clicked) {
    const el = document.createElement("button");
    el.type = "button";
    el.className = "surface-tag " + kind;
    el.textContent = label;
    el.title = label;
    el.addEventListener("click", clicked);
    tags.append(el);
    labels.push({ el, pos, kind });
  }
  function project() {
    if (!scene) return;
    const w = scene.container.clientWidth, h = scene.container.clientHeight;
    for (const {el, pos, kind} of labels) {
      projection.copy(pos).project(scene.camera);
      const kidney = kind.startsWith("kidney");
      if (kidney) {
        const other = scene.kidneyAnchors[kind === "kidney-left" ? 1 : 0];
        if (other) el.classList.toggle("to-left", projection.x < other.clone().project(scene.camera).x);
      }
      const on = kidney ? scene.layers.organs && (scene.inspected === "Kidneys" || (!scene.inspected && scene.camera.position.z < pos.z))
        : channel === "ST" && scene.layers.meridians && !scene.inspected && scene.camera.position.z > pos.z;
      el.hidden = !on || armed || Math.abs(projection.x) >= 1 || Math.abs(projection.y) >= 1 || Math.abs(projection.z) >= 1;
      if (!el.hidden) {
        el.style.left = ((projection.x + 1) * w / 2).toFixed(1) + "px";
        el.style.top = ((1 - projection.y) * h / 2).toFixed(1) + "px";
      }
    }
  }
  function refresh() {
    const p = byId.get(select.value), result = placement(p.id);
    $("st-detail").textContent = p.name + " · §" + p.clause + "　" + p.location;
    const count = saved ? [...saved.keys()].filter(k => k.startsWith(side.value + ":")).length : 0;
    status.textContent = (result?.type ?? "坐标待标定") + "。本侧手动标记 " + count + " / 45。";
    const target = manual(p.id);
    const estimate = target && proportionalCandidate(p.id);
    $("st-metric").textContent = estimate
      ? "算法候选与本次手动标记的直线距离占模型身高 " + (100 * estimate.distanceTo(target) / scene.modelHeight).toFixed(2) + "%。独立专家参照待采集。"
      : "定位偏差待采集。有同侧区间端点和单独标出的区间内穴位时，可计算相对模型身高的偏差。";
    locate.disabled = !scene?.skin;
    $("st-region").disabled = !scene?.skin;
    $("st-export").disabled = !saved?.size;
    labels.length = 0;
    tags.replaceChildren();
    if (!scene) return;
    scene.kidneyAnchors?.forEach((pos, i) => {
      if (pos) marker(i ? "右肾" : "左肾", pos, i ? "kidney-right" : "kidney-left", () => $("inspect-kidneys").click());
    });
    const overview = $("st-all").checked;
    const ids = overview ? byId.keys() : new Set(["ST25", "ST36", p.id]);
    for (const id of ids) {
      const placed = placement(id);
      if (!placed) continue;
      const label = byId.get(id).name;
      const style = overview && id !== p.id ? "acu compact" : "acu";
      marker(label + " " + id, placed.pos, style, () => {
        select.value = id;
        $("atlas-open").click();
        refresh();
      });
    }
    project();
  }
  function selectPoint() {
    disarm();
    if (channel !== "ST") $("atlas-open").click();
    refresh();
  }
  select.addEventListener("change", selectPoint);
  side.addEventListener("change", selectPoint);
  $("st-all").addEventListener("change", selectPoint);
  $("st-region").addEventListener("click", () => {
    if (channel !== "ST") $("atlas-open").click();
    scene?.focusRegion(Number(select.value.slice(2)), side.value);
    $("btn-rotate").classList.remove("is-on");
  });
  locate.addEventListener("click", () => {
    if (armed) { disarm(); refresh(); return; }
    if (!scene?.skin) return;
    if (channel !== "ST") $("atlas-open").click();
    scene.clearInspection();
    scene.controls.autoRotate = false;
    $("btn-rotate").classList.remove("is-on");
    armed = true;
    locate.textContent = "取消标定";
    locate.setAttribute("aria-pressed", "true");
    $("canvas-wrap").classList.add("is-marking");
    status.textContent = "轻点相应侧体表记录 " + select.value + "。拖动可旋转，Esc 取消。";
    project();
  });
  document.addEventListener("keydown", e => {
    if (armed && e.key === "Escape") { disarm(); refresh(); }
  });
  const wrap = $("canvas-wrap");
  wrap.addEventListener("pointerdown", e => {
    if (armed && e.isPrimary && e.button === 0 && e.target === scene?.renderer.domElement) lastDown = [e.clientX, e.clientY];
  }, true);
  wrap.addEventListener("pointercancel", () => { lastDown = null; });
  wrap.addEventListener("pointerup", e => {
    const down = lastDown;
    lastDown = null;
    if (!armed || !down || e.target !== scene.renderer.domElement || Math.hypot(e.clientX-down[0], e.clientY-down[1]) > 5) return;
    const rect = scene.renderer.domElement.getBoundingClientRect();
    ray.setFromCamera(new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1, 1-(e.clientY-rect.top)/rect.height*2),scene.camera);
    const hit = ray.intersectObject(scene.skin, false)[0];
    if (!hit || hit.point.x * (side.value === "L" ? 1 : -1) <= 0) {
      status.textContent = "请点在所选侧的人体皮肤上，或切换侧别。";
      return;
    }
    const indices = [hit.face.a, hit.face.b, hit.face.c].filter(i => vertex(i).x * (side.value === "L" ? 1 : -1) > 0);
    if (!indices.length) return;
    indices.sort((a,b) => vertex(a).distanceToSquared(hit.point) - vertex(b).distanceToSquared(hit.point));
    saved.set(key(select.value), indices[0]);
    disarm(); refresh();
  }, true);
  $("st-export").addEventListener("click", () => {
    if (!saved?.size) return;
    const head = "model,skin,side,point,vertex";
    const rows = [...saved].map(([ref,i]) => [scene.sex, skinId, ...ref.split(":"), i].join(","));
    const url = URL.createObjectURL(new Blob([[head,...rows].join("\n")], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url; a.download = "stomach-" + scene.sex + "-draft.csv"; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  $("st-import").addEventListener("change", async e => {
    const file = e.target.files[0], target = saved;
    e.target.value = "";
    if (!file || !target) return;
    disarm();
    try {
      if (file.size > 32768) throw Error();
      const [head,...rows] = (await file.text()).trim().split(/\r?\n/);
      if (saved !== target) return;
      if (head !== "model,skin,side,point,vertex" || !rows.length || rows.length > 90) throw Error();
      const seen = new Map();
      for (const row of rows) {
        const fields = row.split(",");
        const [sex, mesh, which, id, v] = fields, index = Number(v), k = which + ":" + id;
        if (fields.length !== 5 || sex !== scene.sex || mesh !== skinId || !["L","R"].includes(which) ||
            !byId.has(id) || !/^\d+$/.test(v) || index >= scene.skin.geometry.attributes.position.count || seen.has(k) ||
            vertex(index).x * (which === "L" ? 1 : -1) <= 0) throw Error();
        seen.set(k,index);
      }
      for (const [k,i] of seen) saved.set(k,i);
      refresh();
    } catch { status.textContent = "无法导入，请核对当前模型、侧别及本页导出的 CSV 格式。"; }
  });
  refresh();
  return {
    attach(active) {
      scene = active;
      if (!scene.skin) { refresh(); return; }
      skinId = skinSignature(scene.skin.geometry.attributes.position);
      const profile = scene.sex + ":" + skinId;
      if (!atlasBySkin.has(profile)) atlasBySkin.set(profile, new Map());
      saved = atlasBySkin.get(profile);
      scene.afterProjection = project;
      refresh();
    },
    cancelMark() { if (armed) { disarm(); refresh(); } },
    suspend() { disarm(); scene = null; saved = null; refresh(); },
    setChannel(next) {
      if (channel !== next) disarm();
      channel = next; refresh();
    },
  };
}
