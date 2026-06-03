package submit

import (
	"backend/api/types/problem"
	"backend/api/types/submission"
	"backend/internal/api/middleware"
	"backend/internal/redisService"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// playgroundResultTTL is how long a playground submission's pending placeholder
// and final verdict are kept in Redis before being garbage-collected.
const playgroundResultTTL = 10 * time.Minute

// playgroundIDCounter is the Redis key holding the monotonically increasing
// counter used to generate playground submission IDs (base offset is applied
// on top — see submission.PlaygroundIDBase).
const playgroundIDCounter = "playground:counter"

// RunRequest is the payload for a quick "run without test cases" request.
type RunRequest struct {
	Code     string `json:"code"     binding:"required"`
	Language string `json:"language" binding:"required"`
	Stdin    string `json:"stdin"`
}

// CreateRun queues a playground submission directly to Redis without
// persisting it to the database. The playground does not need durable history
// and the submissions table is not designed for problem-less runs (FK on
// problem_id, no challenge_id/stdin columns in some deployments), so the whole
// lifecycle lives in Redis: ID → counter, pending placeholder + final result →
// keyed string with TTL, judge job → existing "queue" list.
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

	// Mint a playground ID. Counter is global but offset by PlaygroundIDBase so
	// it cannot collide with any DB-issued submission ID.
	n, err := redisService.IncrCounter(&h.Redis, playgroundIDCounter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to allocate playground id"})
		return
	}
	id := submission.PlaygroundIDBase + n

	var stdin *string
	if req.Stdin != "" {
		stdin = &req.Stdin
	}

	sub := submission.Submission{
		UserID:     userID,
		ProblemID:  0,
		Language:   problem.Language(req.Language),
		SourceCode: req.Code,
		Verdict:    submission.VerdictPending,
		Stdin:      stdin,
	}
	sub.ID = id

	// Seed a Pending placeholder so the polling endpoint can answer immediately
	// even before the judge has picked the job up.
	pending, _ := json.Marshal(map[string]any{
		"id":      id,
		"verdict": submission.VerdictPending,
	})
	if err := redisService.SetWithTTL(&h.Redis, submission.PlaygroundResultKey(id), string(pending), playgroundResultTTL); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to seed playground state"})
		return
	}

	redisService.AddSubmission(&h.Redis, sub)

	c.JSON(http.StatusCreated, gin.H{"id": id, "status": "pending"})
}

// GetSubmission returns a single submission by ID. Playground IDs are served
// from Redis; everything else falls through to the DB.
func (h *Handler) GetSubmission(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	if submission.IsPlaygroundID(id) {
		raw, err := redisService.GetKey(&h.Redis, submission.PlaygroundResultKey(id))
		if err != nil {
			if errors.Is(err, redisService.ErrKeyMissing) {
				c.JSON(http.StatusNotFound, gin.H{"error": "submission not found"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch submission"})
			return
		}
		var payload map[string]any
		if err := json.Unmarshal([]byte(raw), &payload); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "corrupt playground result"})
			return
		}
		c.JSON(http.StatusOK, payload)
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
