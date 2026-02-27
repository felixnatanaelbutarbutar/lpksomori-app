package main

import (
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"

	"lpkmori-backend/internal/middleware"
	"lpkmori-backend/internal/models"
	"lpkmori-backend/internal/service"
)

func main() {
	// Setup Database connection string
	dsn := "host=" + getEnv("DB_HOST", "localhost") +
		" user=" + getEnv("DB_USER", "lpkmori") +
		" password=" + getEnv("DB_PASSWORD", "lpkmori_secret") +
		" dbname=" + getEnv("DB_NAME", "lpkmori_db") +
		" port=" + getEnv("DB_PORT", "5432") +
		" sslmode=disable"
		
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	// AutoMigrate is safe to use although we have our own migration scripts;
	// it will create any missing indexes automatically
	db.AutoMigrate(
		&models.User{},
		&models.AcademicYear{},
		&models.Class{},
		&models.ClassEnrollment{},
		&models.Course{},
		&models.CourseActivity{},
		&models.Question{},
		&models.QuestionOption{},
		&models.StudentAnswer{},
	)

	// Seed default admin on first startup using proper Go bcrypt
	seedAdmin(db)

	// Initialize Services
	academicSvc := service.NewAcademicYearService(db)
	authSvc := service.NewAuthService(db, getEnv("JWT_SECRET", "super_secret_jwt_key_change_in_production"))
	userSvc := service.NewUserService(db)
	courseSvc := service.NewCourseService(db)

	router := gin.Default()

	// Enable CORS for all origins, required since frontend is at localhost:3000 and backend is at localhost:8080
	router.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"*"}, // Adjust in production
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	// V1 API Group (Clean Architecture Approach)
	api := router.Group("/api/v1")
	{
		// Health Check
		api.GET("/ping", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{"message": "pong", "status": "LPK Mori API is live"})
		})

		// ─── Academic Year CRUD ──────────────────────────────────────────────────
		academic := api.Group("/academic-years")
		{
			// GET /api/v1/academic-years
			academic.GET("", func(c *gin.Context) {
				list, err := academicSvc.ListAcademicYears(c.Request.Context())
				if err != nil {
					c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
					return
				}
				c.JSON(http.StatusOK, gin.H{"data": list})
			})

			// GET /api/v1/academic-years/active
			academic.GET("/active", func(c *gin.Context) {
				year, err := academicSvc.GetActiveYear(c.Request.Context())
				if err != nil {
					c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
					return
				}
				c.JSON(http.StatusOK, gin.H{"data": year})
			})

			// POST /api/v1/academic-years
			// Body: { "year_range": "2025/2026", "set_active": true }
			type CreateYearInput struct {
				YearRange string `json:"year_range" binding:"required"`
				SetActive bool   `json:"set_active"`
			}
			academic.POST("", func(c *gin.Context) {
				var input CreateYearInput
				if err := c.ShouldBindJSON(&input); err != nil {
					c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
					return
				}
				newYear, err := academicSvc.CreateAcademicYear(c.Request.Context(), input.YearRange, input.SetActive)
				if err != nil {
					c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
					return
				}
				c.JSON(http.StatusCreated, gin.H{
					"message": "Tahun ajaran dan 5 kelas default berhasil dibuat",
					"data":    newYear,
				})
			})

			// PATCH /api/v1/academic-years/:id/activate
			// Deactivates all others, activates the target. Enforces single-active constraint.
			academic.PATCH("/:id/activate", func(c *gin.Context) {
				var id int
				if _, err := fmt.Sscan(c.Param("id"), &id); err != nil {
					c.JSON(http.StatusBadRequest, gin.H{"error": "ID tidak valid"})
					return
				}
				year, err := academicSvc.SetActive(c.Request.Context(), id)
				if err != nil {
					c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
					return
				}
				c.JSON(http.StatusOK, gin.H{"message": "Tahun ajaran berhasil diaktifkan", "data": year})
			})

			// DELETE /api/v1/academic-years/:id
			academic.DELETE("/:id", func(c *gin.Context) {
				var id int
				if _, err := fmt.Sscan(c.Param("id"), &id); err != nil {
					c.JSON(http.StatusBadRequest, gin.H{"error": "ID tidak valid"})
					return
				}
				if err := academicSvc.DeleteAcademicYear(c.Request.Context(), id); err != nil {
					c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
					return
				}
				c.JSON(http.StatusOK, gin.H{"message": "Tahun ajaran berhasil dihapus"})
			})
		}

		// ─── Class CRUD ───────────────────────────────────────────────────────────
		classes := api.Group("/classes")
		{
			// GET /api/v1/classes?academic_year_id=1  (0 or empty = active year)
			classes.GET("", func(c *gin.Context) {
				var ayID int
				fmt.Sscan(c.Query("academic_year_id"), &ayID)
				list, err := academicSvc.ListClasses(c.Request.Context(), ayID)
				if err != nil {
					c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
					return
				}
				c.JSON(http.StatusOK, gin.H{"data": list})
			})

			// POST /api/v1/classes  — auto-linked to active academic year
			// Body: { "name": "Kelas 6", "level": 6 }
			type CreateClassInput struct {
				Name  string `json:"name"  binding:"required"`
				Level int    `json:"level" binding:"required"`
			}
			classes.POST("", func(c *gin.Context) {
				var input CreateClassInput
				if err := c.ShouldBindJSON(&input); err != nil {
					c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
					return
				}
				newClass, err := academicSvc.CreateClass(c.Request.Context(), input.Name, input.Level)
				if err != nil {
					c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
					return
				}
				c.JSON(http.StatusCreated, gin.H{"message": "Kelas berhasil ditambahkan", "data": newClass})
			})

			// PATCH /api/v1/classes/:id — rename a class
			type RenameClassInput struct {
				Name string `json:"name" binding:"required"`
			}
			classes.PATCH("/:id", func(c *gin.Context) {
				var id int
				if _, err := fmt.Sscan(c.Param("id"), &id); err != nil {
					c.JSON(http.StatusBadRequest, gin.H{"error": "ID tidak valid"})
					return
				}
				var input RenameClassInput
				if err := c.ShouldBindJSON(&input); err != nil {
					c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
					return
				}
				cls, err := academicSvc.RenameClass(c.Request.Context(), id, input.Name)
				if err != nil {
					c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
					return
				}
				c.JSON(http.StatusOK, gin.H{"message": "Kelas berhasil diubah", "data": cls})
			})

			// DELETE /api/v1/classes/:id
			classes.DELETE("/:id", func(c *gin.Context) {
				var id int
				if _, err := fmt.Sscan(c.Param("id"), &id); err != nil {
					c.JSON(http.StatusBadRequest, gin.H{"error": "ID tidak valid"})
					return
				}
				if err := academicSvc.DeleteClass(c.Request.Context(), id); err != nil {
					c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
					return
				}
				c.JSON(http.StatusOK, gin.H{"message": "Kelas berhasil dihapus"})
			})

			// GET /api/v1/classes/:id/enrollments
			classes.GET("/:id/enrollments", func(c *gin.Context) {
				var id int
				if _, err := fmt.Sscan(c.Param("id"), &id); err != nil {
					c.JSON(http.StatusBadRequest, gin.H{"error": "ID tidak valid"})
					return
				}
				list, err := academicSvc.ListEnrollments(c.Request.Context(), id)
				if err != nil {
					c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
					return
				}
				c.JSON(http.StatusOK, gin.H{"data": list})
			})

			// POST /api/v1/classes/:id/enrollments  — add a student to a class
			type EnrollInput struct {
				UserID int `json:"user_id" binding:"required"`
			}
			classes.POST("/:id/enrollments", func(c *gin.Context) {
				var classID int
				if _, err := fmt.Sscan(c.Param("id"), &classID); err != nil {
					c.JSON(http.StatusBadRequest, gin.H{"error": "ID tidak valid"})
					return
				}
				var input EnrollInput
				if err := c.ShouldBindJSON(&input); err != nil {
					c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
					return
				}
				enrollment, err := academicSvc.EnrollStudent(c.Request.Context(), classID, input.UserID)
				if err != nil {
					c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
					return
				}
				c.JSON(http.StatusCreated, gin.H{"message": "Siswa berhasil didaftarkan", "data": enrollment})
			})

			// DELETE /api/v1/classes/:id/enrollments/:user_id  — remove student from class
			classes.DELETE("/:id/enrollments/:user_id", func(c *gin.Context) {
				var classID, userID int
				fmt.Sscan(c.Param("id"), &classID)
				fmt.Sscan(c.Param("user_id"), &userID)
				if err := academicSvc.UnenrollStudent(c.Request.Context(), classID, userID); err != nil {
					c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
					return
				}
				c.JSON(http.StatusOK, gin.H{"message": "Siswa berhasil dikeluarkan dari kelas"})
			})
		}

		// Authentication Endpoints
		auth := api.Group("/auth")
		{
			type LoginInput struct {
				Email    string `json:"email" binding:"required,email"`
				Password string `json:"password" binding:"required"`
			}

			auth.POST("/login", func(c *gin.Context) {
				var input LoginInput
				if err := c.ShouldBindJSON(&input); err != nil {
					c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request parameters"})
					return
				}

				token, user, err := authSvc.Login(c.Request.Context(), input.Email, input.Password)
				if err != nil {
					c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
					return
				}

				c.JSON(http.StatusOK, gin.H{
					"token": token,
					"user":  user,
				})
			})

			// Endpoint specifically for Super Admin to create users (Teachers/Students/Admins)
			// Only email + password are required; all other fields are optional
			type RegisterInput struct {
				Email    string `json:"email"    binding:"required,email"`
				Password string `json:"password" binding:"required,min=6"`
				Role     string `json:"role"     binding:"required"`
				Name     string `json:"name"`     // optional
				NIS      string `json:"nis"`      // optional (for students)
				Photo    string `json:"photo"`    // optional
				Active   *bool  `json:"active"`   // optional, defaults to true
			}

			auth.POST("/register", func(c *gin.Context) {
				var input RegisterInput
				if err := c.ShouldBindJSON(&input); err != nil {
					c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
					return
				}

				// Validate role
				if input.Role != "admin" && input.Role != "teacher" && input.Role != "student" {
					c.JSON(http.StatusBadRequest, gin.H{"error": "Role must be admin, teacher, or student"})
					return
				}

				active := true
				if input.Active != nil {
					active = *input.Active
				}

				newUser := models.User{
					Email:    input.Email,
					Password: input.Password, // will be hashed by CreateUser
					Role:     input.Role,
					Name:     input.Name,
					NIS:      input.NIS,
					Photo:    input.Photo,
					Active:   active,
				}

				if err := authSvc.CreateUser(c.Request.Context(), &newUser); err != nil {
					c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user", "details": err.Error()})
					return
				}

				newUser.Password = ""
				c.JSON(http.StatusCreated, gin.H{
					"message": "User created successfully",
					"user":    newUser,
				})
			})
		}

		// ─── User Management CRUD (Admin only) ──────────────────────────────────
		users := api.Group("/users")
		{
			// GET /api/v1/users?role=teacher|student
			users.GET("", func(c *gin.Context) {
				role := c.Query("role") // optional filter
				list, err := userSvc.ListUsers(c.Request.Context(), role)
				if err != nil {
					c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
					return
				}
				c.JSON(http.StatusOK, gin.H{"data": list})
			})

			// GET /api/v1/users/:id
			users.GET("/:id", func(c *gin.Context) {
				var id int
				if _, err := fmt.Sscan(c.Param("id"), &id); err != nil {
					c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
					return
				}
				user, err := userSvc.GetUser(c.Request.Context(), id)
				if err != nil {
					c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
					return
				}
				c.JSON(http.StatusOK, gin.H{"data": user})
			})

			// PATCH /api/v1/users/:id — partial update (name, nis, photo, active)
			users.PATCH("/:id", func(c *gin.Context) {
				var id int
				if _, err := fmt.Sscan(c.Param("id"), &id); err != nil {
					c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
					return
				}
				var body map[string]interface{}
				if err := c.ShouldBindJSON(&body); err != nil {
					c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
					return
				}
				// Remove sensitive keys that must not be updated via this route
				delete(body, "password")
				delete(body, "email")
				user, err := userSvc.UpdateUser(c.Request.Context(), id, body)
				if err != nil {
					c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
					return
				}
				c.JSON(http.StatusOK, gin.H{"message": "User updated", "data": user})
			})

			// DELETE /api/v1/users/:id
			users.DELETE("/:id", func(c *gin.Context) {
				var id int
				if _, err := fmt.Sscan(c.Param("id"), &id); err != nil {
					c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
					return
				}
				if err := userSvc.DeleteUser(c.Request.Context(), id); err != nil {
					c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
					return
				}
				c.JSON(http.StatusOK, gin.H{"message": "User deleted"})
			})
		}

		// ─── Course (Mata Pelajaran) CRUD ───────────────────────────────────────
		// GET is public (all roles), write operations require teacher role.
		courses := api.Group("/courses")
		{
			// GET /api/v1/courses?class_id=1
			// Returns all courses for a class, with teacher info preloaded.
			courses.GET("", func(c *gin.Context) {
				var classID int
				fmt.Sscan(c.Query("class_id"), &classID)
				list, err := courseSvc.ListCourses(c.Request.Context(), classID)
				if err != nil {
					c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
					return
				}
				c.JSON(http.StatusOK, gin.H{"data": list})
			})

			// POST /api/v1/courses — TEACHER ONLY, teacher_id auto-filled from JWT
			type CreateCourseInput struct {
				ClassID int    `json:"class_id" binding:"required"`
				Name    string `json:"name"     binding:"required"`
			}
			courses.POST("",
				middleware.Auth(authSvc),
				middleware.RequireRole("teacher"),
				func(c *gin.Context) {
					var input CreateCourseInput
					if err := c.ShouldBindJSON(&input); err != nil {
						c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
						return
					}

					// teacher_id is taken directly from the JWT — not from the request body
					teacherID, _ := c.Get(middleware.CtxUserID)
					course, err := courseSvc.CreateCourse(
						c.Request.Context(),
						input.ClassID,
						teacherID.(int),
						input.Name,
					)
					if err != nil {
						c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
						return
					}
					c.JSON(http.StatusCreated, gin.H{"message": "Mata pelajaran berhasil ditambahkan", "data": course})
				},
			)

			// PATCH /api/v1/courses/:id — rename; only the owning teacher
			type UpdateCourseInput struct {
				Name string `json:"name" binding:"required"`
			}
			courses.PATCH("/:id",
				middleware.Auth(authSvc),
				middleware.RequireRole("teacher"),
				func(c *gin.Context) {
					var id int
					if _, err := fmt.Sscan(c.Param("id"), &id); err != nil {
						c.JSON(http.StatusBadRequest, gin.H{"error": "ID tidak valid"})
						return
					}
					var input UpdateCourseInput
					if err := c.ShouldBindJSON(&input); err != nil {
						c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
						return
					}
					teacherID, _ := c.Get(middleware.CtxUserID)
					course, err := courseSvc.UpdateCourse(c.Request.Context(), id, teacherID.(int), input.Name)
					if err != nil {
						c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
						return
					}
					c.JSON(http.StatusOK, gin.H{"message": "Mata pelajaran diperbarui", "data": course})
				},
			)

			// DELETE /api/v1/courses/:id — only the owning teacher
			courses.DELETE("/:id",
				middleware.Auth(authSvc),
				middleware.RequireRole("teacher"),
				func(c *gin.Context) {
					var id int
					if _, err := fmt.Sscan(c.Param("id"), &id); err != nil {
						c.JSON(http.StatusBadRequest, gin.H{"error": "ID tidak valid"})
						return
					}
					teacherID, _ := c.Get(middleware.CtxUserID)
					if err := courseSvc.DeleteCourse(c.Request.Context(), id, teacherID.(int)); err != nil {
						c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
						return
					}
					c.JSON(http.StatusOK, gin.H{"message": "Mata pelajaran dihapus"})
				},
			)
		}
	}

	port := getEnv("PORT", "8080")
	log.Printf("Server starting on port %s", port)
	if err := router.Run(":" + port); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}

// Helper to fallback to default env vars
func getEnv(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return fallback
}

// seedAdmin creates the default super admin on first startup.
// Uses Go's bcrypt directly — no shell escaping issues.
func seedAdmin(db *gorm.DB) {
	var count int64
	db.Model(&models.User{}).Where("email = ?", "admin@lpkmori.com").Count(&count)
	if count > 0 {
		log.Println("Admin user already exists, skipping seed.")
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte("password123"), bcrypt.DefaultCost)
	if err != nil {
		log.Printf("Failed to hash admin password: %v", err)
		return
	}

	admin := models.User{
		Name:     "Super Admin",
		Email:    "admin@lpkmori.com",
		Role:     "admin",
		Password: string(hash),
		Active:   true,
	}

	if err := db.Create(&admin).Error; err != nil {
		log.Printf("Failed to seed admin user: %v", err)
		return
	}

	log.Println("✅ Seeded admin user: admin@lpkmori.com / password123")
}
