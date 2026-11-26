using System.Collections.Generic;
using TCM.Core;
using UnityEngine;

namespace TCM.Visualization
{
    public class BodyHologramView : MonoBehaviour
    {
        private static readonly int ColorId = Shader.PropertyToID("_Color");
        private static readonly int RimColorId = Shader.PropertyToID("_RimColor");
        private static readonly int IntensityId = Shader.PropertyToID("_Intensity");
        private static readonly int PulseId = Shader.PropertyToID("_Pulse");
        private static readonly int BlockageId = Shader.PropertyToID("_Blockage");
        private static readonly int InflammationId = Shader.PropertyToID("_Inflammation");
        private static readonly int AlphaId = Shader.PropertyToID("_Alpha");
        private static readonly int RimStrengthId = Shader.PropertyToID("_RimStrength");
        private static readonly int ScanStrengthId = Shader.PropertyToID("_ScanStrength");
        private static readonly int SweepStrengthId = Shader.PropertyToID("_SweepStrength");
        private static readonly int RimPowerId = Shader.PropertyToID("_RimPower");

        public Material BodyMaterial { get; private set; }
        public Material WireMaterial { get; private set; }
        public Transform Container { get; private set; }

        private readonly List<Renderer> _bodyRenderers = new List<Renderer>();
        private readonly List<Renderer> _wireRenderers = new List<Renderer>();
        private GameObject _modelRoot;
        private GameObject _wireRoot;
        private float _breath;

        public void Build(Transform parent, Material bodyMaterial, Material wireMaterial)
        {
            BodyMaterial = bodyMaterial;
            WireMaterial = wireMaterial;

            var holder = new GameObject("BodyHologram");
            holder.transform.SetParent(parent, false);

            var container = new GameObject("BodyContainer").transform;
            container.SetParent(holder.transform, false);
            Container = container;

            GameObject bodyAsset = Resources.Load<GameObject>("Models/TCM_Body");
            if (bodyAsset != null)
            {
                _modelRoot = Instantiate(bodyAsset, container);
                _modelRoot.name = "TCM_Body";
                CollectRenderers(_modelRoot, _bodyRenderers);

                GameObject wireAsset = Resources.Load<GameObject>("Models/TCM_BodyWire");
                if (wireAsset != null)
                {
                    _wireRoot = Instantiate(wireAsset, container);
                    _wireRoot.name = "TCM_BodyWire";
                    CollectRenderers(_wireRoot, _wireRenderers);
                }

                // Normalize the shared container so body and wire keep their imported
                // relative transforms while both end up 1.72 m tall and grounded.
                NormalizeToHeight(container, _bodyRenderers, 1.72f);

                if (FacesBackward(_bodyRenderers))
                {
                    holder.transform.Rotate(0f, 180f, 0f);
                    Debug.Log("[TCM] FBX 正面朝向 -Z，已自动旋转 180° 以对齐经络数据。");
                }
            }
            else
            {
                Debug.LogWarning("[TCM] 未找到 Resources/Models/TCM_Body，使用程序化替身人体。");
                _modelRoot = BuildFallbackBody(container);
                CollectRenderers(_modelRoot, _bodyRenderers);
                NormalizeToHeight(container, _bodyRenderers, 1.72f);
            }

            foreach (Renderer r in _bodyRenderers)
                ApplyMaterial(r, BodyMaterial);
            foreach (Renderer r in _wireRenderers)
                ApplyMaterial(r, WireMaterial);
        }

        private static void ApplyMaterial(Renderer r, Material material)
        {
            int count = Mathf.Max(1, r.sharedMaterials.Length);
            var materials = new Material[count];
            for (int i = 0; i < count; i++)
                materials[i] = material;
            r.sharedMaterials = materials;
            r.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
            r.receiveShadows = false;
        }

        private static void CollectRenderers(GameObject root, List<Renderer> output)
        {
            output.Clear();
            foreach (Renderer r in root.GetComponentsInChildren<Renderer>(true))
            {
                if (r is MeshRenderer || r is SkinnedMeshRenderer)
                    output.Add(r);
            }
        }

        /// <summary>
        /// FBX unit conversion can differ between machines, so we always normalize
        /// the imported mesh to 1.72 m and place its feet on the ground plane.
        /// This keeps the runtime-generated meridians aligned with the body.
        /// </summary>
        private static void NormalizeToHeight(Transform root, List<Renderer> renderers, float targetHeight)
        {
            if (renderers.Count == 0)
                return;

            Bounds bounds = renderers[0].bounds;
            bool initialized = false;
            foreach (Renderer r in renderers)
            {
                if (!initialized) { bounds = r.bounds; initialized = true; }
                else bounds.Encapsulate(r.bounds);
            }

            if (bounds.size.y < 0.0001f)
                return;

            float scale = targetHeight / bounds.size.y;
            root.localScale *= scale;

            // Recompute the offset from the original world bounds (no rotation assumed).
            Vector3 center = bounds.center;
            Vector3 min = bounds.min;
            Vector3 offset = new Vector3(-center.x * scale, -min.y * scale, -center.z * scale);
            root.position = offset;
        }

