# PLAN.md — Tarékah

Job Application Tracker. Dokumen ini memuat rancangan skema database, daftar route, dan rencana fase. Konvensi kode ada di `CLAUDE.md`.

Status: **Fase 0 sampai 8 selesai, kecuali 3b; Fase 9 berjalan (BYOK selesai, latihan singkat belum).** Aplikasi live di <https://tarekah.vercel.app> (v0.1.0). Skema di bawah sudah diterapkan lewat `drizzle/0000_init.sql`, `0001_follow_up.sql`, `0002_interview_prep.sql` dan `0003_byok_practice.sql`. Berikutnya: sisa Fase 9 (halaman Latihan; rancangan di `docs/specs/phase-2-byok-and-short-practice.md`) dan Fase 3b.

## Keputusan

| Hal                   | Pilihan                                                                    | Alasan                                                                                                               |
| --------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Database              | Neon (PostgreSQL)                                                          | Serverless, cocok dengan Vercel, branch DB per preview                                                               |
| Driver                | `pg` (node-postgres) + `attachDatabasePool`                                | Rekomendasi Neon untuk Vercel Fluid compute; mendukung transaksi untuk ubah status beserta riwayatnya                |
| Auth                  | Auth.js v5, GitHub + Google, database session                              | Session bisa dicabut dari server; `userId` selalu berasal dari DB                                                    |
| Dokumen CV            | Metadata + link eksternal                                                  | Tanpa storage file; upload bisa ditambah nanti tanpa mengubah relasi                                                 |
| Perusahaan            | Tabel sendiri                                                              | Kontak menempel ke perusahaan; beberapa lamaran ke perusahaan yang sama tergabung                                    |
| Follow-up             | Diturunkan dari `status_changed_at` dan `last_followed_up_at` saat dibaca  | Tidak ada flag yang bisa basi, tidak butuh cron                                                                      |
| Pengaturan            | Tabel `user_settings`, baris opsional                                      | `users` mengikuti bentuk adapter Auth.js; user tanpa baris memakai default                                           |
| Pertanyaan interview  | Tabel `questions`, ditulis dari editor daftar di form interview            | Tiap pertanyaan punya kategori, kesiapan dan tautan cerita; `interviews.questions` tidak lagi ditulis (lihat Fase 8) |
| Kesiapan pertanyaan   | Enum `not_ready`, `somewhat`, `ready`, dinilai sendiri                     | Tanpa skor dan persentase, sesuai nada aplikasi; ringkasan hanya hitungan "X siap · Y cukup · Z belum siap"          |
| Kompetensi cerita     | Enum `competency` dalam kolom array                                        | Database menolak nilai di luar daftar; filter dilakukan di memori setelah cached read, jadi tanpa GIN index          |
| Pertanyaan vs lamaran | FK `interview_id` dan `application_id` `on delete set null`                | Bank pertanyaan bertahan saat lamaran dihapus, seperti kontak                                                        |
| Markdown              | `react-markdown` lewat `src/components/markdown.tsx`                       | HTML mentah tidak dirender; elemen dibatasi; dirender di server                                                      |
| Test statistik        | Vitest terhadap PGlite, SQL di `src/features/dashboard/stats.ts`           | Agregasi ada di SQL; diuji di Postgres sungguhan dalam proses test, dengan migration asli, tanpa server database     |
| Test end-to-end       | Playwright terhadap database terpisah (`E2E_DATABASE_URL`)                 | Test membuat dan menghapus user; login OAuth tidak bisa diotomasi, jadi setup menulis user dan session langsung      |
| Export                | Route Handler GET `/applications/export`                                   | Hanya membaca; mutasi tetap lewat Server Action                                                                      |
| Tema                  | `next-themes`, class `dark` di `<html>`                                    | Mengikuti sistem sampai pengguna memilih; tanpa kedipan saat dimuat                                                  |
| AI                    | Vercel AI SDK 7, key milik pengguna (Anthropic, OpenAI, Google)            | Tanpa biaya API di sisi aplikasi; semua fitur non-AI tetap jalan tanpa key; butuh Node 22                            |
| Key AI                | AES-256-GCM di server, secret `AI_KEY_ENCRYPTION_KEY`, AAD user + provider | Key tidak pernah kembali ke client (UI hanya 4 karakter terakhir); baris yang disalin ke user lain gagal didekripsi  |
| Panggilan AI          | Server Action, `maxDuration` di page pemanggil                             | Mutasi tetap lewat Server Action; error provider dipetakan ke pesan ramah, log hanya kode dan status                 |
| Mode demo             | Tidak dikerjakan                                                           | Di luar scope: aplikasi untuk dipakai sendiri dulu; data contoh tetap ada lewat `npm run db:seed`                    |

