package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

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
		&models.ClassActivity{},
		&models.Question{},
		&models.QuestionOption{},
		&models.StudentAnswer{},
		&models.Assignment{},
		&models.Submission{},
		&models.Exam{},
		&models.ExamQuestion{},
		&models.ExamAnswer{},
		&models.Notification{},
		&models.Announcement{},
		&models.GradeRecap{},
		&models.ExamSubmission{},
	)

	// Seed default users on first startup
	seedUsers(db)

	// Initialize Services
	academicSvc := service.NewAcademicYearService(db)
	authSvc := service.NewAuthService(db, getEnv("JWT_SECRET", "super_secret_jwt_key_change_in_production"))
	userSvc := service.NewUserService(db)
	assignSvc := service.NewAssignmentService(db)
	gradeSvc := service.NewGradeService(db)

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

			// GET /api/v1/classes/:id
			classes.GET("/:id", func(c *gin.Context) {
				var id int
				if _, err := fmt.Sscan(c.Param("id"), &id); err != nil {
					c.JSON(http.StatusBadRequest, gin.H{"error": "ID tidak valid"})
					return
				}
				cls, err := academicSvc.GetClass(c.Request.Context(), id)
				if err != nil {
					c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
					return
				}
				c.JSON(http.StatusOK, gin.H{"data": cls})
			})

			// POST /api/v1/classes  — auto-linked to active academic year
			type CreateClassInput struct {
				Name      string `json:"name"      binding:"required"`
				BabStart  int    `json:"bab_start" binding:"required"`
				BabEnd    int    `json:"bab_end"   binding:"required"`
				TeacherID *int   `json:"teacher_id"`
			}
			classes.POST("", func(c *gin.Context) {
				var input CreateClassInput
				if err := c.ShouldBindJSON(&input); err != nil {
					c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
					return
				}
				newClass, err := academicSvc.CreateClass(c.Request.Context(), input.Name, input.BabStart, input.BabEnd, input.TeacherID)
				if err != nil {
					c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
					return
				}
				c.JSON(http.StatusCreated, gin.H{"message": "Kelas berhasil ditambahkan", "data": newClass})
			})

			// PATCH /api/v1/classes/:id — rename a class
			type RenameClassInput struct {
				Name      string `json:"name"      binding:"required"`
				BabStart  int    `json:"bab_start" binding:"required"`
				BabEnd    int    `json:"bab_end"   binding:"required"`
				TeacherID *int   `json:"teacher_id"`
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
				cls, err := academicSvc.RenameClass(c.Request.Context(), id, input.Name, input.BabStart, input.BabEnd, input.TeacherID)
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

			// GET /classes/:id/recap
			classes.GET("/:id/recap",
				middleware.Auth(authSvc), middleware.RequireRole("teacher"),
				func(c *gin.Context) {
					var id int
					fmt.Sscan(c.Param("id"), &id)
					list, err := gradeSvc.GetClassRecap(c.Request.Context(), id)
					if err != nil {
						c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
						return
					}
					c.JSON(http.StatusOK, gin.H{"data": list})
				},
			)

			// POST /classes/:id/recap/:student_id - save/update recap
			classes.POST("/:id/recap/:student_id",
				middleware.Auth(authSvc), middleware.RequireRole("teacher"),
				func(c *gin.Context) {
					var classID, studentID int
					fmt.Sscan(c.Param("id"), &classID)
					fmt.Sscan(c.Param("student_id"), &studentID)
					teacherID, _ := c.Get(middleware.CtxUserID)

					type RecapInput struct {
						Status     string  `json:"status"`
						Notes      string  `json:"notes"`
						FinalScore float64 `json:"final_score"`
					}
					var input RecapInput
					if err := c.ShouldBindJSON(&input); err != nil {
						c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
						return
					}

					recap, err := gradeSvc.SaveRecap(c.Request.Context(), classID, studentID, input.Status, input.Notes, input.FinalScore, teacherID.(int))
					if err != nil {
						c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
						return
					}
					c.JSON(http.StatusOK, gin.H{"message": "Recap saved", "data": recap})
				},
			)

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

			// POST /api/v1/classes/:id/enrollments/bulk — add multiple students
			type EnrollBulkInput struct {
				UserIDs []int `json:"user_ids" binding:"required"`
			}
			classes.POST("/:id/enrollments/bulk", func(c *gin.Context) {
				var classID int
				if _, err := fmt.Sscan(c.Param("id"), &classID); err != nil {
					c.JSON(http.StatusBadRequest, gin.H{"error": "ID tidak valid"})
					return
				}
				var input EnrollBulkInput
				if err := c.ShouldBindJSON(&input); err != nil {
					c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
					return
				}
				if err := academicSvc.EnrollBulkStudents(c.Request.Context(), classID, input.UserIDs); err != nil {
					c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
					return
				}
				c.JSON(http.StatusCreated, gin.H{"message": "Siswa berhasil didaftarkan secara massal"})
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
				Name     string `json:"name"`   // optional
				NIS      string `json:"nis"`    // optional (for students)
				Photo    string `json:"photo"`  // optional
				Active   *bool  `json:"active"` // optional, defaults to true
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

			// POST /api/v1/users/:id/photo
			users.POST("/:id/photo", func(c *gin.Context) {
				var id int
				if _, err := fmt.Sscan(c.Param("id"), &id); err != nil {
					c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
					return
				}

				fileHeader, err := c.FormFile("file")
				if err != nil {
					c.JSON(http.StatusBadRequest, gin.H{"error": "File tidak ditemukan: " + err.Error()})
					return
				}

				dst := fmt.Sprintf("%s/profile_%d_%s", getEnv("UPLOAD_DIR", "/app/uploads"), id, fileHeader.Filename)
				if err := c.SaveUploadedFile(fileHeader, dst); err != nil {
					c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menyimpan file: " + err.Error()})
					return
				}

				fileURL := fmt.Sprintf("/uploads/profile_%d_%s", id, fileHeader.Filename)

				user, err := userSvc.UpdateUser(c.Request.Context(), id, map[string]interface{}{
					"photo": fileURL,
				})
				if err != nil {
					c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal update foto: " + err.Error()})
					return
				}

				c.JSON(http.StatusOK, gin.H{"message": "Foto profil diperbarui", "data": user})
			})

			// PATCH /api/v1/users/:id/password — Admin resets a user's password
			type ResetPasswordInput struct {
				Password string `json:"password" binding:"required,min=6"`
			}
			users.PATCH("/:id/password", func(c *gin.Context) {
				var id int
				if _, err := fmt.Sscan(c.Param("id"), &id); err != nil {
					c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
					return
				}
				var input ResetPasswordInput
				if err := c.ShouldBindJSON(&input); err != nil {
					c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
					return
				}
				hash, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
				if err != nil {
					c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengenkripsi password"})
					return
				}
				if err := db.Model(&models.User{}).Where("id = ?", id).Update("password", string(hash)).Error; err != nil {
					c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
					return
				}
				c.JSON(http.StatusOK, gin.H{"message": "Password berhasil diperbarui"})
			})
		}

		// Serve uploaded files statically
		router.Static("/uploads", getEnv("UPLOAD_DIR", "/app/uploads"))

		// ─── Assignments (Tugas) ──────────────────────────────────────────────────
		// GET is open; POST/DELETE require teacher auth.
		assignments := api.Group("/assignments")
		{
			// GET /api/v1/assignments?class_id=1
			assignments.GET("", func(c *gin.Context) {
				var classID int
				fmt.Sscan(c.Query("class_id"), &classID)
				list, err := assignSvc.ListAssignments(c.Request.Context(), classID)
				if err != nil {
					c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
					return
				}
				c.JSON(http.StatusOK, gin.H{"data": list})
			})

			// GET /assignments/:id - Open to all authed
			assignments.GET("/:id",
				middleware.Auth(authSvc),
				func(c *gin.Context) {
					var id int
					fmt.Sscan(c.Param("id"), &id)
					a, err := assignSvc.GetAssignment(c.Request.Context(), id)
					if err != nil {
						c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
						return
					}
					// Return assignment info. And if student, they can also fetch their submission next.
					c.JSON(http.StatusOK, gin.H{"data": a})
				},
			)

			assignments.POST("",
				middleware.Auth(authSvc), middleware.RequireRole("teacher"),
				func(c *gin.Context) {
					classIDStr := c.PostForm("class_id")
					var classID int
					if _, err := fmt.Sscan(classIDStr, &classID); err != nil {
						c.JSON(http.StatusBadRequest, gin.H{"error": "class_id tidak valid"})
						return
					}

					title := c.PostForm("title")
					if title == "" {
						c.JSON(http.StatusBadRequest, gin.H{"error": "title is required"})
						return
					}
					description := c.PostForm("description")

					var dueDate *time.Time
					dueDateStr := c.PostForm("due_date")
					if dueDateStr != "" {
						if t, err := time.Parse(time.RFC3339, dueDateStr); err == nil {
							dueDate = &t
						}
					}

					fileURL := ""
					if fileHeader, err := c.FormFile("file"); err == nil {
						dst := fmt.Sprintf("%s/assign_%d_%s", getEnv("UPLOAD_DIR", "/app/uploads"), classID, fileHeader.Filename)
						if err := c.SaveUploadedFile(fileHeader, dst); err == nil {
							fileURL = fmt.Sprintf("/uploads/assign_%d_%s", classID, fileHeader.Filename)
						}
					}

					a, err := assignSvc.CreateAssignment(c.Request.Context(), classID, title, description, fileURL, dueDate)
					if err != nil {
						c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
						return
					}
					c.JSON(http.StatusCreated, gin.H{"message": "Tugas berhasil dibuat", "data": a})
				},
			)

			assignments.DELETE("/:id",
				middleware.Auth(authSvc), middleware.RequireRole("teacher"),
				func(c *gin.Context) {
					var id int
					fmt.Sscan(c.Param("id"), &id)
					assignSvc.DeleteAssignment(c.Request.Context(), id)
					c.JSON(http.StatusOK, gin.H{"message": "Tugas dihapus"})
				},
			)

			// GET /assignments/:id/submissions (teacher view)
			assignments.GET("/:id/submissions",
				middleware.Auth(authSvc),
				func(c *gin.Context) {
					var id int
					fmt.Sscan(c.Param("id"), &id)
					list, err := assignSvc.ListSubmissions(c.Request.Context(), id)
					if err != nil {
						c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
						return
					}
					c.JSON(http.StatusOK, gin.H{"data": list})
				},
			)

			// GET /assignments/:id/my_submission
			assignments.GET("/:id/my_submission",
				middleware.Auth(authSvc), middleware.RequireRole("student"),
				func(c *gin.Context) {
					var id int
					fmt.Sscan(c.Param("id"), &id)
					studentID, _ := c.Get(middleware.CtxUserID)
					sub, err := assignSvc.GetSubmission(c.Request.Context(), id, studentID.(int))
					if err != nil {
						c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
						return
					}
					c.JSON(http.StatusOK, gin.H{"data": sub})
				},
			)

			// POST /assignments/:id/submissions — student uploads file
			assignments.POST("/:id/submissions",
				middleware.Auth(authSvc), middleware.RequireRole("student"),
				func(c *gin.Context) {
					var assignID int
					fmt.Sscan(c.Param("id"), &assignID)
					studentID, _ := c.Get(middleware.CtxUserID)
					note := c.PostForm("note")
					fileURL := ""
					if fileHeader, err := c.FormFile("file"); err == nil {
						dst := fmt.Sprintf("%s/sub_%d_%d_%s", getEnv("UPLOAD_DIR", "/app/uploads"), assignID, studentID.(int), fileHeader.Filename)
						if err := c.SaveUploadedFile(fileHeader, dst); err == nil {
							fileURL = fmt.Sprintf("/uploads/sub_%d_%d_%s", assignID, studentID.(int), fileHeader.Filename)
						}
					}
					sub, err := assignSvc.Submit(c.Request.Context(), assignID, studentID.(int), fileURL, note)
					if err != nil {
						c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
						return
					}
					c.JSON(http.StatusCreated, gin.H{"message": "Tugas berhasil dikumpulkan", "data": sub})
				},
			)

			// PATCH /assignments/:id/submissions/:sub_id/grade — teacher grades
			type GradeInput struct {
				Grade    *float64 `json:"grade"    binding:"required"`
				Feedback string   `json:"feedback"`
			}
			assignments.PATCH("/:id/submissions/:sub_id/grade",
				middleware.Auth(authSvc), middleware.RequireRole("teacher"),
				func(c *gin.Context) {
					var subID int
					fmt.Sscan(c.Param("sub_id"), &subID)
					var input GradeInput
					if err := c.ShouldBindJSON(&input); err != nil {
						c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
						return
					}
					sub, err := assignSvc.GradeSubmission(c.Request.Context(), subID, *input.Grade, input.Feedback)
					if err != nil {
						c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
						return
					}
					c.JSON(http.StatusOK, gin.H{"message": "Nilai berhasil disimpan", "data": sub})
				},
			)
		}

		// ─── Exams (Ujian) ────────────────────────────────────────────────────────────
		exams := api.Group("/exams")
		{
			exams.GET("", func(c *gin.Context) {
				var classID int
				fmt.Sscan(c.Query("class_id"), &classID)
				list, err := assignSvc.ListExams(c.Request.Context(), classID)
				if err != nil {
					c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
					return
				}
				c.JSON(http.StatusOK, gin.H{"data": list})
			})

			exams.GET("/:id", func(c *gin.Context) {
				var id int
				fmt.Sscan(c.Param("id"), &id)
				exam, err := assignSvc.GetExam(c.Request.Context(), id)
				if err != nil {
					c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
					return
				}
				c.JSON(http.StatusOK, gin.H{"data": exam})
			})

			type CreateExamInput struct {
				ClassID     int        `json:"class_id"    binding:"required"`
				Title       string     `json:"title"       binding:"required"`
				Description string     `json:"description"`
				StartTime   *time.Time `json:"start_time"`
				EndTime     *time.Time `json:"end_time"`
				MaxAttempts int        `json:"max_attempts"`
			}
			exams.POST("",
				middleware.Auth(authSvc), middleware.RequireRole("teacher", "admin"),
				func(c *gin.Context) {
					var input CreateExamInput
					if err := c.ShouldBindJSON(&input); err != nil {
						c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
						return
					}
					exam, err := assignSvc.CreateExam(c.Request.Context(), input.ClassID, input.Title, input.Description, input.StartTime, input.EndTime, input.MaxAttempts)
					if err != nil {
						c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
						return
					}
					c.JSON(http.StatusCreated, gin.H{"message": "Ujian berhasil dibuat", "data": exam})
				},
			)

			exams.PUT("/:id",
				middleware.Auth(authSvc), middleware.RequireRole("teacher", "admin"),
				func(c *gin.Context) {
					var id int
					fmt.Sscan(c.Param("id"), &id)
					var input CreateExamInput
					if err := c.ShouldBindJSON(&input); err != nil {
						c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
						return
					}
					err := assignSvc.EditExam(c.Request.Context(), id, input.Title, input.Description, input.StartTime, input.EndTime, input.MaxAttempts)
					if err != nil {
						c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
						return
					}
					c.JSON(http.StatusOK, gin.H{"message": "Ujian diperbarui"})
				},
			)

			exams.DELETE("/:id",
				middleware.Auth(authSvc), middleware.RequireRole("teacher", "admin"),
				func(c *gin.Context) {
					var id int
					fmt.Sscan(c.Param("id"), &id)
					assignSvc.DeleteExam(c.Request.Context(), id)
					c.JSON(http.StatusOK, gin.H{"message": "Ujian dihapus"})
				},
			)

			// POST /exams/:id/questions — add question with flexible JSON options
			type AddQuestionInput struct {
				QuestionType string          `json:"question_type" binding:"required"` // multiple_choice|essay|file_upload
				Text         string          `json:"text"          binding:"required"`
				Points       int             `json:"points"`
				Options      json.RawMessage `json:"options"` // [{"text":"A","is_correct":true},...]
			}
			exams.POST("/:id/questions",
				middleware.Auth(authSvc), middleware.RequireRole("teacher", "admin"),
				func(c *gin.Context) {
					var examID int
					fmt.Sscan(c.Param("id"), &examID)
					var input AddQuestionInput
					if err := c.ShouldBindJSON(&input); err != nil {
						c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
						return
					}
					points := input.Points
					if points == 0 {
						points = 1
					}
					q, err := assignSvc.AddQuestion(c.Request.Context(), examID, input.QuestionType, input.Text, points, input.Options)
					if err != nil {
						c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
						return
					}
					c.JSON(http.StatusCreated, gin.H{"message": "Soal berhasil ditambahkan", "data": q})
				},
			)

			exams.PUT("/questions/:qid",
				middleware.Auth(authSvc), middleware.RequireRole("teacher", "admin"),
				func(c *gin.Context) {
					var qid int
					fmt.Sscan(c.Param("qid"), &qid)
					var input AddQuestionInput
					if err := c.ShouldBindJSON(&input); err != nil {
						c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
						return
					}
					points := input.Points
					if points == 0 {
						points = 1
					}
					q, err := assignSvc.EditQuestion(c.Request.Context(), qid, input.QuestionType, input.Text, points, input.Options)
					if err != nil {
						c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
						return
					}
					c.JSON(http.StatusOK, gin.H{"message": "Soal berhasil diperbarui", "data": q})
				},
			)

			exams.DELETE("/questions/:qid",
				middleware.Auth(authSvc), middleware.RequireRole("teacher", "admin"),
				func(c *gin.Context) {
					var qid int
					fmt.Sscan(c.Param("qid"), &qid)
					assignSvc.DeleteQuestion(c.Request.Context(), qid)
					c.JSON(http.StatusOK, gin.H{"message": "Soal dihapus"})
				},
			)

			exams.POST("/questions/:qid/answers",
				middleware.Auth(authSvc), middleware.RequireRole("student"),
				func(c *gin.Context) {
					var qid int
					fmt.Sscan(c.Param("qid"), &qid)
					
					answerText := c.PostForm("answer_text")
					fileURL := ""

					if fileHeader, err := c.FormFile("file"); err == nil {
						// Store simple local path for now or abstract if desired
						dst := fmt.Sprintf("./uploads/exam_ans_%d_%s", qid, fileHeader.Filename)
						os.MkdirAll("./uploads", os.ModePerm)
						if err := c.SaveUploadedFile(fileHeader, dst); err == nil {
							fileURL = "/uploads/" + fmt.Sprintf("exam_ans_%d_%s", qid, fileHeader.Filename)
						}
					}

					studentID, _ := c.Get(middleware.CtxUserID)
					ans, err := assignSvc.SubmitAnswer(c.Request.Context(), qid, studentID.(int), answerText, fileURL)
					if err != nil {
						c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
						return
					}
					c.JSON(http.StatusCreated, gin.H{"data": ans})
				},
			)

			// POST /exams/:id/submit — finishes the exam attempt
			exams.POST("/:id/submit",
				middleware.Auth(authSvc), middleware.RequireRole("student"),
				func(c *gin.Context) {
					var examID int
					fmt.Sscan(c.Param("id"), &examID)
					studentID, _ := c.Get(middleware.CtxUserID)
					totalScore, maxScore, score100, err := assignSvc.FinishExamAttempt(c.Request.Context(), examID, studentID.(int))
					if err != nil {
						c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
						return
					}
					c.JSON(http.StatusOK, gin.H{
						"message":    "Ujian selesai dikumpulkan",
						"total_score": totalScore,
						"max_score":   maxScore,
						"score_100":   score100,
					})
				},
			)

			// Teacher grading routes
			exams.GET("/:id/students",
				middleware.Auth(authSvc), middleware.RequireRole("teacher", "admin"),
				func(c *gin.Context) {
					var examID int
					fmt.Sscan(c.Param("id"), &examID)
					students, err := assignSvc.GetExamStudents(c.Request.Context(), examID)
					if err != nil {
						c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
						return
					}
					c.JSON(http.StatusOK, gin.H{"data": students})
				},
			)

			exams.GET("/:id/students/:student_id/answers",
				middleware.Auth(authSvc), middleware.RequireRole("teacher", "admin"),
				func(c *gin.Context) {
					var examID, studentID int
					fmt.Sscan(c.Param("id"), &examID)
					fmt.Sscan(c.Param("student_id"), &studentID)

					answers, err := assignSvc.GetStudentAnswers(c.Request.Context(), examID, studentID)
					if err != nil {
						c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
						return
					}
					c.JSON(http.StatusOK, gin.H{"data": answers})
				},
			)

			type GradeAnswerInput struct {
				Score float64 `json:"score"` // allow zero
			}
			exams.PATCH("/answers/:id/score",
				middleware.Auth(authSvc), middleware.RequireRole("teacher", "admin"),
				func(c *gin.Context) {
					var answerID int
					fmt.Sscan(c.Param("id"), &answerID)
					var input GradeAnswerInput
					if err := c.ShouldBindJSON(&input); err != nil {
						c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
						return
					}
					ans, err := assignSvc.GradeAnswer(c.Request.Context(), answerID, input.Score)
					if err != nil {
						c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
						return
					}
					c.JSON(http.StatusOK, gin.H{"message": "Nilai berhasil disimpan", "data": ans})
				},
			)
		}

		// ─── Notifications ─────────────────────────────────────────────────────────
		notifs := api.Group("/notifications", middleware.Auth(authSvc))
		{
			notifs.GET("", func(c *gin.Context) {
				userID, _ := c.Get(middleware.CtxUserID)
				list, _ := assignSvc.GetNotifications(c.Request.Context(), userID.(int))
				count, _ := assignSvc.UnreadCount(c.Request.Context(), userID.(int))
				c.JSON(http.StatusOK, gin.H{"data": list, "unread_count": count})
			})
			notifs.PATCH("/read-all", func(c *gin.Context) {
				userID, _ := c.Get(middleware.CtxUserID)
				assignSvc.MarkAllRead(c.Request.Context(), userID.(int))
				c.JSON(http.StatusOK, gin.H{"message": "Semua notifikasi ditandai telah dibaca"})
			})
			notifs.GET("/unread-count", func(c *gin.Context) {
				userID, _ := c.Get(middleware.CtxUserID)
				count, _ := assignSvc.UnreadCount(c.Request.Context(), userID.(int))
				c.JSON(http.StatusOK, gin.H{"unread_count": count})
			})
		}

		// ─── Student Dashboard ───────────────────────────────────────────────────
		api.GET("/student/dashboard", middleware.Auth(authSvc), middleware.RequireRole("student"), func(c *gin.Context) {
			studentID, _ := c.Get(middleware.CtxUserID)
			data, err := assignSvc.GetStudentDashboard(c.Request.Context(), studentID.(int))
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}
			c.JSON(http.StatusOK, gin.H{"data": data})
		})

		// ─── Admin Dashboard Stats ────────────────────────────────────────────────
		api.GET("/stats", func(c *gin.Context) {
			var activeStudents int64
			db.Model(&models.User{}).Where("role = ? AND active = ?", "student", true).Count(&activeStudents)
			var activeYear models.AcademicYear
			db.Where("is_active = ?", true).First(&activeYear)
			var totalClasses int64
			if activeYear.ID > 0 {
				db.Model(&models.Class{}).Where("academic_year_id = ?", activeYear.ID).Count(&totalClasses)
			} else {
				db.Model(&models.Class{}).Count(&totalClasses)
			}
			var totalYears int64
			db.Model(&models.AcademicYear{}).Count(&totalYears)
			var completedExams int64
			db.Model(&models.ExamAnswer{}).Count(&completedExams)
			var totalTeachers int64
			db.Model(&models.User{}).Where("role = ?", "teacher").Count(&totalTeachers)
			var newStudentsThisMonth int64
			now := time.Now()
			startOfMonth := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
			db.Model(&models.User{}).Where("role = ? AND created_at >= ?", "student", startOfMonth).Count(&newStudentsThisMonth)
			c.JSON(http.StatusOK, gin.H{
				"active_students":    activeStudents,
				"total_classes":      totalClasses,
				"active_year":        activeYear.YearRange,
				"total_years":        totalYears,
				"completed_exams":    completedExams,
				"total_teachers":     totalTeachers,
				"new_students_month": newStudentsThisMonth,
			})
		})

		// ─── Announcements (Pengumuman) ──────────────────────────────────────────────
		// GET  /api/v1/announcements        — list all active announcements (all roles)
		// POST /api/v1/announcements        — create (admin | teacher only)
		// GET  /api/v1/announcements/:id    — detail
		// PATCH /api/v1/announcements/:id   — update (owner or admin)
		// DELETE /api/v1/announcements/:id  — delete (owner or admin)
		// PATCH /api/v1/announcements/:id/pin — toggle pin (admin only)
		announcements := api.Group("/announcements")
		{
			// GET /api/v1/announcements
			announcements.GET("", func(c *gin.Context) {
				var list []models.Announcement
				db.Preload("Creator").Order("is_pinned DESC, created_at DESC").Find(&list)
				// Omit creator password
				for i := range list {
					list[i].Creator.Password = ""
				}
				c.JSON(http.StatusOK, gin.H{"data": list})
			})

			// GET /api/v1/announcements/:id
			announcements.GET("/:id", func(c *gin.Context) {
				var id int
				fmt.Sscan(c.Param("id"), &id)
				var ann models.Announcement
				if err := db.Preload("Creator").First(&ann, id).Error; err != nil {
					c.JSON(http.StatusNotFound, gin.H{"error": "Pengumuman tidak ditemukan"})
					return
				}
				ann.Creator.Password = ""
				c.JSON(http.StatusOK, gin.H{"data": ann})
			})

			// POST /api/v1/announcements
			type CreateAnnouncementInput struct {
				Title     string `json:"title"      binding:"required"`
				TitleJa   string `json:"title_ja"`
				Content   string `json:"content"    binding:"required"`
				ContentJa string `json:"content_ja"`
				IsPinned  bool   `json:"is_pinned"`
			}
			announcements.POST("",
				middleware.Auth(authSvc),
				func(c *gin.Context) {
					// Only admin or teacher
					creatorRole, _ := c.Get(middleware.CtxRole)
					if creatorRole != "admin" && creatorRole != "teacher" {
						c.JSON(http.StatusForbidden, gin.H{"error": "Hanya admin atau guru yang dapat membuat pengumuman"})
						return
					}
					var input CreateAnnouncementInput
					if err := c.ShouldBindJSON(&input); err != nil {
						c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
						return
					}
					creatorID, _ := c.Get(middleware.CtxUserID)
					ann := models.Announcement{
						Title:       input.Title,
						TitleJa:     input.TitleJa,
						Content:     input.Content,
						ContentJa:   input.ContentJa,
						CreatorID:   creatorID.(int),
						CreatorRole: creatorRole.(string),
						IsPinned:    input.IsPinned,
						IsActive:    true,
					}
					if err := db.Create(&ann).Error; err != nil {
						c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
						return
					}
					// Preload creator
					db.Preload("Creator").First(&ann, ann.ID)
					ann.Creator.Password = ""

					// ★ Fan-out: create notification for ALL users
					go func(annID int, title, content string) {
						var allUsers []models.User
						db.Select("id").Find(&allUsers)
						for _, u := range allUsers {
							notif := models.Notification{
								UserID:  u.ID,
								Title:   "📣 " + title,
								Message: content,
								Type:    "announcement",
								RefID:   annID,
							}
							db.Create(&notif)
						}
					}(ann.ID, ann.Title, ann.Content)

					c.JSON(http.StatusCreated, gin.H{"message": "Pengumuman berhasil dibuat", "data": ann})
				},
			)

			// PATCH /api/v1/announcements/:id
			type UpdateAnnouncementInput struct {
				Title     string `json:"title"`
				TitleJa   string `json:"title_ja"`
				Content   string `json:"content"`
				ContentJa string `json:"content_ja"`
				IsActive  *bool  `json:"is_active"`
			}
			announcements.PATCH("/:id",
				middleware.Auth(authSvc),
				func(c *gin.Context) {
					var id int
					fmt.Sscan(c.Param("id"), &id)
					var ann models.Announcement
					if err := db.First(&ann, id).Error; err != nil {
						c.JSON(http.StatusNotFound, gin.H{"error": "Pengumuman tidak ditemukan"})
						return
					}
					creatorID, _ := c.Get(middleware.CtxUserID)
					creatorRole, _ := c.Get(middleware.CtxRole)
					// Only owner or admin can edit
					if ann.CreatorID != creatorID.(int) && creatorRole != "admin" {
						c.JSON(http.StatusForbidden, gin.H{"error": "Tidak punya izin"})
						return
					}
					var input UpdateAnnouncementInput
					c.ShouldBindJSON(&input)
					updates := map[string]interface{}{}
					if input.Title != "" {
						updates["title"] = input.Title
					}
					if input.TitleJa != "" {
						updates["title_ja"] = input.TitleJa
					}
					if input.Content != "" {
						updates["content"] = input.Content
					}
					if input.ContentJa != "" {
						updates["content_ja"] = input.ContentJa
					}
					if input.IsActive != nil {
						updates["is_active"] = *input.IsActive
					}
					db.Model(&ann).Updates(updates)
					db.Preload("Creator").First(&ann, id)
					ann.Creator.Password = ""
					c.JSON(http.StatusOK, gin.H{"message": "Pengumuman diperbarui", "data": ann})
				},
			)

			// PATCH /api/v1/announcements/:id/pin — toggle pinned (admin only)
			announcements.PATCH("/:id/pin",
				middleware.Auth(authSvc),
				middleware.RequireRole("admin"),
				func(c *gin.Context) {
					var id int
					fmt.Sscan(c.Param("id"), &id)
					var ann models.Announcement
					if err := db.First(&ann, id).Error; err != nil {
						c.JSON(http.StatusNotFound, gin.H{"error": "Tidak ditemukan"})
						return
					}
					db.Model(&ann).Update("is_pinned", !ann.IsPinned)
					pin := "disematkan"
					if ann.IsPinned {
						pin = "dilepas"
					}
					c.JSON(http.StatusOK, gin.H{"message": "Pengumuman " + pin, "is_pinned": !ann.IsPinned})
				},
			)

			// DELETE /api/v1/announcements/:id
			announcements.DELETE("/:id",
				middleware.Auth(authSvc),
				func(c *gin.Context) {
					var id int
					fmt.Sscan(c.Param("id"), &id)
					var ann models.Announcement
					if err := db.First(&ann, id).Error; err != nil {
						c.JSON(http.StatusNotFound, gin.H{"error": "Tidak ditemukan"})
						return
					}
					creatorID, _ := c.Get(middleware.CtxUserID)
					creatorRole, _ := c.Get(middleware.CtxRole)
					if ann.CreatorID != creatorID.(int) && creatorRole != "admin" {
						c.JSON(http.StatusForbidden, gin.H{"error": "Tidak punya izin"})
						return
					}
					db.Delete(&ann)
					c.JSON(http.StatusOK, gin.H{"message": "Pengumuman dihapus"})
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

// seedUsers creates the default users for testing (Admin, Teacher, Student)
func seedUsers(db *gorm.DB) {
	users := []models.User{
		{
			Name:     "Super Admin",
			Email:    "admin@lpkmoricentre.co.id",
			Role:     "admin",
			Password: "password123",
			Active:   true,
		},
		{
			Name:     "Sensei Guru",
			Email:    "teacher@lpkmoricentre.co.id",
			Role:     "teacher",
			Password: "password123",
			Active:   true,
		},
		{
			Name:     "Siswa Berbakat",
			Email:    "siswa@lpkmoricentre.co.id",
			Role:     "student",
			Password: "password123",
			Active:   true,
		},
	}

	for _, u := range users {
		var count int64
		db.Model(&models.User{}).Where("email = ?", u.Email).Count(&count)
		if count > 0 {
			continue
		}

		hash, err := bcrypt.GenerateFromPassword([]byte(u.Password), bcrypt.DefaultCost)
		if err != nil {
			log.Printf("Failed to hash password for %s: %v", u.Email, err)
			continue
		}

		u.Password = string(hash)
		if err := db.Create(&u).Error; err != nil {
			log.Printf("Failed to seed user %s: %v", u.Email, err)
			continue
		}
		log.Printf("✅ Seeded user: %s (%s) / password123", u.Email, u.Role)
	}
}
