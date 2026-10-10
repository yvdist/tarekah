# Spec: Persiapan Interview (Cerita, Pertanyaan v2, Latihan, BYOK)

Status: disetujui · Oktober 2026
Dokumen ini adalah rancangan besar. Detail implementasi per fase ada di prompt masing-masing fase. Kalau kode yang ada berbeda dari dokumen ini, kode yang benar dan dokumen ini diperbarui.

Penomoran fase di dokumen ini berbeda dari `PLAN.md`: Fase 1 di sini adalah Fase 8 di sana, Fase 2 adalah Fase 9 (keduanya sudah selesai).

## Latar belakang

Pengguna (pada awalnya pembuatnya sendiri) adalah engineer yang sudah lama tidak interview dan merasa cemas menghadapinya. Kecemasan ini terdiri dari tiga lapisan, dan masing-masing dijawab oleh bagian fitur yang berbeda:

1. **Bahan.** "Saya tidak tahu harus cerita apa." Dijawab oleh **Cerita**, yaitu bank pengalaman dalam format STAR.
2. **Penyampaian.** "Saya tahu isinya, tapi kaku saat mengucapkannya." Dijawab oleh **Latihan**: latihan singkat, simulasi, dan input suara.
3. **Ketidakpastian.** "Saya tidak tahu apa yang akan ditanyakan." Dijawab oleh **Pertanyaan v2** dan **Persiapan dari lamaran**.

## Prinsip

- Konsisten dengan Tarékah: tenang, tidak menghakimi, tanpa skor angka. Kemajuan ditunjukkan lewat status kesiapan yang dinilai sendiri, dalam bentuk ringkasan "X siap · Y cukup · Z belum".
- Semua fitur non-AI tetap berguna tanpa key. AI adalah tambahan, bukan syarat.
- Paparan bertahap. Nada interviewer bisa dipilih: ramah, netral, atau menantang.
- Jeda itu normal. Ada kontrol untuk "Boleh diulang pertanyaannya?" dan "Saya pikir sebentar ya" supaya kalimat ini terbiasa diucapkan.
- Konvensi yang sudah ada tetap berlaku: user_id di setiap tabel termasuk tabel penghubung, akses database hanya lewat queries.ts dan actions.ts, user_id dari session, pemeriksaan kepemilikan untuk setiap relasi, dan cache tag `<domain>:<userId>`.

## Fitur

### 1. Cerita (Arsip → Cerita)

Bank pengalaman dengan format Situasi, Tugas, Aksi, Hasil, ditambah tag kompetensi: ownership, conflict, failure, technical_depth, leadership, ambiguity, collaboration, impact. Satu cerita bisa dihubungkan ke banyak pertanyaan. Kalau AI aktif (fase berikutnya), ada bantuan untuk merapikan tulisan bebas ke format STAR tanpa mengubah fakta.

### 2. Pertanyaan v2 (upgrade halaman Pertanyaan)

Pertanyaan dinormalisasi dari field markdown `interviews.questions` menjadi tabel tersendiri. Setiap pertanyaan punya:

- kategori: behavioral, technical_backend, system_design, ai_llm, hr_general, other;
- sumber: interview, manual, ai;
- kesiapan: not_ready, somewhat, ready (dinilai sendiri, bukan skor);
- hubungan ke cerita.

### 3. Latihan (menu utama, setelah Dashboard)

- **Latihan singkat.** Satu pertanyaan (default acak dari yang belum siap, atau dipilih dari bank dengan filter kategori), jawab, lalu dapat masukan. Jawaban disimpan lebih dulu sebagai sesi `drill` yang langsung `completed`, baru masukan diminta; tanpa key jawaban tetap tersimpan dan tempat masukan berisi ajakan mengatur key. Pertanyaan lanjutan dari masukan bisa disimpan ke bank (sumber `ai`, ditolak bila teks yang sama sudah ada), dan dari layar yang sama kesiapan bisa diubah serta cerita ditautkan atau ditulis.
- **Simulasi interview.** AI berperan sebagai interviewer, satu pertanyaan per giliran, maksimal 2 pertanyaan lanjutan per topik. Masukan baru diberikan di akhir sesi. Pengaturannya:
  - jenis: HR, behavioral, teknis backend/Laravel, system design ringan, AI builder (`hr_screening`, `behavioral`, `technical_backend`, `system_design_light`, `ai_builder`; daftar ini terpisah dari kategori pertanyaan);
  - level: mid atau senior;
  - bahasa: Indonesia atau Inggris;
  - durasi: 15 atau 30 menit;
  - nada: ramah, netral, atau menantang.
- **Format masukan, tanpa skor:**
  - yang sudah kuat;
  - yang bisa dipertajam (struktur, konkret atau tidak, relevansi, kejelasan teknis, keringkasan);
  - versi lebih rapi yang tetap memakai gaya bicara dan fakta pengguna;
  - pertanyaan lanjutan yang mungkin muncul.

  Di kode: `strengths`, `improvements` (`aspect` salah satu dari `structure`, `specificity`, `relevance`, `technical_clarity`, `conciseness`, ditambah `note`), `improvedAnswer`, `followUpQuestion`. Semua wajib, tanpa field angka.

