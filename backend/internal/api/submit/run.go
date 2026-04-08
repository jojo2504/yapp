package submit

import (
	"backend/api/types/problem"
	"backend/api/types/submission"
	"backend/internal/api/middleware"
	"backend/internal/redisService"
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// RunRequest is the payload for a quick "run without test cases" request.
type RunRequest struct {
	Code     string `json:"code"     binding:"required"`
	Language string `json:"language" binding:"required"`
	Stdin    string `json:"stdin"`
}

// CreateRun creates a submission with problem_id=0 and queues it to the judge.
// The judge will execute the code and post the result back via /api/result.
func (h *Handler) CreateRun(c *gin.Context) {
	var req RunRequest
	if err := c.BindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID := middleware.GetUserID(c)
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "authentication required"})
		return
	}

	var stdin *string
	if req.Stdin != "" {
		stdin = &req.Stdin
	}
	sub := submission.Submission{
		UserID:     userID,
		ProblemID:  0, // playground run — no problem
		Language:   problem.Language(req.Language),
		SourceCode: req.Code,
		Verdict:    submission.VerdictPending,
		Stdin:      stdin,
	}

	if err := h.DB.Create(&sub).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	redisService.AddSubmission(&h.Redis, sub)

	c.JSON(http.StatusCreated, gin.H{"id": sub.ID, "status": "pending"})
}

// GetSubmission returns a single submission by ID (used to poll run results).
func (h *Handler) GetSubmission(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	var sub submission.Submission
	if err := h.DB.First(&sub, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "submission not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch submission"})
		return
	}

	c.JSON(http.StatusOK, sub)
}
