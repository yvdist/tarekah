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

- [x] Palet terang dan gelap di `src/app/globals.css`, dipetakan ke nama token shadcn
- [x] Token baru: `kunyit`, `kunyit-tua`, `success`, dan `status-*`
- [x] Warna chart `--chart-1` sampai `--chart-5` dari palet
- [x] Fraunces (SOFT 100) sebagai `font-heading`; Geist dan Geist Mono tetap
- [x] Primitif `src/components/ui/`: kartu hairline radius 10px, kontrol radius 8px, badge pill
- [x] Badge status: pill, titik solid, `ghosted` putus-putus, `rejected` redup
- [x] Badge follow-up memakai kunyit

Catatan:

- `--destructive` di tema terang `#a8492a`, satu tingkat lebih gelap dari terakota `#b5532f`, supaya lolos AA sebagai teks di atas permukaan-2.
- Kunyit solid tidak lolos AA sebagai teks, jadi ada `kunyit-tua` (`#7a4e00` terang) untuk teks; solid hanya untuk titik dan ikon.
- Warna chart bukan warna status. Warna status guideline gagal validator `dataviz` sebagai seri kategorikal (chroma terlalu rendah, biru batu dan daun terlalu mirip). Urutannya nila, terakota, teal, oker, biru; baru dua yang dipakai. Oker di slot 4 lebih gelap dari kunyit dan bukan "lonceng".
- Tinggi kontrol naik 4px (tombol dan input 36px, `lg` 40px) mengikuti mockup; berlaku di semua halaman.
- Dialog dan dropdown masih memakai `ring` dan radius lama; masuk butir "Dialog form dan konfirmasi hapus".

## Fase 2: logo dan motif

- [x] `Logomark`, `Wordmark`, `Logo` di `src/components/brand/logo.tsx`
- [x] Motif mega mendung di `src/components/brand/mega-mendung.tsx`
- [x] `src/app/icon.svg` dan `src/app/apple-icon.png`; `favicon.ico` bawaan dihapus

Catatan:

- Huruf "t" di logomark adalah outline Fraunces (SOFT 100, bobot 600) yang disalin sebagai path, supaya favicon tidak bergantung pada web font.
- Motif hanya satu ukuran gambar; ukuran diatur lewat lebar.

## Fase 3: shell

- [x] Sidebar desktop: logo, grup utama, grup Arsip, Pengaturan, pengguna
- [x] Item aktif: latar nila-muda, teks nila-tua, garis nila di kiri
- [x] Sheet navigasi di mobile
- [x] `PageHeader`: judul Fraunces, baris konteks, aksi di kanan
- [x] Lebar konten `max-w-6xl`; Board selebar layar

Catatan:

- Toggle tema dan tombol keluar ada di baris pengguna di bawah sidebar; mockup tidak menggambarkannya.
- `PageHeader` dipakai halaman yang sudah di-restyle. Halaman lain masih dengan h1 lama sampai gilirannya.

## Fase 4: Board

Mockup: `reference/board.png`.

- [x] Desktop: header dengan ringkasan, pencarian, filter sumber
- [x] Desktop: kolom permukaan-2 dengan pill status dan jumlah
- [x] Desktop: kartu lamaran (perusahaan, posisi, sumber, hari; tanda kunyit saat lewat batas)
- [x] Desktop: tautan "Tambah" di kolom Wishlist, awan di kolom Offer
- [x] Momen: pesan saat kartu masuk Offer dan Ditolak
- [x] Mobile: header menumpuk, kolom dengan scroll-snap
- [x] Skeleton mengikuti bentuk baru

Catatan:

- Pencarian dan filter sumber menyaring di klien dan tidak masuk URL.
- Badge "Perlu follow-up" dan "Saran: Tanpa kabar" di kartu diganti titik kunyit dan hitungan hari berwarna kunyit; teks lengkapnya tetap ada untuk screen reader dan sebagai tooltip.
- Kolom Ditolak dan Tanpa kabar tetap bisa diciutkan, walau tidak ada di mockup.

## Fase 5: Dashboard

Mockup: `reference/dashboard.png`.

- [x] Desktop: sapaan sesuai waktu, tanggal, baris ringkasan
- [x] Desktop: banner follow-up
- [x] Desktop: empat kartu ringkasan dengan angka Fraunces
- [x] Desktop: jalur léngkah menggantikan chart funnel
- [x] Desktop: lamaran per minggu dan daftar perlu follow-up
- [x] Desktop: bagian respons (response rate, waktu respons, per sumber, per versi CV)
- [x] Empty state dengan mega mendung
- [x] Mobile: kartu dua kolom, jalur léngkah vertikal, grid satu kolom
- [x] Skeleton mengikuti bentuk baru

Catatan:

- h1 tetap bernama "Dashboard" untuk screen reader; yang terlihat adalah sapaannya.
- Daftar "Perlu follow-up" menempati tempat "Agenda terdekat" di mockup dan menggulung di dalam panelnya. Tombol "Lihat" di banner melompat ke sana.
- Filter rentang, response rate, waktu respons, "Per sumber loker" dan "Per versi CV" tidak ada di mockup dan dipertahankan.
- Chart mingguan tetap satu seri, 12 minggu.
- Tombol di empty state memakai gaya outline, karena "Tambah lamaran" di header sudah menjadi satu-satunya tombol nila di layar.

