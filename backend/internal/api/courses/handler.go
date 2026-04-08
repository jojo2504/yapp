package courses

import (
	"backend/internal/api/middleware"
	"log"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) Get(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	course, err := h.service.Get(id)
	if err != nil {
		if err.Error() == "course not found" {
			c.JSON(http.StatusNotFound, gin.H{"error": "course not found"})
			return
		}
		log.Printf("ERROR Get course id=%d: %v", id, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch course"})
		return
	}
	c.JSON(http.StatusOK, course)
}

func (h *Handler) List(c *gin.Context) {
	userID := middleware.GetUserID(c)
	userRole := middleware.GetUserRole(c)

	items, err := h.service.List(userID, userRole)
	if err != nil {
		log.Printf("ERROR List courses (userID=%d role=%s): %v", userID, userRole, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch courses"})
		return
	}
	c.JSON(http.StatusOK, items)
}

func (h *Handler) Create(c *gin.Context) {
	var req CreateCourseRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	userID := middleware.GetUserID(c)
	course, err := h.service.Create(req, userID)
	if err != nil {
		log.Printf("ERROR Create course: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create course"})
		return
	}
	c.JSON(http.StatusCreated, course)
}

func (h *Handler) Update(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	var req UpdateCourseRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	userID := middleware.GetUserID(c)
	userRole := middleware.GetUserRole(c)

	course, err := h.service.Update(id, req, userID, userRole)
	if err != nil {
		status := http.StatusInternalServerError
		msg := err.Error()
		if msg == "course not found" {
			status = http.StatusNotFound
		} else if msg == "not authorized" {
			status = http.StatusForbidden
		}
		c.JSON(status, gin.H{"error": msg})
		return
	}
	c.JSON(http.StatusOK, course)
}

func (h *Handler) Delete(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	userID := middleware.GetUserID(c)
	userRole := middleware.GetUserRole(c)

	if err := h.service.Delete(id, userID, userRole); err != nil {
		status := http.StatusInternalServerError
		msg := err.Error()
		if msg == "course not found" {
			status = http.StatusNotFound
		} else if msg == "not authorized" {
			status = http.StatusForbidden
		}
		c.JSON(status, gin.H{"error": msg})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "course deleted"})
}

func (h *Handler) AssignGroups(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	var req AssignGroupsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	userID := middleware.GetUserID(c)
	userRole := middleware.GetUserRole(c)

	course, err := h.service.AssignGroups(id, req.GroupIDs, userID, userRole)
	if err != nil {
		status := http.StatusInternalServerError
		msg := err.Error()
		if msg == "course not found" {
			status = http.StatusNotFound
		} else if msg == "not authorized" {
			status = http.StatusForbidden
		}
		c.JSON(status, gin.H{"error": msg})
		return
	}
	c.JSON(http.StatusOK, course)
}
