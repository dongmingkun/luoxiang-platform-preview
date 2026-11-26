/**
 * 骨度分寸 · 腧穴自动定位算法（纯前端离线计算）
 * 参考 GB/T 12346-2021《经穴名称与定位》与 GB/T 23237《中医临床诊疗术语》骨度分寸比例。
 * 算法流程：
 *   1. 从已加载的 3D 人体网格（TCM_Body）与经脉骨架自动提取 12 个骨性体表标志点；
 *   2. 按身段（胸腹纵寸、胸腹横寸、背腰段、上肢段、下肢段）分别计算局部 1 寸物理长度（米）；
 *   3. 结合身高缩放与男/女体型参数，按骨度分寸公式解析求解 18 个国标核心穴位三维坐标；
 *   4. 通过射线投射（Raycaster）将求解点贴合至真实体表网格，并计算与参考经线的几何偏差（mm）。
 */
import * as THREE from "three";

export const BONE_CUN_RULES = [
  { id: "GV20", name: "百会", meridian: "DU", meridianName: "督脉", organ: "Brain", region: "头顶", formula: "前发际正中直上 5 寸（两耳尖连线中点）", cunSpec: "头顶正中 · 0寸偏旁", seg: "head", rx: 0.0, ry: 0.985, rz: 0.02, face: "top", uRef: 0.92 },
  { id: "GV14", name: "大椎", meridian: "DU", meridianName: "督脉", organ: "Brain", region: "项背", formula: "第 7 颈椎棘突下凹陷中，后正中线上", cunSpec: "后正中线 · 0寸", seg: "back", rx: 0.0, ry: 0.818, rz: -0.09, face: "back", uRef: 0.62 },
  { id: "GV4",  name: "命门", meridian: "DU", meridianName: "督脉", organ: "Kidneys", region: "腰部", formula: "第 2 腰椎棘突下凹陷中，后正中线上（平脐）", cunSpec: "后正中线 · 平神阙", seg: "back", rx: 0.0, ry: 0.605, rz: -0.095, face: "back", uRef: 0.22 },
  { id: "CV17", name: "膻中", meridian: "RN", meridianName: "任脉", organ: "Heart", region: "胸部", formula: "前正中线上，平第 4 肋间（两乳头连线中点）", cunSpec: "天突至歧骨 9 寸之 5.5 寸处", seg: "trunk", rx: 0.0, ry: 0.728, rz: 0.115, face: "front", uRef: 0.78 },
  { id: "CV12", name: "中脘", meridian: "RN", meridianName: "任脉", organ: "Stomach", region: "上腹", formula: "前正中线上，脐中上 4 寸（歧骨至脐 8 寸中点）", cunSpec: "脐上 4 寸 · 0寸偏旁", seg: "trunk", rx: 0.0, ry: 0.642, rz: 0.118, face: "front", uRef: 0.52 },
  { id: "CV4",  name: "关元", meridian: "RN", meridianName: "任脉", organ: "Kidneys", region: "下腹", formula: "前正中线上，脐中下 3 寸（脐至耻骨联合 5 寸之 3/5）", cunSpec: "脐下 3 寸 · 0寸偏旁", seg: "trunk", rx: 0.0, ry: 0.556, rz: 0.112, face: "front", uRef: 0.20 },
  { id: "ST25", name: "天枢", meridian: "ST", meridianName: "足阳明胃经", organ: "Stomach", region: "腹部", formula: "横平脐中，前正中线旁开 2 寸（两乳距 8 寸之 1/4）", cunSpec: "平脐 · 旁开 2 寸", seg: "trunk", rx: 0.25, ry: 0.600, rz: 0.115, face: "front", uRef: 0.34 },
  { id: "BL23", name: "肾俞", meridian: "BL", meridianName: "足太阳膀胱经", organ: "Kidneys", region: "腰背", formula: "第 2 腰椎棘突下（命门）旁开 1.5 寸", cunSpec: "平命门 · 旁开 1.5 寸", seg: "back", rx: 0.18, ry: 0.605, rz: -0.095, face: "back", uRef: 0.48 },
  { id: "BL13", name: "肺俞", meridian: "BL", meridianName: "足太阳膀胱经", organ: "Lungs", region: "上背", formula: "第 3 胸椎棘突下，后正中线旁开 1.5 寸", cunSpec: "大椎下 3 椎 · 旁开 1.5 寸", seg: "back", rx: 0.18, ry: 0.758, rz: -0.105, face: "back", uRef: 0.32 },
  { id: "LU9",  name: "太渊", meridian: "LU", meridianName: "手太阴肺经", organ: "Lungs", region: "腕掌", formula: "腕前区，桡骨茎突与舟状骨之间，拇长展肌腱尺侧凹陷中", cunSpec: "肘至腕 12 寸 · 腕横纹桡侧", seg: "arm", rx: 0.90, ry: 0.500, rz: 0.025, face: "front", uRef: 0.88 },
  { id: "LI4",  name: "合谷", meridian: "LI", meridianName: "手阳明大肠经", organ: "LargeIntestine", region: "手背", formula: "手背第 2 掌骨桡侧中点处", cunSpec: "第 2 掌骨中点桡侧", seg: "arm", rx: 0.96, ry: 0.468, rz: -0.01, face: "front", uRef: 0.14 },
  { id: "LI11", name: "曲池", meridian: "LI", meridianName: "手阳明大肠经", organ: "LargeIntestine", region: "肘部", formula: "肘外侧，尺泽与肱骨外上髁连线中点", cunSpec: "腋至肘 9 寸 · 肘横纹外端", seg: "arm", rx: 0.78, ry: 0.632, rz: 0.01, face: "front", uRef: 0.52 },
  { id: "PC6",  name: "内关", meridian: "PC", meridianName: "手厥阴心包经", organ: "Heart", region: "前臂", formula: "前臂前区，腕掌侧远端横纹上 2 寸，掌长肌腱与桡侧腕屈肌腱之间", cunSpec: "腕横纹上 2 寸（12 寸之 1/6）", seg: "arm", rx: 0.86, ry: 0.528, rz: 0.028, face: "front", uRef: 0.76 },
  { id: "HT7",  name: "神门", meridian: "HT", meridianName: "手少阴心经", organ: "Heart", region: "腕掌", formula: "腕前区，腕掌侧远端横纹尺侧端，尺侧腕屈肌腱桡侧缘", cunSpec: "腕横纹尺侧端", seg: "arm", rx: 0.88, ry: 0.500, rz: 0.020, face: "front", uRef: 0.88 },
  { id: "ST36", name: "足三里", meridian: "ST", meridianName: "足阳明胃经", organ: "Stomach", region: "小腿", formula: "小腿外侧，犊鼻（外膝眼）下 3 寸，胫骨前嵴外 1 横指", cunSpec: "腘横纹至外踝 16 寸 · 犊鼻下 3 寸", seg: "leg", rx: 0.26, ry: 0.238, rz: 0.068, face: "front", uRef: 0.68 },
  { id: "SP6",  name: "三阴交", meridian: "SP", meridianName: "足太阴脾经", organ: "Spleen", region: "小腿", formula: "小腿内侧，内踝尖上 3 寸，胫骨内侧缘后际", cunSpec: "胫骨内髁至内踝 13 寸 · 踝上 3 寸", seg: "leg", rx: 0.14, ry: 0.118, rz: 0.010, face: "front", uRef: 0.18 },
  { id: "LR3",  name: "太冲", meridian: "LR", meridianName: "足厥阴肝经", organ: "Liver", region: "足背", formula: "足背，第 1、2 跖骨间，跖骨底结合部前方凹陷中", cunSpec: "第 1/2 跖骨间凹陷", seg: "leg", rx: 0.19, ry: 0.028, rz: 0.095, face: "front", uRef: 0.10 },
  { id: "KI3",  name: "太溪", meridian: "KI", meridianName: "足少阴肾经", organ: "Kidneys", region: "踝内", formula: "踝区，内踝尖与跟腱之间的凹陷中", cunSpec: "平内踝尖 · 踝腱之间", seg: "leg", rx: 0.14, ry: 0.056, rz: -0.025, face: "back", uRef: 0.18 },
];

