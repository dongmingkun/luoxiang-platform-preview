using System;
using TCM.CameraRig;
using TCM.Core;
using TCM.UI;
using TCM.Visualization;
using UnityEngine;

namespace TCM.Bootstrap
{
    /// <summary>
    /// Owns the demo state machine: preset transitions, the 24h meridian clock,
    /// keyboard shortcuts and the per-frame push into every visual system.
    /// </summary>
    public class TcmDemoController : MonoBehaviour
    {
        public TcmState Target { get; private set; }
        public TcmState Current { get; private set; }
        public float TimeOfDay { get; private set; } = 3.4f; // 寅时，肺经当令
        public float ClockSpeedHoursPerSecond { get; set; } = 0.55f;
        public bool ClockPaused { get; private set; }
        public bool AutoCycle { get; private set; }
        public bool ShowVessels { get; private set; } = true;
        public bool ShowClock { get; private set; } = true;
        public bool ShowWire { get; private set; } = false;
        public bool ShowOrgans { get; private set; } = true;
        public bool ShowSkeleton { get; private set; } = true;

        public event Action<TcmState> StateChanged;

        public MeridianClockEntry ActiveClockEntry => MeridianClockData.ForHour(TimeOfDay);
        public int ActiveClockIndex => MeridianClockData.IndexForHour(TimeOfDay);

        private TcmDataset _data;
        private MeridianNetworkView _network;
        private BodyHologramView _body;
        private YinYangCore _core;
        private MeridianClockView _clock;
        private DantianOrbs _dantians;
        private OrbitCamera _orbit;
        private AnatomyView _anatomy;
        private ControlPanel _ui;

        private TcmState _blendFrom;
        private float _blend = 1f;
        private float _blendDuration = 0.9f;
        private int _presetIndex;
        private float _autoTimer;

        public void Initialize(TcmDataset data, MeridianNetworkView network, BodyHologramView body,
            YinYangCore core, MeridianClockView clock, DantianOrbs dantians, OrbitCamera orbit,
            AnatomyView anatomy)
        {
            _data = data;
            _network = network;
            _body = body;
            _core = core;
            _clock = clock;
            _dantians = dantians;
            _orbit = orbit;
            _anatomy = anatomy;

            Target = TcmPresets.Normal.Clone();
            Current = Target.Clone();
            _presetIndex = 0;
            _blend = 1f;

            if (_clock != null) _clock.SetVisible(ShowClock);
            if (_network != null) _network.SetVisible(true, ShowVessels);
            if (_body != null) _body.SetWireVisible(ShowWire);
            if (_anatomy != null) _anatomy.SetVisible(ShowOrgans, ShowSkeleton);
        }

        public void AttachUi(ControlPanel ui)
        {
            _ui = ui;
        }

        public void SetPreset(int index)
        {
            if (index < 0 || index >= TcmPresets.All.Length)
                return;

            _presetIndex = index;
            BeginTransition(TcmPresets.All[index].Clone(), 0.9f);
            _autoTimer = 0f;
        }

        public void ApplyCustom(float yin, float yang, float qiFlow, float bloodFlow, float stagnation)
        {
            _presetIndex = -1;
            AutoCycle = false;
            BeginTransition(TcmPresets.CreateCustom(
                Mathf.Clamp01(yin),
                Mathf.Clamp01(yang),
                Mathf.Clamp(qiFlow, 0f, 2f),
                Mathf.Clamp(bloodFlow, 0f, 2f),
                Mathf.Clamp01(stagnation)), 0.28f);
        }

        private void BeginTransition(TcmState target, float duration)
        {
            _blendFrom = Current != null ? Current.Clone() : target.Clone();
            Target = target;
            _blend = 0f;
            _blendDuration = Mathf.Max(0.05f, duration);
            StateChanged?.Invoke(Target);
        }

        public void SetAutoCycle(bool enabled)
        {
            AutoCycle = enabled;
            _autoTimer = 0f;
        }

        public void SetClockHour(float hour)
        {
            TimeOfDay = Mathf.Repeat(hour, 24f);
        }

        public void SetClockPaused(bool paused) => ClockPaused = paused;

        public void SetShowVessels(bool visible)
        {
            ShowVessels = visible;
            if (_network != null) _network.SetVisible(true, visible);
        }

