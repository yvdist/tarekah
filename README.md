# Tarékah

Pelacak lamaran kerja. Catat setiap lamaran dari wishlist sampai offer, lihat mana yang perlu di-follow-up, simpan catatan interview, dan ukur sumber lowongan serta versi CV mana yang paling sering direspons.

Setiap pengguna masuk dengan akun GitHub atau Google dan hanya melihat datanya sendiri.

![Dashboard](docs/screenshots/dashboard-light.png)

|                                                           |                                                           |
| --------------------------------------------------------- | --------------------------------------------------------- |
| ![Board](docs/screenshots/board-light.png)                | ![Detail lamaran](docs/screenshots/application-light.png) |
| ![Tabel lamaran](docs/screenshots/applications-light.png) | ![Board, tema gelap](docs/screenshots/board-dark.png)     |

Screenshot dibuat otomatis dari data contoh (`npm run screenshots`).

## Demo

Belum ada alamat publik. Langkah deploy ada di [`docs/deploy.md`](docs/deploy.md); tautannya ditambahkan di sini setelah aplikasi live.

## Fitur

- **Lamaran.** Posisi, perusahaan, sumber lowongan, rentang gaji, tipe kerja, lokasi, link loker, catatan. Tabel dengan pencarian, filter dan sort.
- **Board kanban.** Satu kolom per status. Kartu dipindah dengan drag-and-drop, sentuhan, atau keyboard (Spasi, panah, Spasi). Setiap perpindahan tercatat di riwayat status.
- **Follow-up.** Lamaran yang terlalu lama tanpa kabar ditandai, dengan batas hari yang bisa diatur. Setelah lebih lama lagi, aplikasi menyarankan memindahkannya ke "Tanpa kabar"; pemindahan selalu lewat klik, tidak otomatis.
- **Versi CV dan cover letter.** Catat versi mana yang dipakai di tiap lamaran, lalu bandingkan response rate antarversi.
- **Catatan interview.** Jadwal, tahap, pewawancara, pertanyaan dan refleksi dalam markdown. Halaman Pertanyaan mengumpulkan semua pertanyaan dari seluruh lamaran dan bisa dicari.
- **Kontak.** Recruiter, pemberi referral dan hiring manager, terhubung ke perusahaan dan lamaran.
- **Dashboard.** Funnel per tahap, response rate dan conversion ke interview per sumber dan per versi CV, rata-rata waktu respons, jumlah lamaran per minggu, dengan filter rentang tanggal.
- **Export CSV.** Semua lamaran dengan kolom lengkap, aman dibuka di spreadsheet.
- **Tema terang dan gelap**, mengikuti sistem atau dipilih sendiri.

## Stack

Next.js 16 (App Router, Cache Components) · React 19 · TypeScript strict · Tailwind CSS v4 · shadcn/ui di atas Base UI · PostgreSQL di Neon · Drizzle ORM · Auth.js v5 · Zod 4 · Vitest · Playwright · Vercel.

### Alasan pemilihan

| Pilihan                                     | Alasan                                                                                                                                                                                           |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Next.js App Router dengan Server Components | Data diambil di server dan dikirim sebagai HTML; JavaScript di browser hanya untuk bagian yang interaktif (form, board, grafik).                                                                 |
| Server Actions + Zod                        | Satu skema dipakai form dan server. Server memvalidasi ulang semua masukan, termasuk id, dan mengembalikan kesalahan sebagai data agar bisa ditampilkan di samping field.                        |
| Cache Components                            | Hasil query di-cache per pengguna dengan tag `<domain>:<userId>` dan dibatalkan oleh action yang mengubahnya. Nilai yang bergantung pada jam (hari sejak status berubah) dihitung di luar cache. |
| Neon (PostgreSQL)                           | Serverless, cocok dengan Vercel, dan bisa membuat branch database per preview.                                                                                                                   |
| `pg` + `attachDatabasePool`                 | Rekomendasi Neon untuk Vercel Fluid compute, dan mendukung transaksi: perubahan status dan baris riwayatnya ditulis bersama.                                                                     |
| Drizzle ORM                                 | Skema dalam TypeScript, tipe baris diturunkan dari tabel, migration berupa SQL yang bisa dibaca dan di-review. Agregasi dashboard tetap ditulis sebagai SQL.                                     |
| Auth.js dengan database session             | Session bisa dicabut dari server, dan `userId` selalu berasal dari database, bukan dari token yang dipegang browser.                                                                             |
| Follow-up diturunkan saat dibaca            | Dihitung dari `status_changed_at` dan `last_followed_up_at`, jadi tidak ada flag yang bisa basi dan tidak perlu cron.                                                                            |
| Dokumen sebagai metadata + link             | Tanpa penyimpanan berkas. Upload bisa ditambahkan nanti tanpa mengubah relasi.                                                                                                                   |
| Vitest + PGlite                             | Agregasi statistik ada di SQL, jadi diuji terhadap Postgres sungguhan yang berjalan di dalam proses test, dengan migration asli, tanpa server database.                                          |

