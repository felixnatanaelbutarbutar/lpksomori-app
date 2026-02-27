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
