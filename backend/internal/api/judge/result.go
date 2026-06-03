package judge

import (
	"backend/api/types/problem"
	"backend/api/types/submission"
	"backend/internal/redisService"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// playgroundResultTTL mirrors the TTL used by the submit handler when the
// pending placeholder is created. The same window applies to the final result.
const playgroundResultTTL = 10 * time.Minute

// sentinel errors used for status-code mapping
var (
	errSubmissionNotFound = errors.New("submission not found")
	errAlreadyJudged      = errors.New("submission already judged")
)

// JudgeResultRequest is the payload the Rust judge posts after executing a submission.
// Using a dedicated DTO instead of submission.Submission directly limits what the
// judge can overwrite and makes validation explicit.
type JudgeResultRequest struct {
	// SubmissionID must match a Pending row created by the submit handler.
	SubmissionID int64              `json:"submission_id" binding:"required,gt=0"`
	Verdict      submission.Verdict `json:"verdict"       binding:"required"`
	Message      *string            `json:"message"`
	ExecutionTime *uint32           `json:"execution_time"`
	MemoryUsage   *uint32           `json:"memory_usage"`
	JudgeOutput  *string            `json:"judge_output"`
	TestResults  []TestResultDTO    `json:"test_results"`
}

// TestResultDTO carries the per-test-case outcome from the judge.
type TestResultDTO struct {
	TestCaseID    int64              `json:"test_case_id"    binding:"required,gt=0"`
	Verdict       submission.Verdict `json:"verdict"         binding:"required"`
	ExecutionTime uint32             `json:"execution_time"`
	MemoryKB      uint32             `json:"memory_kb"`
	ActualOutput  *string            `json:"actual_output"`
}

// SendResult receives a verdict from the Rust judge and persists it to the database.
func (h *Handler) SendResult(c *gin.Context) {
	var req JudgeResultRequest
	if err := c.BindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Validate overall verdict
	if !req.Verdict.IsValid() {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid verdict value"})
		return
	}

	// Validate each per-test verdict
	for i, tr := range req.TestResults {
		if !tr.Verdict.IsValid() {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": fmt.Sprintf("invalid verdict in test_results[%d]", i),
			})
			return
		}
	}

	// Playground runs do not have a DB row — store the result back in Redis
	// under the same key the polling endpoint reads from, then return early.
	if submission.IsPlaygroundID(req.SubmissionID) {
		payload, err := json.Marshal(map[string]any{
			"id":             req.SubmissionID,
			"verdict":        req.Verdict,
			"message":        req.Message,
			"execution_time": req.ExecutionTime,
			"memory_usage":   req.MemoryUsage,
			"judge_output":   req.JudgeOutput,
		})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to encode result"})
			return
		}
		if err := redisService.SetWithTTL(&h.Redis, submission.PlaygroundResultKey(req.SubmissionID), string(payload), playgroundResultTTL); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to persist playground result"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"status": "updated"})
		return
	}

	// Persist everything inside a single transaction.
	err := h.DB.Transaction(func(tx *gorm.DB) error {
		// 1. Fetch the submission — it must exist and still be Pending.
		var sub submission.Submission
		if err := tx.First(&sub, req.SubmissionID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return errSubmissionNotFound
			}
			return err
		}
		if sub.Verdict != submission.VerdictPending {
			return errAlreadyJudged
		}

		// 2. Update the submission record with the judge's verdict and metrics.
		//    Using a map so zero/nil values are written (not skipped like struct updates).
		updates := map[string]interface{}{
			"verdict":        req.Verdict,
			"message":        req.Message,
			"execution_time": req.ExecutionTime,
			"memory_usage":   req.MemoryUsage,
			"judge_output":   req.JudgeOutput,
		}
		if err := tx.Model(&sub).Updates(updates).Error; err != nil {
			return err
		}

		// 3. Insert per-test-case results.
		for _, tr := range req.TestResults {
			tcr := submission.TestCaseResult{
				SubmissionID:  req.SubmissionID,
				TestCaseID:    tr.TestCaseID,
				Verdict:       tr.Verdict,
				ExecutionTime: tr.ExecutionTime,
				MemoryKB:      tr.MemoryKB,
				ActualOutput:  tr.ActualOutput,
			}
			if err := tx.Create(&tcr).Error; err != nil {
				return err
			}
		}

		return nil
	})

	if err != nil {
		switch {
		case errors.Is(err, errSubmissionNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": "submission not found"})
		case errors.Is(err, errAlreadyJudged):
			c.JSON(http.StatusConflict, gin.H{"error": "submission already judged"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to persist result"})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "updated"})
}

// Test is a simple liveness probe for the judge endpoint.
func (h *Handler) Test(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"status": "judge endpoint ok"})
}

// GetTestCases returns all test cases (including hidden) for a problem.
// This is an internal endpoint used by the Rust judge — no auth required
// since it is reachable only within the Docker network.
func (h *Handler) GetTestCases(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("problem_id"), 10, 64)
	if err != nil || id <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid problem_id"})
		return
	}

	var testCases []problem.TestCase
	if err := h.DB.Where("problem_id = ?", id).Order("position ASC, id ASC").Find(&testCases).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch test cases"})
		return
	}

	c.JSON(http.StatusOK, testCases)
}
