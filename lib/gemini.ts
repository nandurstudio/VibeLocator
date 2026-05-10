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

  const suInstructions = `You are a helpful assistant speaking a casual Sundanese-Indonesian mix. Use terms like "Sobat", "Wargi", "Anjeun". Do not use gender-specific terms like "Aa", "Akang", "Teh".`;
  const idInstructions = `You are a helpful assistant speaking standard Indonesian. Use formal/polite Indonesian. Do not use Sundanese words or informal mixed phrases. Use "Anda" or friendly, gender-neutral address.`;
  const enInstructions = `You are a helpful assistant speaking professional/helpful English. Use gender-neutral address. Do not use any Sundanese or Indonesian words.`;

  const dynamicInstructions = lang === 'en' ? enInstructions : (lang === 'id' ? idInstructions : suInstructions);

  const systemInstruction = `
    Kamu adalah "ViLo" (VibeLocator AI), asisten pintar pencatat lokasi barang.
    
    Active Language: ${languageNames[lang]}
    STRICT LANGUAGE ENFORCEMENT: Respond EXCLUSIVELY in the target language (${languageNames[lang]}). Do not use any words or phrases from other languages UNLESS they are proper nouns or part of the item names themselves.

    Persona: ${dynamicInstructions}
    
    Tugas Utama: Membantu mencatat lokasi barang dan mencari barang yang tersimpan.
    
    ATURAN LOGIKA PENTING:
    1. ANALISIS TUJUAN: Jangan cepat menyimpulkan user ingin menyimpan/mencari barang jika user hanya bercerita atau bertanya hal umum.
    2. KASUS PERCAKAPAN UMUM: Jika user bertanya hal umum, jelaskan dengan sopan bahwa kamu adalah asisten pencatat lokasi barang, dan tawarkan bantuan untuk mencatat lokasi benda tertentu saja.
    3. PENGHAPUSAN TRIGGER/PREAMBLE: Dalam percakapan, abaikan kalimat pembuka yang tidak bertujuan menyimpan/mencari (misal: "Filo tolong"). Fokus hanya pada perintah inti setelahnya.
    4. VALIDASI LOGIKA: Pastikan lokasi yang diekstrak masuk akal. Jika lokasi tidak masuk akal, ATAU jika user tidak memberikan perintah jelas untuk menyimpan/mencari/menghapus/mengubah, gunakan action "NONE" dan jelaskan dengan sopan mengapa tindakan tidak dilakukan.

    Daftar barang saat ini: ${JSON.stringify(currentItems)}
    
    Jika user MENYIMPAN (SAVE):
    Ekstrak item, lokasi, dan tentukan kategori yang paling cocok.
    Hanya jika ada perintah yang jelas untuk menyimpan, kembalikan JSON dengan action "SAVE". 
    
    Jika user MEMINDAHKAN (UPDATE):
    Jika user menyebutkan perintah jelas untuk pindah lokasi barang yang sudah ada, kembalikan JSON dengan action "UPDATE". Sertakan ID barang di "target_ids".
    
    Jika user MENCARI (FIND):
    Cari item dan sampaikan lokasinya.
    Kembalikan JSON dengan action "FIND".
    
    Jika user MENGHAPUS (DELETE):
    Cari item yang ingin dihapus.
    Kembalikan JSON dengan action "DELETE".
    
    Jika perintah TIDAK JELAS atau TIDAK MASUK AKAL (NONE):
    Kembalikan JSON dengan action "NONE". Jelaskan dengan sopan mengapa tindakan tidak bisa dilakukan.
    
    PENTING: Output message HARUS dalam bahasa ${languageNames[lang]}. Output JSON HARUS valid.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: text,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            action: { type: Type.STRING, enum: ["SAVE", "FIND", "DELETE", "UPDATE", "NONE"] },
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
          required: ["action", "item", "location", "category", "message"]
        }
      }
    });

    const result = JSON.parse(response.text || "{}");
    
    // Safety check: if action is NONE, force some defaults to satisfy the UI logic if needed
    if (result.action === 'NONE') {
        return {
            ...result,
            item: 'N/A',
            location: 'N/A',
            category: 'General',
            message: result.message
        };
    }
    
    return result;
  } catch (error: any) {
    if (error?.status === 429 || error?.message?.includes('429')) {
      throw new Error('429 Quota Exceeded');
    }
    throw error;
  }
}

export async function generateSpeech(text: string): Promise<string | null> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
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

    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
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

export function playAudioFromBase64(base64: string) {
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
    source.connect(audioContext.destination);
    
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }
    
    source.start();
  } catch (error) {
    console.error("PCM Playback failed:", error);
  }
}
