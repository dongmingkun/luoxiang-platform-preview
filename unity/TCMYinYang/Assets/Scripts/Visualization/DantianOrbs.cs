using System.Collections.Generic;
using TCM.Core;
using UnityEngine;

namespace TCM.Visualization
{
    public class DantianOrbs : MonoBehaviour
    {
        private class Orb
        {
            public string Id;
            public Transform Root;
            public Transform Core;
            public Transform Halo;
            public Material CoreMaterial;
            public Material HaloMaterial;
            public float Radius;
            public float Phase;
            public Color Color;
        }

        private readonly List<Orb> _orbs = new List<Orb>();
        private Light _glowLight;

        public void Build(TcmDataset data, Transform parent, Shader glowShader)
        {
            var root = new GameObject("Dantians").transform;
            root.SetParent(parent, false);

            Color[] colors =
            {
                new Color(1.00f, 0.72f, 0.30f),
                new Color(1.00f, 0.58f, 0.24f),
                new Color(0.78f, 0.94f, 1.00f),
            };

            if (data.dantians != null)
            {
                for (int i = 0; i < data.dantians.Length; i++)
                {
                    DantianPoint point = data.dantians[i];
                    var orb = new Orb
                    {
                        Id = point.id,
                        Radius = Mathf.Max(0.02f, point.radius),
                        Phase = i * 1.7f,
                        Color = i < colors.Length ? colors[i] : TcmPalette.Gold,
                    };

                    var go = new GameObject($"Dantian_{point.id}");
                    go.transform.SetParent(root, false);
                    go.transform.localPosition = point.position;
                    orb.Root = go.transform;

                    orb.CoreMaterial = new Material(glowShader) { name = $"MAT_DantianCore_{point.id}" };
                    orb.HaloMaterial = new Material(glowShader) { name = $"MAT_DantianHalo_{point.id}" };
                    orb.CoreMaterial.SetColor("_Color", orb.Color);
                    orb.HaloMaterial.SetColor("_Color", orb.Color);
                    orb.CoreMaterial.SetFloat("_FresnelPower", 1.2f);
                    orb.HaloMaterial.SetFloat("_FresnelPower", 2.4f);
                    orb.CoreMaterial.SetFloat("_Alpha", 0.55f);
                    orb.HaloMaterial.SetFloat("_Alpha", 0.06f);

                    orb.Core = CreateSphere("Core", go.transform, Vec(point.radius * 2.1f), orb.CoreMaterial);
                    orb.Halo = CreateSphere("Halo", go.transform, Vec(point.radius * 3.4f), orb.HaloMaterial);
                    _orbs.Add(orb);
                }
            }

            var lightGo = new GameObject("DantianGlowLight");
            lightGo.transform.SetParent(root, false);
            lightGo.transform.localPosition = new Vector3(0f, 1.0f, 0.18f);
            _glowLight = lightGo.AddComponent<Light>();
            _glowLight.type = LightType.Point;
            _glowLight.color = TcmPalette.Gold;
            _glowLight.range = 0.9f;
            _glowLight.intensity = 0.8f;
            _glowLight.shadows = LightShadows.None;
        }

        private static Transform CreateSphere(string name, Transform parent, Vector3 scale, Material material)
        {
            GameObject go = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            go.name = name;
            Destroy(go.GetComponent<Collider>());
            go.transform.SetParent(parent, false);
            go.transform.localScale = scale;
            var renderer = go.GetComponent<MeshRenderer>();
            renderer.sharedMaterial = material;
            renderer.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
            renderer.receiveShadows = false;
            return go.transform;
        }

        private static Vector3 Vec(float diameter)
        {
            return new Vector3(diameter, diameter, diameter);
        }

        public void ApplyState(TcmState state, float time)
        {
            float flow = 0.30f + state.qiFlow * 0.35f;
            float imbalance = 0.85f + state.Imbalance * 0.6f;

            foreach (Orb orb in _orbs)
            {
                float phase = time * (0.7f + state.qiFlow * 0.7f) + orb.Phase;
                float pulse = 0.86f + 0.14f * Mathf.Sin(phase);
                float dim = 1f - state.stagnation * 0.45f;

                orb.Root.localScale = Vector3.one * pulse;
                orb.CoreMaterial.SetColor("_Color", orb.Color * (0.85f + state.Imbalance * 0.35f));
                orb.CoreMaterial.SetFloat("_Intensity", flow * imbalance * dim);
                orb.CoreMaterial.SetFloat("_PulseSpeed", 1.0f + state.qiFlow);
                orb.HaloMaterial.SetFloat("_Intensity", 0.35f * flow * dim);
                orb.HaloMaterial.SetFloat("_PulseSpeed", 0.6f + state.qiFlow * 0.5f);
                orb.Halo.localScale = Vec(orb.Radius * (3.4f + 0.35f * Mathf.Sin(phase * 0.7f)));
            }

            if (_glowLight != null)
            {
                _glowLight.intensity = 0.25f + 0.30f * state.qiFlow * (1f - state.stagnation * 0.5f);
                _glowLight.color = Color.Lerp(TcmPalette.Gold, state.bodyTint, 0.25f + state.inflammation * 0.3f);
            }
        }
    }
}
