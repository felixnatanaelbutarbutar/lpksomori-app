package service

import (
	"context"
	"errors"
	"fmt"
	"lpkmori-backend/internal/models"

	"gorm.io/gorm"
)

type AcademicYearService interface {
	ListAcademicYears(ctx context.Context) ([]models.AcademicYear, error)
	GetActiveYear(ctx context.Context) (*models.AcademicYear, error)
	CreateAcademicYear(ctx context.Context, yearRange string, setActive bool) (*models.AcademicYear, error)
	SetActive(ctx context.Context, id int) (*models.AcademicYear, error)
	DeleteAcademicYear(ctx context.Context, id int) error

	// Classes
	ListClasses(ctx context.Context, academicYearID int) ([]models.Class, error)
	GetClass(ctx context.Context, id int) (*models.Class, error)
	CreateClass(ctx context.Context, name string, babStart, babEnd int, teacherID *int) (*models.Class, error)
	RenameClass(ctx context.Context, id int, name string, babStart, babEnd int, teacherID *int) (*models.Class, error)
	DeleteClass(ctx context.Context, id int) error

	// Enrollments
	ListEnrollments(ctx context.Context, classID int) ([]models.ClassEnrollment, error)
	EnrollStudent(ctx context.Context, classID, userID int) (*models.ClassEnrollment, error)
	EnrollBulkStudents(ctx context.Context, classID int, userIDs []int) error
	UnenrollStudent(ctx context.Context, classID, userID int) error
}

type academicYearService struct {
	db *gorm.DB
}

func NewAcademicYearService(db *gorm.DB) AcademicYearService {
	return &academicYearService{db: db}
}

// ListAcademicYears returns all academic years ordered by newest first.
func (s *academicYearService) ListAcademicYears(ctx context.Context) ([]models.AcademicYear, error) {
	var years []models.AcademicYear
	if err := s.db.WithContext(ctx).
		Preload("Classes").
		Order("id DESC").
		Find(&years).Error; err != nil {
		return nil, err
	}
	return years, nil
}

// GetActiveYear returns the currently active academic year.
func (s *academicYearService) GetActiveYear(ctx context.Context) (*models.AcademicYear, error) {
	var year models.AcademicYear
	if err := s.db.WithContext(ctx).
		Where("is_active = ?", true).
		Preload("Classes").
		First(&year).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("tidak ada tahun ajaran yang aktif")
		}
		return nil, err
	}
	return &year, nil
}

// CreateAcademicYear creates a new academic year and optionally sets it as active.
// It auto-generates Class 1–5.
// If setActive=true, it deactivates all other years first (only one can be active).
func (s *academicYearService) CreateAcademicYear(ctx context.Context, yearRange string, setActive bool) (*models.AcademicYear, error) {
	newYear := &models.AcademicYear{
		YearRange: yearRange,
		IsActive:  setActive,
	}

	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// If setting to active, deactivate all existing years first
		if setActive {
			if err := tx.Model(&models.AcademicYear{}).
				Where("is_active = ?", true).
				Update("is_active", false).Error; err != nil {
				return err
			}
		}

		// Insert academic year with RETURNING id
		var insertedID int
		if err := tx.Raw(
			`INSERT INTO academic_years (year_range, is_active) VALUES (?, ?) RETURNING id`,
			newYear.YearRange, newYear.IsActive,
		).Scan(&insertedID).Error; err != nil {
			return fmt.Errorf("gagal membuat tahun ajaran: %w", err)
		}
		newYear.ID = insertedID

		// Auto-generate Class 1 through 8
		babs := []struct{ Start, End int }{
			{1, 6}, {7, 12}, {13, 18}, {19, 25}, {26, 31}, {32, 37}, {38, 44}, {45, 50},
		}
		for i, b := range babs {
			className := fmt.Sprintf("Kelas %d", i+1)
			if err := tx.Exec(
				`INSERT INTO classes (academic_year_id, name, bab_start, bab_end) VALUES (?, ?, ?, ?)`,
				newYear.ID, className, b.Start, b.End,
			).Error; err != nil {
				return fmt.Errorf("gagal membuat %s: %w", className, err)
			}
		}

		return nil
	})

	if err != nil {
		return nil, err
	}
	return newYear, nil
}

// SetActive marks the given academic year as active and deactivates all others.
// Enforces: only ONE active year at a time.
func (s *academicYearService) SetActive(ctx context.Context, id int) (*models.AcademicYear, error) {
	var year models.AcademicYear
	if err := s.db.WithContext(ctx).First(&year, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("tahun ajaran tidak ditemukan")
		}
		return nil, err
	}

	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Deactivate all
		if err := tx.Model(&models.AcademicYear{}).
			Where("is_active = ?", true).
			Update("is_active", false).Error; err != nil {
			return err
		}
		// Activate the target
		if err := tx.Model(&year).Update("is_active", true).Error; err != nil {
			return err
		}
		return nil
	})

	if err != nil {
		return nil, err
	}

	year.IsActive = true
	return &year, nil
}

// DeleteAcademicYear deletes a year. Does not allow deleting the active year.
func (s *academicYearService) DeleteAcademicYear(ctx context.Context, id int) error {
	var year models.AcademicYear
	if err := s.db.WithContext(ctx).First(&year, id).Error; err != nil {
		return errors.New("tahun ajaran tidak ditemukan")
	}
	if year.IsActive {
		return errors.New("tidak bisa menghapus tahun ajaran yang sedang aktif")
	}
	return s.db.WithContext(ctx).Delete(&models.AcademicYear{}, id).Error
}

