using System;
using TCM.Bootstrap;
using TCM.CameraRig;
using TCM.Core;
using TCM.Visualization;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.UI;

namespace TCM.UI
{
    public class ControlPanel : MonoBehaviour
    {
        private TcmDemoController _controller;
        private Canvas _canvas;
        private GameObject _panel;
        private GameObject _hint;
        private Text _stateLine;
        private Text _desc;
        private Text _clockText;
        private Text _yinVal;
        private Text _yangVal;
        private Text _qiVal;
        private Text _bloodVal;
        private Text _stasisVal;
        private Slider _yin;
        private Slider _yang;
        private Slider _qi;
        private Slider _blood;
        private Slider _stasis;
        private Slider _time;
        private ToggleRef _autoToggle;
        private ToggleRef _vesselToggle;
        private ToggleRef _clockToggle;
        private ToggleRef _wireToggle;
        private ToggleRef _organToggle;
        private ToggleRef _boneToggle;
        private ButtonRef[] _presetButtons;
        private bool _suppress;
        private bool _panelVisible = true;

        private static readonly Color TextMain = new Color(0.86f, 0.94f, 1f);
        private static readonly Color TextDim = new Color(0.52f, 0.64f, 0.74f);
        private static readonly Color AccentCyan = new Color(0.30f, 0.85f, 1f);
        private static readonly Color AccentYang = new Color(1f, 0.42f, 0.18f);
        private static readonly Color AccentPurple = new Color(0.66f, 0.32f, 1f);

        public void Build(TcmDemoController controller, MeridianNetworkView network, BodyHologramView body,
            MeridianClockView clock, OrbitCamera orbit)
        {
            _controller = controller;

            EnsureEventSystem();
            CreateCanvas();

            var panelRt = UiFactory.Node("ControlPanel", _canvas.transform, 24f, 24f, 400f, 864f);
            _panel = panelRt.gameObject;
            var panelBg = _panel.AddComponent<Image>();
            panelBg.color = new Color(0.014f, 0.032f, 0.056f, 0.86f);
            panelBg.raycastTarget = true;

            BuildHeader(panelRt);
            BuildPresets(panelRt);
            BuildSliders(panelRt);
            BuildToggles(panelRt);
            BuildClock(panelRt);
            BuildFooter(panelRt);
            BuildHint();

            controller.StateChanged += Refresh;
            Refresh(controller.Target);
        }

        private void OnDestroy()
        {
            if (_controller != null)
                _controller.StateChanged -= Refresh;
        }

        private static void EnsureEventSystem()
        {
            if (FindAnyObjectByType<EventSystem>() != null)
                return;
            var go = new GameObject("EventSystem");
            go.AddComponent<EventSystem>();
            go.AddComponent<StandaloneInputModule>();
        }

        private void CreateCanvas()
        {
            var canvasGo = new GameObject("TCM_UI", typeof(Canvas), typeof(CanvasScaler), typeof(GraphicRaycaster));
            canvasGo.transform.SetParent(transform, false);
            _canvas = canvasGo.GetComponent<Canvas>();
            _canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            _canvas.sortingOrder = 10;

            var scaler = canvasGo.GetComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(1920f, 1080f);
            scaler.matchWidthOrHeight = 0.5f;
        }

        private void BuildHeader(Transform panel)
        {
            UiFactory.ImageBox(panel, "AccentCyan", 20f, 18f, 3f, 26f, AccentCyan, true);
            UiFactory.ImageBox(panel, "AccentYang", 25f, 26f, 2f, 18f, AccentYang, true);

            UiFactory.Label(panel, "Title", "阴阳二气 · 经络流注", 34f, 13f, 312f, 30f, 22, TextMain,
                TextAnchor.MiddleLeft, FontStyle.Bold);
            UiFactory.Label(panel, "Subtitle", "TCM YIN-YANG · MERIDIAN FLOW", 34f, 44f, 312f, 16f, 9,
                new Color(0.38f, 0.62f, 0.74f), TextAnchor.MiddleLeft);

            _stateLine = UiFactory.Label(panel, "StateLine", "", 20f, 64f, 360f, 18f, 12,
                new Color(0.72f, 0.86f, 0.95f), TextAnchor.MiddleLeft);

            BuildHideButton(panel);
            UiFactory.Divider(panel, 88f, 360f);
            Section(panel, "证候预设", "PATTERN", 98f);
        }

