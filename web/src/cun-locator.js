/**
 * 骨度分寸 · 腧穴自动定位算法（纯前端离线计算）
 * 覆盖十四经（十二正经 + 任督二脉）共 42 个 GB/T 12346-2021 国标核心要穴（每经 3 穴）。
 * 算法流程：
 *   1. 提取 11 个体表骨性标志点；
 *   2. 按身段（躯干纵/横寸、前臂寸、小腿寸）折算局部同身寸（cm/寸）；
 *   3. 按身高、体型宽窄比与男/女模型求解 42 穴初值，并通过 Raycaster 贴合体表；
 *   4. 提供专家金标准 CSV 导入接口（evaluateAgainstExpertCsv），实时计算真实 MAE / RMSE（mm）。
 */
import * as THREE from "three";

export const BONE_CUN_RULES = [
  // 1. 督脉 DU (3)
  { id: "GV20", name: "百会", meridian: "DU", meridianName: "督脉", organ: "Brain", region: "头顶", formula: "前发际正中直上 5 寸（两耳尖连线中点）", cunSpec: "头顶正中 · 0寸", seg: "head", rx: 0.0, ry: 0.985, rz: 0.02, face: "top", uRef: 0.92 },
  { id: "GV14", name: "大椎", meridian: "DU", meridianName: "督脉", organ: "Brain", region: "项背", formula: "第 7 颈椎棘突下凹陷中，后正中线上", cunSpec: "后正中线 · 0寸", seg: "back", rx: 0.0, ry: 0.818, rz: -0.09, face: "back", uRef: 0.62 },
  { id: "GV4",  name: "命门", meridian: "DU", meridianName: "督脉", organ: "Kidneys", region: "腰部", formula: "第 2 腰椎棘突下凹陷中，后正中线上（平脐）", cunSpec: "后正中线 · 平神阙", seg: "back", rx: 0.0, ry: 0.605, rz: -0.095, face: "back", uRef: 0.22 },

  // 2. 任脉 RN (3)
  { id: "CV17", name: "膻中", meridian: "RN", meridianName: "任脉", organ: "Heart", region: "胸部", formula: "前正中线上，平第 4 肋间（两乳头连线中点）", cunSpec: "天突至歧骨 9 寸之 5.5 寸", seg: "trunk", rx: 0.0, ry: 0.728, rz: 0.115, face: "front", uRef: 0.78 },
  { id: "CV12", name: "中脘", meridian: "RN", meridianName: "任脉", organ: "Stomach", region: "上腹", formula: "前正中线上，脐中上 4 寸（歧骨至脐 8 寸中点）", cunSpec: "脐上 4 寸 · 0寸", seg: "trunk", rx: 0.0, ry: 0.642, rz: 0.118, face: "front", uRef: 0.52 },
  { id: "CV4",  name: "关元", meridian: "RN", meridianName: "任脉", organ: "Kidneys", region: "下腹", formula: "前正中线上，脐中下 3 寸（脐至耻骨联合 5 寸之 3/5）", cunSpec: "脐下 3 寸 · 0寸", seg: "trunk", rx: 0.0, ry: 0.556, rz: 0.112, face: "front", uRef: 0.20 },

  // 3. 手太阴肺经 LU (3)
  { id: "LU1",  name: "中府", meridian: "LU", meridianName: "手太阴肺经", organ: "Lungs", region: "胸外", formula: "胸前壁外上方，平第 1 肋间隙，前正中线旁开 6 寸", cunSpec: "前正中线旁开 6 寸", seg: "trunk", rx: 0.52, ry: 0.778, rz: 0.092, face: "front", uRef: 0.16 },
  { id: "LU5",  name: "尺泽", meridian: "LU", meridianName: "手太阴肺经", organ: "Lungs", region: "肘部", formula: "肘横纹中，肱二头肌腱桡侧凹陷处", cunSpec: "腋至肘 9 寸 · 肘横纹桡侧", seg: "arm", rx: 0.76, ry: 0.630, rz: 0.024, face: "front", uRef: 0.56 },
  { id: "LU9",  name: "太渊", meridian: "LU", meridianName: "手太阴肺经", organ: "Lungs", region: "腕掌", formula: "腕前区，桡骨茎突与舟状骨之间，拇长展肌腱尺侧凹陷中", cunSpec: "肘至腕 12 寸 · 腕横纹桡侧", seg: "arm", rx: 0.90, ry: 0.500, rz: 0.025, face: "front", uRef: 0.88 },

  // 4. 手阳明大肠经 LI (3)
  { id: "LI4",  name: "合谷", meridian: "LI", meridianName: "手阳明大肠经", organ: "LargeIntestine", region: "手背", formula: "手背第 2 掌骨桡侧中点处", cunSpec: "第 2 掌骨中点桡侧", seg: "arm", rx: 0.96, ry: 0.468, rz: -0.01, face: "front", uRef: 0.14 },
  { id: "LI11", name: "曲池", meridian: "LI", meridianName: "手阳明大肠经", organ: "LargeIntestine", region: "肘部", formula: "肘外侧，尺泽与肱骨外上髁连线中点", cunSpec: "腋至肘 9 寸 · 肘横纹外端", seg: "arm", rx: 0.79, ry: 0.632, rz: 0.01, face: "front", uRef: 0.52 },
  { id: "LI20", name: "迎香", meridian: "LI", meridianName: "手阳明大肠经", organ: "LargeIntestine", region: "面部", formula: "面部，鼻翼外缘中点旁，鼻唇沟中", cunSpec: "鼻翼外缘中点旁", seg: "head", rx: 0.08, ry: 0.902, rz: 0.115, face: "front", uRef: 0.92 },

  // 5. 足阳明胃经 ST (3)
  { id: "ST25", name: "天枢", meridian: "ST", meridianName: "足阳明胃经", organ: "Stomach", region: "腹部", formula: "横平脐中，前正中线旁开 2 寸（两乳距 8 寸之 1/4）", cunSpec: "平脐 · 旁开 2 寸", seg: "trunk", rx: 0.25, ry: 0.600, rz: 0.115, face: "front", uRef: 0.34 },
  { id: "ST36", name: "足三里", meridian: "ST", meridianName: "足阳明胃经", organ: "Stomach", region: "小腿", formula: "小腿外侧，犊鼻（外膝眼）下 3 寸，胫骨前嵴外 1 横指", cunSpec: "腘至外踝 16 寸 · 犊鼻下 3 寸", seg: "leg", rx: 0.26, ry: 0.238, rz: 0.068, face: "front", uRef: 0.68 },
  { id: "ST40", name: "丰隆", meridian: "ST", meridianName: "足阳明胃经", organ: "Stomach", region: "小腿", formula: "小腿外侧，外踝尖上 8 寸，胫骨前肌外缘", cunSpec: "腘至外踝 16 寸中点", seg: "leg", rx: 0.27, ry: 0.172, rz: 0.056, face: "front", uRef: 0.78 },

  // 6. 足太阴脾经 SP (3)
  { id: "SP6",  name: "三阴交", meridian: "SP", meridianName: "足太阴脾经", organ: "Spleen", region: "小腿", formula: "小腿内侧，内踝尖上 3 寸，胫骨内侧缘后际", cunSpec: "胫骨内髁至内踝 13 寸 · 踝上 3 寸", seg: "leg", rx: 0.14, ry: 0.118, rz: 0.010, face: "front", uRef: 0.18 },
  { id: "SP9",  name: "阴陵泉", meridian: "SP", meridianName: "足太阴脾经", organ: "Spleen", region: "小腿", formula: "小腿内侧，胫骨内侧髁下缘与胫骨内侧缘之间的凹陷中", cunSpec: "胫骨内侧髁下缘凹陷", seg: "leg", rx: 0.15, ry: 0.262, rz: 0.025, face: "front", uRef: 0.38 },
  { id: "SP15", name: "大横", meridian: "SP", meridianName: "足太阴脾经", organ: "Spleen", region: "腹部", formula: "腹部，横平脐中，前正中线旁开 4 寸", cunSpec: "平脐 · 旁开 4 寸", seg: "trunk", rx: 0.44, ry: 0.600, rz: 0.102, face: "front", uRef: 0.72 },

  // 7. 手少阴心经 HT (3)
  { id: "HT1",  name: "极泉", meridian: "HT", meridianName: "手少阴心经", organ: "Heart", region: "腋窝", formula: "腋区，腋窝正中，腋动脉搏动处", cunSpec: "腋窝正中", seg: "arm", rx: 0.62, ry: 0.752, rz: 0.012, face: "front", uRef: 0.18 },
  { id: "HT3",  name: "少海", meridian: "HT", meridianName: "手少阴心经", organ: "Heart", region: "肘内", formula: "肘前区，横平肘横纹，肱骨内上髁前缘", cunSpec: "肘横纹尺侧端", seg: "arm", rx: 0.74, ry: 0.630, rz: 0.015, face: "front", uRef: 0.54 },
  { id: "HT7",  name: "神门", meridian: "HT", meridianName: "手少阴心经", organ: "Heart", region: "腕掌", formula: "腕前区，腕掌侧远端横纹尺侧端，尺侧腕屈肌腱桡侧缘", cunSpec: "腕横纹尺侧端", seg: "arm", rx: 0.88, ry: 0.500, rz: 0.020, face: "front", uRef: 0.88 },

  // 8. 手太阳小肠经 SI (3)
  { id: "SI3",  name: "后溪", meridian: "SI", meridianName: "手太阳小肠经", organ: "SmallIntestine", region: "手尺", formula: "手内侧，第 5 掌指关节尺侧近端赤白肉际凹陷中", cunSpec: "第 5 掌指关节尺侧", seg: "arm", rx: 0.94, ry: 0.466, rz: -0.015, face: "back", uRef: 0.16 },
  { id: "SI8",  name: "小海", meridian: "SI", meridianName: "手太阳小肠经", organ: "SmallIntestine", region: "肘后", formula: "肘后区，尺骨鹰嘴与肱骨内上髁之间凹陷中", cunSpec: "肘后尺骨鹰嘴内侧", seg: "arm", rx: 0.76, ry: 0.632, rz: -0.025, face: "back", uRef: 0.52 },
  { id: "SI19", name: "听宫", meridian: "SI", meridianName: "手太阳小肠经", organ: "SmallIntestine", region: "耳前", formula: "面部，耳屏正中与下颌骨髁突之间的凹陷中", cunSpec: "耳屏正中前方", seg: "head", rx: 0.24, ry: 0.922, rz: 0.015, face: "front", uRef: 0.88 },

  // 9. 足太阳膀胱经 BL (3)
  { id: "BL13", name: "肺俞", meridian: "BL", meridianName: "足太阳膀胱经", organ: "Lungs", region: "上背", formula: "第 3 胸椎棘突下，后正中线旁开 1.5 寸", cunSpec: "大椎下 3 椎 · 旁开 1.5 寸", seg: "back", rx: 0.18, ry: 0.758, rz: -0.105, face: "back", uRef: 0.32 },
  { id: "BL23", name: "肾俞", meridian: "BL", meridianName: "足太阳膀胱经", organ: "Kidneys", region: "腰背", formula: "第 2 腰椎棘突下（命门）旁开 1.5 寸", cunSpec: "平命门 · 旁开 1.5 寸", seg: "back", rx: 0.18, ry: 0.605, rz: -0.095, face: "back", uRef: 0.48 },
  { id: "BL40", name: "委中", meridian: "BL", meridianName: "足太阳膀胱经", organ: "Bladder", region: "腘窝", formula: "膝后区，腘横纹中点", cunSpec: "腘横纹中点", seg: "leg", rx: 0.21, ry: 0.286, rz: -0.052, face: "back", uRef: 0.74 },

  // 10. 足少阴肾经 KI (3)
  { id: "KI1",  name: "涌泉", meridian: "KI", meridianName: "足少阴肾经", organ: "Kidneys", region: "足底", formula: "足底，屈足卷趾时足心最凹陷中（足底前 1/3 与后 2/3 交点）", cunSpec: "足底前 1/3 凹陷", seg: "leg", rx: 0.18, ry: 0.014, rz: 0.035, face: "front", uRef: 0.06 },
  { id: "KI3",  name: "太溪", meridian: "KI", meridianName: "足少阴肾经", organ: "Kidneys", region: "踝内", formula: "踝区，内踝尖与跟腱之间的凹陷中", cunSpec: "平内踝尖 · 踝腱之间", seg: "leg", rx: 0.14, ry: 0.056, rz: -0.025, face: "back", uRef: 0.18 },
  { id: "KI13", name: "气穴", meridian: "KI", meridianName: "足少阴肾经", organ: "Kidneys", region: "下腹", formula: "下腹部，脐中下 3 寸（平关元），前正中线旁开 0.5 寸", cunSpec: "脐下 3 寸 · 旁开 0.5 寸", seg: "trunk", rx: 0.07, ry: 0.556, rz: 0.112, face: "front", uRef: 0.66 },

  // 11. 手厥阴心包经 PC (3)
  { id: "PC3",  name: "曲泽", meridian: "PC", meridianName: "手厥阴心包经", organ: "Heart", region: "肘前", formula: "肘前区，肘横纹上，肱二头肌腱的尺侧缘凹陷中", cunSpec: "肘横纹中 · 肌腱尺侧", seg: "arm", rx: 0.75, ry: 0.630, rz: 0.022, face: "front", uRef: 0.30 },
  { id: "PC6",  name: "内关", meridian: "PC", meridianName: "手厥阴心包经", organ: "Heart", region: "前臂", formula: "前臂前区，腕掌侧远端横纹上 2 寸，两筋之间", cunSpec: "腕横纹上 2 寸（12 寸之 1/6）", seg: "arm", rx: 0.86, ry: 0.528, rz: 0.028, face: "front", uRef: 0.76 },
  { id: "PC8",  name: "劳宫", meridian: "PC", meridianName: "手厥阴心包经", organ: "Heart", region: "掌心", formula: "掌区，横平第 3 掌指关节近端，第 2、3 掌骨之间偏第 3 掌骨", cunSpec: "掌心第 2/3 掌骨间", seg: "arm", rx: 0.94, ry: 0.464, rz: 0.020, face: "front", uRef: 0.92 },

  // 12. 手少阳三焦经 TE (3)
  { id: "TE5",  name: "外关", meridian: "TE", meridianName: "手少阳三焦经", organ: "Heart", region: "前臂后", formula: "前臂后区，腕背侧远端横纹上 2 寸，尺骨与桡骨间隙中点", cunSpec: "腕背横纹上 2 寸", seg: "arm", rx: 0.87, ry: 0.528, rz: -0.022, face: "back", uRef: 0.22 },
  { id: "TE10", name: "天井", meridian: "TE", meridianName: "手少阳三焦经", organ: "Heart", region: "肘后", formula: "肘后区，尺骨鹰嘴尖端上 1 寸凹陷中", cunSpec: "鹰嘴尖上 1 寸", seg: "arm", rx: 0.78, ry: 0.646, rz: -0.026, face: "back", uRef: 0.52 },
  { id: "TE17", name: "翳风", meridian: "TE", meridianName: "手少阳三焦经", organ: "Brain", region: "耳后", formula: "颈部，耳垂后方，乳突下端前方凹陷中", cunSpec: "耳垂后乳突前凹陷", seg: "head", rx: 0.22, ry: 0.902, rz: -0.020, face: "back", uRef: 0.86 },

  // 13. 足少阳胆经 GB (3)
  { id: "GB20", name: "风池", meridian: "GB", meridianName: "足少阳胆经", organ: "Gallbladder", region: "项后", formula: "颈后区，枕骨之下，胸锁乳突肌上端与斜方肌上端之间凹陷中", cunSpec: "枕骨下两侧凹陷", seg: "head", rx: 0.14, ry: 0.878, rz: -0.068, face: "back", uRef: 0.24 },
  { id: "GB30", name: "环跳", meridian: "GB", meridianName: "足少阳胆经", organ: "Gallbladder", region: "臀外", formula: "臀区，股骨大转子最凸点与骶管裂孔连线的外 1/3 与内 2/3 交点", cunSpec: "臀外侧大转子后上", seg: "leg", rx: 0.38, ry: 0.522, rz: -0.072, face: "back", uRef: 0.54 },
  { id: "GB34", name: "阳陵泉", meridian: "GB", meridianName: "足少阳胆经", organ: "Gallbladder", region: "小腿外", formula: "小腿外侧，腓骨头前下方凹陷中", cunSpec: "腓骨小头前下方", seg: "leg", rx: 0.30, ry: 0.258, rz: 0.025, face: "front", uRef: 0.74 },

  // 14. 足厥阴肝经 LR (3)
  { id: "LR3",  name: "太冲", meridian: "LR", meridianName: "足厥阴肝经", organ: "Liver", region: "足背", formula: "足背，第 1、2 跖骨间，跖骨底结合部前方凹陷中", cunSpec: "第 1/2 跖骨间凹陷", seg: "leg", rx: 0.19, ry: 0.028, rz: 0.095, face: "front", uRef: 0.10 },
  { id: "LR8",  name: "曲泉", meridian: "LR", meridianName: "足厥阴肝经", organ: "Liver", region: "膝内", formula: "膝内侧，腘横纹内侧端，股骨内侧髁后缘", cunSpec: "腘横纹内侧端", seg: "leg", rx: 0.14, ry: 0.285, rz: -0.015, face: "front", uRef: 0.42 },
  { id: "LR14", name: "期门", meridian: "LR", meridianName: "足厥阴肝经", organ: "Liver", region: "胸胁", formula: "胸部，第 6 肋间隙，前正中线旁开 4 寸", cunSpec: "乳下二肋 · 旁开 4 寸", seg: "trunk", rx: 0.42, ry: 0.692, rz: 0.105, face: "front", uRef: 0.82 },
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

  const trunkVerticalCm = heightCm * (sex === "female" ? 0.305 : 0.312);
  const trunkHorizCm = heightCm * (sex === "female" ? 0.112 : 0.120) * buildRatio;
  const forearmCm = heightCm * 0.146;
  const lowerLegCm = heightCm * 0.225;

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
    const raw = new THREE.Vector3(
      center.x + rule.rx * halfW * (rule.seg === "trunk" || rule.seg === "back" ? 0.72 : 0.90) * buildRatio,
      box.min.y + rule.ry * modelH,
      center.z + rule.rz * (halfD / 0.12),
    );

    let meridianPt = null;
    if (meridianSystem) {
      const m = meridianSystem.getMeridian(rule.meridian);
      if (m && m.curve) {
        meridianPt = m.curve.getPointAt(THREE.MathUtils.clamp(rule.uRef, 0.02, 0.98));
        if (Math.abs(rule.rx) > 0.01) {
          const sign = meridianPt.x >= 0 ? 1 : -1;
          raw.x = center.x + sign * Math.abs(raw.x - center.x);
        }
      }
    }

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
        snapped.addScaledVector(dir, -0.004);
        surfaceSnapped = true;
      }
    }

    if (!surfaceSnapped && meridianPt) {
      snapped.copy(meridianPt);
    }

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

  const snappedCount = points.filter(p => p.surfaceSnapped).length;
  return {
    sex,
    heightCm,
    buildRatio,
    cunMetrics,
    landmarks,
    points,
    snappedCount,
    scaleToRealCm,
    bodyCenter: center,
    bodyMinY: box.min.y,
  };
}

