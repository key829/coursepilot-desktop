package service

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// ProviderPreset AI 服务商预设：前端据此自动填充地址与模型
type ProviderPreset struct {
	Code     string   `json:"code"`
	Name     string   `json:"name"`
	BaseURL  string   `json:"baseURL"`
	Models   []string `json:"models"`
	Protocol string   `json:"protocol"` // openai | gemini | claude
	Note     string   `json:"note"`
}

// ProtocolName 协议的中文展示名
func ProtocolName(p string) string {
	switch p {
	case "gemini":
		return "Gemini 原生"
	case "claude":
		return "Claude 原生"
	default:
		return "OpenAI 兼容"
	}
}

// ProviderPresets 全部内置 AI 服务商预设。
// 绝大多数厂商（国产尤甚）提供 OpenAI 兼容接口；Gemini/Claude 走原生协议。
func ProviderPresets() []ProviderPreset {
	return []ProviderPreset{
		{Code: "deepseek", Name: "DeepSeek", BaseURL: "https://api.deepseek.com", Models: []string{"deepseek-chat", "deepseek-reasoner"}, Protocol: "openai", Note: "官方 OpenAI 兼容接口"},
		{Code: "openai", Name: "OpenAI", BaseURL: "https://api.openai.com/v1", Models: []string{"gpt-4o-mini", "gpt-4o"}, Protocol: "openai", Note: "需国际网络环境"},
		{Code: "qwen", Name: "通义千问", BaseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1", Models: []string{"qwen-plus", "qwen-max", "qwen-turbo"}, Protocol: "openai", Note: "DashScope 兼容模式"},
		{Code: "moonshot", Name: "月之暗面 Kimi", BaseURL: "https://api.moonshot.cn/v1", Models: []string{"moonshot-v1-8k", "moonshot-v1-32k"}, Protocol: "openai", Note: ""},
		{Code: "zhipu", Name: "智谱 GLM", BaseURL: "https://open.bigmodel.cn/api/paas/v4", Models: []string{"glm-4-flash", "glm-4-plus"}, Protocol: "openai", Note: "glm-4-flash 免费额度"},
		{Code: "doubao", Name: "字节豆包（火山方舟）", BaseURL: "https://ark.cn-beijing.volces.com/api/v3", Models: []string{"doubao-pro-32k", "doubao-lite-32k"}, Protocol: "openai", Note: "模型名需换成控制台创建的接入点 ID（ep-xxxx）"},
		{Code: "ernie", Name: "百度文心（千帆 v2）", BaseURL: "https://qianfan.baidubce.com/v2", Models: []string{"ernie-4.0-8k-latest", "ernie-speed-128k"}, Protocol: "openai", Note: "使用千帆 v2 OpenAI 兼容接口，Key 为 API Key（非 AK/SK）"},
		{Code: "hunyuan", Name: "腾讯混元", BaseURL: "https://api.hunyuan.cloud.tencent.com/v1", Models: []string{"hunyuan-turbos-latest", "hunyuan-lite"}, Protocol: "openai", Note: ""},
		{Code: "spark", Name: "讯飞星火", BaseURL: "https://spark-api-open.xf-yun.com/v1", Models: []string{"4.0Ultra", "generalv3.5", "lite"}, Protocol: "openai", Note: "Key 填 HTTP 接口鉴权的 APIPassword"},
		{Code: "minimax", Name: "MiniMax", BaseURL: "https://api.minimax.chat/v1", Models: []string{"abab6.5s-chat"}, Protocol: "openai", Note: ""},
		{Code: "siliconflow", Name: "硅基流动", BaseURL: "https://api.siliconflow.cn/v1", Models: []string{"deepseek-ai/DeepSeek-V3", "Qwen/Qwen2.5-72B-Instruct"}, Protocol: "openai", Note: "聚合平台，一个 Key 调多家开源模型"},
		{Code: "openrouter", Name: "OpenRouter", BaseURL: "https://openrouter.ai/api/v1", Models: []string{"openai/gpt-4o-mini", "deepseek/deepseek-chat"}, Protocol: "openai", Note: "国际聚合平台"},
		{Code: "groq", Name: "Groq", BaseURL: "https://api.groq.com/openai/v1", Models: []string{"llama-3.3-70b-versatile"}, Protocol: "openai", Note: "极速推理"},
		{Code: "ollama", Name: "Ollama（本地）", BaseURL: "http://localhost:11434/v1", Models: []string{"llama3.1", "qwen2.5"}, Protocol: "openai", Note: "本地服务，无需 API Key"},
		{Code: "lmstudio", Name: "LM Studio（本地）", BaseURL: "http://localhost:1234/v1", Models: []string{"本地已加载的模型"}, Protocol: "openai", Note: "本地服务，无需 API Key"},
		{Code: "gemini", Name: "Google Gemini", BaseURL: "https://generativelanguage.googleapis.com", Models: []string{"gemini-2.0-flash", "gemini-1.5-pro"}, Protocol: "gemini", Note: "原生 generateContent 协议，需国际网络环境"},
		{Code: "claude", Name: "Anthropic Claude", BaseURL: "https://api.anthropic.com", Models: []string{"claude-3-5-haiku-latest", "claude-3-7-sonnet-latest"}, Protocol: "claude", Note: "原生 messages 协议，需国际网络环境"},
		{Code: "custom", Name: "自定义（OpenAI 兼容）", BaseURL: "", Models: []string{}, Protocol: "openai", Note: "任何 OpenAI 兼容服务：填地址、模型名与 Key 即可"},
	}
}

func GetPreset(code string) (ProviderPreset, bool) {
	for _, p := range ProviderPresets() {
		if p.Code == code {
			return p, true
		}
	}
	return ProviderPreset{}, false
}

func isLocalProvider(code string) bool {
	return code == "ollama" || code == "lmstudio"
}

// TestAI 按当前配置发一条最小请求验证 AI 可用性（各协议自动分发）。
// 未配置 Key 的云端厂商返回演示提示；本地服务（Ollama 等）直接请求。
func TestAI(setting AiSetting) (string, error) {
	preset, _ := GetPreset(setting.AiType)
	if setting.AiType != "custom" && setting.AiUrl == "" {
		setting.AiUrl = preset.BaseURL
	}
	setting.AiUrl = strings.TrimRight(strings.TrimSpace(setting.AiUrl), "/")
	if setting.AiUrl == "" {
		return "", fmt.Errorf("接口地址为空")
	}
	if setting.Model == "" {
		return "", fmt.Errorf("模型名为空")
	}
	if setting.APIKey == "" && !isLocalProvider(setting.AiType) {
		return "未配置 API Key，已跳过真实请求（当前为演示模式）", nil
	}
	return chatOnce(setting, "回复两个字：正常")
}

// chatOnce 发送一次最小对话请求，返回模型回复文本。
// 供连通性测试与后续真实答题流程复用。
func chatOnce(setting AiSetting, userText string) (string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 25*time.Second)
	defer cancel()

	switch presetProtocol(setting.AiType, setting.AiUrl) {
	case "gemini":
		return chatGemini(ctx, setting, userText)
	case "claude":
		return chatClaude(ctx, setting, userText)
	default:
		return chatOpenAICompatible(ctx, setting, userText)
	}
}

