package service

import (
	"bytes"
	"context"
	"fmt"
	"lpkmori-backend/internal/models"
	"os"
	"time"

	"github.com/google/uuid"
	"github.com/jung-kurt/gofpdf"
	"github.com/skip2/go-qrcode"
	"gorm.io/gorm"
)

type CertificateService struct {
	db       *gorm.DB
	baseURL  string // e.g. "http://localhost:8080"
	logoPath string // absolute path to logo PNG for watermark
}

func NewCertificateService(db *gorm.DB, baseURL string) *CertificateService {
	// Fallback path if not set via environment
	logoPath := os.Getenv("CERT_LOGO_PATH")
	if logoPath == "" {
		logoPath = "../frontend/public/logo.png"
	}

	return &CertificateService{
		db:       db,
		baseURL:  baseURL,
		logoPath: logoPath,
	}
}

// SetLogoPath allows overriding the logo path (useful in development)
func (s *CertificateService) SetLogoPath(p string) {
	s.logoPath = p
}

// GetOrCreate returns existing cert or generates a new one when status=="Passed"
func (s *CertificateService) GetOrCreate(ctx context.Context, classID, studentID, teacherID int, finalScore float64) (*models.Certificate, error) {
	var cert models.Certificate
	err := s.db.WithContext(ctx).
		Where("student_id = ? AND class_id = ?", studentID, classID).
		First(&cert).Error

	if err == gorm.ErrRecordNotFound {
		cert = models.Certificate{
			UUID:       uuid.New().String(),
			StudentID:  studentID,
			ClassID:    classID,
			FinalScore: finalScore,
			IssuedBy:   teacherID,
			IssuedAt:   time.Now(),
		}
		if err2 := s.db.WithContext(ctx).Create(&cert).Error; err2 != nil {
			return nil, err2
		}
	} else if err != nil {
		return nil, err
	}

	// Preload relations
	s.db.WithContext(ctx).
		Preload("Student").
		Preload("Class").
		Preload("Class.AcademicYear").
		Preload("Teacher").
		First(&cert, cert.ID)

	return &cert, nil
}

// GetByUUID for public validation endpoint
func (s *CertificateService) GetByUUID(ctx context.Context, uid string) (*models.Certificate, error) {
	var cert models.Certificate
	err := s.db.WithContext(ctx).
		Preload("Student").
		Preload("Class").
		Preload("Class.AcademicYear").
		Preload("Teacher").
		Where("uuid = ?", uid).
		First(&cert).Error
	if err != nil {
		return nil, err
	}
	return &cert, nil
}

// ListByStudent returns all certificates for a student
func (s *CertificateService) ListByStudent(ctx context.Context, studentID int) ([]models.Certificate, error) {
	var certs []models.Certificate
	err := s.db.WithContext(ctx).
		Preload("Student").
		Preload("Class").
		Preload("Class.AcademicYear").
		Preload("Teacher").
		Where("student_id = ?", studentID).
		Order("issued_at DESC").
		Find(&certs).Error
	return certs, err
}

// ListAll returns all certificates (admin view)
func (s *CertificateService) ListAll(ctx context.Context) ([]models.Certificate, error) {
	var certs []models.Certificate
	err := s.db.WithContext(ctx).
		Preload("Student").
		Preload("Class").
		Preload("Class.AcademicYear").
		Preload("Teacher").
		Order("issued_at DESC").
		Find(&certs).Error
	return certs, err
}

