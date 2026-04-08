package challenges

import (
	"backend/internal/api/middleware"
	"backend/internal/redisService"
	"log"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

type Handler struct {
	service *Service
	redis   redisService.RedisService
}

func NewHandler(service *Service, redis redisService.RedisService) *Handler {
	return &Handler{service: service, redis: redis}
}

func (h *Handler) Get(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	role := middleware.GetUserRole(c)
	hideExpected := role == "Student"
	item, err := h.service.Get(id, hideExpected)
	if err != nil {
		if err.Error() == "challenge not found" {
			c.JSON(http.StatusNotFound, gin.H{"error": "challenge not found"})
			return
		}
		log.Printf("ERROR Get challenge id=%d: %v", id, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch challenge"})
		return
	}
	c.JSON(http.StatusOK, item)
}

func (h *Handler) List(c *gin.Context) {
	userID := middleware.GetUserID(c)
	userRole := middleware.GetUserRole(c)

	items, err := h.service.List(userID, userRole)
	if err != nil {
		log.Printf("ERROR List challenges (userID=%d role=%s): %v", userID, userRole, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch challenges"})
		return
	}
	c.JSON(http.StatusOK, items)
}

func (h *Handler) Create(c *gin.Context) {
	var req CreateChallengeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	authorID := middleware.GetUserID(c)
	item, err := h.service.Create(req, authorID)
	if err != nil {
		log.Printf("ERROR Create challenge: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create challenge"})
		return
	}
	c.JSON(http.StatusCreated, item)
}

func (h *Handler) Update(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	var req UpdateChallengeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	userID := middleware.GetUserID(c)
	userRole := middleware.GetUserRole(c)

	item, err := h.service.Update(id, req, userID, userRole)
	if err != nil {
		status := http.StatusInternalServerError
		msg := err.Error()
		if msg == "challenge not found" {
			status = http.StatusNotFound
		} else if msg == "not authorized" {
			status = http.StatusForbidden
		}
		c.JSON(status, gin.H{"error": msg})
		return
	}
	c.JSON(http.StatusOK, item)
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
		if msg == "challenge not found" {
			status = http.StatusNotFound
		} else if msg == "not authorized" {
			status = http.StatusForbidden
		}
		c.JSON(status, gin.H{"error": msg})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "challenge deleted"})
}

func (h *Handler) Submit(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	var req SubmitRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	userID := middleware.GetUserID(c)

	sub, err := h.service.Submit(id, req, userID)
	if err != nil {
		if err.Error() == "challenge not found" {
			c.JSON(http.StatusNotFound, gin.H{"error": "challenge not found"})
			return
		}
		log.Printf("ERROR Submit challenge id=%d: %v", id, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create submission"})
		return
	}

	// Push to Redis with inline test cases included in the JSON payload.
	redisService.AddSubmission(&h.redis, *sub)

	c.JSON(http.StatusCreated, sub)
}
