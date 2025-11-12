package submission

import (
	"backend/api/types/submission"
	"net/http"

	"github.com/gin-gonic/gin"
)

func CreateSubmission(c *gin.Context) {
	var submission submission.Submission

	if err := c.BindJSON(&submission); err != nil {
		return
	}

	c.IndentedJSON(http.StatusCreated, submission)
}
