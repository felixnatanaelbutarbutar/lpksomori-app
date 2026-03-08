package models

import (
	"time"
)

// ─── User ────────────────────────────────────────────────────────────────────
// Roles: admin | teacher | student
type User struct {
	ID        int       `gorm:"primaryKey;autoIncrement" json:"id"`
	Name      string    `gorm:"not null"                json:"name"`
	Email     string    `gorm:"unique;not null"         json:"email"`
	Role      string    `gorm:"not null"                json:"role"`  // admin, teacher, student
	Password  string    `gorm:"not null"                json:"password,omitempty"`
	NIS       string    `                               json:"nis"`
	Photo     string    `                               json:"photo"`
	Active    bool      `gorm:"default:true"            json:"active"`
	CreatedAt time.Time `                               json:"created_at"`
	UpdatedAt time.Time `                               json:"updated_at"`
}

// ─── Academic Year ────────────────────────────────────────────────────────────
type AcademicYear struct {
	ID        int       `gorm:"primaryKey;autoIncrement" json:"id"`
	YearRange string    `gorm:"not null;unique"          json:"year_range"` // e.g. "2025/2026"
	IsActive  bool      `gorm:"default:false"            json:"is_active"`
	CreatedAt time.Time `                                json:"created_at"`
	UpdatedAt time.Time `                                json:"updated_at"`
	Classes   []Class   `gorm:"foreignKey:AcademicYearID" json:"classes,omitempty"`
}

// ─── Class ────────────────────────────────────────────────────────────────────
type Class struct {
	ID             int          `gorm:"primaryKey;autoIncrement"  json:"id"`
	AcademicYearID int          `gorm:"not null"                  json:"academic_year_id"`
	AcademicYear   AcademicYear `gorm:"foreignKey:AcademicYearID" json:"academic_year,omitempty"`
	Name           string       `gorm:"not null"                  json:"name"`
	Level          int          `gorm:"not null"                  json:"level"` // 1-5
	CreatedAt      time.Time    `                                 json:"created_at"`
	UpdatedAt      time.Time    `                                 json:"updated_at"`
	Enrollments    []ClassEnrollment `gorm:"foreignKey:ClassID"    json:"enrollments,omitempty"`
}

// ─── Class Enrollment ─────────────────────────────────────────────────────────
// Junction table: links a student (user) to a class.
// One student can only be enrolled in a class once (unique constraint).
type ClassEnrollment struct {
	ID         int       `gorm:"primaryKey;autoIncrement" json:"id"`
	ClassID    int       `gorm:"not null;uniqueIndex:idx_class_user" json:"class_id"`
	UserID     int       `gorm:"not null;uniqueIndex:idx_class_user" json:"user_id"`
	User       User      `gorm:"foreignKey:UserID"         json:"user,omitempty"`
	EnrolledAt time.Time `gorm:"autoCreateTime"            json:"enrolled_at"`
}

// ─── Course ───────────────────────────────────────────────────────────────────
type Course struct {
	ID        int       `gorm:"primaryKey;autoIncrement" json:"id"`
	ClassID   int       `gorm:"not null"                 json:"class_id"`
	Class     Class     `gorm:"foreignKey:ClassID"       json:"class,omitempty"`
	TeacherID *int      `                                json:"teacher_id"` // nullable
	Teacher   *User     `gorm:"foreignKey:TeacherID"     json:"teacher,omitempty"`
	Name      string    `gorm:"not null"                 json:"name"`
	CreatedAt time.Time `                                json:"created_at"`
	UpdatedAt time.Time `                                json:"updated_at"`
}

// ─── Course Activity ──────────────────────────────────────────────────────────
// Types: quiz | exam | assignment
type CourseActivity struct {
	ID        int        `gorm:"primaryKey;autoIncrement" json:"id"`
	CourseID  int        `gorm:"not null"                 json:"course_id"`
	Course    Course     `gorm:"foreignKey:CourseID"      json:"course,omitempty"`
	Type      string     `gorm:"not null"                 json:"type"`
	Title     string     `gorm:"not null"                 json:"title"`
	DueDate   *time.Time `                                json:"due_date"`
	CreatedAt time.Time  `                                json:"created_at"`
	UpdatedAt time.Time  `                                json:"updated_at"`
}

