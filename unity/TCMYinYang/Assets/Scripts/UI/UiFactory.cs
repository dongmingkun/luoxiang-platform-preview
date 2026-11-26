using System;
using UnityEngine;
using UnityEngine.UI;

namespace TCM.UI
{
    public class ButtonRef
    {
        public Button Button;
        public Image Background;
        public Image Accent;
        public Text Label;
        public int Index;
    }

    public class ToggleRef
    {
        public Toggle Toggle;
        public Image Background;
        public Image Check;
        public Text Label;
    }

    public static class UiFactory
    {
        public static RectTransform Node(string name, Transform parent, float x, float y, float w, float h)
        {
            var go = new GameObject(name, typeof(RectTransform));
            var rt = go.GetComponent<RectTransform>();
            rt.SetParent(parent, false);
            rt.anchorMin = new Vector2(0f, 1f);
            rt.anchorMax = new Vector2(0f, 1f);
            rt.pivot = new Vector2(0f, 1f);
            rt.anchoredPosition = new Vector2(x, -y);
            rt.sizeDelta = new Vector2(w, h);
            return rt;
        }

        public static void Stretch(RectTransform rt, float left = 0f, float right = 0f, float top = 0f, float bottom = 0f)
        {
            rt.anchorMin = new Vector2(0f, 0f);
            rt.anchorMax = new Vector2(1f, 1f);
            rt.pivot = new Vector2(0.5f, 0.5f);
            rt.offsetMin = new Vector2(left, bottom);
            rt.offsetMax = new Vector2(-right, -top);
        }

        public static Image ImageBox(Transform parent, string name, float x, float y, float w, float h, Color color, bool raycast = false)
        {
            RectTransform rt = Node(name, parent, x, y, w, h);
            var img = rt.gameObject.AddComponent<Image>();
            img.color = color;
            img.raycastTarget = raycast;
            return img;
        }

        public static Text Label(Transform parent, string name, string text, float x, float y, float w, float h,
            int size, Color color, TextAnchor anchor = TextAnchor.UpperLeft, FontStyle style = FontStyle.Normal)
        {
            RectTransform rt = Node(name, parent, x, y, w, h);
            var t = rt.gameObject.AddComponent<Text>();
            t.font = ChineseFont.Get(size);
            t.text = text;
            t.fontSize = size;
            t.color = color;
            t.alignment = anchor;
            t.fontStyle = style;
            t.supportRichText = true;
            t.horizontalOverflow = HorizontalWrapMode.Wrap;
            t.verticalOverflow = VerticalWrapMode.Overflow;
            t.lineSpacing = 1.15f;
            t.raycastTarget = false;

            var shadow = rt.gameObject.AddComponent<Shadow>();
            shadow.effectColor = new Color(0f, 0f, 0f, 0.65f);
            shadow.effectDistance = new Vector2(1f, -1f);
            return t;
        }

        public static ButtonRef ActionButton(Transform parent, string label, int index, float x, float y, float w, float h,
            Color accent, Action<int> onClick)
        {
            RectTransform rt = Node($"Btn_{label}", parent, x, y, w, h);
            var bg = rt.gameObject.AddComponent<Image>();
            bg.color = new Color(0.035f, 0.085f, 0.13f, 0.92f);
            bg.raycastTarget = true;

            var button = rt.gameObject.AddComponent<Button>();
            button.targetGraphic = bg;
            button.transition = Selectable.Transition.None;
            button.onClick.AddListener(() => onClick?.Invoke(index));

            var accentImg = ImageBox(rt, "Accent", 0f, 7f, 3f, h - 14f, accent);
            var text = Label(rt, "Label", label, 12f, 0f, w - 18f, h, 13,
                new Color(0.82f, 0.92f, 1f), TextAnchor.MiddleLeft);

            return new ButtonRef
            {
                Button = button,
                Background = bg,
                Accent = accentImg,
                Label = text,
                Index = index,
            };
        }

