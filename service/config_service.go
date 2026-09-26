package service

import (
	"fmt"
	"os"

	"gopkg.in/yaml.v3"
)

func DefaultConfig() AppConfig {
	return AppConfig{
		Setting: Setting{
			BasicSetting: BasicSetting{
				CompletionTone: 1,
				ColorLog:       1,
				LogOutFileSw:   1,
				LogLevel:       "info",
				LogModel:       1,
				WebModel:       1,
				Theme:          "dark",
			},
			EmailInform: EmailInform{SmtpPort: 465},
			AiSetting: AiSetting{
				AiType: "deepseek",
				AiUrl:  "https://api.deepseek.com",
				Model:  "deepseek-chat",
			},
		},
		Users: []UserY{},
	}
}

// LoadConfig 读取 YAML；文件不存在时返回默认配置（调用方可选择落盘）
func LoadConfig(path string) (AppConfig, error) {
	cfg := DefaultConfig()
	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return cfg, nil
		}
		return cfg, fmt.Errorf("读取配置失败: %w", err)
	}
	if err := yaml.Unmarshal(data, &cfg); err != nil {
		return DefaultConfig(), fmt.Errorf("解析 config.yaml 失败: %w", err)
	}
	if cfg.Setting.BasicSetting.LogLevel == "" {
		cfg.Setting.BasicSetting.LogLevel = "info"
	}
	return cfg, nil
}

func SaveConfig(path string, cfg AppConfig) error {
	out, err := yaml.Marshal(&cfg)
	if err != nil {
		return fmt.Errorf("序列化配置失败: %w", err)
	}
	if err := os.MkdirAll(dirOf(path), 0o755); err != nil {
		return err
	}
	return os.WriteFile(path, out, 0o644)
}

func ValidateConfig(cfg AppConfig) []string {
	var errs []string
	if _, ok := GetPreset(cfg.Setting.AiSetting.AiType); !ok {
		errs = append(errs, "不支持的 AI 服务商: "+cfg.Setting.AiSetting.AiType)
	}
	if p := cfg.Setting.EmailInform.SmtpPort; p != 0 && (p < 1 || p > 65535) {
		errs = append(errs, "SMTP 端口不合法")
	}
	return errs
}

func dirOf(path string) string {
	for i := len(path) - 1; i >= 0; i-- {
		if path[i] == '/' || path[i] == '\\' {
			return path[:i]
		}
	}
	return "."
}
