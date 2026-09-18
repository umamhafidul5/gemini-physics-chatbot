// Inisialisasi elemen DOM
const form = document.getElementById('chat-form');
const input = document.getElementById('user-input');
const chatBox = document.getElementById('chat-box');
const clearBtn = document.getElementById('clear-btn');
const welcomeCard = document.getElementById('welcome-card');
const chips = document.querySelectorAll('.chip');
const sendBtn = document.getElementById('send-btn');

// State riwayat percakapan multi-turn
// Format sesuai dengan kebutuhan API Gemini: [{ role: 'user'|'model', text: '...' }]
let conversationHistory = [];

// Fungsi untuk escape karakter HTML demi keamanan (mencegah XSS)
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Parser render Markdown dan LaTeX Matematika/Fisika
function renderMessageInto(container, text) {
  if (!text) {
    container.innerHTML = '';
    return;
  }

  if (window.marked && typeof window.marked.parse === 'function') {
    // 1. Lindungi ekspresi matematika LaTeX ($$...$$ dan $...$) dari parser markdown
    // agar karakter _, *, dll. dalam rumus tidak terpecah
    const mathTokens = [];
    const protectedText = text.replace(/(\$\$[\s\S]*?\$\$|\$(?!\$)[^\n]+?\$)/g, (match) => {
      const placeholder = `%%PHYSMATH_${mathTokens.length}%%`;
      mathTokens.push(match);
      return placeholder;
    });

    // 2. Parse markdown terstruktur
    let parsedHtml = window.marked.parse(protectedText, { breaks: true, gfm: true });

    // 3. Pulihkan kembali ekspresi matematika asli
    mathTokens.forEach((math, i) => {
      parsedHtml = parsedHtml.replace(`%%PHYSMATH_${i}%%`, math);
    });

    container.innerHTML = parsedHtml;
  } else {
    // Fallback jika pustaka marked tidak tersedia
    let html = escapeHtml(text);
    html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    container.innerHTML = html.replace(/\n/g, '<br>');
  }

  // 4. Render formula matematika dengan KaTeX
  if (window.renderMathInElement) {
    try {
      window.renderMathInElement(container, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '$', right: '$', display: false },
          { left: '\\(', right: '\\)', display: false },
          { left: '\\[', right: '\\]', display: true },
        ],
        throwOnError: false,
      });
    } catch (e) {
      console.warn('Gagal merender notasi LaTeX dengan KaTeX:', e);
    }
  }
}

// Fungsi membuat dan menambahkan elemen pesan ke dalam chat box
function appendMessage(sender, text, isTemporary = false) {
  // Sembunyikan welcome card jika pesan pertama dikirim
  if (welcomeCard && welcomeCard.style.display !== 'none') {
    welcomeCard.style.display = 'none';
  }

  const messageWrapper = document.createElement('div');
  messageWrapper.classList.add('message', sender);

  const label = document.createElement('span');
  label.classList.add('sender-label');
  label.textContent = sender === 'user' ? 'Anda' : 'Phystor';

  const bubble = document.createElement('div');
  bubble.classList.add('bubble');

  if (isTemporary) {
    bubble.innerHTML = `
      <div class="thinking-bubble">
        <span class="spinner-dot"></span>
        <span>Sedang menganalisis &amp; merumuskan jawaban...</span>
      </div>
    `;
    messageWrapper.id = 'temp-bot-message';
  } else if (sender === 'user') {
    bubble.textContent = text;
  } else {
    renderMessageInto(bubble, text);
  }

  messageWrapper.appendChild(label);
  messageWrapper.appendChild(bubble);
  chatBox.appendChild(messageWrapper);

  // Scroll otomatis ke posisi pesan paling bawah
  chatBox.scrollTop = chatBox.scrollHeight;

  return messageWrapper;
}

