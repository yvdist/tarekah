# Catatan desain Tarékah

Identitas brand di [`guideline.md`](./guideline.md) sudah diterapkan ke semua halaman. Berkas ini bukan lagi tracker: isinya keputusan yang alasannya tidak terbaca dari kode, dan backlog elemen mockup yang belum punya datanya. Mockup ada di [`reference/`](./reference/); riwayat pengerjaannya ada di git.

## Keputusan yang berlaku untuk semua halaman

- Label status tetap Indonesia (`Dilamar`, `Tes teknis`, `Ditolak`, `Tanpa kabar`), walau mockup memakai Inggris. CSV ekspor dan pengumuman screen reader bergantung padanya.
- Mockup dibuat dengan data contoh. Elemen yang butuh query atau kolom baru dicatat di "Data yang ditunda", bukan dikerjakan sambil me-restyle.
- Isi halaman yang sudah ada tidak dibuang hanya karena tidak muncul di mockup.
- Maksimal satu tombol nila solid per layar. Dialog dihitung sebagai layar sendiri: "Simpan" di dalam dialog solid walau halaman di belakangnya juga punya tombol nila.
- Judul empty state berupa ajakan (guideline bagian 9), dan tombolnya bergaya outline bila header halaman sudah punya tombol nila.

## Catatan

### Fondasi

Mockup: `reference/fondasi-desain.png`.

- `--destructive` di tema terang `#a8492a`, satu tingkat lebih gelap dari terakota `#b5532f`, supaya lolos AA sebagai teks di atas permukaan-2.
- Kunyit solid tidak lolos AA sebagai teks, jadi ada `kunyit-tua` (`#7a4e00` terang) untuk teks; solid hanya untuk titik dan ikon.
- Warna chart bukan warna status. Warna status guideline gagal validator `dataviz` sebagai seri kategorikal (chroma terlalu rendah, biru batu dan daun terlalu mirip). Urutannya nila, terakota, teal, oker, biru; baru dua yang dipakai. Oker di slot 4 lebih gelap dari kunyit dan bukan "lonceng".
- Tinggi kontrol naik 4px (tombol dan input 36px, `lg` 40px) mengikuti mockup; berlaku di semua halaman.
- Primitif `Table`: header kecil redup di atas permukaan-2 dan sel yang lebih lega, dipakai tabel Lamaran, Perusahaan dan tabel rincian di Dashboard.

### Logo dan motif

- Huruf "t" di logomark adalah outline Fraunces (SOFT 100, bobot 600) yang disalin sebagai path, supaya favicon tidak bergantung pada web font.
- Motif hanya satu ukuran gambar; ukuran diatur lewat lebar.

### Shell

- Toggle tema dan tombol keluar ada di baris pengguna di bawah sidebar; mockup tidak menggambarkannya.

### Board

Mockup: `reference/board.png`.

- Pencarian dan filter sumber menyaring di klien dan tidak masuk URL.
- Badge "Perlu follow-up" dan "Saran: Tanpa kabar" di kartu diganti titik kunyit dan hitungan hari berwarna kunyit; teks lengkapnya tetap ada untuk screen reader dan sebagai tooltip.
- Kolom Ditolak dan Tanpa kabar tetap bisa diciutkan, walau tidak ada di mockup.

### Dashboard

Mockup: `reference/dashboard.png`.

- h1 tetap bernama "Dashboard" untuk screen reader; yang terlihat adalah sapaannya.
- Daftar "Perlu follow-up" menempati tempat "Agenda terdekat" di mockup dan menggulung di dalam panelnya. Tombol "Lihat" di banner melompat ke sana.
- Filter rentang, response rate, waktu respons, "Per sumber loker" dan "Per versi CV" tidak ada di mockup dan dipertahankan.
- Chart mingguan tetap satu seri, 12 minggu.
- Tombol di empty state memakai gaya outline, karena "Tambah lamaran" di header sudah menjadi satu-satunya tombol nila di layar.

### Lamaran (tabel)

Mockup: `reference/lamaran.png`.

- Tab Semua/Aktif/Perlu follow-up/Selesai dan paginasi tidak dibuat (lihat "Data yang ditunda"). Tempatnya diisi pencarian dan tiga filter yang sudah ada (status, sumber, tipe kerja).
- Kolom "Tipe kerja" tidak ada di mockup dan dipertahankan. Ia baru muncul saat tabel selebar 1024px ke atas, karena di bawah itu menu aksi terdorong keluar.
- Kolom dilepas menurut lebar tabel sendiri (container query), bukan lebar layar, sebab sidebar ikut memakan tempat.
- Teks "Export CSV" dan "Tanggal apply" tetap (mockup: "Ekspor CSV", "Dilamar"); yang pertama dipakai e2e, yang kedua sama dengan label di form dan halaman detail.
- Kolom Follow-up hanya memuat tanda follow-up dalam bentuk pendek ("8 hari menunggu", "30 hari tanpa kabar"); kalimat lengkapnya jadi tooltip. Jadwal interview dan tenggat di mockup belum ada datanya.

### Landing dan Login

Mockup: `reference/landing.png`. Login tidak punya mockup dan mengikuti guideline bagian 4.

