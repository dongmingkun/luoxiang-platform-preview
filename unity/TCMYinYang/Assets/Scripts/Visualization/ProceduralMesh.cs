using UnityEngine;

namespace TCM.Visualization
{
    public static class ProceduralMesh
    {
        public static float[] NormalizedArc(Vector3[] pts)
        {
            var arc = new float[pts.Length];
            float total = 0f;
            for (int i = 1; i < pts.Length; i++)
            {
                total += Vector3.Distance(pts[i - 1], pts[i]);
                arc[i] = total;
            }
            if (total > 1e-5f)
            {
                for (int i = 0; i < arc.Length; i++)
                    arc[i] /= total;
            }
            return arc;
        }

        /// <summary>
        /// Builds a capped tube around a polyline using parallel transport frames,
        /// so vertical limbs and twisting meridians do not flip their cross-section.
        /// UV.x = normalized arc length (drives the flow shader), UV.y = around.
        /// </summary>
        public static Mesh BuildTube(Vector3[] pts, float[] arc, float radius, int radialSegments = 10)
        {
            int n = pts.Length;
            if (n < 2 || arc == null || arc.Length != n)
                return null;

            radialSegments = Mathf.Clamp(radialSegments, 4, 32);
            var tangents = new Vector3[n];
            for (int i = 0; i < n; i++)
            {
                if (i == 0) tangents[i] = (pts[1] - pts[0]).normalized;
                else if (i == n - 1) tangents[i] = (pts[n - 1] - pts[n - 2]).normalized;
                else tangents[i] = (pts[i + 1] - pts[i - 1]).normalized;
            }

            var normals = new Vector3[n];
            Vector3 seed = Mathf.Abs(Vector3.Dot(tangents[0], Vector3.up)) > 0.92f ? Vector3.right : Vector3.up;
            normals[0] = (seed - tangents[0] * Vector3.Dot(seed, tangents[0])).normalized;

            for (int i = 1; i < n; i++)
            {
                Quaternion q = Quaternion.FromToRotation(tangents[i - 1], tangents[i]);
                Vector3 candidate = q * normals[i - 1];
                candidate -= tangents[i] * Vector3.Dot(candidate, tangents[i]);
                if (candidate.sqrMagnitude < 1e-6f)
                {
                    Vector3 fallback = Mathf.Abs(Vector3.Dot(tangents[i], Vector3.up)) > 0.92f ? Vector3.right : Vector3.up;
                    candidate = fallback - tangents[i] * Vector3.Dot(fallback, tangents[i]);
                }
                normals[i] = candidate.normalized;
            }

            int ringVerts = n * radialSegments;
            var vertices = new Vector3[ringVerts + 2];
            var normalsOut = new Vector3[ringVerts + 2];
            var uvs = new Vector2[ringVerts + 2];
            var triangles = new int[(n - 1) * radialSegments * 6 + radialSegments * 6];

            for (int i = 0; i < n; i++)
            {
                Vector3 t = tangents[i];
                Vector3 nrm = normals[i];
                Vector3 bin = Vector3.Cross(t, nrm).normalized;

                for (int j = 0; j < radialSegments; j++)
                {
                    float a = j / (float)radialSegments * Mathf.PI * 2f;
                    Vector3 dir = (nrm * Mathf.Cos(a) + bin * Mathf.Sin(a)).normalized;
                    int vi = i * radialSegments + j;
                    vertices[vi] = pts[i] + dir * radius;
                    normalsOut[vi] = dir;
                    uvs[vi] = new Vector2(arc[i], j / (float)radialSegments);
                }
            }

            int tri = 0;
            for (int i = 0; i < n - 1; i++)
            {
                for (int j = 0; j < radialSegments; j++)
                {
                    int jn = (j + 1) % radialSegments;
                    int v00 = i * radialSegments + j;
                    int v01 = i * radialSegments + jn;
                    int v10 = (i + 1) * radialSegments + j;
                    int v11 = (i + 1) * radialSegments + jn;

                    triangles[tri++] = v00;
                    triangles[tri++] = v10;
                    triangles[tri++] = v11;
                    triangles[tri++] = v00;
                    triangles[tri++] = v11;
                    triangles[tri++] = v01;
                }
            }

            int startCap = ringVerts;
            int endCap = ringVerts + 1;
            vertices[startCap] = pts[0];
            vertices[endCap] = pts[n - 1];
            normalsOut[startCap] = -tangents[0];
            normalsOut[endCap] = tangents[n - 1];
            uvs[startCap] = new Vector2(arc[0], 0.5f);
            uvs[endCap] = new Vector2(arc[n - 1], 0.5f);

            for (int j = 0; j < radialSegments; j++)
            {
                int jn = (j + 1) % radialSegments;
                triangles[tri++] = startCap;
                triangles[tri++] = j;
                triangles[tri++] = jn;

                int baseEnd = (n - 1) * radialSegments;
                triangles[tri++] = endCap;
                triangles[tri++] = baseEnd + jn;
                triangles[tri++] = baseEnd + j;
            }

            var mesh = new Mesh { name = "TCM_Tube" };
            if (vertices.Length > 65000)
                mesh.indexFormat = UnityEngine.Rendering.IndexFormat.UInt32;
            mesh.vertices = vertices;
            mesh.normals = normalsOut;
            mesh.uv = uvs;
            mesh.triangles = triangles;
            mesh.RecalculateBounds();
            return mesh;
        }

        /// <summary>Unit disc in the XY plane, facing +Z. UV is centered at 0.5.</summary>
        public static Mesh BuildDisc(int segments = 96)
        {
            segments = Mathf.Max(12, segments);
            var vertices = new Vector3[segments + 1];
            var normals = new Vector3[segments + 1];
            var uvs = new Vector2[segments + 1];
            var triangles = new int[segments * 3];

            vertices[0] = Vector3.zero;
            normals[0] = Vector3.forward;
            uvs[0] = new Vector2(0.5f, 0.5f);

            for (int i = 0; i < segments; i++)
            {
                float a = i / (float)segments * Mathf.PI * 2f;
                float x = Mathf.Cos(a);
                float y = Mathf.Sin(a);
                vertices[i + 1] = new Vector3(x, y, 0f);
                normals[i + 1] = Vector3.forward;
                uvs[i + 1] = new Vector2(0.5f + x * 0.5f, 0.5f + y * 0.5f);

                int t = i * 3;
                triangles[t] = 0;
                triangles[t + 1] = i + 1;
                triangles[t + 2] = (i + 1) % segments + 1;
            }

            var mesh = new Mesh { name = "TCM_Disc" };
            mesh.vertices = vertices;
            mesh.normals = normals;
            mesh.uv = uvs;
            mesh.triangles = triangles;
            mesh.RecalculateBounds();
            return mesh;
        }

        public static GameObject CreateTubeObject(string name, Material material, Vector3[] points,
            float radius, int radialSegments, Transform parent, int layer = 0)
        {
            Vector3[] sampled = MeridianCurve.Sample(points, 10, out float[] arc);
            if (sampled.Length < 2)
                return null;

            Mesh mesh = BuildTube(sampled, arc, radius, radialSegments);
            var go = new GameObject(name);
            go.layer = layer;
            go.transform.SetParent(parent, false);
            var filter = go.AddComponent<MeshFilter>();
            filter.sharedMesh = mesh;
            var renderer = go.AddComponent<MeshRenderer>();
            renderer.sharedMaterial = material;
            renderer.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
            renderer.receiveShadows = false;
            return go;
        }
    }
}