## Skema database

### Konvensi

- Tabel domain: `id uuid primary key default gen_random_uuid()`.
- Setiap tabel domain punya `user_id text not null references users(id) on delete cascade`, termasuk tabel anak dan tabel penghubung. Semua query difilter dengan kolom ini.
- `created_at timestamptz not null default now()` dan `updated_at timestamptz not null default now()` (diperbarui lewat `$onUpdate`), kecuali disebut lain.
- Nama tabel dan kolom snake_case.

### Enum

| Enum                      | Nilai                                                                                                       |
| ------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `application_status`      | `wishlist`, `applied`, `screening`, `technical_test`, `interview`, `offer`, `rejected`, `ghosted`           |
| `job_source`              | `linkedin`, `glints`, `kalibrr`, `jobstreet`, `referral`, `other`                                           |
| `work_type`               | `onsite`, `hybrid`, `remote`                                                                                |
| `document_type`           | `cv`, `cover_letter`                                                                                        |
| `interview_stage`         | `hr`, `technical`, `user`, `final`, `other`                                                                 |
| `contact_role`            | `recruiter`, `referral`, `hiring_manager`, `other`                                                          |
| `competency`              | `ownership`, `conflict`, `failure`, `technical_depth`, `leadership`, `ambiguity`, `collaboration`, `impact` |
| `question_category`       | `behavioral`, `technical_backend`, `system_design`, `ai_llm`, `hr_general`, `other`                         |
| `question_source`         | `interview`, `manual`, `ai` (`ai` dipakai mulai fase latihan)                                               |
| `question_readiness`      | `not_ready`, `somewhat`, `ready`                                                                            |
| `ai_provider`             | `anthropic`, `openai`, `google`                                                                             |
| `practice_mode`           | `drill`, `simulation`                                                                                       |
| `practice_interview_type` | `hr_screening`, `behavioral`, `technical_backend`, `system_design_light`, `ai_builder` (hanya simulasi)     |
| `practice_level`          | `mid`, `senior`                                                                                             |
| `practice_language`       | `id`, `en`                                                                                                  |
| `practice_tone`           | `friendly`, `neutral`, `challenging`                                                                        |
| `practice_session_status` | `in_progress`, `completed`, `abandoned`                                                                     |
| `practice_turn_role`      | `interviewer`, `candidate`, `system_event`                                                                  |

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

| Kolom                      | Tipe                                             | Keterangan                                                  |
| -------------------------- | ------------------------------------------------ | ----------------------------------------------------------- |
| `company_id`               | uuid not null → companies, restrict              | perusahaan yang masih punya lamaran tidak bisa dihapus      |
| `position`                 | text not null                                    |                                                             |
| `job_url`                  | text                                             | link loker                                                  |
| `source`                   | `job_source` not null                            |                                                             |
| `source_detail`            | text                                             | nama pemberi referral atau sumber lain                      |
| `salary_min`, `salary_max` | integer                                          |                                                             |
| `salary_currency`          | char(3) not null default `'IDR'`                 |                                                             |
| `location`                 | text                                             |                                                             |
| `work_type`                | `work_type`                                      |                                                             |
| `applied_at`               | date                                             | kosong selama masih wishlist                                |
| `status`                   | `application_status` not null default `wishlist` | status saat ini                                             |
| `status_changed_at`        | timestamptz not null default now()               | disalin dari event terakhir; dasar penanda follow-up        |
| `follow_up_snoozed_until`  | date                                             | untuk snooze; belum dipakai                                 |
| `last_followed_up_at`      | timestamptz                                      | diisi tombol "Sudah follow-up"; mereset hitungan follow-up  |
| `cv_document_id`           | uuid → documents, set null                       | versi CV yang dipakai                                       |
| `cover_letter_document_id` | uuid → documents, set null                       | versi cover letter yang dipakai                             |
| `notes`                    | text                                             |                                                             |
| `job_description`          | text                                             | teks lowongan yang ditempel; maksimal 20.000 karakter (Zod) |

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

