---
title: Whisper WebGPU + Llama Chat
emoji: 🎙️🦙
colorFrom: blue
colorTo: green
sdk: docker
pinned: false
app_port: 7860
---
<div align="center">
# 🎙️ Whisper Web + Llama 3.2 🦙

<p align="center">
  <strong>ML-powered speech recognition and AI chat, right in your browser</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#models">Models</a> •
  <a href="#development">Development</a> •
  <a href="#tech-stack">Tech Stack</a>
</p>

[Report Bug](https://github.com/Reidmen/whisper-llama-web/issues) | [Request Feature](https://github.com/Reidmen/whisper-llama-web/issues)

</div>

---

## ✨ Features

- 🎤 **Real-time Processing** - Instant speech recognition with Whisper and AI responses with Llama 3.2 1B Instruct
- 🌐 **100% Client-side** - No server needed, everything runs in your browser
- ⚡ **WebGPU Powered** - Hardware-accelerated for optimal performance
- 🔒 **Privacy First** - All processing happens locally
- 🌍 **Multilingual** - Supports multiple languages

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/Reidmen/whisper-llama-web.git

# Install dependencies
pnpm install

# Start the development server
pnpm run dev
```

Visit [http://localhost:5173](http://localhost:5173) in your browser.

## 🤖 Models

### Speech Recognition
| Model | Size | Languages | Performance |
|-------|------|-----------|-------------|
| Tiny | 120MB | All | Fast |
| Base | 206MB | All | Balanced |
| Small | 586MB | All | Accurate |
| Large V3 | 1.6GB | All | Most Accurate |
| Distil Small | 538MB | English | Optimized |

### Chat Model
- **Llama 3.2 1B Instruct** (Quantized for browser)
  - Fast local inference
  - ~1GB memory usage
  - Multi-turn conversations

## 💻 Development

### Prerequisites
- Modern browser with WebGPU support
- GPU with sufficient memory
- Microphone access (for recording)

### Local Setup
1. Clone and install dependencies
2. Configure environment variables (if needed)
3. Start development server
4. Open browser at localhost:5173

### Docker Deployment
```bash
docker build -t whisper-web .
docker run -p 7860:7860 whisper-web
```

## 🛠️ Tech Stack

- **Frontend:** React, TailwindCSS
- **ML Framework:** Transformers.js
- **Performance:** WebGPU, Web Workers
- **Build Tools:** Vite, TypeScript

## 📄 License

MIT License - see the [LICENSE](LICENSE) file for details

## 🙏 Acknowledgments

- [Xenova](https://github.com/xenova) for the original template
- [Whisper](https://github.com/openai/whisper) by OpenAI
- [Llama](https://ai.meta.com/llama/) by Meta AI

---

<div align="center">
  <sub>Built by Reidmen, inspired by the transformers.js</sub>
</div>
