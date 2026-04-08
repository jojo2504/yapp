package auth

import (
	"backend/internal/api/middleware"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

// Register handles user registration
func (h *Handler) Register(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request data", "details": err.Error()})
		return
	}

	response, err := h.service.Register(req)
	if err != nil {
		status := http.StatusInternalServerError
		if strings.Contains(err.Error(), "already registered") {
			status = http.StatusConflict
		} else if strings.Contains(err.Error(), "not found") {
			status = http.StatusBadRequest
		}
		c.JSON(status, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, response)
}

// Login handles user authentication
func (h *Handler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request data", "details": err.Error()})
		return
	}

	response, err := h.service.Login(req)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, response)
}

// Logout handles user logout
func (h *Handler) Logout(c *gin.Context) {
	userID := middleware.GetUserID(c)

	// Get token from header
	authHeader := c.GetHeader("Authorization")
	parts := strings.Split(authHeader, " ")
	if len(parts) != 2 || parts[1] == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing token"})
		return
	}
	token := parts[1]

	if err := h.service.Logout(userID, token); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to logout"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Successfully logged out"})
}

// RefreshToken handles token refresh
func (h *Handler) RefreshToken(c *gin.Context) {
	var req RefreshTokenRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request data"})
		return
	}

	response, err := h.service.RefreshToken(req.RefreshToken)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, response)
}

// AdminCreateUser handles admin-only user creation with any role
func (h *Handler) AdminCreateUser(c *gin.Context) {
	var req AdminCreateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request data", "details": err.Error()})
		return
	}

	response, err := h.service.CreateUserAsAdmin(req)
	if err != nil {
		status := http.StatusInternalServerError
		if strings.Contains(err.Error(), "already registered") {
			status = http.StatusConflict
		} else if strings.Contains(err.Error(), "not found") || strings.Contains(err.Error(), "invalid role") {
			status = http.StatusBadRequest
		}
		c.JSON(status, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, response)
}

// GetMe returns the current user's profile
func (h *Handler) GetMe(c *gin.Context) {
	userID := middleware.GetUserID(c)

	user, err := h.service.GetCurrentUser(userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, user)
}
