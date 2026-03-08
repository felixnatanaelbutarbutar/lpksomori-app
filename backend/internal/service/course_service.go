package service

import (
	"context"
	"errors"
	"lpkmori-backend/internal/models"

	"gorm.io/gorm"
)

type CourseService interface {
	// ListCourses lists all courses for a given class or teacher, preloading the teacher.
	ListCourses(ctx context.Context, classID, teacherID int) ([]models.Course, error)
	// CreateCourse creates a course in a class, auto-setting teacher_id from the caller.
	CreateCourse(ctx context.Context, classID int, teacherID int, name string) (*models.Course, error)
	// UpdateCourse lets the owning teacher rename their course.
	UpdateCourse(ctx context.Context, id int, teacherID int, name string) (*models.Course, error)
	// DeleteCourse removes a course (only by owning teacher).
	DeleteCourse(ctx context.Context, id int, teacherID int) error
}

type courseService struct {
	db *gorm.DB
}

func NewCourseService(db *gorm.DB) CourseService {
	return &courseService{db: db}
}

func (s *courseService) ListCourses(ctx context.Context, classID, teacherID int) ([]models.Course, error) {
	var courses []models.Course
	query := s.db.WithContext(ctx).Preload("Teacher").Order("id ASC")
	if classID > 0 {
		query = query.Where("class_id = ?", classID)
	}
	if teacherID > 0 {
		query = query.Where("teacher_id = ?", teacherID)
	}
	if err := query.Find(&courses).Error; err != nil {
		return nil, err
	}
	return courses, nil
}

func (s *courseService) CreateCourse(ctx context.Context, classID, teacherID int, name string) (*models.Course, error) {
	// Verify class exists
	var cls models.Class
	if err := s.db.WithContext(ctx).First(&cls, classID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("kelas tidak ditemukan")
		}
		return nil, err
	}

	course := &models.Course{
		ClassID:   classID,
		TeacherID: &teacherID,
		Name:      name,
	}

	if err := s.db.WithContext(ctx).Create(course).Error; err != nil {
		return nil, err
	}

	// Preload teacher info for the response
	s.db.WithContext(ctx).Preload("Teacher").First(course, course.ID)
	return course, nil
}

func (s *courseService) UpdateCourse(ctx context.Context, id, teacherID int, name string) (*models.Course, error) {
	var course models.Course
	if err := s.db.WithContext(ctx).First(&course, id).Error; err != nil {
		return nil, errors.New("mata pelajaran tidak ditemukan")
	}
	if course.TeacherID == nil || *course.TeacherID != teacherID {
		return nil, errors.New("hanya guru pemilik yang bisa mengubah mata pelajaran ini")
	}

	course.Name = name
	if err := s.db.WithContext(ctx).Save(&course).Error; err != nil {
		return nil, err
	}
	return &course, nil
}

func (s *courseService) DeleteCourse(ctx context.Context, id, teacherID int) error {
	var course models.Course
	if err := s.db.WithContext(ctx).First(&course, id).Error; err != nil {
		return errors.New("mata pelajaran tidak ditemukan")
	}
	if course.TeacherID == nil || *course.TeacherID != teacherID {
		return errors.New("hanya guru pemilik yang bisa menghapus mata pelajaran ini")
	}
	return s.db.WithContext(ctx).Delete(&course).Error
}
