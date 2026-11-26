using System.Collections.Generic;
using TCM.Core;
using UnityEngine;

namespace TCM.Visualization
{
    /// <summary>
    /// 子午流注环：十二段发光弧线按十二时辰循环点亮，指针随虚拟时间移动。
    /// </summary>
    public class MeridianClockView : MonoBehaviour
    {
        private class Segment
        {
            public MeridianClockEntry Entry;
            public MeshRenderer Renderer;
            public MaterialPropertyBlock Block;
            public Color BaseColor;
            public Color AccentColor;
        }

        private readonly List<Segment> _segments = new List<Segment>();
        private Transform _root;
        private Transform _pointer;
        private Material _segmentMaterial;
        private Material _pointerMaterial;
        private float _pointerScale = 0.022f;

        private static readonly int ColorAId = Shader.PropertyToID("_ColorA");
        private static readonly int ColorBId = Shader.PropertyToID("_ColorB");
        private static readonly int IntensityId = Shader.PropertyToID("_Intensity");
        private static readonly int FlowSpeedId = Shader.PropertyToID("_FlowSpeed");
        private static readonly int PulseCountId = Shader.PropertyToID("_PulseCount");
        private static readonly int DirectionId = Shader.PropertyToID("_Direction");
        private static readonly int SharpnessId = Shader.PropertyToID("_Sharpness");
        private static readonly int BaseGlowId = Shader.PropertyToID("_BaseGlow");
        private static readonly int BlockageId = Shader.PropertyToID("_Blockage");
        private static readonly int BlockPositionId = Shader.PropertyToID("_BlockPosition");
        private static readonly int BlockedColorId = Shader.PropertyToID("_BlockedColor");
        private static readonly int HeartbeatId = Shader.PropertyToID("_Heartbeat");

        public float Radius { get; private set; } = 0.46f;
        public float Height { get; private set; } = 0.90f;

        public void Build(Transform parent, Material segmentMaterial, Material glowMaterial, Material pointerMaterial)
        {
            _segmentMaterial = segmentMaterial;
            _pointerMaterial = pointerMaterial;

            var rootGo = new GameObject("MeridianClock");
            rootGo.transform.SetParent(parent, false);
            rootGo.transform.localPosition = new Vector3(0f, Height, 0f);
            _root = rootGo.transform;

            float gap = 6f;
            float arcSpan = 360f / MeridianClockData.Entries.Length - gap;

            for (int i = 0; i < MeridianClockData.Entries.Length; i++)
            {
                MeridianClockEntry entry = MeridianClockData.Entries[i];
                float centerAngle = 90f - i * (360f / MeridianClockData.Entries.Length);
                Vector3[] pts = MeridianCurve.CirclePoints(
                    Vector3.zero, Radius,
                    centerAngle + arcSpan * 0.5f,
                    centerAngle - arcSpan * 0.5f,
                    10);
                float[] arc = ProceduralMesh.NormalizedArc(pts);
                Mesh mesh = ProceduralMesh.BuildTube(pts, arc, 0.0058f, 8);
                if (mesh == null)
                    continue;

                var go = new GameObject($"Clock_{entry.id}");
                go.transform.SetParent(_root, false);
                var filter = go.AddComponent<MeshFilter>();
                filter.sharedMesh = mesh;
                var renderer = go.AddComponent<MeshRenderer>();
                renderer.sharedMaterial = _segmentMaterial;
                renderer.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
                renderer.receiveShadows = false;

                Color baseColor = entry.polarity == "yin" ? TcmPalette.Yin : TcmPalette.Yang;
                _segments.Add(new Segment
                {
                    Entry = entry,
                    Renderer = renderer,
                    Block = new MaterialPropertyBlock(),
                    BaseColor = baseColor,
                    AccentColor = Color.Lerp(baseColor, TcmPalette.Element(entry.element), 0.45f),
                });
            }

            // Base rings and tick marks give the clock a mechanical, medical-instrument feel.
            var baseMat = new Material(glowMaterial) { name = "MAT_ClockBase_Runtime" };
            baseMat.SetColor("_Color", new Color(0.30f, 0.68f, 0.90f));
            baseMat.SetFloat("_Alpha", 0.05f);
            baseMat.SetFloat("_Intensity", 0.50f);
            CreateRing("ClockRingTop", _root, Radius + 0.055f, 0.0016f, 0.055f, baseMat);
            CreateRing("ClockRingBottom", _root, Radius + 0.055f, 0.0016f, -0.055f, baseMat);

            for (int i = 0; i < 12; i++)
            {
                float angle = 90f - i * 30f + 15f;
                GameObject tick = GameObject.CreatePrimitive(PrimitiveType.Cube);
                tick.name = $"ClockTick_{i:00}";
                Destroy(tick.GetComponent<Collider>());
                tick.transform.SetParent(_root, false);
                tick.transform.localPosition = new Vector3(
                    Mathf.Cos(angle * Mathf.Deg2Rad) * (Radius + 0.055f),
                    -0.075f,
                    Mathf.Sin(angle * Mathf.Deg2Rad) * (Radius + 0.055f));
                tick.transform.localScale = new Vector3(0.0035f, 0.028f, 0.0035f);
                var mr = tick.GetComponent<MeshRenderer>();
                mr.sharedMaterial = baseMat;
                mr.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
            }

            GameObject pointerGo = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            pointerGo.name = "ClockPointer";
            Destroy(pointerGo.GetComponent<Collider>());
            pointerGo.transform.SetParent(_root, false);
            pointerGo.transform.localScale = Vector3.one * _pointerScale;
            var pointerRenderer = pointerGo.GetComponent<MeshRenderer>();
            pointerRenderer.sharedMaterial = _pointerMaterial;
            pointerRenderer.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
            _pointer = pointerGo.transform;
        }

