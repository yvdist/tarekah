# PLAN.md — Tarékah

Job Application Tracker. Dokumen ini memuat rancangan skema database, daftar route, dan rencana fase. Konvensi kode ada di `CLAUDE.md`.

Status: **Fase 0 sampai 3 dan Fase 4 sampai 6 selesai.** Skema di bawah sudah diterapkan lewat `drizzle/0000_init.sql` dan `drizzle/0001_follow_up.sql`. Berikutnya: Fase 3b.

## Keputusan

| Hal                  | Pilihan                                                                   | Alasan                                                                                                |
| -------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Database             | Neon (PostgreSQL)                                                         | Serverless, cocok dengan Vercel, branch DB per preview                                                |
| Driver               | `pg` (node-postgres) + `attachDatabasePool`                               | Rekomendasi Neon untuk Vercel Fluid compute; mendukung transaksi untuk ubah status beserta riwayatnya |
| Auth                 | Auth.js v5, GitHub + Google, database session                             | Session bisa dicabut dari server; `userId` selalu berasal dari DB                                     |
| Dokumen CV           | Metadata + link eksternal                                                 | Tanpa storage file; upload bisa ditambah nanti tanpa mengubah relasi                                  |
| Perusahaan           | Tabel sendiri                                                             | Kontak menempel ke perusahaan; beberapa lamaran ke perusahaan yang sama tergabung                     |
| Follow-up            | Diturunkan dari `status_changed_at` dan `last_followed_up_at` saat dibaca | Tidak ada flag yang bisa basi, tidak butuh cron                                                       |
| Pengaturan           | Tabel `user_settings`, baris opsional                                     | `users` mengikuti bentuk adapter Auth.js; user tanpa baris memakai default                            |
| Pertanyaan interview | Teks markdown di `interviews.questions`, satu pertanyaan per baris        | Cukup satu textarea; `/questions` memecahnya per butir saat dibaca, tanpa tabel baru                  |
| Markdown             | `react-markdown` lewat `src/components/markdown.tsx`                      | HTML mentah tidak dirender; elemen dibatasi; dirender di server                                       |

## Skema database

### Konvensi

- Tabel domain: `id uuid primary key default gen_random_uuid()`.
- Setiap tabel domain punya `user_id text not null references users(id) on delete cascade`, termasuk tabel anak dan tabel penghubung. Semua query difilter dengan kolom ini.
- `created_at timestamptz not null default now()` dan `updated_at timestamptz not null default now()` (diperbarui lewat `$onUpdate`), kecuali disebut lain.
- Nama tabel dan kolom snake_case.

### Enum

| Enum                 | Nilai                                                                                             |
| -------------------- | ------------------------------------------------------------------------------------------------- |
| `application_status` | `wishlist`, `applied`, `screening`, `technical_test`, `interview`, `offer`, `rejected`, `ghosted` |
| `job_source`         | `linkedin`, `glints`, `kalibrr`, `jobstreet`, `referral`, `other`                                 |
| `work_type`          | `onsite`, `hybrid`, `remote`                                                                      |
| `document_type`      | `cv`, `cover_letter`                                                                              |
| `interview_stage`    | `hr`, `technical`, `user`, `final`, `other`                                                       |
| `contact_role`       | `recruiter`, `referral`, `hiring_manager`, `other`                                                |

### Tabel Auth.js

Bentuk mengikuti `@auth/drizzle-adapter` untuk PostgreSQL. `verification_tokens` dan `authenticators` tidak dibuat karena login hanya lewat OAuth.

**`users`**

| Kolom            | Tipe                 | Keterangan                      |
| ---------------- | -------------------- | ------------------------------- |
| `id`             | text PK              | UUID dari `crypto.randomUUID()` |
| `name`           | text                 |                                 |
| `email`          | text unique          |                                 |
| `email_verified` | timestamptz          |                                 |
| `image`          | text                 |                                 |
| `created_at`     | timestamptz not null |                                 |

**`accounts`** — PK (`provider`, `provider_account_id`); index (`user_id`)

| Kolom                                                                               | Tipe                           |
| ----------------------------------------------------------------------------------- | ------------------------------ |
| `user_id`                                                                           | text not null → users, cascade |
| `type`, `provider`, `provider_account_id`                                           | text not null                  |
| `refresh_token`, `access_token`, `token_type`, `scope`, `id_token`, `session_state` | text                           |
| `expires_at`                                                                        | integer                        |

**`sessions`** — index (`user_id`)

| Kolom           | Tipe                           |
| --------------- | ------------------------------ |
| `session_token` | text PK                        |
| `user_id`       | text not null → users, cascade |
| `expires`       | timestamptz not null           |