// GeneratePDF produces the professional certificate PDF bytes
func (s *CertificateService) GeneratePDF(cert *models.Certificate) ([]byte, error) {
	validationURL := fmt.Sprintf("%s/api/v1/certificates/verify/%s", s.baseURL, cert.UUID)

	// ── Generate QR Code ─────────────────────────────────────────────────────
	qrPNG, err := qrcode.Encode(validationURL, qrcode.High, 256)
	if err != nil {
		return nil, fmt.Errorf("qr encode: %w", err)
	}

	// ── Setup PDF (A4 landscape) ──────────────────────────────────────────────
	pdf := gofpdf.NewCustom(&gofpdf.InitType{
		OrientationStr: "L",
		UnitStr:        "mm",
		SizeStr:        "A4",
	})
	pdf.SetMargins(0, 0, 0)
	pdf.SetAutoPageBreak(false, 0)
	pdf.AddPage()

	pageW := 297.0
	pageH := 210.0

	// ── Deep Teal Background ──────────────────────────────────────────────────
	pdf.SetFillColor(5, 70, 70) // #054646
	pdf.Rect(0, 0, pageW, pageH, "F")

	// ── Gold Geometric Border Layers ─────────────────────────────────────────
	pdf.SetDrawColor(212, 175, 55) // gold
	pdf.SetLineWidth(3)
	pdf.Rect(8, 8, pageW-16, pageH-16, "D")

	pdf.SetLineWidth(0.5)
	pdf.Rect(12, 12, pageW-24, pageH-24, "D")

	// Corner ornaments
	drawCornerOrnament(pdf, 8, 8, 10, 10)
	drawCornerOrnament(pdf, pageW-18, 8, 10, 10)
	drawCornerOrnament(pdf, 8, pageH-18, 10, 10)
	drawCornerOrnament(pdf, pageW-18, pageH-18, 10, 10)

	// ── Top Decorative Band ───────────────────────────────────────────────────
	pdf.SetFillColor(0, 55, 55)
	pdf.Rect(12, 12, pageW-24, 14, "F")
	pdf.SetFillColor(212, 175, 55)
	pdf.Rect(12, 25.5, pageW-24, 1, "F")

	// ── Bottom Band ───────────────────────────────────────────────────────────
	// Bottom band: from pageH-26 to pageH-12 (inside the border at pageH-8)
	pdf.SetFillColor(0, 55, 55)
	pdf.Rect(12, pageH-26, pageW-24, 14, "F")
	pdf.SetFillColor(212, 175, 55)
	pdf.Rect(12, pageH-26.5, pageW-24, 1, "F")

	// ── Left Decorative Column ────────────────────────────────────────────────
	pdf.SetFillColor(0, 55, 55)
	pdf.Rect(12, 26, 22, pageH-52, "F")
	pdf.SetFillColor(212, 175, 55)
	pdf.Rect(33.5, 26, 1, pageH-52, "F")

	// ── Right Decorative Column ───────────────────────────────────────────────
	pdf.SetFillColor(0, 55, 55)
	pdf.Rect(pageW-34, 26, 22, pageH-52, "F")
	pdf.SetFillColor(212, 175, 55)
	pdf.Rect(pageW-35, 26, 1, pageH-52, "F")

	// ── Organisation Label (top band) ────────────────────────────────────────
	pdf.SetFont("Helvetica", "B", 8)
	pdf.SetTextColor(212, 175, 55)
	labelTxt := "LPK SO MORI CENTRE  -  LEMBAGA PELATIHAN KERJA"
	labelW := pdf.GetStringWidth(labelTxt)
	pdf.SetXY((pageW-labelW)/2, 14.5)
	pdf.Cell(labelW, 8, labelTxt)

	// ── Content layout constants ──────────────────────────────────────────────
	contentLeft := 38.0
	contentRight := pageW - 38.0
	contentWidth := contentRight - contentLeft
	// Safe bottom edge = pageH-26 (start of bottom band)
	// Reserve last 30mm for signature+QR: so content bottom = pageH-56

	// ── LOGO WATERMARK (centered, low opacity) ────────────────────────────────
	if s.logoPath != "" {
		if _, statErr := os.Stat(s.logoPath); statErr == nil {
			logoW := 120.0 // Larger watermark
			logoH := 66.0
			logoX := (pageW - logoW) / 2
			logoY := (pageH-logoH)/2 - 5 

			pdf.SetAlpha(0.05, "Normal") // Low opacity as requested
			logoOpt := gofpdf.ImageOptions{ImageType: "PNG", ReadDpi: false}
			pdf.ImageOptions(s.logoPath, logoX, logoY, logoW, logoH, false, logoOpt, 0, "")
			pdf.SetAlpha(1.0, "Normal")
		}
	}

	// ── Certificate Title ─────────────────────────────────────────────────────
	pdf.SetFont("Times", "B", 36)
	pdf.SetTextColor(212, 175, 55)
	title := "SERTIFIKAT KELULUSAN"
	titleW := pdf.GetStringWidth(title)
	pdf.SetXY(contentLeft+(contentWidth-titleW)/2, 36)
	pdf.Cell(titleW, 14, title)

	// Subtitle
	pdf.SetFont("Helvetica", "I", 10)
	pdf.SetTextColor(180, 220, 210)
	subtitle := "Certificate of Completion"
	subW := pdf.GetStringWidth(subtitle)
	pdf.SetXY(contentLeft+(contentWidth-subW)/2, 51)
	pdf.Cell(subW, 7, subtitle)

	// Gold divider
	drawGoldDivider(pdf, contentLeft+contentWidth*0.2, contentRight-contentWidth*0.2, 60)

	// ── Body Text ─────────────────────────────────────────────────────────────
	pdf.SetFont("Helvetica", "", 10)
	pdf.SetTextColor(200, 235, 225)
	intro := "Dengan bangga menyatakan bahwa"
	introW := pdf.GetStringWidth(intro)
	pdf.SetXY(contentLeft+(contentWidth-introW)/2, 65)
	pdf.Cell(introW, 7, intro)

	// Student Name - BIG
	pdf.SetFont("Times", "BI", 30)
	pdf.SetTextColor(255, 245, 180)
	studentName := cert.Student.Name
	nameW := pdf.GetStringWidth(studentName)
	pdf.SetXY(contentLeft+(contentWidth-nameW)/2, 74)
	pdf.Cell(nameW, 14, studentName)

	// NIS
	pdf.SetFont("Helvetica", "", 9)
	pdf.SetTextColor(160, 210, 195)
	nisTxt := fmt.Sprintf("NIS: %s", cert.Student.NIS)
	nisW := pdf.GetStringWidth(nisTxt)
	pdf.SetXY(contentLeft+(contentWidth-nisW)/2, 89)
	pdf.Cell(nisW, 6, nisTxt)

	// Gold divider small
	drawGoldDivider(pdf, contentLeft+contentWidth*0.35, contentRight-contentWidth*0.35, 97)

	// Completion message
	pdf.SetFont("Helvetica", "", 10)
	pdf.SetTextColor(200, 235, 225)
	msg1 := "telah berhasil menyelesaikan program pembelajaran dan dinyatakan"
	msg1W := pdf.GetStringWidth(msg1)
	pdf.SetXY(contentLeft+(contentWidth-msg1W)/2, 101)
	pdf.Cell(msg1W, 7, msg1)

	// LULUS text — avoid Kanji (font doesn't support it), use ASCII alternative
	pdf.SetFont("Helvetica", "B", 13)
	pdf.SetTextColor(92, 210, 160)
	passTxt := "LULUS  /  GOUUKAKU  /  PASSED"
	passW := pdf.GetStringWidth(passTxt)
	pdf.SetXY(contentLeft+(contentWidth-passW)/2, 109)
	pdf.Cell(passW, 8, passTxt)

	// Class info
	pdf.SetFont("Helvetica", "", 10)
	pdf.SetTextColor(200, 235, 225)
	className := cert.Class.Name
	yr := ""
	if cert.Class.AcademicYear.ID != 0 {
		yr = cert.Class.AcademicYear.YearRange
	}
	classLine := fmt.Sprintf("Kelas: %s   -   Tahun Ajaran: %s", className, yr)
	classW := pdf.GetStringWidth(classLine)
	pdf.SetXY(contentLeft+(contentWidth-classW)/2, 119)
	pdf.Cell(classW, 7, classLine)

	// Score badge
	scoreLabel := fmt.Sprintf("Nilai Akhir: %.1f", cert.FinalScore)
	scoreLabelW := pdf.GetStringWidth(scoreLabel) + 14
	scoreBoxX := contentLeft + (contentWidth-scoreLabelW)/2
	pdf.SetFillColor(0, 110, 100)
	pdf.RoundedRect(scoreBoxX, 128, scoreLabelW, 10, 3, "1234", "F")
	pdf.SetDrawColor(92, 210, 160)
	pdf.SetLineWidth(0.5)
	pdf.RoundedRect(scoreBoxX, 128, scoreLabelW, 10, 3, "1234", "D")
	pdf.SetFont("Helvetica", "B", 9)
	pdf.SetTextColor(92, 210, 160)
	pdf.SetXY(scoreBoxX+7, 129)
	pdf.Cell(scoreLabelW-14, 8, scoreLabel)

	// Issue date
	pdf.SetFont("Helvetica", "", 8)
	pdf.SetTextColor(140, 190, 175)
	issuedDate := cert.IssuedAt.Format("02 January 2006")
	dateTxt := fmt.Sprintf("Dikeluarkan pada: %s", issuedDate)
	dateW := pdf.GetStringWidth(dateTxt)
	pdf.SetXY(contentLeft+(contentWidth-dateW)/2, 141)
	pdf.Cell(dateW, 6, dateTxt)

	// ─────────────────────────────────────────────────────────────────────────
	// BOTTOM SECTION: must fit between y=150 and y=pageH-26 (the bottom band)
	// That gives us 210-26 = 184mm as the bottom boundary.
	// ─────────────────────────────────────────────────────────────────────────

	// ── Teacher Signature Area (left side of bottom section) ──────────────────
	sigX := contentLeft + 15
	sigY := 142.0 // Moved UP significantly to avoid border

	pdf.SetDrawColor(212, 175, 55)
	pdf.SetLineWidth(0.4)
	pdf.Line(sigX, sigY, sigX+70, sigY)

	pdf.SetFont("Helvetica", "B", 9)
	pdf.SetTextColor(212, 175, 55)
	pdf.SetXY(sigX, sigY+3)
	pdf.Cell(70, 5, cert.Teacher.Name)

	pdf.SetFont("Helvetica", "", 7.5)
	pdf.SetTextColor(160, 210, 195)
	pdf.SetXY(sigX, sigY+9)
	pdf.Cell(70, 5, "Guru Pengajar / Instructor")

	// Cert number (centered, inside bottom band)
	pdf.SetFont("Helvetica", "", 7)
	pdf.SetTextColor(212, 175, 55)
	certNo := fmt.Sprintf("No. CERT-%04d/%s", cert.ID, cert.IssuedAt.Format("2006"))
	certNoW := pdf.GetStringWidth(certNo)
	pdf.SetXY((pageW-certNoW)/2, pageH-21)
	pdf.Cell(certNoW, 5, certNo)

	// UUID validation text (below cert number, still inside bottom band area)
	pdf.SetFont("Helvetica", "", 6)
	pdf.SetTextColor(120, 170, 155)
	uuidLabel := fmt.Sprintf("ID Verifikasi: %s", cert.UUID)
	uuidW := pdf.GetStringWidth(uuidLabel)
	pdf.SetXY((pageW-uuidW)/2, pageH-16)
	pdf.Cell(uuidW, 5, uuidLabel)

	// ── QR Code (right side of bottom section, fully above bottom band) ───────
	qrSize := 28.0
	qrX := contentRight - qrSize - 15
	qrY := 142.0 // Moved UP to align with signature

	// White padding box for QR
	pdf.SetFillColor(255, 255, 255)
	pdf.Rect(qrX-1.5, qrY-1.5, qrSize+3, qrSize+3, "F")

	// QR image
	opt := gofpdf.ImageOptions{ImageType: "PNG", ReadDpi: true}
	pdf.RegisterImageOptionsReader("qr_cert", opt, bytes.NewReader(qrPNG))
	pdf.ImageOptions("qr_cert", qrX, qrY, qrSize, qrSize, false, opt, 0, validationURL)

	// QR label (positioned carefully)
	pdf.SetFont("Helvetica", "", 6)
	pdf.SetTextColor(160, 210, 195)
	qrLabel := "Scan untuk validasi"
	qrLabelW := pdf.GetStringWidth(qrLabel)
	pdf.SetXY(qrX+(qrSize-qrLabelW)/2, qrY+qrSize+2)
	pdf.Cell(qrLabelW, 4, qrLabel)

	// ── Export ────────────────────────────────────────────────────────────────
	var buf bytes.Buffer
	if err := pdf.Output(&buf); err != nil {
		return nil, fmt.Errorf("pdf output: %w", err)
	}
	return buf.Bytes(), nil
}

