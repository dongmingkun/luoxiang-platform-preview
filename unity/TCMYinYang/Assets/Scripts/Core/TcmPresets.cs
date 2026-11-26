using UnityEngine;

namespace TCM.Core
{
    public static class TcmPresets
    {
        public static readonly TcmState Normal = new TcmState
        {
            id = "normal",
            displayName = "正常",
            subtitle = "阴平阳秘 · 气血周流",
            description = "阴阳各半，气机调畅，血脉和利。营卫昼夜运行，十二经脉如环无端。",
            yin = 0.5f,
            yang = 0.5f,
            qiFlow = 1.0f,
            bloodFlow = 1.0f,
            stagnation = 0f,
            inflammation = 0f,
            blockedMeridian = "",
            bodyTint = TcmPalette.Body,
        };

        public static readonly TcmState YangDeficiency = new TcmState
        {
            id = "yang-deficiency",
            displayName = "阳虚",
            subtitle = "阳不制阴 · 寒从内生",
            description = "阳气不足，温煦无力：手足不温、精神不振、水湿不化。经络流速变慢，肾经与督脉最先失于温养。",
            yin = 0.62f,
            yang = 0.22f,
            qiFlow = 0.55f,
            bloodFlow = 0.70f,
            stagnation = 0.38f,
            inflammation = 0f,
            blockedMeridian = "KI",
            bodyTint = new Color(0.30f, 0.62f, 1.00f),
        };

        public static readonly TcmState YinDeficiency = new TcmState
        {
            id = "yin-deficiency",
            displayName = "阴虚",
            subtitle = "阴不制阳 · 虚火内生",
            description = "阴液亏虚，虚热内扰：五心烦热、盗汗、口干。气血运行偏快而浮躁，心经与肾经失于濡润。",
            yin = 0.20f,
            yang = 0.64f,
            qiFlow = 1.18f,
            bloodFlow = 0.88f,
            stagnation = 0.08f,
            inflammation = 0.72f,
            blockedMeridian = "HT",
            bodyTint = new Color(1.00f, 0.48f, 0.28f),
        };

        public static readonly TcmState QiStagnation = new TcmState
        {
            id = "qi-stagnation",
            displayName = "气滞血瘀",
            subtitle = "气停血滞 · 不通则痛",
            description = "情志不遂，气机郁滞，久则血行瘀阻：胀痛、刺痛、面色晦暗。肝经出现明显阻滞，瘀点沿经聚集，血脉流速下降。",
            yin = 0.48f,
            yang = 0.44f,
            qiFlow = 0.34f,
            bloodFlow = 0.30f,
            stagnation = 0.90f,
            inflammation = 0.20f,
            blockedMeridian = "LR",
            bodyTint = new Color(0.72f, 0.42f, 0.95f),
        };

        public static readonly TcmState[] All = { Normal, YangDeficiency, YinDeficiency, QiStagnation };

        public static TcmState CreateCustom(float yin, float yang, float qiFlow, float bloodFlow, float stagnation)
        {
            return new TcmState
            {
                id = "custom",
                displayName = "自定义",
                subtitle = "随证调衡",
                description = "手动调节阴阳气血比例，观察经络明暗、流速与阻滞的变化。",
                yin = yin,
                yang = yang,
                qiFlow = qiFlow,
                bloodFlow = bloodFlow,
                stagnation = stagnation,
                inflammation = Mathf.Clamp01((yang - yin - 0.15f) * 1.6f),
                blockedMeridian = stagnation > 0.25f ? "LR" : "",
                bodyTint = Color.Lerp(TcmPalette.Body, new Color(0.85f, 0.4f, 0.75f), stagnation),
            };
        }
    }
}