### Tabel domain

**`companies`**

| Kolom     | Tipe          | Keterangan |
| --------- | ------------- | ---------- |
| `name`    | text not null |            |
| `website` | text          |            |
| `notes`   | text          |            |

Index: unique (`user_id`, `lower(name)`).

**`documents`** — versi CV dan cover letter

| Kolom         | Tipe                           | Keterangan                                                 |
| ------------- | ------------------------------ | ---------------------------------------------------------- |
| `type`        | `document_type` not null       |                                                            |
| `label`       | text not null                  | contoh: "CV Backend v3"                                    |
| `url`         | text                           | link Google Drive atau sejenisnya                          |
| `notes`       | text                           | apa yang berubah di versi ini                              |
| `is_archived` | boolean not null default false | disembunyikan dari pilihan, tetap tercatat di lamaran lama |

Index: unique (`user_id`, `type`, `label`).

**`applications`**

| Kolom                      | Tipe                                             | Keterangan                                                 |
| -------------------------- | ------------------------------------------------ | ---------------------------------------------------------- |
| `company_id`               | uuid not null → companies, restrict              | perusahaan yang masih punya lamaran tidak bisa dihapus     |
| `position`                 | text not null                                    |                                                            |
| `job_url`                  | text                                             | link loker                                                 |
| `source`                   | `job_source` not null                            |                                                            |
| `source_detail`            | text                                             | nama pemberi referral atau sumber lain                     |
| `salary_min`, `salary_max` | integer                                          |                                                            |
| `salary_currency`          | char(3) not null default `'IDR'`                 |                                                            |
| `location`                 | text                                             |                                                            |
| `work_type`                | `work_type`                                      |                                                            |
| `applied_at`               | date                                             | kosong selama masih wishlist                               |
| `status`                   | `application_status` not null default `wishlist` | status saat ini                                            |
| `status_changed_at`        | timestamptz not null default now()               | disalin dari event terakhir; dasar penanda follow-up       |
| `follow_up_snoozed_until`  | date                                             | untuk snooze; belum dipakai                                |
| `last_followed_up_at`      | timestamptz                                      | diisi tombol "Sudah follow-up"; mereset hitungan follow-up |
| `cv_document_id`           | uuid → documents, set null                       | versi CV yang dipakai                                      |
| `cover_letter_document_id` | uuid → documents, set null                       | versi cover letter yang dipakai                            |
| `notes`                    | text                                             |                                                            |

Index: (`user_id`, `status`), (`user_id`, `status_changed_at`), (`user_id`, `applied_at`), (`user_id`, `source`), (`company_id`).
Check: `salary_min <= salary_max` bila keduanya terisi; `salary_min >= 0`.

**`application_status_events`** — riwayat status, hanya ditambah, tanpa `updated_at`

| Kolom            | Tipe                                  | Keterangan               |
| ---------------- | ------------------------------------- | ------------------------ |
| `application_id` | uuid not null → applications, cascade |                          |
| `from_status`    | `application_status`                  | null untuk event pertama |
| `to_status`      | `application_status` not null         |                          |
| `changed_at`     | timestamptz not null default now()    | bisa diisi mundur        |
| `note`           | text                                  |                          |

Index: (`application_id`, `changed_at`), (`user_id`, `to_status`).

**`interviews`**

| Kolom            | Tipe                                  | Keterangan                          |
| ---------------- | ------------------------------------- | ----------------------------------- |
| `application_id` | uuid not null → applications, cascade |                                     |
| `scheduled_at`   | timestamptz not null                  |                                     |
| `stage`          | `interview_stage` not null            |                                     |
| `interviewers`   | text                                  | nama dan jabatan, teks bebas        |
| `questions`      | text                                  | markdown, satu pertanyaan per baris |
| `reflection`     | text                                  | markdown                            |

Index: (`application_id`, `scheduled_at`), (`user_id`, `scheduled_at`).

**`contacts`**

| Kolom                            | Tipe                       | Keterangan |
| -------------------------------- | -------------------------- | ---------- |
| `company_id`                     | uuid → companies, set null |            |
| `name`                           | text not null              |            |
| `role`                           | `contact_role` not null    |            |
| `title`                          | text                       | jabatan    |
| `email`, `phone`, `linkedin_url` | text                       |            |
| `notes`                          | text                       |            |

Index: (`user_id`, `company_id`).

**`application_contacts`** — penghubung many-to-many, tanpa `id` dan `updated_at`

