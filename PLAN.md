# PLAN.md — Tarékah

Job Application Tracker. Dokumen ini memuat rancangan skema database, daftar route, dan rencana fase. Konvensi kode ada di `CLAUDE.md`.

Status: **Fase 0 sampai 3 dan Fase 4 selesai.** Skema di bawah sudah diterapkan lewat `drizzle/0000_init.sql` dan `drizzle/0001_follow_up.sql`. Berikutnya: Fase 3b.

## Keputusan

| Hal        | Pilihan                                                                   | Alasan                                                                                                |
| ---------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Database   | Neon (PostgreSQL)                                                         | Serverless, cocok dengan Vercel, branch DB per preview                                                |
| Driver     | `pg` (node-postgres) + `attachDatabasePool`                               | Rekomendasi Neon untuk Vercel Fluid compute; mendukung transaksi untuk ubah status beserta riwayatnya |
| Auth       | Auth.js v5, GitHub + Google, database session                             | Session bisa dicabut dari server; `userId` selalu berasal dari DB                                     |
| Dokumen CV | Metadata + link eksternal                                                 | Tanpa storage file; upload bisa ditambah nanti tanpa mengubah relasi                                  |
| Perusahaan | Tabel sendiri                                                             | Kontak menempel ke perusahaan; beberapa lamaran ke perusahaan yang sama tergabung                     |
| Follow-up  | Diturunkan dari `status_changed_at` dan `last_followed_up_at` saat dibaca | Tidak ada flag yang bisa basi, tidak butuh cron                                                       |
| Pengaturan | Tabel `user_settings`, baris opsional                                     | `users` mengikuti bentuk adapter Auth.js; user tanpa baris memakai default                            |

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

| Kolom            | Tipe                                  | Keterangan                   |
| ---------------- | ------------------------------------- | ---------------------------- |
| `application_id` | uuid not null → applications, cascade |                              |
| `scheduled_at`   | timestamptz not null                  |                              |
| `stage`          | `interview_stage` not null            |                              |
| `interviewers`   | text                                  | nama dan jabatan, teks bebas |
| `questions`      | text                                  |                              |
| `reflection`     | text                                  |                              |

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
- **Isolasi.** FK tidak menjamin baris yang dirujuk milik user yang sama, jadi action memeriksa kepemilikan `company_id`, `*_document_id`, `application_id`, `contact_id` sebelum insert atau update.

### Query dashboard

Tidak ada tabel agregat; semua dihitung saat dibaca dan di-cache per user.

- **Funnel:** `count(distinct application_id)` per `to_status` dari `application_status_events`.
- **Response rate per sumber:** lamaran yang punya event ke `screening`, `technical_test`, `interview`, `offer` atau `rejected`, dibagi lamaran yang punya event ke `applied`, dikelompokkan per `applications.source`.
- **Lamaran per minggu:** `count(*)` per `date_trunc('week', applied_at)`.

## Route

| Route                     | Akses  | Isi                                                                                                                                   |
| ------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| `/`                       | publik | Landing page                                                                                                                          |
| `/login`                  | publik | Tombol masuk GitHub dan Google                                                                                                        |
| `/api/auth/[...nextauth]` | publik | Handler Auth.js                                                                                                                       |
| `/dashboard`              | login  | Panel "Perlu Follow-up" (sudah ada); funnel, response rate per sumber, lamaran per minggu (fase 8)                                    |
| `/board`                  | login  | Kanban: kolom per status, drag-and-drop antar kolom mengubah status dan menulis riwayat; kolom Ditolak dan Tanpa kabar bisa diciutkan |
| `/applications`           | login  | Tabel dengan filter status/sumber/tipe kerja, pencarian, sort                                                                         |
| `/applications/new`       | login  | Form lamaran baru                                                                                                                     |
| `/applications/[id]`      | login  | Detail: data lamaran, ubah status, riwayat status, interview, kontak, dokumen yang dipakai                                            |
| `/applications/[id]/edit` | login  | Form edit                                                                                                                             |
| `/companies`              | login  | Daftar perusahaan dengan jumlah lamaran                                                                                               |
| `/companies/[id]`         | login  | Detail perusahaan: lamaran dan kontak                                                                                                 |
| `/contacts`               | login  | Daftar dan kelola kontak                                                                                                              |
| `/documents`              | login  | Versi CV dan cover letter, jumlah pemakaian per versi                                                                                 |
| `/settings`               | login  | Profil, batas hari follow-up dan saran Tanpa kabar, keluar, hapus akun                                                                |

Interview, kontak per lamaran, dan perubahan status dikelola di halaman detail lamaran lewat dialog, tanpa route sendiri.

## Fase pengerjaan

| Fase | Isi                                                                                                                                   | Selesai bila                                                    |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| 0    | Tooling (Drizzle, Auth.js, Zod, Prettier), `CLAUDE.md`, `PLAN.md`                                                                     | lint, typecheck, format, build lolos                            |
| 1    | Fondasi: `src/db/schema`, migration pertama, client Drizzle, `src/auth.ts`, `requireUser`, proxy, `env.ts`, app shell dengan navigasi | Login GitHub dan Google jalan, route `(app)` menolak tamu       |
| 2    | Lamaran: CRUD, pilih atau buat perusahaan dari form, ubah status dengan riwayat, tabel dengan filter, sort, pencarian                 | Lamaran bisa dibuat, diubah, dihapus; riwayat status tercatat   |
| 3    | Board: halaman `/board` dengan drag-and-drop (dnd-kit), optimistic update dengan rollback, timeline riwayat di detail                 | Kartu bisa dipindah antar kolom; riwayat status tercatat        |
| 3b   | Daftar: filter dan sort di URL                                                                                                        | Filter dan sort bertahan saat halaman dimuat ulang              |
| 4    | Follow-up: batas hari per user, penanda di board/tabel/detail, panel "Perlu Follow-up", saran Tanpa kabar, tombol "Sudah follow-up"   | Lamaran lama tanpa perubahan tertandai dan bisa ditindaklanjuti |
| 5    | Dokumen: kelola versi CV dan cover letter, pilih versi per lamaran                                                                    | Versi yang dipakai tampil di detail lamaran                     |
| 6    | Catatan interview per lamaran                                                                                                         | CRUD interview di halaman detail                                |
| 7    | Kontak: CRUD, tautan ke perusahaan dan lamaran, halaman perusahaan                                                                    | Kontak tampil di detail lamaran dan perusahaan                  |
| 8    | Dashboard statistik                                                                                                                   | Tiga grafik tampil dari data nyata                              |
| 9    | Polish: empty/loading/error state, data demo, test Vitest untuk schema Zod dan logika murni, README portfolio, deploy Vercel + Neon   | Aplikasi live dan bisa didemokan                                |

Setiap fase ditutup dengan `npm run lint && npm run typecheck && npm run format:check && npm run build`.
