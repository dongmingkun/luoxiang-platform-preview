using UnityEngine;

namespace TCM.Visualization
{
    /// <summary>
    /// Runtime materials are cloned from small base materials under
    /// Assets/Resources/Materials so their shaders survive build stripping.
    /// Falls back to Shader.Find in the editor if the setup assets are missing.
    /// </summary>
    public static class TcmMaterialLibrary
    {
        public static Material Create(string resourcePath, string shaderName)
        {
            Material baseMaterial = Resources.Load<Material>(resourcePath);
            if (baseMaterial != null)
                return new Material(baseMaterial);

            Shader shader = Shader.Find(shaderName);
            if (shader == null)
            {
                Debug.LogError($"[TCM] 找不到着色器 {shaderName}，且缺少 {resourcePath}。");
                return null;
            }
            return new Material(shader);
        }
    }
}
