using TCM.Core;
using UnityEngine;

namespace TCM.Visualization
{
    public class YinYangCore : MonoBehaviour
    {
        private static readonly int YinColorId = Shader.PropertyToID("_YinColor");
        private static readonly int YangColorId = Shader.PropertyToID("_YangColor");
        private static readonly int GlowColorId = Shader.PropertyToID("_GlowColor");
        private static readonly int IntensityId = Shader.PropertyToID("_Intensity");
        private static readonly int FlowSpeedId = Shader.PropertyToID("_FlowSpeed");
        private static readonly int EdgeGlowId = Shader.PropertyToID("_EdgeGlow");
        private static readonly int SGlowId = Shader.PropertyToID("_SGlow");
        private static readonly int ColorId = Shader.PropertyToID("_Color");

        private Transform _root;
        private Transform _discRoot;
        private Transform _innerRing;
        private Transform _outerRing;
        private Transform _bead;
        private Material _taijiMaterial;
        private Material _ringMaterial;
        private Material _beadMaterial;
        private Light _light;
        private float _radius;
        private float _discAngle;
        private float _ringAngle;

        public void Build(TcmDataset data, Transform parent, Shader taijiShader, Shader glowShader)
        {
            Vector3 anchor = data.taiji != null ? data.taiji.position : new Vector3(0f, 1.02f, 0.21f);
            _radius = data.taiji != null ? data.taiji.radius : 0.1f;

            var rootGo = new GameObject("YinYangCore");
            rootGo.transform.SetParent(parent, false);
            rootGo.transform.localPosition = anchor;
            _root = rootGo.transform;

            _taijiMaterial = new Material(taijiShader) { name = "MAT_Taiji_Runtime" };
            _discRoot = new GameObject("DiscRoot").transform;
            _discRoot.SetParent(_root, false);

            var disc = new GameObject("TaijiDisc");
            disc.transform.SetParent(_discRoot, false);
            disc.transform.localScale = Vector3.one * _radius;
            var mf = disc.AddComponent<MeshFilter>();
            mf.sharedMesh = ProceduralMesh.BuildDisc(128);
            var mr = disc.AddComponent<MeshRenderer>();
            mr.sharedMaterial = _taijiMaterial;
            mr.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
            mr.receiveShadows = false;

            _ringMaterial = new Material(glowShader) { name = "MAT_TaijiRing_Runtime" };
            _ringMaterial.SetColor(ColorId, new Color(0.85f, 0.95f, 1f));
            _ringMaterial.SetFloat("_FresnelPower", 1.4f);
            _ringMaterial.SetFloat("_Alpha", 0.15f);
            _ringMaterial.SetFloat("_PulseSpeed", 1.4f);

            _innerRing = CreateRing("InnerRing", _root, _radius * 1.20f, _radius * 0.028f, _ringMaterial);
            _outerRing = CreateRing("OuterRing", _root, _radius * 1.52f, _radius * 0.014f, _ringMaterial);

            _beadMaterial = new Material(glowShader) { name = "MAT_TaijiBead_Runtime" };
            _beadMaterial.SetColor(ColorId, new Color(1f, 0.92f, 0.75f));
            _beadMaterial.SetFloat("_FresnelPower", 1.2f);
            _beadMaterial.SetFloat("_Alpha", 0.30f);

            GameObject beadGo = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            beadGo.name = "OrbitBead";
            Destroy(beadGo.GetComponent<Collider>());
            beadGo.transform.SetParent(_root, false);
            beadGo.transform.localScale = Vector3.one * (_radius * 0.12f);
            var beadRenderer = beadGo.GetComponent<MeshRenderer>();
            beadRenderer.sharedMaterial = _beadMaterial;
            beadRenderer.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
            _bead = beadGo.transform;

            var lightGo = new GameObject("TaijiLight");
            lightGo.transform.SetParent(_root, false);
            lightGo.transform.localPosition = new Vector3(0f, 0f, 0.22f);
            _light = lightGo.AddComponent<Light>();
            _light.type = LightType.Point;
            _light.range = 0.75f;
            _light.intensity = 0.75f;
            _light.shadows = LightShadows.None;
            _light.color = new Color(0.55f, 0.75f, 1f);
        }