        public static Slider HorizontalSlider(Transform parent, string name, float x, float y, float w, float h,
            float value, Color fillColor)
        {
            RectTransform root = Node(name, parent, x, y, w, h);
            var slider = root.gameObject.AddComponent<Slider>();

            RectTransform bgRt = Node("Background", root, 0f, 0f, w, h);
            Stretch(bgRt);
            var bg = bgRt.gameObject.AddComponent<Image>();
            bg.color = new Color(0.06f, 0.12f, 0.18f, 0.95f);
            bg.raycastTarget = true;

            RectTransform fillArea = Node("Fill Area", root, 0f, 0f, w, h);
            Stretch(fillArea, 2f, 2f, 4f, 4f);
            RectTransform fillRt = Node("Fill", fillArea, 0f, 0f, w - 4f, h - 8f);
            fillRt.anchorMin = new Vector2(0f, 0f);
            fillRt.anchorMax = new Vector2(1f, 1f);
            fillRt.pivot = new Vector2(0f, 0.5f);
            fillRt.offsetMin = Vector2.zero;
            fillRt.offsetMax = Vector2.zero;
            var fill = fillRt.gameObject.AddComponent<Image>();
            fill.color = fillColor;
            fill.raycastTarget = false;

            RectTransform handleArea = Node("Handle Slide Area", root, 0f, 0f, w, h);
            Stretch(handleArea, 7f, 7f, 0f, 0f);
            RectTransform handleRt = Node("Handle", handleArea, 0f, 0f, 14f, 14f);
            handleRt.anchorMin = new Vector2(0f, 0f);
            handleRt.anchorMax = new Vector2(0f, 1f);
            handleRt.pivot = new Vector2(0.5f, 0.5f);
            handleRt.sizeDelta = new Vector2(14f, 0f);
            handleRt.anchoredPosition = Vector2.zero;
            var handle = handleRt.gameObject.AddComponent<Image>();
            handle.color = new Color(0.80f, 0.96f, 1f);
            handle.raycastTarget = true;

            slider.fillRect = fillRt;
            slider.handleRect = handleRt;
            slider.targetGraphic = handle;
            slider.direction = Slider.Direction.LeftToRight;
            slider.transition = Selectable.Transition.ColorTint;
            slider.minValue = 0f;
            slider.maxValue = 1f;
            slider.wholeNumbers = false;
            slider.value = Mathf.Clamp01(value);
            return slider;
        }

        public static ToggleRef CheckToggle(Transform parent, string text, float x, float y, float w, bool value)
        {
            RectTransform root = Node($"Toggle_{text}", parent, x, y, w, 24f);
            var toggle = root.gameObject.AddComponent<Toggle>();

            RectTransform boxRt = Node("Box", root, 0f, 3f, 18f, 18f);
            var box = boxRt.gameObject.AddComponent<Image>();
            box.color = new Color(0.06f, 0.12f, 0.18f, 0.95f);
            box.raycastTarget = true;

            RectTransform checkRt = Node("Check", boxRt, 3f, 3f, 12f, 12f);
            var check = checkRt.gameObject.AddComponent<Image>();
            check.color = new Color(0.35f, 0.90f, 1f);
            check.raycastTarget = false;

            Text label = Label(root, "Label", text, 25f, 0f, w - 28f, 24f, 12,
                new Color(0.75f, 0.86f, 0.95f), TextAnchor.MiddleLeft);
            label.raycastTarget = true;

            toggle.targetGraphic = box;
            toggle.graphic = check;
            toggle.isOn = value;
            toggle.transition = Selectable.Transition.ColorTint;

            return new ToggleRef
            {
                Toggle = toggle,
                Background = box,
                Check = check,
                Label = label,
            };
        }

        public static void Divider(Transform parent, float y, float width)
        {
            RectTransform rt = Node("Divider", parent, 18f, y, width, 1f);
            var img = rt.gameObject.AddComponent<Image>();
            img.color = new Color(0.25f, 0.55f, 0.75f, 0.22f);
            img.raycastTarget = false;

            RectTransform glowRt = Node("Accent", parent, 18f, y, 62f, 1f);
            var glow = glowRt.gameObject.AddComponent<Image>();
            glow.color = new Color(0.30f, 0.85f, 1f, 0.55f);
            glow.raycastTarget = false;
        }
    }
}
