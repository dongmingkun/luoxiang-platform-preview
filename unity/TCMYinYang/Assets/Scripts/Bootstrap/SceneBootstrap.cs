using TCM.CameraRig;
using TCM.Core;
using TCM.UI;
using TCM.Visualization;
using UnityEngine;

namespace TCM.Bootstrap
{
    /// <summary>
    /// Runtime scene assembler. Drop this component in an empty scene and press
    /// Play: the whole TCM visualization is rebuilt from code and shared JSON.
    /// </summary>
    public class SceneBootstrap : MonoBehaviour
    {
        [Header("自动装配")]
        public bool autoBuild = true;

        [Header("画面")]
        public bool enableBloom = true;
        public bool enableFog = true;

        private bool _built;

        private void Awake()
        {
            if (autoBuild)
                Build();
        }

        public void Build()
        {
            if (_built)
                return;
            _built = true;

            Application.targetFrameRate = 60;
            try { QualitySettings.antiAliasing = 4; } catch { }
            try { QualitySettings.shadows = ShadowQuality.Disable; } catch { }
            SetupEnvironment();

            var root = new GameObject("TCM_Root").transform;

            TcmDataset data = TcmDataLoader.Load();
            if (data == null)
            {
                BuildErrorOverlay("未找到经络数据。\n请确认 Assets/StreamingAssets/tcm/meridians.json 存在，\n或运行 blender/scripts/build_scene.py 重新生成。");
                return;
            }

            Material bodyMaterial = TcmMaterialLibrary.Create("Materials/TCM_AnatomySkin", "TCM/AnatomySkin");
            Material wireMaterial = TcmMaterialLibrary.Create("Materials/TCM_BodyWire", "TCM/HologramWire");
            Material flowMaterial = TcmMaterialLibrary.Create("Materials/TCM_QiFlow", "TCM/QiFlow");
            Material bloodMaterial = TcmMaterialLibrary.Create("Materials/TCM_QiFlow", "TCM/QiFlow");
            Material glowMaterial = TcmMaterialLibrary.Create("Materials/TCM_Glow", "TCM/Glow");
            Material taijiMaterial = TcmMaterialLibrary.Create("Materials/TCM_Taiji", "TCM/Taiji");
            Material organMaterial = TcmMaterialLibrary.Create("Materials/TCM_Organ", "TCM/Organ");
            Material boneMaterial = TcmMaterialLibrary.Create("Materials/TCM_Bone", "TCM/Organ");

            if (bodyMaterial == null || wireMaterial == null || flowMaterial == null ||
                bloodMaterial == null || glowMaterial == null || taijiMaterial == null ||
                organMaterial == null || boneMaterial == null)
            {
                BuildErrorOverlay("未能加载 TCM 着色器或运行时材质。请执行菜单 TCM → 应用推荐工程设置，并确认项目使用 Built-in Render Pipeline。");
                return;
            }

            bodyMaterial.name = "MAT_AnatomySkin_Runtime";
            wireMaterial.name = "MAT_BodyWire_Runtime";
            flowMaterial.name = "MAT_QiFlow_Runtime";
            bloodMaterial.name = "MAT_BloodFlow_Runtime";
            organMaterial.name = "MAT_Organ_Base_Runtime";
            boneMaterial.name = "MAT_Bone_Base_Runtime";

            Shader glowShader = glowMaterial.shader;
            Shader taijiShader = taijiMaterial.shader;
            Material stasisMaterial = new Material(glowMaterial) { name = "MAT_Stasis_Runtime" };
            stasisMaterial.SetColor("_Color", TcmPalette.Blocked);
            stasisMaterial.SetFloat("_Alpha", 0.30f);
            stasisMaterial.SetFloat("_Intensity", 1.0f);
            stasisMaterial.SetFloat("_FresnelPower", 1.5f);

            var stage = gameObject.AddComponent<StageBuilder>();
            stage.Build(root, glowShader);

            var body = gameObject.AddComponent<BodyHologramView>();
            body.Build(root, bodyMaterial, wireMaterial);

            var anatomy = gameObject.AddComponent<AnatomyView>();
            anatomy.Build(body.Container, organMaterial, boneMaterial);

            var network = gameObject.AddComponent<MeridianNetworkView>();
            network.Build(data, root, flowMaterial, bloodMaterial, stasisMaterial);

            var core = gameObject.AddComponent<YinYangCore>();
            core.Build(data, root, taijiShader, glowShader);

            var baseGlow = new Material(glowMaterial) { name = "MAT_ClockGlow_Runtime" };
            baseGlow.SetColor("_Color", new Color(0.45f, 0.80f, 1f));
            Material pointerMat = new Material(glowMaterial) { name = "MAT_ClockPointer_Runtime" };
            pointerMat.SetColor("_Color", new Color(1f, 0.90f, 0.65f));
            pointerMat.SetFloat("_Alpha", 0.25f);
            pointerMat.SetFloat("_Intensity", 1.0f);
            var clock = gameObject.AddComponent<MeridianClockView>();
            clock.Build(root, flowMaterial, baseGlow, pointerMat);

            var dantians = gameObject.AddComponent<DantianOrbs>();
            dantians.Build(data, root, glowShader);

            (OrbitCamera orbit, Camera camera) = SetupCamera();
            if (enableBloom)
            {
                TcmBloom bloom = camera.gameObject.GetComponent<TcmBloom>();
                if (bloom == null) bloom = camera.gameObject.AddComponent<TcmBloom>();
                bloom.threshold = 1.8f;
                bloom.intensity = 0.25f;
                bloom.tint = new Color(0.82f, 0.94f, 1f);
            }

            SetupLights(root);

            var controller = gameObject.AddComponent<TcmDemoController>();
            controller.Initialize(data, network, body, core, clock, dantians, orbit, anatomy);

            var ui = gameObject.AddComponent<ControlPanel>();
            ui.Build(controller, network, body, clock, orbit);
            controller.AttachUi(ui);

            Debug.Log("[TCM] 阴阳二气人体经络可视化已启动。");
        }

