package service

import (
	"context"
	"errors"
	"fmt"
	"lpkmori-backend/internal/models"
	"time"

	"gorm.io/gorm"
)

type AssignmentService interface {
	// Assignments
	GetAssignment(ctx context.Context, id int) (*models.Assignment, error)
	ListAssignments(ctx context.Context, courseID int) ([]models.Assignment, error)
	CreateAssignment(ctx context.Context, courseID int, title, desc, fileURL string, dueDate *time.Time) (*models.Assignment, error)
	DeleteAssignment(ctx context.Context, id int) error

	// Submissions
	GetSubmission(ctx context.Context, assignmentID, studentID int) (*models.Submission, error)
	ListSubmissions(ctx context.Context, assignmentID int) ([]models.Submission, error)
	Submit(ctx context.Context, assignmentID, studentID int, fileURL, note string) (*models.Submission, error)
	GradeSubmission(ctx context.Context, submissionID int, grade float64, feedback string) (*models.Submission, error)

	// Exams
	ListExams(ctx context.Context, courseID int) ([]models.Exam, error)
	GetExam(ctx context.Context, id int) (*models.Exam, error)
	CreateExam(ctx context.Context, courseID int, title, desc string, start, end *time.Time) (*models.Exam, error)
	DeleteExam(ctx context.Context, id int) error
	AddQuestion(ctx context.Context, examID int, qType, text string, points int, options []byte) (*models.ExamQuestion, error)
	DeleteQuestion(ctx context.Context, questionID int) error

	// Exam Answers (student)
	SubmitAnswer(ctx context.Context, questionID, studentID int, answerText, fileURL string) (*models.ExamAnswer, error)

	// Notifications
	GetNotifications(ctx context.Context, userID int) ([]models.Notification, error)
	MarkAllRead(ctx context.Context, userID int) error
	UnreadCount(ctx context.Context, userID int) (int64, error)

	// Student dashboard
	GetStudentDashboard(ctx context.Context, studentID int) (*StudentDashboard, error)
}

// StudentDashboard is a combined view for the student's home page.
type StudentDashboard struct {
	Enrollments  []EnrolledClassInfo `json:"enrollments"`
	PendingTasks []PendingTask       `json:"pending_tasks"`
}

type EnrolledClassInfo struct {
	ClassID        int    `json:"class_id"`
	ClassName      string `json:"class_name"`
	AcademicYear   string `json:"academic_year"`
	CourseCount    int    `json:"course_count"`
}

type PendingTask struct {
	Type         string     `json:"type"` // "assignment" | "exam"
	ID           int        `json:"id"`
	Title        string     `json:"title"`
	CourseName   string     `json:"course_name"`
	ClassName    string     `json:"class_name"`
	DueDate      *time.Time `json:"due_date"`
	IsSubmitted  bool       `json:"is_submitted"`
}

type assignmentService struct {
	db *gorm.DB
}

func NewAssignmentService(db *gorm.DB) AssignmentService {
	return &assignmentService{db: db}
}

// ─── Assignments ──────────────────────────────────────────────────────────────

func (s *assignmentService) GetAssignment(ctx context.Context, id int) (*models.Assignment, error) {
	var a models.Assignment
	err := s.db.WithContext(ctx).Preload("Course").First(&a, id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, errors.New("tugas tidak ditemukan")
	}
	return &a, err
}

func (s *assignmentService) ListAssignments(ctx context.Context, courseID int) ([]models.Assignment, error) {
	var list []models.Assignment
	q := s.db.WithContext(ctx).Preload("Course").Order("created_at DESC")
	if courseID > 0 {
		q = q.Where("course_id = ?", courseID)
	}
	return list, q.Find(&list).Error
}

func (s *assignmentService) CreateAssignment(ctx context.Context, courseID int, title, desc, fileURL string, dueDate *time.Time) (*models.Assignment, error) {
	a := &models.Assignment{
		CourseID:    courseID,
		Title:       title,
		Description: desc,
		FileURL:     fileURL,
		DueDate:     dueDate,
	}
	if err := s.db.WithContext(ctx).Create(a).Error; err != nil {
		return nil, err
	}

	// Notify all enrolled students in the course's class
	go s.notifyStudentsForCourse(context.Background(), courseID, a.ID, "assignment",
		fmt.Sprintf("Tugas Baru: %s", title),
		fmt.Sprintf("Guru menambahkan tugas baru di mata pelajaran ini. Deadline: %s", formatDeadline(dueDate)),
	)

	return a, nil
}

func (s *assignmentService) DeleteAssignment(ctx context.Context, id int) error {
	return s.db.WithContext(ctx).Delete(&models.Assignment{}, id).Error
}

// ─── Submissions ──────────────────────────────────────────────────────────────

func (s *assignmentService) GetSubmission(ctx context.Context, assignmentID, studentID int) (*models.Submission, error) {
	var sub models.Submission
	err := s.db.WithContext(ctx).
		Where("assignment_id = ? AND student_id = ?", assignmentID, studentID).
		Preload("Student").
		First(&sub).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil // not yet submitted
	}
	return &sub, err
}