| Kolom            | Tipe                                  |
| ---------------- | ------------------------------------- |
| `application_id` | uuid not null → applications, cascade |
| `contact_id`     | uuid not null → contacts, cascade     |
| `user_id`        | text not null → users, cascade        |

PK (`application_id`, `contact_id`); index (`contact_id`).

**`user_settings`** — satu baris opsional per user, tanpa `id`

| Kolom                  | Tipe                        | Keterangan                             |
| ---------------------- | --------------------------- | -------------------------------------- |
| `user_id`              | text PK → users, cascade    |                                        |
| `follow_up_after_days` | integer not null default 7  | batas hari penanda follow-up           |
| `ghosted_after_days`   | integer not null default 21 | batas hari saran pindah ke Tanpa kabar |

Check: kedua kolom `> 0`. User tanpa baris memakai default (`src/features/settings/constants.ts`).

### Relasi

```
users 1─N companies, documents, applications, contacts, interviews, application_status_events
users 1─1 user_settings                     (opsional)
companies 1─N applications
companies 1─N contacts                      (opsional di sisi contacts)
applications 1─N application_status_events
applications 1─N interviews
applications N─M contacts                   lewat application_contacts
documents 1─N applications                  dua FK: cv_document_id, cover_letter_document_id
```

### Aturan data

- **Riwayat status.** Membuat lamaran menulis satu event (`from_status` null). Mengubah status menulis satu event dan memperbarui `applications.status` serta `status_changed_at` dalam satu transaksi. `applications.status` adalah salinan untuk query cepat; sumber kebenaran riwayat ada di events.
- **Follow-up.** Hanya berlaku untuk `status` `applied`, `screening`, `technical_test`, `interview`. Dihitung di server setiap kali dibaca (`src/features/applications/follow-up.ts`), di luar fungsi ter-cache:
  - Perlu follow-up bila hari sejak yang terbaru antara `status_changed_at` dan `last_followed_up_at` mencapai `follow_up_after_days`.
  - Saran pindah ke `ghosted` bila hari sejak `status_changed_at` mencapai `ghosted_after_days`. Follow-up tidak menundanya; pemindahan selalu lewat klik user, tidak otomatis.
  - `ghosted_after_days` harus lebih besar dari `follow_up_after_days` (divalidasi di form, bukan di database).
  - Snooze (`follow_up_snoozed_until`) belum diterapkan.
- **Dokumen.** Jenis versi tidak bisa diubah setelah dibuat. Versi yang diarsipkan hilang dari pilihan form lamaran, kecuali pada lamaran yang sudah memakainya. Menghapus versi mengosongkan rujukannya di lamaran.
- **Waktu interview.** Diisi dan ditampilkan sebagai WIB.
- **Isolasi.** FK tidak menjamin baris yang dirujuk milik user yang sama, jadi action memeriksa kepemilikan `company_id`, `*_document_id`, `application_id`, `contact_id` sebelum insert atau update.

### Query dashboard

Tidak ada tabel agregat; semua dihitung di SQL saat dibaca (`src/features/dashboard/queries.ts`) dan di-cache per user.

Kohort adalah lamaran dengan `applied_at` di rentang yang dipilih (`?range=30d|90d|ytd` atau `?from=&to=`). Tanpa filter, semua lamaran masuk, termasuk wishlist tanpa tanggal.

Transisi status bebas (mundur, lompat tahap, lamaran dicatat langsung di tahap lanjut), jadi tahap dihitung dari peringkat tertinggi yang pernah dicapai, bukan dari `to_status` satu per satu. Peringkat per event: `applied` 1, `screening` 2, `technical_test` 3, `interview` 4, `offer` 5; `rejected` dan `ghosted` 1; `wishlist` 0. `stage` lamaran adalah `max` peringkat atas semua event-nya.

- **Terkirim:** `stage >= 1`. Penyebut semua rate.
- **Direspons:** punya event ke `screening`, `technical_test`, `interview`, `offer` atau `rejected`. `ghosted` bukan respons.
- **Funnel:** tahap ke-k adalah jumlah lamaran dengan `stage >= k`.
- **Per sumber dan per versi CV:** response rate (direspons / terkirim) dan conversion ke interview (`stage >= 4` / terkirim), dikelompokkan per `applications.source` atau `cv_document_id`.
- **Waktu respons:** rata-rata selisih event `applied` pertama dan event respons pertama sesudahnya. Lamaran tanpa event `applied` atau tanpa respons tidak dihitung.
- **Lamaran per minggu:** `count(*)` per `date_trunc('week', applied_at)` untuk 12 minggu terakhir; minggu kosong diisi lewat `generate_series`. Tidak mengikuti filter.

