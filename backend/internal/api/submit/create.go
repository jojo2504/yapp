package submit

import (
    "backend/api/types/submission"
    "backend/internal/redisService"
    "net/http"

    "github.com/gin-gonic/gin"
)

func (h *Handler) SendSubmission(c *gin.Context) {
    var submission submission.Submission

    if err := c.BindJSON(&submission); err != nil {
        return
    }

    redisService.AddSubmission(&h.Redis, submission)

    c.IndentedJSON(http.StatusCreated, submission)
}
