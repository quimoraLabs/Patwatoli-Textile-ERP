package upload

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"patwatoli-erp/internal/config"
	"patwatoli-erp/internal/middleware"
	"patwatoli-erp/internal/platform/apperror"
	"patwatoli-erp/internal/platform/response"
)

type Handler struct {
	cfg config.Config
}

func Register(rg *gin.RouterGroup, cfg config.Config) {
	h := &Handler{cfg: cfg}
	authMid := middleware.Auth(cfg.JWTSecret)

	rg.POST("/upload", authMid, h.Upload)
}

type ImageKitResponse struct {
	FileID       string `json:"fileId"`
	Name         string `json:"name"`
	URL          string `json:"url"`
	ThumbnailURL string `json:"thumbnailUrl"`
	Message      string `json:"message"`
}

func (h *Handler) Upload(c *gin.Context) {
	fileHeader, err := c.FormFile("image")
	if err != nil {
		fileHeader, err = c.FormFile("file")
	}
	if err != nil {
		response.Error(c, apperror.BadRequest("Missing image or file in multipart form"))
		return
	}

	// Validate size (10 MB max)
	if fileHeader.Size > 10*1024*1024 {
		response.Error(c, apperror.BadRequest("File size exceeds 10MB limit"))
		return
	}

	// Validate extension
	ext := strings.ToLower(filepath.Ext(fileHeader.Filename))
	if ext != ".jpg" && ext != ".jpeg" && ext != ".png" && ext != ".webp" {
		response.Error(c, apperror.BadRequest("Only JPG, JPEG, PNG, and WEBP image files are allowed"))
		return
	}

	srcFile, err := fileHeader.Open()
	if err != nil {
		response.Error(c, apperror.Internal("Failed to read uploaded file"))
		return
	}
	defer srcFile.Close()

	generatedName := fmt.Sprintf("ptx_%s_%d%s", uuid.New().String()[:8], time.Now().Unix(), ext)

	// Route 1: ImageKit Storage
	if h.cfg.ImageKitPrivateKey != "" {
		fileBytes, err := io.ReadAll(srcFile)
		if err != nil {
			response.Error(c, apperror.Internal("Failed to buffer file for ImageKit"))
			return
		}

		url, fileID, err := h.uploadToImageKit(fileBytes, generatedName)
		if err == nil {
			response.OK(c, gin.H{
				"url":      url,
				"file_id":  fileID,
				"provider": "imagekit",
			})
			return
		}
		// If ImageKit fails, log and fallback to local disk
		fmt.Printf("Warning: ImageKit upload failed (%v), falling back to local storage\n", err)
		srcFile = io.NopCloser(bytes.NewReader(fileBytes)).(multipart.File)
	}

	// Route 2: Local Disk Storage
	uploadDir := h.cfg.UploadDir
	if uploadDir == "" {
		uploadDir = "./uploads"
	}
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		response.Error(c, apperror.Internal("Failed to initialize uploads directory"))
		return
	}

	dstPath := filepath.Join(uploadDir, generatedName)
	dstFile, err := os.Create(dstPath)
	if err != nil {
		response.Error(c, apperror.Internal("Failed to create destination file"))
		return
	}
	defer dstFile.Close()

	if _, err := io.Copy(dstFile, srcFile); err != nil {
		response.Error(c, apperror.Internal("Failed to save file to local disk"))
		return
	}

	// Form relative or accessible URL
	scheme := "http"
	if c.Request.TLS != nil || c.GetHeader("X-Forwarded-Proto") == "https" {
		scheme = "https"
	}
	host := c.Request.Host
	fullURL := fmt.Sprintf("%s://%s/uploads/%s", scheme, host, generatedName)

	response.OK(c, gin.H{
		"url":      fullURL,
		"path":     fmt.Sprintf("/uploads/%s", generatedName),
		"provider": "local",
	})
}

func (h *Handler) uploadToImageKit(fileBytes []byte, fileName string) (string, string, error) {
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)

	part, err := writer.CreateFormFile("file", fileName)
	if err != nil {
		return "", "", err
	}
	if _, err := part.Write(fileBytes); err != nil {
		return "", "", err
	}

	_ = writer.WriteField("fileName", fileName)
	_ = writer.WriteField("folder", "/patwatoli_erp/items")

	if err := writer.Close(); err != nil {
		return "", "", err
	}

	req, err := http.NewRequest("POST", "https://upload.imagekit.io/api/v1/files/upload", body)
	if err != nil {
		return "", "", err
	}

	// ImageKit uses Basic Auth with Private Key as username and empty password
	auth := base64.StdEncoding.EncodeToString([]byte(h.cfg.ImageKitPrivateKey + ":"))
	req.Header.Set("Authorization", "Basic "+auth)
	req.Header.Set("Content-Type", writer.FormDataContentType())

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", "", err
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return "", "", fmt.Errorf("imagekit returned HTTP %d: %s", resp.StatusCode, string(respBody))
	}

	var ikResp ImageKitResponse
	if err := json.Unmarshal(respBody, &ikResp); err != nil {
		return "", "", fmt.Errorf("failed to parse ImageKit response: %w", err)
	}

	if ikResp.URL == "" {
		return "", "", fmt.Errorf("empty URL returned by ImageKit")
	}

	return ikResp.URL, ikResp.FileID, nil
}
