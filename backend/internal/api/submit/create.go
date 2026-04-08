package submit

import (
	"backend/api/types/submission"
	"backend/internal/redisService"
	"net/http"

	"github.com/gin-gonic/gin"
)

func (h *Handler) SendSubmission(c *gin.Context) {
	var sub submission.Submission

	if err := c.BindJSON(&sub); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Force Pending — the judge is the only authority on the final verdict.
	sub.Verdict = submission.VerdictPending

	// Persist to DB before queuing so the judge can reference the row by ID.
	if err := h.DB.Create(&sub).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create submission"})
		return
	}

	// Push to Redis; sub.ID is now populated, so the judge can echo it back.
	redisService.AddSubmission(&h.Redis, sub)

	c.JSON(http.StatusCreated, sub)
}