// ─── Classes ──────────────────────────────────────────────────────────────────

// ListClasses returns classes for a given academic year (or active year if 0).
func (s *academicYearService) ListClasses(ctx context.Context, academicYearID int) ([]models.Class, error) {
	var classes []models.Class
	query := s.db.WithContext(ctx).Preload("AcademicYear").Preload("Teacher").Order("bab_start ASC")
	if academicYearID > 0 {
		query = query.Where("academic_year_id = ?", academicYearID)
	}
	if err := query.Find(&classes).Error; err != nil {
		return nil, err
	}
	return classes, nil
}

// GetClass returns a single class by id.
func (s *academicYearService) GetClass(ctx context.Context, id int) (*models.Class, error) {
	var cls models.Class
	if err := s.db.WithContext(ctx).Preload("AcademicYear").Preload("Teacher").First(&cls, id).Error; err != nil {
		return nil, errors.New("kelas tidak ditemukan")
	}
	return &cls, nil
}

// CreateClass creates a new class and automatically links it to the active academic year.
func (s *academicYearService) CreateClass(ctx context.Context, name string, babStart, babEnd int, teacherID *int) (*models.Class, error) {
	// Find active academic year
	activeYear, err := s.GetActiveYear(ctx)
	if err != nil {
		return nil, fmt.Errorf("tidak ada tahun ajaran aktif — aktifkan tahun ajaran dahulu: %w", err)
	}

	class := &models.Class{
		AcademicYearID: activeYear.ID,
		Name:           name,
		BabStart:       babStart,
		BabEnd:         babEnd,
		TeacherID:      teacherID,
	}

	if err := s.db.WithContext(ctx).Create(class).Error; err != nil {
		return nil, fmt.Errorf("gagal membuat kelas: %w", err)
	}

	s.db.WithContext(ctx).Preload("Teacher").First(class, class.ID)
	return class, nil
}

// DeleteClass removes a class by ID.
func (s *academicYearService) DeleteClass(ctx context.Context, id int) error {
	result := s.db.WithContext(ctx).Delete(&models.Class{}, id)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return errors.New("kelas tidak ditemukan")
	}
	return nil
}

// RenameClass updates a class' details.
func (s *academicYearService) RenameClass(ctx context.Context, id int, name string, babStart, babEnd int, teacherID *int) (*models.Class, error) {
	var cls models.Class
	if err := s.db.WithContext(ctx).First(&cls, id).Error; err != nil {
		return nil, errors.New("kelas tidak ditemukan")
	}
	cls.Name = name
	cls.BabStart = babStart
	cls.BabEnd = babEnd
	cls.TeacherID = teacherID
	if err := s.db.WithContext(ctx).Save(&cls).Error; err != nil {
		return nil, err
	}
	s.db.WithContext(ctx).Preload("Teacher").First(&cls, cls.ID)
	return &cls, nil
}

// ─── Enrollment ───────────────────────────────────────────────────────────────

// ListEnrollments lists all students enrolled in a class.
func (s *academicYearService) ListEnrollments(ctx context.Context, classID int) ([]models.ClassEnrollment, error) {
	var enrollments []models.ClassEnrollment
	if err := s.db.WithContext(ctx).
		Where("class_id = ?", classID).
		Preload("User").
		Order("enrolled_at ASC").
		Find(&enrollments).Error; err != nil {
		return nil, err
	}
	return enrollments, nil
}

// EnrollStudent registers a student into a class.
func (s *academicYearService) EnrollStudent(ctx context.Context, classID, userID int) (*models.ClassEnrollment, error) {
	var cls models.Class
	if err := s.db.WithContext(ctx).First(&cls, classID).Error; err != nil {
		return nil, errors.New("kelas tidak ditemukan")
	}
	var user models.User
	if err := s.db.WithContext(ctx).First(&user, userID).Error; err != nil {
		return nil, errors.New("pengguna tidak ditemukan")
	}
	if user.Role != "student" {
		return nil, errors.New("hanya siswa yang dapat didaftarkan ke kelas")
	}

	enrollment := &models.ClassEnrollment{ClassID: classID, UserID: userID}
	if err := s.db.WithContext(ctx).Create(enrollment).Error; err != nil {
		return nil, errors.New("siswa sudah terdaftar di kelas ini")
	}
	s.db.WithContext(ctx).Preload("User").First(enrollment, enrollment.ID)
	return enrollment, nil
}

// EnrollBulkStudents registers multiple students into a class at once.
func (s *academicYearService) EnrollBulkStudents(ctx context.Context, classID int, userIDs []int) error {
	var cls models.Class
	if err := s.db.WithContext(ctx).First(&cls, classID).Error; err != nil {
		return errors.New("kelas tidak ditemukan")
	}

	return s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		for _, userID := range userIDs {
			var user models.User
			if err := tx.First(&user, userID).Error; err != nil {
				continue // skip invalid users
			}
			if user.Role != "student" {
				continue // skip non-students
			}
			enrollment := &models.ClassEnrollment{ClassID: classID, UserID: userID}
			// Ignore errors on create (e.g. if already enrolled)
			tx.Create(enrollment)
		}
		return nil
	})
}

// UnenrollStudent removes a student from a class.
func (s *academicYearService) UnenrollStudent(ctx context.Context, classID, userID int) error {
	result := s.db.WithContext(ctx).
		Where("class_id = ? AND user_id = ?", classID, userID).
		Delete(&models.ClassEnrollment{})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return errors.New("siswa tidak terdaftar di kelas ini")
	}
	return nil
}