- Teks pengganti di mockup diisi: `[INFO HARGA DAN CARA MASUK]` menjadi "Masuk dengan akun GitHub atau Google, lalu catat lamaran pertamamu." tanpa menyebut harga, dan footer menjadi "Dibuat dengan tekun." tanpa `[KOTA]`.
- Fitur pertama berbunyi "Tentukan berapa hari kamu mau menunggu kabar", bukan "untuk tiap lamaran": batas follow-up adalah satu pengaturan untuk semua lamaran.
- "Mulai mencatat" muncul dua kali seperti di mockup, di hero dan di penutup. Keduanya tidak pernah terlihat di layar yang sama.
- Pratinjau board dan kartu léngkah memakai komponen aslinya (`BoardCardBody`, `StatusBadge`, `StepPath`) dengan data contoh, jadi label status Indonesia, sumber memakai daftar yang ada, dan angka léngkah tampil dengan persen lanjutnya. Bagi screen reader masing-masing satu gambar berlabel.
- Di ponsel pratinjau board menjadi dua kolom, bukan menggulung ke samping: isinya tidak bisa difokus, jadi area gulir tidak terjangkau keyboard.
- Toggle tema tetap ada di kedua halaman, walau mockup tidak menggambarkannya.
- Ikon GitHub dan Google di Login satu warna mengikuti warna teks, supaya terbaca di kedua tema.
- Copy lama Landing (judul dan satu paragraf) diganti copy mockup; isinya tercakup di tiga fitur.

### Form lamaran dan detail lamaran

Tanpa mockup.

- Form tetap satu kolom selebar `max-w-2xl`; isinya tidak dipecah jadi beberapa seksi, karena urutan dan label field dipakai e2e.
- "Riwayat status" bukan `Panel`: e2e mencari daftarnya lewat induk heading, jadi heading tetap anak langsung `<section>`.
- Dua kolom detail baru muncul dari `lg`; di bawah itu riwayat status turun ke bawah, karena di `md` sidebar sudah memakan tempat.

### Perusahaan dan detail perusahaan

Tanpa mockup.

- Detail perusahaan tidak masuk `a11y-seeded.spec.ts`: alamatnya butuh id, dan badge status di atas kartu putih sudah diperiksa lewat tabel Lamaran.

### Kontak

Tanpa mockup.

- Empty state berjudul "Catat siapa yang kamu temui" (sebelumnya "Belum ada kontak"); kalimat penjelasnya tetap.
- "Tambah kontak" di header menunggu daftar perusahaan dan lamaran untuk formnya, jadi ia punya `Suspense` sendiri.
- Kontak tetap daftar, bukan tabel: catatan dan lamaran terkait tidak muat dalam sel.
- Nama perusahaan di baris kontak adalah tautan ke detail perusahaan; id-nya sudah ada di query.

### Dokumen

Tanpa mockup.

- Dua kartu (CV, Cover letter) berdampingan dari `lg`, masing-masing dengan jumlah versinya. Versi yang diarsipkan tetap tampil, namanya diredupkan.
- Empty state berjudul "Simpan versi CV pertamamu" (sebelumnya "Belum ada versi dokumen"). Kartu jenis yang kosong memakai kalimat pendek "Belum ada versi.", bukan awan kedua.

### Pertanyaan

Tanpa mockup.

- Filter tahap tetap `<select>` bawaan browser di dalam form GET, supaya pencarian jalan tanpa JavaScript; hanya tinggi, radius dan latarnya yang disamakan dengan `Input`.
- Tombol "Cari" bergaya outline karena bukan aksi utama; halaman ini tidak punya tombol nila.
- Empty state berjudul "Kumpulkan pertanyaan interview-mu" (sebelumnya "Belum ada pertanyaan") dan mengarah ke daftar lamaran, tempat catatan interview ditulis.
- Hasil pencarian yang kosong ("Tidak ada pertanyaan yang cocok") tetap kotak putus-putus tanpa awan, sama dengan Dashboard: itu bukan halaman kosong. Jumlahnya tidak ditampilkan di keadaan itu.

### Pengaturan

Tanpa mockup.

- Selebar `max-w-2xl` seperti halaman form.
- "Keluar" ada di slot aksi kartu Profil, karena ia tindakan atas akun itu; tombol yang sama tetap ada di sidebar.

### Not-found, error dan loading

- Not-found dan error tidak memakai awan: mega mendung disimpan untuk empty state, yang berupa ajakan. Kotaknya kartu biasa, bukan garis putus-putus.
- Di luar shell (alamat yang tidak dikenal, error di halaman publik) kartunya sempit dengan logo di atasnya, seperti Login.
- `global-error.tsx` menggantikan root layout, jadi tidak bisa memakai token atau Fraunces. Paletnya disalin sebagai nilai hex dan mengikuti `prefers-color-scheme`, bukan pilihan tema pengguna; judulnya memakai serif sistem.
- "Coba lagi" di halaman error adalah satu-satunya tombol nila di layar itu; "Ke beranda" dan "Ke dashboard" tetap outline.
- `ListSkeleton` dan `FormSkeleton` menggambar kartunya sendiri. Di dalam `Panel` keduanya dipanggil dengan `bare` supaya tidak ada kartu di dalam kartu.

### Dialog, menu dan popup

- Dialog, menu dan popup select berbayang walau guideline membatasi shadow pada kartu yang di-hover atau di-drag: mereka mengambang di atas kartu putih, dan hairline saja tidak cukup memisahkannya. Kartu yang diam tetap tanpa shadow.
- Latar di belakang dialog dan sheet navigasi tidak di-blur (guideline menolak glassmorphism); gantinya lapisan hitam 30%.
- Konfirmasi hapus memakai tombol terakota muda, bukan solid.

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
