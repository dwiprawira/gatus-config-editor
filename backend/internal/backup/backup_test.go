package backup

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestGetContentRejectsPathTraversalID(t *testing.T) {
	dir := t.TempDir()
	outside := t.TempDir()
	if err := os.WriteFile(filepath.Join(outside, "evil.yaml.meta.json"), []byte(`{"backup":"secret.txt"}`), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(outside, "secret.txt"), []byte("secret"), 0o644); err != nil {
		t.Fatal(err)
	}

	_, _, err := GetContent(dir, "../"+filepath.Base(outside)+"/evil.yaml")
	if err == nil {
		t.Fatalf("expected traversal backup id to be rejected")
	}
	if !strings.Contains(err.Error(), "invalid backup id") {
		t.Fatalf("error = %v, want invalid backup id", err)
	}
}

func TestCreateProducesUniqueNamesWithinSameSecond(t *testing.T) {
	dir := t.TempDir()
	src := filepath.Join(t.TempDir(), "config.yaml")

	first, err := Create(dir, src, "one", "tester")
	if err != nil {
		t.Fatalf("first create: %v", err)
	}
	second, err := Create(dir, src, "two", "tester")
	if err != nil {
		t.Fatalf("second create: %v", err)
	}
	if first == second {
		t.Fatalf("backup names collided: %s", first)
	}
}

func TestCreatedBackupCanBeReadByID(t *testing.T) {
	dir := t.TempDir()
	src := filepath.Join(t.TempDir(), "config.yaml")
	id, err := Create(dir, src, "content", "tester")
	if err != nil {
		t.Fatalf("create: %v", err)
	}

	content, meta, err := GetContent(dir, id)
	if err != nil {
		t.Fatalf("get content: %v", err)
	}
	if content != "content" {
		t.Fatalf("content = %q, want content", content)
	}
	if meta.ID != id || meta.Backup != id {
		t.Fatalf("metadata id/backup = %q/%q, want %q", meta.ID, meta.Backup, id)
	}
}
