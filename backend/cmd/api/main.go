package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/exec"
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
		&models.AppSetting{},
		&models.LearningMaterial{},
		&models.QuestionBank{},
		&models.BankQuestion{},
		&models.Certificate{},
	)

	// Seed default users and settings on start
	seedUsers(db)
	seedSettings(db)

	// Initialize Services
	academicSvc := service.NewAcademicYearService(db)
	authSvc := service.NewAuthService(db, getEnv("JWT_SECRET", "super_secret_jwt_key_change_in_production"))
	userSvc := service.NewUserService(db)
	assignSvc := service.NewAssignmentService(db)
	gradeSvc := service.NewGradeService(db)
	translationSvc := service.NewTranslationService()
	certSvc := service.NewCertificateService(db, getEnv("BASE_URL", "http://localhost:8080"))

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
			c.JSON(http.StatusOK, gin.H{"message": "Test", "status": "LPK Mori API is live bos serius"})
		})

		// ─── App Settings (Super Admin) ──────────────────────────────────────────
		api.GET("/settings", func(c *gin.Context) {
			var settings []models.AppSetting
			db.Find(&settings)
			c.JSON(http.StatusOK, gin.H{"data": settings})
		})

		api.POST("/settings", func(c *gin.Context) {
			var body map[string]string
			if err := c.ShouldBindJSON(&body); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
				return
			}
			for k, v := range body {
				db.Where("key = ?", k).Assign(models.AppSetting{Value: v}).FirstOrCreate(&models.AppSetting{Key: k})
			}
			c.JSON(http.StatusOK, gin.H{"message": "Settings updated"})
		})

		api.GET("/settings/backup", func(c *gin.Context) {
			host := getEnv("DB_HOST", "localhost")
			port := getEnv("DB_PORT", "5432")
			user := getEnv("DB_USER", "lpkmori")
			password := getEnv("DB_PASSWORD", "lpkmori_secret")
			dbname := getEnv("DB_NAME", "lpkmori_db")

			cmd := exec.Command("pg_dump", "-h", host, "-p", port, "-U", user, "-d", dbname, "--clean", "--if-exists", "--no-owner", "--no-acl")
			cmd.Env = append(os.Environ(), "PGPASSWORD="+password)

			var out bytes.Buffer
			var stderr bytes.Buffer
			cmd.Stdout = &out
			cmd.Stderr = &stderr

			if err := cmd.Run(); err != nil {
				log.Println("Backup error:", err.Error(), stderr.String())
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal melakukan backup database: " + stderr.String()})
				return
			}

			filename := fmt.Sprintf("backup_lpkmori_db_%s.sql", time.Now().Format("20060102_150405"))
			c.Header("Content-Disposition", "attachment; filename="+filename)
			c.Header("Content-Type", "application/sql")
			c.Data(http.StatusOK, "application/sql", out.Bytes())
		})

		// ─── Platform Stats (Admin Dashboard) ────────────────────────────────────
		api.GET("/stats", func(c *gin.Context) {
			var activeStudents, totalClasses, totalYears, totalTeachers, totalExamAnswers, newStudentsMonth int64
			var activeYear string

			db.Model(&models.User{}).Where("role = ? AND active = ?", "student", true).Count(&activeStudents)
			db.Model(&models.User{}).Where("role = ? AND active = ?", "teacher", true).Count(&totalTeachers)

			var settings []models.AppSetting
			db.Find(&settings)
			settingsMap := make(map[string]string)
			for _, s := range settings {
				settingsMap[s.Key] = s.Value
			}

			var ay models.AcademicYear
			if err := db.Where("is_active = ?", true).First(&ay).Error; err == nil {
				activeYear = ay.YearRange
				db.Model(&models.Class{}).Where("academic_year_id = ?", ay.ID).Count(&totalClasses)
			}

			db.Model(&models.AcademicYear{}).Count(&totalYears)
			db.Model(&models.ExamAnswer{}).Count(&totalExamAnswers)

			// New students this month
			startOfMonth := time.Now().UTC().Truncate(24*time.Hour).AddDate(0, 0, -time.Now().UTC().Day()+1)
			db.Model(&models.User{}).Where("role = ? AND created_at >= ?", "student", startOfMonth).Count(&newStudentsMonth)

			// Count submissions & exams for distribution chart
			var totalAssignments, totalExams, totalSubmissions int64
			db.Model(&models.Assignment{}).Count(&totalAssignments)
			db.Model(&models.Exam{}).Count(&totalExams)
			db.Model(&models.Submission{}).Count(&totalSubmissions)

			// Students per class distribution (top 8)
			type ClassCount struct {
				Name  string `json:"name"`
				Count int    `json:"count"`
			}
			var classDistribution []ClassCount
			db.Raw(`SELECT c.name, COUNT(e.id) as count FROM classes c LEFT JOIN class_enrollments e ON e.class_id = c.id WHERE c.academic_year_id = (SELECT id FROM academic_years WHERE is_active = true LIMIT 1) GROUP BY c.name ORDER BY c.name LIMIT 8`).Scan(&classDistribution)

			// Leaderboard (Top 5)
			type TopStudent struct {
				Name  string  `json:"name"`
				Score float64 `json:"score"`
				Photo string  `json:"photo"`
			}
			var topStudents []TopStudent
			db.Table("users").
				Select("users.name, COALESCE(AVG(grade_recaps.final_score), 0) as score, users.photo").
				Joins("LEFT JOIN grade_recaps ON grade_recaps.student_id = users.id").
				Where("users.role = ?", "student").
				Group("users.id, users.name, users.photo").
				Order("score DESC").
				Limit(5).
				Scan(&topStudents)

			c.JSON(http.StatusOK, gin.H{
				"active_students":      activeStudents,
				"total_classes":        totalClasses,
				"active_year":          activeYear,
				"total_years":          totalYears,
				"completed_exams":      totalExamAnswers,
				"total_teachers":       totalTeachers,
				"new_students_month":   newStudentsMonth,
				"total_assignments":    totalAssignments,
				"total_exams":          totalExams,
				"total_submissions":    totalSubmissions,
				"class_distribution":   classDistribution,
				"app_settings":         settingsMap,
				"top_students":         topStudents,
			})
		})

		// ─── Learning Materials (Admin/Teacher) ───────────────────────────────────
		materials := api.Group("/materials")
		{
			// GET /materials?class_id=1
			materials.GET("", func(c *gin.Context) {
				var classID int
				fmt.Sscan(c.Query("class_id"), &classID)
				var list []models.LearningMaterial
				q := db.WithContext(c.Request.Context())
				if classID > 0 {
					q = q.Where("class_id = ?", classID)
				}
				q.Order("id DESC").Find(&list)
				c.JSON(http.StatusOK, gin.H{"data": list})
			})

			materials.POST("", middleware.Auth(authSvc), middleware.RequireRole("teacher", "admin"), func(c *gin.Context) {
				var input models.LearningMaterial
				if err := c.ShouldBindJSON(&input); err != nil {
					c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
					return
				}
				if err := db.Create(&input).Error; err != nil {
					c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
					return
				}
				c.JSON(http.StatusCreated, gin.H{"message": "Material added", "data": input})
			})

			materials.DELETE("/:id", middleware.Auth(authSvc), middleware.RequireRole("teacher", "admin"), func(c *gin.Context) {
				var id int
				fmt.Sscan(c.Param("id"), &id)
				db.Delete(&models.LearningMaterial{}, id)
				c.JSON(http.StatusOK, gin.H{"message": "Material deleted"})
			})
		}


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
						Status      string  `json:"status"`
						Notes       string  `json:"notes"`
						FinalScore  float64 `json:"final_score"`
						IsPublished bool    `json:"is_published"`
					}
					var input RecapInput
					if err := c.ShouldBindJSON(&input); err != nil {
						c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
						return
					}

					recap, err := gradeSvc.SaveRecap(c.Request.Context(), classID, studentID, input.Status, input.Notes, input.FinalScore, input.IsPublished, teacherID.(int))
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

		// ─── Certificates ──────────────────────────────────────────────────────────
		certs := api.Group("/certificates")
		{
			// POST /api/v1/certificates/generate — teacher generates cert for a passed student
			// Body: { class_id, student_id, final_score }
			certs.POST("/generate",
				middleware.Auth(authSvc), middleware.RequireRole("teacher", "admin"),
				func(c *gin.Context) {
					type GenInput struct {
						ClassID    int     `json:"class_id" binding:"required"`
						StudentID  int     `json:"student_id" binding:"required"`
						FinalScore float64 `json:"final_score"`
					}
					var inp GenInput
					if err := c.ShouldBindJSON(&inp); err != nil {
						c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
						return
					}
					teacherID, _ := c.Get(middleware.CtxUserID)
					cert, err := certSvc.GetOrCreate(c.Request.Context(), inp.ClassID, inp.StudentID, teacherID.(int), inp.FinalScore)
					if err != nil {
						c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
						return
					}
					c.JSON(http.StatusOK, gin.H{"message": "Sertifikat berhasil dibuat", "data": cert})
				},
			)

			// GET /api/v1/certificates/my — student gets own certs
			certs.GET("/my",
				middleware.Auth(authSvc),
				func(c *gin.Context) {
					uid, _ := c.Get(middleware.CtxUserID)
					list, err := certSvc.ListByStudent(c.Request.Context(), uid.(int))
					if err != nil {
						c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
						return
					}
					c.JSON(http.StatusOK, gin.H{"data": list})
				},
			)

			// GET /api/v1/certificates — admin lists all certs
			certs.GET("",
				middleware.Auth(authSvc), middleware.RequireRole("admin", "teacher"),
				func(c *gin.Context) {
					list, err := certSvc.ListAll(c.Request.Context())
					if err != nil {
						c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
						return
					}
					c.JSON(http.StatusOK, gin.H{"data": list})
				},
			)

			// GET /api/v1/certificates/verify/:uuid — PUBLIC validation
			certs.GET("/verify/:uuid", func(c *gin.Context) {
				uuid := c.Param("uuid")
				cert, err := certSvc.GetByUUID(c.Request.Context(), uuid)
				if err != nil {
					c.JSON(http.StatusNotFound, gin.H{"valid": false, "error": "Sertifikat tidak ditemukan"})
					return
				}
				c.JSON(http.StatusOK, gin.H{
					"valid":        true,
					"student_name": cert.Student.Name,
					"class_name":   cert.Class.Name,
					"final_score":  cert.FinalScore,
					"issued_at":    cert.IssuedAt,
					"teacher_name": cert.Teacher.Name,
				})
			})

			// GET /api/v1/certificates/download/:uuid — download PDF
			certs.GET("/download/:uuid", func(c *gin.Context) {
				uuid := c.Param("uuid")
				cert, err := certSvc.GetByUUID(c.Request.Context(), uuid)
				if err != nil {
					c.JSON(http.StatusNotFound, gin.H{"error": "Sertifikat tidak ditemukan"})
					return
				}
				pdfBytes, err := certSvc.GeneratePDF(cert)
				if err != nil {
					c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal generate PDF: " + err.Error()})
					return
				}
				filename := fmt.Sprintf("Sertifikat_%s.pdf", cert.Student.Name)
				c.Header("Content-Disposition", "attachment; filename=\""+filename+"\"")
				c.Header("Content-Type", "application/pdf")
				c.Data(http.StatusOK, "application/pdf", pdfBytes)
			})

			// GET /api/v1/certificates/preview/:uuid — preview PDF inline
			certs.GET("/preview/:uuid", func(c *gin.Context) {
				uuid := c.Param("uuid")
				cert, err := certSvc.GetByUUID(c.Request.Context(), uuid)
				if err != nil {
					c.JSON(http.StatusNotFound, gin.H{"error": "Sertifikat tidak ditemukan"})
					return
				}
				pdfBytes, err := certSvc.GeneratePDF(cert)
				if err != nil {
					c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal generate PDF: " + err.Error()})
					return
				}
				c.Header("Content-Disposition", "inline")
				c.Header("Content-Type", "application/pdf")
				c.Data(http.StatusOK, "application/pdf", pdfBytes)
			})
		}

		// ─── Student Learning Progress ───────────────────────────────────────────
		api.GET("/users/me/grade-history", middleware.Auth(authSvc), func(c *gin.Context) {
			userID, _ := c.Get(middleware.CtxUserID)

			type HistoryItem struct {
				ClassName  string    `json:"class_name"`
				FinalScore float64   `json:"final_score"`
				EnrolledAt time.Time `json:"enrolled_at"`
			}
			var history []HistoryItem

			err := db.Table("grade_recaps").
				Select("classes.name as class_name, grade_recaps.final_score, class_enrollments.enrolled_at").
				Joins("JOIN classes ON classes.id = grade_recaps.class_id").
				Joins("JOIN class_enrollments ON class_enrollments.class_id = grade_recaps.class_id AND class_enrollments.user_id = grade_recaps.student_id").
				Where("grade_recaps.student_id = ? AND grade_recaps.is_published = ?", userID, true).
				Order("class_enrollments.enrolled_at ASC").
				Scan(&history).Error

			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}

			c.JSON(http.StatusOK, gin.H{"data": history})
		})

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

			type RegisterInput struct {
				Email        string `json:"email"    binding:"required,email"`
				Password     string `json:"password" binding:"required,min=6"`
				Role         string `json:"role"     binding:"required"`
				Name         string `json:"name"`   // optional
				NIS          string `json:"nis"`    // optional (for students)
				Photo        string `json:"photo"`  // optional
				Active       *bool  `json:"active"` // optional, defaults to true
				PlaceOfBirth string `json:"place_of_birth"`
				DateOfBirth  string `json:"date_of_birth"`
				Gender       string `json:"gender"`
				Phone        string `json:"phone"`
				Address      string `json:"address"`
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
					Email:        input.Email,
					Password:     input.Password, // will be hashed by CreateUser
					Role:         input.Role,
					Name:         input.Name,
					NIS:          input.NIS,
					Photo:        input.Photo,
					Active:       active,
					PlaceOfBirth: input.PlaceOfBirth,
					DateOfBirth:  input.DateOfBirth,
					Gender:       input.Gender,
					Phone:        input.Phone,
					Address:      input.Address,
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

			// GET /api/v1/users/birthdays-today
			users.GET("/birthdays-today", func(c *gin.Context) {
				var bdayUsers []models.User
				// In PostgreSQL, extract month and day from date
				db.WithContext(c.Request.Context()).
					Omit("password").
					Where("EXTRACT(MONTH FROM CAST(date_of_birth AS date)) = EXTRACT(MONTH FROM CURRENT_DATE) AND EXTRACT(DAY FROM CAST(date_of_birth AS date)) = EXTRACT(DAY FROM CURRENT_DATE)").
					Find(&bdayUsers)

				c.JSON(http.StatusOK, gin.H{"data": bdayUsers})
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

			// GET /api/v1/users/:id/progress — student progress chart data (all roles)
			users.GET("/:id/progress",
				middleware.Auth(authSvc),
				func(c *gin.Context) {
					var studentID int
					if _, err := fmt.Sscan(c.Param("id"), &studentID); err != nil {
						c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
						return
					}

					// Get enrollments ordered by enrolled_at ASC (earliest first)
					type ProgressPoint struct {
						ClassID      int       `json:"class_id"`
						ClassName    string    `json:"class_name"`
						AcademicYear string    `json:"academic_year"`
						EnrolledAt   time.Time `json:"enrolled_at"`
						FinalScore   *float64  `json:"final_score"`
						Status       string    `json:"status"`
					}

					var enrollments []models.ClassEnrollment
					db.WithContext(c.Request.Context()).
						Where("user_id = ?", studentID).
						Preload("User").
						Order("enrolled_at ASC").
						Find(&enrollments)

					var classIDs []int
					for _, e := range enrollments {
						classIDs = append(classIDs, e.ClassID)
					}

					classMap := make(map[int]models.Class)
					if len(classIDs) > 0 {
						var classes []models.Class
						db.WithContext(c.Request.Context()).
							Where("id IN ?", classIDs).
							Preload("AcademicYear").
							Find(&classes)
						for _, cls := range classes {
							classMap[cls.ID] = cls
						}
					}

					recapMap := make(map[int]models.GradeRecap)
					var recaps []models.GradeRecap
					if len(classIDs) > 0 {
						db.WithContext(c.Request.Context()).
							Where("student_id = ? AND class_id IN ?", studentID, classIDs).
							Find(&recaps)
						for _, r := range recaps {
							recapMap[r.ClassID] = r
						}
					}

					var points []ProgressPoint
					for _, e := range enrollments {
						cls := classMap[e.ClassID]
						recap, hasRecap := recapMap[e.ClassID]

						p := ProgressPoint{
							ClassID:      e.ClassID,
							ClassName:    cls.Name,
							AcademicYear: cls.AcademicYear.YearRange,
							EnrolledAt:   e.EnrolledAt,
							Status:       "In Progress",
						}
						if hasRecap {
							score := recap.FinalScore
							p.FinalScore = &score
							p.Status = recap.Status
						}
						points = append(points, p)
					}

					if points == nil {
						points = []ProgressPoint{}
					}

					c.JSON(http.StatusOK, gin.H{"data": points})
				},
			)
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

		// ─── Student Own Grade Recap ──────────────────────────────────────────────
		// GET /api/v1/student/grade-recap — returns dynamically computed recap for ALL enrolled classes
		api.GET("/student/grade-recap", middleware.Auth(authSvc), middleware.RequireRole("student"), func(c *gin.Context) {
			studentID, _ := c.Get(middleware.CtxUserID)
			recaps, err := gradeSvc.GetStudentRecapSummary(c.Request.Context(), studentID.(int))
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}
			c.JSON(http.StatusOK, gin.H{"data": recaps})
		})

		// GET /api/v1/student/grade-recap/:class_id — returns detailed recap including assignments and exams
		api.GET("/student/grade-recap/:class_id", middleware.Auth(authSvc), middleware.RequireRole("student"), func(c *gin.Context) {
			studentID, _ := c.Get(middleware.CtxUserID)
			var classID int
			if _, err := fmt.Sscan(c.Param("class_id"), &classID); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid class ID"})
				return
			}
			
			detail, err := gradeSvc.GetStudentDetailRecap(c.Request.Context(), classID, studentID.(int))
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}
			c.JSON(http.StatusOK, gin.H{"data": detail})
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
					// ── Auto-Translate Dynamic Content ──
					titleEn, titleJa := translationSvc.AutoTranslate(input.Title)
					contentEn, contentJa := translationSvc.AutoTranslate(input.Content)

					if input.TitleJa != "" { titleJa = input.TitleJa } // Allow manual override from API
					if input.ContentJa != "" { contentJa = input.ContentJa }

					ann := models.Announcement{
						Title:       input.Title,
						TitleEn:     titleEn,
						TitleJa:     titleJa,
						Content:     input.Content,
						ContentEn:   contentEn,
						ContentJa:   contentJa,
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

		// ─── Question Bank (Bank Soal) ───────────────────────────────────────────────
		// Banks hold reusable question packages that can be imported into any exam.
		// Admin and teacher can CRUD; students have no access.
		banks := api.Group("/question-banks", middleware.Auth(authSvc), middleware.RequireRole("teacher", "admin"))
		{
			// GET /question-banks  — list all banks (with question count)
			banks.GET("", func(c *gin.Context) {
				type BankRow struct {
					models.QuestionBank
					QuestionCount int `json:"question_count"`
				}
				var banks []models.QuestionBank
				db.WithContext(c.Request.Context()).
					Preload("Creator").
					Preload("Questions").
					Order("id DESC").
					Find(&banks)
				// Strip passwords
				for i := range banks {
					if banks[i].Creator != nil {
						banks[i].Creator.Password = ""
					}
				}
				c.JSON(http.StatusOK, gin.H{"data": banks})
			})

			// GET /question-banks/:id — single bank with all questions
			banks.GET("/:id", func(c *gin.Context) {
				var id int
				fmt.Sscan(c.Param("id"), &id)
				var bank models.QuestionBank
				if err := db.WithContext(c.Request.Context()).
					Preload("Creator").
					Preload("Questions", func(db *gorm.DB) *gorm.DB {
						return db.Order("order_num ASC, id ASC")
					}).
					First(&bank, id).Error; err != nil {
					c.JSON(http.StatusNotFound, gin.H{"error": "Bank soal tidak ditemukan"})
					return
				}
				if bank.Creator != nil {
					bank.Creator.Password = ""
				}
				c.JSON(http.StatusOK, gin.H{"data": bank})
			})

			// POST /question-banks — create a new bank
			type CreateBankInput struct {
				Title       string `json:"title"       binding:"required"`
				Description string `json:"description"`
			}
			banks.POST("", func(c *gin.Context) {
				var input CreateBankInput
				if err := c.ShouldBindJSON(&input); err != nil {
					c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
					return
				}
				creatorID, _ := c.Get(middleware.CtxUserID)
				cid := creatorID.(int)
				bank := models.QuestionBank{
					Title:       input.Title,
					Description: input.Description,
					CreatorID:   &cid,
				}
				if err := db.WithContext(c.Request.Context()).Create(&bank).Error; err != nil {
					c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
					return
				}
				db.Preload("Creator").First(&bank, bank.ID)
				if bank.Creator != nil {
					bank.Creator.Password = ""
				}
				c.JSON(http.StatusCreated, gin.H{"message": "Bank soal berhasil dibuat", "data": bank})
			})

			// PATCH /question-banks/:id — update title/description
			banks.PATCH("/:id", func(c *gin.Context) {
				var id int
				fmt.Sscan(c.Param("id"), &id)
				var bank models.QuestionBank
				if err := db.First(&bank, id).Error; err != nil {
					c.JSON(http.StatusNotFound, gin.H{"error": "Bank soal tidak ditemukan"})
					return
				}
				var input struct {
					Title       string `json:"title"`
					Description string `json:"description"`
				}
				c.ShouldBindJSON(&input)
				updates := map[string]interface{}{}
				if input.Title != "" {
					updates["title"] = input.Title
				}
				updates["description"] = input.Description
				db.Model(&bank).Updates(updates)
				c.JSON(http.StatusOK, gin.H{"message": "Bank soal diperbarui", "data": bank})
			})

			// DELETE /question-banks/:id — delete bank and all its questions (cascade)
			banks.DELETE("/:id", func(c *gin.Context) {
				var id int
				fmt.Sscan(c.Param("id"), &id)
				db.WithContext(c.Request.Context()).Delete(&models.BankQuestion{}, "bank_id = ?", id)
				db.WithContext(c.Request.Context()).Delete(&models.QuestionBank{}, id)
				c.JSON(http.StatusOK, gin.H{"message": "Bank soal dihapus"})
			})

			// POST /question-banks/:id/questions — add a question to a bank
			type AddBankQuestionInput struct {
				QuestionType string          `json:"question_type" binding:"required"`
				Text         string          `json:"text"          binding:"required"`
				Points       int             `json:"points"`
				Options      json.RawMessage `json:"options"`
			}
			banks.POST("/:id/questions", func(c *gin.Context) {
				var bankID int
				fmt.Sscan(c.Param("id"), &bankID)
				var input AddBankQuestionInput
				if err := c.ShouldBindJSON(&input); err != nil {
					c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
					return
				}
				points := input.Points
				if points == 0 {
					points = 1
				}
				// Determine order_num
				var maxOrder int
				db.Model(&models.BankQuestion{}).Where("bank_id = ?", bankID).
					Select("COALESCE(MAX(order_num), 0)").Scan(&maxOrder)
				q := models.BankQuestion{
					BankID:       bankID,
					QuestionType: input.QuestionType,
					Text:         input.Text,
					Points:       points,
					Options:      input.Options,
					OrderNum:     maxOrder + 1,
				}
				if err := db.Create(&q).Error; err != nil {
					c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
					return
				}
				c.JSON(http.StatusCreated, gin.H{"message": "Soal berhasil ditambahkan", "data": q})
			})

			// PUT /question-banks/questions/:qid — edit a specific bank question
			banks.PUT("/questions/:qid", func(c *gin.Context) {
				var qid int
				fmt.Sscan(c.Param("qid"), &qid)
				var q models.BankQuestion
				if err := db.First(&q, qid).Error; err != nil {
					c.JSON(http.StatusNotFound, gin.H{"error": "Soal tidak ditemukan"})
					return
				}
				var input AddBankQuestionInput
				if err := c.ShouldBindJSON(&input); err != nil {
					c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
					return
				}
				points := input.Points
				if points == 0 {
					points = 1
				}
				db.Model(&q).Updates(models.BankQuestion{
					QuestionType: input.QuestionType,
					Text:         input.Text,
					Points:       points,
					Options:      input.Options,
				})
				c.JSON(http.StatusOK, gin.H{"message": "Soal diperbarui", "data": q})
			})

			// DELETE /question-banks/questions/:qid — delete a specific bank question
			banks.DELETE("/questions/:qid", func(c *gin.Context) {
				var qid int
				fmt.Sscan(c.Param("qid"), &qid)
				db.Delete(&models.BankQuestion{}, qid)
				c.JSON(http.StatusOK, gin.H{"message": "Soal dihapus"})
			})

			// POST /question-banks/:id/import-to-exam/:exam_id
			// Copies all questions from a bank into an existing exam
			banks.POST("/:id/import-to-exam/:exam_id", func(c *gin.Context) {
				var bankID, examID int
				fmt.Sscan(c.Param("id"), &bankID)
				fmt.Sscan(c.Param("exam_id"), &examID)

				// Verify exam exists
				var exam models.Exam
				if err := db.First(&exam, examID).Error; err != nil {
					c.JSON(http.StatusNotFound, gin.H{"error": "Ujian tidak ditemukan"})
					return
				}

				// Get all bank questions
				var bankQuestions []models.BankQuestion
				db.Where("bank_id = ?", bankID).Order("order_num ASC").Find(&bankQuestions)

				if len(bankQuestions) == 0 {
					c.JSON(http.StatusBadRequest, gin.H{"error": "Bank soal ini belum memiliki soal"})
					return
				}

				// Get current max order_num in target exam
				var maxOrder int
				db.Model(&models.ExamQuestion{}).Where("exam_id = ?", examID).
					Select("COALESCE(MAX(order_num), 0)").Scan(&maxOrder)

				// Copy each bank question into the exam
				imported := 0
				for _, bq := range bankQuestions {
					maxOrder++
					eq := models.ExamQuestion{
						ExamID:       examID,
						OrderNum:     maxOrder,
						QuestionType: bq.QuestionType,
						Text:         bq.Text,
						Points:       bq.Points,
						Options:      bq.Options,
					}
					if err := db.Create(&eq).Error; err == nil {
						imported++
					}
				}
				c.JSON(http.StatusOK, gin.H{
					"message":  fmt.Sprintf("%d soal berhasil diimpor ke ujian", imported),
					"imported": imported,
				})
			})
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

func seedSettings(db *gorm.DB) {
	defaults := map[string]string{
		"lpk_name":                   "LPK SO Mori Centre",
		"lpk_motto":                  "Meningkatkan Kualitas Sumber Daya Manusia Muda Indonesia Melalui Program Pemagangan Dan Program SSW ( Specified Skilled Worker).",
		"lpk_address":                "JALAN BALIGE-SILANGIT, Desa/Kelurahan Parik Sabungan, Kec. Siborong-Borong, Kab. Tapanuli Utara, Provinsi Sumatera Utara, Kode Pos: 22474",
		"lpk_phone":                  "+62 821 6453 8492",
		"min_pass_score":             "80",
		"exam_max_attempt_default":   "1",
		"allow_student_register":     "true",
		"maintenance_mode":           "false",
	}

	for k, v := range defaults {
		var count int64
		db.Model(&models.AppSetting{}).Where("key = ?", k).Count(&count)
		if count == 0 {
			db.Create(&models.AppSetting{Key: k, Value: v})
		}
	}
}
