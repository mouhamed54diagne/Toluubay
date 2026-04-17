import { GoogleGenAI, Modality } from "@google/genai";
import { DiagnosticResult, WeatherData } from "../types";

// Safely access environment variables in the browser
const getApiKey = () => {
  try {
    return (process.env.GEMINI_API_KEY) || '';
  } catch (e) {
    return '';
  }
};

const ai = new GoogleGenAI({ apiKey: getApiKey() });
const MODEL_TEXT = "gemini-3-flash-preview";

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
  if (!getApiKey()) {
    throw new Error("Clé API Gemini non trouvée. Veuillez configurer les secrets dans l'éditeur.");
  }
  const systemInstruction = `Tu es TooluBaay, un conseiller agricole expert au Sénégal. 
  Tu parles en ${language}. 
  Réponds de manière concise et pratique.`;

  const response = await ai.models.generateContent({
    model: MODEL_TEXT,
    contents: [
      ...history.map(h => ({ role: h.role, parts: [{ text: h.content }] })),
      { role: 'user', parts: [{ text: message }] }
    ],
    config: {
      systemInstruction,
    },
  });

  return response.text || "Désolé, je n'ai pas pu générer de réponse.";
};

export const analyzePlantImage = async (dataUrlSource: string, weather?: WeatherData): Promise<DiagnosticResult> => {
  if (!getApiKey()) {
    throw new Error("Clé API Gemini non configurée.");
  }

  const mimeType = dataUrlSource.includes(';') ? dataUrlSource.split(';')[0].split(':')[1] : 'image/jpeg';
  const base64Image = dataUrlSource.includes(',') ? dataUrlSource.split(',')[1] : dataUrlSource;

  let weatherContext = "";
  if (weather) {
    weatherContext = `Météo actuelle: ${weather.temp}°C, ${weather.condition}.`;
  }

  const prompt = `Analyse cette photo de plante pour TooluBaay. ${weatherContext}
  Identifie la maladie ou le stress.
  Réponds au format JSON suivant:
  {
    "disease": "Nom du problème",
    "confidence": 0.95,
    "description": "Description courte",
    "treatment": "Traitement recommandé",
    "prevention": "Conseils de prévention"
  }`;

  const response = await ai.models.generateContent({
    model: MODEL_TEXT,
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
    console.error("Erreur parsing JSON Gemini", e);
    return {
      disease: "Analyse impossible",
      confidence: 0,
      description: "L'image n'a pas pu être traitée correctement.",
      treatment: "Veuillez reprendre une photo plus claire.",
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
  if (!getApiKey()) return "Veuillez configurer votre clé API.";

  const prompt = `En tant que TooluBaay, donne un conseil stratégique court (2 phrases) en ${language} pour la culture ${crop} (${stage}) avec météo: ${weather.temp}°C, ${weather.condition}.`;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_TEXT,
      contents: [{ text: prompt }],
    });
    return response.text || "Préparez vos prochaines étapes culturelles.";
  } catch (e) {
    console.error("Erreur Insight", e);
    return "Optimisation météo momentanément indisponible.";
  }
};

export const transcribeAudio = async (base64Audio: string, language: string): Promise<string> => {
  if (!getApiKey()) return "";

  const prompt = `Transcris fidèlement l'audio ci-joint. 
  IMPORTANT: Réponds UNIQUEMENT par le texte transcrit. 
  Ne dis PAS "Voici la transcription", ne fais AUCUN commentaire.
  Si tu n'entends rien, ne réponds rien.
  Langue: ${language}.`;

  const response = await ai.models.generateContent({
    model: MODEL_TEXT,
    contents: {
      parts: [
        { inlineData: { data: base64Audio, mimeType: "audio/webm" } },
        { text: prompt }
      ]
    }
  });

  let text = response.text || "";
  
  // Nettoyage de sécurité au cas où le modèle reste bavard
  text = text.replace(/Voici la transcription[:\s]*/i, '')
             .replace(/La transcription est[:\s]*/i, '')
             .replace(/^"|"$/g, '') // Enlever les guillemets éventuels
             .trim();
             
  return text;
};

export const textToSpeech = async (text: string, language: string) => {
  if (!getApiKey()) return null;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text: `Lis ce texte en ${language}: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            // 'Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      return addWavHeader(base64Audio);
    }
  } catch (e) {
    console.error("TTS Error", e);
  }
  return null;
};
