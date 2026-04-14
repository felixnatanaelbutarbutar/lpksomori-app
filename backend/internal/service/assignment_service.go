package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"lpkmori-backend/internal/models"
	"sort"
	"time"

	"gorm.io/gorm"
)

type AssignmentService interface {
	// Assignments
	GetAssignment(ctx context.Context, id int) (*models.Assignment, error)
	ListAssignments(ctx context.Context, classID int) ([]models.Assignment, error)
	CreateAssignment(ctx context.Context, classID int, title, desc, fileURL string, dueDate *time.Time) (*models.Assignment, error)
	DeleteAssignment(ctx context.Context, id int) error

	// Submissions
	GetSubmission(ctx context.Context, assignmentID, studentID int) (*models.Submission, error)
	ListSubmissions(ctx context.Context, assignmentID int) ([]models.Submission, error)
	Submit(ctx context.Context, assignmentID, studentID int, fileURL, note string) (*models.Submission, error)
	GradeSubmission(ctx context.Context, submissionID int, grade float64, feedback string) (*models.Submission, error)

	// Exams
	ListExams(ctx context.Context, classID int) ([]models.Exam, error)
	GetExam(ctx context.Context, id int) (*models.Exam, error)
	CreateExam(ctx context.Context, classID int, title, desc string, start, end *time.Time, maxAttempts int) (*models.Exam, error)
	EditExam(ctx context.Context, id int, title, desc string, start, end *time.Time, maxAttempts int) error
	DeleteExam(ctx context.Context, id int) error
	AddQuestion(ctx context.Context, examID int, qType, text string, points int, options json.RawMessage) (*models.ExamQuestion, error)
	EditQuestion(ctx context.Context, questionID int, qType, text string, points int, options json.RawMessage) (*models.ExamQuestion, error)
	DeleteQuestion(ctx context.Context, questionID int) error

	// Exam Answers (student)
	SubmitAnswer(ctx context.Context, questionID, studentID int, answerText, fileURL string) (*models.ExamAnswer, error)
	FinishExamAttempt(ctx context.Context, examID, studentID int) (float64, float64, float64, error)

	// Exam Grading (teacher)
	GetExamStudents(ctx context.Context, examID int) ([]models.User, error)
	GetStudentAnswers(ctx context.Context, examID, studentID int) ([]models.ExamAnswer, error)
	GradeAnswer(ctx context.Context, answerID int, score float64) (*models.ExamAnswer, error)

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
	IsActiveYear   bool   `json:"is_active_year"`
}

type PendingTask struct {
	Type         string     `json:"type"` // "assignment" | "exam"
	ID           int        `json:"id"`
	Title        string     `json:"title"`
	ClassName    string     `json:"class_name"`
	DueDate      *time.Time `json:"due_date"`
	IsSubmitted  bool       `json:"is_submitted"`
	IsActiveYear bool       `json:"is_active_year"`
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
	err := s.db.WithContext(ctx).Preload("Class").First(&a, id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, errors.New("tugas tidak ditemukan")
	}
	return &a, err
}

func (s *assignmentService) ListAssignments(ctx context.Context, classID int) ([]models.Assignment, error) {
	var list []models.Assignment
	q := s.db.WithContext(ctx).Preload("Class").Order("created_at DESC")
	if classID > 0 {
		q = q.Where("class_id = ?", classID)
	}
	return list, q.Find(&list).Error
}

