#if UNITY_EDITOR
using System.IO;
using TCM.Bootstrap;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace TCM.EditorTools
{
    [InitializeOnLoad]
    public static class TcmSceneBuilder
    {
        private const string ScenePath = "Assets/Scenes/TCMYinYangDemo.unity";

        static TcmSceneBuilder()
        {
            EditorApplication.delayCall += AutoCreate;
        }

        private static void AutoCreate()
        {
            if (EditorApplication.isPlayingOrWillChangePlaymode)
                return;

            if (EditorApplication.isCompiling || EditorApplication.isUpdating)
            {
                EditorApplication.delayCall += AutoCreate;
                return;
            }

            if (File.Exists(ScenePath))
                return;

            // Never overwrite unsaved user work.
            if (SceneManager.GetActiveScene().isDirty)
                return;

            CreateScene();
        }

        [MenuItem("TCM/打开演示场景", false, 1)]
        public static void OpenScene()
        {
            if (File.Exists(ScenePath))
                EditorSceneManager.OpenScene(ScenePath);
            else
                CreateScene();
        }

        [MenuItem("TCM/重建演示场景", false, 2)]
        public static void RebuildScene()
        {
            if (!EditorUtility.DisplayDialog("重建演示场景",
                    "将重新生成 Assets/Scenes/TCMYinYangDemo.unity，场景内的手动修改会丢失。继续？",
                    "重建", "取消"))
                return;
            CreateScene();
        }

        private static void CreateScene()
        {
            Directory.CreateDirectory("Assets/Scenes");
            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);

            var go = new GameObject("TCM_Demo");
            go.AddComponent<SceneBootstrap>();

            EditorSceneManager.SaveScene(scene, ScenePath);
            EditorBuildSettings.scenes = new[] { new EditorBuildSettingsScene(ScenePath, true) };
            AssetDatabase.Refresh();

            Debug.Log("[TCM] 演示场景已生成并可运行: " + ScenePath);
        }

        [MenuItem("TCM/打开 Blender 输出目录", false, 20)]
        public static void RevealBlenderOutput()
        {
            string path = Path.GetFullPath(Path.Combine(Application.dataPath, "../../../blender/output"));
            if (Directory.Exists(path))
                EditorUtility.RevealInFinder(path);
            else
                EditorUtility.DisplayDialog("Blender 输出目录", "目录不存在：\n" + path + "\n\n请先运行 blender/scripts/build_scene.py。", "好");
        }
    }
}
#endif
