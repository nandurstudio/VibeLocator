# 💰 VibeLocator Monetization Strategy
*Strategi Komersialisasi Asisten Memori Semantik ViLo*

## 🌟 Core Value Proposition
ViLo bukan sekadar aplikasi pencatat, melainkan **Asisten Pribadi (Persona AI)**. Fitur suara yang natural (Gemini 2.0 Flash) adalah pembeda utama yang memberikan kesan premium dan futuristik.

---

## 💎 Pricing Tiers (Rencana Harga)

| Paket | Harga | Fitur Utama |
| :--- | :--- | :--- |
| **Basic (Gratis)** | Rp 0 | Teks Only, Browser TTS (Suara Robot), Penyimpanan Lokal |
| **Premium (Monthly)** | **Rp 29.000 / bln** | **Full Gemini 2.0 Natural Voice**, Cloud Backup, No Ads, Prioritas Respon |
| **Premium (Yearly)** | **Rp 249.000 / thn** | Hemat 30%, Seluruh Fitur Premium, Lencana "Early Supporter" |
| **Lifetime Deal** | **Rp 199.000** | **Bayar Sekali, Selamanya Premium**. Cocok untuk early adopter. |

---

## 🤖 Model & Infrastructure Strategy
Untuk menjaga biaya operasional tetap rendah (hemat) namun tetap bertenaga (powerful):

1.  **Primary Brain**: Gemini 2.0 Flash (Sangat hemat biaya token).
2.  **Voice Engine**: Native Gemini 2.0 Multimodal Output (Untuk user Premium).
3.  **Fallback Engine**: Web Speech API (Browser TTS) untuk user Gratis.
4.  **Optimization**: 
    *   Membatasi output AI maksimal 150 karakter untuk menghemat token audio.
    *   Caching audio respon di LocalStorage/IndexedDB untuk menghindari re-generasi suara yang sama.

---

## 🧲 Psychological Marketing (Freemium Loop)
Teknik untuk mengubah user gratis menjadi berbayar tanpa terasa memaksa:

1.  **Daily Allowance**: Berikan 5-10 respon suara Gemini gratis setiap hari.
2.  **The "Vilo Tired" Hook**: Saat kuota suara harian habis, tampilkan pesan:
    > *"Aduh, tenggorokan ViLo kering nih.. Boleh beliin ViLo kopi (Premium) biar kita bisa ngobrol pakai suara natural lagi?"*
3.  **Visual Contrast**: User Premium mendapatkan tema "Emerald Glow" yang lebih eksklusif di UI, sedangkan user Basic menggunakan tema standar.

---

## 📅 Road to Launch
1.  [ ] Implementasi sistem login (Supabase/Firebase).
2.  [ ] Integrasi Payment Gateway (Midtrans/Xendit) untuk IDR.
3.  [ ] Penambahan kolom `is_premium` di profil user.
4.  [ ] Logic pengecekan status premium sebelum memicu `gemini-2.0-flash` audio output.

---
*Dibuat dengan ❤️ untuk masa depan VibeLocator.*
