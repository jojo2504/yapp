package users

import (
	"backend/internal/api/middleware"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) ListUsers(c *gin.Context) {
	users, err := h.service.ListUsers(ListFilter{
		Search: c.Query("search"),
		Role:   c.Query("role"),
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch users"})
		return
	}
	c.JSON(http.StatusOK, users)
}

// ListStudents returns the student directory used by group/exam pickers.
// Accessible to Teachers and Admins; supports an optional ?search= filter.
func (h *Handler) ListStudents(c *gin.Context) {
	students, err := h.service.ListUsers(ListFilter{
		Search: c.Query("search"),
		Role:   "Student",
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch students"})
		return
	}
	c.JSON(http.StatusOK, students)
}

func (h *Handler) UpdateUser(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}
	var req UpdateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request data"})
		return
	}
	u, err := h.service.UpdateUser(id, req)
	if err != nil {
		status := http.StatusInternalServerError
		msg := err.Error()
		if msg == "user not found" {
			status = http.StatusNotFound
		} else if msg == "email already in use" || msg == "invalid role" {
			status = http.StatusConflict
		}
		c.JSON(status, gin.H{"error": msg})
		return
	}
	c.JSON(http.StatusOK, u)
}

func (h *Handler) ChangePassword(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}
	var req ChangePasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request data", "details": err.Error()})
		return
	}
	if err := h.service.ChangePassword(id, req); err != nil {
		status := http.StatusInternalServerError
		if strings.Contains(err.Error(), "not found") {
			status = http.StatusNotFound
		}
		c.JSON(status, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Password updated"})
}

func (h *Handler) ToggleBan(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}
	callerID := middleware.GetUserID(c)
	u, err := h.service.ToggleBan(id, callerID)
	if err != nil {
		status := http.StatusInternalServerError
		if strings.Contains(err.Error(), "not found") || strings.Contains(err.Error(), "cannot ban yourself") {
			status = http.StatusBadRequest
		}
		c.JSON(status, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, u)
}

func (h *Handler) DeleteUser(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}
	callerID := middleware.GetUserID(c)
	if err := h.service.DeleteUser(id, callerID); err != nil {
		status := http.StatusInternalServerError
		if strings.Contains(err.Error(), "not found") || strings.Contains(err.Error(), "cannot delete yourself") {
			status = http.StatusBadRequest
		}
		c.JSON(status, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusNoContent, nil)
}