// ─── Question ─────────────────────────────────────────────────────────────────
// Types: multiple_choice | essay | fill_in_the_blank
type Question struct {
	ID             int              `gorm:"primaryKey;autoIncrement" json:"id"`
	ActivityID     int              `gorm:"not null"                 json:"activity_id"`
	Activity       CourseActivity   `gorm:"foreignKey:ActivityID"    json:"activity,omitempty"`
	Type           string           `gorm:"not null"                 json:"type"`
	QuestionText   string           `gorm:"not null"                 json:"question_text"`
	ImageURL       string           `                                json:"image_url"`
	AudioURL       string           `                                json:"audio_url"`
	Points         int              `gorm:"default:1"               json:"points"`
	CreatedAt      time.Time        `                                json:"created_at"`
	UpdatedAt      time.Time        `                                json:"updated_at"`
	Options        []QuestionOption `gorm:"foreignKey:QuestionID"    json:"options,omitempty"`
}

// ─── Question Option ──────────────────────────────────────────────────────────
type QuestionOption struct {
	ID         int       `gorm:"primaryKey;autoIncrement" json:"id"`
	QuestionID int       `gorm:"not null"                 json:"question_id"`
	OptionText string    `gorm:"not null"                 json:"option_text"`
	IsCorrect  bool      `gorm:"default:false"            json:"is_correct"`
	CreatedAt  time.Time `                                json:"created_at"`
	UpdatedAt  time.Time `                                json:"updated_at"`
}

// ─── Student Answer ───────────────────────────────────────────────────────────
type StudentAnswer struct {
	ID               int             `gorm:"primaryKey;autoIncrement"    json:"id"`
	UserID           int             `gorm:"not null"                    json:"user_id"`
	User             User            `gorm:"foreignKey:UserID"           json:"user,omitempty"`
	QuestionID       int             `gorm:"not null"                    json:"question_id"`
	Question         Question        `gorm:"foreignKey:QuestionID"       json:"question,omitempty"`
	SelectedOptionID *int            `                                   json:"selected_option_id"`
	SelectedOption   *QuestionOption `gorm:"foreignKey:SelectedOptionID" json:"selected_option,omitempty"`
	AnswerText       string          `                                   json:"answer_text"`
	Score            float64         `gorm:"default:0"                   json:"score"`
	CreatedAt        time.Time       `                                   json:"created_at"`
	UpdatedAt        time.Time       `                                   json:"updated_at"`
}

// ─── Assignment (Tugas) ───────────────────────────────────────────────────────
// Created by teacher, attached to a course. Students submit via Submission.
type Assignment struct {
	ID          int         `gorm:"primaryKey;autoIncrement" json:"id"`
	CourseID    int         `gorm:"not null"                 json:"course_id"`
	Course      Course      `gorm:"foreignKey:CourseID"      json:"course,omitempty"`
	Title       string      `gorm:"not null"                 json:"title"`
	Description string      `gorm:"type:text"                json:"description"`
	FileURL     string      `                                json:"file_url"`     // teacher attachment
	DueDate     *time.Time  `                                json:"due_date"`
	CreatedAt   time.Time   `                                json:"created_at"`
	UpdatedAt   time.Time   `                                json:"updated_at"`
	Submissions []Submission `gorm:"foreignKey:AssignmentID" json:"submissions,omitempty"`
}

// ─── Submission ───────────────────────────────────────────────────────────────
// Student's work submitted for an Assignment.
type Submission struct {
	ID           int        `gorm:"primaryKey;autoIncrement;uniqueIndex:idx_sub_unique" json:"id"`
	AssignmentID int        `gorm:"not null;uniqueIndex:idx_sub_unique"                 json:"assignment_id"`
	Assignment   Assignment `gorm:"foreignKey:AssignmentID"                             json:"assignment,omitempty"`
	StudentID    int        `gorm:"not null;uniqueIndex:idx_sub_unique"                 json:"student_id"`
	Student      User       `gorm:"foreignKey:StudentID"                                json:"student,omitempty"`
	FileURL      string     `                                                           json:"file_url"`   // student upload
	Note         string     `gorm:"type:text"                                           json:"note"`
	Grade        *float64   `                                                           json:"grade"`      // null until graded
	Feedback     string     `gorm:"type:text"                                           json:"feedback"`
	SubmittedAt  time.Time  `gorm:"autoCreateTime"                                      json:"submitted_at"`
	UpdatedAt    time.Time  `                                                           json:"updated_at"`
}

