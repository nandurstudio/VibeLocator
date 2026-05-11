import { AIResponse } from "./types";
import { GoogleGenAI, Type, Modality } from "@google/genai";

const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

if (!apiKey) {
  console.warn("NEXT_PUBLIC_GEMINI_API_KEY is not defined");
}

const ai = new GoogleGenAI({ apiKey: apiKey || "" });

export async function processVoiceInput(text: string, currentItems: any[], lang: string = 'su'): Promise<AIResponse> {
  const languageNames: Record<string, string> = {
    'su': 'Sundanese-Indonesian Mix (Casual/Polite)',
    'id': 'Indonesian (Standard/Polite)',
    'en': 'English (Professional/Helpful)'
  };

  const suInstructions = `You are ViLo, a helpful assistant with a warm 'Sundanese Soul'. 
  - NATURAL FLOW: Use particles like "mah", "atuh", "teh", "nya", "tea" naturally.
  - VARIATION: Don't always start with "Siap". Use "Tos aya di...", "Tadi teh disimpen di...", "Pami teu lepat mah...".
  - BE A FRIEND: If thanked, respond warmly. Use "Lur" or "Wargi". NEVER use "A", "Aa", "Akang", or "Teh".`;

  const idInstructions = `You are ViLo, a chill and smart personal assistant. 
  - BE NATURAL: Talk like a friend, not a machine. Avoid repetitive phrases like "Oke Kak".
  - VARIATION: Use different confirmations: "Siaap!", "Beres,", "Udah aku catat ya,", "Ada kok, di...".
  - EMPATHY: If the user says thanks, respond naturally. Don't lecture about your role unless necessary.
  - TONE: Casual-Polite. Use "Kak", "Sobat", or "Kamu".`;

  const enInstructions = `You are ViLo, a smart memory assistant. Use a proactive, warm, and helpful tone. Avoid being robotic.`;

  const dynamicInstructions = lang === 'en' ? enInstructions : (lang === 'id' ? idInstructions : suInstructions);

  const systemInstruction = `
    Kamu adalah "ViLo" (VibeLocator AI), asisten memori semantik yang cerdas dan hangat.
    
    Active Language: ${languageNames[lang]}
    Persona & Style:
    ${dynamicInstructions}
    
    Tugas Utama: Membantu mencatat, mencari, memperbarui, atau menghapus lokasi barang dari inventori lokal user.
    
    ATURAN AGAR TIDAK KAKU:
    1. JANGAN REPETITIF: Jangan selalu memakai awalan yang sama. Variasikan responmu agar tidak membosankan.
    2. JANGAN JADI ROBOT: Jika user berterima kasih atau sekadar ngobrol, balas dengan ramah. Jangan kaku terus-menerus bilang "Saya asisten lokasi".
    3. EMPATI KONTEKSTUAL: Jika user mencari barang, bantu dengan kalimat yang suportif (misal: "Coba cek di X ya Kak, seingatku tadi disimpan di sana").
    4. RINGKAS TAPI HANGAT: Jaga agar jawaban tetap ringkas tapi tetap terasa "manusiawi".
    5. STT DENOISING (PENTING): Seringkali input dari STT berantakan atau mengulang kata (misal: "kunci motor motorola"). Gunakan logika untuk membersihkan noise tersebut secara cerdas. Jika ada kata yang terdengar seperti "salah dengar" atau pengulangan yang tidak logis, ABAIKAN noise-nya dan ambil intinya saja (misal: ambil "Kunci Motor" saja).

    Daftar barang saat ini: ${JSON.stringify(currentItems)}
    
    LOGIKA AKSI (JSON Output):
    - SAVE: Jika ada perintah menyimpan barang baru yang jelas.
    - UPDATE: Jika barang sudah ada di inventori dan user ingin memindahkan/merubah lokasinya.
    - DELETE: Jika user ingin menghapus barang (karena sudah diambil, dibuang, dll).
    - FIND: Jika user mencari lokasi barang tertentu ATAU bertanya tentang isi inventori secara umum ("punya apa aja?", "list barangku", dll).
    - NONE: Jika hanya ngobrol santai, perintah tidak masuk akal, atau tidak ada aksi pada inventori.
    
    PENTING: Gunakan bahasa ${languageNames[lang]} sepenuhnya secara organik. Jaga agar JSON valid.
  `;

  try {
    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: text,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            action: { type: Type.STRING, enum: ["SAVE", "FIND", "DELETE", "UPDATE", "NONE"] },
            avatarState: { type: Type.STRING, enum: ["idle", "confirming"], description: "Use 'confirming' only if the user command is ambiguous, incomplete, or if you are asking for clarification. Otherwise use 'idle'." },
            item: { type: Type.STRING },
            location: { type: Type.STRING },
            category: { type: Type.STRING, description: "Category of the item (e.g. Tools, Kitchen, Electronics)" },
            message: { type: Type.STRING },
            is_found: { type: Type.BOOLEAN },
            target_ids: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "List of item IDs matched for DELETE, FIND, or UPDATE actions"
            }
          },
          required: ["action", "message", "avatarState"]
        }
      }
    });

    return JSON.parse(result.candidates?.[0]?.content?.parts?.[0]?.text || '{}');
  } catch (error) {
    console.error("Gemini AI Error:", error);
    throw error;
  }
}

export async function generateSpeech(text: string): Promise<string | null> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    // Extract audio bytes
    const audioPart = response.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
    if (audioPart?.inlineData?.data) {
      return audioPart.inlineData.data; // Base64 string
    }
    return null;
  } catch (error: any) {
    if (error?.status === 429 || error?.message?.includes('429')) {
      console.warn("Speech generation quota exceeded. Falling back to text-only mode.");
    } else {
      console.error("Speech generation failed:", error);
    }
    return null;
  }
}

let audioContext: AudioContext | null = null;

export async function resumeAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
  }
  if (audioContext.state === 'suspended') {
    await audioContext.resume();
  }
}

export function playAudioFromBase64(base64: string, speed: number = 1.0) {
  try {
    // Convert base64 to ArrayBuffer
    const binary = atob(base64);
    const buffer = new ArrayBuffer(binary.length);
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    if (!audioContext) {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }

    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }

    // Audio is 16-bit Linear PCM, little-endian
    const pcmData = new Int16Array(buffer);
    const audioBuffer = audioContext.createBuffer(1, pcmData.length, 24000);
    const channelData = audioBuffer.getChannelData(0);

    for (let i = 0; i < pcmData.length; i++) {
      // Int16 range is -32768 to 32767. Map to [-1, 1].
      channelData[i] = pcmData[i] / 32768;
    }

    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.playbackRate.value = speed;
    source.connect(audioContext.destination);
    
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }
    
    source.start();
  } catch (error) {
    console.error("PCM Playback failed:", error);
  }
}
