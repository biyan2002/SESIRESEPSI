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
- Kalender buka setiap hari dengan status manual Available atau Full.
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
- Perapian mobile: CTA hero kini selebar layar dengan ruang aman dari tombol chat; tombol chat
  menjadi ikon ringkas di ponsel; pilihan admin terbuka sebagai bottom sheet; navbar lebih rapat
  dan dapat digeser; serta card form booking memiliki padding dan tombol lokasi yang responsif.
- Build frontend dan pemeriksaan screenshot hero, chat, serta form booking pada lebar 390 px berhasil.
- Form booking publik menggunakan kolom Nama Pasangan Pria & Wanita, label tanggal dan jam yang
  lebih natural, serta kolom link Google Maps venue.
- Link lokasi venue yang diisi client tampil sebagai tautan Buka lokasi di Google Maps pada
  dashboard admin.
- Admin dapat membuat booking historis lewat modal booking manual lengkap: data pasangan, jadwal,
  lokasi, jarak, paket, additional, pembayaran, status, catatan, dan bukti transfer opsional.
- Pengujian independen booking admin lulus 5/5 backend dan seluruh alur UI desktop/mobile;
  semua data test sudah dibersihkan.
- Admin dapat mengelola personel lewat tab Tim: tambah, edit, hapus, urutan tampil, foto, nama,
  jabatan, dan deskripsi jobdesk. Data ini langsung menjadi konten publik Tim Kami.
- Kalender memakai dua status: Available berwarna hijau dan Full berwarna merah. Status Full
  tidak dapat dikirim sebagai booking, sedangkan Available selalu dapat dipilih.
- Portfolio mendukung tipe Foto dengan unggahan banyak gambar serta galeri foto publik.
- Paket Premium memiliki transport gratis sampai 30 km; paket lain tetap gratis sampai 10 km.
- Daftar booking admin diurutkan naik berdasarkan tanggal acara lalu jam acara.
- Pengujian independen fitur tim, kapasitas kalender, portfolio foto, transport Premium, dan urutan
  booking lulus 9/9 backend serta seluruh skenario UI desktop/mobile; data test dibersihkan.
- Tanggal tanpa pengaturan admin sekarang dianggap Available. Hanya tanggal yang eksplisit diberi
  status Full atau Tutup yang menahan booking; status Tutup memakai notifikasi khusus.
- Additional kini punya kontrol minus, input jumlah, dan plus untuk client. Admin dapat menentukan
  batas maksimal kuantitas per additional dari 1 sampai 99.
- Seluruh additional lama telah dinormalkan dengan `max_quantity: 10` agar kontrak API konsisten.
- Pengujian independen status tanggal dan kuantitas additional lulus pada seluruh alur frontend;
  satu temuan data legacy backend telah diperbaiki dan diverifikasi kembali melalui API.
- Booking admin kini memiliki progres pekerjaan yang dapat diubah langsung menjadi Belum Selesai
  atau Sudah Selesai. Perubahan disimpan melalui endpoint admin yang tervalidasi.
- Build frontend, kompilasi backend, uji API perubahan status, dan screenshot dashboard mobile
  berhasil; data booking sementara sudah dibersihkan.
- Hero kini menggunakan tagline Wedding Content Creator & Photographer Jabodetabek.
- Kalender buka setiap hari tanpa status Tutup atau kuantitas slot. Booking baru tidak mengubah
  status kalender; hanya admin yang dapat menentukan Available atau Full.
- Form publik menerima username sosial media dan pilihan pop-up Instagram, TikTok, atau keduanya.
- Admin dapat mengatur transfer bank, e-wallet, dan QRIS; client memilih salah satu saat booking.
- Sistem Crew ditambahkan: admin membuat akun, mengatur penugasan per booking, dan Crew hanya
  dapat melihat job miliknya di ruang private terpisah.
- Invoice PDF unik dibuat otomatis saat booking/DP, dapat diunduh client dengan token aman maupun
  admin, dan telah diverifikasi secara visual dengan logo, warna pink, motif bunga, serta rincian.
- Portfolio mendukung Google Drive dan filter tampilan Semua, Video, serta Foto.
- Pengujian end-to-end fitur besar lulus 8/8 backend dan 7/7 UI; temuan ObjectId pada respons
  pembuatan akun Crew diperbaiki dan data test dibersihkan.
- Ruang Bookings admin kini dipisah menjadi Client Belum Selesai dan Arsip Selesai. Status selesai
  memindahkan client otomatis ke arsip; admin dapat mencari berdasarkan nama, tanggal, atau bulan.
- Booking memiliki link Google Drive hasil kerja. Setiap Crew juga dapat menyimpan link hasil Drive
  dan progres BELUM SELESAI atau SUDAH SELESAI pada job yang memang ditugaskan kepadanya.
- Link dan progres hasil Crew dipertahankan saat admin menyimpan ulang penugasan; backend melakukan
  merge aman untuk mencegah data Crew terhapus tidak sengaja.
- Logo invoice kini berada dalam bidang maroon berkontras tinggi agar jelas di atas latar pink.
- Regresi workflow booking, Drive Crew, isolasi akses Crew, archive, filter, dan invoice lulus 11/11
  tes backend; build frontend serta kompilasi backend juga berhasil.
- Booking menampilkan Crew yang bertugas beserta job, progres, dan link hasil Drive yang hanya dapat
  diperbarui melalui ruang Crew. Filter booking dapat memilih nama Crew yang ditugaskan.
- Fee tim per job adalah total booking dikurangi Rp50.000 dan tampil pada ruang Tim serta job Crew.
- Nomor WhatsApp client pada admin/Crew membuka chat WhatsApp dengan template perkenalan SESI RESEPSI.
- Job yang sudah diselesaikan dapat dihapus sendiri oleh Crew, sedangkan job belum selesai tetap aman.
- Hari kerja Senin–Jumat (di luar tanggal merah 2026) menambah Rp50.000 pada total dan invoice.
- Ruang Finance menampilkan uang masuk, nilai booking, dan jumlah booking secara keseluruhan serta
  tabel harian, mingguan, dan bulanan.
- Pengujian independen fee weekday, Crew, Drive, WhatsApp, filter Crew, finance, dan invoice lulus
  15/15; invoice weekday juga dirender dan diverifikasi visualnya sebelum data test dibersihkan.
- Perbaikan kalender Available/Full diverifikasi independen: 9/9 tes backend dan seluruh UI lulus.
- Admin booking manual memakai endpoint override sehingga dapat mencatat booking pada tanggal Full;
  booking publik tetap ditolak saat tanggal berstatus Full.
- Tombol Set semua Available pada kalender admin mereset seluruh tanggal tersimpan menjadi Available.
- Reset kalender, override admin, pemblokiran client pada Full, build frontend, dan tampilan mobile
  telah diuji; data booking sementara dibersihkan.

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