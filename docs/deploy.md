# Deploy ke Vercel + Neon

Panduan ini membawa Tarékah dari repository ke alamat publik. Urutannya penting: database dulu, lalu OAuth, baru Vercel, karena Vercel butuh nilai dari dua yang pertama.

Yang dibutuhkan: akun [Vercel](https://vercel.com), akun [Neon](https://neon.tech), akun GitHub, dan project Google Cloud.

## 1. Database di Neon

1. Buat project baru di Neon. Pilih region terdekat dengan region Vercel yang akan dipakai (untuk pengguna di Indonesia: Singapore di keduanya).
2. Buka **Connect** dan salin dua connection string:
   - **Pooled** (host mengandung `-pooler`) untuk `DATABASE_URL`. Dipakai aplikasi saat berjalan.
   - **Direct** (tanpa `-pooler`) untuk `DATABASE_URL_UNPOOLED`. Dipakai untuk migration.

Kalau project dihubungkan lewat integrasi Neon di Vercel Marketplace, kedua variabel itu diisi otomatis dengan nama yang sama, dan setiap preview deployment mendapat branch database sendiri.

## 2. OAuth untuk production

Buat kredensial terpisah dari yang dipakai di lokal. GitHub hanya menerima satu callback URL per OAuth app, jadi app lokal tidak bisa dipakai ulang.

Ganti `<domain>` dengan domain production, misalnya `tarekah.vercel.app`.

**GitHub** — Settings → Developer settings → OAuth Apps → New OAuth App

- Homepage URL: `https://<domain>`
- Authorization callback URL: `https://<domain>/api/auth/callback/github`

**Google** — Google Cloud Console → APIs & Services → Credentials → Create credentials → OAuth client ID → Web application

- Authorized JavaScript origins: `https://<domain>`
- Authorized redirect URIs: `https://<domain>/api/auth/callback/google`
- Di **OAuth consent screen**, ubah status dari Testing ke In production. Selama masih Testing, hanya akun yang didaftarkan sebagai test user yang bisa masuk.

Domain baru diketahui setelah deploy pertama. Dua jalan: tentukan nama project Vercel lebih dulu (domainnya `<nama-project>.vercel.app`), atau deploy dulu lalu perbarui callback URL sesudahnya.

## 3. Project di Vercel

1. **Add New → Project**, impor repository GitHub. Framework terdeteksi sebagai Next.js; biarkan pengaturan build default kecuali yang disebut di langkah 4.
2. Isi **Environment Variables** untuk environment Production:

   | Variabel                               | Nilai                                                              |
   | -------------------------------------- | ------------------------------------------------------------------ |
   | `DATABASE_URL`                         | Neon, pooled                                                       |
   | `DATABASE_URL_UNPOOLED`                | Neon, direct                                                       |
   | `AUTH_SECRET`                          | Hasil `npx auth secret`. Buat yang baru, jangan pakai milik lokal. |
   | `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET` | Dari OAuth app production                                          |
   | `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | Dari OAuth client production                                       |

   `AUTH_TRUST_HOST` tidak perlu diisi: Auth.js mempercayai host secara otomatis di Vercel. `AUTH_URL` juga tidak perlu.

3. Jangan deploy dulu sebelum langkah 4 selesai, supaya tabel sudah ada saat aplikasi pertama kali dibuka.

## 4. Migration

Pilih salah satu.

**Otomatis di setiap deploy (disarankan).** Di Settings → Build and Deployment, ubah Build Command menjadi:

```bash
npm run db:migrate && npm run build
```

Migration yang belum jalan diterapkan sebelum build. Kalau migration gagal, deploy gagal dan versi lama tetap melayani. Dengan integrasi Neon, preview deployment memigrasi branch database miliknya sendiri, bukan production.

**Manual dari lokal.** Jalankan dengan connection string direct milik production:

```bash
DATABASE_URL_UNPOOLED='postgres://…' npm run db:migrate
```

Nilai di environment mengalahkan `.env.local`. Ingat untuk mengulanginya setiap kali ada migration baru, sebelum kode yang membutuhkannya di-deploy.

Di kedua cara, migration harus kompatibel dengan kode yang sedang berjalan: tambah kolom dulu, hapus kolom di deploy berikutnya.

## 5. Deploy dan periksa

Deploy, lalu periksa di alamat production:

- [ ] Halaman depan terbuka; `/dashboard` tanpa login mengalihkan ke `/login`.
- [ ] Masuk dengan GitHub berhasil dan mendarat di dashboard.
- [ ] Masuk dengan Google berhasil.
- [ ] Menambah lamaran, memindahkannya di board, dan melihat riwayat statusnya di halaman detail.
- [ ] Export CSV mengunduh berkas.
- [ ] Keluar, lalu `/dashboard` kembali mengalihkan ke `/login`.
- [ ] Tab Logs di Vercel tidak menampilkan error.

Setelah itu, tambahkan alamatnya di bagian Demo pada `README.md`.

## Preview deployment

Login OAuth tidak berfungsi di URL preview (`<project>-<hash>.vercel.app`) karena callback URL-nya tidak terdaftar di GitHub dan Google. Preview tetap berguna untuk memeriksa build dan halaman publik. Kalau butuh login di preview, daftarkan satu domain preview tetap (branch domain) sebagai callback di OAuth app tersendiri dan isi variabelnya untuk environment Preview.

## Memakai Supabase

Aplikasi berbicara dengan PostgreSQL biasa lewat driver `pg`, jadi Supabase bisa menggantikan Neon tanpa perubahan kode. Yang berbeda hanya connection string, di Supabase pada **Connect**:

| Variabel                | Supabase                                                                          |
| ----------------------- | --------------------------------------------------------------------------------- |
| `DATABASE_URL`          | Transaction pooler (port `6543`)                                                  |
| `DATABASE_URL_UNPOOLED` | Direct connection (port `5432`). Kalau jaringan hanya IPv4, pakai Session pooler. |

Fitur Supabase lain (Auth, Row Level Security, Storage) tidak dipakai: login tetap lewat Auth.js dan isolasi data tetap dijaga di query. Konfigurasi ini belum diuji di project ini; yang diuji adalah Neon dan PostgreSQL 17 biasa.

## Masalah yang sering muncul

| Gejala                                                                                                    | Penyebab dan perbaikan                                                                                                                         |
| --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `redirect_uri_mismatch` (Google) atau "The redirect_uri is not associated with this application" (GitHub) | Callback URL di OAuth app tidak sama persis dengan domain yang dibuka. Periksa `https`, domain, dan path `/api/auth/callback/<provider>`.      |
| Halaman login menampilkan pesan `OAuthAccountNotLinked`                                                   | Email itu sudah terdaftar lewat provider lain. Masuk dengan provider yang pertama kali dipakai.                                                |
| `UntrustedHost`                                                                                           | Aplikasi berjalan di luar Vercel tanpa `AUTH_TRUST_HOST=true`.                                                                                 |
| Build gagal dengan "Missing or invalid environment variables"                                             | `DATABASE_URL` atau `AUTH_SECRET` (minimal 32 karakter) belum diisi untuk environment yang sedang di-build.                                    |
| `relation "users" does not exist`                                                                         | Migration belum dijalankan terhadap database itu. Lihat langkah 4.                                                                             |
| Google menolak dengan "Access blocked"                                                                    | Consent screen masih Testing dan akun tersebut bukan test user.                                                                                |
| Data yang diubah langsung di database tidak muncul                                                        | Halaman di-cache per pengguna dan hanya dibatalkan oleh Server Action. Ubah data lewat aplikasi, atau tunggu cache kedaluwarsa (hitungan jam). |
