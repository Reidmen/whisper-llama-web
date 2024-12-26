---
title: Whisper WebGPU + Llama Chat
emoji: 🎙️🦙
colorFrom: blue
colorTo: green
sdk: docker
pinned: false
app_port: 7860
---

# Whisper Web + Llama 3.2

ML-powered speech recognition and AI responses in your browser!

## Features
- 🎤 Real-time speech recognition using Whisper
- 🦙 Chat interactions using Llama 3.2
- ⚡ WebGPU acceleration for optimal performance
- 🌐 Runs entirely in the browser - no server required
- 🔊 Support for multiple audio input formats
- 🌍 Multilingual support

### Speech Recognition (Whisper)
- Tiny (120MB)
- Base (206MB)
- Small (586MB)
- Large V3 Turbo (1.6GB)
- Distil Small English-only (538MB)

### Text Generation (Llama)
- Llama 3.2 1B Instruct (Quantized)

## Running locally

1. Clone the repo and install dependencies:

    ```bash
    git clone https://github.com/xenova/whisper-web.git
    cd whisper-web
    pnpm install
    ```

2. Run the development server:

    ```bash
    pnpm run dev
    ```

3. Open the link (e.g., [http://localhost:5173/](http://localhost:5173/)) in your browser.

## Requirements

- A modern browser with WebGPU support
- Sufficient GPU memory for model loading
- Microphone access (for recording feature)

## Technical Overview

The application is built using:
- React for the UI
- Transformers.js for ML model inference
- Web Workers for background processing
- WebGPU for hardware acceleration
- Tailwind CSS for styling

The architecture consists of:
- Speech recognition pipeline using Whisper models
- Text generation pipeline using Llama 3.2
- Real-time audio processing and transcription
- Streaming response generation

## Build and run with Docker

```bash
docker build -t whisper-web .
docker run -p 7860:7860 whisper-web
```