## Fase 6: test dan dokumen

- [x] Unit test: sapaan, konversi funnel, filter board
- [x] E2E: navigasi mobile lewat sheet
- [x] E2E: pesan Offer dan Ditolak; axe dengan data lengkap di kedua tema, desktop dan ponsel
- [x] `docs/screenshots/` dibuat ulang, termasuk tangkapan mobile
- [x] `CLAUDE.md` diperbarui (Styling, UI components, rujukan ke tracker ini)

## Fase 7: Lamaran (tabel)

Mockup: `reference/lamaran.png`.

- [x] Desktop: header dengan ringkasan, Export CSV dan Tambah lamaran
- [x] Desktop: tabel di dalam kartu, baris header permukaan-2, kaki kartu dengan jumlah baris
- [x] Desktop: kolom Follow-up dengan titik kunyit; baris Ditolak dan Tanpa kabar diredupkan
- [x] Mobile: kolom dilepas bertahap, posisi dan tanda follow-up pindah ke sel perusahaan
- [x] Empty state dengan mega mendung

Catatan:

- Tab Semua/Aktif/Perlu follow-up/Selesai dan paginasi tidak dibuat (lihat "Data yang ditunda"). Tempatnya diisi pencarian dan tiga filter yang sudah ada (status, sumber, tipe kerja).
- Kolom "Tipe kerja" tidak ada di mockup dan dipertahankan. Ia baru muncul saat tabel selebar 1024px ke atas, karena di bawah itu menu aksi terdorong keluar.
- Kolom dilepas menurut lebar tabel sendiri (container query), bukan lebar layar, sebab sidebar ikut memakan tempat.
- Teks "Export CSV" dan "Tanggal apply" tetap (mockup: "Ekspor CSV", "Dilamar"); yang pertama dipakai e2e, yang kedua sama dengan label di form dan halaman detail.
- Kolom Follow-up hanya memuat tanda follow-up dalam bentuk pendek ("8 hari menunggu", "30 hari tanpa kabar"); kalimat lengkapnya jadi tooltip. Jadwal interview dan tenggat di mockup belum ada datanya.
- Primitif `Table` ikut berubah (header kecil redup di atas permukaan-2, sel lebih lega), jadi tabel Perusahaan dan tabel rincian di Dashboard ikut.

## Fase 8: Landing dan Login

Mockup: `reference/landing.png`. Login tidak punya mockup dan mengikuti guideline bagian 4.

- [x] Landing desktop: nav dengan logo dan Masuk, hero Fraunces dengan awan samar, dua aksi
- [x] Landing desktop: pratinjau board, tiga fitur bernomor, bagian "Ditolak juga dicatat" dengan jalur léngkah, penutup, footer
- [x] Landing mobile: satu kolom, pratinjau board dua kolom, jalur léngkah vertikal
- [x] Login: logo, kartu dengan judul Fraunces dan dua tombol penyedia berikon, awan samar di sudut
- [x] E2E: axe untuk Landing dan Login di kedua tema, desktop dan ponsel

Catatan:

- Teks pengganti di mockup diisi: `[INFO HARGA DAN CARA MASUK]` menjadi "Masuk dengan akun GitHub atau Google, lalu catat lamaran pertamamu." tanpa menyebut harga, dan footer menjadi "Dibuat dengan tekun." tanpa `[KOTA]`.
- Fitur pertama berbunyi "Tentukan berapa hari kamu mau menunggu kabar", bukan "untuk tiap lamaran": batas follow-up adalah satu pengaturan untuk semua lamaran.
- "Mulai mencatat" muncul dua kali seperti di mockup, di hero dan di penutup. Keduanya tidak pernah terlihat di layar yang sama.
- Pratinjau board dan kartu léngkah memakai komponen aslinya (`BoardCardBody`, `StatusBadge`, `StepPath`) dengan data contoh, jadi label status Indonesia, sumber memakai daftar yang ada, dan angka léngkah tampil dengan persen lanjutnya. Bagi screen reader masing-masing satu gambar berlabel.
- Di ponsel pratinjau board menjadi dua kolom, bukan menggulung ke samping: isinya tidak bisa difokus, jadi area gulir tidak terjangkau keyboard.
- Toggle tema tetap ada di kedua halaman, walau mockup tidak menggambarkannya.
- Ikon GitHub dan Google di Login satu warna mengikuti warna teks, supaya terbaca di kedua tema.
- Copy lama Landing (judul dan satu paragraf) diganti copy mockup; isinya tercakup di tiga fitur.

## Fase 9: form dan halaman detail

Tanpa mockup; mengikuti pola halaman yang sudah jadi.

