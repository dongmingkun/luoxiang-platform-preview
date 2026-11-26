using System;
using UnityEngine;

namespace TCM.Core
{
    /// <summary>
    /// Complete visual/physical state of the TCM body. Values are normalized so
    /// the same state can drive shaders, UI and the meridian clock.
    /// </summary>
    [Serializable]
    public class TcmState
    {
        public string id = "normal";
        public string displayName = "正常";
        public string subtitle = "阴平阳秘";
        [TextArea(2, 4)] public string description = "阴阳各半，气机调畅，血脉和利。";

        [Range(0f, 1f)] public float yin = 0.5f;
        [Range(0f, 1f)] public float yang = 0.5f;
        [Range(0f, 2f)] public float qiFlow = 1f;
        [Range(0f, 2f)] public float bloodFlow = 1f;
        [Range(0f, 1f)] public float stagnation = 0f;
        [Range(0f, 1f)] public float inflammation = 0f;

        /// <summary>Base id of the meridian that is blocked (e.g. "LR"). Empty = none.</summary>
        public string blockedMeridian = "";
        public Color bodyTint = new Color(0.35f, 0.78f, 1f, 1f);

        public float YangRatio => (yin + yang) < 0.0001f ? 0.5f : yang / (yin + yang);
        public float Imbalance => Mathf.Abs(yang - yin);

        public TcmState Clone()
        {
            return (TcmState)MemberwiseClone();
        }

        public void CopyFrom(TcmState other)
        {
            id = other.id;
            displayName = other.displayName;
            subtitle = other.subtitle;
            description = other.description;
            yin = other.yin;
            yang = other.yang;
            qiFlow = other.qiFlow;
            bloodFlow = other.bloodFlow;
            stagnation = other.stagnation;
            inflammation = other.inflammation;
            blockedMeridian = other.blockedMeridian;
            bodyTint = other.bodyTint;
        }

        public static TcmState Lerp(TcmState a, TcmState b, float t)
        {
            t = Mathf.Clamp01(t);
            float stagnation = Mathf.Lerp(a.stagnation, b.stagnation, t);
            string blocked = stagnation > 0.05f
                ? (b.stagnation >= a.stagnation ? b.blockedMeridian : a.blockedMeridian)
                : "";

            return new TcmState
            {
                id = t < 0.5f ? a.id : b.id,
                displayName = t < 0.5f ? a.displayName : b.displayName,
                subtitle = t < 0.5f ? a.subtitle : b.subtitle,
                description = t < 0.5f ? a.description : b.description,
                yin = Mathf.Lerp(a.yin, b.yin, t),
                yang = Mathf.Lerp(a.yang, b.yang, t),
                qiFlow = Mathf.Lerp(a.qiFlow, b.qiFlow, t),
                bloodFlow = Mathf.Lerp(a.bloodFlow, b.bloodFlow, t),
                stagnation = stagnation,
                inflammation = Mathf.Lerp(a.inflammation, b.inflammation, t),
                blockedMeridian = blocked,
                bodyTint = Color.Lerp(a.bodyTint, b.bodyTint, t),
            };
        }
    }

    public static class TcmPalette
    {
        public static readonly Color Yin = new Color(0.14f, 0.62f, 1.00f, 1f);
        public static readonly Color Yang = new Color(1.00f, 0.32f, 0.10f, 1f);
        public static readonly Color Blood = new Color(0.82f, 0.04f, 0.07f, 1f);
        public static readonly Color Blocked = new Color(0.66f, 0.16f, 1.00f, 1f);
        public static readonly Color Body = new Color(0.35f, 0.78f, 1.00f, 1f);
        public static readonly Color Gold = new Color(1.00f, 0.70f, 0.26f, 1f);
        public static readonly Color Ink = new Color(0.015f, 0.03f, 0.055f, 0.86f);
        public static readonly Color Panel = new Color(0.02f, 0.05f, 0.09f, 0.78f);

        public static Color Element(string element)
        {
            switch (element)
            {
                case "木": return new Color(0.30f, 0.92f, 0.50f);
                case "火": return new Color(1.00f, 0.45f, 0.20f);
                case "土": return new Color(0.95f, 0.78f, 0.35f);
                case "金": return new Color(0.82f, 0.92f, 1.00f);
                case "水": return new Color(0.28f, 0.60f, 1.00f);
                default: return Color.white;
            }
        }
    }
}