        private void SetupEnvironment()
        {
            RenderSettings.ambientMode = UnityEngine.Rendering.AmbientMode.Flat;
            RenderSettings.ambientLight = new Color(0.055f, 0.09f, 0.14f);
            RenderSettings.skybox = null;

            RenderSettings.fog = enableFog;
            RenderSettings.fogMode = FogMode.Exponential;
            RenderSettings.fogColor = new Color(0.003f, 0.008f, 0.018f);
            RenderSettings.fogDensity = 0.035f;
        }

        private (OrbitCamera, Camera) SetupCamera()
        {
            Camera cam = Camera.main;
            if (cam == null)
            {
                var go = new GameObject("Main Camera");
                go.tag = "MainCamera";
                cam = go.AddComponent<Camera>();
                go.AddComponent<AudioListener>();
            }

            OrbitCamera orbit = cam.GetComponent<OrbitCamera>();
            if (orbit == null)
                orbit = cam.gameObject.AddComponent<OrbitCamera>();
            return (orbit, cam);
        }

        private static void SetupLights(Transform root)
        {
            var keyGo = new GameObject("KeyLight_Cool");
            keyGo.transform.SetParent(root, false);
            keyGo.transform.rotation = Quaternion.Euler(52f, -38f, 0f);
            var key = keyGo.AddComponent<Light>();
            key.type = LightType.Directional;
            key.color = new Color(0.55f, 0.72f, 1f);
            key.intensity = 0.65f;
            key.shadows = LightShadows.None;

            var warmGo = new GameObject("FillLight_Warm");
            warmGo.transform.SetParent(root, false);
            warmGo.transform.localPosition = new Vector3(2.2f, 1.6f, 2.0f);
            var warm = warmGo.AddComponent<Light>();
            warm.type = LightType.Point;
            warm.color = new Color(1f, 0.55f, 0.30f);
            warm.intensity = 1.4f;
            warm.range = 6.5f;
            warm.shadows = LightShadows.None;

            var rimGo = new GameObject("RimLight_Yin");
            rimGo.transform.SetParent(root, false);
            rimGo.transform.localPosition = new Vector3(-2.1f, 2.0f, -2.2f);
            var rim = rimGo.AddComponent<Light>();
            rim.type = LightType.Point;
            rim.color = new Color(0.20f, 0.55f, 1f);
            rim.intensity = 2.0f;
            rim.range = 7f;
            rim.shadows = LightShadows.None;
        }

        private void BuildErrorOverlay(string message)
        {
            var canvasGo = new GameObject("TCM_Error", typeof(Canvas), typeof(UnityEngine.UI.CanvasScaler));
            canvasGo.transform.SetParent(transform, false);
            var canvas = canvasGo.GetComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            canvas.sortingOrder = 100;
            var scaler = canvasGo.GetComponent<UnityEngine.UI.CanvasScaler>();
            scaler.uiScaleMode = UnityEngine.UI.CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(1920f, 1080f);

            UiFactory.ImageBox(canvasGo.transform, "Bg", 0f, 0f, 1920f, 1080f, new Color(0f, 0f, 0f, 0.85f));
            UiFactory.Label(canvasGo.transform, "Message", message, 180f, 240f, 1560f, 420f, 26,
                new Color(1f, 0.55f, 0.45f), TextAnchor.MiddleCenter);
            Debug.LogError("[TCM] " + message);
        }
    }
}
