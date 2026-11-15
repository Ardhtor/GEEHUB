import hashlib
import json
import subprocess
import tempfile
import unittest
from pathlib import Path

from scripts.recovery_snapshot import (
    git_blob_sha1, manifest_digest, restore_snapshot, safe_relative_path, verify_manifest,
)

class RecoverySnapshotTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)

    def tearDown(self):
        self.temp.cleanup()

    def test_sha256_and_git_blob_hash_are_stable(self):
        data = b"geehub continuity"
        self.assertEqual(len(hashlib.sha256(data).hexdigest()), 64)
        self.assertEqual(git_blob_sha1(data), git_blob_sha1(data))
        self.assertEqual(git_blob_sha1(b"abc"), "f2ba8f84ab5c1bce84a7b441cb1959cfc7093b7f")

    def test_path_traversal_is_rejected(self):
        with self.assertRaises(ValueError):
            safe_relative_path("../outside.txt")
        with self.assertRaises(ValueError):
            safe_relative_path("/absolute/path")

    def test_working_tree_verification_passes(self):
        data = b"artifact record"
        (self.root / "record.json").write_bytes(data)
        manifest = {
            "source_commit": "not-used-for-working-mode",
            "entries": [{
                "path": "record.json", "size": len(data),
                "sha256": hashlib.sha256(data).hexdigest(),
                "git_blob_sha1": git_blob_sha1(data),
            }],
        }
        self.assertEqual(verify_manifest(manifest, self.root, "working"), [])

    def test_modified_file_fails_verification(self):
        (self.root / "record.json").write_bytes(b"changed")
        original = b"original"
        manifest = {
            "source_commit": "not-used-for-working-mode",
            "entries": [{
                "path": "record.json", "size": len(original),
                "sha256": hashlib.sha256(original).hexdigest(),
            }],
        }
        errors = verify_manifest(manifest, self.root, "working")
        self.assertTrue(any("Size mismatch" in e or "SHA-256 mismatch" in e for e in errors))

    def test_manifest_digest_ignores_its_own_field(self):
        manifest = {"schema_version": 1, "entries": [], "manifest_sha256": "placeholder"}
        first = manifest_digest(manifest)
        manifest["manifest_sha256"] = "different"
        self.assertEqual(first, manifest_digest(manifest))


    def test_restore_uses_snapshot_directory_and_refuses_overwrite(self):
        subprocess.run(["git", "init"], cwd=self.root, check=True, capture_output=True)
        subprocess.run(["git", "config", "user.email", "recovery-test@example.invalid"], cwd=self.root, check=True)
        subprocess.run(["git", "config", "user.name", "Recovery Test"], cwd=self.root, check=True)
        source = self.root / "archive" / "record.txt"
        source.parent.mkdir()
        source.write_bytes(b"recoverable source")
        subprocess.run(["git", "add", "archive/record.txt"], cwd=self.root, check=True)
        subprocess.run(["git", "commit", "-m", "source snapshot"], cwd=self.root, check=True, capture_output=True)
        revision = subprocess.run(["git", "rev-parse", "HEAD"], cwd=self.root, check=True, capture_output=True, text=True).stdout.strip()
        data = source.read_bytes()
        manifest = {
            "snapshot_id": "test-snapshot-001",
            "source_commit": revision,
            "entries": [{
                "path": "archive/record.txt",
                "size": len(data),
                "sha256": hashlib.sha256(data).hexdigest(),
                "git_blob_sha1": git_blob_sha1(data),
            }],
        }
        restored = restore_snapshot(manifest, self.root, Path("recovery/restored"), False, False)
        expected = self.root / "recovery" / "restored" / "test-snapshot-001" / "archive" / "record.txt"
        self.assertEqual(expected.read_bytes(), data)
        self.assertEqual(len(restored), 1)
        with self.assertRaises(FileExistsError):
            restore_snapshot(manifest, self.root, Path("recovery/restored"), False, False)

    def test_symlink_escape_is_reported(self):
        outside = self.root.parent / (self.root.name + "-outside")
        outside.write_text("secret", encoding="utf-8")
        try:
            (self.root / "link").symlink_to(outside)
            data = outside.read_bytes()
            manifest = {
                "source_commit": "not-used-for-working-mode",
                "entries": [{
                    "path": "link", "size": len(data),
                    "sha256": hashlib.sha256(data).hexdigest(),
                }],
            }
            errors = verify_manifest(manifest, self.root, "working")
            self.assertTrue(errors)
        finally:
            outside.unlink(missing_ok=True)

if __name__ == "__main__":
    unittest.main()
