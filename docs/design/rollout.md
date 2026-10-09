# Rollout desain Tarékah

Tracker penerapan identitas brand ke seluruh aplikasi. Acuan: [`guideline.md`](./guideline.md) dan mockup di [`reference/`](./reference/).

Cara pakai:

- Centang butir di commit yang sama dengan pekerjaannya.
- Kalau hasil menyimpang dari mockup atau guideline, tulis alasannya di "Catatan" bagian itu.
- Butir baru yang muncul di tengah jalan ditambahkan ke bagian yang cocok, jangan ke daftar terpisah.

Keputusan yang berlaku untuk semua halaman:

- Label status tetap Indonesia (`Dilamar`, `Tes teknis`, `Ditolak`, `Tanpa kabar`), walau mockup memakai Inggris. CSV ekspor dan pengumuman screen reader bergantung padanya.
- Mockup dibuat dengan data contoh. Elemen yang butuh query atau kolom baru dicatat di "Data yang ditunda", bukan dikerjakan sambil me-restyle.
- Isi halaman yang sudah ada tidak dibuang hanya karena tidak muncul di mockup.

## Fase 1: fondasi

Mockup: `reference/fondasi-desain.png`.

- [ ] Palet terang dan gelap di `src/app/globals.css`, dipetakan ke nama token shadcn
- [ ] Token baru: `kunyit`, `kunyit-tua`, `success`, dan `status-*`
- [ ] Warna chart `--chart-1` sampai `--chart-5` dari palet
- [ ] Fraunces (SOFT 100) sebagai `font-heading`; Geist dan Geist Mono tetap
- [ ] Primitif `src/components/ui/`: kartu hairline radius 10px, kontrol radius 8px, badge pill
- [ ] Badge status: pill, titik solid, `ghosted` putus-putus, `rejected` redup
- [ ] Badge follow-up memakai kunyit

Catatan:

## Fase 2: logo dan motif

- [ ] `Logomark`, `Wordmark`, `Logo` di `src/components/brand/logo.tsx`
- [ ] Motif mega mendung di `src/components/brand/mega-mendung.tsx`
- [ ] `src/app/icon.svg` dan `src/app/apple-icon.png`; `favicon.ico` bawaan dihapus

Catatan:

## Fase 3: shell

- [ ] Sidebar desktop: logo, grup utama, grup Arsip, Pengaturan, pengguna
- [ ] Item aktif: latar nila-muda, teks nila-tua, garis nila di kiri
- [ ] Sheet navigasi di mobile
- [ ] `PageHeader`: judul Fraunces, baris konteks, aksi di kanan
- [ ] Lebar konten `max-w-6xl`; Board selebar layar

Catatan:

## Fase 4: Board

Mockup: `reference/board.png`.

- [ ] Desktop: header dengan ringkasan, pencarian, filter sumber
- [ ] Desktop: kolom permukaan-2 dengan pill status dan jumlah
- [ ] Desktop: kartu lamaran (perusahaan, posisi, sumber, hari; tanda kunyit saat lewat batas)
- [ ] Desktop: tautan "Tambah" di kolom Wishlist, awan di kolom Offer
- [ ] Momen: pesan saat kartu masuk Offer dan Ditolak
- [ ] Mobile: header menumpuk, kolom dengan scroll-snap
- [ ] Skeleton mengikuti bentuk baru

Catatan:

## Fase 5: Dashboard

Mockup: `reference/dashboard.png`.

- [ ] Desktop: sapaan sesuai waktu, tanggal, baris ringkasan
- [ ] Desktop: banner follow-up
- [ ] Desktop: empat kartu ringkasan dengan angka Fraunces
- [ ] Desktop: jalur léngkah menggantikan chart funnel
- [ ] Desktop: lamaran per minggu dan daftar perlu follow-up
- [ ] Desktop: bagian respons (response rate, waktu respons, per sumber, per versi CV)
- [ ] Empty state dengan mega mendung
- [ ] Mobile: kartu dua kolom, jalur léngkah vertikal, grid satu kolom
- [ ] Skeleton mengikuti bentuk baru

Catatan:

## Fase 6: test dan dokumen

- [ ] Unit test: sapaan, konversi funnel, filter board
- [ ] E2E: navigasi mobile lewat sheet
- [ ] `docs/screenshots/` dibuat ulang, termasuk tangkapan mobile
- [ ] `CLAUDE.md` diperbarui (Styling, UI components, rujukan ke tracker ini)

## Halaman berikutnya

Mewarisi token dan shell baru, tapi tata letaknya belum dipoles.

- [ ] Lamaran, tabel (mockup: `reference/lamaran.png`)
- [ ] Landing (mockup: `reference/landing.png`)
- [ ] Login
- [ ] Lamaran baru dan edit lamaran
- [ ] Detail lamaran
- [ ] Perusahaan
- [ ] Detail perusahaan
- [ ] Kontak
- [ ] Dokumen
- [ ] Pertanyaan
- [ ] Pengaturan
- [ ] Loading, error, not-found, `global-error.tsx`
- [ ] Dialog form dan konfirmasi hapus
- [ ] Empty state semua halaman daftar

## Data yang ditunda

Ada di mockup, tapi butuh query atau skema baru.

- [ ] Dashboard: "Agenda terdekat" (interview mendatang)
- [ ] Dashboard: baris sapaan dengan jadwal interview hari ini
- [ ] Dashboard: chart mingguan bertumpuk per status
- [ ] Board: jadwal interview di kartu kolom Interview
- [ ] Board dan Dashboard: tenggat tes teknis (butuh kolom baru dan migrasi)
- [ ] Lamaran: tab Semua/Aktif/Perlu follow-up/Selesai dan paginasi
