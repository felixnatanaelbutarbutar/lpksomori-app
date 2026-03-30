# 📐 Use Case Diagram — LPK SO Mori Centre

> **Sistem Manajemen Pembelajaran (LMS)** dengan 3 aktor utama:
> **👑 Super Admin**, **👨‍🏫 Guru (Teacher)**, dan **🎓 Siswa (Student)**

---

## 1. Diagram Keseluruhan (Overview)

```mermaid
flowchart LR
    ADMIN(["👑 Super Admin"])
    TEACHER(["👨‍🏫 Guru / Teacher"])
    STUDENT(["🎓 Siswa / Student"])

    subgraph SHARED["🔄 Use Case Bersama Semua Role"]
        sh1["Login"]
        sh2["Logout"]
        sh3["Edit Profil & Upload Foto"]
        sh4["Lihat Pengumuman"]
        sh5["Lihat Notifikasi"]
    end

    subgraph AT["🤝 Admin & Guru"]
        at1["Buat / Edit / Hapus Pengumuman"]
        at2["Buat & Kelola Ujian"]
        at3["Tambah & Edit Soal Ujian"]
        at4["Lihat Jawaban Siswa"]
        at5["Beri Nilai Essay / Upload"]
        at6["Rekap Nilai Kelas"]
        at7["Atur Bobot Tugas & Ujian"]
        at8["Tentukan Status Kelulusan"]
        at9["Ekspor Rekap ke CSV"]
    end

    subgraph AO["👑 Hanya Admin"]
        ao1["Manajemen Pengguna (CRUD)"]
        ao2["Manajemen Tahun Ajaran"]
        ao3["Aktifkan Tahun Ajaran"]
        ao4["Buat & Kelola Kelas"]
        ao5["Assign Guru ke Kelas"]
        ao6["Tambah / Hapus Siswa di Kelas"]
        ao7["Kirim Notifikasi"]
    end

    subgraph TO["👨‍🏫 Hanya Guru"]
        to1["Buat Tugas untuk Kelas"]
        to2["Edit / Hapus Tugas"]
        to3["Lihat Submission Siswa"]
        to4["Beri Nilai & Feedback Tugas"]
    end

    subgraph SO["🎓 Hanya Siswa"]
        so1["Lihat Info Kelas Saya"]
        so2["Lihat Daftar Tugas & Ujian"]
        so3["Kumpulkan Tugas"]
        so4["Kerjakan Ujian"]
        so5["Lihat Rekap Nilai Sendiri"]
        so6["Lihat Teman Sekelas"]
    end

    ADMIN & TEACHER & STUDENT --> SHARED
    ADMIN & TEACHER --> AT
    ADMIN --> AO
    TEACHER --> TO
    STUDENT --> SO
```

---

## 2. Use Case Detail — 👑 Super Admin

