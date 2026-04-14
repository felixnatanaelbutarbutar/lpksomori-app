package service

import (
	"log"

	"github.com/bregydoc/gtranslate"
)

type TranslationService struct{}

func NewTranslationService() *TranslationService {
	return &TranslationService{}
}

// AutoTranslate translates text from ID (Indonesian) to EN (English) and JA (Japanese)
func (s *TranslationService) AutoTranslate(text string) (string, string) {
	if text == "" {
		return "", ""
	}

	var textEn, textJa string

	// Translate to English
	translatedEn, err := gtranslate.TranslateWithParams(
		text,
		gtranslate.TranslationParams{
			From: "id",
			To:   "en",
		},
	)
	if err != nil {
		log.Printf("Warning: Auto-translate to EN failed: %v", err)
		textEn = "" // Leave empty if failed
	} else {
		textEn = translatedEn
	}

	// Translate to Japanese
	translatedJa, err := gtranslate.TranslateWithParams(
		text,
		gtranslate.TranslationParams{
			From: "id",
			To:   "ja",
		},
	)
	if err != nil {
		log.Printf("Warning: Auto-translate to JA failed: %v", err)
		textJa = "" // Leave empty if failed
	} else {
		textJa = translatedJa
	}

	return textEn, textJa
}