func (s *assignmentService) ListSubmissions(ctx context.Context, assignmentID int) ([]models.Submission, error) {
	var list []models.Submission
	return list, s.db.WithContext(ctx).
		Where("assignment_id = ?", assignmentID).
		Preload("Student").
		Order("submitted_at DESC").
		Find(&list).Error
}

func (s *assignmentService) Submit(ctx context.Context, assignmentID, studentID int, fileURL, note string) (*models.Submission, error) {
	// Upsert: if already submitted update it
	var sub models.Submission
	err := s.db.WithContext(ctx).
		Where("assignment_id = ? AND student_id = ?", assignmentID, studentID).
		First(&sub).Error

	if errors.Is(err, gorm.ErrRecordNotFound) {
		sub = models.Submission{
			AssignmentID: assignmentID,
			StudentID:    studentID,
			FileURL:      fileURL,
			Note:         note,
		}
		return &sub, s.db.WithContext(ctx).Create(&sub).Error
	}
	// Update existing
	sub.FileURL = fileURL
	sub.Note = note
	sub.Grade = nil // reset grade on resubmit
	return &sub, s.db.WithContext(ctx).Save(&sub).Error
}

func (s *assignmentService) GradeSubmission(ctx context.Context, submissionID int, grade float64, feedback string) (*models.Submission, error) {
	var sub models.Submission
	if err := s.db.WithContext(ctx).Preload("Assignment").Preload("Student").First(&sub, submissionID).Error; err != nil {
		return nil, errors.New("submission tidak ditemukan")
	}
	sub.Grade = &grade
	sub.Feedback = feedback
	if err := s.db.WithContext(ctx).Save(&sub).Error; err != nil {
		return nil, err
	}

	// Notify the student their work has been graded
	s.db.WithContext(ctx).Create(&models.Notification{
		UserID:  sub.StudentID,
		Title:   "Tugas Dinilai",
		Message: fmt.Sprintf("Tugas '%s' Anda telah dinilai: %.1f/100", sub.Assignment.Title, grade),
		Type:    "grade",
		RefID:   sub.AssignmentID,
	})

	return &sub, nil
}

// ─── Exams ────────────────────────────────────────────────────────────────────

func (s *assignmentService) ListExams(ctx context.Context, courseID int) ([]models.Exam, error) {
	var list []models.Exam
	q := s.db.WithContext(ctx).Order("created_at DESC")
	if courseID > 0 {
		q = q.Where("course_id = ?", courseID)
	}
	return list, q.Find(&list).Error
}

func (s *assignmentService) GetExam(ctx context.Context, id int) (*models.Exam, error) {
	var exam models.Exam
	err := s.db.WithContext(ctx).
		Preload("Questions", func(db *gorm.DB) *gorm.DB {
			return db.Order("order_num ASC")
		}).
		First(&exam, id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, errors.New("ujian tidak ditemukan")
	}
	return &exam, err
}

func (s *assignmentService) CreateExam(ctx context.Context, courseID int, title, desc string, start, end *time.Time) (*models.Exam, error) {
	exam := &models.Exam{
		CourseID:    courseID,
		Title:       title,
		Description: desc,
		StartTime:   start,
		EndTime:     end,
	}
	if err := s.db.WithContext(ctx).Create(exam).Error; err != nil {
		return nil, err
	}

	// Notify enrolled students
	go s.notifyStudentsForCourse(context.Background(), courseID, exam.ID, "exam",
		fmt.Sprintf("Ujian Baru: %s", title),
		"Guru telah membuat ujian baru untuk mata pelajaran Anda.",
	)

	return exam, nil
}

func (s *assignmentService) DeleteExam(ctx context.Context, id int) error {
	return s.db.WithContext(ctx).Delete(&models.Exam{}, id).Error
}

func (s *assignmentService) AddQuestion(ctx context.Context, examID int, qType, text string, points int, options []byte) (*models.ExamQuestion, error) {
	var count int64
	s.db.WithContext(ctx).Model(&models.ExamQuestion{}).Where("exam_id = ?", examID).Count(&count)

	q := &models.ExamQuestion{
		ExamID:       examID,
		QuestionType: qType,
		Text:         text,
		Points:       points,
		Options:      options,
		OrderNum:     int(count) + 1,
	}
	return q, s.db.WithContext(ctx).Create(q).Error
}

func (s *assignmentService) DeleteQuestion(ctx context.Context, questionID int) error {
	return s.db.WithContext(ctx).Delete(&models.ExamQuestion{}, questionID).Error
}

// ─── Exam Answers ─────────────────────────────────────────────────────────────

func (s *assignmentService) SubmitAnswer(ctx context.Context, questionID, studentID int, answerText, fileURL string) (*models.ExamAnswer, error) {
	var ans models.ExamAnswer
	err := s.db.WithContext(ctx).
		Where("question_id = ? AND student_id = ?", questionID, studentID).
		First(&ans).Error

	if errors.Is(err, gorm.ErrRecordNotFound) {
		ans = models.ExamAnswer{
			QuestionID: questionID,
			StudentID:  studentID,
			AnswerText: answerText,
			FileURL:    fileURL,
		}
		return &ans, s.db.WithContext(ctx).Create(&ans).Error
	}
	ans.AnswerText = answerText
	ans.FileURL = fileURL
	return &ans, s.db.WithContext(ctx).Save(&ans).Error
}