```mermaid
flowchart TD
    ADMIN(["👑 Super Admin"])

    subgraph AUTH["🔐 Autentikasi"]
        a1["Login dengan email & password"]
        a2["Logout"]
        a3["Edit nama, foto profil"]
    end

    subgraph TAHUN["📅 Tahun Ajaran"]
        b1["Lihat semua tahun ajaran"]
        b2["Tambah tahun ajaran baru"]
        b3["Aktifkan / nonaktifkan tahun ajaran"]
        b4["Hapus tahun ajaran"]
    end

    subgraph KELAS["🏫 Manajemen Kelas"]
        c1["Lihat semua kelas"]
        c2["Buat kelas baru (nama, bab, tahun)"]
        c3["Edit informasi kelas"]
        c4["Assign guru ke kelas"]
        c5["Tambah siswa ke kelas"]
        c6["Hapus siswa dari kelas"]
        c7["Lihat daftar siswa di kelas"]
    end

    subgraph USER["👥 Manajemen Pengguna"]
        d1["Lihat semua pengguna"]
        d2["Tambah akun baru (Admin/Guru/Siswa)"]
        d3["Edit data pengguna"]
        d4["Nonaktifkan akun"]
        d5["Reset password pengguna"]
    end

    subgraph PENGUMUMAN["📢 Pengumuman"]
        e1["Lihat semua pengumuman"]
        e2["Buat pengumuman (Indo + Jepang)"]
        e3["Edit pengumuman"]
        e4["Hapus pengumuman"]
    end

    subgraph UJIAN["📝 Manajemen Ujian"]
        f1["Buat ujian baru untuk kelas"]
        f2["Edit judul, deskripsi ujian"]
        f3["Atur jadwal (start time & end time)"]
        f4["Atur maksimum attempt siswa"]
        f5["Tambah soal pilihan berganda + kunci jawaban"]
        f6["Tambah soal essay"]
        f7["Tambah soal upload file"]
        f8["Edit / hapus soal yang sudah dibuat"]
        f9["Lihat daftar siswa yang sudah mengerjakan"]
        f10["Lihat jawaban lengkap siswa per soal"]
        f11["Koreksi & beri nilai soal essay / upload file"]
    end

    subgraph REKAP["📊 Rekap Nilai & Kelulusan"]
        g1["Pilih kelas untuk rekap"]
        g2["Lihat detail nilai setiap tugas per siswa"]
        g3["Lihat detail nilai setiap ujian per siswa"]
        g4["Lihat rata-rata tugas & rata-rata ujian"]
        g5["Atur bobot tugas (%) & ujian (%) — total harus 100%"]
        g6["Hitung ulang nilai akhir otomatis"]
        g7["Edit nilai akhir manual per siswa"]
        g8["Tentukan status: Lulus / Mengulang / Proses"]
        g9["Tambah catatan/feedback kelulusan per siswa"]
        g10["Simpan status ke database"]
        g11["Ekspor seluruh rekap ke file CSV"]
    end

    subgraph NOTIF["🔔 Notifikasi"]
        h1["Lihat semua notifikasi"]
        h2["Kirim notifikasi ke pengguna"]
    end

    ADMIN --> AUTH & TAHUN & KELAS & USER & PENGUMUMAN & UJIAN & REKAP & NOTIF
```

---

## 3. Use Case Detail — 👨‍🏫 Guru / Teacher

```mermaid
flowchart TD
    TEACHER(["👨‍🏫 Guru / Teacher"])

    subgraph AUTH["🔐 Autentikasi"]
        a1["Login dengan akun guru"]
        a2["Logout"]
        a3["Edit profil & foto"]
    end

    subgraph PENGUMUMAN["📢 Pengumuman"]
        b1["Lihat semua pengumuman"]
        b2["Buat pengumuman baru"]
        b3["Edit / hapus pengumuman sendiri"]
    end

    subgraph KELAS["🏫 Kelas"]
        c1["Lihat kelas yang diajar"]
        c2["Lihat daftar siswa di kelas"]
    end

    subgraph TUGAS["📋 Manajemen Tugas"]
        d1["Lihat semua tugas yang dibuat"]
        d2["Buat tugas baru untuk kelas"]
        d3["Lampirkan file ke tugas"]
        d4["Atur batas waktu (deadline) tugas"]
        d5["Edit tugas yang sudah dibuat"]
        d6["Hapus tugas"]
        d7["Lihat semua submission siswa"]
        d8["Download file jawaban siswa"]
        d9["Beri nilai (skala 0–100) per submission"]
        d10["Beri feedback teks per siswa"]
    end

    subgraph UJIAN["📝 Manajemen Ujian"]
        e1["Lihat semua ujian yang dibuat"]
        e2["Buat ujian baru untuk kelas"]
        e3["Edit judul, deskripsi, dan waktu ujian"]
        e4["Atur batas maksimum attempt"]
        e5["Tambah soal pilihan berganda dengan opsi & kunci"]
        e6["Tambah soal essay"]
        e7["Tambah soal upload file"]
        e8["Tambah soal massal (batch input)"]
        e9["Edit soal yang sudah ada"]
        e10["Hapus soal"]
        e11["Lihat siapa saja siswa yang sudah mengerjakan"]
        e12["Lihat jawaban siswa + highlight opsi MC (benar/salah)"]
        e13["Koreksi & beri nilai essay / file upload"]
    end

    subgraph REKAP["📊 Rekap Nilai & Kelulusan"]
        f1["Pilih kelas untuk rekap nilai"]
        f2["Lihat nilai tiap tugas per siswa (kolom dinamis)"]
        f3["Lihat nilai tiap ujian per siswa (kolom dinamis)"]
        f4["Lihat rata-rata tugas & ujian"]
        f5["Atur bobot tugas & ujian (wajib total 100%)"]
        f6["Hitung ulang nilai akhir berdasarkan bobot"]
        f7["Edit nilai akhir manual"]
        f8["Tentukan status kelulusan"]
        f9["Tulis catatan per siswa"]
        f10["Simpan ke database"]
        f11["Ekspor rekap ke CSV"]
    end

    subgraph NOTIF["🔔 Notifikasi"]
        g1["Lihat notifikasi masuk"]
    end

    TEACHER --> AUTH & PENGUMUMAN & KELAS & TUGAS & UJIAN & REKAP & NOTIF
```

