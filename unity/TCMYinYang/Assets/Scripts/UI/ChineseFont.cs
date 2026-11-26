using UnityEngine;

namespace TCM.UI
{
    public static class ChineseFont
    {
        private static Font _font;
        private static bool _attempted;

        public static Font Get(int size = 24)
        {
            if (_font != null) return _font;
            if (_attempted) return null;
            _attempted = true;

            string[] candidates =
            {
                "Microsoft YaHei UI", "Microsoft YaHei", "微软雅黑",
                "SimHei", "黑体", "PingFang SC", "Hiragino Sans GB",
                "Noto Sans CJK SC", "Source Han Sans SC", "Arial Unicode MS",
            };

            try
            {
                _font = Font.CreateDynamicFontFromOSFont(candidates, size);
            }
            catch (System.Exception e)
            {
                Debug.LogWarning($"[TCM] 中文字体加载失败: {e.Message}");
            }

            if (_font == null)
            {
                try { _font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf"); }
                catch { /* older Unity */ }
            }
            if (_font == null)
            {
                try { _font = Resources.GetBuiltinResource<Font>("Arial.ttf"); }
                catch { /* give up */ }
            }

            if (_font == null)
                Debug.LogWarning("[TCM] 未找到可用字体，UI 中文可能显示为方块。");
            return _font;
        }
    }
}
