"""Tests for provenance-safe reference image intake."""
import json
import struct
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from stage_reference_image import image_dimensions, image_format, stage_reference_image, validate_image_library_index, validate_reference_library


class ReferenceImageStagingTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.project = self.root / "project"
        (self.project / "07_MANIFESTS").mkdir(parents=True)
        self.source = self.root / "source.png"
        self.source.write_bytes(b"\x89PNG\r\n\x1a\n" + b"\x00\x00\x00\x0dIHDR" + struct.pack(">II", 640, 480) + b"\x08\x02\x00\x00\x00")
        manifest = {
            "schema": "geehub.reference-library/1",
            "project_id": "test-project",
            "source_of_truth": {"provider": "ChatGPT Library"},
            "collections": [{"id": "test-collection"}],
            "assets": [{
                "asset_id": "test-reference",
                "file_name": "source.png",
                "file_id": "file-test",
                "library_file_id": "libfile-test",
                "mime_type": "image/png",
                "size_bytes": 29,
                "model_generated": False,
                "collection_id": "test-collection",
                "visual_role": "primary-chest-source",
                "rights_status": "unverified-reference-only"
            }]
        }
        (self.project / "07_MANIFESTS" / "reference_library.json").write_text(json.dumps(manifest), encoding="utf-8")

    def tearDown(self):
        self.temp.cleanup()

    def test_reads_png_dimensions(self):
        self.assertEqual(image_dimensions(self.source), (640, 480))
        self.assertEqual(image_format(self.source), "png")

    def test_reads_jpeg_dimensions(self):
        jpeg = self.root / "source.jpg"
        jpeg.write_bytes(
            b"\xff\xd8\xff\xc0\x00\x11\x08"
            + struct.pack(">HH", 480, 640)
            + b"\x03\x01\x11\x00\x02\x11\x00\x03\x11\x00\xff\xd9"
        )
        self.assertEqual(image_dimensions(jpeg), (640, 480))
        self.assertEqual(image_format(jpeg), "jpeg")

    def test_reads_webp_vp8x_dimensions(self):
        webp = self.root / "source.webp"
        width, height = 640, 480
        payload = b"\x00\x00\x00\x00" + (width - 1).to_bytes(3, "little") + (height - 1).to_bytes(3, "little")
        webp.write_bytes(b"RIFF" + (22).to_bytes(4, "little") + b"WEBPVP8X" + (10).to_bytes(4, "little") + payload)
        self.assertEqual(image_dimensions(webp), (640, 480))
        self.assertEqual(image_format(webp), "webp")

    def test_validates_reference_library_provenance_fields(self):
        manifest = json.loads((self.project / "07_MANIFESTS" / "reference_library.json").read_text(encoding="utf-8"))
        self.assertEqual(validate_reference_library(manifest), [])
        manifest["assets"][0]["model_generated"] = "unknown"
        self.assertTrue(any("model_generated must be boolean" in error for error in validate_reference_library(manifest)))

    def test_validates_global_image_library_index_and_rejects_duplicate_ids(self):
        index = {
            "schema": "geehub.image-library-index/1",
            "source_of_truth": {"provider": "Dropbox Paper", "path": "/manifest.paper", "file_id": "id:paper", "revision": "rev-1"},
            "collections": [{
                "id": "test-collection",
                "assets": [{
                    "asset_id": "test-reference",
                    "file_id": "file-test",
                    "library_file_id": "libfile-test",
                    "filename": "source.png",
                    "mime_type": "image/png",
                    "size_bytes": 29,
                    "model_generated": False,
                    "role": "source"
                }]
            }]
        }
        self.assertEqual(validate_image_library_index(index), [])
        index["supplemental_candidates"] = [dict(index["collections"][0]["assets"][0])]
        self.assertTrue(any("duplicate image-library asset_id" in error for error in validate_image_library_index(index)))

    def test_stages_copy_and_writes_provenance(self):
        result = stage_reference_image(self.project, "test-reference", self.source)
        staged = Path(result["staged_path"])
        self.assertTrue(staged.is_file())
        self.assertEqual(staged.read_bytes(), self.source.read_bytes())
        self.assertTrue(self.source.is_file())
        self.assertTrue(result["original_preserved"])
        sidecar = json.loads(Path(result["sidecar"]).read_text(encoding="utf-8"))
        self.assertEqual(sidecar["library"]["library_file_id"], "libfile-test")
        self.assertEqual(sidecar["staged"]["width"], 640)
        registry = json.loads((self.project / "07_MANIFESTS" / "reference_imports.json").read_text(encoding="utf-8"))
        self.assertEqual(len(registry["assets"]), 1)

    def test_repeated_import_is_idempotent(self):
        first = stage_reference_image(self.project, "test-reference", self.source)
        second = stage_reference_image(self.project, "test-reference", self.source)
        self.assertEqual(first["sha256"], second["sha256"])
        self.assertEqual(second["status"], "already-staged")
        registry = json.loads((self.project / "07_MANIFESTS" / "reference_imports.json").read_text(encoding="utf-8"))
        self.assertEqual(len(registry["assets"]), 1)

    def test_refuses_to_overwrite_existing_different_source(self):
        stage_reference_image(self.project, "test-reference", self.source)
        changed = self.root / "changed.png"
        changed.write_bytes(b"\x89PNG\r\n\x1a\n" + b"\x00\x00\x00\x0dIHDR" + struct.pack(">II", 320, 240) + b"\x08\x02\x00\x00\x00")
        with self.assertRaises(FileExistsError):
            stage_reference_image(self.project, "test-reference", changed)


    def test_rejects_path_traversal_asset_ids(self):
        with self.assertRaisesRegex(ValueError, "lowercase letters"):
            stage_reference_image(self.project, "../escape", self.source)
        manifest = json.loads((self.project / "07_MANIFESTS" / "reference_library.json").read_text(encoding="utf-8"))
        manifest["assets"][0]["asset_id"] = "../escape"
        self.assertTrue(any("safe lowercase asset_id" in error for error in validate_reference_library(manifest)))

    def test_rejects_source_size_that_does_not_match_library_record(self):
        manifest_path = self.project / "07_MANIFESTS" / "reference_library.json"
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        manifest["assets"][0]["size_bytes"] += 1
        manifest_path.write_text(json.dumps(manifest), encoding="utf-8")
        with self.assertRaisesRegex(ValueError, "size does not match"):
            stage_reference_image(self.project, "test-reference", self.source)

    def test_rejects_symlinked_staging_directory(self):
        source_parent = self.project / "01_SOURCE"
        outside = self.root / "outside"
        outside.mkdir()
        try:
            source_parent.symlink_to(outside, target_is_directory=True)
        except OSError:
            self.skipTest("symlink creation is not available on this runner")
        with self.assertRaisesRegex(ValueError, "must not be symlinks"):
            stage_reference_image(self.project, "test-reference", self.source)

    def test_rejects_tampered_existing_provenance_sidecar(self):
        result = stage_reference_image(self.project, "test-reference", self.source)
        sidecar_path = Path(result["sidecar"])
        sidecar = json.loads(sidecar_path.read_text(encoding="utf-8"))
        sidecar["staged"]["sha256"] = "0" * 64
        sidecar_path.write_text(json.dumps(sidecar), encoding="utf-8")
        with self.assertRaisesRegex(FileExistsError, "sidecar conflicts"):
            stage_reference_image(self.project, "test-reference", self.source)

    def test_rejects_unsupported_extension_and_manifest_id(self):
        wrong = self.root / "source.gif"
        wrong.write_bytes(b"GIF89a")
        with self.assertRaises(ValueError):
            stage_reference_image(self.project, "test-reference", wrong)
        with self.assertRaises(ValueError):
            stage_reference_image(self.project, "missing-reference", self.source)


if __name__ == "__main__":
    unittest.main()