- [x] Lamaran baru dan edit lamaran: `PageHeader`, form di dalam kartu, baris aksi di bawah garis
- [x] Detail lamaran: `PageHeader` (posisi, perusahaan, Edit dan Hapus), tiap bagian jadi kartu, riwayat status di kolom kanan
- [x] Perusahaan: `PageHeader`, tabel di dalam kartu, empty state dengan mega mendung
- [x] Detail perusahaan: `PageHeader` (nama, website), catatan, lamaran dan kontak sebagai kartu

Catatan:

- Form tetap satu kolom selebar `max-w-2xl`; isinya tidak dipecah jadi beberapa seksi, karena urutan dan label field dipakai e2e.
- `Panel` pindah dari fitur dashboard ke `src/components/panel.tsx` dan mendapat slot `action` (tombol "Tambah interview").
- "Riwayat status" bukan `Panel`: e2e mencari daftarnya lewat induk heading, jadi heading tetap anak langsung `<section>`.
- Dua kolom detail baru muncul dari `lg`; di bawah itu riwayat status turun ke bawah, karena di `md` sidebar sudah memakan tempat.
- Detail perusahaan tidak masuk `a11y-seeded.spec.ts`: alamatnya butuh id, dan badge status di atas kartu putih sudah diperiksa lewat tabel Lamaran.

## Fase 10: halaman arsip, state dan overlay

Tanpa mockup; mengikuti pola halaman yang sudah jadi.

- [x] Kontak: `PageHeader` dengan "Tambah kontak", daftar di dalam kartu, empty state dengan mega mendung
- [x] Dokumen: `PageHeader` dengan "Tambah versi", CV dan cover letter sebagai dua kartu, empty state dengan mega mendung
- [x] Pertanyaan: `PageHeader`, pencarian dan filter tahap, daftar di dalam kartu dengan jumlah di kakinya, empty state dengan mega mendung
- [x] Pengaturan: `PageHeader`, profil dan follow-up sebagai kartu, "Keluar" di kartu profil
- [x] Empty state semua halaman daftar memakai `EmptyState` (Lamaran, Perusahaan, Kontak, Dokumen, Pertanyaan)

Catatan:

- Judul empty state diganti ajakan ("Catat siapa yang kamu temui", bukan "Belum ada kontak") mengikuti guideline bagian 9; kalimat penjelasnya tetap.
- "Tambah kontak" di header menunggu daftar perusahaan dan lamaran untuk formnya, jadi ia punya `Suspense` sendiri. Di empty state tombol yang sama tampil bergaya outline, supaya tombol nila tetap satu.
- Kontak tetap daftar, bukan tabel: catatan dan lamaran terkait tidak muat dalam sel.
- Nama perusahaan di baris kontak menjadi tautan ke detail perusahaan; id-nya sudah ada di query.
- Dokumen: dua kartu berdampingan dari `lg`, masing-masing dengan jumlah versinya. Versi yang diarsipkan tetap tampil, namanya diredupkan.
- Pertanyaan: filter tahap tetap `<select>` bawaan browser di dalam form GET, supaya pencarian jalan tanpa JavaScript; hanya tinggi, radius dan latarnya yang disamakan dengan `Input`. Tombol "Cari" bergaya outline karena bukan aksi utama; halaman ini tidak punya tombol nila.
- Empty state Pertanyaan berjudul "Kumpulkan pertanyaan interview-mu" (sebelumnya "Belum ada pertanyaan") dan mengarah ke daftar lamaran, tempat catatan interview ditulis.
- Hasil pencarian yang kosong ("Tidak ada pertanyaan yang cocok") tetap kotak putus-putus tanpa awan, sama dengan Dashboard: itu bukan halaman kosong. Jumlahnya tidak ditampilkan di keadaan itu.
- Pengaturan selebar `max-w-2xl` seperti halaman form. "Keluar" pindah dari bawah halaman ke slot aksi kartu Profil, karena ia tindakan atas akun itu; tombol yang sama tetap ada di sidebar.
- Empty state Dokumen berjudul "Simpan versi CV pertamamu" (sebelumnya "Belum ada versi dokumen"). Kartu jenis yang kosong tetap memakai kalimat pendek "Belum ada versi.", bukan awan kedua.

## Halaman berikutnya

Mewarisi token dan shell baru, tapi tata letaknya belum dipoles.

- [ ] Loading, error, not-found, `global-error.tsx`
- [ ] Dialog form dan konfirmasi hapus

## Data yang ditunda

Ada di mockup, tapi butuh query atau skema baru.

- [ ] Dashboard: "Agenda terdekat" (interview mendatang)
- [ ] Dashboard: baris sapaan dengan jadwal interview hari ini
- [ ] Dashboard: chart mingguan bertumpuk per status
- [ ] Board: jadwal interview di kartu kolom Interview
- [ ] Board dan Dashboard: tenggat tes teknis (butuh kolom baru dan migrasi)
- [ ] Lamaran: tab Semua/Aktif/Perlu follow-up/Selesai dan paginasi
- [ ] Lamaran: kolom "Terakhir update" (butuh `updatedAt` di query daftar)
- [ ] Lamaran: jadwal interview dan tenggat di kolom Follow-up
