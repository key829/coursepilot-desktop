package service

import (
	"os"
	"path/filepath"
)

// DataDir 应用数据目录：%APPDATA%/CoursePilot
func DataDir() (string, error) {
	base := os.Getenv("APPDATA")
	if base == "" {
		home, err := os.UserHomeDir()
		if err != nil {
			return "", err
		}
		base = filepath.Join(home, "AppData", "Roaming")
	}
	dir := filepath.Join(base, "CoursePilot")
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return "", err
	}
	return dir, nil
}

func DefaultConfigPath() (string, error) {
	dir, err := DataDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(dir, "config.yaml"), nil
}

func AccountsPath() (string, error) {
	dir, err := DataDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(dir, "accounts.json"), nil
}

func ProgressDir() (string, error) {
	dir, err := DataDir()
	if err != nil {
		return "", err
	}
	p := filepath.Join(dir, "progress")
	return p, os.MkdirAll(p, 0o755)
}
