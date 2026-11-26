using UnityEngine;

namespace TCM.Visualization
{
    public class StageBuilder : MonoBehaviour
    {
        private Material _ringMaterial;

        public void Build(Transform parent, Shader glowShader)
        {
            var root = new GameObject("Stage").transform;
            root.SetParent(parent, false);

            GameObject platform = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            platform.name = "StagePlatform";
            Destroy(platform.GetComponent<Collider>());
            platform.transform.SetParent(root, false);
            platform.transform.localPosition = new Vector3(0f, -0.02f, 0f);
            platform.transform.localScale = new Vector3(1.92f, 0.02f, 1.92f);

            Shader standard = Shader.Find("Standard");
            if (standard != null)
            {
                var mat = new Material(standard) { name = "MAT_Stage_Runtime" };
                mat.SetColor("_Color", new Color(0.012f, 0.025f, 0.045f));
                mat.SetFloat("_Metallic", 0.72f);
                mat.SetFloat("_Glossiness", 0.82f);
                platform.GetComponent<MeshRenderer>().sharedMaterial = mat;
            }
            platform.GetComponent<MeshRenderer>().shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;

            _ringMaterial = new Material(glowShader) { name = "MAT_StageRing_Runtime" };
            _ringMaterial.SetColor("_Color", new Color(0.22f, 0.68f, 0.95f));
            _ringMaterial.SetFloat("_Alpha", 0.07f);
            _ringMaterial.SetFloat("_Intensity", 0.65f);
            _ringMaterial.SetFloat("_FresnelPower", 1.3f);
            _ringMaterial.SetFloat("_PulseSpeed", 0.9f);

            CreateRing("StageRing_Inner", root, 0.56f, 0.0018f, _ringMaterial);
            CreateRing("StageRing_Mid", root, 0.76f, 0.0022f, _ringMaterial);
            CreateRing("StageRing_Outer", root, 0.93f, 0.0026f, _ringMaterial);

            var tickMat = new Material(glowShader) { name = "MAT_StageTick_Runtime" };
            tickMat.SetColor("_Color", new Color(0.30f, 0.72f, 0.95f));
            tickMat.SetFloat("_Alpha", 0.05f);
            tickMat.SetFloat("_Intensity", 0.45f);
            tickMat.SetFloat("_FresnelPower", 1.2f);

            for (int i = 0; i < 36; i++)
            {
                float a = i / 36f * Mathf.PI * 2f;
                GameObject tick = GameObject.CreatePrimitive(PrimitiveType.Cube);
                tick.name = $"StageTick_{i:00}";
                Destroy(tick.GetComponent<Collider>());
                tick.transform.SetParent(root, false);
                float radius = 0.885f;
                tick.transform.localPosition = new Vector3(Mathf.Cos(a) * radius, 0.002f, Mathf.Sin(a) * radius);
                tick.transform.localRotation = Quaternion.Euler(0f, -a * Mathf.Rad2Deg, 0f);
                tick.transform.localScale = new Vector3(0.028f, 0.0015f, 0.0018f);
                var mr = tick.GetComponent<MeshRenderer>();
                mr.sharedMaterial = tickMat;
                mr.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
            }

        }

        private static void CreateRing(string name, Transform parent, float radius, float thickness, Material material)
        {
            Vector3[] pts = MeridianCurve.CirclePoints(new Vector3(0f, 0.003f, 0f), radius, 0f, 360f, 128);
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
            renderer.receiveShadows = false;
        }
    }
}