// ─── Exam ─────────────────────────────────────────────────────────────────────
// An exam created by a teacher for a course.
type Exam struct {
	ID          int            `gorm:"primaryKey;autoIncrement" json:"id"`
	CourseID    int            `gorm:"not null"                 json:"course_id"`
	Course      Course         `gorm:"foreignKey:CourseID"      json:"course,omitempty"`
	Title       string         `gorm:"not null"                 json:"title"`
	Description string         `gorm:"type:text"                json:"description"`
	StartTime   *time.Time     `                                json:"start_time"`
	EndTime     *time.Time     `                                json:"end_time"`
	CreatedAt   time.Time      `                                json:"created_at"`
	UpdatedAt   time.Time      `                                json:"updated_at"`
	Questions   []ExamQuestion `gorm:"foreignKey:ExamID"        json:"questions,omitempty"`
}

// ─── Exam Question ────────────────────────────────────────────────────────────
// Flexible question type stored with JSONB options field.
// Type: "multiple_choice" | "essay" | "file_upload"
// Options JSON for multiple_choice: [{"text":"A","is_correct":true}, ...]
// Options JSON for essay/file_upload: null
type ExamQuestion struct {
	ID        int             `gorm:"primaryKey;autoIncrement" json:"id"`
	ExamID    int             `gorm:"not null"                 json:"exam_id"`
	Exam      Exam            `gorm:"foreignKey:ExamID"        json:"exam,omitempty"`
	OrderNum  int             `gorm:"default:0"               json:"order_num"`
	QuestionType string       `gorm:"not null"                 json:"question_type"` // multiple_choice | essay | file_upload
	Text      string          `gorm:"type:text;not null"       json:"text"`
	Points    int             `gorm:"default:1"               json:"points"`
	Options   []byte          `gorm:"type:jsonb"               json:"options"` // raw JSON
	CreatedAt time.Time       `                                json:"created_at"`
	Answers   []ExamAnswer    `gorm:"foreignKey:QuestionID"    json:"answers,omitempty"`
}

// ─── Exam Answer ──────────────────────────────────────────────────────────────
// A student's answer to an ExamQuestion.
// answer_text: essay response OR selected option index (for MC)
// file_url: for file_upload type questions
type ExamAnswer struct {
	ID         int          `gorm:"primaryKey;autoIncrement;uniqueIndex:idx_exam_ans"  json:"id"`
	QuestionID int          `gorm:"not null;uniqueIndex:idx_exam_ans"                  json:"question_id"`
	Question   ExamQuestion `gorm:"foreignKey:QuestionID"                              json:"question,omitempty"`
	StudentID  int          `gorm:"not null;uniqueIndex:idx_exam_ans"                  json:"student_id"`
	Student    User         `gorm:"foreignKey:StudentID"                               json:"student,omitempty"`
	AnswerText string       `gorm:"type:text"                                          json:"answer_text"`
	FileURL    string       `                                                          json:"file_url"`
	Score      *float64     `                                                          json:"score"`
	AnsweredAt time.Time    `gorm:"autoCreateTime"                                     json:"answered_at"`
}

// ─── Notification ─────────────────────────────────────────────────────────────
// In-app notification for a specific user.
// Type: "assignment" | "exam" | "grade" | "announcement"
type Notification struct {
	ID        int       `gorm:"primaryKey;autoIncrement" json:"id"`
	UserID    int       `gorm:"not null;index"           json:"user_id"`
	Title     string    `gorm:"not null"                 json:"title"`
	Message   string    `gorm:"type:text"                json:"message"`
	Type      string    `gorm:"not null"                 json:"type"`
	RefID     int       `                                json:"ref_id"`   // ID of the referenced entity
	IsRead    bool      `gorm:"default:false"            json:"is_read"`
	CreatedAt time.Time `                                json:"created_at"`
}

// ─── Announcement ─────────────────────────────────────────────────────────────
// Platform-wide announcements created by admin or teacher.
// Supports bilingual content (Indonesian + Japanese).
type Announcement struct {
	ID            int       `gorm:"primaryKey;autoIncrement" json:"id"`
	Title         string    `gorm:"not null"                 json:"title"`
	TitleJa       string    `                                json:"title_ja"`      // Japanese title (optional)
	Content       string    `gorm:"type:text;not null"       json:"content"`
	ContentJa     string    `gorm:"type:text"                json:"content_ja"`    // Japanese content (optional)
	CreatorID     int       `gorm:"not null"                 json:"creator_id"`
	Creator       User      `gorm:"foreignKey:CreatorID"     json:"creator,omitempty"`
	CreatorRole   string    `gorm:"not null"                 json:"creator_role"`  // admin | teacher
	IsPinned      bool      `gorm:"default:false"            json:"is_pinned"`
	IsActive      bool      `gorm:"default:true"             json:"is_active"`
	CreatedAt     time.Time `                                json:"created_at"`
	UpdatedAt     time.Time `                                json:"updated_at"`
}
