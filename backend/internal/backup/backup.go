package backup

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"
)

type Meta struct {
	ID        string `json:"id"`
	Original  string `json:"original"`
	Backup    string `json:"backup"`
	Timestamp string `json:"timestamp"`
	User      string `json:"user"`
	SHA256    string `json:"sha256"`
	Exists    bool   `json:"exists"`
}

func checksum(content string) string {
	h := sha256.Sum256([]byte(content))
	return fmt.Sprintf("%x", h)
}

func backupDir(dir string) error {
	return os.MkdirAll(dir, 0o755)
}

var backupIDRe = regexp.MustCompile(`^[A-Za-z0-9._-]+\.ya?ml$`)

func randomSuffix() string {
	b := make([]byte, 4)
	if _, err := rand.Read(b); err != nil {
		return fmt.Sprintf("%d", time.Now().UnixNano())
	}
	return hex.EncodeToString(b)
}

func safeJoin(base, name string) (string, error) {
	root, err := filepath.Abs(base)
	if err != nil {
		return "", err
	}
	target, err := filepath.Abs(filepath.Join(root, name))
	if err != nil {
		return "", err
	}
	if target != root && !strings.HasPrefix(target, root+string(filepath.Separator)) {
		return "", fmt.Errorf("path escapes backup directory")
	}
	return target, nil
}

// Create writes a timestamped backup of srcPath with content under backupDir.
func Create(backupDirPath, srcPath, content, user string) (string, error) {
	if err := backupDir(backupDirPath); err != nil {
		return "", err
	}
	base := filepath.Base(srcPath)
	ext := filepath.Ext(base)
	stem := strings.TrimSuffix(base, ext)
	ts := time.Now().UTC().Format("20060102-150405.000000000")
	backupName := fmt.Sprintf("%s-%s-%s%s", stem, ts, randomSuffix(), ext)
	backupPath := filepath.Join(backupDirPath, backupName)

	if err := os.WriteFile(backupPath, []byte(content), 0o644); err != nil {
		return "", err
	}

	id := backupName // id == backup filename
	meta := Meta{
		ID:        id,
		Original:  base,
		Backup:    backupName,
		Timestamp: time.Now().UTC().Format(time.RFC3339),
		User:      user,
		SHA256:    checksum(content),
		Exists:    true,
	}
	mb, err := json.MarshalIndent(meta, "", "  ")
	if err != nil {
		return "", err
	}
	if err := os.WriteFile(backupPath+".meta.json", mb, 0o644); err != nil {
		return "", err
	}

	return backupName, nil
}

// List returns backups, newest first. If originalName != "", filters by it.
func List(backupDirPath, originalName string) ([]Meta, error) {
	entries, err := os.ReadDir(backupDirPath)
	if os.IsNotExist(err) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	var metas []Meta
	for i := len(entries) - 1; i >= 0; i-- {
		e := entries[i]
		if !strings.HasSuffix(e.Name(), ".meta.json") {
			continue
		}
		path := filepath.Join(backupDirPath, e.Name())
		b, err := os.ReadFile(path)
		if err != nil {
			continue
		}
		var m Meta
		if err := json.Unmarshal(b, &m); err != nil {
			continue
		}
		if originalName != "" && m.Original != originalName {
			continue
		}
		backupFile := filepath.Join(backupDirPath, m.Backup)
		_, statErr := os.Stat(backupFile)
		m.Exists = statErr == nil
		metas = append(metas, m)
	}
	return metas, nil
}

// GetContent returns the backup file content and its metadata.
func GetContent(backupDirPath, id string) (string, *Meta, error) {
	if !backupIDRe.MatchString(id) || filepath.Base(id) != id {
		return "", nil, fmt.Errorf("invalid backup id: %s", id)
	}
	metaPath, err := safeJoin(backupDirPath, id+".meta.json")
	if err != nil {
		return "", nil, fmt.Errorf("invalid backup id: %s", id)
	}
	b, err := os.ReadFile(metaPath)
	if err != nil {
		return "", nil, fmt.Errorf("backup not found: %s", id)
	}
	var m Meta
	if err := json.Unmarshal(b, &m); err != nil {
		return "", nil, err
	}
	if !backupIDRe.MatchString(m.Backup) || filepath.Base(m.Backup) != m.Backup {
		return "", nil, fmt.Errorf("invalid backup metadata: %s", m.Backup)
	}
	backupPath, err := safeJoin(backupDirPath, m.Backup)
	if err != nil {
		return "", nil, fmt.Errorf("invalid backup metadata: %s", m.Backup)
	}
	content, err := os.ReadFile(backupPath)
	if err != nil {
		return "", nil, fmt.Errorf("backup file missing: %s", m.Backup)
	}
	return string(content), &m, nil
}

// Diff returns a unified diff string (backup as "old", current as "new").
func Diff(backup, current string) string {
	bLines := strings.Split(backup, "\n")
	cLines := strings.Split(current, "\n")
	return unifiedDiff(bLines, cLines, "backup", "current")
}

func unifiedDiff(old, new []string, fromLabel, toLabel string) string {
	// Simple line-based diff — sufficient for YAML config files
	var sb strings.Builder
	sb.WriteString(fmt.Sprintf("--- %s\n+++ %s\n", fromLabel, toLabel))

	i, j := 0, 0
	for i < len(old) || j < len(new) {
		if i < len(old) && j < len(new) && old[i] == new[j] {
			sb.WriteString(" " + old[i] + "\n")
			i++
			j++
		} else if i < len(old) {
			sb.WriteString("-" + old[i] + "\n")
			i++
		} else {
			sb.WriteString("+" + new[j] + "\n")
			j++
		}
	}
	return sb.String()
}