        private void BuildHideButton(Transform panel)
        {
            RectTransform rt = UiFactory.Node("HideButton", panel, 358f, 12f, 26f, 24f);
            var bg = rt.gameObject.AddComponent<Image>();
            bg.color = new Color(0.05f, 0.10f, 0.15f, 0.9f);
            bg.raycastTarget = true;
            var button = rt.gameObject.AddComponent<Button>();
            button.targetGraphic = bg;
            button.transition = Selectable.Transition.ColorTint;
            button.onClick.AddListener(TogglePanel);
            UiFactory.Label(rt, "X", "×", 0f, -1f, 26f, 24f, 16,
                new Color(0.55f, 0.72f, 0.82f), TextAnchor.MiddleCenter);
        }

        private void BuildPresets(Transform panel)
        {
            _presetButtons = new ButtonRef[TcmPresets.All.Length];
            Color[] accents =
            {
                AccentCyan,
                new Color(0.18f, 0.52f, 1f),
                AccentYang,
                AccentPurple,
            };

            for (int i = 0; i < TcmPresets.All.Length; i++)
            {
                int index = i;
                float x = 20f + (i % 2) * 182f;
                float y = 124f + (i / 2) * 46f;
                _presetButtons[i] = UiFactory.ActionButton(
                    panel, TcmPresets.All[i].displayName, index, x, y, 174f, 40f,
                    accents[i], _ => _controller.SetPreset(index));
            }

            _desc = UiFactory.Label(panel, "Description", "", 20f, 222f, 360f, 62f, 12,
                TextDim, TextAnchor.UpperLeft);
            UiFactory.Divider(panel, 292f, 360f);
            Section(panel, "阴阳气血", "BALANCE", 302f);
        }

        private void BuildSliders(Transform panel)
        {
            string[] labels = { "阴 Yin", "阳 Yang", "气机 Qi", "血行 Blood", "瘀滞 Stasis" };
            Color[] colors =
            {
                new Color(0.18f, 0.66f, 1f),
                new Color(1f, 0.42f, 0.16f),
                new Color(0.25f, 0.88f, 0.92f),
                new Color(0.90f, 0.12f, 0.16f),
                new Color(0.66f, 0.28f, 1f),
            };

            var sliders = new Slider[5];
            var values = new Text[5];
            for (int i = 0; i < 5; i++)
            {
                float y = 328f + i * 48f;
                UiFactory.Label(panel, $"Lbl{i}", labels[i], 20f, y, 180f, 16f, 12,
                    new Color(0.70f, 0.82f, 0.90f), TextAnchor.MiddleLeft);
                values[i] = UiFactory.Label(panel, $"Val{i}", "", 250f, y, 130f, 16f, 11,
                    new Color(0.55f, 0.80f, 0.90f), TextAnchor.MiddleRight);
                sliders[i] = UiFactory.HorizontalSlider(panel, $"Slider{i}", 20f, y + 18f, 360f, 12f, 0.5f, colors[i]);
                Slider captured = sliders[i];
                captured.onValueChanged.AddListener(_ => OnSlidersChanged());
            }

            _yin = sliders[0];
            _yang = sliders[1];
            _qi = sliders[2];
            _blood = sliders[3];
            _stasis = sliders[4];
            _yinVal = values[0];
            _yangVal = values[1];
            _qiVal = values[2];
            _bloodVal = values[3];
            _stasisVal = values[4];

            UiFactory.Divider(panel, 572f, 360f);
            Section(panel, "演示控制", "DISPLAY", 582f);
        }