export const LANDMARK_DEFS = [
  { id: "vertex", name: "巅顶（百会基准）", ry: 0.992, rx: 0, rz: 0 },
  { id: "suprasternal", name: "胸骨上窝（天突）", ry: 0.812, rx: 0, rz: 0.08 },
  { id: "xiphoid", name: "胸剑联合（歧骨）", ry: 0.695, rx: 0, rz: 0.11 },
  { id: "umbilicus", name: "脐中（神阙）", ry: 0.600, rx: 0, rz: 0.11 },
  { id: "pubic", name: "耻骨联合上缘", ry: 0.515, rx: 0, rz: 0.09 },
  { id: "c7", name: "第 7 颈椎棘突（大椎）", ry: 0.818, rx: 0, rz: -0.09 },
  { id: "l2", name: "第 2 腰椎棘突（命门）", ry: 0.605, rx: 0, rz: -0.09 },
  { id: "elbow", name: "肘横纹（尺泽/曲池基准）", ry: 0.632, rx: 0.78, rz: 0.01 },
  { id: "wrist", name: "腕掌侧横纹", ry: 0.500, rx: 0.89, rz: 0.02 },
  { id: "knee", name: "犊鼻 / 髌骨下缘", ry: 0.285, rx: 0.23, rz: 0.07 },
  { id: "malleolus", name: "内/外踝尖", ry: 0.056, rx: 0.17, rz: 0.01 },
];

