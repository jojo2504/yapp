package stats

import (
	"backend/api/types/challenge"
	"backend/api/types/course"
	"backend/api/types/exam"
	"backend/api/types/group"
	"backend/api/types/submission"
	"backend/internal/api/middleware"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type Handler struct {
	db *gorm.DB
}

func NewHandler(db *gorm.DB) *Handler {
	return &Handler{db: db}
}

// ── Admin / Teacher stats ─────────────────────────────────────────────────────

type StatsResponse struct {
	Challenges int64 `json:"challenges"`
	Courses    int64 `json:"courses"`
	Exams      int64 `json:"exams"`
	Groups     int64 `json:"groups"`
}

func (h *Handler) GetStats(c *gin.Context) {
	userID := middleware.GetUserID(c)
	userRole := middleware.GetUserRole(c)

	var challenges, coursesCount, examsCount, groupsCount int64

	challengeQ := h.db.Model(&challenge.Challenge{})
	courseQ := h.db.Model(&course.Course{})
	examQ := h.db.Model(&exam.Exam{})
	groupQ := h.db.Model(&group.Group{})

	if userRole != "Admin" {
		challengeQ = challengeQ.Where("created_by = ?", userID)
		courseQ = courseQ.Where("created_by = ?", userID)
		examQ = examQ.Where("created_by = ?", userID)
		groupQ = groupQ.Where("created_by = ?", userID)
	}

	challengeQ.Count(&challenges)
	courseQ.Count(&coursesCount)
	examQ.Count(&examsCount)
	groupQ.Count(&groupsCount)

	c.JSON(http.StatusOK, StatsResponse{
		Challenges: challenges,
		Courses:    coursesCount,
		Exams:      examsCount,
		Groups:     groupsCount,
	})
}

// ── Student stats ─────────────────────────────────────────────────────────────

type RecentSubmission struct {
	ID        int64  `json:"id"`
	ProblemID int64  `json:"problem_id"`
	Language  string `json:"language"`
	Verdict   string `json:"verdict"`
	CreatedAt string `json:"created_at"`
}

type StudentStatsResponse struct {
	Submissions       int64              `json:"submissions"`
	Solved            int64              `json:"solved"`
	RecentSubmissions []RecentSubmission `json:"recent_submissions"`
}

func (h *Handler) GetStudentStats(c *gin.Context) {
	userID := middleware.GetUserID(c)

	var totalSubmissions int64
	h.db.Model(&submission.Submission{}).
		Where("user_id = ? AND problem_id != 0", userID).
		Count(&totalSubmissions)

	var solved int64
	h.db.Raw(
		"SELECT COUNT(DISTINCT problem_id) FROM submissions WHERE user_id = ? AND verdict = ? AND deleted_at IS NULL",
		userID, string(submission.VerdictAccepted),
	).Scan(&solved)

	var recent []submission.Submission
	h.db.Where("user_id = ? AND problem_id != 0", userID).
		Order("created_at DESC").
		Limit(5).
		Find(&recent)

	recentList := make([]RecentSubmission, 0, len(recent))
	for _, s := range recent {
		recentList = append(recentList, RecentSubmission{
			ID:        s.ID,
			ProblemID: s.ProblemID,
			Language:  string(s.Language),
			Verdict:   string(s.Verdict),
			CreatedAt: s.CreatedAt.Format(time.RFC3339),
		})
	}

	c.JSON(http.StatusOK, StudentStatsResponse{
		Submissions:       totalSubmissions,
		Solved:            solved,
		RecentSubmissions: recentList,
	})
}
