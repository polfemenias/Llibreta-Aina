import { GoogleGenAI, Type, Modality } from '@google/genai';
import type { Slide } from '../types';

let ai: GoogleGenAI | null = null;

/**
 * Lazily initializes and returns the GoogleGenAI client instance.
 * It reads the API key from Vite's environment variables.
 * @returns {GoogleGenAI} The initialized GoogleGenAI client.
 */
const getAiClient = (): GoogleGenAI => {
    if (ai) {
        return ai;
    }

    // FIX: Use process.env.API_KEY as per the guidelines. This also resolves the TypeScript error.
    const apiKey = process.env.API_KEY;

    if (!apiKey) {
      // FIX: Updated error message to be more generic.
      throw new Error("API Key no trobada. Assegura't que la clau d'API estigui configurada correctament.");
    }
    
    ai = new GoogleGenAI({ apiKey });
    return ai;
}

const textModel = 'gemini-2.5-flash';
const imageModel = 'gemini-2.5-flash-image';

interface PresentationContentResponse {
  slides: Omit<Slide, 'imageUrl'>[];
}

export const generatePresentationContent = async (topic: string): Promise<Omit<Slide, 'imageUrl'>[]> => {
  const prompt = `You are an enthusiastic and knowledgeable guide for curious young learners, aged 9-12. Your task is to create a clear, engaging, and informative presentation about "${topic}".
The tone should be educational but exciting, avoiding overly simplistic or patronizing language.
The presentation must be written entirely in CATALAN for the parts that will be displayed to the user.
Generate between 8 to 10 slides.
For each slide, provide the following fields in a JSON object:
1. "title": A concise and interesting title for the slide, in CATALAN.
2. "content": An informative and engaging paragraph (around 40-50 words) for the slide, in CATALAN.
3. "imagePrompt": A detailed description in ENGLISH for an AI image generator. This prompt should describe a scene that is visually compelling and accurately represents the slide's content, leaning towards realism or a specific artistic style rather than a cartoonish one.

The entire final output must be a single valid JSON object.`;

  try {
    const aiClient = getAiClient();
    const response = await aiClient.models.generateContent({
      model: textModel,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            slides: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING, description: 'The title of the slide in Catalan.' },
                  content: { type: Type.STRING, description: 'The educational content for the slide in Catalan.' },
                  imagePrompt: { type: Type.STRING, description: 'A detailed prompt in English for the image generator.' },
                },
                required: ['title', 'content', 'imagePrompt'],
              },
            },
          },
          required: ['slides'],
        },
      },
    });

    const jsonText = response.text.trim();
    const parsed: PresentationContentResponse = JSON.parse(jsonText);
    if (!parsed.slides || !Array.isArray(parsed.slides) || parsed.slides.length === 0) {
        throw new Error("AI returned an invalid slide structure.");
    }
    return parsed.slides;

  } catch (error) {
    console.error("Error generating presentation content:", error);
    if (error instanceof Error && error.message.toLowerCase().includes("api key")) {
        // FIX: Updated error message to be more generic.
        throw new Error("Hi ha hagut un problema d'autenticació amb el servei d'IA. Verifica que la teva API Key estigui ben configurada.");
    }
    throw new Error("No he pogut crear la història. Potser el tema és massa complicat. Prova amb un altre!");
  }
};

export const generateSlideImage = async (description: string, stylePrompt: string): Promise<string> => {
  // By making the style instruction a dominant, separate command, we prevent the "children's storyteller"
  // context from the text generation from "bleeding" into the image style, ensuring realistic photos are realistic.
  const fullPrompt = `Image content description: "${description}".

The image MUST strictly adhere to the following artistic style and constraints: "${stylePrompt}".
The image MUST have a portrait aspect ratio (2:3).`;

  try {
    const aiClient = getAiClient();
    const response = await aiClient.models.generateContent({
      model: imageModel,
      contents: {
        parts: [{ text: fullPrompt }],
      },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });
    
    const firstPart = response.candidates?.[0]?.content?.parts?.[0];
    if (firstPart && firstPart.inlineData) {
      const base64ImageBytes = firstPart.inlineData.data;
      return `data:${firstPart.inlineData.mimeType};base64,${base64ImageBytes}`;
    } else {
      throw new Error("No image data received from API.");
    }

  } catch (error) {
    console.error("Error generating slide image:", error);
    if (error instanceof Error && error.message.toLowerCase().includes("api key")) {
        // FIX: Updated error message to be more generic.
        throw new Error("Hi ha hagut un problema d'autenticació amb el servei d'IA. Verifica que la teva API Key estigui ben configurada.");
    }
    throw new Error("No he pogut dibuixar una de les imatges. Torna-ho a provar.");
  }
};