## Arsitektur singkat

```
src/
  app/                  route; berkasnya tipis, hanya menyusun komponen
  features/<domain>/
    queries.ts          baca data (server-only)
    actions.ts          Server Actions
    schemas.ts          skema Zod, dipakai form dan action
    components/
  db/schema/            tabel dan enum Drizzle
  components/           komponen bersama dan shadcn/ui
```

Isolasi data antar pengguna dijaga di satu tempat: hanya `queries.ts` dan `actions.ts` yang boleh mengimpor klien database, user id hanya berasal dari session, dan setiap query memfilter `user_id`. Baris milik orang lain diperlakukan sebagai tidak ditemukan. Sebelum menyimpan baris yang merujuk baris lain (perusahaan, dokumen, lamaran, kontak), action memeriksa bahwa baris yang dirujuk milik pengguna yang sama.

Rancangan lengkap ada di [`PLAN.md`](PLAN.md), konvensi kode di [`CLAUDE.md`](CLAUDE.md).

## Skema database

```mermaid
erDiagram
    users ||--o{ accounts : "login OAuth"
    users ||--o{ sessions : "session"
    users ||--o| user_settings : "pengaturan"
    users ||--o{ companies : "memiliki"
    users ||--o{ documents : "memiliki"
    users ||--o{ applications : "memiliki"
    users ||--o{ contacts : "memiliki"
    companies ||--o{ applications : "dilamar"
    companies |o--o{ contacts : "bekerja di"
    documents |o--o{ applications : "CV / cover letter"
    applications ||--o{ application_status_events : "riwayat status"
    applications ||--o{ interviews : "interview"
    applications ||--o{ application_contacts : ""
    contacts ||--o{ application_contacts : ""

    users {
        text id PK
        text name
        text email UK
        timestamptz created_at
    }
    user_settings {
        text user_id PK
        int follow_up_after_days
        int ghosted_after_days
    }
    companies {
        uuid id PK
        text user_id FK
        text name
        text website
    }
    documents {
        uuid id PK
        text user_id FK
        document_type type
        text label
        text url
        boolean is_archived
    }
    applications {
        uuid id PK
        text user_id FK
        uuid company_id FK
        text position
        job_source source
        application_status status
        timestamptz status_changed_at
        timestamptz last_followed_up_at
        date applied_at
        int salary_min
        int salary_max
        uuid cv_document_id FK
        uuid cover_letter_document_id FK
    }
    application_status_events {
        uuid id PK
        uuid application_id FK
        application_status from_status
        application_status to_status
        timestamptz changed_at
    }
    interviews {
        uuid id PK
        uuid application_id FK
        timestamptz scheduled_at
        interview_stage stage
        text questions
        text reflection
    }
    contacts {
        uuid id PK
        text user_id FK
        uuid company_id FK
        text name
        contact_role role
    }
    application_contacts {
        uuid application_id PK
        uuid contact_id PK
        text user_id FK
    }
```

