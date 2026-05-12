package config

import (
	"fmt"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	GatusConfigPath    string
	GatusContainerName string
	AdminUsername      string
	AdminPassword      string
	SessionSecret      string
	BackupDir          string
	AllowDockerRestart bool
	ReadOnlyMode       bool
	HTTPSOnly          bool
	CSRFEnabled        bool
	CORSOriginsRaw     string
	GatusAPIURL        string
	Port               string
}

func Load() *Config {
	_ = godotenv.Load() // load .env if present; ignore error if missing
	return &Config{
		GatusConfigPath:    getEnv("GATUS_CONFIG_PATH", "/config/config.yaml"),
		GatusContainerName: getEnv("GATUS_CONTAINER_NAME", "gatus"),
		AdminUsername:      getEnv("ADMIN_USERNAME", "admin"),
		AdminPassword:      getEnv("ADMIN_PASSWORD", "change-me"),
		SessionSecret:      getEnv("SESSION_SECRET", "change-me-in-production"),
		BackupDir:          getEnv("BACKUP_DIR", "/config/backups"),
		AllowDockerRestart: getEnvBool("ALLOW_DOCKER_RESTART", true),
		ReadOnlyMode:       getEnvBool("READ_ONLY_MODE", false),
		HTTPSOnly:          getEnvBool("HTTPS_ONLY", false),
		CSRFEnabled:        getEnvBool("CSRF_ENABLED", true),
		CORSOriginsRaw:     getEnv("CORS_ORIGINS", getEnv("CORS_ORIGINS_RAW", "")),
		GatusAPIURL:        getEnv("GATUS_API_URL", "http://gatus:8080"),
		Port:               getEnv("PORT", "8000"),
	}
}

func (c *Config) ValidateSecurity() error {
	if getEnvBool("ALLOW_INSECURE_DEFAULTS", false) {
		return nil
	}
	if c.AdminPassword == "" || c.AdminPassword == "change-me" {
		return fmt.Errorf("ADMIN_PASSWORD must be set to a non-default value")
	}
	if c.SessionSecret == "" || c.SessionSecret == "change-me-in-production" {
		return fmt.Errorf("SESSION_SECRET must be set to a non-default value")
	}
	if len(c.SessionSecret) < 32 {
		return fmt.Errorf("SESSION_SECRET must be at least 32 characters")
	}
	return nil
}

func getEnv(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

func getEnvBool(key string, def bool) bool {
	v := os.Getenv(key)
	if v == "" {
		return def
	}
	b, err := strconv.ParseBool(v)
	if err != nil {
		return def
	}
	return b
}
