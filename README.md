# gemini-physics-chatbot

Aplikasi chatbot asisten akademik fisika interaktif berbasis web yang menghubungkan antarmuka Vanilla JavaScript dengan backend Express.js dan model Google Gemini AI (`gemini-3.6-flash`). Proyek ini dibuat untuk tugas hands-on Sesi 3 program Hacktiv8 AI Developer.

Aplikasi ini ditujukan bagi siswa, mahasiswa, dan akademisi untuk mempermudah pemahaman konsep fisika, penurunan rumus, serta langkah penyelesaian soal secara terstruktur dan bertahap.

---

## Fitur Utama

- **Percakapan Multi-turn:** Menyimpan riwayat obrolan (dialog state) antara pengguna dan asisten agar percakapan tetap kontekstual.
- **Konfigurasi Parameter Khusus:**
  - `temperature: 0.3` untuk menjaga akurasi faktual rumus ilmiah dan meminimalisasi halusinasi.
  - `top_p: 0.85` dan `top_k: 40` untuk menjaga variasi bahasa tetap natural dan terarah.
- **System Instruction Akademik:** Membimbing model AI agar selalu menyajikan langkah pemecahan masalah secara runtut: *Diketahui*, *Ditanya*, *Rumus*, *Substitusi / Perhitungan*, dan *Jawaban Akhir beserta Satuan SI*.
- **Tampilan Sederhana & Fungsional:** Antarmuka web bersih tanpa ornamen berlebih, responsif untuk desktop maupun perangkat mobile.
- **Rekomendasi Topik Cepat (Prompt Chips):** Membantu pengguna mencoba topik fisika populer seperti Hukum Newton, GLBB, Termodinamika, dan Gelombang hanya dengan satu klik.
- **Mekanisme Retry Otomatis:** Menangani lonjakan beban server API (HTTP 503 / 429) secara aman di sisi backend.

---

## Tech Stack

- **Backend:**
  - Node.js (v18+)
  - Express.js (REST API & static file serving)
  - `@google/genai` (SDK resmi Google Gemini)
  - `cors` & `dotenv`
- **Frontend:**
  - HTML5 & CSS3 (Desain antarmuka bersih dan minimalis)
  - Vanilla JavaScript (Fetch API asynchronous, DOM manipulation, formatting rumus)

---

## Struktur Proyek

```text
gemini-physics-chatbot/
├── .env                  # Variabel lingkungan lokal (diabaikan oleh git)
├── .env.example          # Template konfigurasi environment
├── .gitignore            # Daftar file/folder yang tidak di-commit ke Git
├── package.json          # Metadata proyek dan daftar dependencies
├── index.js              # Server Express dan integrasi Gemini API
├── public/               # Frontend statis
│   ├── index.html        # Struktur antarmuka obrolan
│   ├── style.css         # Styling antarmuka
│   └── script.js         # Logika interaksi frontend dan request API
└── README.md             # Dokumentasi proyek
```

---

## Cara Menjalankan Aplikasi

### 1. Pindah ke Folder Proyek dan Install Dependencies

Buka terminal dan jalankan:

```bash
cd gemini-physics-chatbot
npm install
```

### 2. Konfigurasi Environment Variable

Salin file `.env.example` menjadi `.env`:

```bash
cp .env.example .env
```

Buka file `.env` dan isi dengan API key Gemini Anda:

```env
GEMINI_API_KEY=masukkan_api_key_gemini_anda
PORT=3000
GEMINI_MODEL=gemini-3.6-flash
```

> **Catatan Port:** Jika port `3000` sudah digunakan oleh aplikasi lain di komputer Anda, ubah nilai `PORT` menjadi port lain (misalnya `3002`).

### 3. Jalankan Server

Jalankan server menggunakan script berikut:

```bash
# Menjalankan langsung
npm start

# Atau mode development (auto-reload saat file diedit)
npm run dev
```

Buka browser dan akses alamat:

```text
http://localhost:3000
```
*(atau sesuaikan dengan port yang Anda gunakan di `.env`)*

---

## Dokumentasi Endpoint API

### `POST /api/chat`

Menerima array pesan percakapan dan mengembalikan respons dari Gemini AI.

- **URL:** `/api/chat`
- **Method:** `POST`
- **Header:** `Content-Type: application/json`
- **Request Body:**

```json
{
  "conversation": [
    {
      "role": "user",
      "text": "Sebuah mobil bergerak dengan kecepatan awal 10 m/s dan percepatan 2 m/s^2 selama 5 detik. Berapa kecepatan akhirnya?"
    }
  ]
}
```

- **Response Sukses (200 OK):**

```json
{
  "result": "Berikut adalah langkah penyelesaiannya:\n\n**Diketahui:**\n- v0 = 10 m/s\n- a = 2 m/s^2\n- t = 5 s\n\n**Ditanya:**\n- vt (kecepatan akhir)\n\n**Rumus GLBB:**\nvt = v0 + a * t\n\n**Perhitungan:**\nvt = 10 + (2 * 5)\nvt = 10 + 10 = 20 m/s\n\n**Jawaban:**\nKecepatan akhir mobil tersebut adalah 20 m/s."
}
```

- **Response Gagal (400 / 500):**

```json
{
  "error": "Pesan deskripsi kesalahan"
}
```

---

## Git Workflow

Langkah-langkah inisialisasi dan pengunggahan ke repository GitHub pribadi:

```bash
# Inisialisasi Git
git init

# Tambahkan seluruh file proyek ke staging
git add .

# Buat commit pertama
git commit -m "Inisialisasi chatbot asisten akademik fisika dengan Gemini API"

# Ubah nama branch utama menjadi main
git branch -M main

# Hubungkan dengan remote repository di GitHub
git remote add origin https://github.com/<username-anda>/<nama-repo>.git

# Unggah perubahan ke GitHub
git push -u origin main
```
