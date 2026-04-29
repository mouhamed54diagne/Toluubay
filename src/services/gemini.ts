import { GoogleGenAI, Modality, ThinkingLevel } from "@google/genai";
import { DiagnosticResult, WeatherData } from "../types";

let lastAiError: string | null = null;

export const getLastAiError = () => lastAiError;

const setAiError = (error: any) => {
  const msg = error instanceof Error ? error.message : String(error);
  lastAiError = msg;
  console.error("[TooluBaay AI Error]", msg);
};

// Robust key retrieval with priority on the real provided key
export const getSafeKey = (): string => {
  const HARDCODED_KEY = 'AIzaSyA_Ghnai-NTuEyYh3aInRAUA41oq_gOM20';
  
  // Use the key from the environment (Vite/Node compatibility)
  const envKey = (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : '') || 
                 (import.meta as any).env.VITE_GEMINI_API_KEY || 
                 '';

  // If envKey is a placeholder or missing, return hardcoded
  if (!envKey || !envKey.trim().startsWith('AIza')) {
    return HARDCODED_KEY;
  }

  return envKey.trim();
};

export const keyToUse = getSafeKey();
const ai = new GoogleGenAI({ apiKey: keyToUse });

// Standardized model names for TooluBaay
const MODEL_TEXT = "gemini-3-flash-preview";
const MODEL_VISION = "gemini-3-flash-preview";
const MODEL_TTS = "gemini-3.1-flash-tts-preview";

export const hasApiKey = () => {
  return typeof keyToUse === 'string' && keyToUse.length > 15;
};

// Log initialization status (safely)
console.log(`[TooluBaay] System initialized. AI: ${hasApiKey() ? "Ready" : "Offline"}`);

/**
 * Adds a WAV header to raw PCM data.
 * Gemini TTS returns 16-bit Mono PCM at 24kHz.
 */
function addWavHeader(base64Pcm: string, sampleRate = 24000): string {
  const pcmData = atob(base64Pcm);
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = pcmData.length;
  const chunkSize = 36 + dataSize;
  
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  
  // RIFF chunk
  view.setUint8(0, 0x52); // 'R'
  view.setUint8(1, 0x49); // 'I'
  view.setUint8(2, 0x46); // 'F'
  view.setUint8(3, 0x46); // 'F'
  view.setUint32(4, chunkSize, true);
  view.setUint8(8, 0x57); // 'W'
  view.setUint8(9, 0x41); // 'A'
  view.setUint8(10, 0x56); // 'V'
  view.setUint8(11, 0x45); // 'E'
  
  // fmt chunk
  view.setUint8(12, 0x66); // 'f'
  view.setUint8(13, 0x6d); // 'm'
  view.setUint8(14, 0x74); // 't'
  view.setUint8(15, 0x20); // ' '
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  
  // data chunk
  view.setUint8(36, 0x64); // 'd'
  view.setUint8(37, 0x61); // 'a'
  view.setUint8(38, 0x74); // 't'
  view.setUint8(39, 0x61); // 'a'
  view.setUint32(40, dataSize, true);
  
  // Copy PCM data
  for (let i = 0; i < pcmData.length; i++) {
    view.setUint8(44 + i, pcmData.charCodeAt(i));
  }
  
  const blob = new Blob([buffer], { type: 'audio/wav' });
  return URL.createObjectURL(blob);
}

