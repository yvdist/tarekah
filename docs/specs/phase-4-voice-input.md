# Fase 4: Menjawab dengan Suara

## Konteks

Fase 1–3 sudah selesai. Menjawab dengan bersuara adalah latihan yang paling mendekati interview sungguhan, jadi sekarang kita menambahkan input suara di Latihan Singkat dan Simulasi. Teks tetap menjadi jalur utama dan cadangan. Hasil transkrip selalu bisa disunting sebelum dikirim.

Kalau kode berbeda dari spec ini, kode yang benar. Laporkan perbedaannya.

## Langkah 0

1. Baca komponen jawaban di Latihan Singkat dan Simulasi dari Fase 2–3.
2. Periksa header di next.config.ts dan vercel.json, terutama Permissions-Policy untuk microphone dan CSP. Laporkan apa yang perlu diubah.
3. Cek dukungan browser terkini untuk Web Speech API (SpeechRecognition), termasuk Safari dan Firefox, serta dokumentasi AI SDK terbaru untuk transkripsi.
   Tulis rencana dan tunggu persetujuan saya.

## Lingkup

### A. Jalur utama: Web Speech API

- Deteksi fitur dulu (SpeechRecognition / webkitSpeechRecognition). Bahasa id-ID atau en-US mengikuti bahasa sesi.
- Tombol mikrofon untuk mulai dan berhenti. Hasil sementara (interim) tampil di textarea, hasil akhir bisa disunting, lalu dikirim lewat alur yang sama dengan jawaban teks.
- Status yang jelas (mendengarkan atau berhenti) dengan aria-live. Bisa dioperasikan dengan keyboard.
- Izin mikrofon ditolak: tampilkan penjelasan singkat dan pengguna tetap bisa mengetik.

### B. Cadangan: transkripsi lewat key pengguna

- Kalau Web Speech tidak tersedia DAN pengguna punya key provider yang mendukung transkripsi (cek dokumentasi, misalnya OpenAI), rekam dengan MediaRecorder, kirim ke route server, lalu transkripsi lewat modul features/ai.
- Batasi durasi dan ukuran (misalnya 3 menit). Audio TIDAK disimpan dan tidak masuk log.
- Kalau keduanya tidak tersedia, tombol mikrofon disembunyikan dengan keterangan singkat, misalnya "Input suara belum didukung di browser ini."

### C. Info netral tentang durasi

- Setelah jawaban suara, tampilkan durasinya, misalnya "Jawabanmu sekitar 2 menit." Ini informasi, bukan penilaian. Boleh ditambah catatan kecil yang bisa disembunyikan bahwa jawaban behavioral umumnya 1,5–2,5 menit.

### D. Opsional, mati secara default: suara interviewer

- Simulasi bisa membacakan pertanyaan lewat speechSynthesis kalau diaktifkan di pengaturan sesi.

## Test

- Unit: logika deteksi fitur dan pemilihan jalur (Web Speech, cadangan, atau tidak ada), validasi ukuran dan durasi di route transkripsi, mock transkripsi.
- E2E: jalur teks tetap berfungsi saat mikrofon tidak tersedia (stub API browser). Pemeriksaan axe untuk kontrol baru.

## Definition of done

- CI lulus dan README diperbarui.
- Di Chrome saya bisa menjawab satu pertanyaan dengan suara dalam bahasa Inggris, menyunting transkripnya, lalu mendapat masukan.
- Di browser tanpa dukungan, tidak ada yang rusak.