        public void SetShowClock(bool visible)
        {
            ShowClock = visible;
            if (_clock != null) _clock.SetVisible(visible);
        }

        public void SetShowWire(bool visible)
        {
            ShowWire = visible;
            if (_body != null) _body.SetWireVisible(visible);
        }

        public void SetShowOrgans(bool visible)
        {
            ShowOrgans = visible;
            if (_anatomy != null) _anatomy.SetVisible(ShowOrgans, ShowSkeleton);
        }

        public void SetShowSkeleton(bool visible)
        {
            ShowSkeleton = visible;
            if (_anatomy != null) _anatomy.SetVisible(ShowOrgans, ShowSkeleton);
        }

        private void Update()
        {
            if (Target == null)
                return;

            float dt = Time.deltaTime;

            if (AutoCycle)
            {
                _autoTimer += dt;
                if (_autoTimer >= 9f)
                {
                    int next = _presetIndex < 0 ? 0 : (_presetIndex + 1) % TcmPresets.All.Length;
                    SetPreset(next);
                    _autoTimer = 0f;
                }
            }

            if (!ClockPaused)
                TimeOfDay = Mathf.Repeat(TimeOfDay + dt * ClockSpeedHoursPerSecond, 24f);

            if (_blend < 1f)
            {
                _blend = Mathf.Min(1f, _blend + dt / _blendDuration);
                float eased = Mathf.SmoothStep(0f, 1f, _blend);
                Current = TcmState.Lerp(_blendFrom, Target, eased);
            }
            else
            {
                Current = Target;
            }

            float fraction = Mathf.Repeat(TimeOfDay - ActiveClockEntry.startHour, 24f) / 2f;
            float clockPulse = Mathf.Sin(Mathf.Clamp01(fraction) * Mathf.PI);

            if (_body != null) _body.ApplyState(Current, Time.time);
            if (_network != null) _network.ApplyState(Current, ActiveClockEntry.id, clockPulse);
            if (_core != null) _core.ApplyState(Current, Time.time);
            if (_clock != null) _clock.ApplyState(Current, TimeOfDay, clockPulse);
            if (_dantians != null) _dantians.ApplyState(Current, Time.time);
            if (_anatomy != null) _anatomy.ApplyState(Current, Time.time);

            HandleShortcuts();
        }

        private void HandleShortcuts()
        {
            if (Input.GetKeyDown(KeyCode.Alpha1)) SetPreset(0);
            if (Input.GetKeyDown(KeyCode.Alpha2)) SetPreset(1);
            if (Input.GetKeyDown(KeyCode.Alpha3)) SetPreset(2);
            if (Input.GetKeyDown(KeyCode.Alpha4)) SetPreset(3);
            if (Input.GetKeyDown(KeyCode.Space)) ClockPaused = !ClockPaused;
            if (Input.GetKeyDown(KeyCode.A)) SetAutoCycle(!AutoCycle);
            if (Input.GetKeyDown(KeyCode.B)) SetShowVessels(!ShowVessels);
            if (Input.GetKeyDown(KeyCode.C)) SetShowClock(!ShowClock);
            if (Input.GetKeyDown(KeyCode.W)) SetShowWire(!ShowWire);
            if (Input.GetKeyDown(KeyCode.O)) SetShowOrgans(!ShowOrgans);
            if (Input.GetKeyDown(KeyCode.K)) SetShowSkeleton(!ShowSkeleton);
            if (Input.GetKeyDown(KeyCode.P)) CaptureScreenshot();
            if (Input.GetKeyDown(KeyCode.R) && _orbit != null) _orbit.ResetView();
            if (Input.GetKeyDown(KeyCode.F) && _orbit != null) _orbit.FocusTorso();
        }

        private void CaptureScreenshot()
        {
            string path = System.IO.Path.Combine(Application.dataPath, "../unity_capture.png");
            ScreenCapture.CaptureScreenshot(path);
            Debug.Log("[TCM] screenshot: " + path);
        }

        public string FormatClock()
        {
            int totalMinutes = Mathf.FloorToInt(TimeOfDay * 60f) % (24 * 60);
            int hours = totalMinutes / 60;
            int minutes = totalMinutes % 60;
            return $"{hours:00}:{minutes:00}";
        }

        public void SetUiVisibleByToggle()
        {
            if (_ui != null) _ui.TogglePanel();
        }
    }
}