        private void BuildToggles(Transform panel)
        {
            _autoToggle = UiFactory.CheckToggle(panel, "自动循证", 20f, 610f, 116f, false);
            _vesselToggle = UiFactory.CheckToggle(panel, "显示血脉", 140f, 610f, 116f, true);
            _clockToggle = UiFactory.CheckToggle(panel, "子午流注", 260f, 610f, 116f, true);
            _wireToggle = UiFactory.CheckToggle(panel, "全息线框", 20f, 638f, 116f, false);
            _organToggle = UiFactory.CheckToggle(panel, "显示器官", 140f, 638f, 116f, true);
            _boneToggle = UiFactory.CheckToggle(panel, "显示骨骼", 260f, 638f, 116f, true);

            _autoToggle.Toggle.onValueChanged.AddListener(v => _controller.SetAutoCycle(v));
            _vesselToggle.Toggle.onValueChanged.AddListener(v => _controller.SetShowVessels(v));
            _clockToggle.Toggle.onValueChanged.AddListener(v => _controller.SetShowClock(v));
            _wireToggle.Toggle.onValueChanged.AddListener(v => _controller.SetShowWire(v));
            _organToggle.Toggle.onValueChanged.AddListener(v => _controller.SetShowOrgans(v));
            _boneToggle.Toggle.onValueChanged.AddListener(v => _controller.SetShowSkeleton(v));

            BuildZangLegend(panel);
            UiFactory.Divider(panel, 688f, 360f);
            Section(panel, "子午流注", "MERIDIAN CLOCK", 696f);
        }

        private void BuildZangLegend(Transform panel)
        {
            UiFactory.Label(panel, "ZangTitle", "五脏", 20f, 666f, 40f, 18f, 11,
                new Color(0.62f, 0.76f, 0.86f), TextAnchor.MiddleLeft);
            for (int i = 0; i < AnatomyView.ZangKeys.Length; i++)
            {
                string key = AnatomyView.ZangKeys[i];
                UiFactory.Label(panel, $"Zang_{key}", AnatomyView.ChineseName(key),
                    62f + i * 58f, 666f, 54f, 18f, 12, AnatomyView.ColorFor(key), TextAnchor.MiddleLeft);
            }
        }

        private void BuildClock(Transform panel)
        {
            _clockText = UiFactory.Label(panel, "ClockText", "", 20f, 718f, 360f, 22f, 13,
                new Color(0.72f, 0.90f, 1f), TextAnchor.MiddleLeft);

            _time = UiFactory.HorizontalSlider(panel, "TimeSlider", 20f, 746f, 360f, 12f, 3.4f / 24f,
                new Color(1f, 0.72f, 0.28f));
            _time.minValue = 0f;
            _time.maxValue = 24f;
            _time.value = _controller.TimeOfDay;
            _time.onValueChanged.AddListener(v =>
            {
                if (!_suppress) _controller.SetClockHour(v);
            });

            UiFactory.Label(panel, "TimeHint", "拖动滑杆查看十二时辰的经气循环", 20f, 764f, 360f, 14f, 11,
                TextDim, TextAnchor.MiddleLeft);
            UiFactory.Divider(panel, 792f, 360f);
        }

        private void BuildFooter(Transform panel)
        {
            UiFactory.Label(panel, "Footer",
                "1–4 证候 · Space 暂停流注 · A 自动循环 · B 血脉\nC 流注环 · W 线框 · O 器官 · K 骨骼 · F 聚焦 · H 隐藏",
                20f, 804f, 360f, 54f, 11, new Color(0.42f, 0.55f, 0.65f), TextAnchor.UpperLeft);
        }

        private void BuildHint()
        {
            RectTransform rt = UiFactory.Node("UiHint", _canvas.transform, 24f, 24f, 252f, 36f);
            rt.anchorMin = new Vector2(0f, 0f);
            rt.anchorMax = new Vector2(0f, 0f);
            rt.pivot = new Vector2(0f, 0f);
            rt.anchoredPosition = new Vector2(24f, 24f);
            var bg = rt.gameObject.AddComponent<Image>();
            bg.color = new Color(0.014f, 0.032f, 0.056f, 0.8f);
            bg.raycastTarget = false;
            UiFactory.Label(rt, "HintText", "按 H 显示控制面板", 12f, 0f, 228f, 36f, 12,
                new Color(0.55f, 0.75f, 0.88f), TextAnchor.MiddleLeft);
            _hint = rt.gameObject;
            _hint.SetActive(false);
        }

        private static void Section(Transform panel, string zh, string en, float y)
        {
            UiFactory.Label(panel, $"Section_{zh}",
                $"{zh}  <size=9><color=#4F788C>{en}</color></size>",
                20f, y, 360f, 18f, 12, new Color(0.55f, 0.82f, 0.95f), TextAnchor.MiddleLeft);
        }