func presetProtocol(code, url string) string {
	if p, ok := GetPreset(code); ok {
		return p.Protocol
	}
	return "openai"
}

// chatOpenAICompatible 覆盖 DeepSeek/OpenAI/通义/Kimi/GLM/豆包/文心/混元/星火/
// MiniMax/硅基流动/OpenRouter/Groq/Ollama/LM Studio 等几乎所有主流服务
func chatOpenAICompatible(ctx context.Context, s AiSetting, userText string) (string, error) {
	endpoint := s.AiUrl
	if !strings.HasSuffix(endpoint, "/chat/completions") {
		endpoint += "/chat/completions"
	}
	payload := map[string]any{
		"model": s.Model,
		"messages": []map[string]string{
			{"role": "user", "content": userText},
		},
		"max_tokens": 16,
	}
	body, _ := json.Marshal(payload)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	if s.APIKey != "" {
		req.Header.Set("Authorization", "Bearer "+s.APIKey)
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("请求失败: %w", err)
	}
	defer resp.Body.Close()
	data, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return "", fmt.Errorf("接口返回 %d: %s", resp.StatusCode, truncate(string(data), 200))
	}
	var out struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}
	if err := json.Unmarshal(data, &out); err != nil {
		return "", fmt.Errorf("解析响应失败: %w", err)
	}
	if len(out.Choices) == 0 {
		return "", fmt.Errorf("接口未返回任何回复")
	}
	return "连接成功，模型回复：" + strings.TrimSpace(out.Choices[0].Message.Content), nil
}

