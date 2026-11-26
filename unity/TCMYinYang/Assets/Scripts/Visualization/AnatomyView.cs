using System;
using System.Collections.Generic;
using TCM.Core;
using UnityEngine;

namespace TCM.Visualization
{
    /// <summary>
    /// Loads TCM_Anatomy.fbx (organs + skeleton) under the same normalized
    /// container as the skin, assigns TCM organ colors and animates the organs.
    /// </summary>
    public class AnatomyView : MonoBehaviour
    {
        private class OrganVisual
        {
            public string Key;
            public Renderer Renderer;
            public Material Material;
            public Transform Transform;
            public Vector3 BaseScale;
            public Color BaseColor;
            public float Phase;
        }

        private static readonly int ColorId = Shader.PropertyToID("_Color");
        private static readonly int RimColorId = Shader.PropertyToID("_RimColor");
        private static readonly int IntensityId = Shader.PropertyToID("_Intensity");
        private static readonly int AlphaId = Shader.PropertyToID("_Alpha");
        private static readonly int BlockageId = Shader.PropertyToID("_Blockage");
        private static readonly int PulseSpeedId = Shader.PropertyToID("_PulseSpeed");
        private static readonly int VeinStrengthId = Shader.PropertyToID("_VeinStrength");

        public static readonly string[] ZangKeys = { "Heart", "Liver", "Spleen", "Lungs", "Kidneys" };

        private static readonly Dictionary<string, Color> OrganColors = new Dictionary<string, Color>
        {
            { "Heart", new Color(1.00f, 0.25f, 0.18f) },
            { "Lungs", new Color(0.82f, 0.93f, 1.00f) },
            { "Liver", new Color(0.30f, 0.90f, 0.48f) },
            { "Spleen", new Color(1.00f, 0.72f, 0.30f) },
            { "Kidneys", new Color(0.22f, 0.60f, 1.00f) },
            { "Stomach", new Color(1.00f, 0.56f, 0.22f) },
            { "SmallIntestine", new Color(1.00f, 0.48f, 0.55f) },
            { "LargeIntestine", new Color(0.92f, 0.42f, 0.50f) },
            { "Gallbladder", new Color(0.24f, 0.78f, 0.52f) },
            { "Bladder", new Color(0.32f, 0.72f, 1.00f) },
            { "Pancreas", new Color(0.96f, 0.78f, 0.50f) },
            { "Brain", new Color(0.82f, 0.78f, 1.00f) },
            { "Trachea", new Color(0.88f, 0.96f, 1.00f) },
            { "Airways", new Color(0.75f, 0.90f, 1.00f) },
        };

        private static readonly Dictionary<string, string> ChineseNames = new Dictionary<string, string>
        {
            { "Heart", "心" }, { "Lungs", "肺" }, { "Liver", "肝" },
            { "Spleen", "脾" }, { "Kidneys", "肾" }, { "Stomach", "胃" },
            { "SmallIntestine", "小肠" }, { "LargeIntestine", "大肠" },
            { "Gallbladder", "胆" }, { "Bladder", "膀胱" }, { "Pancreas", "胰" },
            { "Brain", "脑" }, { "Trachea", "气管" }, { "Airways", "支气管" },
        };

        private readonly List<OrganVisual> _organs = new List<OrganVisual>();
        private readonly List<Renderer> _boneRenderers = new List<Renderer>();
        private Material _boneMaterial;
        private Transform _root;
        private bool _organsVisible = true;
        private bool _bonesVisible = true;

        public int OrganCount => _organs.Count;
        public bool OrgansVisible => _organsVisible;
        public bool BonesVisible => _bonesVisible;

        public static Color ColorFor(string key)
        {
            return OrganColors.TryGetValue(key, out Color color) ? color : new Color(0.8f, 0.8f, 0.8f);
        }

        public static string ChineseName(string key)
        {
            return ChineseNames.TryGetValue(key, out string name) ? name : key;
        }

        public void Build(Transform container, Material organBaseMaterial, Material boneBaseMaterial)
        {
            if (container == null)
                return;

            GameObject asset = Resources.Load<GameObject>("Models/TCM_Anatomy");
            if (asset == null)
            {
                Debug.LogWarning("[TCM] 未找到 Resources/Models/TCM_Anatomy.fbx，器官/骨骼不可见。");
                return;
            }

            GameObject instance = Instantiate(asset, container);
            instance.name = "TCM_Anatomy";
            _root = instance.transform;

            _boneMaterial = boneBaseMaterial != null ? new Material(boneBaseMaterial) : null;
            if (_boneMaterial != null)
            {
                _boneMaterial.name = "MAT_Bone_Runtime";
                _boneMaterial.SetColor(ColorId, new Color(0.92f, 0.88f, 0.76f));
                _boneMaterial.SetColor(RimColorId, new Color(0.72f, 0.86f, 1.0f));
                _boneMaterial.SetFloat(IntensityId, 0.55f);
                _boneMaterial.SetFloat(AlphaId, 0.78f);
                _boneMaterial.SetFloat(VeinStrengthId, 0.04f);
            }

            foreach (Renderer renderer in instance.GetComponentsInChildren<Renderer>(true))
            {
                string key = ExtractKey(renderer.gameObject.name);
                if (key == null)
                    continue;

                renderer.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
                renderer.receiveShadows = false;

                if (key == "Skeleton")
                {
                    if (_boneMaterial != null)
                        renderer.sharedMaterial = _boneMaterial;
                    _boneRenderers.Add(renderer);
                    continue;
                }

                Color color = ColorFor(key);
                Material material = organBaseMaterial != null ? new Material(organBaseMaterial) : null;
                if (material == null)
                    continue;
                material.name = $"MAT_ORGAN_{key}_Runtime";
                material.SetColor(ColorId, color);
                material.SetColor(RimColorId, Color.Lerp(color, Color.white, 0.35f));
                material.SetFloat(IntensityId, 0.85f);
                material.SetFloat(AlphaId, key == "Lungs" || key == "Airways" ? 0.72f : 0.95f);
                material.SetFloat(BlockageId, 0f);
                material.SetFloat(PulseSpeedId, key == "Heart" ? 2.0f : 1.0f);
                material.SetFloat(VeinStrengthId, 0.12f);
                renderer.sharedMaterial = material;

                _organs.Add(new OrganVisual
                {
                    Key = key,
                    Renderer = renderer,
                    Material = material,
                    Transform = renderer.transform,
                    BaseScale = renderer.transform.localScale,
                    BaseColor = color,
                    Phase = _organs.Count * 0.7f,
                });
            }

            Debug.Log($"[TCM] 解剖结构载入：{_organs.Count} 个器官，{_boneRenderers.Count} 块骨骼网格。");
        }

