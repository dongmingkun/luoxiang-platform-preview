#if UNITY_EDITOR
using System.IO;
using UnityEditor;
using UnityEngine;
using UnityEngine.Rendering;

namespace TCM.EditorTools
{
    /// <summary>
    /// One-time project setup so a freshly cloned repo looks right when opened:
    /// linear color space, windowed 1600x900 player, project naming.
    /// </summary>
    [InitializeOnLoad]
    public static class TcmProjectSetup
    {
        private static string MarkerPath => Path.Combine(Application.dataPath, "../ProjectSettings/TcmSetup.flag");

        static TcmProjectSetup()
        {
            EditorApplication.delayCall += AutoApply;
        }

        private static void AutoApply()
        {
            if (!File.Exists(MarkerPath))
            {
                Apply();
                return;
            }
            // Existing projects still need the newest runtime material assets.
            EnsureRuntimeAssets();
        }

        [MenuItem("TCM/重建运行时材质", false, 41)]
        public static void RebuildRuntimeAssets()
        {
            EnsureRuntimeAssets();
            AssetDatabase.Refresh();
            Debug.Log("[TCM] 运行时材质已重建。");
        }

        private static void EnsureRuntimeAssets()
        {
            if (!AssetDatabase.IsValidFolder("Assets/Resources"))
                AssetDatabase.CreateFolder("Assets", "Resources");
            if (!AssetDatabase.IsValidFolder("Assets/Resources/Materials"))
                AssetDatabase.CreateFolder("Assets/Resources", "Materials");
            EnsureMaterial("Assets/Resources/Materials/TCM_BodyHologram.mat", "TCM/BodyHologram");
            EnsureMaterial("Assets/Resources/Materials/TCM_AnatomySkin.mat", "TCM/AnatomySkin");
            EnsureMaterial("Assets/Resources/Materials/TCM_Organ.mat", "TCM/Organ");
            EnsureMaterial("Assets/Resources/Materials/TCM_Bone.mat", "TCM/Organ");
            EnsureMaterial("Assets/Resources/Materials/TCM_BodyWire.mat", "TCM/HologramWire");
            EnsureMaterial("Assets/Resources/Materials/TCM_QiFlow.mat", "TCM/QiFlow");
            EnsureMaterial("Assets/Resources/Materials/TCM_Glow.mat", "TCM/Glow");
            EnsureMaterial("Assets/Resources/Materials/TCM_Taiji.mat", "TCM/Taiji");
            EnsureMaterial("Assets/Resources/Materials/TCM_Bloom.mat", "Hidden/TCM/Bloom");

            AddAlwaysIncluded("TCM/BodyHologram");
            AddAlwaysIncluded("TCM/AnatomySkin");
            AddAlwaysIncluded("TCM/Organ");
            AddAlwaysIncluded("TCM/HologramWire");
            AddAlwaysIncluded("TCM/QiFlow");
            AddAlwaysIncluded("TCM/Glow");
            AddAlwaysIncluded("TCM/Taiji");
            AddAlwaysIncluded("Hidden/TCM/Bloom");
            AssetDatabase.SaveAssets();
        }

        private static void EnsureMaterial(string path, string shaderName)
        {
            if (AssetDatabase.LoadAssetAtPath<Material>(path) != null)
                return;

            Shader shader = Shader.Find(shaderName);
            if (shader == null)
            {
                Debug.LogWarning("[TCM] 找不到着色器: " + shaderName);
                return;
            }

            var material = new Material(shader);
            AssetDatabase.CreateAsset(material, path);
        }

        private static void AddAlwaysIncluded(string shaderName)
        {
            GraphicsSettings settings = null;
            var loaded = Resources.FindObjectsOfTypeAll<GraphicsSettings>();
            if (loaded != null && loaded.Length > 0)
                settings = loaded[0];
            if (settings == null)
                settings = AssetDatabase.LoadAssetAtPath<GraphicsSettings>("ProjectSettings/GraphicsSettings.asset");
            if (settings == null)
                return;

            Shader shader = Shader.Find(shaderName);
            if (shader == null)
                return;

            var serialized = new SerializedObject(settings);
            SerializedProperty list = serialized.FindProperty("m_AlwaysIncludedShaders");
            if (list == null)
                return;

            for (int i = 0; i < list.arraySize; i++)
            {
                if (list.GetArrayElementAtIndex(i).objectReferenceValue == shader)
                    return;
            }

            list.arraySize++;
            list.GetArrayElementAtIndex(list.arraySize - 1).objectReferenceValue = shader;
            serialized.ApplyModifiedProperties();
        }

        [MenuItem("TCM/应用推荐工程设置", false, 40)]
        public static void Apply()
        {
            try
            {
                if (PlayerSettings.colorSpace != ColorSpace.Linear)
                {
                    PlayerSettings.colorSpace = ColorSpace.Linear;
                    Debug.Log("[TCM] 已切换为 Linear 色彩空间（会触发一次资源重导入）。");
                }

                PlayerSettings.companyName = "TCM Visualization Lab";
                PlayerSettings.productName = "阴阳二气 · 人体经络可视化";
                PlayerSettings.runInBackground = true;
                PlayerSettings.defaultScreenWidth = 1600;
                PlayerSettings.defaultScreenHeight = 900;
                PlayerSettings.fullScreenMode = FullScreenMode.Windowed;
                PlayerSettings.resizableWindow = true;

                EditorSettings.serializationMode = SerializationMode.ForceText;
                EnsureRuntimeAssets();
                File.WriteAllText(MarkerPath, "TCM project setup applied.\n");
                Debug.Log("[TCM] 推荐工程设置已应用。");
            }
            catch (System.Exception e)
            {
                Debug.LogWarning("[TCM] 工程设置应用失败: " + e.Message);
            }
        }
    }
}
#endif
