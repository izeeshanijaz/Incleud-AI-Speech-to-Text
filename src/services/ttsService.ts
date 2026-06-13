import { Modality } from "@google/genai";
import { ai } from "../lib/gemini";

export type TTSVoice = 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr';

export interface TTSOptions {
  text: string;
  voice: TTSVoice;
  language?: string;
  speed?: number;
  pitch?: number;
}

export async function generateSpeech(options: TTSOptions): Promise<string> {
  const { text, voice, language = 'en' } = options;

  // We include character instructions in the prompt to help with specific "feel"
  // although the model mainly respects the prebuiltVoiceConfig
  const prompt = `Convert the following ${language} text to speech. ${text}`;

  const response = await ai.models.generateContent({
    model: "gemini-3.1-flash-tts-preview",
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: voice },
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  
  if (!base64Audio) {
    throw new Error("Failed to generate audio data");
  }

  return base64Audio;
}
