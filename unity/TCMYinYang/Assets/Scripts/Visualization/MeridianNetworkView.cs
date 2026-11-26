using System.Collections.Generic;
using TCM.Core;
using UnityEngine;

namespace TCM.Visualization
{
    public class MeridianVisual
    {
        public MeridianPath Data;
        public GameObject Root;
        public MeshRenderer Renderer;
        public MaterialPropertyBlock Block;
        public Vector3[] SamplePoints;
        public float[] Arc;
        public Color PolarityColor;
        public Color AccentColor;
        public float Highlight;

        public Vector3 PointAt(float u)
        {
            if (SamplePoints == null || SamplePoints.Length == 0)
                return Vector3.zero;
            if (Arc == null || Arc.Length != SamplePoints.Length)
                return SamplePoints[0];

            u = Mathf.Clamp01(u);
            for (int i = 1; i < Arc.Length; i++)
            {
                if (Arc[i] >= u)
                {
                    float span = Mathf.Max(Arc[i] - Arc[i - 1], 1e-6f);
                    float t = (u - Arc[i - 1]) / span;
                    return Vector3.Lerp(SamplePoints[i - 1], SamplePoints[i], t);
                }
            }
            return SamplePoints[SamplePoints.Length - 1];
        }
    }

    public class MeridianNetworkView : MonoBehaviour
    {
        private static readonly int ColorAId = Shader.PropertyToID("_ColorA");
        private static readonly int ColorBId = Shader.PropertyToID("_ColorB");
        private static readonly int IntensityId = Shader.PropertyToID("_Intensity");
        private static readonly int FlowSpeedId = Shader.PropertyToID("_FlowSpeed");
        private static readonly int PulseCountId = Shader.PropertyToID("_PulseCount");
        private static readonly int DirectionId = Shader.PropertyToID("_Direction");
        private static readonly int SharpnessId = Shader.PropertyToID("_Sharpness");
        private static readonly int BaseGlowId = Shader.PropertyToID("_BaseGlow");
        private static readonly int RimPowerId = Shader.PropertyToID("_RimPower");
        private static readonly int BlockageId = Shader.PropertyToID("_Blockage");
        private static readonly int BlockPositionId = Shader.PropertyToID("_BlockPosition");
        private static readonly int BlockedColorId = Shader.PropertyToID("_BlockedColor");
        private static readonly int HeartbeatId = Shader.PropertyToID("_Heartbeat");
        private static readonly int BpmId = Shader.PropertyToID("_Bpm");

        public readonly List<MeridianVisual> Meridians = new List<MeridianVisual>();
        public readonly List<MeridianVisual> Vessels = new List<MeridianVisual>();
        public readonly Dictionary<string, MeridianVisual> ByBaseId = new Dictionary<string, MeridianVisual>();

        private readonly List<Transform> _stasis = new List<Transform>();
        private readonly List<MeridianVisual> _blockedBuffer = new List<MeridianVisual>();
        private Transform _stasisRoot;
        private Material _flowMaterial;
        private Material _bloodMaterial;
        private float _stasisPulse;

        public void Build(TcmDataset data, Transform parent, Material flowMaterial, Material bloodMaterial, Material stasisMaterial)
        {
            _flowMaterial = flowMaterial;
            _bloodMaterial = bloodMaterial;

            var meridianRoot = new GameObject("Meridians").transform;
            meridianRoot.SetParent(parent, false);
            var vesselRoot = new GameObject("BloodVessels").transform;
            vesselRoot.SetParent(parent, false);
            _stasisRoot = new GameObject("StasisNodes").transform;
            _stasisRoot.SetParent(parent, false);

            if (data.meridians != null)
            {
                foreach (MeridianPath path in data.meridians)
                    BuildPath(path, meridianRoot, _flowMaterial, true);
            }

            if (data.vessels != null)
            {
                foreach (VesselPath path in data.vessels)
                {
                    var meridianPath = new MeridianPath
                    {
                        id = path.id,
                        baseId = path.id,
                        name = path.name,
                        shortName = path.name,
                        polarity = "blood",
                        element = "水",
                        points = path.points,
                    };
                    BuildPath(meridianPath, vesselRoot, _bloodMaterial, false);
                }
            }

            if (stasisMaterial != null)
            {
                for (int i = 0; i < 5; i++)
                {
                    GameObject node = GameObject.CreatePrimitive(PrimitiveType.Sphere);
                    node.name = $"Stasis_{i}";
                    Destroy(node.GetComponent<Collider>());
                    node.transform.SetParent(_stasisRoot, false);
                    var mr = node.GetComponent<MeshRenderer>();
                    mr.sharedMaterial = stasisMaterial;
                    mr.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
                    mr.receiveShadows = false;
                    node.SetActive(false);
                    _stasis.Add(node.transform);
                }
            }

            Debug.Log($"[TCM] 经络网络构建完成: {Meridians.Count} 条经脉, {Vessels.Count} 条血脉。");
        }

