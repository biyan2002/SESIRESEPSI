# SESI RESEPSI

## Ringkasan Produk

Website full-stack untuk SESI RESEPSI, bisnis wedding content creator di Jakarta - Bekasi.
Gaya visualnya romantis, modern, Gen-Z, dengan warna pink lembut, elemen bunga bergerak,
dan permukaan glassmorphism.

## Pengguna

- Calon pengantin yang ingin melihat layanan, ketersediaan tanggal, dan membuat booking.
- Admin Biyan dan Asty yang mengelola booking, harga, portofolio, serta kalender.

## Kebutuhan Utama

- Hero, marquee, paket, profil tim, kalender ketersediaan, formulir booking, dan testimoni.
- Portofolio video yang dapat dikelola melalui dashboard admin.
- Booking dengan paket, additional, perhitungan transport, pilihan DP atau lunas, dan bukti transfer.
- Kalender untuk Sabtu, Minggu, dan hari libur nasional dengan maksimal dua slot per hari.
- Dashboard admin terlindungi untuk mengelola konten dan pesanan.

## Arsitektur

- Frontend: React, Tailwind CSS, Framer Motion, React Router.
- Backend: FastAPI dan MongoDB melalui Motor.
- API frontend memakai `REACT_APP_BACKEND_URL`.
- Backend memakai `MONGO_URL` dan `DB_NAME` dari `backend/.env`.

## Status Implementasi

### Selesai

- Halaman utama, portofolio, login admin, dan dashboard admin telah dibuat.
- Endpoint dasar auth, paket, additional, pengaturan, booking, upload, dan kalender tersedia.
- Kredensial uji admin tersimpan di `memory/test_credentials.md`.
- Foto hero diganti memakai Foto 1: `frontend/public/assets/hero-biyan-asty.webp`.
- Foto owner Fikabi Sa'di Martyasyah diganti memakai Foto 2:
  `frontend/public/assets/fikabi-portrait.png`.
- Navbar glass interaktif dan dapat digeser dibuat di
  `frontend/src/components/GlassNavigation.jsx`.
- Navbar menautkan Beranda, Paket, Tim Kami, Tanggal, Booking, Cerita, dan Portfolio.

### Verifikasi Terakhir — 27 Agustus 2026

- `yarn build` berhasil.
- Uji screenshot desktop dan mobile berhasil memuat halaman utama dan navbar.
- Navigasi halus ke bagian Tim Kami berhasil; foto owner baru tampil.
- Ada peringatan ESLint lama di `AdminDashboard.jsx` tentang dependency `useEffect`.
- Health check deployment berhasil tanpa temuan blocker untuk React, FastAPI, MongoDB, dan Supervisor.
- Konfigurasi environment, routing `/api`, seeding MongoDB, serta kompilasi dinyatakan siap rilis.
- Perbaikan login admin: email owner `fikabisadimartyansyah@gmail.com` kini menjadi alias
  login untuk akun Biyan dan input menerima username atau email.
- Pengujian independen auth (13 backend test dan alur Playwright desktop/mobile) lulus 100%.
- Browser menggunakan favicon logo di `frontend/public/favicon.jpg` dan judul tab `SESI RESEPSI`.
- Perhitungan jarak otomatis dihapus agar tidak menghasilkan anomali koordinat pada perangkat mobile.
- Form booking menautkan base SESI RESEPSI di Google Maps dan meminta calon client memasukkan
  jarak rute secara manual. Radius hingga 10 km gratis; sisanya Rp5.000 per km.
- Validasi frontend menolak jarak negatif, sedangkan backend membatasi jarak 0–1000 km dan
  menghitung ulang biaya transport serta total untuk mencegah manipulasi nilai.
- Tombol Instagram dan TikTok SESI RESEPSI tersedia di footer.
- Pengujian independen jarak manual, favicon, dan sosial: 16/16 backend serta 22/22 UI lulus.

## Backlog Prioritas

### P0

- Uji end-to-end booking, pembayaran, upload, dan dashboard admin.
- Pastikan logika jarak transport, DP, upload bukti transfer, dan kalender admin akurat.
- Buat atau verifikasi pengunggahan portofolio video serta link YouTube.

### P1

- Rapikan peringatan dependency `useEffect` pada dashboard admin.
- Poles animasi entrance dan state aktif lain agar konsisten pada seluruh halaman.
- Tambahkan validasi server untuk nominal pembayaran lunas agar tidak dapat dimodifikasi klien.

### P2

- Tambahkan portofolio dan testimoni awal untuk memperkaya tampilan publik.
- Tambahkan analitik sederhana untuk sumber booking dan konversi paket.