        private static void CreateRing(string name, Transform parent, float radius, float thickness, float y, Material material)
        {
            Vector3[] pts = MeridianCurve.CirclePoints(new Vector3(0f, y, 0f), radius, 0f, 360f, 96);
            float[] arc = ProceduralMesh.NormalizedArc(pts);
            Mesh mesh = ProceduralMesh.BuildTube(pts, arc, thickness, 6);
            if (mesh == null) return;
            var go = new GameObject(name);
            go.transform.SetParent(parent, false);
            var filter = go.AddComponent<MeshFilter>();
            filter.sharedMesh = mesh;
            var renderer = go.AddComponent<MeshRenderer>();
            renderer.sharedMaterial = material;
            renderer.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
        }

        public void ApplyState(TcmState state, float hour, float clockPulse)
        {
            int activeIndex = MeridianClockData.IndexForHour(hour);
            float fraction = Mathf.Repeat(hour - MeridianClockData.Entries[activeIndex].startHour, 24f) / 2f;
            fraction = Mathf.Clamp01(fraction);
            float pointerCenter = 90f - activeIndex * 30f;
            float pointerAngle = pointerCenter + (0.5f - fraction) * 24f;
            if (_pointer != null)
            {
                _pointer.localPosition = new Vector3(
                    Mathf.Cos(pointerAngle * Mathf.Deg2Rad) * Radius,
                    0.005f,
                    Mathf.Sin(pointerAngle * Mathf.Deg2Rad) * Radius);
                float s = _pointerScale * (0.85f + 0.3f * Mathf.Sin(Time.time * 4f));
                _pointer.localScale = Vector3.one * s;
            }

            for (int i = 0; i < _segments.Count; i++)
            {
                Segment seg = _segments[i];
                bool active = i == activeIndex;
                bool blocked = state.stagnation > 0.1f && seg.Entry.id == state.blockedMeridian;
                Color color = blocked ? TcmPalette.Blocked : seg.BaseColor;
                Color accent = blocked ? new Color(0.35f, 0.05f, 0.55f) : seg.AccentColor;
                float intensity = active ? 0.90f + clockPulse * 0.35f : 0.15f;
                if (blocked) intensity *= 0.55f;

                seg.Block.Clear();
                seg.Block.SetColor(ColorAId, color);
                seg.Block.SetColor(ColorBId, accent);
                seg.Block.SetFloat(IntensityId, intensity);
                seg.Block.SetFloat(FlowSpeedId, active ? 0.55f : 0.18f);
                seg.Block.SetFloat(PulseCountId, 2.4f);
                seg.Block.SetFloat(DirectionId, 1f);
                seg.Block.SetFloat(SharpnessId, 6f);
                seg.Block.SetFloat(BaseGlowId, active ? 0.20f : 0.08f);
                seg.Block.SetFloat(BlockageId, blocked ? state.stagnation : 0f);
                seg.Block.SetFloat(BlockPositionId, 0.5f);
                seg.Block.SetColor(BlockedColorId, TcmPalette.Blocked);
                seg.Block.SetFloat(HeartbeatId, 0f);
                seg.Renderer.SetPropertyBlock(seg.Block);
            }
        }

        public void SetVisible(bool visible)
        {
            if (_root != null) _root.gameObject.SetActive(visible);
        }
    }
}