        private void BuildPath(MeridianPath path, Transform parent, Material material, bool isMeridian)
        {
            Vector3[] sampled = MeridianCurve.Sample(path.points, 12, out float[] arc);
            if (sampled.Length < 2)
                return;

            float radius = isMeridian ? 0.0048f : 0.0072f;
            Mesh mesh = ProceduralMesh.BuildTube(sampled, arc, radius, isMeridian ? 10 : 8);
            if (mesh == null)
                return;

            var go = new GameObject(path.id);
            go.transform.SetParent(parent, false);
            var filter = go.AddComponent<MeshFilter>();
            filter.sharedMesh = mesh;
            var renderer = go.AddComponent<MeshRenderer>();
            renderer.sharedMaterial = material;
            renderer.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
            renderer.receiveShadows = false;

            var visual = new MeridianVisual
            {
                Data = path,
                Root = go,
                Renderer = renderer,
                Block = new MaterialPropertyBlock(),
                SamplePoints = sampled,
                Arc = arc,
                PolarityColor = path.polarity == "yin" ? TcmPalette.Yin : TcmPalette.Yang,
                AccentColor = Color.Lerp(path.polarity == "yin" ? TcmPalette.Yin : TcmPalette.Yang,
                                         TcmPalette.Element(path.element), 0.42f),
            };

            if (isMeridian)
            {
                Meridians.Add(visual);
                if (!string.IsNullOrEmpty(path.baseId) && !ByBaseId.ContainsKey(path.baseId))
                    ByBaseId.Add(path.baseId, visual);
            }
            else
            {
                Vessels.Add(visual);
            }
        }

