# Tarékah

Pelacak lamaran kerja pribadi. Setiap pengguna masuk dengan akun GitHub atau Google dan hanya melihat datanya sendiri.

Stack: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, shadcn/ui, PostgreSQL di Neon, Drizzle ORM, Auth.js v5.

Rancangan skema, daftar route dan rencana fase ada di [`PLAN.md`](./PLAN.md). Konvensi kode ada di [`CLAUDE.md`](./CLAUDE.md).

## Prasyarat

- Node.js 20.9 atau lebih baru
- Project [Neon](https://neon.tech) (PostgreSQL)
- OAuth app GitHub dan OAuth client Google

## Setup

1. Pasang dependensi.

   ```bash
   npm install
   ```

2. Salin berkas environment.

   ```bash
   cp .env.example .env.local
   ```

3. Isi `.env.local`.

   | Variabel                               | Sumber                                                                                                                                                               |
   | -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
   | `DATABASE_URL`                         | Neon, connection string **pooled** (host mengandung `-pooler`). Dipakai aplikasi saat berjalan.                                                                      |
   | `DATABASE_URL_UNPOOLED`                | Neon, connection string **direct**. Dipakai drizzle-kit untuk migration.                                                                                             |
   | `AUTH_SECRET`                          | Jalankan `npx auth secret`.                                                                                                                                          |
   | `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET` | GitHub → Settings → Developer settings → OAuth Apps. Callback URL: `http://localhost:3000/api/auth/callback/github`.                                                 |
   | `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | Google Cloud Console → APIs & Services → Credentials → OAuth client ID (Web application). Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`. |

4. Terapkan migration ke database.

   ```bash
   npm run db:migrate
   ```

5. Jalankan server pengembangan, lalu buka <http://localhost:3000>.

   ```bash
   npm run dev
   ```

`npm run start` (mode produksi di luar Vercel) juga butuh `AUTH_TRUST_HOST=true`, kalau tidak Auth.js menolak request dengan `UntrustedHost`.

## Script

| Perintah               | Fungsi                                                  |
| ---------------------- | ------------------------------------------------------- |
| `npm run dev`          | Server pengembangan                                     |
| `npm run build`        | Build produksi                                          |
| `npm run start`        | Menjalankan build produksi                              |
| `npm run lint`         | ESLint                                                  |
| `npm run typecheck`    | `next typegen` lalu `tsc --noEmit`                      |
| `npm run format`       | Prettier, menulis perubahan                             |
| `npm run format:check` | Prettier, hanya memeriksa                               |
| `npm run db:generate`  | Membuat migration SQL dari perubahan di `src/db/schema` |
| `npm run db:migrate`   | Menerapkan migration yang belum jalan                   |
| `npm run db:studio`    | Drizzle Studio                                          |

## Mengubah skema

Ubah `src/db/schema/*`, jalankan `npm run db:generate`, periksa SQL yang dihasilkan, jalankan `npm run db:migrate`, lalu commit skema dan folder `drizzle/` bersama-sama. Jangan pakai `drizzle-kit push` dan jangan mengubah migration yang sudah diterapkan.