---

## 4. Use Case Detail — 🎓 Siswa / Student

```mermaid
flowchart TD
    STUDENT(["🎓 Siswa / Student"])

    subgraph AUTH["🔐 Autentikasi"]
        a1["Login dengan akun siswa"]
        a2["Logout"]
        a3["Edit nama & upload foto profil"]
    end

    subgraph DASHBOARD["🏠 Dashboard Siswa"]
        b1["Lihat ringkasan tugas yang belum dikerjakan"]
        b2["Lihat ringkasan ujian aktif"]
        b3["Lihat pengumuman terbaru"]
        b4["Lihat statistik progress belajar"]
    end

    subgraph MYCLASS["🏫 Kelas Saya"]
        c1["Lihat info kelas (nama, bab, tahun ajaran)"]
        c2["Lihat daftar semua tugas di kelas"]
        c3["Lihat daftar semua ujian di kelas"]
        c4["Filter: tampilkan tugas/ujian belum dikerjakan"]
        c5["Filter: tampilkan tugas/ujian sudah dikerjakan"]
        c6["Ganti tampilan card (mode Grid / List)"]
        c7["Lihat nama pembuat tugas/ujian (guru/admin)"]
        c8["Lihat tanggal dibuat & deadline"]
        c9["Lihat daftar teman sekelas"]
        c10["Cari teman sekelas berdasarkan nama/NIS"]
    end

    subgraph TUGAS["📋 Tugas"]
        d1["Lihat detail tugas & instruksi guru"]
        d2["Download file lampiran dari guru"]
        d3["Tulis jawaban teks"]
        d4["Upload file jawaban"]
        d5["Submit / kumpulkan tugas"]
        d6["Lihat status pengumpulan (sudah/belum)"]
        d7["Lihat nilai yang diberikan guru"]
        d8["Lihat feedback teks dari guru"]
    end

    subgraph UJIAN["📝 Ujian"]
        e1["Lihat jadwal ujian (waktu mulai & selesai)"]
        e2["Lihat countdown timer waktu tersisa"]
        e3["Jawab soal pilihan berganda"]
        e4["Tulis jawaban soal essay"]
        e5["Upload file untuk soal upload"]
        e6["Konfirmasi & kumpulkan jawaban ujian"]
        e7["Lihat nilai otomatis setelah submit"]
        e8["Lihat total poin dan persentase skor"]
        e9["Lihat sisa attempt yang diizinkan"]
    end

    subgraph REKAP["📊 Rekap Nilai Saya"]
        f1["Lihat nilai semua tugas yang telah dikumpulkan"]
        f2["Lihat nilai semua ujian yang telah dikerjakan"]
        f3["Lihat nilai akhir yang dihitung guru"]
        f4["Lihat status kelulusan (Lulus / Mengulang / Proses)"]
        f5["Lihat catatan/feedback kelulusan dari guru"]
    end

    subgraph PENGUMUMAN["📢 Pengumuman"]
        g1["Lihat daftar semua pengumuman"]
        g2["Baca isi pengumuman (Bahasa Indonesia)"]
        g3["Baca isi pengumuman (Bahasa Jepang)"]
    end

    subgraph NOTIF["🔔 Notifikasi"]
        h1["Lihat notifikasi yang masuk"]
    end

    STUDENT --> AUTH & DASHBOARD & MYCLASS & TUGAS & UJIAN & REKAP & PENGUMUMAN & NOTIF
```