// ─── Notifications ────────────────────────────────────────────────────────────

func (s *assignmentService) GetNotifications(ctx context.Context, userID int) ([]models.Notification, error) {
	var list []models.Notification
	return list, s.db.WithContext(ctx).
		Where("user_id = ?", userID).
		Order("created_at DESC").
		Limit(30).
		Find(&list).Error
}

func (s *assignmentService) MarkAllRead(ctx context.Context, userID int) error {
	return s.db.WithContext(ctx).
		Model(&models.Notification{}).
		Where("user_id = ? AND is_read = false", userID).
		Update("is_read", true).Error
}

func (s *assignmentService) UnreadCount(ctx context.Context, userID int) (int64, error) {
	var count int64
	return count, s.db.WithContext(ctx).
		Model(&models.Notification{}).
		Where("user_id = ? AND is_read = false", userID).
		Count(&count).Error
}

// ─── Student Dashboard ────────────────────────────────────────────────────────

func (s *assignmentService) GetStudentDashboard(ctx context.Context, studentID int) (*StudentDashboard, error) {
	// 1. Get enrolled classes
	var enrollments []models.ClassEnrollment
	s.db.WithContext(ctx).
		Where("user_id = ?", studentID).
		Preload("User").
		Find(&enrollments)

	var classIDs []int
	for _, e := range enrollments {
		classIDs = append(classIDs, e.ClassID)
	}

	// 2. Get class details with academic years
	var classes []models.Class
	if len(classIDs) > 0 {
		s.db.WithContext(ctx).
			Where("id IN ?", classIDs).
			Preload("AcademicYear").
			Find(&classes)
	}

	// 3. Count courses per class
	classMap := make(map[int]models.Class)
	for _, c := range classes {
		classMap[c.ID] = c
	}

	var enrolledInfos []EnrolledClassInfo
	for _, e := range enrollments {
		cls := classMap[e.ClassID]
		var courseCount int64
		s.db.WithContext(ctx).Model(&models.Course{}).Where("class_id = ?", e.ClassID).Count(&courseCount)
		enrolledInfos = append(enrolledInfos, EnrolledClassInfo{
			ClassID:      e.ClassID,
			ClassName:    cls.Name,
			AcademicYear: cls.AcademicYear.YearRange,
			CourseCount:  int(courseCount),
		})
	}

	// 4. Build pending tasks from assignments & exams
	var pendingTasks []PendingTask

	// Get all courses in enrolled classes
	var courses []models.Course
	if len(classIDs) > 0 {
		s.db.WithContext(ctx).Where("class_id IN ?", classIDs).Preload("Class").Find(&courses)
	}

	for _, course := range courses {
		// Pending assignments
		var assignments []models.Assignment
		s.db.WithContext(ctx).Where("course_id = ?", course.ID).Find(&assignments)
		for _, a := range assignments {
			var sub models.Submission
			submitted := s.db.WithContext(ctx).
				Where("assignment_id = ? AND student_id = ?", a.ID, studentID).
				First(&sub).Error == nil

			pendingTasks = append(pendingTasks, PendingTask{
				Type:        "assignment",
				ID:          a.ID,
				Title:       a.Title,
				CourseName:  course.Name,
				ClassName:   course.Class.Name,
				DueDate:     a.DueDate,
				IsSubmitted: submitted,
			})
		}

		// Upcoming exams
		var exams []models.Exam
		s.db.WithContext(ctx).Where("course_id = ?", course.ID).Find(&exams)
		for _, ex := range exams {
			pendingTasks = append(pendingTasks, PendingTask{
				Type:       "exam",
				ID:         ex.ID,
				Title:      ex.Title,
				CourseName: course.Name,
				ClassName:  course.Class.Name,
				DueDate:    ex.EndTime,
			})
		}
	}

	return &StudentDashboard{
		Enrollments:  enrolledInfos,
		PendingTasks: pendingTasks,
	}, nil
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// notifyStudentsForCourse sends a notification to all students enrolled in the
// class that the given courseID belongs to.
func (s *assignmentService) notifyStudentsForCourse(ctx context.Context, courseID, refID int, nType, title, msg string) {
	var course models.Course
	if err := s.db.WithContext(ctx).First(&course, courseID).Error; err != nil {
		return
	}
	var enrollments []models.ClassEnrollment
	s.db.WithContext(ctx).Where("class_id = ?", course.ClassID).Find(&enrollments)
	for _, e := range enrollments {
		s.db.WithContext(ctx).Create(&models.Notification{
			UserID:  e.UserID,
			Title:   title,
			Message: msg,
			Type:    nType,
			RefID:   refID,
		})
	}
}

func formatDeadline(t *time.Time) string {
	if t == nil {
		return "tidak ada batas waktu"
	}
	return t.Format("02 Jan 2006 15:04")
}