- Bahasa masukan latihan singkat ditebak dari bahasa pertanyaan dan bisa diganti sebelum jawaban disimpan; yang tersimpan di sesi selalu `id` atau `en`.
- Setelah sesi simulasi selesai, pertanyaan bisa disimpan ke bank dan saran cerita bisa diterapkan dengan satu klik.

### 4. Persiapan dari lamaran

Lamaran mendapat field `job_description`. Di halaman detail lamaran yang punya interview terjadwal atau berada di tahap interview, muncul tombol "Latihan untuk interview ini". Tombol ini membuka simulasi yang sudah terisi JD, catatan perusahaan, dan tahap interview. Dashboard menghitung sesi latihan yang selesai sebagai "léngkah latihan".

### 5. BYOK (Pengaturan → AI)

- Provider: Anthropic, OpenAI, dan Google, lewat Vercel AI SDK.
- Key disimpan terenkripsi (AES-256-GCM, secret dari env `AI_KEY_ENCRYPTION_KEY`) dan tidak pernah dikirim ke client. UI hanya menampilkan 4 karakter terakhir.
- Ada tombol tes key dan hapus key.
- Semua panggilan AI dilakukan di server, lewat satu modul terpusat yang menjadi satu-satunya tempat key didekripsi.
- Ada pemberitahuan privasi bahwa teks dikirim ke provider yang dipilih.
- Alternatif yang ditolak: key disimpan hanya di browser. Alasannya, CORS berbeda per provider, streaming lebih rumit, dan konteks dari database tetap harus dikirim ke client.

## Model data

```
ai_credentials      user_id, provider, encrypted_key, iv, auth_tag, key_version,
                    key_last4, model                      (unik per user_id+provider)
user_settings       + active_ai_provider
applications        + job_description (text)
stories             id, user_id, title, situation, task, action, result,
                    competencies[]
questions           id, user_id, text, category, source, readiness, notes,
                    interview_id?, application_id?
question_stories    question_id, story_id, user_id
practice_sessions   id, user_id, application_id?, mode (drill|simulation),
                    interview_type?, level?, tone?, max_turns?, language,
                    status (in_progress|completed|abandoned),
                    started_at, ended_at?, summary? (jsonb)
practice_turns      id, session_id, user_id, position,
                    role (interviewer|candidate|system_event),
                    content, question_id?, feedback? (jsonb), created_at
```

`interview_type`, `level`, `tone` dan `max_turns` hanya milik simulasi: kolomnya nullable, dan CHECK di database mewajibkannya saat `mode = 'simulation'`. Satu latihan singkat adalah satu sesi dengan dua giliran, `interviewer` (teks pertanyaan) lalu `candidate` (jawaban). `feedback` di giliran kandidat menyimpan masukan bersama versi prompt, provider dan model yang menghasilkannya.

Masukan dan ringkasan AI dihasilkan sebagai structured output dengan skema Zod (`generateText` dengan `Output.object` di AI SDK 7; `generateObject` sudah deprecated). Isi dari pengguna (pertanyaan, jawaban, cerita) masuk ke prompt di dalam tag pembatas dan diperlakukan sebagai data. Test memakai mock model dari AI SDK, tanpa panggilan API sungguhan.

## Fase

| Fase | Isi                                                          | Alasan urutan                                           |
| ---- | ------------------------------------------------------------ | ------------------------------------------------------- |
| 1    | Cerita, Pertanyaan v2 + migrasi data, field JD               | Tanpa AI, langsung berguna, dan jadi fondasi data       |
| 2    | BYOK + Latihan singkat (tabel latihan dibuat lengkap)        | Lingkaran AI terkecil yang sudah bernilai               |
| 3    | Simulasi + tombol dari detail lamaran + léngkah latihan      | Fitur utama, dibangun di atas fondasi yang sudah teruji |
| 4    | Input suara (Web Speech API, cadangan transkripsi lewat key) | Dukungan browser tidak merata, jadi dibuat terpisah     |

Setiap fase bisa dirilis sendiri.

## Risiko dan mitigasi

- **Migrasi `interviews.questions`.** Backfill lewat script yang idempoten dan punya `--dry-run`, diuji dulu di branch Neon. Kolom lama dibiarkan, lalu dihapus di migration terpisah.
- **Biaya API pengguna.** Batas giliran per sesi ditegakkan di server, dan panjang jawaban dibatasi.
- **Error dari provider.** Dipetakan ke pesan yang ramah. Sesi simulasi tidak boleh rusak karena satu giliran gagal.
- **Privasi.** Key, prompt, isi jawaban, dan audio tidak pernah masuk log. Audio tidak disimpan.
- **Prompt injection lewat JD.** Konteks lamaran dibungkus tag pembatas dan diperlakukan sebagai data.