Setiap tabel domain, termasuk tabel anak dan tabel penghubung, punya `user_id`. Kolom dan indeks lengkap ada di [`PLAN.md`](PLAN.md#skema-database).

## Setup lokal

Prasyarat: Node.js 20.9 atau lebih baru, project [Neon](https://neon.tech), OAuth app GitHub dan OAuth client Google.

1. Pasang dependensi.

   ```bash
   npm install
   ```

2. Salin berkas environment, lalu isi.

   ```bash
   cp .env.example .env.local
   ```

   | Variabel                               | Sumber                                                                                                                                                               |
   | -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
   | `DATABASE_URL`                         | Neon, connection string **pooled** (host mengandung `-pooler`). Dipakai aplikasi saat berjalan.                                                                      |
   | `DATABASE_URL_UNPOOLED`                | Neon, connection string **direct**. Dipakai drizzle-kit untuk migration dan oleh script seed.                                                                        |
   | `AUTH_SECRET`                          | Jalankan `npx auth secret`.                                                                                                                                          |
   | `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET` | GitHub → Settings → Developer settings → OAuth Apps. Callback URL: `http://localhost:3000/api/auth/callback/github`.                                                 |
   | `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | Google Cloud Console → APIs & Services → Credentials → OAuth client ID (Web application). Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`. |

3. Terapkan migration.

   ```bash
   npm run db:migrate
   ```

4. Jalankan server pengembangan, lalu buka <http://localhost:3000>.

   ```bash
   npm run dev
   ```

5. Opsional: isi akun dengan data contoh. Masuk sekali lebih dulu agar akunnya ada, lalu:

   ```bash
   npm run db:seed -- email@kamu.com
   ```

   Script menolak berjalan kalau akun itu sudah punya data, kecuali diberi `--reset`, yang menghapus data akun tersebut lebih dulu. Restart server sesudahnya, karena halaman yang ter-cache tidak tahu ada data baru.

`npm run start` (mode produksi di luar Vercel) juga butuh `AUTH_TRUST_HOST=true`, kalau tidak Auth.js menolak request dengan `UntrustedHost`.

## Test

```bash
npm test            # unit test (Vitest), tanpa database eksternal
npm run test:e2e    # end-to-end (Playwright)
```

**Unit test** mencakup perhitungan follow-up, rentang tanggal dashboard, formatter, pembuat CSV dan semua skema Zod. Agregasi statistik diuji terhadap PGlite, Postgres yang berjalan di dalam proses test dengan migration asli.

**End-to-end** mencakup penjagaan login, menambah lamaran, export CSV, memindah kartu di board dengan mouse dan keyboard, serta pemeriksaan aksesibilitas (axe) di tema terang dan gelap.

Test end-to-end membuat dan menghapus pengguna, jadi wajib memakai database terpisah, misalnya Postgres sekali-pakai di Docker:

```bash
docker run -d --rm --name tarekah-e2e -e POSTGRES_PASSWORD=postgres -p 54329:5432 postgres:17
echo 'E2E_DATABASE_URL=postgres://postgres:postgres@localhost:54329/postgres' > .env.e2e
npx playwright install chromium
npm run test:e2e
```

Branch Neon tersendiri juga bisa. Jangan arahkan `E2E_DATABASE_URL` ke database di `.env.local`. Migration diterapkan oleh setup test. Login lewat OAuth tidak bisa diotomasi, jadi setup menulis satu pengguna dan satu baris session langsung ke database itu.

GitHub Actions menjalankan lint, typecheck, format, unit test, build dan end-to-end di setiap push ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)).

## Script

| Perintah                               | Fungsi                                                  |
| -------------------------------------- | ------------------------------------------------------- |
| `npm run dev`                          | Server pengembangan                                     |
| `npm run build`                        | Build produksi                                          |
| `npm run start`                        | Menjalankan build produksi                              |
| `npm run lint`                         | ESLint                                                  |
| `npm run typecheck`                    | `next typegen` lalu `tsc --noEmit`                      |
| `npm run format`                       | Prettier, menulis perubahan                             |
| `npm run format:check`                 | Prettier, hanya memeriksa                               |
| `npm test`                             | Unit test                                               |
| `npm run test:watch`                   | Unit test, mode watch                                   |
| `npm run test:e2e`                     | Test end-to-end                                         |
| `npm run screenshots`                  | Membuat ulang screenshot README dari data contoh        |
| `npm run db:generate`                  | Membuat migration SQL dari perubahan di `src/db/schema` |
| `npm run db:migrate`                   | Menerapkan migration yang belum jalan                   |
| `npm run db:studio`                    | Drizzle Studio                                          |
| `npm run db:seed -- <email> [--reset]` | Data contoh untuk satu akun yang sudah ada              |

## Mengubah skema

Ubah `src/db/schema/*`, jalankan `npm run db:generate`, periksa SQL yang dihasilkan, jalankan `npm run db:migrate`, lalu commit skema dan folder `drizzle/` bersama-sama. Jangan pakai `drizzle-kit push` dan jangan mengubah migration yang sudah diterapkan.

## Deploy

Panduan Vercel + Neon, dengan catatan untuk Supabase: [`docs/deploy.md`](docs/deploy.md).
