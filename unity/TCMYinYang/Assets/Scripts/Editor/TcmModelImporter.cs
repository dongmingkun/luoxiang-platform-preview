#if UNITY_EDITOR
using UnityEditor;
using UnityEngine;

namespace TCM.EditorTools
{
    /// <summary>
    /// Makes the generated TCM models CPU-readable and stops Unity from creating
    /// placeholder materials. Readability lets the runtime auto-detect whether the
    /// FBX faces +Z and correct a 180° axis mismatch from Blender.
    /// </summary>
    public class TcmModelImporter : AssetPostprocessor
    {
        private void OnPreprocessModel()
        {
            if (!assetPath.Replace('\\', '/').Contains("/Resources/Models/TCM_"))
                return;

            var importer = (ModelImporter)assetImporter;
            importer.isReadable = true;
            importer.importAnimation = false;
            importer.importBlendShapes = false;
            importer.importNormals = ModelImporterNormals.Import;
            importer.materialImportMode = ModelImporterMaterialImportMode.None;
            importer.useFileScale = true;
            importer.globalScale = 1f;
        }
    }
}
#endif