func (s *assignmentService) CreateAssignment(ctx context.Context, classID int, title, desc, fileURL string, dueDate *time.Time) (*models.Assignment, error) {
	a := &models.Assignment{
		ClassID:     classID,
		Title:       title,
		Description: desc,
		FileURL:     fileURL,
		DueDate:     dueDate,
	}
	if err := s.db.WithContext(ctx).Create(a).Error; err != nil {
		return nil, err
	}

	// Notify all enrolled students in the class
	go s.notifyStudentsForClass(context.Background(), classID, a.ID, "assignment",
		fmt.Sprintf("Tugas Baru: %s", title),
		fmt.Sprintf("Guru menambahkan tugas baru di kelas ini. Deadline: %s", formatDeadline(dueDate)),
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
	if fileURL != "" {
		sub.FileURL = fileURL
	}
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

	// Use Updates() on specific columns only — avoids GORM cascading Save() onto
	// the preloaded Student/Assignment associations, which would trigger an INSERT
	// on 'users' with an explicit id, hitting PostgreSQL's GENERATED ALWAYS constraint.
	if err := s.db.WithContext(ctx).Model(&sub).
		Select("grade", "feedback", "updated_at").
		Updates(map[string]interface{}{
			"grade":      grade,
			"feedback":   feedback,
			"updated_at": time.Now(),
		}).Error; err != nil {
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

func (s *assignmentService) ListExams(ctx context.Context, classID int) ([]models.Exam, error) {
	var list []models.Exam
	q := s.db.WithContext(ctx).Order("created_at DESC")
	if classID > 0 {
		q = q.Where("class_id = ?", classID)
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

func (s *assignmentService) CreateExam(ctx context.Context, classID int, title, desc string, start, end *time.Time, maxAttempts int) (*models.Exam, error) {
	if maxAttempts <= 0 { maxAttempts = 1 }
	exam := &models.Exam{
		ClassID:     classID,
		Title:       title,
		Description: desc,
		StartTime:   start,
		EndTime:     end,
		MaxAttempts: maxAttempts,
	}
	if err := s.db.WithContext(ctx).Create(exam).Error; err != nil {
		return nil, err
	}

	// Notify enrolled students
	go s.notifyStudentsForClass(context.Background(), classID, exam.ID, "exam",
		fmt.Sprintf("Ujian Baru: %s", title),
		"Guru telah membuat ujian baru untuk kelas Anda.",
	)

	return exam, nil
}

func (s *assignmentService) DeleteExam(ctx context.Context, id int) error {
	return s.db.WithContext(ctx).Delete(&models.Exam{}, id).Error
}

func (s *assignmentService) EditExam(ctx context.Context, id int, title, desc string, start, end *time.Time, maxAttempts int) error {
	if maxAttempts <= 0 { maxAttempts = 1 }
	return s.db.WithContext(ctx).Model(&models.Exam{}).Where("id = ?", id).Updates(map[string]interface{}{
		"title":        title,
		"description":  desc,
		"start_time":   start,
		"end_time":     end,
		"max_attempts": maxAttempts,
	}).Error
}

func (s *assignmentService) AddQuestion(ctx context.Context, examID int, qType, text string, points int, options json.RawMessage) (*models.ExamQuestion, error) {
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

func (s *assignmentService) EditQuestion(ctx context.Context, questionID int, qType, text string, points int, options json.RawMessage) (*models.ExamQuestion, error) {
	var q models.ExamQuestion
	if err := s.db.WithContext(ctx).First(&q, questionID).Error; err != nil {
		return nil, err
	}
	q.QuestionType = qType
	q.Text = text
	q.Points = points
	q.Options = options
	if err := s.db.WithContext(ctx).Save(&q).Error; err != nil {
		return nil, err
	}
	return &q, nil
}

// ─── Exam Answers ─────────────────────────────────────────────────────────────

func (s *assignmentService) SubmitAnswer(ctx context.Context, questionID, studentID int, answerText, fileURL string) (*models.ExamAnswer, error) {
	var q models.ExamQuestion
	if err := s.db.WithContext(ctx).Preload("Exam").First(&q, questionID).Error; err != nil {
		return nil, errors.New("pertanyaan tidak ditemukan")
	}

	var attempts int64
	s.db.WithContext(ctx).Model(&models.ExamSubmission{}).Where("exam_id = ? AND student_id = ?", q.ExamID, studentID).Count(&attempts)
	if int(attempts) >= q.Exam.MaxAttempts && q.Exam.MaxAttempts > 0 {
		return nil, errors.New("maksimal percobaan ujian telah tercapai")
	}

	// Auto-grade multiple choice
	var score *float64
		if q.QuestionType == "multiple_choice" {
			type Opt struct {
				Text      string `json:"text"`
				IsCorrect bool   `json:"is_correct"`
			}
			var opts []Opt
			json.Unmarshal(q.Options, &opts)
			for _, o := range opts {
				if o.Text == answerText {
					if o.IsCorrect {
						val := float64(q.Points)
						score = &val
					} else {
						val := float64(0)
						score = &val
					}
					break
				}
			}
		}

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
			Score:      score,
		}
		return &ans, s.db.WithContext(ctx).Create(&ans).Error
	}
	// Use Updates on specific columns only — avoids GORM cascading upsert on
	// preloaded associations hitting PostgreSQL GENERATED ALWAYS identity constraint.
	if err := s.db.WithContext(ctx).Model(&ans).
		Select("answer_text", "file_url", "score").
		Updates(map[string]interface{}{
			"answer_text": answerText,
			"file_url":    fileURL,
			"score":       score,
		}).Error; err != nil {
		return nil, err
	}
	ans.AnswerText = answerText
	ans.FileURL = fileURL
	ans.Score = score
	return &ans, nil
}

func (s *assignmentService) FinishExamAttempt(ctx context.Context, examID, studentID int) (float64, float64, float64, error) {
	var count int64
	s.db.WithContext(ctx).Model(&models.ExamSubmission{}).Where("exam_id = ? AND student_id = ?", examID, studentID).Count(&count)
	
	// Increment attempts and record
	attempt := &models.ExamSubmission{
		ExamID:    examID,
		StudentID: studentID,
		Attempt:   int(count) + 1,
	}
	if err := s.db.WithContext(ctx).Create(attempt).Error; err != nil {
		return 0, 0, 0, err
	}

	// Calculate score
	var answers []models.ExamAnswer
	s.db.WithContext(ctx).Preload("Question").
		Joins("JOIN exam_questions ON exam_questions.id = exam_answers.question_id").
		Where("exam_answers.student_id = ? AND exam_questions.exam_id = ?", studentID, examID).
		Find(&answers)

	var totalScore, maxScore float64
	for _, ans := range answers {
		maxScore += float64(ans.Question.Points)
		if ans.Score != nil {
			totalScore += *ans.Score
		}
	}

	var score100 float64
	if maxScore > 0 {
		score100 = (totalScore / maxScore) * 100
	}

	return totalScore, maxScore, score100, nil
}

// ─── Exam Grading (Teacher) ───────────────────────────────────────────────────

func (s *assignmentService) GetExamStudents(ctx context.Context, examID int) ([]models.User, error) {
	var students []models.User
	// Get distinct students who have answered at least one question for this exam
	err := s.db.WithContext(ctx).
		Joins("JOIN exam_answers ON exam_answers.student_id = users.id").
		Joins("JOIN exam_questions ON exam_questions.id = exam_answers.question_id").
		Where("exam_questions.exam_id = ?", examID).
		Group("users.id").
		Find(&students).Error
	return students, err
}

func (s *assignmentService) GetStudentAnswers(ctx context.Context, examID, studentID int) ([]models.ExamAnswer, error) {
	var answers []models.ExamAnswer
	err := s.db.WithContext(ctx).
		Joins("JOIN exam_questions ON exam_questions.id = exam_answers.question_id").
		Where("exam_questions.exam_id = ? AND exam_answers.student_id = ?", examID, studentID).
		Preload("Question").
		Order("exam_questions.order_num ASC").
		Find(&answers).Error
	return answers, err
}

func (s *assignmentService) GradeAnswer(ctx context.Context, answerID int, score float64) (*models.ExamAnswer, error) {
	var ans models.ExamAnswer
	if err := s.db.WithContext(ctx).Preload("Question").First(&ans, answerID).Error; err != nil {
		return nil, errors.New("jawaban tidak ditemukan")
	}
	ans.Score = &score
	if err := s.db.WithContext(ctx).Model(&ans).Update("score", score).Error; err != nil {
		return nil, err
	}

	// Update the final grade in the recap if all answers are graded
	var allAnswers []models.ExamAnswer
	s.db.WithContext(ctx).
		Joins("JOIN exam_questions ON exam_questions.id = exam_answers.question_id").
		Where("exam_questions.exam_id = ? AND exam_answers.student_id = ?", ans.Question.ExamID, ans.StudentID).
		Find(&allAnswers)

	var totalScore float64
	allGraded := true
	for _, a := range allAnswers {
		if a.Score == nil {
			allGraded = false
			break
		}
		totalScore += *a.Score
	}

	if allGraded {
		// Just inform the user or notify them
		s.db.WithContext(ctx).Create(&models.Notification{
			UserID:  ans.StudentID,
			Title:   "Ujian Dinilai",
			Message: fmt.Sprintf("Ujian Anda telah selesai dinilai dengan total skor %.1f", totalScore),
			Type:    "grade",
			RefID:   ans.Question.ExamID,
		})
	}

	return &ans, nil
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

	// 3. Build enrolled infos
	classMap := make(map[int]models.Class)
	for _, c := range classes {
		classMap[c.ID] = c
	}

	var enrolledInfos []EnrolledClassInfo
	for _, e := range enrollments {
		cls, ok := classMap[e.ClassID]
		if !ok { continue }
		enrolledInfos = append(enrolledInfos, EnrolledClassInfo{
			ClassID:      e.ClassID,
			ClassName:    cls.Name,
			AcademicYear: cls.AcademicYear.YearRange,
			IsActiveYear: cls.AcademicYear.IsActive,
		})
	}

	// 4. Sort enrollments: ACTIVE year first
	sort.Slice(enrolledInfos, func(i, j int) bool {
		if enrolledInfos[i].IsActiveYear && !enrolledInfos[j].IsActiveYear {
			return true
		}
		return false
	})

	// 5. Build pending tasks from assignments & exams
	var pendingTasks []PendingTask

	for _, cls := range classes {
		// Pending assignments
		var assignments []models.Assignment
		s.db.WithContext(ctx).Where("class_id = ?", cls.ID).Find(&assignments)
		for _, a := range assignments {
			var sub models.Submission
			submitted := s.db.WithContext(ctx).
				Where("assignment_id = ? AND student_id = ?", a.ID, studentID).
				First(&sub).Error == nil

			pendingTasks = append(pendingTasks, PendingTask{
				Type:        "assignment",
				ID:          a.ID,
				Title:       a.Title,
				ClassName:   cls.Name,
				DueDate:     a.DueDate,
				IsSubmitted: submitted,
				IsActiveYear: cls.AcademicYear.IsActive,
			})
		}

		// Upcoming exams
		var exams []models.Exam
		s.db.WithContext(ctx).Where("class_id = ?", cls.ID).Find(&exams)
		for _, ex := range exams {
			var attempts int64
			s.db.WithContext(ctx).Model(&models.ExamSubmission{}).Where("exam_id = ? AND student_id = ?", ex.ID, studentID).Count(&attempts)
			submitted := int(attempts) >= ex.MaxAttempts

			pendingTasks = append(pendingTasks, PendingTask{
				Type:        "exam",
				ID:          ex.ID,
				Title:       ex.Title,
				ClassName:   cls.Name,
				DueDate:     ex.EndTime,
				IsSubmitted: submitted,
				IsActiveYear: cls.AcademicYear.IsActive,
			})
		}
	}

	return &StudentDashboard{
		Enrollments:  enrolledInfos,
		PendingTasks: pendingTasks,
	}, nil
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// notifyStudentsForClass sends a notification to all students enrolled in the class
func (s *assignmentService) notifyStudentsForClass(ctx context.Context, classID, refID int, nType, title, msg string) {
	var enrollments []models.ClassEnrollment
	s.db.WithContext(ctx).Where("class_id = ?", classID).Find(&enrollments)
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
