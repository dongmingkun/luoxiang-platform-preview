using System.Collections.Generic;
using UnityEngine;

namespace TCM.Visualization
{
    public static class MeridianCurve
    {
        /// <summary>
        /// Samples a Catmull-Rom spline through the control points and returns
        /// points plus normalized arc length (0..1) used by the flow shader.
        /// </summary>
        public static Vector3[] Sample(Vector3[] control, int samplesPerSegment, out float[] arc)
        {
            arc = new float[0];
            if (control == null || control.Length < 2)
                return new Vector3[0];

            // Drop consecutive duplicates that would break tangents.
            var clean = new List<Vector3>(control.Length);
            foreach (Vector3 p in control)
            {
                if (clean.Count == 0 || (p - clean[clean.Count - 1]).sqrMagnitude > 1e-8f)
                    clean.Add(p);
            }
            if (clean.Count < 2)
                return new Vector3[0];

            var pts = new List<Vector3>((clean.Count - 1) * samplesPerSegment + 1);
            for (int i = 0; i < clean.Count - 1; i++)
            {
                Vector3 p0 = clean[Mathf.Max(i - 1, 0)];
                Vector3 p1 = clean[i];
                Vector3 p2 = clean[i + 1];
                Vector3 p3 = clean[Mathf.Min(i + 2, clean.Count - 1)];

                for (int s = 0; s < samplesPerSegment; s++)
                {
                    float t = s / (float)samplesPerSegment;
                    float t2 = t * t;
                    float t3 = t2 * t;
                    Vector3 v = 0.5f * (
                        2f * p1 +
                        (-p0 + p2) * t +
                        (2f * p0 - 5f * p1 + 4f * p2 - p3) * t2 +
                        (-p0 + 3f * p1 - 3f * p2 + p3) * t3);
                    pts.Add(v);
                }
            }
            pts.Add(clean[clean.Count - 1]);

            Vector3[] result = pts.ToArray();
            arc = new float[result.Length];
            float total = 0f;
            for (int i = 1; i < result.Length; i++)
            {
                total += Vector3.Distance(result[i - 1], result[i]);
                arc[i] = total;
            }
            if (total > 1e-5f)
            {
                for (int i = 0; i < arc.Length; i++)
                    arc[i] /= total;
            }
            return result;
        }

        public static Vector3[] CirclePoints(Vector3 center, float radius, float startDeg, float endDeg, int segments, bool clockwise = false)
        {
            segments = Mathf.Max(2, segments);
            var pts = new Vector3[segments + 1];
            for (int i = 0; i <= segments; i++)
            {
                float t = i / (float)segments;
                float a = Mathf.Lerp(startDeg, endDeg, clockwise ? 1f - t : t) * Mathf.Deg2Rad;
                pts[i] = center + new Vector3(Mathf.Cos(a) * radius, 0f, Mathf.Sin(a) * radius);
            }
            return pts;
        }
    }
}
