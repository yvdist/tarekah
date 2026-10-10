# Deploy ke Vercel + Neon

Panduan ini membawa Tarékah dari repository ke alamat publik.

Urutannya: project Vercel dulu, supaya domainnya diketahui; lalu database; lalu OAuth, yang butuh domain itu; baru deploy yang sesungguhnya.

Yang dibutuhkan: akun [Vercel](https://vercel.com), akun GitHub, dan project Google Cloud. Akun Neon dibuat lewat Vercel di langkah 2, atau pakai yang sudah ada.

## 1. Project di Vercel

1. **Add New → Project**, impor repository GitHub.
2. Tentukan **Project Name**. Nama ini menjadi domain production: `<nama-project>.vercel.app`. Catat; dipakai di langkah 3.
3. Framework terdeteksi sebagai Next.js. Biarkan pengaturan lain apa adanya dan klik Deploy.

Deploy pertama ini gagal di langkah migration dengan "Please provide required params for Postgres driver". Itu wajar: variabelnya baru diisi di langkah berikutnya. Yang dicari dari langkah ini hanya project dan domainnya.

Pilih region function yang dekat dengan pengguna (Settings → Functions; untuk Indonesia: Singapore, `sin1`).

## 2. Database Neon

Pilih salah satu.

### A. Lewat integrasi Vercel (disarankan)

1. Di project Vercel, buka tab **Storage → Create Database → Neon**.
2. Pilih region yang sama dengan region function (Singapore).
3. Hubungkan ke project, untuk environment Production dan Preview.

Integrasi mengisi `DATABASE_URL` (pooled) dan `DATABASE_URL_UNPOOLED` (direct) secara otomatis, dengan nama yang persis dipakai aplikasi. Kalau opsi branch per preview diaktifkan, setiap preview deployment mendapat branch database sendiri.

Ini membuat project Neon baru yang dikelola dan ditagih lewat Vercel, terpisah dari project Neon yang dipakai di lokal. Pemisahan itu disengaja: data pengembangan dan production tidak bercampur.

### B. Project Neon yang sudah ada, manual

Di Neon, buka **Connect** dan salin dua connection string, lalu isi di Vercel pada Settings → Environment Variables:

| Variabel                | Nilai                                                                   |
| ----------------------- | ----------------------------------------------------------------------- |
| `DATABASE_URL`          | **Pooled** (host mengandung `-pooler`). Dipakai aplikasi saat berjalan. |
| `DATABASE_URL_UNPOOLED` | **Direct** (tanpa `-pooler`). Dipakai untuk migration.                  |

Jangan pakai branch Neon yang sama dengan `.env.local`; buat branch atau project tersendiri untuk production.

## 3. OAuth untuk production

Buat kredensial terpisah dari yang dipakai di lokal. GitHub hanya menerima satu callback URL per OAuth app, jadi app lokal tidak bisa dipakai ulang.

Ganti `<domain>` dengan domain dari langkah 1, misalnya `tarekah.vercel.app`.

**GitHub** — Settings → Developer settings → OAuth Apps → New OAuth App

- Homepage URL: `https://<domain>`
- Authorization callback URL: `https://<domain>/api/auth/callback/github`

**Google** — Google Cloud Console → APIs & Services → Credentials → Create credentials → OAuth client ID → Web application

- Authorized JavaScript origins: `https://<domain>`
- Authorized redirect URIs: `https://<domain>/api/auth/callback/google`
- Di **OAuth consent screen**, ubah status dari Testing ke In production. Selama masih Testing, hanya akun yang didaftarkan sebagai test user yang bisa masuk.

## 4. Environment variable sisanya

Di Vercel, Settings → Environment Variables, untuk environment Production:

| Variabel                               | Nilai                                                              |
| -------------------------------------- | ------------------------------------------------------------------ |
| `AUTH_SECRET`                          | Hasil `npx auth secret`. Buat yang baru, jangan pakai milik lokal. |
| `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET` | Dari OAuth app production                                          |
| `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | Dari OAuth client production                                       |
| `AI_KEY_ENCRYPTION_KEY`                | Hasil `openssl rand -base64 32`. Opsional; lihat catatan di bawah. |

Bersama dua variabel database dari langkah 2, totalnya delapan.

`AI_KEY_ENCRYPTION_KEY` mengenkripsi key AI milik pengguna (Pengaturan → AI). Tanpa variabel ini aplikasi tetap berjalan dan bagian AI hanya menampilkan pemberitahuan. Simpan nilainya di tempat aman dan jangan diganti: begitu berubah, semua key yang tersimpan tidak bisa dibuka lagi dan tiap pengguna harus menyimpan ulang key-nya. Jangan pernah mengisi `AI_FAKE_PROVIDER` di Vercel; variabel itu hanya untuk test end-to-end dan aplikasi menolak menyala bila menemukannya di sana.

Node.js: proyek ini butuh versi 22 atau lebih baru. Vercel membacanya dari `engines` di `package.json`.

`AUTH_TRUST_HOST` tidak perlu diisi: Auth.js mempercayai host secara otomatis di Vercel. `AUTH_URL` juga tidak perlu.

## 5. Migration

Migration jalan otomatis di setiap deploy. `vercel.json` mengatur build command-nya:

```bash
npm run db:migrate && npm run build
```

Tidak ada yang perlu diubah di dashboard; biarkan Override pada Build Command mati, karena nilai di dashboard tidak dipakai selama `vercel.json` mengisinya.

Migration yang belum jalan diterapkan sebelum build. Kalau migration gagal, deploy gagal dan versi lama tetap melayani. Dengan branch per preview, preview deployment memigrasi branch database miliknya sendiri, bukan production. Tanpa itu, Preview dan Production memakai database yang sama, sehingga preview deployment dari branch yang belum di-merge sudah menerapkan migration-nya ke database production.

**Manual dari lokal**, kalau migration perlu jalan tanpa deploy. Jalankan dengan connection string direct milik production:

```bash
DATABASE_URL_UNPOOLED='postgres://…' npm run db:migrate
```

Nilai di environment mengalahkan `.env.local`.

Di kedua cara, migration harus kompatibel dengan kode yang sedang berjalan: tambah kolom dulu, hapus kolom di deploy berikutnya.

### Backfill pertanyaan (sekali, setelah rilis bank pertanyaan)

Migration `0002_interview_prep` membuat tabel `questions`, tapi pertanyaan yang sudah ada masih tersimpan sebagai markdown di `interviews.questions`. Aplikasi tidak lagi membaca kolom itu, jadi sampai backfill dijalankan halaman Pertanyaan tampak kosong untuk pengguna lama. Kolom lama dibiarkan terisi sebagai cadangan dan akan dihapus di migration terpisah nanti.

Jalankan dari lokal dengan connection string direct milik production, setelah deploy pertama yang membawa migration itu selesai:

```bash
# 1. Lihat dulu apa yang akan ditulis; tidak mengubah apa pun.
DATABASE_URL_UNPOOLED='postgres://…' npm run db:backfill-questions -- --dry-run

# 2. Tulis.
DATABASE_URL_UNPOOLED='postgres://…' npm run db:backfill-questions
```

Script memecah markdown per baris, membuang duplikat dalam satu interview, dan melewati pertanyaan yang sudah ada untuk interview itu. Menjalankannya dua kali aman: yang kedua melaporkan `inserted: 0`. Uji dulu di branch Neon yang dibuat dari production kalau ingin melihat hasilnya tanpa risiko.

## 6. Deploy ulang dan periksa

Di tab Deployments, pilih deploy terakhir → **Redeploy** (atau push commit baru). Variabel baru hanya berlaku untuk deploy yang dibuat setelah diubah.

Lalu periksa di alamat production:

- [ ] Halaman depan terbuka; `/dashboard` tanpa login mengalihkan ke `/login`.
- [ ] Masuk dengan GitHub berhasil dan mendarat di dashboard.
- [ ] Masuk dengan Google berhasil.
- [ ] Menambah lamaran, memindahkannya di board, dan melihat riwayat statusnya di halaman detail.
- [ ] Export CSV mengunduh berkas.
- [ ] Keluar, lalu `/dashboard` kembali mengalihkan ke `/login`.
- [ ] Tab Logs di Vercel tidak menampilkan error.

Setelah itu, tambahkan alamatnya di bagian Demo pada `README.md`.

## Domain sendiri

Kalau nanti memakai domain sendiri (Settings → Domains), tambahkan callback URL dengan domain itu di OAuth app GitHub dan OAuth client Google. GitHub hanya menampung satu callback, jadi ganti yang lama; Google bisa menampung keduanya.

## Preview deployment

Login OAuth tidak berfungsi di URL preview (`<project>-<hash>.vercel.app`) karena callback URL-nya tidak terdaftar di GitHub dan Google. Preview tetap berguna untuk memeriksa build dan halaman publik. Kalau butuh login di preview, daftarkan satu domain preview tetap (branch domain) sebagai callback di OAuth app tersendiri dan isi variabelnya untuk environment Preview.

## Memakai Supabase

Aplikasi berbicara dengan PostgreSQL biasa lewat driver `pg`, jadi Supabase bisa menggantikan Neon tanpa perubahan kode. Langkah 2 diganti dengan mengisi dua variabel ini dari **Connect** di Supabase:

| Variabel                | Supabase                                                                          |
| ----------------------- | --------------------------------------------------------------------------------- |
| `DATABASE_URL`          | Transaction pooler (port `6543`)                                                  |
| `DATABASE_URL_UNPOOLED` | Direct connection (port `5432`). Kalau jaringan hanya IPv4, pakai Session pooler. |

Fitur Supabase lain (Auth, Row Level Security, Storage) tidak dipakai: login tetap lewat Auth.js dan isolasi data tetap dijaga di query. Konfigurasi ini belum diuji di project ini; yang diuji adalah Neon dan PostgreSQL 17 biasa.

## Masalah yang sering muncul

| Gejala                                                                                                    | Penyebab dan perbaikan                                                                                                                         |
| --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Build gagal dengan "Please provide required params for Postgres driver"                                   | `DATABASE_URL_UNPOOLED` belum diisi untuk environment yang sedang di-build. Wajar pada deploy pertama (langkah 1).                             |
| Build gagal dengan "Missing or invalid environment variables"                                             | `DATABASE_URL` atau `AUTH_SECRET` (minimal 32 karakter) belum diisi untuk environment yang sedang di-build.                                    |
| Variabel sudah diisi tapi deploy masih gagal dengan pesan yang sama                                       | Deploy itu dibuat sebelum variabel diisi. Redeploy.                                                                                            |
| `redirect_uri_mismatch` (Google) atau "The redirect_uri is not associated with this application" (GitHub) | Callback URL di OAuth app tidak sama persis dengan domain yang dibuka. Periksa `https`, domain, dan path `/api/auth/callback/<provider>`.      |
| Halaman login menampilkan pesan `OAuthAccountNotLinked`                                                   | Email itu sudah terdaftar lewat provider lain. Masuk dengan provider yang pertama kali dipakai.                                                |
| `UntrustedHost`                                                                                           | Aplikasi berjalan di luar Vercel tanpa `AUTH_TRUST_HOST=true`.                                                                                 |
| Login berakhir di `/api/auth/error?error=Configuration`                                                   | Auth.js menyembunyikan penyebabnya; lihat tab Logs. `AdapterError` dengan kode `42P01` berarti tabelnya belum ada: lihat baris berikut.        |
| `relation "users" does not exist`                                                                         | Migration belum dijalankan terhadap database itu. Lihat langkah 5.                                                                             |
| Google menolak dengan "Access blocked"                                                                    | Consent screen masih Testing dan akun tersebut bukan test user.                                                                                |
| Data yang diubah langsung di database tidak muncul                                                        | Halaman di-cache per pengguna dan hanya dibatalkan oleh Server Action. Ubah data lewat aplikasi, atau tunggu cache kedaluwarsa (hitungan jam). |
