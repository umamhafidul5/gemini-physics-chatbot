import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.6-flash';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// System instruction khusus asisten akademik bidang Fisika
const SYSTEM_INSTRUCTION = `Kamu adalah Phystor, asisten akademik fisika yang dirancang untuk siswa, mahasiswa, dan akademisi.
Peran dan batasanmu:
1. Menjawab pertanyaan konsep fisika (mekanika, termodinamika, gelombang & optik, elektromagnetisme, fisika modern/kuantum) dengan akurat, lugas, dan terstruktur.
2. Membantu penyelesaian soal atau tugas fisika langkah-demi-langkah secara sistematis:
   - Diketahui (besaran dan satuan SI)
   - Ditanya
   - Rumus / Prinsip yang digunakan
   - Langkah perhitungan / Substitusi
   - Jawaban akhir beserta satuan yang tepat
3. Jelaskan konsep dengan analogi sederhana jika konsepnya abstrak, tanpa mengurangi ketepatan ilmiah.
4. Gunakan Bahasa Indonesia yang sopan, jelas, dan edukatif.
5. Format penulisan rumus matematika dan fisika dibuat rapi, jelas, dan mudah dibaca di layar teks.`;

// Endpoint Chatbot Multi-turn
app.post('/api/chat', async (req, res) => {
  try {
    let { conversation } = req.body;

    // Fallback jika dikirim berupa pesan tunggal
    if (!conversation && req.body.message) {
      conversation = [{ role: 'user', text: req.body.message }];
    }

    if (!Array.isArray(conversation) || conversation.length === 0) {
      return res.status(400).json({ error: 'Data conversation harus berupa array dan tidak boleh kosong.' });
    }

    // Normalisasi role agar sesuai spesifikasi Gemini API ('user' dan 'model')
    const contents = conversation.map((item) => {
      let role = item.role === 'model' || item.role === 'bot' || item.role === 'assistant' ? 'model' : 'user';
      const text = item.text || item.content || '';
      return {
        role,
        parts: [{ text }],
      };
    });

    // Helper panggil Gemini dengan retry otomatis bila ada lonjakan traffic (503/429)
    let response = null;
    let lastError = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        response = await ai.models.generateContent({
          model: GEMINI_MODEL,
          contents,
          config: {
            temperature: 0.3, // Rendah agar jawaban faktual, presisi, dan konsisten untuk rumus fisika
            topP: 0.85,
            topK: 40,
            systemInstruction: SYSTEM_INSTRUCTION,
          },
        });
        break;
      } catch (err) {
        lastError = err;
        const isTemporary = err.status === 503 || err.status === 429 || (err.message && err.message.includes('503'));
        if (isTemporary && attempt < 3) {
          console.warn(`[Gemini API] Trafik tinggi (percobaan ${attempt}/3), mencoba kembali dalam 1.5 detik...`);
          await new Promise((resolve) => setTimeout(resolve, 1500));
          continue;
        }
        throw err;
      }
    }

    const resultText = response?.text || 'Maaf, tidak ada respons yang dihasilkan.';
    res.status(200).json({ result: resultText });
  } catch (error) {
    console.error('Error in /api/chat:', error);
    const friendlyMsg = error.status === 503
      ? 'Layanan AI sedang mengalami lonjakan trafik tinggi saat ini. Silakan coba kirim ulang pertanyaan Anda dalam beberapa saat.'
      : (error.message || 'Terjadi kesalahan pada server saat memproses permintaan.');
    res.status(500).json({ error: friendlyMsg });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Phystor server running on http://localhost:${PORT}`);
});
