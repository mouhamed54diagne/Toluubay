import { GoogleGenAI, Modality } from "@google/genai";
import { DiagnosticResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export const chatWithAI = async (message: string, language: string, history: { role: 'user' | 'model', content: string }[]) => {
  const systemInstruction = `Tu es TooluBaay, un conseiller agricole expert au Sénégal. 
  Tu parles en ${language}. 
  Réponds de manière concise et pratique pour des agriculteurs. 
  Si on te pose des questions sur les cultures (arachide, mil, maïs, riz) ou la météo à Tambacounda/Kaffrine, sois très précis.
  Utilise un ton bienveillant et encourageant.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
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

export const analyzePlantImage = async (base64Image: string): Promise<DiagnosticResult> => {
  const prompt = `Analyse cette photo de plante. 
  Identifie la maladie, le parasite ou le stress (hydrique/nutritionnel).
  Réponds au format JSON suivant:
  {
    "disease": "Nom de la maladie ou du problème",
    "confidence": 0.95,
    "description": "Description courte du problème observé",
    "treatment": "Traitement recommandé (bio ou chimique)",
    "prevention": "Conseils pour éviter que cela ne se reproduise"
  }`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-image",
    contents: {
      parts: [
        { inlineData: { data: base64Image, mimeType: "image/jpeg" } },
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

export const transcribeAudio = async (base64Audio: string, language: string): Promise<string> => {
  const prompt = `Transcris cet audio en texte. La langue parlée est le ${language}. 
  Si l'audio contient une question agricole, transcris-la fidèlement. 
  Réponds uniquement avec la transcription.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
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
    return `data:audio/wav;base64,${base64Audio}`;
  }
  return null;
};
