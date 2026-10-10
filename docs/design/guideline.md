# Tarékah — Design Guideline

## 1. Esensi brand

**Tarékah** (Sunda): ikhtiar, usaha sungguh-sungguh. Aplikasi untuk mencatat
perjalanan mencari kerja: setiap lamaran adalah satu _léngkah_.

Rasa yang dituju: **tenang, hangat, tekun.** Seperti buku catatan pribadi
yang rapi di meja kayu, bukan dashboard korporat yang dingin. Job hunting
itu melelahkan; aplikasi ini harus terasa menemani, bukan menghakimi.

Kata kunci: kertas, nila, kunyit, mega mendung, langkah, ikhtiar.
Hindari: tampilan SaaS generik, gradien ungu-biru, glassmorphism, emoji,
nada motivasi berlebihan.

## 2. Warna

Terinspirasi pewarna alam Nusantara: nila (indigo), kunyit (turmeric),
dan kertas.

| Token               | Light   | Dark    | Fungsi                                    |
| ------------------- | ------- | ------- | ----------------------------------------- |
| kertas (background) | #FAF7F0 | #14131F | Latar halaman, hangat, bukan putih murni  |
| permukaan (surface) | #FFFFFF | #1D1C2B | Kartu, panel                              |
| permukaan-2         | #F3EEE3 | #25233A | Kolom kanban, area sekunder               |
| tinta (text)        | #1C1A17 | #EDEAE3 | Teks utama                                |
| tinta-redup         | #6B665C | #A29E95 | Teks sekunder                             |
| garis (border)      | #E7E1D5 | #2F2D44 | Hairline                                  |
| nila (primary)      | #4A43B0 | #8F88E6 | Aksi utama, brand, item aktif             |
| nila-tua            | #2E2A75 | #C9C5F5 | Teks di atas nila muda, hover             |
| nila-muda           | #ECEAF8 | #2A2750 | Latar item aktif, highlight               |
| kunyit (aksen)      | #E0A021 | #F0B848 | HANYA untuk perhatian: follow-up, tenggat |
| kunyit-muda         | #FBF0D6 | #3A2F14 | Latar banner follow-up                    |
| daun (sukses)       | #3F7D4E | #7DBE8C | Offer                                     |
| terakota (bahaya)   | #B5532F | #E08A68 | Rejected, hapus                           |

Aturan:

- Maksimal satu tombol nila solid per layar.
- Kunyit adalah "lonceng". Kalau dipakai untuk dekorasi, ia kehilangan makna.
  Di dalam aplikasi ia hanya berarti "ini butuh kamu".
- Satu pengecualian: tanda tangan brand. Di sana kunyit adalah goresan naik
  (logo, aksen é) dan prada, emas pada batik (awan landing saat disentuh).
  Tidak ada tempat lain.
- Latar selalu kertas, bukan putih. Kartu putih di atas kertas = kedalaman
  tanpa shadow berat.

### Warna status (dipakai di board, tabel, detail, dan chart)

| Status         | Warna                    | Makna                 |
| -------------- | ------------------------ | --------------------- |
| Wishlist       | tinta-redup (abu hangat) | Belum melangkah       |
| Applied        | biru batu #4F79A8        | Sudah dikirim         |
| Screening      | teal #2F8A7E             | Ada respons           |
| Technical test | kunyit                   | Butuh kerja dari kamu |
| Interview      | nila                     | Tahap penting         |
| Offer          | daun                     | Berhasil              |
| Rejected       | terakota, redup          | Selesai               |
| Ghosted        | abu, garis putus-putus   | Selesai tanpa kabar   |

Badge status: latar versi muda, teks versi tua dari warna yang sama, bentuk
pill, dengan titik kecil berwarna solid di kiri.

## 3. Tipografi

- **Display: Fraunces** (Google Fonts, variable). Untuk judul halaman, angka
  besar di dashboard, empty state, dan landing. Gunakan axis SOFT tinggi
  agar terasa hangat. Ini sumber utama "karakter".
- **UI: Geist.** Untuk semua teks antarmuka, tabel, form, dan tombol.
- **Angka: Geist Mono**, tabular, untuk tanggal, jumlah hari, dan statistik kecil.

Skala: judul halaman 32/Fraunces, subjudul 15/Geist tinta-redup, judul
kartu 15/Geist medium, body 14, keterangan 12. Kalimat biasa (sentence case),
bukan Title Case.

## 4. Motif: mega mendung

Motif awan khas Cirebon, digambar ulang sebagai **garis tipis satu warna**
(stroke 1–1.5px), bukan batik penuh warna.