// Handler pengiriman pesan
async function handleSendMessage(userMessage) {
  if (!userMessage || userMessage.trim() === '') return;

  const cleanMessage = userMessage.trim();

  // 1. Tampilkan pesan pengguna di UI
  appendMessage('user', cleanMessage);

  // 2. Simpan pesan pengguna ke riwayat percakapan
  conversationHistory.push({ role: 'user', text: cleanMessage });

  // 3. Bersihkan input & nonaktifkan tombol kirim sementara
  input.value = '';
  input.disabled = true;
  sendBtn.disabled = true;

  // 4. Tampilkan placeholder sementara "thinking"
  appendMessage('bot', '', true);

  try {
    // 5. Kirim request POST ke endpoint /api/chat backend
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        conversation: conversationHistory,
      }),
    });

    const tempMessage = document.getElementById('temp-bot-message');

    if (!response.ok) {
      let errorMsg = 'Gagal mendapatkan respons dari server.';
      try {
        const errorData = await response.json();
        if (errorData && errorData.error) errorMsg = errorData.error;
      } catch (_) {}
      throw new Error(errorMsg);
    }

    const data = await response.json();

    if (tempMessage) {
      const bubble = tempMessage.querySelector('.bubble');
      if (data && data.result) {
        // Ganti placeholder dengan jawaban dari Gemini (didukung Markdown & KaTeX)
        renderMessageInto(bubble, data.result);
        tempMessage.removeAttribute('id');

        // Simpan jawaban asisten ke riwayat percakapan
        conversationHistory.push({ role: 'model', text: data.result });
      } else {
        bubble.textContent = 'Maaf, tidak ada respons yang diterima.';
        tempMessage.removeAttribute('id');
      }
    }
  } catch (error) {
    console.error('Error pengiriman chat:', error);
    const tempMessage = document.getElementById('temp-bot-message');
    if (tempMessage) {
      const bubble = tempMessage.querySelector('.bubble');
      let displayMessage = error.message || 'Gagal menghubungi server.';

      // Deteksi jika error message berupa stringified JSON dari API
      try {
        const jsonMatch = displayMessage.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.error) {
            if (typeof parsed.error === 'object' && parsed.error.message) {
              if (parsed.error.code === 429 || parsed.error.status === 'RESOURCE_EXHAUSTED') {
                displayMessage = 'Batas kuota gratis Gemini API telah tercapai (limit 20 request/hari pada key ini). Silakan tunggu sekitar 1 menit sebelum mengirim pesan lagi, atau gunakan API key dengan kuota aktif.';
              } else {
                displayMessage = parsed.error.message;
              }
            } else if (typeof parsed.error === 'string') {
              displayMessage = parsed.error;
            }
          }
        }
      } catch (_) {}

      bubble.innerHTML = `
        <div class="error-notice">
          <div class="error-notice-title">Pemberitahuan Layanan</div>
          <div class="error-notice-desc">${escapeHtml(displayMessage)}</div>
        </div>
      `;
      tempMessage.removeAttribute('id');
    }
  } finally {
    // Aktifkan kembali input dan tombol kirim
    input.disabled = false;
    sendBtn.disabled = false;
    input.focus();
    chatBox.scrollTop = chatBox.scrollHeight;
  }
}

// Event listener form submission
form.addEventListener('submit', (e) => {
  e.preventDefault();
  handleSendMessage(input.value);
});

// Event listener klik tombol chips rekomendasi
chips.forEach((chip) => {
  chip.addEventListener('click', () => {
    const prompt = chip.getAttribute('data-prompt');
    if (prompt) {
      input.value = prompt;
      handleSendMessage(prompt);
    }
  });
});

// Event listener reset chat
clearBtn.addEventListener('click', () => {
  if (conversationHistory.length === 0) return;

  const confirmReset = confirm('Apakah Anda yakin ingin memulai sesi percakapan baru? Riwayat chat saat ini akan dibersihkan.');
  if (!confirmReset) return;

  // Reset state dan DOM
  conversationHistory = [];
  chatBox.innerHTML = '';

  if (welcomeCard) {
    welcomeCard.style.display = 'block';
    chatBox.appendChild(welcomeCard);
  }

  input.value = '';
  input.focus();
});