        private static bool FacesBackward(List<Renderer> renderers)
        {
            float minZ = float.MaxValue;
            float maxZ = float.MinValue;
            bool any = false;

            foreach (Renderer r in renderers)
            {
                Mesh mesh = null;
                if (r is SkinnedMeshRenderer smr)
                    mesh = smr.sharedMesh;
                else
                {
                    var filter = r.GetComponent<MeshFilter>();
                    if (filter != null) mesh = filter.sharedMesh;
                }
                if (mesh == null || !mesh.isReadable)
                    continue;

                Vector3[] verts = mesh.vertices;
                Matrix4x4 matrix = r.transform.localToWorldMatrix;
                for (int i = 0; i < verts.Length; i += 3)
                {
                    Vector3 w = matrix.MultiplyPoint3x4(verts[i]);
                    if (w.y > 0.18f)
                        continue;
                    minZ = Mathf.Min(minZ, w.z);
                    maxZ = Mathf.Max(maxZ, w.z);
                    any = true;
                }
            }

            if (!any)
                return false;

            // Toes reach further from the ankle than heels; the larger extent is the front.
            return -minZ > maxZ + 0.005f;
        }

        private static GameObject BuildFallbackBody(Transform parent)
        {
            var root = new GameObject("TCM_Body_Fallback");
            root.transform.SetParent(parent, false);

            void Blob(string name, Vector3 pos, Vector3 scale)
            {
                GameObject go = GameObject.CreatePrimitive(PrimitiveType.Sphere);
                go.name = name;
                Destroy(go.GetComponent<Collider>());
                go.transform.SetParent(root.transform, false);
                go.transform.localPosition = pos;
                go.transform.localScale = scale;
            }

            Blob("Head", new Vector3(0f, 1.60f, 0f), new Vector3(0.20f, 0.23f, 0.20f));
            Blob("Chest", new Vector3(0f, 1.26f, 0f), new Vector3(0.40f, 0.34f, 0.24f));
            Blob("Waist", new Vector3(0f, 1.02f, 0f), new Vector3(0.30f, 0.26f, 0.20f));
            Blob("Pelvis", new Vector3(0f, 0.88f, 0f), new Vector3(0.34f, 0.24f, 0.22f));
            Blob("ArmL", new Vector3(0.26f, 1.12f, 0f), new Vector3(0.11f, 0.44f, 0.11f));
            Blob("ArmR", new Vector3(-0.26f, 1.12f, 0f), new Vector3(0.11f, 0.44f, 0.11f));
            Blob("ForearmL", new Vector3(0.30f, 0.86f, 0f), new Vector3(0.09f, 0.34f, 0.09f));
            Blob("ForearmR", new Vector3(-0.30f, 0.86f, 0f), new Vector3(0.09f, 0.34f, 0.09f));
            Blob("ThighL", new Vector3(0.10f, 0.66f, 0f), new Vector3(0.15f, 0.48f, 0.15f));
            Blob("ThighR", new Vector3(-0.10f, 0.66f, 0f), new Vector3(0.15f, 0.48f, 0.15f));
            Blob("CalfL", new Vector3(0.11f, 0.24f, 0f), new Vector3(0.12f, 0.36f, 0.12f));
            Blob("CalfR", new Vector3(-0.11f, 0.24f, 0f), new Vector3(0.12f, 0.36f, 0.12f));
            return root;
        }

        public void ApplyState(TcmState state, float time)
        {
            _breath = 0.88f + 0.12f * Mathf.Sin(time * 1.1f + state.qiFlow * 0.5f);

            Color tint = state.bodyTint;
            Color rim = Color.Lerp(new Color(0.55f, 0.90f, 1f), tint, 0.55f);

            if (BodyMaterial != null)
            {
                BodyMaterial.SetColor(ColorId, tint);
                BodyMaterial.SetColor(RimColorId, rim);
                BodyMaterial.SetFloat(IntensityId, 0.60f + 0.25f * state.qiFlow);
                BodyMaterial.SetFloat(PulseId, 0.4f + 0.6f * state.qiFlow);
                BodyMaterial.SetFloat(BlockageId, state.stagnation);
                BodyMaterial.SetFloat(InflammationId, state.inflammation);
                BodyMaterial.SetFloat(AlphaId, 0.035f);
                BodyMaterial.SetFloat(RimStrengthId, 0.60f);
                BodyMaterial.SetFloat(ScanStrengthId, 0.05f);
                BodyMaterial.SetFloat(SweepStrengthId, 0.12f);
                BodyMaterial.SetFloat(RimPowerId, 3.0f);
            }

            if (WireMaterial != null)
            {
                WireMaterial.SetColor(ColorId, Color.Lerp(new Color(0.25f, 0.85f, 1f), tint, 0.5f));
                WireMaterial.SetFloat(AlphaId, 0.10f + 0.10f * state.qiFlow);
                WireMaterial.SetFloat(IntensityId, 0.35f + 0.28f * state.qiFlow + state.inflammation * 0.2f);
            }
        }

        public void SetWireVisible(bool visible)
        {
            if (_wireRoot != null)
                _wireRoot.SetActive(visible);
        }
    }
}