Dipakai hemat, sebagai tanda tangan:

- Landing dan login: motif besar samar (opasitas rendah) di satu sudut.
  Di landing awan itu melayang pelan dan garisnya menyala kunyit saat
  disentuh; di login ia diam.
- Empty state: ilustrasi kecil awan bergaris nila.
- Header sidebar: motif kecil di belakang logo.
- Kolom Offer di board: awan kecil di header kolom sebagai "hadiah".

Jangan dipakai sebagai background penuh di halaman kerja (board, tabel, form).

## 5. Logo

"Garis léngkah": satu goresan naik, di t dan di é. Acuan:
`reference/logo-garis-lengkah.png`.

- Logomark: batang huruf "t" berujung bulat, dipotong satu goresan kunyit
  yang naik ke kanan. Tanpa kotak. Dipakai juga sebagai favicon.
- Wordmark: "tarékah" huruf kecil, Fraunces tebal; aksen é adalah goresan
  kunyit yang sama, dengan kemiringan yang sama.
- Warna: batang dan wordmark nila di latar terang, kertas di latar gelap.
  Goresan selalu kunyit.

## 6. Bentuk dan ruang

- Radius: 10px untuk kartu, 8px untuk kontrol, pill untuk badge.
- Border hairline 1px warna garis. Shadow hanya sangat halus pada kartu
  yang di-hover atau di-drag.
- Ruang lega: padding halaman 32px desktop, gap antar kartu 10px.
- Lebar konten maksimum 1152px (max-w-6xl); board boleh full width.

## 7. Komponen kunci

- **Sidebar**: latar permukaan-2, logo di atas, grup navigasi
  [Board, Lamaran, Dashboard], grup "Arsip" [Perusahaan, Kontak, Dokumen,
  Pertanyaan, Cerita], lalu Pengaturan dan avatar di bawah. Item aktif: latar
  nila-muda, teks nila-tua, garis kecil nila di kiri. Di mobile menjadi sheet.
- **Page header**: judul Fraunces, satu baris konteks di bawahnya
  ("14 lamaran aktif · 3 perlu follow-up"), aksi utama di kanan.
- **Kartu lamaran (board)**: nama perusahaan medium, posisi, baris bawah
  berisi sumber dan "X hari" (Geist Mono). Lewat batas follow-up → "X hari"
  berwarna kunyit dengan titik kunyit di sudut kartu.
- **Banner follow-up**: latar kunyit-muda, ikon lonceng, teks tinta,
  tombol "Lihat" di kanan.
- **Empty state**: ilustrasi mega mendung kecil, judul Fraunces berupa
  ajakan, satu kalimat, satu tombol.
- **Dashboard**: angka besar Fraunces di kartu ringkasan; funnel digambar
  sebagai "jalur langkah" horizontal; chart memakai warna status.

## 8. Momen yang memberi nyawa

- Sapaan di dashboard sesuai waktu, sesekali berbahasa Sunda:
  "Wilujeng énjing" (pagi), "Wilujeng siang", "Wilujeng sonten" (sore),
  "Wilujeng wengi" (malam), diikuti satu baris ringkasan hari ini.
- Penghitung "léngkah": total lamaran ditampilkan sebagai
  "42 léngkah ikhtiar" di dashboard.
- Saat kartu dipindah ke Offer: animasi halus awan mega mendung mekar
  dan pesan "Hasil tarékah-mu" (tanpa confetti berlebihan).
- Saat dipindah ke Rejected: tanpa animasi, pesan tenang
  "Dicatat. Satu léngkah tetap léngkah."

## 9. Gaya bahasa

Bahasa Indonesia santai-sopan, seperti teman yang tenang.

- Tombol diawali kata kerja: "Tambah lamaran", "Simpan", "Ekspor CSV".
- Empty state berupa ajakan: "Mulai léngkah pertamamu", bukan
  "Belum ada data".
- Error: apa yang terjadi + apa yang dilakukan, tanpa "Error:".
- Tanpa tanda seru di teks sistem, tanpa emoji.

## 10. Daftar halaman

Publik: Landing (/), Login (/login).
Butuh login: Dashboard, Board, Lamaran (tabel), Lamaran baru, Detail
lamaran, Edit lamaran, Perusahaan, Detail perusahaan, Kontak, Dokumen,
Pertanyaan, Cerita, Cerita baru, Detail cerita, Edit cerita, Pengaturan.
Lainnya: loading (skeleton), error, not-found, dialog form, dialog
konfirmasi hapus, toggle tema.

Stack implementasi: Next.js + Tailwind v4 + shadcn/ui (Base UI).