## Route

| Route                     | Akses  | Isi                                                                                                                                                                   |
| ------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`                       | publik | Landing page                                                                                                                                                          |
| `/login`                  | publik | Tombol masuk GitHub dan Google                                                                                                                                        |
| `/api/auth/[...nextauth]` | publik | Handler Auth.js                                                                                                                                                       |
| `/dashboard`              | login  | Panel "Perlu Follow-up"; statistik dengan filter rentang tanggal di URL: kartu ringkasan, funnel, rate per sumber dan per versi CV, waktu respons, lamaran per minggu |
| `/board`                  | login  | Kanban: kolom per status, drag-and-drop antar kolom mengubah status dan menulis riwayat; kolom Ditolak dan Tanpa kabar bisa diciutkan                                 |
| `/applications`           | login  | Tabel dengan filter status/sumber/tipe kerja, pencarian, sort                                                                                                         |
| `/applications/new`       | login  | Form lamaran baru                                                                                                                                                     |
| `/applications/[id]`      | login  | Detail: data lamaran, ubah status, riwayat status, versi dokumen yang dipakai, catatan interview, kontak terhubung                                                    |
| `/applications/[id]/edit` | login  | Form edit                                                                                                                                                             |
| `/companies`              | login  | Daftar perusahaan dengan jumlah lamaran                                                                                                                               |
| `/companies/[id]`         | login  | Detail perusahaan: lamaran dan kontak (baca saja)                                                                                                                     |
| `/contacts`               | login  | Daftar dan kelola kontak, tautkan ke lamaran                                                                                                                          |
| `/documents`              | login  | Versi CV dan cover letter: tambah, edit, arsipkan, hapus; jumlah pemakaian per versi                                                                                  |
| `/questions`              | login  | Semua pertanyaan interview dari seluruh lamaran; cari (`?q=`) dan filter tahap (`?stage=`) di URL                                                                     |
| `/settings`               | login  | Profil, batas hari follow-up dan saran Tanpa kabar, keluar, hapus akun                                                                                                |

Interview dan perubahan status dikelola di halaman detail lamaran, tanpa route sendiri. Kontak dibuat dan diedit di `/contacts`; di detail lamaran kontak yang ada bisa dihubungkan atau dilepas.

## Fase pengerjaan

| Fase | Isi                                                                                                                                                                 | Selesai bila                                                                                       |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| 0    | Tooling (Drizzle, Auth.js, Zod, Prettier), `CLAUDE.md`, `PLAN.md`                                                                                                   | lint, typecheck, format, build lolos                                                               |
| 1    | Fondasi: `src/db/schema`, migration pertama, client Drizzle, `src/auth.ts`, `requireUser`, proxy, `env.ts`, app shell dengan navigasi                               | Login GitHub dan Google jalan, route `(app)` menolak tamu                                          |
| 2    | Lamaran: CRUD, pilih atau buat perusahaan dari form, ubah status dengan riwayat, tabel dengan filter, sort, pencarian                                               | Lamaran bisa dibuat, diubah, dihapus; riwayat status tercatat                                      |
| 3    | Board: halaman `/board` dengan drag-and-drop (dnd-kit), optimistic update dengan rollback, timeline riwayat di detail                                               | Kartu bisa dipindah antar kolom; riwayat status tercatat                                           |
| 3b   | Daftar: filter dan sort di URL                                                                                                                                      | Filter dan sort bertahan saat halaman dimuat ulang                                                 |
| 4    | Follow-up: batas hari per user, penanda di board/tabel/detail, panel "Perlu Follow-up", saran Tanpa kabar, tombol "Sudah follow-up"                                 | Lamaran lama tanpa perubahan tertandai dan bisa ditindaklanjuti                                    |
| 5    | Dokumen, interview, kontak: versi CV/cover letter dan pilihannya per lamaran; catatan interview ber-markdown; halaman `/questions`; kontak dan tautannya ke lamaran | Versi dokumen, interview dan kontak tampil di detail lamaran; pertanyaan terkumpul dan bisa dicari |
| 6    | Dashboard statistik; halaman perusahaan (`/companies`, `/companies/[id]`); seed data demo (`npm run db:seed`)                                                       | Tiga grafik tampil dari data nyata; perusahaan menampilkan lamaran dan kontaknya                   |
| 7    | Polish: empty/loading/error state, test Vitest untuk schema Zod dan logika murni, README portfolio, deploy Vercel + Neon                                            | Aplikasi live dan bisa didemokan                                                                   |

Setiap fase ditutup dengan `npm run lint && npm run typecheck && npm run format:check && npm run build`.
