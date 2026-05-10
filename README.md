<div align="center">
<img width="1200" height="475" alt="ViLo Banner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />

# 📍 ViLo (VibeLocator)
### *Semantic Memory Unit for Smart Item Tracking*

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![Gemini](https://img.shields.io/badge/Gemini-2.0_Flash-blue?style=for-the-badge&logo=google-gemini)](https://deepmind.google/technologies/gemini/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)

</div>

---

## 🌟 Overview
**ViLo** is a sophisticated personal assistant designed to solve the age-old problem of "losing things." By combining the power of **Gemini 2.0/2.5 Flash** with a rich, responsive interface, ViLo tracks your items' locations through natural speech and text.

Built specifically with a **Sundanese-Indonesian** soul, ViLo provides a warm, local experience while maintaining world-class AI performance.

## ✨ Key Features
- **🎙️ Speech-to-Speech Interaction**: Fully voice-enabled experience using Gemini Multimodal capabilities.
- **🤖 Agentic UI Avatar**: An AI-driven avatar that expresses moods (idle, confirming, error) based on context.
- **🌍 Trilingual Support**: Seamless switching between **Sundanese**, **Indonesian**, and **English**.
- **🛡️ Smart Fallback System**: Automatic failover to Browser TTS (Eco Mode) if AI quota is reached.
- **⚡ High-Performance Caching**: Audio responses are cached locally to save tokens and improve latency.
- **🔒 Local-First Privacy**: All item records are stored securely in your browser's local storage.

## 🛠️ Tech Stack
- **Framework**: Next.js 15 (App Router)
- **AI Brain**: Google Gemini 2.0 Flash
- **Voice Engine**: Gemini 2.5 Flash (Audio) + Web Speech API
- **Animations**: Framer Motion
- **Styling**: Tailwind CSS + Glassmorphism Design System

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Gemini API Key ([Get it here](https://aistudio.google.com/))

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/nandurstudio/VibeLocator.git
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Setup environment variables:
   Create a `.env.local` file and add:
   ```env
   NEXT_PUBLIC_GEMINI_API_KEY=your_api_key_here
   ```
4. Run the development server:
   ```bash
   npm run dev
   ```

## 🚀 Recent Improvements (v2.7)
- **⚡ Zero-Lag Performance**: Implemented comprehensive memoization for Chat Bubbles and Avatars, eliminating typing latency in long conversations.
- **🔊 Audio Stability**: Added proactive `AudioContext` resuming to ensure reliable voice responses on mobile Safari and Chrome.
- **📅 Smart Date Grouping**: Chat history is automatically categorized by time (Today, Yesterday, Earlier) for intuitive navigation.
- **🔍 Real-Time Search Highlighting**: Visual emerald glow on matching text during inventory search for rapid item discovery.
- **📈 Scroll Progress Indicator**: A sleek, high-tech vertical bar indicating scroll depth in long conversation logs.
- **🏃 Adjustable TTS Speed**: Users can now control AI speaking rate from 0.5x to 2.0x.
- **🩺 Rich Diagnostics**: Automated technical reporting for bugs, including localized email templates for Sundanese, Indonesian, and English.
- **📦 Storage Awareness**: Real-time visual indicator for localStorage usage (200-item capacity).

## 📜 License
©2026 - **Nandur Studio**. Built with ❤️ for JuaraVibe Coding Competition.