        public void ApplyState(TcmState state, string activeBaseId, float clockPulse)
        {
            float dt = Time.deltaTime;

            foreach (MeridianVisual m in Meridians)
            {
                bool blocked = state.stagnation > 0.05f && m.Data.baseId == state.blockedMeridian;
                float targetHighlight = (!string.IsNullOrEmpty(activeBaseId) && m.Data.baseId == activeBaseId)
                    ? 1f : 0f;
                m.Highlight = Mathf.Lerp(m.Highlight, targetHighlight, 1f - Mathf.Exp(-6f * dt));

                float yinYang = m.Data.polarity == "yin" ? state.yin : state.yang;
                float intensity = 0.16f + state.qiFlow * 0.30f + yinYang * 0.16f
                                  + m.Highlight * (0.25f + clockPulse * 0.20f);
                float speed = 0.18f + state.qiFlow * 0.55f;
                if (blocked)
                {
                    intensity *= 0.45f;
                    speed *= 0.18f;
                }

                m.Block.Clear();
                m.Block.SetColor(ColorAId, m.PolarityColor);
                m.Block.SetColor(ColorBId, m.AccentColor);
                m.Block.SetFloat(IntensityId, Mathf.Clamp(intensity, 0f, 2.8f));
                m.Block.SetFloat(FlowSpeedId, speed);
                m.Block.SetFloat(PulseCountId, 6.2f);
                m.Block.SetFloat(DirectionId, blocked ? -1f : 1f);
                m.Block.SetFloat(SharpnessId, 7f);
                m.Block.SetFloat(BaseGlowId, blocked ? 0.06f : 0.10f);
                m.Block.SetFloat(RimPowerId, 2.1f);
                m.Block.SetFloat(BlockageId, blocked ? state.stagnation : 0f);
                m.Block.SetFloat(BlockPositionId, 0.46f);
                m.Block.SetColor(BlockedColorId, TcmPalette.Blocked);
                m.Block.SetFloat(HeartbeatId, 0.15f);
                m.Block.SetFloat(BpmId, 72f);
                m.Renderer.SetPropertyBlock(m.Block);
            }

            foreach (MeridianVisual v in Vessels)
            {
                float darkness = Mathf.Clamp01(state.stagnation * 0.8f);
                Color blood = Color.Lerp(TcmPalette.Blood, new Color(0.22f, 0.01f, 0.03f), darkness);
                v.Block.Clear();
                v.Block.SetColor(ColorAId, blood);
                v.Block.SetColor(ColorBId, new Color(1f, 0.28f, 0.16f));
                v.Block.SetFloat(IntensityId, Mathf.Clamp(0.20f + state.bloodFlow * 0.32f, 0f, 1.2f));
                v.Block.SetFloat(FlowSpeedId, 0.12f + state.bloodFlow * 0.62f);
                v.Block.SetFloat(PulseCountId, 4.2f);
                v.Block.SetFloat(DirectionId, 1f);
                v.Block.SetFloat(SharpnessId, 10f);
                v.Block.SetFloat(BaseGlowId, 0.12f);
                v.Block.SetFloat(RimPowerId, 2.4f);
                v.Block.SetFloat(BlockageId, state.stagnation * 0.35f);
                v.Block.SetFloat(BlockPositionId, 0.55f);
                v.Block.SetColor(BlockedColorId, new Color(0.30f, 0.02f, 0.05f));
                v.Block.SetFloat(HeartbeatId, 1f);
                v.Block.SetFloat(BpmId, 62f + state.bloodFlow * 28f);
                v.Renderer.SetPropertyBlock(v.Block);
            }

            UpdateStasis(state);
        }

        private void UpdateStasis(TcmState state)
        {
            bool active = state.stagnation > 0.12f && !string.IsNullOrEmpty(state.blockedMeridian);
            if (!active)
            {
                foreach (Transform t in _stasis)
                    if (t.gameObject.activeSelf) t.gameObject.SetActive(false);
                return;
            }

            _blockedBuffer.Clear();
            foreach (MeridianVisual m in Meridians)
            {
                if (m.Data.baseId == state.blockedMeridian)
                    _blockedBuffer.Add(m);
            }

            if (_blockedBuffer.Count == 0)
            {
                foreach (Transform t in _stasis)
                    if (t.gameObject.activeSelf) t.gameObject.SetActive(false);
                return;
            }

            float[] positions = { 0.24f, 0.38f, 0.52f, 0.66f, 0.80f };
            _stasisPulse += Time.deltaTime * 2.2f;
            for (int i = 0; i < _stasis.Count && i < positions.Length; i++)
            {
                MeridianVisual visual = _blockedBuffer[i % _blockedBuffer.Count];
                Transform node = _stasis[i];
                node.gameObject.SetActive(true);
                node.position = visual.PointAt(positions[i]);
                float pulse = 0.75f + 0.25f * Mathf.Sin(_stasisPulse + i * 1.3f);
                float scale = (0.010f + state.stagnation * 0.022f) * pulse;
                node.localScale = Vector3.one * scale;
            }
        }

        public MeridianVisual Find(string baseId)
        {
            return ByBaseId.TryGetValue(baseId, out MeridianVisual visual) ? visual : null;
        }

        public void SetVisible(bool meridians, bool vessels)
        {
            foreach (MeridianVisual m in Meridians) m.Root.SetActive(meridians);
            foreach (MeridianVisual v in Vessels) v.Root.SetActive(vessels);
        }
    }
}
