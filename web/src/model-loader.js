import { integratedLink, isPlatformPages, readTeachingFiles } from "./model-files.js";
import { ORGAN_META } from "./knowledge.js?v=20261107defense";
import { TCMScene3D } from "./scene3d.js?v=20261127load";

// 在本机预览、独立静态部署与浏览器文件选择之间共用就绪状态。
export function startModelLoader({ wrap, labels, loading, text, onReady }) {
  const actions = document.getElementById("model-actions");
  const input = document.getElementById("teaching-files");
  const pick = document.getElementById("pick-teaching-files");
  const retry = document.getElementById("retry-model");
  const local = document.getElementById("open-integrated");
  const badge = document.getElementById("stage-ready");
  const files = new Map();
  const scene = new TCMScene3D(wrap, labels, text);
  let busy = false, finished = false;
  local.href = integratedLink("index.html");
  local.hidden = location.origin === new URL(local.href).origin;
  retry.hidden = isPlatformPages;
  function state(name, message) {
    loading.dataset.modelState = name;
    text.textContent = message;
    actions.hidden = name !== "waiting";
    loading.querySelector(".loading-ring").hidden = name !== "loading";
    badge?.replaceChildren(document.createElement("i"), document.createTextNode({
      loading: "正在载入模型", waiting: "等待选择模型", ready: "本机模型已就绪",
    }[name]));
    badge?.classList.toggle("is-ready", name === "ready");
  }
  async function load(useFiles) {
    if (busy || finished) return;
    busy = true;
    state("loading", "正在读取教学模型…");
    try {
      scene.localModels = useFiles ? await readTeachingFiles(files, Object.keys(ORGAN_META)) : null;
      scene.sex = scene.localModels?.keys().next().value || "male";
      await scene.init();
      onReady(scene);
      finished = true;
      state("ready", "模型已就绪");
      loading.classList.add("is-hidden");
      setTimeout(() => loading.remove(), 500);
    } catch (error) {
      const message = useFiles ? (error?.message || "文件无法解析，请重新选择。")
        : /webgl/i.test(error?.message || "") ? "浏览器无法创建 WebGL 画布，请启用硬件加速后重试。"
        : "本站模型未能载入。可重试，或选择本机教学文件。";
      state("waiting", message);
    } finally { busy = false; }
  }
  pick.addEventListener("click", () => input.click());
  retry.addEventListener("click", () => load(false));
  input.addEventListener("change", () => {
    if (!input.files?.length || busy) return;
    for (const file of input.files) files.set(file.name.toLowerCase(), file);
    input.value = "";
    load(true);
  });
  if (isPlatformPages) state("waiting", "选择本机模型与同一性别的经络文件，即可开始教学。");
  else load(false);
}
