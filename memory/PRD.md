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

## Backlog Prioritas

### P0

- Uji end-to-end booking, pembayaran, upload, dan dashboard admin.
- Pastikan logika jarak transport, DP, upload bukti transfer, dan kalender admin akurat.
- Buat atau verifikasi pengunggahan portofolio video serta link YouTube.

### P1

- Rapikan peringatan dependency `useEffect` pada dashboard admin.
- Poles animasi entrance dan state aktif lain agar konsisten pada seluruh halaman.

### P2

- Tambahkan portofolio dan testimoni awal untuk memperkaya tampilan publik.
- Tambahkan analitik sederhana untuk sumber booking dan konversi paket.