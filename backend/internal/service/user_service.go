package service

import (
	"context"
	"errors"
	"lpkmori-backend/internal/models"

	"gorm.io/gorm"
)

type UserService interface {
	ListUsers(ctx context.Context, role string) ([]models.User, error)
	GetUser(ctx context.Context, id int) (*models.User, error)
	UpdateUser(ctx context.Context, id int, updates map[string]interface{}) (*models.User, error)
	DeleteUser(ctx context.Context, id int) error
}

type userService struct {
	db *gorm.DB
}

func NewUserService(db *gorm.DB) UserService {
	return &userService{db: db}
}

func (s *userService) ListUsers(ctx context.Context, role string) ([]models.User, error) {
	var users []models.User
	query := s.db.WithContext(ctx).Omit("password")
	if role != "" {
		query = query.Where("role = ?", role)
	}
	if err := query.Order("created_at DESC").Find(&users).Error; err != nil {
		return nil, err
	}
	return users, nil
}

func (s *userService) GetUser(ctx context.Context, id int) (*models.User, error) {
	var user models.User
	if err := s.db.WithContext(ctx).Omit("password").First(&user, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("user not found")
		}
		return nil, err
	}
	return &user, nil
}

func (s *userService) UpdateUser(ctx context.Context, id int, updates map[string]interface{}) (*models.User, error) {
	if err := s.db.WithContext(ctx).Model(&models.User{}).Where("id = ?", id).Updates(updates).Error; err != nil {
		return nil, err
	}
	return s.GetUser(ctx, id)
}

func (s *userService) DeleteUser(ctx context.Context, id int) error {
	result := s.db.WithContext(ctx).Delete(&models.User{}, id)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return errors.New("user not found")
	}
	return nil
}