        private static Transform CreateRing(string name, Transform parent, float radius, float thickness, Material material)
        {
            int segments = 96;
            var pts = new Vector3[segments + 1];
            for (int i = 0; i <= segments; i++)
            {
                float a = i / (float)segments * Mathf.PI * 2f;
                pts[i] = new Vector3(Mathf.Cos(a) * radius, Mathf.Sin(a) * radius, 0f);
            }

            float[] arc = ProceduralMesh.NormalizedArc(pts);
            Mesh mesh = ProceduralMesh.BuildTube(pts, arc, thickness, 8);
            var go = new GameObject(name);
            go.transform.SetParent(parent, false);
            var filter = go.AddComponent<MeshFilter>();
            filter.sharedMesh = mesh;
            var renderer = go.AddComponent<MeshRenderer>();
            renderer.sharedMaterial = material;
            renderer.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
            renderer.receiveShadows = false;
            return go.transform;
        }

        public void ApplyState(TcmState state, float time)
        {
            float imbalance = state.Imbalance;
            float speed = Mathf.Lerp(7f, 30f, imbalance) * (0.55f + state.qiFlow * 0.55f);
            _discAngle = Mathf.Repeat(_discAngle + speed * Time.deltaTime, 360f);
            _ringAngle = Mathf.Repeat(_ringAngle - speed * 0.35f * Time.deltaTime, 360f);
            _discRoot.localRotation = Quaternion.Euler(0f, 0f, _discAngle);
            _innerRing.localRotation = Quaternion.Euler(0f, 0f, _ringAngle);
            _outerRing.localRotation = Quaternion.Euler(0f, 0f, -_ringAngle * 0.6f);

            float pulse = 1f + 0.022f * Mathf.Sin(time * 1.6f) + imbalance * 0.05f * Mathf.Sin(time * 3.1f);
            _root.localScale = Vector3.one * pulse;

            if (_taijiMaterial != null)
            {
                Color yin = TcmPalette.Yin * (0.70f + state.yin * 0.90f);
                Color yang = TcmPalette.Yang * (0.70f + state.yang * 0.90f);
                _taijiMaterial.SetColor(YinColorId, yin);
                _taijiMaterial.SetColor(YangColorId, yang);
                _taijiMaterial.SetColor(GlowColorId, new Color(0.80f, 0.95f, 1f) * (1.0f + state.qiFlow * 0.45f));
                _taijiMaterial.SetFloat(IntensityId, 0.55f + state.qiFlow * 0.30f);
                _taijiMaterial.SetFloat(FlowSpeedId, 0.45f + state.qiFlow * 0.75f);
                _taijiMaterial.SetFloat(EdgeGlowId, 0.50f + state.stagnation * 0.40f);
                _taijiMaterial.SetFloat(SGlowId, 0.35f + state.qiFlow * 0.30f);
            }

            if (_ringMaterial != null)
            {
                Color ring = Color.Lerp(new Color(0.75f, 0.92f, 1f), state.bodyTint, 0.35f);
                _ringMaterial.SetColor(ColorId, ring);
                _ringMaterial.SetFloat("_Intensity", 0.35f + state.qiFlow * 0.35f);
            }

            float beadAngle = time * (35f + imbalance * 55f);
            float beadRadius = _radius * 1.36f;
            _bead.localPosition = new Vector3(Mathf.Cos(beadAngle * Mathf.Deg2Rad) * beadRadius,
                                               Mathf.Sin(beadAngle * Mathf.Deg2Rad) * beadRadius,
                                               0f);

            if (_light != null)
            {
                Color lightColor = Color.Lerp(TcmPalette.Yin, TcmPalette.Yang, state.YangRatio);
                _light.color = Color.Lerp(lightColor, Color.white, 0.25f);
                _light.intensity = 0.25f + state.qiFlow * 0.30f;
            }
        }

        public void SetVisible(bool visible)
        {
            if (_root != null) _root.gameObject.SetActive(visible);
        }
    }
}
