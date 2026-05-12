// Package yamlutil provides YAML read/write helpers.
//
// Note: Go's gopkg.in/yaml.v3 does NOT preserve comments when marshaling.
// Raw YAML strings are written as-is (comments preserved).
// Only validation requires parsing (no marshal back from struct).
package yamlutil

import (
	"fmt"
	"os"
	"path/filepath"

	"gopkg.in/yaml.v3"
)

// Validate checks that content is syntactically valid YAML.
func Validate(content string) error {
	var v interface{}
	return yaml.Unmarshal([]byte(content), &v)
}

// Parse unmarshals YAML content into a generic map.
func Parse(content string) (map[string]interface{}, error) {
	var out map[string]interface{}
	if err := yaml.Unmarshal([]byte(content), &out); err != nil {
		return nil, err
	}
	return out, nil
}

// WriteRaw validates YAML syntax then writes the raw string to path.
// Parent directories are created if needed.
// The file is NOT written if YAML is invalid.
func WriteRaw(path, content string) error {
	if err := Validate(content); err != nil {
		return fmt.Errorf("invalid YAML: %w", err)
	}
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return err
	}
	return os.WriteFile(path, []byte(content), 0o644)
}

// ReadRaw reads the file at path and returns its content as a string.
func ReadRaw(path string) (string, error) {
	b, err := os.ReadFile(path)
	if err != nil {
		return "", err
	}
	return string(b), nil
}