---

## 5. Tabel Hak Akses Lengkap

| Fitur / Use Case | 👑 Super Admin | 👨‍🏫 Guru | 🎓 Siswa |
|---|:---:|:---:|:---:|
| **AUTENTIKASI** | | | |
| Login / Logout | ✅ | ✅ | ✅ |
| Edit Profil & Foto | ✅ | ✅ | ✅ |
| **PENGGUNA** | | | |
| Lihat Semua Pengguna | ✅ | ❌ | ❌ |
| Tambah / Edit / Hapus Pengguna | ✅ | ❌ | ❌ |
| Nonaktifkan / Reset Password | ✅ | ❌ | ❌ |
| **TAHUN AJARAN** | | | |
| Buat & Kelola Tahun Ajaran | ✅ | ❌ | ❌ |
| Aktifkan Tahun Ajaran | ✅ | ❌ | ❌ |
| **KELAS** | | | |
| Buat & Edit Kelas | ✅ | ❌ | ❌ |
| Assign Guru ke Kelas | ✅ | ❌ | ❌ |
| Tambah / Hapus Siswa di Kelas | ✅ | ❌ | ❌ |
| Lihat Siswa di Kelas | ✅ | ✅ | ✅ (sekelas) |
| **PENGUMUMAN** | | | |
| Lihat Pengumuman | ✅ | ✅ | ✅ |
| Buat Pengumuman | ✅ | ✅ | ❌ |
| Edit / Hapus Pengumuman | ✅ | ✅ (milik sendiri) | ❌ |
| **TUGAS (ASSIGNMENT)** | | | |
| Buat Tugas | ❌ | ✅ | ❌ |
| Edit / Hapus Tugas | ❌ | ✅ | ❌ |
| Lihat Submission Siswa | ❌ | ✅ | ❌ |
| Beri Nilai & Feedback Tugas | ❌ | ✅ | ❌ |
| Kumpulkan Tugas | ❌ | ❌ | ✅ |
| Lihat Nilai Tugas Sendiri | ❌ | ❌ | ✅ |
| **UJIAN (EXAM)** | | | |
| Buat Ujian | ✅ | ✅ | ❌ |
| Edit Pengaturan Ujian | ✅ | ✅ | ❌ |
| Tambah / Edit / Hapus Soal | ✅ | ✅ | ❌ |
| Lihat Jawaban Siswa | ✅ | ✅ | ❌ |
| Beri Nilai Essay / Upload | ✅ | ✅ | ❌ |
| Kerjakan Ujian | ❌ | ❌ | ✅ |
| Lihat Hasil Ujian Sendiri | ❌ | ❌ | ✅ |
| **REKAP NILAI** | | | |
| Rekap Nilai Seluruh Kelas | ✅ | ✅ | ❌ |
| Lihat Detail Tiap Tugas & Ujian | ✅ | ✅ | ❌ |
| Atur Bobot Tugas & Ujian | ✅ | ✅ | ❌ |
| Hitung Ulang Nilai Akhir | ✅ | ✅ | ❌ |
| Tentukan Status Kelulusan | ✅ | ✅ | ❌ |
| Ekspor Rekap ke CSV | ✅ | ✅ | ❌ |
| Lihat Rekap Nilai Sendiri | ❌ | ❌ | ✅ |
| Lihat Status Kelulusan Sendiri | ❌ | ❌ | ✅ |
| **NOTIFIKASI** | | | |
| Lihat Notifikasi | ✅ | ✅ | ✅ |
| Kirim Notifikasi | ✅ | ❌ | ❌ |
| **KELAS SAYA (SISWA)** | | | |
| Lihat Info Kelas | ❌ | ❌ | ✅ |
| Lihat Daftar Tugas & Ujian | ❌ | ❌ | ✅ |
| Ganti Mode Tampilan Grid/List | ❌ | ❌ | ✅ |
| Lihat Teman Sekelas | ❌ | ❌ | ✅ |

> **Legend:** ✅ Akses Penuh &nbsp;·&nbsp; ❌ Tidak Ada Akses

---

*Dokumen dihasilkan otomatis — LPK SO Mori Centre LMS · 2026*