| Kolom            | Tipe                                  | Keterangan                                                                                                                                                 |
| ---------------- | ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `application_id` | uuid not null → applications, cascade |                                                                                                                                                            |
| `scheduled_at`   | timestamptz not null                  |                                                                                                                                                            |
| `stage`          | `interview_stage` not null            |                                                                                                                                                            |
| `interviewers`   | text                                  | nama dan jabatan, teks bebas                                                                                                                               |
| `questions`      | text                                  | lama: markdown, satu pertanyaan per baris. Tidak lagi dibaca atau ditulis sejak tabel `questions`; dihapus di migration terpisah setelah backfill produksi |
| `reflection`     | text                                  | markdown                                                                                                                                                   |

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

| Kolom                  | Tipe                        | Keterangan                                      |
| ---------------------- | --------------------------- | ----------------------------------------------- |
| `user_id`              | text PK → users, cascade    |                                                 |
| `follow_up_after_days` | integer not null default 7  | batas hari penanda follow-up                    |
| `ghosted_after_days`   | integer not null default 21 | batas hari saran pindah ke Tanpa kabar          |
| `active_ai_provider`   | `ai_provider`               | key AI yang sedang dipakai; null bila belum ada |

Check: kedua kolom `> 0`. User tanpa baris memakai default (`src/features/settings/constants.ts`).

**`questions`** — bank pertanyaan interview

| Kolom            | Tipe                                              | Keterangan                                                        |
| ---------------- | ------------------------------------------------- | ----------------------------------------------------------------- |
| `text`           | text not null                                     |                                                                   |
| `category`       | `question_category` not null default `other`      | hasil backfill dan form interview memakai `other`; diubah inline  |
| `source`         | `question_source` not null                        | `interview` dari form interview, `manual` dari halaman Pertanyaan |
| `readiness`      | `question_readiness` not null default `not_ready` | dinilai sendiri, bukan skor                                       |
| `interview_id`   | uuid → interviews, set null                       | diisi untuk `source = interview`                                  |
| `application_id` | uuid → applications, set null                     | lamaran interview-nya, atau pilihan di pertanyaan manual          |
| `notes`          | text                                              |                                                                   |

Index: (`user_id`, `category`), (`user_id`, `readiness`), (`interview_id`), (`application_id`). Pertanyaan bertahan saat interview atau lamaran dihapus; hanya tautannya yang dikosongkan.

**`stories`** — bank pengalaman STAR

| Kolom          | Tipe                    | Keterangan                               |
| -------------- | ----------------------- | ---------------------------------------- |
| `title`        | text not null           |                                          |
| `situation`    | text                    | markdown                                 |
| `task`         | text                    | markdown                                 |
| `action`       | text                    | markdown                                 |
| `result`       | text                    | markdown                                 |
| `competencies` | `competency[]` not null | boleh kosong; filter dilakukan di memori |

Index: (`user_id`).

**`question_stories`** — penghubung many-to-many, tanpa `id` dan `updated_at`

| Kolom         | Tipe                               |
| ------------- | ---------------------------------- |
| `question_id` | uuid not null → questions, cascade |
| `story_id`    | uuid not null → stories, cascade   |
| `user_id`     | text not null → users, cascade     |

PK (`question_id`, `story_id`); index (`story_id`).

**`ai_credentials`** — key API milik pengguna, satu per provider

| Kolom                             | Tipe                       | Keterangan                                            |
| --------------------------------- | -------------------------- | ----------------------------------------------------- |
| `provider`                        | `ai_provider` not null     |                                                       |
| `encrypted_key`, `iv`, `auth_tag` | text not null              | AES-256-GCM, base64                                   |
| `key_version`                     | integer not null default 1 | secret server yang dipakai mengenkripsi; untuk rotasi |
| `key_last4`                       | text not null              | satu-satunya bagian key yang ditampilkan              |
| `model`                           | text not null              | ID model pilihan pengguna                             |

Index: unique (`user_id`, `provider`).

**`practice_sessions`** — satu percobaan latihan, tanpa `created_at` dan `updated_at`

| Kolom                             | Tipe                                                     | Keterangan                                           |
| --------------------------------- | -------------------------------------------------------- | ---------------------------------------------------- |
| `application_id`                  | uuid → applications, set null                            | sesi bertahan saat lamaran dihapus                   |
| `mode`                            | `practice_mode` not null                                 |                                                      |
| `interview_type`, `level`, `tone` | enum masing-masing                                       | hanya simulasi; null untuk drill                     |
| `max_turns`                       | integer                                                  | hanya simulasi; ditegakkan di server                 |
| `language`                        | `practice_language` not null                             |                                                      |
| `status`                          | `practice_session_status` not null default `in_progress` |                                                      |
| `started_at`                      | timestamptz not null default now()                       |                                                      |
| `ended_at`                        | timestamptz                                              |                                                      |
| `summary`                         | jsonb                                                    | ringkasan akhir simulasi; divalidasi Zod saat dibaca |

