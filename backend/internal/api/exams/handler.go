package exams

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
	e, err := h.service.Get(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, e)
}

func (h *Handler) List(c *gin.Context) {
	userID := middleware.GetUserID(c)
	userRole := middleware.GetUserRole(c)

	items, err := h.service.List(userID, userRole)
	if err != nil {
		log.Printf("ERROR List exams (userID=%d role=%s): %v", userID, userRole, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch exams"})
		return
	}
	c.JSON(http.StatusOK, items)
}

// Upcoming returns the exams the current user is scheduled to sit, so the
// frontend can force them into the exam page 20 minutes before the start time.
func (h *Handler) Upcoming(c *gin.Context) {
	email := middleware.GetUserEmail(c)
	items, err := h.service.Upcoming(email)
	if err != nil {
		log.Printf("ERROR Upcoming exams (email=%s): %v", email, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch upcoming exams"})
		return
	}
	c.JSON(http.StatusOK, items)
}

func (h *Handler) Create(c *gin.Context) {
	var req CreateExamRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	userID := middleware.GetUserID(c)
	e, err := h.service.Create(req, userID)
	if err != nil {
		log.Printf("ERROR Create exam: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create exam"})
		return
	}
	c.JSON(http.StatusCreated, e)
}

func (h *Handler) Update(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	var req UpdateExamRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	userID := middleware.GetUserID(c)
	userRole := middleware.GetUserRole(c)

	e, err := h.service.Update(id, req, userID, userRole)
	if err != nil {
		status := http.StatusInternalServerError
		msg := err.Error()
		if msg == "exam not found" {
			status = http.StatusNotFound
		} else if msg == "not authorized" {
			status = http.StatusForbidden
		}
		c.JSON(status, gin.H{"error": msg})
		return
	}
	c.JSON(http.StatusOK, e)
}

func (h *Handler) Stop(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	e, err := h.service.Stop(id, middleware.GetUserID(c), middleware.GetUserRole(c))
	if err != nil {
		c.JSON(controlStatus(err), gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, e)
}

func (h *Handler) Restart(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	e, err := h.service.Restart(id, middleware.GetUserID(c), middleware.GetUserRole(c))
	if err != nil {
		c.JSON(controlStatus(err), gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, e)
}

func controlStatus(err error) int {
	switch err.Error() {
	case "exam not found":
		return http.StatusNotFound
	case "not authorized":
		return http.StatusForbidden
	default:
		return http.StatusInternalServerError
	}
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
		if msg == "exam not found" {
			status = http.StatusNotFound
		} else if msg == "not authorized" {
			status = http.StatusForbidden
		}
		c.JSON(status, gin.H{"error": msg})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "exam deleted"})
}
