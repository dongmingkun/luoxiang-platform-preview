using System;
using UnityEngine;

namespace TCM.Core
{
    [Serializable]
    public class TcmDataset
    {
        public int version;
        public float bodyHeight;
        public string coordinateSpace;
        public MeridianPath[] meridians;
        public VesselPath[] vessels;
        public DantianPoint[] dantians;
        public TaijiAnchor taiji;
    }

    [Serializable]
    public class MeridianPath
    {
        public string id;
        public string baseId;
        public string name;
        public string shortName;
        public string polarity;   // "yin" | "yang"
        public string element;    // 木 火 土 金 水
        public string organ;
        public string pairedWith;
        public string side;       // L | R | C
        public Vector3[] points;  // Unity local space, character faces +Z

        public bool IsYin => polarity == "yin";
    }

    [Serializable]
    public class VesselPath
    {
        public string id;
        public string name;
        public string polarity;
        public Vector3[] points;
    }

    [Serializable]
    public class DantianPoint
    {
        public string id;
        public string name;
        public Vector3 position;
        public float radius;
    }

    [Serializable]
    public class TaijiAnchor
    {
        public Vector3 position;
        public float radius;
    }
}
