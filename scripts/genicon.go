//go:build ignore

package main

// 一次性生成 build/appicon.png（渐变底 + 罗盘指针），运行：
//
//	go run scripts/genicon.go

import (
	"image"
	"image/color"
	"image/png"
	"math"
	"os"
	"path/filepath"
)

const S = 1024

func lerp(a, b uint8, t float64) uint8 {
	return uint8(float64(a) + (float64(b)-float64(a))*t)
}

func insideRounded(x, y, size, r float64) bool {
	// 中心对称象限内判定到圆角圆心的距离
	nx := math.Abs(x - size/2)
	ny := math.Abs(y - size/2)
	half := size / 2
	dx := nx - (half - r)
	dy := ny - (half - r)
	if dx <= 0 || dy <= 0 {
		return nx <= half && ny <= half
	}
	return dx*dx+dy*dy <= r*r
}

func inPolygon(px, py float64, poly [][2]float64) bool {
	sign := 0
	for i := range poly {
		x1, y1 := poly[i][0], poly[i][1]
		x2, y2 := poly[(i+1)%len(poly)][0], poly[(i+1)%len(poly)][1]
		cr := (x2-x1)*(py-y1) - (y2-y1)*(px-x1)
		if cr > 1e-9 {
			if sign < 0 {
				return false
			}
			sign = 1
		} else if cr < -1e-9 {
			if sign > 0 {
				return false
			}
			sign = -1
		}
	}
	return true
}

func main() {
	r := 200.0
	// 罗盘指针（北东-南西 对角），后半稍暗形成立体感
	needle := [][2]float64{{790, 234}, {620, 620}, {234, 790}, {404, 404}}
	halfDark := [][2]float64{{790, 234}, {620, 620}, {404, 404}}

	img := image.NewRGBA(image.Rect(0, 0, S, S))
	for y := 0; y < S; y++ {
		for x := 0; x < S; x++ {
			fx, fy := float64(x)+0.5, float64(y)+0.5
			if !insideRounded(fx, fy, S, r) {
				continue
			}
			t := (fx + fy) / (2 * S)
			c := color.RGBA{
				R: lerp(0x4f, 0x22, t*1.6),
				G: lerp(0x8c, 0xd3, t*1.6),
				B: lerp(0xff, 0xee, t*1.6),
				A: 255,
			}
			if inPolygon(fx, fy, needle[:]) {
				c = color.RGBA{R: 255, G: 255, B: 255, A: 255}
				if inPolygon(fx, fy, halfDark[:]) {
					c = color.RGBA{R: 200, G: 226, B: 255, A: 255}
				}
			}
			img.SetRGBA(x, y, c)
		}
	}

	out := filepath.Join("build", "appicon.png")
	if err := os.MkdirAll("build", 0o755); err != nil {
		panic(err)
	}
	f, err := os.Create(out)
	if err != nil {
		panic(err)
	}
	defer f.Close()
	if err := png.Encode(f, img); err != nil {
		panic(err)
	}
	println("written", out)
}
