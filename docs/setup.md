# Setup Tarékah

Daftar semua yang perlu disiapkan supaya Tarékah bisa dijalankan, dites dan di-deploy. Ringkasan langkah ada di [`README.md`](../README.md#setup-lokal), panduan deploy lengkap di [`deploy.md`](deploy.md); berkas ini mengumpulkan semuanya dalam satu checklist.

## Ringkasan

| Bagian                 | Wajib?             | Yang disiapkan                                                                  |
| ---------------------- | ------------------ | ------------------------------------------------------------------------------- |
| Node.js dan dependensi | Wajib              | Node 22 atau lebih baru, `npm install`                                          |
| Database               | Wajib              | Project Neon (atau PostgreSQL lain): connection string pooled dan direct        |
| Auth                   | Wajib              | `AUTH_SECRET`, OAuth app GitHub, OAuth client Google                            |
| AI                     | Opsional           | `AI_KEY_ENCRYPTION_KEY`; key provider diisi tiap pengguna sendiri di Pengaturan |
| Test end-to-end        | Untuk pengembangan | Database Postgres sekali-pakai di `.env.e2e`, browser Chromium untuk Playwright |
| Deploy                 | Untuk production   | Project Vercel, database production, OAuth production, delapan env var          |

## 1. Prasyarat

- [ ] **Node.js 22 atau lebih baru.** `.nvmrc` berisi `22` dan `package.json` mensyaratkan `>=22`; AI SDK butuh versi ini. Periksa dengan `node -v`.
- [ ] **npm** (ikut Node). Lockfile-nya `package-lock.json`, jadi pakai npm, bukan pnpm atau yarn.
- [ ] **openssl**, untuk membuat `AI_KEY_ENCRYPTION_KEY`. Sudah ada di macOS.
- [ ] Akun **Neon**, **GitHub**, dan project **Google Cloud**. Akun **Vercel** baru dibutuhkan saat deploy.
- [ ] Opsional: **Docker** atau PostgreSQL lokal, untuk database test end-to-end (lihat langkah 6).

## 2. Dependensi

```bash
npm install
```

## 3. Environment lokal (`.env.local`)

```bash
cp .env.example .env.local
```

`.env.local` diabaikan git; jangan pernah di-commit. Isi variabel berikut:

| Variabel                | Wajib    | Sumber                                                                                                                                  |
| ----------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`          | Ya       | Neon → Connect, **Connection pooling** ON (host mengandung `-pooler`). Dipakai aplikasi saat berjalan (langkah 3c).                     |
| `DATABASE_URL_UNPOOLED` | Ya       | Neon → Connect, **Connection pooling** OFF (tanpa `-pooler`). Dipakai drizzle-kit untuk migration dan oleh script seed (langkah 3c).    |
| `AUTH_SECRET`           | Ya       | `npx auth secret`. Minimal 32 karakter, kalau kurang aplikasi menolak menyala.                                                          |
| `AUTH_GITHUB_ID`        | Ya       | OAuth app GitHub (langkah 3a)                                                                                                           |
| `AUTH_GITHUB_SECRET`    | Ya       | OAuth app GitHub                                                                                                                        |
| `AUTH_GOOGLE_ID`        | Ya       | OAuth client Google (langkah 3b)                                                                                                        |
| `AUTH_GOOGLE_SECRET`    | Ya       | OAuth client Google                                                                                                                     |
| `AI_KEY_ENCRYPTION_KEY` | Opsional | `openssl rand -base64 32`. Harus tepat 32 byte dalam base64. Tanpa ini aplikasi berjalan, hanya key AI belum bisa disimpan.             |
| `AUTH_TRUST_HOST`       | Opsional | Isi `true` hanya kalau menjalankan `npm run start` (mode produksi) di luar Vercel; kalau tidak, Auth.js menolak dengan `UntrustedHost`. |
| `SITE_URL`              | Opsional | Alamat publik untuk link preview. Di lokal default `http://localhost:3000`.                                                             |

`sslmode=require` di connection string Neon dibiarkan apa adanya; aplikasi mengubahnya sendiri menjadi `verify-full`.

Jangan isi `AI_FAKE_PROVIDER` di `.env.local`: variabel itu hanya untuk test end-to-end.

### 3a. OAuth app GitHub (lokal)

GitHub → Settings → Developer settings → OAuth Apps → New OAuth App

- Homepage URL: `http://localhost:3000`
- Authorization callback URL: `http://localhost:3000/api/auth/callback/github`

Salin Client ID ke `AUTH_GITHUB_ID`, buat client secret dan salin ke `AUTH_GITHUB_SECRET`. GitHub hanya menerima satu callback URL per app, jadi app ini khusus lokal.

### 3b. OAuth client Google (lokal)

Google Cloud Console → APIs & Services → Credentials → Create credentials → OAuth client ID → Web application

- Authorized JavaScript origins: `http://localhost:3000`
- Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
- Selama OAuth consent screen berstatus Testing, tambahkan akun Google yang dipakai sebagai **test user**.

### 3c. Neon: langkah demi langkah

Tujuannya hanya satu: mendapat **dua connection string** untuk `.env.local`. Label di konsol Neon bisa sedikit berubah; langkah ini mengikuti dokumentasi Neon per Oktober 2026.

#### Langkah 1: Buka project

1. Buka <https://console.neon.tech> dan masuk.
2. **Kalau sudah punya project** (`.mcp.json` di repo ini menunjuk project `restless-glitter-17082361`): klik menu profil di kanan atas → pilih organization → di halaman **Projects**, klik project-nya. Atau buka langsung <https://console.neon.tech/app/projects/restless-glitter-17082361>.
3. **Kalau belum punya**, klik **New Project** lalu isi:

   | Field                | Isi                                                                                       |
   | -------------------- | ----------------------------------------------------------------------------------------- |
   | **Project name**     | `tarekah`                                                                                 |
   | **Region**           | AWS Asia Pacific (Singapore), `ap-southeast-1`: paling dekat dari Indonesia               |
   | **Services**         | Hanya **Postgres database** (sudah menyala). Biarkan **Neon Auth** dan lainnya **mati**.  |
   | **Postgres version** | 17 (buka bagian Postgres database untuk melihatnya); versi ini yang sudah diuji di proyek |

   Klik **Create project**. Anda mendarat di halaman **Overview** project.

Project baru otomatis punya branch `production`, database `neondb` dan role `neondb_owner`. Tidak ada yang perlu dibuat lagi di bagian database atau role.

#### Langkah 2: Buat branch `development`

Branch `production` disisakan untuk production; lokal memakai branch sendiri supaya datanya tidak bercampur.

1. Di sidebar kiri, klik **Branches**.
2. Klik **New branch** (kanan atas).
3. Isi dialognya:

   | Field                                 | Isi                                                                    |
   | ------------------------------------- | ---------------------------------------------------------------------- |
   | **Parent branch**                     | `production` (sudah terpilih)                                          |
   | Nama branch                           | `development`                                                          |
   | Data yang disertakan                  | **Current data** (project masih kosong, jadi **Schema only** pun sama) |
   | **Automatically delete branch after** | ⚠️ **Hilangkan centangnya.** Default-nya tercentang dengan **1 day**.  |

4. Klik **Create**.

Kalau centang auto-delete lupa dihilangkan, branch beserta datanya terhapus keesokan harinya dan aplikasi lokal tiba-tiba tidak bisa connect. Kalau sudah terlanjur, buka branch itu → menu titik tiga (⋮) → **Set expiration** untuk mematikannya.

#### Langkah 3: Salin `DATABASE_URL` (pooled)

1. Klik tombol **Connect** (di bagian atas halaman project). Muncul jendela **Connect to your branch**.
2. Atur pilihan di jendela itu:
   - **Branch**: `development` (jangan `production`)
   - **Compute**: biarkan default
   - **Database**: `neondb`
   - **Role**: `neondb_owner`
3. Pastikan toggle **Connection pooling** **menyala (ON)**.
4. Pastikan password di string terlihat, bukan tersamar (`****`), lalu klik ikon copy.
5. Periksa hasilnya: host-nya **harus mengandung `-pooler`**, misalnya `ep-cool-darkness-123456-pooler.ap-southeast-1.aws.neon.tech`.

#### Langkah 4: Salin `DATABASE_URL_UNPOOLED` (direct)

1. Masih di jendela yang sama, **matikan (OFF)** toggle **Connection pooling**.
2. Copy lagi.
3. Periksa: host-nya **tidak boleh mengandung `-pooler`**, misalnya `ep-cool-darkness-123456.ap-southeast-1.aws.neon.tech`.

Selain `-pooler`, kedua string harus sama persis. Kalau beda di bagian lain, kemungkinan branch atau role yang terpilih berubah di antara dua salinan.

#### Langkah 5: Tempel ke `.env.local`

1. Kalau belum ada: `cp .env.example .env.local`.
2. Buka `.env.local` di editor dan isi dua baris paling atas:

   ```bash
   # Connection pooling ON: host mengandung "-pooler"
   DATABASE_URL=postgresql://neondb_owner:PASSWORD@ep-xxx-yyy-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require

   # Connection pooling OFF: host tanpa "-pooler"
   DATABASE_URL_UNPOOLED=postgresql://neondb_owner:PASSWORD@ep-xxx-yyy.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
   ```

3. Aturan menempel:
   - Tempel **seluruh** string, termasuk `?sslmode=require…` di ujungnya. Aplikasi sendiri yang mengubahnya menjadi `verify-full`.
   - Tanpa tanda kutip dan tanpa spasi di sekitar `=`.
   - `PASSWORD` di contoh hanya penanda; yang ditempel adalah password asli dari Neon.
4. Simpan. String ini berisi password: jangan dibagikan atau di-commit (`.env.local` sudah diabaikan git).

Tidak ada lagi yang perlu disalin dari Neon. API key tidak dibutuhkan.

#### Langkah 6: Pastikan tersambung

1. Jalankan `npm run db:migrate`. Berhasil kalau baris terakhirnya `[✓] migrations applied successfully!`. Baris ini muncul setelah animasi `applying migrations...` selesai, jadi tunggu beberapa detik; kalau terminal berhenti di `Using 'pg' driver for database querying` tanpa baris itu, jalankan ulang lalu cek `echo $?` (harus `0`). Menjalankannya berkali-kali aman: migration yang sudah diterapkan tidak dijalankan lagi.
2. Di Neon, pilih branch `development` lalu klik **Tables** di sidebar. Tabel `users`, `applications`, `companies` dan lainnya sekarang muncul.

| Gejala saat `db:migrate`                                            | Perbaikan                                                                                           |
| ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `Please provide required params for Postgres driver`                | `DATABASE_URL_UNPOOLED` kosong atau namanya salah ketik di `.env.local`.                            |
| `password authentication failed`                                    | Password tersalin sebagai `****` atau terpotong. Ulangi langkah 3–4.                                |
| Error aneh soal prepared statement atau `relation … does not exist` | `DATABASE_URL_UNPOOLED` berisi string pooled. Periksa: string ini tidak boleh mengandung `-pooler`. |
| Tabel tidak muncul di **Tables**                                    | Branch yang dilihat di konsol bukan `development`, atau string disalin dari branch lain.            |

#### Opsional: branch `e2e` untuk test end-to-end

Dipakai kalau tidak memakai Docker (bagian 6. Test). Ulangi **Langkah 2** dengan nama `e2e` (hilangkan juga centang auto-delete kalau mau dipakai terus). Lalu ulangi **Langkah 4** saja: **Connection pooling OFF**, karena setup test juga menjalankan migration. Tempel ke `.env.e2e`:

```bash
E2E_DATABASE_URL=postgresql://neondb_owner:PASSWORD@ep-aaa-bbb.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```

Branch `e2e` tidak boleh sama dengan branch di `.env.local`, karena test membuat dan menghapus pengguna.

#### Referensi: menu di konsol Neon

| Menu             | Gunanya                                                    | Perlu untuk Tarékah?                                              |
| ---------------- | ---------------------------------------------------------- | ----------------------------------------------------------------- |
| **Connect**      | Jendela _Connect to your branch_, berisi connection string | **Ya** (langkah 3–4)                                              |
| **Branches**     | Daftar branch, tombol **New branch**                       | **Ya** (langkah 2)                                                |
| **Tables**       | Melihat isi tabel seperti spreadsheet                      | Untuk mengecek (langkah 6); ada juga `npm run db:studio`          |
| **SQL Editor**   | Menjalankan SQL dari browser                               | Tidak wajib                                                       |
| **Monitoring**   | Grafik pemakaian compute                                   | Tidak                                                             |
| **Neon Auth**    | Fitur login bawaan Neon                                    | **Jangan diaktifkan**: login Tarékah memakai Auth.js              |
| **Integrations** | Hubungan ke Vercel dan lainnya                             | Hanya saat deploy, kalau tidak lewat Storage di Vercel (bagian 8) |
| **Settings**     | Nama project, region, hapus project                        | Tidak                                                             |

Lewat CLI juga bisa, tanpa membuka konsol: `neon connection-string development --pooled` untuk `DATABASE_URL`, tanpa `--pooled` untuk `DATABASE_URL_UNPOOLED`.

## 4. Database

```bash
npm run db:migrate
```

Menerapkan semua migration di `drizzle/` ke database `DATABASE_URL_UNPOOLED`. Jangan pakai `drizzle-kit push`.

Untuk lokal, pakai branch `development` (langkah 3c), jangan yang dipakai production. Setelah berhasil, tabelnya terlihat di menu **Tables** branch itu.

## 5. Jalankan

```bash
npm run dev
```

Buka <http://localhost:3000> dan masuk dengan GitHub atau Google.

Opsional, isi akun dengan data contoh. Masuk sekali dulu agar akunnya ada, lalu:

```bash
npm run db:seed -- email@kamu.com           # akun harus masih kosong
npm run db:seed -- email@kamu.com --reset   # hapus data akun itu dulu
```

Restart server sesudahnya, karena halaman yang ter-cache tidak tahu ada data baru.

## 6. Test

### Unit test

```bash
npm test
```

Tidak butuh database atau env apa pun: query diuji terhadap PGlite (Postgres di dalam proses test).

### Test end-to-end

Test end-to-end membuat dan menghapus pengguna, jadi butuh database **sekali-pakai**, bukan yang ada di `.env.local`. Semua env lain (secret, OAuth, AI) sudah diisi otomatis oleh `playwright.config.ts` dengan nilai palsu, dan provider AI diganti model tiruan.

1. Siapkan database kosong, salah satu:
   - Docker:
     ```bash
     docker run -d --rm --name tarekah-e2e -e POSTGRES_PASSWORD=postgres -p 54329:5432 postgres:17
     ```
   - Branch Neon `e2e` (langkah 3c), di luar branch yang dipakai `.env.local`. Pakai connection string **direct** (Connection pooling OFF), karena setup test juga menjalankan migration.
   - PostgreSQL lokal, misalnya `brew install postgresql@17`, lalu buat database baru.
2. Tulis connection string-nya ke `.env.e2e` (juga diabaikan git):
   ```bash
   echo 'E2E_DATABASE_URL=postgres://postgres:postgres@localhost:54329/postgres' > .env.e2e
   ```
3. Pasang browser Playwright, lalu jalankan:
   ```bash
   npx playwright install chromium
   npm run test:e2e
   ```

Migration diterapkan oleh setup test sendiri. Server test berjalan di port 3100 dari build produksi.

### Pemeriksaan sebelum commit

```bash
npm run lint && npm run typecheck && npm run format:check && npm test && npm run build
```

Tambah `npm run test:e2e` kalau perubahan menyentuh halaman, form atau auth.

## 7. CI (GitHub Actions)

Tidak perlu secret apa pun. `.github/workflows/ci.yml` memakai nilai dummy untuk `DATABASE_URL` dan `AUTH_SECRET`, dan job E2E memakai service Postgres 17 miliknya sendiri.

- Lint, typecheck, format, unit test dan build jalan di setiap pull request dan push ke `production`.
- Job E2E hanya jalan bila dipicu manual: Actions → CI → Run workflow.

## 8. Deploy (Vercel + Neon)

Ringkasan dari [`deploy.md`](deploy.md); ikuti berkas itu untuk detail dan troubleshooting.

- [ ] **Project Vercel.** Impor repository; nama project menentukan domain `<nama>.vercel.app`. Deploy pertama memang gagal di migration karena env belum diisi. Region function: Singapore (`sin1`).
- [ ] **Database production.** Vercel → Storage → Neon (mengisi `DATABASE_URL` dan `DATABASE_URL_UNPOOLED` otomatis), atau isi manual dari project Neon lain. Jangan pakai branch yang sama dengan lokal.
- [ ] **OAuth production**, terpisah dari yang lokal:
  - GitHub: callback `https://<domain>/api/auth/callback/github`
  - Google: origin `https://<domain>`, redirect `https://<domain>/api/auth/callback/google`; ubah consent screen ke **In production**.
- [ ] **Environment variable** di Vercel (Production), total delapan:
      `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `AUTH_SECRET` (buat baru), `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `AI_KEY_ENCRYPTION_KEY` (opsional; simpan baik-baik dan jangan diganti, karena mengubahnya membuat semua key AI tersimpan tidak bisa dibuka).
- [ ] **Jangan** isi `AI_FAKE_PROVIDER`, `AUTH_TRUST_HOST` atau `AUTH_URL` di Vercel.
- [ ] **Redeploy.** Migration jalan otomatis lewat `vercel.json` (`npm run db:migrate && npm run build`); biarkan Override Build Command di dashboard mati.
- [ ] **Periksa** checklist di akhir [`deploy.md`](deploy.md#6-deploy-ulang-dan-periksa): login GitHub dan Google, tambah lamaran, board, export CSV, logout.

## 9. Opsional

- **Neon MCP.** `.mcp.json` mendaftarkan server MCP Neon untuk Claude Code; login ke Neon saat diminta kalau ingin memakainya.
- **Screenshot README.** `npm run screenshots` membuat ulang `docs/screenshots` dari data contoh; butuh setup E2E yang sama.
- **Domain sendiri.** Tambahkan callback URL domain itu di OAuth GitHub dan Google, dan isi `SITE_URL`.