        private static string ExtractKey(string objectName)
        {
            int index = objectName.IndexOf("ORGAN_", StringComparison.Ordinal);
            if (index >= 0)
            {
                string rest = objectName.Substring(index + 6);
                foreach (string key in OrganColors.Keys)
                {
                    if (rest.StartsWith(key, StringComparison.Ordinal))
                        return key;
                }
                int cut = rest.IndexOfAny(new[] { ' ', '(', '.' });
                return cut > 0 ? rest.Substring(0, cut) : rest;
            }
            if (objectName.IndexOf("Skeleton", StringComparison.OrdinalIgnoreCase) >= 0)
                return "Skeleton";
            return null;
        }

        public void SetVisible(bool organs, bool bones)
        {
            _organsVisible = organs;
            _bonesVisible = bones;
            foreach (OrganVisual organ in _organs)
                organ.Renderer.enabled = organs;
            foreach (Renderer bone in _boneRenderers)
                bone.enabled = bones;
        }

        public void ApplyState(TcmState state, float time)
        {
            if (_organs.Count == 0 && _boneRenderers.Count == 0)
                return;

            float bpm = 62f + state.bloodFlow * 26f + state.inflammation * 8f;
            float heartPhase = time * Mathf.PI * 2f * (bpm / 60f);
            float beat = 0.5f + 0.5f * Mathf.Sin(heartPhase);

            foreach (OrganVisual organ in _organs)
            {
                float intensity = 0.80f;
                float scale = 1f;
                float blockage = 0f;
                float pulseSpeed = 1f;
                Color color = organ.BaseColor;

                switch (organ.Key)
                {
                    case "Heart":
                        scale = 1f + 0.055f * beat;
                        intensity = 1.05f + state.qiFlow * 0.30f + state.inflammation * 0.55f;
                        color = Color.Lerp(organ.BaseColor, new Color(1f, 0.55f, 0.25f), state.inflammation * 0.5f);
                        pulseSpeed = 2.0f;
                        break;
                    case "Lungs":
                        scale = 1f + 0.018f * Mathf.Sin(time * 1.2f + organ.Phase);
                        intensity = 0.50f + state.qiFlow * 0.16f - state.inflammation * 0.08f;
                        color = Color.Lerp(organ.BaseColor, new Color(1f, 0.58f, 0.50f), state.inflammation * 0.3f);
                        break;
                    case "Liver":
                        blockage = Mathf.Clamp01(state.stagnation);
                        intensity = 0.68f + state.qiFlow * 0.18f;
                        color = Color.Lerp(organ.BaseColor, new Color(0.85f, 0.48f, 0.22f), state.inflammation * 0.35f);
                        break;
                    case "Kidneys":
                        intensity = 0.35f + state.yang * 0.90f + (1f - state.yin) * 0.15f;
                        color = Color.Lerp(organ.BaseColor, new Color(0.35f, 0.25f, 0.55f), state.yang < 0.35f ? 0.35f : 0f);
                        break;
                    case "Spleen":
                        intensity = 0.45f + state.yang * 0.65f;
                        break;
                    case "Brain":
                        intensity = 0.65f + state.qiFlow * 0.25f + state.inflammation * 0.30f;
                        pulseSpeed = 0.8f;
                        break;
                    default:
                        intensity = 0.55f + state.qiFlow * 0.20f;
                        break;
                }

                intensity *= 1f - state.stagnation * 0.12f;
                organ.Material.SetColor(ColorId, color);
                organ.Material.SetColor(RimColorId, Color.Lerp(color, Color.white, 0.35f));
                organ.Material.SetFloat(IntensityId, Mathf.Clamp(intensity, 0.15f, 2.5f));
                organ.Material.SetFloat(BlockageId, blockage);
                organ.Material.SetFloat(PulseSpeedId, pulseSpeed);
                organ.Transform.localScale = organ.BaseScale * Mathf.Clamp(scale, 0.94f, 1.10f);
            }

            if (_boneMaterial != null)
            {
                _boneMaterial.SetFloat(IntensityId, 0.40f + state.qiFlow * 0.12f);
                _boneMaterial.SetFloat(AlphaId, state.stagnation > 0.5f ? 0.55f : 0.70f);
            }
        }
    }
}