// Exponential backoff helper for retrying AI calls on transient errors
const withRetry = async <T>(fn: () => Promise<T>, retries = 3, delay = 1200): Promise<T> => {
  try {
    return await fn();
  } catch (error: any) {
    // 503 is Service Unavailable (high demand), 429 is Resource Exhausted (quota)
    const isRetryable = error?.message?.includes('503') || error?.message?.includes('UNAVAILABLE') || 
                        error?.status === 'UNAVAILABLE' || error?.message?.includes('429');
    
    if (retries > 0 && isRetryable) {
      console.warn(`[TooluBaay] Model busy, retrying in ${delay}ms... (${retries} attempts left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
};

export const chatWithAI = async (message: string, language: string, history: { role: 'user' | 'model', content: string }[]) => {
  if (!hasApiKey()) {
    throw new Error("Clé API Gemini non trouvée.");
  }
  
  const systemInstruction = `Tu es TooluBaay, un conseiller agricole expert au Sénégal. Tu parles en ${language}. Réponds de manière concise et pratique.`;

  const runChat = async () => {
    // Limit history to the 5 last messages and filter out empty ones
    const recentHistory = history
      .filter(h => h.content && h.content.trim().length > 0)
      .slice(-5);
    
    // Standardize structure for maximum compatibility
    const contents = [
      ...recentHistory.map(h => ({ role: h.role === 'model' ? 'model' : 'user', parts: [{ text: h.content }] })),
      { role: 'user', parts: [{ text: message }] }
    ];

    const response = await ai.models.generateContent({
      model: MODEL_TEXT,
      contents,
      config: {
        systemInstruction,
      },
    });

    if (!response.text) {
      throw new Error("Empty AI response");
    }

    return response.text;
  };

  try {
    return await withRetry(runChat);
  } catch (error: any) {
    setAiError(error);
    if (error?.message?.includes('503') || error?.status === 'UNAVAILABLE') {
       return "Le service est temporairement surchargé. Veuillez patienter une minute et réessayer votre question.";
    }
    throw error;
  }
};

export const analyzePlantImage = async (dataUrlSource: string, weather?: WeatherData): Promise<DiagnosticResult> => {
  if (!hasApiKey()) {
    throw new Error("Clé API Gemini non trouvée.");
  }

  const mimeType = dataUrlSource.includes(';') ? dataUrlSource.split(';')[0].split(':')[1] : 'image/jpeg';
  const base64Image = dataUrlSource.includes(',') ? dataUrlSource.split(',')[1] : dataUrlSource;

  const prompt = `Analyse cette photo de plante pour TooluBaay. ${weather ? `Météo: ${weather.temp}°C, ${weather.condition}.` : ''}
  Identifie la maladie. Réponds UNIQUEMENT en JSON:
  {
    "disease": "Nom",
    "confidence": 0.9,
    "description": "...",
    "treatment": "...",
    "prevention": "..."
  }`;

  const runAnalysis = async () => {
    const response = await ai.models.generateContent({
      model: MODEL_VISION,
      contents: {
        parts: [
          { inlineData: { data: base64Image, mimeType } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
      }
    });

    return JSON.parse(response.text || "{}");
  };

  try {
    return await withRetry(runAnalysis);
  } catch (e) {
    setAiError(e);
    return {
      disease: "Analyse impossible",
      confidence: 0,
      description: "Le service est peut-être surchargé ou l'image n'est pas claire. Veuillez réessayer plus tard.",
      treatment: "Veuillez reprendre une photo.",
      prevention: "N/A"
    };
  }
};

export const generateIntelligentInsight = async (
  crop: string, 
  stage: string, 
  weather: WeatherData, 
  language: string
): Promise<string> => {
  if (!hasApiKey()) return "Veuillez configurer votre clé API.";

  const systemInstruction = `Tu es TooluBaay, conseiller expert en agriculture au Sénégal. 
  Donne un conseil technique PRÉCIS et actionnable (2 phrases max) en ${language === 'wo' ? 'Wolof' : 'Français'}.
  Analyse : Culture: ${crop}, Phase: ${stage}, Météo: ${weather.temp}°C, ${weather.condition}. 
  Évite absolument les généralités comme "surveillez votre culture". Parle de l'impact direct de ces conditions.`;

  const runInsight = async () => {
    const response = await ai.models.generateContent({
      model: MODEL_TEXT,
      contents: [{ role: 'user', parts: [{ text: `Analyse cropping condition: ${crop} at stage ${stage} with weather ${weather.temp}C and condition ${weather.condition}` }] }],
      config: {
        systemInstruction,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
      }
    });
    return response.text?.trim() || `Recommandation ${crop} (${stage}) : Maintien de la vigilance face aux ${weather.temp}°C.`;
  };

  try {
    return await withRetry(runInsight);
  } catch (e) {
    setAiError(e);
    // Better dynamic fallback
    const weatherHint = weather.temp > 35 ? "chaleur extrême" : (weather.condition.toLowerCase().includes('pluie') ? "pluviométrie" : "évapotranspiration");
    return `Conseil expert pallié (${crop}/${stage}) : Face à cette ${weatherHint} (${weather.temp}°C), optimisez l'arrosage au pied et vérifiez l'état des feuilles.`;
  }
};

export const transcribeAudio = async (base64Audio: string, language: string, mimeType: string = "audio/webm"): Promise<string> => {
  if (!hasApiKey()) return "";

  const prompt = `TRANSCRIPTION VERBATIM (STRICTEMENT MOT À MOT) :
  Transcris exactement chaque mot prononcé dans cet audio. 
  NE CORRIGE PAS la grammaire, NE RÉSUME PAS, NE TRADUIS PAS.
  Si la langue est le Wolof, Sérère ou Pulaar, transcris dans cette langue.
  IMPORTANT: Réponds UNIQUEMENT par le texte brut. 
  Pas de commentaires, pas d'introduction.
  Langue cible : ${language}.`;

  const runTranscription = async () => {
    const response = await ai.models.generateContent({
      model: MODEL_TEXT,
      contents: {
        parts: [
          { inlineData: { data: base64Audio, mimeType } },
          { text: prompt }
        ]
      },
    });

    let text = response.text || "";
    
    // Nettoyage de sécurité
    text = text.replace(/Voici la transcription[:\s]*/i, '')
               .replace(/La transcription est[:\s]*/i, '')
               .replace(/^"|"$/g, '') 
               .trim();
               
    return text;
  };

  try {
    return await withRetry(runTranscription);
  } catch (e) {
    console.error("Transcription Error:", e);
    setAiError(e);
    return "";
  }
};

export const textToSpeech = async (text: string, language: string) => {
  if (!hasApiKey()) return null;

  // Map codes to full language names for better model understanding
  const langName = language === 'wo' ? 'Wolof' : (language === 'fr' ? 'Français' : language);

  const runTTS = async () => {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      // Direct instruction to minimize generation latency
      contents: [{ parts: [{ text: `Narrate in ${langName}: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            // 'Puck' is a balanced voice, sometimes faster to stabilize
            prebuiltVoiceConfig: { voiceName: 'Puck' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      return addWavHeader(base64Audio);
    }
    throw new Error("No audio generated");
  };

  try {
    return await withRetry(runTTS);
  } catch (e) {
    console.error("TTS Error", e);
    setAiError(e);
  }
  return null;
};