// drawCornerOrnament draws a small decorative filled square at corners
func drawCornerOrnament(pdf *gofpdf.Fpdf, x, y, w, h float64) {
	pdf.SetFillColor(212, 175, 55)
	pdf.Rect(x, y, w, h, "F")
}

// drawGoldDivider draws a centered decorative horizontal line with diamonds
func drawGoldDivider(pdf *gofpdf.Fpdf, x1, x2, y float64) {
	pdf.SetDrawColor(212, 175, 55)
	pdf.SetLineWidth(0.4)
	midX := (x1 + x2) / 2
	pdf.Line(x1, y, midX-6, y)
	pdf.Line(midX+6, y, x2, y)
	// Diamond
	dw := 5.0
	dh := 3.0
	drawDiamond(pdf, midX, y, dw, dh)
}

// drawDiamond draws a small diamond shape centered at cx,cy
func drawDiamond(pdf *gofpdf.Fpdf, cx, cy, w, h float64) {
	pdf.SetFillColor(212, 175, 55)
	points := []gofpdf.PointType{
		{X: cx, Y: cy - h/2},
		{X: cx + w/2, Y: cy},
		{X: cx, Y: cy + h/2},
		{X: cx - w/2, Y: cy},
	}
	drawPolygon(pdf, points)
}

// drawPolygon fills a polygon given a slice of points
func drawPolygon(pdf *gofpdf.Fpdf, pts []gofpdf.PointType) {
	if len(pts) < 3 {
		return
	}
	pdf.MoveTo(pts[0].X, pts[0].Y)
	for _, p := range pts[1:] {
		pdf.LineTo(p.X, p.Y)
	}
	pdf.ClosePath()
	pdf.DrawPath("F")
}
