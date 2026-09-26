package service

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"
)

// 更新检查指向的项目仓库（换成自己的仓库地址即可启用）
const updateRepo = "tyf15/coursepilot-desktop"

type UpdateInfo struct {
	HasUpdate      bool   `json:"hasUpdate"`
	LatestVersion  string `json:"latestVersion"`
	CurrentVersion string `json:"currentVersion"`
	URL            string `json:"url"`
}

type ghRelease struct {
	TagName string `json:"tag_name"`
	HTMLURL string `json:"html_url"`
}

// CheckUpdate 查询 GitHub 最新 Release；仓库不存在或网络失败时按“无更新”处理
func CheckUpdate(current string) (UpdateInfo, error) {
	current = normalizeVersion(current)
	client := &http.Client{Timeout: 10 * time.Second}
	req, err := http.NewRequest(http.MethodGet, "https://api.github.com/repos/"+updateRepo+"/releases/latest", nil)
	if err != nil {
		return UpdateInfo{CurrentVersion: current}, err
	}
	req.Header.Set("Accept", "application/vnd.github+json")
	resp, err := client.Do(req)
	if err != nil {
		return UpdateInfo{CurrentVersion: current}, fmt.Errorf("无法连接 GitHub: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode == http.StatusNotFound {
		return UpdateInfo{HasUpdate: false, LatestVersion: current, CurrentVersion: current}, nil
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return UpdateInfo{CurrentVersion: current}, fmt.Errorf("GitHub API 返回 %d", resp.StatusCode)
	}
	var rel ghRelease
	if err := json.NewDecoder(resp.Body).Decode(&rel); err != nil {
		return UpdateInfo{CurrentVersion: current}, err
	}
	latest := normalizeVersion(rel.TagName)
	return UpdateInfo{
		HasUpdate:      latest != "" && compareVersions(latest, current) > 0,
		LatestVersion:  latest,
		CurrentVersion: current,
		URL:            rel.HTMLURL,
	}, nil
}

func normalizeVersion(v string) string {
	return strings.TrimPrefix(strings.TrimSpace(strings.ToLower(v)), "v")
}

func compareVersions(a, b string) int {
	ap := strings.Split(a, ".")
	bp := strings.Split(b, ".")
	for i := 0; i < len(ap) || i < len(bp); i++ {
		av, bv := 0, 0
		if i < len(ap) {
			_, _ = fmt.Sscanf(ap[i], "%d", &av)
		}
		if i < len(bp) {
			_, _ = fmt.Sscanf(bp[i], "%d", &bv)
		}
		if av > bv {
			return 1
		}
		if av < bv {
			return -1
		}
	}
	return 0
}
