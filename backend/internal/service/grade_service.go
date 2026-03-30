package service

import (
	"context"
	"lpkmori-backend/internal/models"
	"time"

	"gorm.io/gorm"
)

type GradeService struct {
	db *gorm.DB
}

func NewGradeService(db *gorm.DB) *GradeService {
	return &GradeService{db: db}
}

type StudentRecap struct {
	StudentID        int                `json:"student_id"`
	StudentName      string             `json:"student_name"`
	NIS              string             `json:"nis"`
	AssignmentGrades map[string]float64 `json:"assignment_grades"`
	ExamGrades       map[string]float64 `json:"exam_grades"`
	AssignmentAvg    float64            `json:"assignment_avg"`
	ExamAvg          float64            `json:"exam_avg"`
	FinalScore       float64            `json:"final_score"`
	Status           string             `json:"status"`
	Notes            string             `json:"notes"`
}

func (s *GradeService) GetClassRecap(ctx context.Context, classID int) ([]StudentRecap, error) {
	var enrollments []models.ClassEnrollment
	if err := s.db.WithContext(ctx).Preload("User").Where("class_id = ?", classID).Find(&enrollments).Error; err != nil {
		return nil, err
	}

	var assignments []models.Assignment
	if err := s.db.WithContext(ctx).Where("class_id = ?", classID).Find(&assignments).Error; err != nil {
		return nil, err
	}

	var allSubs []models.Submission
	assignIDs := make([]int, len(assignments))
	for i, a := range assignments {
		assignIDs[i] = a.ID
	}
	if len(assignIDs) > 0 {
		if err := s.db.WithContext(ctx).Where("assignment_id IN ?", assignIDs).Find(&allSubs).Error; err != nil {
			return nil, err
		}
	}

	var exams []models.Exam
	if err := s.db.WithContext(ctx).Where("class_id = ?", classID).Find(&exams).Error; err != nil {
		return nil, err
	}

	res := make([]StudentRecap, 0, len(enrollments))
	for _, en := range enrollments {
		r := StudentRecap{
			StudentID:        en.UserID,
			StudentName:      en.User.Name,
			NIS:              en.User.NIS,
			AssignmentGrades: make(map[string]float64),
			ExamGrades:       make(map[string]float64),
		}

		// Assignments
		var sum float64
		var count float64
		for _, sub := range allSubs {
			if sub.StudentID == en.UserID && sub.Grade != nil {
				title := "Tugas"
				for _, a := range assignments {
					if a.ID == sub.AssignmentID {
						title = a.Title
						break
					}
				}
				r.AssignmentGrades[title] = *sub.Grade
				sum += *sub.Grade
				count++
			}
		}
		if count > 0 {
			r.AssignmentAvg = sum / count
		}

		// Exams
		var examTotal, examCount float64
		for _, ex := range exams {
			var earned float64
			s.db.WithContext(ctx).Model(&models.ExamAnswer{}).
				Joins("JOIN exam_questions ON exam_questions.id = exam_answers.question_id").
				Where("exam_questions.exam_id = ? AND exam_answers.student_id = ?", ex.ID, en.UserID).
				Select("COALESCE(SUM(score), 0)").Scan(&earned)

			var maxPts float64
			s.db.WithContext(ctx).Model(&models.ExamQuestion{}).
				Where("exam_id = ?", ex.ID).
				Select("COALESCE(SUM(points), 1)").Scan(&maxPts)
			if maxPts <= 0 {
				maxPts = 1 // Prevent div/0 if no questions match
			}

			// Only consider exam "taken" if attempts > 0 or earned > 0
			var attempts int64
			s.db.WithContext(ctx).Model(&models.ExamSubmission{}).Where("exam_id = ? AND student_id = ?", ex.ID, en.UserID).Count(&attempts)
			
			if attempts > 0 || earned > 0 {
				score100 := (earned / maxPts) * 100
				r.ExamGrades[ex.Title] = score100
				examTotal += score100
				examCount++
			}
		}
		if examCount > 0 {
			r.ExamAvg = examTotal / examCount
		}

		// Saved status
		var savedRecap models.GradeRecap
		if err := s.db.WithContext(ctx).Where("student_id = ? AND class_id = ?", en.UserID, classID).First(&savedRecap).Error; err == nil {
			r.Status = savedRecap.Status
			r.Notes = savedRecap.Notes
			r.FinalScore = savedRecap.FinalScore
		} else {
			r.Status = "In Progress"
			r.FinalScore = (r.AssignmentAvg * 0.4) + (r.ExamAvg * 0.6)
		}

		res = append(res, r)
	}

	return res, nil
}

func (s *GradeService) SaveRecap(ctx context.Context, classID, studentID int, status, notes string, finalScore float64, teacherID int) (*models.GradeRecap, error) {
	var recap models.GradeRecap
	err := s.db.WithContext(ctx).Where("student_id = ? AND class_id = ?", studentID, classID).First(&recap).Error
	
	recap.ClassID = classID
	recap.StudentID = studentID
	recap.Status = status
	recap.Notes = notes
	recap.FinalScore = finalScore
	recap.TeacherID = teacherID
	recap.UpdatedAt = time.Now()

	if err == gorm.ErrRecordNotFound {
		if err := s.db.WithContext(ctx).Create(&recap).Error; err != nil {
			return nil, err
		}
	} else if err != nil {
		return nil, err
	} else {
		if err := s.db.WithContext(ctx).Save(&recap).Error; err != nil {
			return nil, err
		}
	}

	return &recap, nil
}