// chatGemini Google Gemini 原生 generateContent 协议
func chatGemini(ctx context.Context, s AiSetting, userText string) (string, error) {
	endpoint := fmt.Sprintf("%s/v1beta/models/%s:generateContent", s.AiUrl, s.Model)
	payload := map[string]any{
		"contents":                 []map[string]any{{"parts": []map[string]string{{"text": userText}}}},
		"generationConfig":         map[string]any{"maxOutputTokens": 16},
	}
	body, _ := json.Marshal(payload)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	if s.APIKey != "" {
		req.Header.Set("x-goog-api-key", s.APIKey)
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("请求失败: %w", err)
	}
	defer resp.Body.Close()
	data, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return "", fmt.Errorf("接口返回 %d: %s", resp.StatusCode, truncate(string(data), 200))
	}
	var out struct {
		Candidates []struct {
			Content struct {
				Parts []struct {
					Text string `json:"text"`
				} `json:"parts"`
			} `json:"content"`
		} `json:"candidates"`
	}
	if err := json.Unmarshal(data, &out); err != nil {
		return "", fmt.Errorf("解析响应失败: %w", err)
	}
	if len(out.Candidates) == 0 || len(out.Candidates[0].Content.Parts) == 0 {
		return "", fmt.Errorf("接口未返回任何回复")
	}
	return "连接成功，模型回复：" + strings.TrimSpace(out.Candidates[0].Content.Parts[0].Text), nil
}

// chatClaude Anthropic 原生 messages 协议
func chatClaude(ctx context.Context, s AiSetting, userText string) (string, error) {
	endpoint := s.AiUrl + "/v1/messages"
	payload := map[string]any{
		"model":      s.Model,
		"max_tokens": 16,
		"messages":   []map[string]string{{"role": "user", "content": userText}},
	}
	body, _ := json.Marshal(payload)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	if s.APIKey != "" {
		req.Header.Set("x-api-key", s.APIKey)
	}
	req.Header.Set("anthropic-version", "2023-06-01")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("请求失败: %w", err)
	}
	defer resp.Body.Close()
	data, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return "", fmt.Errorf("接口返回 %d: %s", resp.StatusCode, truncate(string(data), 200))
	}
	var out struct {
		Content []struct {
			Type string `json:"type"`
			Text string `json:"text"`
		} `json:"content"`
	}
	if err := json.Unmarshal(data, &out); err != nil {
		return "", fmt.Errorf("解析响应失败: %w", err)
	}
	for _, c := range out.Content {
		if c.Type == "text" && strings.TrimSpace(c.Text) != "" {
			return "连接成功，模型回复：" + strings.TrimSpace(c.Text), nil
		}
	}
	return "", fmt.Errorf("接口未返回任何回复")
}

// TestQuestionBank 验证题库接口可达性
func TestQuestionBank(que ApiQueSetting) (string, error) {
	u := strings.TrimSpace(que.URL)
	if u == "" {
		return "未配置题库地址，已跳过（当前为演示模式）", nil
	}
	if !strings.HasPrefix(u, "http://") && !strings.HasPrefix(u, "https://") {
		return "", fmt.Errorf("题库地址必须以 http(s):// 开头")
	}
	ctx, cancel := context.WithTimeout(context.Background(), 12*time.Second)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u, nil)
	if err != nil {
		return "", err
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("请求失败: %w", err)
	}
	defer resp.Body.Close()
	_, _ = io.Copy(io.Discard, io.LimitReader(resp.Body, 4<<10))
	if resp.StatusCode < 200 || resp.StatusCode >= 400 {
		return "", fmt.Errorf("接口返回 %d", resp.StatusCode)
	}
	return fmt.Sprintf("题库接口可达（HTTP %d）", resp.StatusCode), nil
}

func truncate(s string, n int) string {
	r := []rune(s)
	if len(r) > n {
		return string(r[:n]) + "…"
	}
	return s
}