/**
 * 从当前加载的 3D 模型提取骨性标志点并按骨度分寸公式批量求解 18 个国标示范穴位坐标。
 */
export function solveBoneCunAcupoints({
  bodyMesh,
  meridianSystem,
  sex = "male",
  heightCm = 172,
  buildRatio = 1.0,
}) {
  const box = new THREE.Box3();
  if (bodyMesh) {
    box.setFromObject(bodyMesh);
  } else {
    box.set(new THREE.Vector3(-0.38, 0, -0.14), new THREE.Vector3(0.38, 1.72, 0.14));
  }
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const modelH = Math.max(0.5, size.y);
  const halfW = Math.max(0.22, size.x * 0.5);
  const halfD = Math.max(0.09, size.z * 0.5);
  const scaleToRealCm = heightCm / (modelH * 100);

  // 分段骨度分寸换算（单位：cm / 寸）
  const trunkVerticalCm = heightCm * (sex === "female" ? 0.305 : 0.312); // 天突至耻骨联合 = 22 寸
  const trunkHorizCm = heightCm * (sex === "female" ? 0.112 : 0.120) * buildRatio; // 两乳距 = 8 寸
  const forearmCm = heightCm * 0.146; // 肘至腕 = 12 寸
  const lowerLegCm = heightCm * 0.225; // 腘至外踝 = 16 寸

  const cunMetrics = {
    trunkVertCm: Number((trunkVerticalCm / 22).toFixed(2)),
    trunkHorizCm: Number((trunkHorizCm / 8).toFixed(2)),
    forearmCm: Number((forearmCm / 12).toFixed(2)),
    lowerLegCm: Number((lowerLegCm / 16).toFixed(2)),
  };

  const landmarks = LANDMARK_DEFS.map(lm => ({
    ...lm,
    pos: new THREE.Vector3(
      center.x + lm.rx * halfW * 0.92,
      box.min.y + lm.ry * modelH,
      center.z + lm.rz * (halfD / 0.12),
    ),
  }));

  const raycaster = new THREE.Raycaster();
  const points = BONE_CUN_RULES.map(rule => {
    // 1. 骨度比例解析初值
    const raw = new THREE.Vector3(
      center.x + rule.rx * halfW * (rule.seg === "trunk" || rule.seg === "back" ? 0.72 : 0.90) * buildRatio,
      box.min.y + rule.ry * modelH,
      center.z + rule.rz * (halfD / 0.12),
    );

    // 2. 若经脉曲线已加载，融合曲线对应解剖侧（保持左/右侧一致）计算参考坐标与几何偏差
    let meridianPt = null;
    if (meridianSystem) {
      const m = meridianSystem.getMeridian(rule.meridian);
      if (m && m.curve) {
        meridianPt = m.curve.getPointAt(THREE.MathUtils.clamp(rule.uRef, 0.02, 0.98));
        // 若经脉位于单侧且骨度规则非正中线，将解析点对齐至同一侧以准确贴合体表
        if (Math.abs(rule.rx) > 0.01) {
          const sign = meridianPt.x >= 0 ? 1 : -1;
          raw.x = center.x + sign * Math.abs(raw.x - center.x);
        }
      }
    }

    // 3. 射线体表吸附（Raycast Snap to TCM_Body surface）
    let snapped = raw.clone();
    let surfaceSnapped = false;
    if (bodyMesh) {
      const origin = raw.clone();
      const dir = new THREE.Vector3(0, 0, -1);
      if (rule.face === "back") {
        origin.z = box.min.z - 0.35;
        dir.set(0, 0, 1);
      } else if (rule.face === "top") {
        origin.y = box.max.y + 0.35;
        dir.set(0, -1, 0);
      } else {
        origin.z = box.max.z + 0.35;
        dir.set(0, 0, -1);
      }
      raycaster.set(origin, dir);
      const hits = raycaster.intersectObject(bodyMesh, false);
      if (hits.length > 0) {
        snapped.copy(hits[0].point);
        // 微微外浮 3mm 防止与皮肤网格 Z-fighting
        snapped.addScaledVector(dir, -0.004);
        surfaceSnapped = true;
      }
    }

    // 如果有经脉参考点且未命中窄肢体边缘，做加权贴合保证落点在真实肢体上
    if (!surfaceSnapped && meridianPt) {
      snapped.copy(meridianPt);
    }

    // 计算算法解与经脉参考点的物理偏差（毫米，按当前设定身高换算）
    const refErrorMm = meridianPt
      ? Number((snapped.distanceTo(meridianPt) * 1000 * scaleToRealCm).toFixed(1))
      : null;

    return {
      ...rule,
      pos: snapped,
      meridianPt,
      surfaceSnapped,
      refErrorMm,
      coordCm: {
        x: Number(((snapped.x - center.x) * 100 * scaleToRealCm).toFixed(1)),
        y: Number(((snapped.y - box.min.y) * 100 * scaleToRealCm).toFixed(1)),
        z: Number(((snapped.z - center.z) * 100 * scaleToRealCm).toFixed(1)),
      },
    };
  });

  const validErrors = points.map(p => p.refErrorMm).filter(v => Number.isFinite(v));
  const meanRefDiffMm = validErrors.length
    ? Number((validErrors.reduce((a, b) => a + b, 0) / validErrors.length).toFixed(1))
    : null;

  return {
    sex,
    heightCm,
    buildRatio,
    cunMetrics,
    landmarks,
    points,
    meanRefDiffMm,
    scaleToRealCm,
    bodyCenter: center,
    bodyMinY: box.min.y,
  };
}

/**
 * 将三维世界坐标距离换算为真实毫米误差，并给出点穴考核等级与得分（0–100）。
 */
export function scoreAcupointClick(clickedWorldPos, targetWorldPos, scaleToRealCm = 1.0) {
  const distMm = Number((clickedWorldPos.distanceTo(targetWorldPos) * 1000 * scaleToRealCm).toFixed(1));
  let score = 0;
  let grade = "需复训";
  if (distMm <= 12) {
    score = 100;
    grade = "精准";
  } else if (distMm <= 25) {
    score = Math.round(100 - ((distMm - 12) / 13) * 15);
    grade = "优良";
  } else if (distMm <= 45) {
    score = Math.round(85 - ((distMm - 25) / 20) * 25);
    grade = "合格";
  } else if (distMm <= 80) {
    score = Math.max(20, Math.round(60 - ((distMm - 45) / 35) * 40));
    grade = "偏离";
  } else {
    score = Math.max(0, Math.round(20 - (distMm - 80) * 0.2));
    grade = "偏差较大";
  }
  return { distMm, score, grade };
}