        private void OnSlidersChanged()
        {
            if (_suppress || _controller == null)
                return;
            _controller.ApplyCustom(_yin.value, _yang.value, _qi.value * 1.5f, _blood.value * 1.5f, _stasis.value);
            UpdateReadouts();
        }

        private void Refresh(TcmState state)
        {
            if (state == null)
                return;

            string accent = state.id == "qi-stagnation" ? "C084FF"
                : state.id == "yin-deficiency" ? "FF8A5B"
                : state.id == "yang-deficiency" ? "5EA8FF"
                : "6FE6FF";
            _stateLine.text = $"当前证候  <color=#{accent}>{state.displayName}</color>   <color=#658092>{state.subtitle}</color>";
            _desc.text = state.description;

            _suppress = true;
            _yin.SetValueWithoutNotify(state.yin);
            _yang.SetValueWithoutNotify(state.yang);
            _qi.SetValueWithoutNotify(state.qiFlow / 1.5f);
            _blood.SetValueWithoutNotify(state.bloodFlow / 1.5f);
            _stasis.SetValueWithoutNotify(state.stagnation);
            _suppress = false;
            UpdateReadouts();

            for (int i = 0; i < _presetButtons.Length; i++)
            {
                ButtonRef b = _presetButtons[i];
                bool selected = state.id == TcmPresets.All[i].id;
                Color accentColor = i == 0 ? AccentCyan
                    : i == 1 ? new Color(0.18f, 0.52f, 1f)
                    : i == 2 ? AccentYang : AccentPurple;
                b.Background.color = selected
                    ? new Color(accentColor.r * 0.22f, accentColor.g * 0.22f, accentColor.b * 0.22f, 0.96f)
                    : new Color(0.035f, 0.085f, 0.13f, 0.92f);
                b.Accent.color = selected ? accentColor : new Color(accentColor.r, accentColor.g, accentColor.b, 0.35f);
                b.Label.color = selected ? new Color(1f, 1f, 1f) : new Color(0.68f, 0.80f, 0.88f);
                b.Label.fontStyle = selected ? FontStyle.Bold : FontStyle.Normal;
            }
        }

        private void UpdateReadouts()
        {
            if (_yinVal == null) return;
            _yinVal.text = $"{_yin.value * 100f:0}%";
            _yangVal.text = $"{_yang.value * 100f:0}%";
            _qiVal.text = $"{_qi.value * 150f:0}%";
            _bloodVal.text = $"{_blood.value * 150f:0}%";
            _stasisVal.text = $"{_stasis.value * 100f:0}%";
        }

        private void Update()
        {
            if (_controller == null)
                return;

            if (Input.GetKeyDown(KeyCode.H))
                TogglePanel();

            MeridianClockEntry entry = _controller.ActiveClockEntry;
            string color = entry.polarity == "yin" ? "6FE6FF" : "FF8A5B";
            _clockText.text =
                $"<size=15><color=#FFD98A>{_controller.FormatClock()}</color></size>  " +
                $"{entry.shichen} · <color=#{color}>{entry.name}</color>当令";

            if (!Input.GetMouseButton(0) && Mathf.Abs(_time.value - _controller.TimeOfDay) > 0.03f)
                _time.SetValueWithoutNotify(_controller.TimeOfDay);

            SyncToggle(_autoToggle, _controller.AutoCycle);
            SyncToggle(_vesselToggle, _controller.ShowVessels);
            SyncToggle(_clockToggle, _controller.ShowClock);
            SyncToggle(_wireToggle, _controller.ShowWire);
            SyncToggle(_organToggle, _controller.ShowOrgans);
            SyncToggle(_boneToggle, _controller.ShowSkeleton);
        }

        private static void SyncToggle(ToggleRef toggle, bool value)
        {
            if (toggle != null && toggle.Toggle.isOn != value)
                toggle.Toggle.SetIsOnWithoutNotify(value);
        }

        public void TogglePanel()
        {
            _panelVisible = !_panelVisible;
            if (_panel != null) _panel.SetActive(_panelVisible);
            if (_hint != null) _hint.SetActive(!_panelVisible);
        }
    }
}
