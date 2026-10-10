# Fase 2: BYOK (Bring Your Own Key) dan Latihan Singkat

## Konteks
Fase 1 (Cerita, tabel questions, JD) sudah selesai. Sekarang kita menambahkan AI dengan key milik pengguna sendiri, dan mode latihan pertama: menjawab satu pertanyaan lalu mendapat masukan. Tanpa key, semua fitur non-AI harus tetap berjalan normal.

Kalau kode berbeda dari asumsi spec ini, kode yang benar. Laporkan perbedaannya.

## Langkah 0: Baca dan cek dulu
1. Baca ulang CLAUDE.md, PLAN.md, .claude/skills/, dan hasil Fase 1 (features untuk questions dan stories).
2. Pelajari halaman Pengaturan dan tabel user_settings.
3. Periksa next.config.ts dan vercel.json: header keamanan (CSP, connect-src), maxDuration, dan runtime.
4. Cek dokumentasi Vercel AI SDK versi TERBARU sebelum menulis kode. API-nya sering berubah antar versi mayor (generateObject/streamText, useChat, cara mendefinisikan provider). Jangan mengandalkan ingatan.
5. Cek ID model yang berlaku saat ini di dokumentasi masing-masing provider. Jangan hardcode ID model dari ingatan.

Tulis rencana dan tunggu persetujuan saya.

## Lingkup

### A. Penyimpanan key
- Tabel ai_credentials: id, user_id, provider (anthropic | openai | google), encrypted_key, iv, auth_tag, key_version, key_last4, model, created_at, updated_at. Unik per (user_id, provider).
- user_settings ditambah active_ai_provider (nullable).
- Enkripsi memakai AES-256-GCM lewat node:crypto di modul server-only. Secret diambil dari env AI_KEY_ENCRYPTION_KEY (32 byte, base64), divalidasi saat dipakai, dengan pesan error yang jelas. key_version disiapkan untuk rotasi secret di masa depan.
- Tambahkan variabel itu ke .env.example, tabel env di README, dan docs/deploy.md, termasuk perintah untuk membuat nilainya.
- Key mentah TIDAK PERNAH dikirim ke client. Query untuk halaman pengaturan hanya boleh mengembalikan provider, model, dan key_last4.

### B. Modul AI terpusat
- src/features/ai/ (server-only) menyediakan fungsi seperti getModelForUser(userId). Ini SATU-SATUNYA tempat key didekripsi.
- Pemetaan error provider ke pesan yang ramah: key tidak valid, kuota atau tagihan habis, rate limit, timeout, provider sedang gangguan. Contoh nada: "Key-nya belum bisa dipakai. Coba periksa lagi di pengaturan provider-mu."
- Isi jawaban, prompt, dan key TIDAK BOLEH masuk log. Log error hanya berisi kode atau jenis error.

### C. Halaman Pengaturan, bagian AI
- Pilih provider, input key (type=password, autocomplete=off), pilih model (daftar saran dari dokumentasi terkini ditambah input ID kustom).
- Tombol "Tes key" melakukan panggilan minimal. Tombol "Hapus key" menghapus key dengan konfirmasi.
- Pemberitahuan privasi yang singkat dan jujur: teks jawaban dan konteks lamaran dikirim ke provider yang dipilih, dan key disimpan terenkripsi.

### D. Tabel latihan (didesain sekarang untuk Fase 2 dan 3)
- practice_sessions: id, user_id, application_id (nullable), mode (drill | simulation), interview_type, level (mid | senior), language (id | en), tone (friendly | neutral | challenging), status (in_progress | completed | abandoned), max_turns, started_at, ended_at, summary (jsonb nullable).
- practice_turns: id, session_id, user_id, position, role (interviewer | candidate | system_event), content, question_id (nullable), feedback (jsonb nullable), created_at.
- Fase ini hanya memakai mode drill, tapi skemanya harus sudah cukup untuk simulasi supaya Fase 3 tidak perlu migrasi ulang.

### E. Halaman Latihan, mode Latihan Singkat
- Menu baru "Latihan" di grup utama, setelah Dashboard.
- Pilihan pertanyaan: acak dari yang berstatus not_ready (default), atau dipilih dari bank dengan filter kategori. Ada juga tombol "Latih pertanyaan ini" dari halaman Pertanyaan.
- Kalau pertanyaan punya cerita terhubung, tampilkan sebagai contekan yang bisa dibuka dan ditutup.
- Area jawaban berupa textarea, dengan timer opsional yang informatif dan tidak menekan.
- Masukan dihasilkan lewat generateObject dengan skema Zod:
  - strengths: string[]
  - improvements: { aspect: structure | specificity | relevance | technical_clarity | conciseness, note: string }[]
  - improved_answer: string (mempertahankan gaya bicara dan fakta pengguna, tanpa menambah klaim yang tidak pernah disebut)
  - follow_up_question: string (pertanyaan lanjutan yang mungkin muncul di interview sungguhan)
  - TANPA skor angka.
- Bahasa masukan mengikuti bahasa pertanyaan, atau pilihan pengguna.
- Setelah masukan muncul, ada tombol untuk mengubah kesiapan, menghubungkan atau membuat cerita, "Coba jawab lagi", dan "Pertanyaan berikutnya".
- Setiap percobaan disimpan sebagai sesi drill beserta giliran-gilirannya.
- Tanpa key: halaman tetap terbuka. Pengguna bisa menjawab dan menyimpan jawabannya, dan bagian masukan menampilkan ajakan mengatur key, bukan error.

### F. Prompt
- Taruh di berkas tersendiri (misalnya features/practice/prompts/), berversi dan bisa diuji.
- Konteks pengguna (pertanyaan, jawaban, cerita) dibungkus tag pembatas yang jelas dan diperlakukan sebagai DATA, bukan instruksi.
- Persona pemberi masukan: interviewer senior yang suportif dan jujur. Tidak memuji berlebihan dan tidak merendahkan.

### G. Batasan
- Panjang jawaban dibatasi lewat validasi Zod.
- maxDuration di route atau action AI disesuaikan dengan konfigurasi Vercel yang ada.

## Test
- Unit: enkripsi bolak-balik, deteksi teks atau tag yang diubah, pesan error kalau secret tidak ada, pemetaan error provider, skema masukan.
- Mock model dari AI SDK untuk alur masukan. Tidak ada panggilan API sungguhan di test.
- Test yang memastikan query pengaturan tidak pernah mengembalikan encrypted_key atau key mentah.
- E2E: alur tanpa key (ajakan muncul, tidak ada error) dan alur dengan mock (sesuaikan dengan cara e2e saat ini, misalnya provider tiruan lewat env khusus test). Plus pemeriksaan axe.

## Definition of done
- Semua pemeriksaan CI lulus. README, PLAN.md, .env.example, dan docs/deploy.md diperbarui.
- Saya bisa menyimpan key Anthropic, mengetesnya, latihan satu pertanyaan, mendapat masukan, lalu menghapus key.