Index: (`user_id`, `started_at`). Check: bila `mode = 'simulation'`, `interview_type`, `level`, `tone` terisi dan `max_turns > 0`.

**`practice_turns`** — giliran dalam sesi, tanpa `updated_at`

| Kolom         | Tipe                                       | Keterangan                                                |
| ------------- | ------------------------------------------ | --------------------------------------------------------- |
| `session_id`  | uuid not null → practice_sessions, cascade |                                                           |
| `position`    | integer not null                           | urutan dalam sesi                                         |
| `role`        | `practice_turn_role` not null              |                                                           |
| `content`     | text not null                              |                                                           |
| `question_id` | uuid → questions, set null                 |                                                           |
| `feedback`    | jsonb                                      | masukan atas giliran kandidat; divalidasi Zod saat dibaca |

Index: unique (`session_id`, `position`), (`question_id`).

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
users 1─N questions, stories
interviews 1─N questions                    (opsional di sisi questions, set null saat interview dihapus)
applications 1─N questions                  (opsional di sisi questions, set null saat lamaran dihapus)
questions N─M stories                       lewat question_stories
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

| Route                     | Akses  | Isi                                                                                                                                                                                     |
| ------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`                       | publik | Landing page                                                                                                                                                                            |
| `/login`                  | publik | Tombol masuk GitHub dan Google                                                                                                                                                          |
| `/api/auth/[...nextauth]` | publik | Handler Auth.js                                                                                                                                                                         |
| `/dashboard`              | login  | Panel "Perlu Follow-up"; statistik dengan filter rentang tanggal di URL: kartu ringkasan, funnel, rate per sumber dan per versi CV, waktu respons, lamaran per minggu                   |
| `/board`                  | login  | Kanban: kolom per status, drag-and-drop antar kolom mengubah status dan menulis riwayat; kolom Ditolak dan Tanpa kabar bisa diciutkan                                                   |
| `/applications`           | login  | Tabel dengan filter status/sumber/tipe kerja, pencarian, sort                                                                                                                           |
| `/applications/new`       | login  | Form lamaran baru                                                                                                                                                                       |
| `/applications/[id]`      | login  | Detail: data lamaran, ubah status, riwayat status, versi dokumen yang dipakai, catatan interview, kontak terhubung                                                                      |
| `/applications/[id]/edit` | login  | Form edit                                                                                                                                                                               |
| `/applications/export`    | login  | Unduhan CSV semua lamaran dengan kolom lengkap (Route Handler, hanya GET)                                                                                                               |
| `/companies`              | login  | Daftar perusahaan dengan jumlah lamaran                                                                                                                                                 |
| `/companies/[id]`         | login  | Detail perusahaan: lamaran dan kontak (baca saja)                                                                                                                                       |
| `/contacts`               | login  | Daftar dan kelola kontak, tautkan ke lamaran                                                                                                                                            |
| `/documents`              | login  | Versi CV dan cover letter: tambah, edit, arsipkan, hapus; jumlah pemakaian per versi                                                                                                    |
| `/questions`              | login  | Bank pertanyaan: ringkasan kesiapan, cari (`?q=`) dan filter kategori, kesiapan, sumber, lamaran di URL; tambah pertanyaan manual; ubah kategori dan kesiapan inline; tautkan ke cerita |
| `/stories`                | login  | Daftar cerita STAR dengan cari (`?q=`) dan filter kompetensi (`?competency=`)                                                                                                           |
| `/stories/new`            | login  | Form cerita baru                                                                                                                                                                        |
| `/stories/[id]`           | login  | Detail cerita: empat bagian STAR, kompetensi, pertanyaan yang tertaut                                                                                                                   |
| `/stories/[id]/edit`      | login  | Form edit cerita                                                                                                                                                                        |
| `/settings`               | login  | Profil, batas hari follow-up dan saran Tanpa kabar, keluar; bagian AI: simpan key per provider, pilih model, tes key, hapus key                                                         |

Interview dan perubahan status dikelola di halaman detail lamaran, tanpa route sendiri. Kontak dibuat dan diedit di `/contacts`; di detail lamaran kontak yang ada bisa dihubungkan atau dilepas.

## Fase pengerjaan

| Fase | Isi                                                                                                                                                                                                                                                  | Selesai bila                                                                                       |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| 0    | Tooling (Drizzle, Auth.js, Zod, Prettier), `CLAUDE.md`, `PLAN.md`                                                                                                                                                                                    | lint, typecheck, format, build lolos                                                               |
| 1    | Fondasi: `src/db/schema`, migration pertama, client Drizzle, `src/auth.ts`, `requireUser`, proxy, `env.ts`, app shell dengan navigasi                                                                                                                | Login GitHub dan Google jalan, route `(app)` menolak tamu                                          |
| 2    | Lamaran: CRUD, pilih atau buat perusahaan dari form, ubah status dengan riwayat, tabel dengan filter, sort, pencarian                                                                                                                                | Lamaran bisa dibuat, diubah, dihapus; riwayat status tercatat                                      |
| 3    | Board: halaman `/board` dengan drag-and-drop (dnd-kit), optimistic update dengan rollback, timeline riwayat di detail                                                                                                                                | Kartu bisa dipindah antar kolom; riwayat status tercatat                                           |
| 3b   | Daftar: filter dan sort di URL                                                                                                                                                                                                                       | Filter dan sort bertahan saat halaman dimuat ulang                                                 |
| 4    | Follow-up: batas hari per user, penanda di board/tabel/detail, panel "Perlu Follow-up", saran Tanpa kabar, tombol "Sudah follow-up"                                                                                                                  | Lamaran lama tanpa perubahan tertandai dan bisa ditindaklanjuti                                    |
| 5    | Dokumen, interview, kontak: versi CV/cover letter dan pilihannya per lamaran; catatan interview ber-markdown; halaman `/questions`; kontak dan tautannya ke lamaran                                                                                  | Versi dokumen, interview dan kontak tampil di detail lamaran; pertanyaan terkumpul dan bisa dicari |
| 6    | Dashboard statistik; halaman perusahaan (`/companies`, `/companies/[id]`); seed data demo (`npm run db:seed`)                                                                                                                                        | Tiga grafik tampil dari data nyata; perusahaan menampilkan lamaran dan kontaknya                   |
| 7    | Polish: skeleton saat memuat, `error.tsx`, `not-found`, tema gelap, aksesibilitas dasar, export CSV; test Vitest (logika murni, skema Zod, statistik lewat PGlite) dan Playwright; GitHub Actions; README portfolio dan panduan deploy Vercel + Neon | Semua pemeriksaan dan test lolos di CI; aplikasi live dan bisa didemokan                           |

| 8 | Persiapan interview, fondasi tanpa AI: tabel `questions` (dengan backfill dari `interviews.questions`), `stories`, `question_stories`, kolom `job_description`; halaman Pertanyaan v2 dan Cerita; editor daftar pertanyaan di form interview. Spec: `docs/specs/phase-1-story-bank-with-questions-v2-and-job-description.md` | Cerita dan pertanyaan bisa dibuat, ditautkan, dan ditandai kesiapannya; backfill idempoten teruji |
| 9 | BYOK dan latihan singkat. Selesai: Node 22 dan AI SDK 7, tabel `ai_credentials`, `practice_sessions`, `practice_turns`, modul `src/features/ai` (enkripsi, resolver model, pemetaan error), bagian AI di Pengaturan. Belum: halaman Latihan (`/practice`), masukan terstruktur, simpan pertanyaan lanjutan. Spec: `docs/specs/phase-2-byok-and-short-practice.md` | Key bisa disimpan, dites dan dihapus; satu pertanyaan bisa dilatih dan mendapat masukan; tanpa key semuanya tetap jalan |

Fase berikutnya mengikuti `docs/specs/latihan-interview.md`: simulasi interview, lalu input suara. Pekerjaan susulan dari Fase 8: hapus kolom `interviews.questions` lewat migration terpisah setelah backfill produksi (`docs/deploy.md`) dijalankan.

Penerapan identitas brand (guideline di `docs/design/guideline.md`) berjalan di luar tabel ini, halaman demi halaman; daftar dan statusnya ada di `docs/design/rollout.md`.

Setiap fase ditutup dengan `npm run lint && npm run typecheck && npm run format:check && npm test && npm run build`.
