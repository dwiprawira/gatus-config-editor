package discovery

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

var allowedSuffixes = map[string]bool{".yaml": true, ".yml": true}

// ConfigRoot returns the directory that contains config files.
func ConfigRoot(configPath string) string {
	info, err := os.Stat(configPath)
	if err != nil {
		return filepath.Dir(configPath)
	}
	if info.IsDir() {
		return configPath
	}
	return filepath.Dir(configPath)
}

// ListFiles returns sorted list of .yaml/.yml files under configPath.
func ListFiles(configPath string) ([]string, error) {
	info, err := os.Stat(configPath)
	if err != nil {
		return nil, nil // path doesn't exist yet
	}
	if !info.IsDir() {
		return []string{configPath}, nil
	}
	entries, err := os.ReadDir(configPath)
	if err != nil {
		return nil, err
	}
	var files []string
	for _, e := range entries {
		if e.IsDir() {
			continue
		}
		ext := strings.ToLower(filepath.Ext(e.Name()))
		if allowedSuffixes[ext] {
			files = append(files, filepath.Join(configPath, e.Name()))
		}
	}
	return files, nil
}

// ResolvePath resolves filename relative to config root, rejecting traversal.
func ResolvePath(configPath, filename string) (string, error) {
	root, err := filepath.Abs(ConfigRoot(configPath))
	if err != nil {
		return "", err
	}
	target, err := filepath.Abs(filepath.Join(root, filename))
	if err != nil {
		return "", err
	}
	if !strings.HasPrefix(target, root+string(filepath.Separator)) && target != root {
		return "", fmt.Errorf("path traversal not allowed: %q", filename)
	}
	ext := strings.ToLower(filepath.Ext(target))
	if !allowedSuffixes[ext] {
		return "", fmt.Errorf("only .yaml/.yml files allowed, got %q", ext)
	}
	return target, nil
}
