using System;
using System.IO;
using UnityEngine;

namespace TCM.Core
{
    public static class TcmDataLoader
    {
        public const string RelativePath = "tcm/meridians.json";

        public static TcmDataset Load()
        {
            string path = Path.Combine(Application.streamingAssetsPath, RelativePath);
            try
            {
                if (!File.Exists(path))
                {
                    Debug.LogError($"[TCM] 找不到经络数据: {path}");
                    return null;
                }

                string json = File.ReadAllText(path);
                TcmDataset data = JsonUtility.FromJson<TcmDataset>(json);
                if (data == null || data.meridians == null || data.meridians.Length == 0)
                {
                    Debug.LogError("[TCM] 经络 JSON 解析失败或内容为空。");
                    return null;
                }

                Debug.Log($"[TCM] 已载入 {data.meridians.Length} 条经脉、{data.vessels.Length} 条血脉。");
                return data;
            }
            catch (Exception e)
            {
                Debug.LogError($"[TCM] 读取经络数据异常: {e.Message}");
                return null;
            }
        }
    }
}
