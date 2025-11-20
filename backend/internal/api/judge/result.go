package judge

import (
    "backend/api/types/submission"
    "net/http"

    "github.com/gin-gonic/gin"
)

func SendResult(c *gin.Context) {
    var submission submission.Submission
    if err := c.BindJSON(&submission); err != nil {
        return
    }

    c.IndentedJSON(http.StatusCreated, submission)
}

func Test(c *gin.Context) {
    c.IndentedJSON(http.StatusCreated, 1)
}
