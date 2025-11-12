package submission

import "github.com/gin-gonic/gin"

func router() {
	var router = gin.Default()

	router.GET("/api/submission", CreateSubmission)
}
