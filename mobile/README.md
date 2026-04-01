# LPK SO Mori Centre - Mobile App

Aplikasi mobile dashboard untuk siswa dan admin/pengajar di LPK SO Mori Centre. Aplikasi ini dibangun dengan menggunakan [Flutter](https://flutter.dev/).

## Fitur Utama

- **Autentikasi:** Masuk (Login) dan Daftar (Register) akun.
- **Dashboard:** Halaman utama yang memuat informasi ringkas.
- **Pengumuman:** Pembaruan dan informasi penting dari LPK yang ditampilkan secara real-time.
- **Kelas:** Informasi mengenai kelas dan jadwal belajar.
- **UI Modern:** Desain antarmuka yang bersih dan responsif menggunakan Material Design.

## Teknologi & Pustaka (Dependencies)

- **Framework:** Flutter (>=3.0.0 <4.0.0)
- **Jaringan:** `http` (Untuk komunikasi REST API ke backend)
- **Penyimpanan Lokal:** `shared_preferences` (Menyimpan sesi login atau pengaturan preferensi)
- **Tipografi & Ikon:** `google_fonts`, `cupertino_icons`
- **Format Data:** `intl` (Untuk pemformatan tanggal dsb)

## Prasyarat Lingkungan Pengembangan

Sebelum menjalankan atau mengubah kode aplikasi ini, pastikan Anda sudah menginstal alat-alat berikut:
1. [Flutter SDK](https://docs.flutter.dev/get-started/install) minimal versi 3.
2. [Android Studio](https://developer.android.com/studio) atau [Visual Studio Code](https://code.visualstudio.com/) berserta ekstensi Flutter & Dart.
3. Emulator/Simulator atau perangkat fisik (HP) yang sudah diaktifkan mode pengembangannya (_Developer mode_ & _USB Debugging_).

## Cara Menjalankan Aplikasi Secara Lokal

1. Buka terminal (Command Prompt / PowerShell / Terminal Mac/Linux).
2. Pindah ke direktori `mobile` projek ini:
   ```bash
   cd e:\lpksomori-app\mobile
   ```
3. Unduh dan instal semua dependensi yang dibutuhkan:
   ```bash
   flutter pub get
   ```
4. Jalankan aplikasi ke perangkat yang sudah terhubung:
   ```bash
   flutter run
   ```
   *(Pilih perangkat yang tampil di terminal jika diminta).*

## Struktur Direktori Utama (`lib/`)

- `lib/screens/`: Berisi file-file yang mendefinisikan tampilan UI per halaman (misal: `home_page.dart`, `login_page.dart`, `register_page.dart`).
- `lib/screens/auth/`: Tampilan spesifik untuk alur Autentikasi.
- `lib/screens/shell/`: Tampilan kerangka navigasi aplikasi (misal: `student_shell.dart`).
- `assets/images/`: Direktori penyimpanan gambar atau aset statis yang digunakan aplikasi.
