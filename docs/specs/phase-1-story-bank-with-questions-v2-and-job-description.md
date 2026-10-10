# Fase 1: Bank Cerita, Pertanyaan v2, dan Job Description

## Konteks
Tarékah akan mendapat fitur persiapan interview yang dibangun dalam 4 fase. Fase ini adalah fondasi data TANPA AI: bank cerita (format STAR), bank pertanyaan yang ternormalisasi, dan field job description di lamaran. Semua bagian harus berguna meskipun pengguna tidak pernah memakai AI.

Spec ini ditulis berdasarkan README, bukan dari membaca seluruh kode. Kalau kode yang ada berbeda dari asumsi di sini, KODE YANG BENAR. Laporkan perbedaannya dan sesuaikan rencana.

## Langkah 0: Baca dulu, jangan langsung menulis kode
1. Baca CLAUDE.md, AGENTS.md, PLAN.md, dan isi .claude/skills/. Ikuti konvensi di sana.
2. Pelajari pola satu domain lengkap sebagai acuan, misalnya src/features/contacts/ atau src/features/interviews/ (queries.ts, actions.ts, schemas.ts, components/).
3. Baca src/db/schema/ untuk melihat gaya enum, penamaan kolom, indeks, dan cara user_id dipasang di setiap tabel.
4. Pelajari cara halaman Pertanyaan saat ini mengambil dan mem-parsing interviews.questions (markdown). Lihat juga format pertanyaan di script seed, karena itu contoh data nyata.
5. Pelajari pola cache tag `<domain>:<userId>` dan cara action membatalkannya.
6. Pelajari struktur navigasi sidebar dan pola test yang ada (Vitest + PGlite, Playwright + axe).

Lalu tulis rencana: daftar berkas yang dibuat atau diubah, skema final, strategi migrasi data, dan semua perbedaan dengan spec ini. Tunggu persetujuan saya.

## Lingkup

### A. Tabel `stories` (Cerita)
- Kolom: id, user_id, title, situation, task, action, result (text, markdown diperbolehkan), competencies, created_at, updated_at.
- Kompetensi (multi-pilih): ownership, conflict, failure, technical_depth, leadership, ambiguity, collaboration, impact. Pilih representasi (enum array atau text[] + validasi Zod) yang paling sesuai dengan gaya skema yang ada, lalu jelaskan alasannya.
- Halaman /stories ditaruh di grup Arsip, setelah Pertanyaan, dengan label "Cerita". Berisi daftar, filter per kompetensi, pencarian, buat, edit, dan hapus.
- Form cerita: empat bagian STAR dengan petunjuk singkat per bagian. Contoh petunjuk untuk Aksi: "Apa yang KAMU lakukan, bukan tim."
- Halaman detail cerita menampilkan pertanyaan-pertanyaan yang terhubung.

### B. Tabel `questions` (normalisasi pertanyaan)
- Kolom: id, user_id, text, category, source, readiness, interview_id (nullable FK), application_id (nullable FK), notes, created_at, updated_at.
- category: behavioral, technical_backend, system_design, ai_llm, hr_general, other.
- source: interview, manual, ai (nilai `ai` dipakai mulai Fase 2, tapi enum-nya dibuat sekarang).
- readiness: not_ready, somewhat, ready. Defaultnya not_ready. Nilai ini dinilai sendiri oleh pengguna, BUKAN skor.
- Tabel penghubung `question_stories`: question_id, story_id, user_id, dengan composite PK. Tabel ini juga wajib punya user_id, sesuai konvensi.
- Kategori pertanyaan hasil migrasi diisi `other`. Pengguna bisa mengubahnya inline.

### C. Migrasi data dari interviews.questions
- Buat migration skema lewat `npm run db:generate`. Jangan pakai push dan jangan mengubah migration lama.
- Backfill dilakukan lewat script di scripts/ yang idempoten dan punya mode --dry-run. Script ini memecah markdown per item list (-, *, 1.) menjadi satu baris questions dengan source=interview, plus interview_id dan application_id terkait.
- Kalau parser yang sudah ada di halaman Pertanyaan bisa dipakai ulang, gunakan itu. Jangan menulis parser kedua.
- Kasus tepi yang harus ditangani: baris kosong, item bersarang, markdown tanpa list (perlakukan per paragraf), dan duplikat dalam satu interview.
- Rekomendasi saya (silakan dievaluasi terhadap form yang ada): form interview tidak lagi memakai textarea markdown untuk pertanyaan, tapi editor daftar yang langsung menulis ke tabel questions. Kolom interviews.questions dibiarkan dan tidak lagi ditulis, lalu dihapus di migration terpisah nanti. Kolom reflection tetap markdown. Kalau ada pendekatan yang lebih baik setelah membaca kode, usulkan.

### D. Halaman Pertanyaan v2
- Data diambil dari tabel questions, tidak lagi dari parsing markdown.
- Filter berdasarkan kategori, kesiapan, sumber, dan lamaran. Pencarian yang sudah ada tetap jalan.
- Kategori dan kesiapan bisa diubah inline.
- Pertanyaan manual bisa ditambahkan tanpa interview.
- Pertanyaan bisa dihubungkan ke cerita, dan cerita bisa diputus hubungannya.
- Ringkasan di bagian atas berbentuk "X siap · Y cukup · Z belum". Tanpa persentase dan tanpa skor.

### E. Job description di lamaran
- Kolom applications.job_description (text, nullable). Batas panjang divalidasi di Zod, kira-kira 20.000 karakter.
- Textarea di form lamaran dan tampilan di halaman detail lamaran, bisa diciutkan kalau panjang.
- Kalau export CSV mengambil semua kolom, putuskan apakah JD ikut atau tidak. Saran saya ikut, karena "datamu bisa dibawa pulang". Pastikan escaping aman.

## Aturan yang tidak boleh dilanggar
- Hanya queries.ts dan actions.ts yang boleh mengimpor klien database. user_id selalu diambil dari session.
- Setiap action yang menyimpan relasi (question↔story, question↔interview/application) wajib memastikan baris yang dirujuk milik user yang sama. Baris milik orang lain diperlakukan sebagai "tidak ditemukan".
- Cache tag dan invalidasi mengikuti pola yang ada.
- Teks UI memakai bahasa Indonesia, sapaan "kamu", dan nada tenang serta tidak menghakimi, sama seperti copy yang sudah ada.

## Test
- Unit: semua skema Zod baru, parser markdown ke pertanyaan (termasuk kasus tepi), idempotensi backfill (dijalankan dua kali hasilnya tetap sama).
- PGlite: query ringkasan kesiapan, filter, dan isolasi antar user (user B tidak bisa melihat atau menghubungkan data milik user A).
- E2E: membuat cerita, menambah pertanyaan manual, menghubungkannya ke cerita, mengubah kesiapan, dan pemeriksaan axe di tema terang dan gelap.

## Definition of done
- lint, typecheck, format:check, test, dan build lulus.
- Seed diperbarui supaya berisi contoh cerita dan pertanyaan.
- README (bagian Fitur dan diagram ER) serta PLAN.md diperbarui.
- Langkah menjalankan backfill di produksi dicatat di docs/.