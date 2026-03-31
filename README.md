# LPK SO Mori Centre — Platform Manajemen Akademik

<div align="center">

![LPK SO Mori Centre](./frontend/public/logo.png)

**Platform manajemen akademik bilingual (🇮🇩 Indonesia · 🇯🇵 Jepang) untuk Lembaga Pelatihan Kerja SO Mori Centre**

[![Go](https://img.shields.io/badge/Backend-Go%201.24-00ADD8?logo=go)](https://go.dev)
[![Next.js](https://img.shields.io/badge/Frontend-Next.js%2016-000000?logo=next.js)](https://nextjs.org)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL%2016-4169E1?logo=postgresql)](https://www.postgresql.org)
[![Docker](https://img.shields.io/badge/Deploy-Docker%20Compose-2496ED?logo=docker)](https://docs.docker.com/compose)

</div>

---

## 📑 Daftar Isi

- [Tentang Proyek](#-tentang-proyek)
- [Fitur](#-fitur)
- [Arsitektur](#-arsitektur)
- [Struktur Proyek](#-struktur-proyek)
- [Cara Menjalankan](#-cara-menjalankan)
  - [Menggunakan Docker (Recommended)](#1-menggunakan-docker-recommended)
  - [Tanpa Docker (Development)](#2-tanpa-docker-development)
- [Akun Default](#-akun-default)
- [Variabel Lingkungan](#-variabel-lingkungan)
- [API Reference](#-api-reference)
- [Skema Database](#-skema-database)
- [Role & Hak Akses](#-role--hak-akses)
- [Teknologi](#-teknologi)

---

## 📖 Tentang Proyek

LPK SO Mori Centre adalah platform web akademik yang dibangun khusus untuk mengelola kegiatan belajar mengajar di lembaga pelatihan kerja. Platform ini mendukung tiga peran pengguna dengan hak akses berbeda-beda dan mendukung dua bahasa — Indonesia dan Jepang.

---

## ✨ Fitur

### 👑 Super Admin
- Manajemen akun pengguna (guru & siswa) — CRUD lengkap
- Manajemen Tahun Ajaran (aktifkan / nonaktifkan; **hanya satu yang bisa aktif**)
- Manajemen Kelas — edit nama, tambah/hapus kelas
- Assign siswa ke kelas (sistem enrollment, many-to-many)
- Melihat semua laporan

### 👨‍🏫 Guru (先生)
- Melihat kelas yang diajarkan
- Menambahkan Mata Pelajaran ke kelas (teacher_id otomatis terisi dari akun yang login)
- Edit dan hapus mata pelajaran milik sendiri
- Melihat laporan kelas sendiri

### 👨‍🎓 Siswa (学生)
- Melihat pelajaran yang diikuti
- Melihat hasil ujian sendiri

### Umum
- 🔐 Autentikasi JWT
- 🌐 Bilingual: Bahasa Indonesia & Bahasa Jepang (dapat diganti kapan saja)
- 🎨 UI modern (akademik premium, glassmorphism, dark sidebar)
- 📱 Responsive design

---

## 🏗️ Arsitektur

```
Browser (Next.js :3000)
        │
        ▼
REST API (Go / Gin :8080)
        │
        ▼
PostgreSQL (:5432)
```

Semua service berjalan di dalam Docker network `lpkmori_net` yang terisolasi.

```
lpksomori-app/
├── docker-compose.yml          ← Orkestrasi semua service
├── backend/                    ← Go REST API
│   ├── cmd/api/main.go         ← Entry point, semua route API
│   ├── internal/
│   │   ├── middleware/         ← JWT Auth + RequireRole middleware
│   │   ├── models/             ← GORM models (semua tabel)
│   │   └── service/            ← Business logic per domain
│   └── migrations/
│       └── 001_init_schema.sql ← Skema SQL awal
└── frontend/                   ← Next.js 16 App Router
    └── src/
        ├── app/
        │   ├── login/          ← Halaman login
        │   └── dashboard/      ← Dashboard per halaman
        │       ├── layout.tsx  ← Sidebar dinamis berdasarkan role
        │       ├── page.tsx    ← Beranda dashboard
        │       ├── users/      ← Manajemen pengguna (Admin)
        │       ├── academic/   ← Manajemen tahun ajaran (Admin)
        │       ├── classes/    ← Manajemen kelas + enrollment siswa
        │       └── courses/    ← Mata pelajaran per kelas (Guru)
        ├── lib/
        │   └── roleHelper.ts   ← Sistem permission berbasis role
        └── i18n/               ← File terjemahan ID / JA / EN
```

---

## 🚀 Cara Menjalankan

### Prasyarat

| Tool | Versi Minimum |
|------|--------------|
| [Docker Desktop](https://www.docker.com/products/docker-desktop) | 24+ |
| [Docker Compose](https://docs.docker.com/compose/install/) | v2 (sudah included di Docker Desktop) |
| Git | any |

> **Catatan:** Untuk development tanpa Docker, tambahkan Go 1.24+, Node.js 20+, dan PostgreSQL 16+.

---

### 1. Menggunakan Docker (Recommended)

#### Langkah 1 — Clone repo

```bash
git clone <repository-url> lpksomori-app
cd lpksomori-app
```

#### Langkah 2 — Build dan jalankan semua service

```bash
docker compose up --build -d
```

> ⏳ Build pertama membutuhkan waktu ±3-5 menit (download image, compile Go, build Next.js).
> Build selanjutnya jauh lebih cepat karena layer Docker sudah di-cache.

#### Langkah 3 — Verifikasi semua container berjalan

```bash
docker compose ps
```

Output yang diharapkan:
```
NAME                STATUS          PORTS
lpkmori_postgres    Up (healthy)    0.0.0.0:5432->5432/tcp
lpkmori_backend     Up              0.0.0.0:8080->8080/tcp
lpkmori_frontend    Up              0.0.0.0:3000->3000/tcp
```

#### Langkah 4 — Buka di browser

| Service | URL |
|---------|-----|
| **Aplikasi Web** | http://localhost:3000 |
| **Backend API** | http://localhost:8080/api/v1/ping |

#### Menghentikan aplikasi

```bash
# Hentikan tanpa menghapus data
docker compose down

# Hentikan dan hapus semua data (database akan reset)
docker compose down -v
```

#### Melihat log

```bash
# Semua service
docker compose logs -f

# Hanya backend
docker compose logs -f backend

# Hanya frontend
docker compose logs -f frontend
```

---

### 2. Tanpa Docker (Development)

#### Backend (Go)

```bash
cd backend

# Install dependencies
go mod download

# Set environment variables
$env:DB_HOST     = "localhost"
$env:DB_PORT     = "5432"
$env:DB_USER     = "lpkmori"
$env:DB_PASSWORD = "lpkmori_secret"
$env:DB_NAME     = "lpkmori_db"
$env:JWT_SECRET  = "dev_secret_key"
$env:PORT        = "8080"
$env:GIN_MODE    = "debug"

# Jalankan
go run ./cmd/api
```

#### Frontend (Next.js)

```bash
cd frontend

# Install dependencies
npm install

# Set environment
echo "NEXT_PUBLIC_API_URL=http://localhost:8080" > .env.local

# Development server (hot reload)
npm run dev
```

Frontend akan berjalan di http://localhost:3000

---

## 🔑 Akun Default

Akun super admin dibuat otomatis saat pertama kali server dinyalakan:

| Field | Value |
|-------|-------|
| **Email** | `admin@lpkmori.co.id` |
| **Password** | `password123` |
| **Role** | Super Admin |

> ⚠️ **Penting:** Ganti password default di environment production!

---

## ⚙️ Variabel Lingkungan

### Backend

| Variabel | Default | Keterangan |
|----------|---------|------------|
| `DB_HOST` | `postgres` | Host PostgreSQL |
| `DB_PORT` | `5432` | Port PostgreSQL |
| `DB_USER` | `lpkmori` | Username database |
| `DB_PASSWORD` | `lpkmori_secret` | Password database |
| `DB_NAME` | `lpkmori_db` | Nama database |
| `JWT_SECRET` | `super_secret_jwt_key_change_in_production` | **Wajib diganti di production!** |
| `PORT` | `8080` | Port server |
| `GIN_MODE` | `release` | `debug` atau `release` |

### Frontend

| Variabel | Default | Keterangan |
|----------|---------|------------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8080` | URL backend API |

---

## 📡 API Reference

### Base URL
```
http://localhost:8080/api/v1
```

### Auth & Pengguna
| Method | Endpoint | Auth | Keterangan |
|--------|----------|------|------------|
| `POST` | `/auth/login` | — | Login, returns JWT token |
| `POST` | `/auth/register` | — | Buat akun baru dengan atribut *Profile Lengkap* (Tanggal Lahir, TTL, dsb) |
| `GET`  | `/users?role=…` | ✅ Admin | Daftar pengguna (filter opsional) |
| `GET`  | `/users/birthdays-today` | ✅ All | Mendapatkan daftar pengguna yang berulang tahun pada hari ini |
| `GET`  | `/users/:id` | ✅ All | Detail pengguna |
| `PATCH`| `/users/:id` | ✅ Admin | Update pengguna (termasuk update identitas TTL & Biodata) |
| `DELETE` | `/users/:id` | ✅ Admin | Hapus pengguna |
| `POST` | `/users/:id/photo` | ✅ All | Mengubah/upload foto profil |
| `PATCH`| `/users/:id/password` | ✅ Admin | Reset password pengguna oleh Admin |

### Tahun Ajaran & Kelas
| Method | Endpoint | Auth | Keterangan |
|--------|----------|------|------------|
| `GET`  | `/academic-years`, `/active` | ✅ All | Daftar semua / aktif tahun ajaran |
| `POST`, `PATCH`, `DELETE` | `/academic-years…` | ✅ Admin| Manajemen tahun ajaran |
| `GET`  | `/classes?academic_year_id=…` | ✅ All | Daftar kelas |
| `POST`, `PATCH`, `DELETE` | `/classes`, `/classes/:id` | ✅ Admin| CRUD Kelas |
| `GET`  | `/classes/:id/enrollments` | ✅ All | Daftar siswa di kelas |
| `POST` | `/classes/:id/enrollments` | ✅ Admin | Daftarkan siswa ke kelas |
| `DELETE` | `/classes/:id/enrollments/:user_id`| ✅ Admin | Hapus siswa dari kelas |
| `GET`  | `/classes/:id/recap` | 🔒 Teacher| Melihat Rekap Nilai Siswa (Daftar Kelas & Siswa) |
| `POST` | `/classes/:id/recap/:student_id` | 🔒 Teacher| Menyimpan atau edit Rekap Evaluasi/Nilai Akhir Siswa |

### Mata Pelajaran (Courses) & Tugas (Assignments)
| Method | Endpoint | Auth | Keterangan |
|--------|----------|------|------------|
| `GET`  | `/courses?class_id=X` | ✅ All | Daftar pelajaran |
| `POST`, `PATCH`, `DELETE` | `/courses…` | 🔒 Teacher | Manajemen pelajaran (hanya pembuat) |
| `GET`  | `/assignments?class_id=X` | ✅ All | Daftar tugas |
| `POST`, `PATCH`, `DELETE` | `/assignments` | 🔒 Teacher | Manajemen tugas dengan *file upload* |
| `POST` | `/assignments/:id/submissions` | 🎓 Student | Siswa mensubmit tugas |
| `GET`  | `/assignments/submissions/my` | 🎓 Student | Melihat semua tugas yang di-*submit* oleh siswa yang login |
| `PATCH`| `/assignments/submissions/:id/grade`| 🔒 Teacher | Memberikan nilai (grade) kepada submission siswa |

### Manajemen Ujian (Exams) & Bank Soal
| Method | Endpoint | Auth | Keterangan |
|--------|----------|------|------------|
| `GET`, `POST`, `PATCH`, `DELETE` | `/question-banks…` | 🔒 Teacher/Admin | CRUD Koleksi/Paket Soal di Bank Soal |
| `POST` | `/question-banks/:id/questions` | 🔒 Teacher | Tambah *question* (soal-soal) langsung ke paket Bank Soal |
| `POST` | `/question-banks/:id/import-to-exam/:exam_id` | 🔒 Teacher | Import semua soal dari Bank Soal ke dalam Ujian Tertentu |
| `GET`, `POST`, `PATCH`, `DELETE` | `/exams` | 🔒 Teacher | CRUD Manajemen Ujian |
| `GET`, `POST`, `DELETE` | `/exams/:id/questions…` | 🔒 Teacher | Tambah/Lihat/Hapus soal dan Opsi di dalam Ujian |
| `GET`  | `/exams/:id/start` | 🎓 Student | Siswa memulai ujian (Timer berjalan di frontend) |
| `POST` | `/exams/:id/submit` | 🎓 Student | Siswa mengirimkan jawaban ujian (Auto-grading) |
| `GET`  | `/exams/:id/student-attempts` | 🔒 Teacher | Guru melihat hasil ujian dan riwayat peserta yang sudah mengerjakan |

### Pengumuman & Pengaturan
| Method | Endpoint | Auth | Keterangan |
|--------|----------|------|------------|
| `GET` | `/announcements` | ✅ All | Lihat pengumuman |
| `POST`, `PATCH`, `DELETE` | `/announcements` | ✅ Admin | Manajemen pengumuman |
| `GET` | `/dashboard/stats` | ✅ All | Statistik dashboard (*Top Achiever*, Distribusi Kelas) |
| `GET` | `/dashboard/student-stats` | 🎓 Student | Data progress belajar dashboard (*Assignments Pending*, Kelulusan) |

---

## 🗄️ Skema Database (Versi Lanjutan)

Berikut adalah struktur entitas utama setelah semua fitur yang ada dikembangkan:

```text
users
├── id (PK, IDENTITY)
├── name, email (unique), password (bcrypt), role (admin|teacher|student)
├── nis, photo, active
└── place_of_birth, date_of_birth, gender, phone, address (Profile Lengkap)

academic_years
├── id (PK, IDENTITY)
├── year_range (e.g. "2025/2026")
└── is_active (hanya satu yang true)

classes & class_enrollments
├── classes: id, academic_year_id, name, level, teacher_id
└── class_enrollments (Many-to-Many): class_id ↔ user_id

courses & assignments & submissions
├── courses: id, class_id, teacher_id, name
├── assignments: id, class_id, teacher_id, title, description, file_url, due_date
└── assignment_submissions: id, assignment_id, student_id, file_url, score, graded_at

question_banks (Bank Soal) & question_bank_items
├── question_banks: id, title, description, teacher_id
└── question_bank_items: id, bank_id, text, options (JSONB), correct_option_index

exams (Ujian) & exam_questions
├── exams: id, class_id, teacher_id, title, description, duration_minutes, is_active
└── exam_questions: id, exam_id, text, options (JSONB), correct_option_index

exam_attempts (Percobaan Ujian Siswa)
├── id, exam_id, student_id, start_time, end_time
└── score, answers (JSONB)

student_recaps (Rekapitulasi Nilai Evaluasi Tahunan)
├── id (PK, IDENTITY)
├── class_id, student_id (Unique per kelas)
├── status (Lulus / Tidak Lulus)
└── final_score, notes, teacher_id, created_at

announcements
├── id, title, content (HTML Rich Text), author_id, created_at
```

---

## 🔒 Role & Hak Akses

Tabel berikut dirangkum berdasarkan middleware API dan UI Permission Dashboard:

| Fitur Utama Sistem | Admin | Guru (先生) | Siswa (学生) |
|-------|:-----:|:----:|:-----:|
| **Dashboard Terpusat** & Notif Ulang Tahun | ✅ | ✅ | ✅ (UI khusus siswa) |
| **Manajemen Pengguna** (Tambah data lengkap) | ✅ | ❌ | ❌ |
| **Tahun Ajaran & Kelas** | ✅ | ✅ (Melihat) | ✅ (Melihat) |
| **Pelajaran Saya** | ✅ | ✅ | ✅ |
| **Tugas & Submission** (Nilai/Buat) | ❌ | ✅ | ✅ (Kumpul) |
| **Manajemen Bank Soal** (Import) | ✅ | ✅ | ❌ |
| **Pembuatan Ujian & Kuis** | ✅ | ✅ | ❌ |
| **Mengerjakan Ujian** (Auto-grading) | ❌ | ❌ | ✅ |
| **Rekap Nilai Siswa** (Grade Recap) | ❌ | ✅ | ❌ |
| **Pengumuman / Mading Elektronik** | ✅ | ❌ | ❌ |
| **Pengaturan Situs** | ✅ | ❌ | ❌ |

---

## 🛠️ Teknologi

### Backend
| Teknologi | Versi | Kegunaan |
|-----------|-------|----------|
| Go | 1.24 | Bahasa pemrograman utama |
| Gin | v1.9 | HTTP web framework |
| GORM | v2 | ORM untuk PostgreSQL |
| golang-jwt/jwt | v5 | JWT authentication |
| bcrypt | — | Password hashing |

### Frontend
| Teknologi | Versi | Kegunaan |
|-----------|-------|----------|
| Next.js | 16 | React framework (App Router) |
| TypeScript | 5 | Type safety |
| Tailwind CSS | 3 | Styling utility |
| i18next | — | Internasionalisasi (ID/JA) |
| Lucide React | — | Icon set |

### Infrastructure
| Teknologi | Kegunaan |
|-----------|----------|
| PostgreSQL 16 | Database utama |
| Docker + Docker Compose | Containerization & orkestrasi |

---

## 🐛 Troubleshooting

### Container tidak mau start

```bash
# Cek status dan log error
docker compose ps
docker compose logs backend
docker compose logs postgres
```

### Database tidak ditemukan

```bash
# Reset database (hapus volume)
docker compose down -v
docker compose up --build -d

### Port sudah dipakai

Edit `docker-compose.yml`, ubah port di bagian `ports:`:
```yaml
ports:
  - "3001:3000"   # Frontend di port 3001
  - "8081:8080"   # Backend di port 8081
```

### Login gagal setelah reset database

Akun admin dibuat otomatis saat backend pertama kali start. Tunggu beberapa detik setelah container backend berjalan, lalu coba login kembali.

docker compose up --build -d
---

## 📄 Lisensi

Proyek ini dikembangkan untuk keperluan internal LPK SO Mori Centre.

---

<div align="center">
  <p>Dibuat dengan ❤️ untuk LPK SO Mori Centre</p>
  <p><em>「学ぶことは一生の宝である」— Belajar adalah harta seumur hidup</em></p>
</div>

