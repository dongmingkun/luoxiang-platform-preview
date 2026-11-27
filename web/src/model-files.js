import { LoadingManager } from "three";

export function embeddedManager() {
  return new LoadingManager().setURLModifier(url => {
    if (url.startsWith("blob:") || url.startsWith("data:")) return url;
    throw new Error("请使用资源已内嵌的 GLB。");
  });
}

// GitHub Pages 仅发布平台静态文件。其它部署仍可提供已在同站整合的模型。
export const isPlatformPages = location.hostname === "dongmingkun.github.io"
  && location.pathname.startsWith("/luoxiang-platform-preview/");

export function integratedLink(page) {
  const url = new URL(page, "http://127.0.0.1:8020/");
  if (page === "index.html") {
    const query = new URLSearchParams(location.search);
    for (const key of ["demo", "case"]) if (query.has(key)) url.searchParams.set(key, query.get(key));
  }
  return url.href;
}

export function validateEmbeddedGLB(buffer) {
  if (buffer.byteLength < 28) throw new Error("文件过短，无法识别 GLB。");
  const view = new DataView(buffer);
  if (view.getUint32(0, true) !== 0x46546c67 || view.getUint32(4, true) !== 2 || view.getUint32(8, true) !== buffer.byteLength) {
    throw new Error("请选择有效的 glTF 2.0 二进制 GLB。");
  }
  const size = view.getUint32(12, true);
  if (20 + size > buffer.byteLength || view.getUint32(16, true) !== 0x4e4f534a) throw new Error("GLB JSON 数据块不完整。");
  const json = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 20, size)));
  if ([...(json.buffers || []), ...(json.images || [])].some(item => item.uri)) {
    throw new Error("请选择已内嵌资源的教学 GLB。");
  }
  return json;
}

const pairs = {
  male: ["anatomy_male.glb", "meridians.json"],
  female: ["anatomy_female.glb", "meridians_female.json"],
};

function readRoutes(text, name, sex) {
  let data;
  try { data = JSON.parse(text); } catch { throw new Error(name + " 不是有效的 JSON。"); }
  const point = p => p && [p.x, p.y, p.z].every(Number.isFinite);
  const path = p => Array.isArray(p?.points) && p.points.length >= 2 && p.points.every(point);
  const orb = o => point(o?.position) && Number.isFinite(o.radius) && o.radius > 0;
  if (!Array.isArray(data?.meridians) || !data.meridians.length ||
      !data.meridians.every(p => path(p) && typeof p.baseId === "string") ||
      (data.vessels != null && !(Array.isArray(data.vessels) && data.vessels.every(path))) ||
      (data.dantians != null && !(Array.isArray(data.dantians) && data.dantians.every(orb))) ||
      (data.taiji != null && !orb(data.taiji))) throw new Error(name + " 中的经络结构无法读取。");
  if (data.sex && data.sex !== sex) throw new Error(name + " 的性别标记与文件名不符。");
  return data;
}

// 文件选择可分两次完成。仅在当前页保存引用，既不写磁盘，也不发 HTTP 请求。
export async function readTeachingFiles(files, organKeys) {
  const result = new Map();
  const missing = [];
  for (const [sex, [glb, routes]] of Object.entries(pairs)) {
    if (!files.has(glb) && !files.has(routes)) continue;
    if (!files.has(glb) || !files.has(routes)) {
      missing.push(files.has(glb) ? routes : glb);
      continue;
    }
    const model = files.get(glb), lines = files.get(routes);
    if (model.size > 40 * 1024 * 1024) throw new Error(glb + " 超出教学 GLB 的 40 MB 上限。");
    const [buffer, text] = await Promise.all([model.arrayBuffer(), lines.text()]);
    const header = validateEmbeddedGLB(buffer);
    if (!header.nodes?.some(n => typeof n.name === "string" && organKeys.some(k => n.name.startsWith("ORGAN_" + k)))) {
      throw new Error(glb + " 缺少教学模型的 ORGAN_* 器官结构。");
    }
    result.set(sex, { buffer, data: readRoutes(text, routes, sex) });
  }
  if (!result.size && missing.length) throw new Error("已保留所选文件，请再选择配套的 " + missing.join("、") + "。");
  if (!result.size) throw new Error("请选择原文件名的模型和经络文件，例如 anatomy_male.glb 与 meridians.json。");
  return result;
}
