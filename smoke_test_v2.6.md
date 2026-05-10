# 🧪 Smoke Test Checklist: VibeLocator v2.6

Gunakan daftar ini untuk memastikan semua fitur utama berjalan sempurna sebelum deployment.

## 1. 🤖 AI Intelligence & Linguistic Flow

- [x] **Sundanese Mix**: Ucapkan *"ViLo, simpen kunci motor dina luhur kulkas nya"*.
  - *Expectation*: AI merespon dengan partikel Sunda alami (*mah, teh, nya*) dan tidak kaku. Tidak ada panggilan "A/Aa/Akang".
- [x] **Indonesian "Chill"**: Ucapkan *"Tas gue di deket tv ya"*.
  - *Expectation*: Respon hangat, tidak repetitif (tidak selalu "Oke Kak"), dan natural.
- [x] **English Support**: Switch language ke English dan tanya *"Where is my bag?"*.
  - *Expectation*: Respon profesional dan akurat.
- [x] **Non-Stiff Conversation**: Ucapkan *"Makasih ya ViLo"*.
  - *Expectation*: Balasan ramah tanpa memberikan "kuliah" bahwa dia adalah asisten lokasi.

## 2. 📦 Core Inventory Actions

- [x] **SAVE**: Simpan 3 barang berbeda (misal: Gunting, Headset, Dompet).
  - *Expectation*: Barang muncul di list kanan dengan kategori yang tepat.
- [x] **FIND**: Tanya *"Dompet saya dimana?"*.
  - *Expectation*: AI menyebutkan lokasi yang benar. Avatar berubah ke `idle` (atau `confirming` jika ragu).
- [x] **UPDATE**: Ucapkan *"Pindahin dompet ke dalam tas"*.
  - *Expectation*: Lokasi dompet di daftar barang berubah otomatis.
- [x] **DELETE**: Ucapkan *"Hapus headset, udah saya pake"*.
  - *Expectation*: Barang hilang dari daftar.

## 3. 🎙️ Voice & Audio Experience

- [x] **High Quality (ON)**: Pastikan toggle HQ aktif.
  - *Expectation*: Suara jernih (Gemini 3.1 Flash TTS).
- [x] **Eco Mode (HQ OFF)**: Matikan toggle HQ.
  - *Expectation*: Suara langsung muncul (Browser TTS). Gemini API tidak dipanggil untuk audio.
- [x] **Voice Toggle**: Matikan "Voice Response".
  - *Expectation*: AI hanya membalas lewat teks, tidak ada suara keluar.
- [x] **Wake Word**: Aktifkan "Always On" dan ucapkan *"Hey ViLo"*.
  - *Expectation*: Mic aktif otomatis (Indikator berubah biru).

## 4. 🎨 UI/UX & Avatar States

- [x] **Avatar Transitions**:
  - *Listening*: Avatar berubah warna hijau/berdenyut.
  - *Processing*: Avatar muncul di samping bubble thinking dengan animasi waveform.
  - *Idle*: Avatar kembali tenang.
- [x] **Bubble Alignment**: Pastikan gelembung "Thinking" sejajar dengan gelembung pesan AI.
- [x] **Responsiveness**: Coba di mode mobile.
  - *Expectation*: Layout tetap rapi, tombol mic mudah ditekan.

## 5. 💾 Persistence & Security

- [x] **Page Refresh**: Refresh browser (F5).
  - *Expectation*: Daftar barang dan riwayat chat TIDAK hilang.
- [x] **Settings Persistence**: Ubah setting, lalu refresh.
  - *Expectation*: Setting tetap tersimpan sesuai pilihan terakhir.
- [x] **Clear All**: Tekan tombol "Hapus Sadaya Barang".
  - *Expectation*: Muncul konfirmasi, dan list benar-benar kosong.

---

**Status Akhir: [x] READY TO DEPLOY (v2.6)**