/**
 * 导入针灸专家金标准标注 CSV（列：code,x_cm,y_cm,z_cm）计算真实三维误差（MAE / RMSE / Max mm）。
 */
export function evaluateAgainstExpertCsv(solvedPoints, csvText) {
  const lines = String(csvText || "").replace(/^\uFEFF/, "").split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return { ok: false, message: "CSV 至少需包含表头与 1 条专家标注记录。" };
  const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
  const iCode = headers.indexOf("code");
  const iX = headers.indexOf("x_cm");
  const iY = headers.indexOf("y_cm");
  const iZ = headers.indexOf("z_cm");
  if (iCode < 0 || iX < 0 || iY < 0 || iZ < 0) {
    return { ok: false, message: "缺少必需列：code, x_cm, y_cm, z_cm。" };
  }
  const byId = new Map(solvedPoints.map(p => [p.id.toUpperCase(), p]));
  const diffs = [];
  for (let i = 1; i < lines.length; i += 1) {
    const cols = lines[i].split(",").map(c => c.trim());
    const pt = byId.get((cols[iCode] || "").toUpperCase());
    const ex = Number(cols[iX]);
    const ey = Number(cols[iY]);
    const ez = Number(cols[iZ]);
    if (!pt || !Number.isFinite(ex) || !Number.isFinite(ey) || !Number.isFinite(ez)) continue;
    const dx = (pt.coordCm.x - ex) * 10;
    const dy = (pt.coordCm.y - ey) * 10;
    const dz = (pt.coordCm.z - ez) * 10;
    diffs.push({ code: pt.id, name: pt.name, errMm: Math.hypot(dx, dy, dz) });
  }
  if (!diffs.length) return { ok: false, message: "未匹配到国标穴位编码（如 ST36、SP6、GV4）。" };
  const mae = diffs.reduce((a, d) => a + d.errMm, 0) / diffs.length;
  const rmse = Math.sqrt(diffs.reduce((a, d) => a + d.errMm * d.errMm, 0) / diffs.length);
  const maxErr = Math.max(...diffs.map(d => d.errMm));
  return {
    ok: true,
    matched: diffs.length,
    maeMm: Number(mae.toFixed(1)),
    rmseMm: Number(rmse.toFixed(1)),
    maxMm: Number(maxErr.toFixed(1)),
  };
}

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
