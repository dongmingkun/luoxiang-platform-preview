using UnityEngine;

namespace TCM.Core
{
    [System.Serializable]
    public class MeridianClockEntry
    {
        public string id;
        public string name;
        public string shichen;
        public float startHour;
        public float endHour;
        public string polarity;
        public string element;
    }

    /// <summary>
    /// 子午流注：十二经脉按地支时辰依次当令，构成一个完整的昼夜循环。
    /// 数组从子时（23:00）开始，每两个时辰一条经。
    /// </summary>
    public static class MeridianClockData
    {
        public static readonly MeridianClockEntry[] Entries =
        {
            new MeridianClockEntry { id = "GB", name = "胆经", shichen = "子时", startHour = 23f, endHour = 1f, polarity = "yang", element = "木" },
            new MeridianClockEntry { id = "LR", name = "肝经", shichen = "丑时", startHour = 1f, endHour = 3f, polarity = "yin", element = "木" },
            new MeridianClockEntry { id = "LU", name = "肺经", shichen = "寅时", startHour = 3f, endHour = 5f, polarity = "yin", element = "金" },
            new MeridianClockEntry { id = "LI", name = "大肠经", shichen = "卯时", startHour = 5f, endHour = 7f, polarity = "yang", element = "金" },
            new MeridianClockEntry { id = "ST", name = "胃经", shichen = "辰时", startHour = 7f, endHour = 9f, polarity = "yang", element = "土" },
            new MeridianClockEntry { id = "SP", name = "脾经", shichen = "巳时", startHour = 9f, endHour = 11f, polarity = "yin", element = "土" },
            new MeridianClockEntry { id = "HT", name = "心经", shichen = "午时", startHour = 11f, endHour = 13f, polarity = "yin", element = "火" },
            new MeridianClockEntry { id = "SI", name = "小肠经", shichen = "未时", startHour = 13f, endHour = 15f, polarity = "yang", element = "火" },
            new MeridianClockEntry { id = "BL", name = "膀胱经", shichen = "申时", startHour = 15f, endHour = 17f, polarity = "yang", element = "水" },
            new MeridianClockEntry { id = "KI", name = "肾经", shichen = "酉时", startHour = 17f, endHour = 19f, polarity = "yin", element = "水" },
            new MeridianClockEntry { id = "PC", name = "心包经", shichen = "戌时", startHour = 19f, endHour = 21f, polarity = "yin", element = "火" },
            new MeridianClockEntry { id = "TE", name = "三焦经", shichen = "亥时", startHour = 21f, endHour = 23f, polarity = "yang", element = "火" },
        };

        public static int IndexForHour(float hour)
        {
            float h = Mathf.Repeat(hour, 24f);
            return Mathf.FloorToInt(Mathf.Repeat(h + 1f, 24f) / 2f) % Entries.Length;
        }

        public static MeridianClockEntry ForHour(float hour) => Entries[IndexForHour(hour)];

        /// <summary>Clockwise angle in degrees for a clock index (0 at top).</summary>
        public static float AngleForIndex(int index, int count)
        {
            return 90f - index * (360f / count);
        }
    }
}
