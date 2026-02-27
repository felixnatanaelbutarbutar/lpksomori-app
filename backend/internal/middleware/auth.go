package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"lpkmori-backend/internal/service"
)

const (
	CtxUserID = "user_id"
	CtxRole   = "role"
)

// Auth validates the Bearer JWT token and injects user_id + role into context.
func Auth(authSvc service.AuthService) gin.HandlerFunc {
	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		if !strings.HasPrefix(header, "Bearer ") {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "token diperlukan"})
			return
		}
		tokenStr := strings.TrimPrefix(header, "Bearer ")
		claims, err := authSvc.ValidateToken(tokenStr)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "token tidak valid atau sudah kedaluwarsa"})
			return
		}

		// Store claims into Gin context
		if uid, ok := (*claims)["user_id"]; ok {
			c.Set(CtxUserID, int(uid.(float64)))
		}
		if role, ok := (*claims)["role"]; ok {
			c.Set(CtxRole, role.(string))
		}

		c.Next()
	}
}

// RequireRole aborts with 403 if the authenticated user's role is not in allowed list.
func RequireRole(roles ...string) gin.HandlerFunc {
	allowed := make(map[string]struct{}, len(roles))
	for _, r := range roles {
		allowed[r] = struct{}{}
	}
	return func(c *gin.Context) {
		role, _ := c.Get(CtxRole)
		if _, ok := allowed[role.(string)]; !ok {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
				"error": "akses ditolak — role Anda tidak memiliki izin untuk tindakan ini",
			})
			return
		}
		c.Next()
	}
}
