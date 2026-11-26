using UnityEngine;

namespace TCM.Visualization
{
    /// <summary>
    /// Minimal, dependency-free bloom for the Built-in Render Pipeline.
    /// Gives the qi/blood emission a soft energy glow without importing the
    /// Post Processing package.
    /// </summary>
    [RequireComponent(typeof(Camera))]
    public class TcmBloom : MonoBehaviour
    {
        [Range(0.1f, 4f)] public float threshold = 1.0f;
        [Range(0f, 2f)] public float intensity = 0.65f;
        [Range(0.1f, 3f)] public float blurSize = 1.1f;
        public Color tint = new Color(0.85f, 0.95f, 1f);

        private Material _material;

        private void Awake()
        {
            Material baseMaterial = Resources.Load<Material>("Materials/TCM_Bloom");
            if (baseMaterial != null)
            {
                _material = new Material(baseMaterial) { name = "MAT_TcmBloom_Runtime", hideFlags = HideFlags.HideAndDontSave };
                return;
            }

            Shader shader = Shader.Find("Hidden/TCM/Bloom");
            if (shader != null)
                _material = new Material(shader) { name = "MAT_TcmBloom_Runtime", hideFlags = HideFlags.HideAndDontSave };
            else
                Debug.LogWarning("[TCM] 未找到 Hidden/TCM/Bloom，泛光关闭。");
        }

        private void OnRenderImage(RenderTexture source, RenderTexture destination)
        {
            if (_material == null)
            {
                Graphics.Blit(source, destination);
                return;
            }

            int width = Mathf.Max(1, source.width / 2);
            int height = Mathf.Max(1, source.height / 2);
            RenderTexture a = RenderTexture.GetTemporary(width, height, 0, source.format);
            RenderTexture b = RenderTexture.GetTemporary(width, height, 0, source.format);

            _material.SetFloat("_Threshold", threshold);
            _material.SetFloat("_SoftKnee", 0.55f);
            Graphics.Blit(source, a, _material, 0);

            for (int i = 0; i < 2; i++)
            {
                _material.SetFloat("_BlurSize", blurSize * (1f + i * 1.4f));
                Graphics.Blit(a, b, _material, 1);
                Graphics.Blit(b, a, _material, 2);
            }

            _material.SetTexture("_BloomTex", a);
            _material.SetFloat("_Intensity", intensity);
            _material.SetColor("_Tint", tint);
            Graphics.Blit(source, destination, _material, 3);

            RenderTexture.ReleaseTemporary(a);
            RenderTexture.ReleaseTemporary(b);
        }

        private void OnDestroy()
        {
            if (_material != null)
                Destroy(_material);
        }
    }
}
