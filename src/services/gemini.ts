import { GoogleGenAI, Modality } from "@google/genai";
import { DiagnosticResult, WeatherData } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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

export const chatWithAI = async (message: string, language: string, history: { role: 'user' | 'model', content: string }[]) => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("La clé API Gemini n'est pas configurée.");
  }
  const systemInstruction = `Tu es TooluBaay, un conseiller agricole expert au Sénégal. 
  Tu parles en ${language}. 
  Réponds de manière concise et pratique pour des agriculteurs. 
  Si on te pose des questions sur les cultures (arachide, mil, maïs, riz) ou la météo à Tambacounda/Kaffrine, sois très précis.
  Utilise un ton bienveillant et encourageant.`;

  const response = await ai.models.generateContent({
    model: "gemini-flash-latest",
    contents: [
      ...history.map(h => ({ role: h.role, parts: [{ text: h.content }] })),
      { role: 'user', parts: [{ text: message }] }
    ],
    config: {
      systemInstruction,
    },
  });

  return response.text;
};

export const analyzePlantImage = async (dataUrlSource: string, weather?: WeatherData): Promise<DiagnosticResult> => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("La clé API Gemini n'est pas configurée.");
  }

  // Extract mime type and base64 from data URL
  const mimeType = dataUrlSource.includes(';') ? dataUrlSource.split(';')[0].split(':')[1] : 'image/jpeg';
  const base64Image = dataUrlSource.includes(',') ? dataUrlSource.split(',')[1] : dataUrlSource;

  let weatherContext = "";
  if (weather) {
    weatherContext = `Note sur la météo actuelle à ${weather.location}: température ${weather.temp}°C, humidité ${weather.humidity}%, pluviométrie ${weather.rainfall}mm.`;
  }

  const prompt = `Analyse cette photo de plante. 
  Identifie la maladie, le parasite ou le stress (hydrique/nutritionnel).
  ${weatherContext}
  Prends en compte les conditions météo pour affiner ton diagnostic.
  Réponds au format JSON suivant:
  {
    "disease": "Nom de la maladie ou du problème",
    "confidence": 0.95,
    "description": "Description courte et contextualisée du problème",
    "treatment": "Traitement recommandé (bio ou chimique)",
    "prevention": "Conseils pour éviter que cela ne se reproduise"
  }`;

  const response = await ai.models.generateContent({
    model: "gemini-flash-latest",
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

  try {
    return JSON.parse(response.text || "{}");
  } catch (e) {
    return {
      disease: "Inconnu",
      confidence: 0,
      description: "Impossible d'analyser l'image.",
      treatment: "Consultez un agent local.",
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
  const prompt = `En tant qu'expert agricole sénégalais, analyse l'intersection de ces données pour donner un conseil stratégique :
  - Culture : ${crop}
  - Étape actuelle : ${stage}
  - Météo à ${weather.location} : ${weather.temp}°C, ${weather.humidity}% humidité, ${weather.rainfall}mm pluie.
  
  Génère une alerte ou un conseil court (2 phrases) en ${language} qui croise ces informations (ex: si pluie prévue et étape semis, conseiller de préparer les semences).`;

  const response = await ai.models.generateContent({
    model: "gemini-flash-latest",
    contents: [{ text: prompt }],
  });

  return response.text || "";
};

export const transcribeAudio = async (base64Audio: string, language: string): Promise<string> => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("La clé API Gemini n'est pas configurée.");
  }

  const prompt = `Transcris cet audio en texte. La langue parlée est le ${language}. 
  Si l'audio contient une question agricole, transcris-la fidèlement. 
  Réponds uniquement avec la transcription.`;

  const response = await ai.models.generateContent({
    model: "gemini-flash-latest",
    contents: {
      parts: [
        { inlineData: { data: base64Audio, mimeType: "audio/webm" } },
        { text: prompt }
      ]
    }
  });

  return response.text || "";
};

export const textToSpeech = async (text: string, language: string) => {
  // Note: Gemini TTS might not support all local languages perfectly, 
  // but we'll try with a general prompt.
  const response = await ai.models.generateContent({
    model: "gemini-3.1-flash-tts-preview",
    contents: [{ parts: [{ text: `Lis ce texte en ${language}: ${text}` }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Kore' },
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (base64Audio) {
    return addWavHeader(base64Audio);
  }
  return null;
};
