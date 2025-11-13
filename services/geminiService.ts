import { GoogleGenAI, Type, Modality } from '@google/genai';
import type { Slide } from '../types';

let ai: GoogleGenAI | null = null;

/**
 * Lazily initializes and returns the GoogleGenAI client instance.
 * It reads the API key from the environment variables.
 * @returns {GoogleGenAI} The initialized GoogleGenAI client.
 */
const getAiClient = (): GoogleGenAI => {
    if (ai) {
        return ai;
    }

    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        throw new Error("La clau de l'API no està configurada. Assegura't que has creat un 'Secret' a Replit amb el nom API_KEY.");
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
  const prompt = `You are a warm and friendly storyteller for children aged 5-8. Your task is to create a simple and charming presentation about "${topic}".
The presentation must be written entirely in CATALAN for the parts that will be displayed to the user.
Generate between 5 to 8 slides.
For each slide, provide the following fields in a JSON object:
1. "title": A very short and simple title for the slide, in CATALAN.
2. "content": A short, simple, and magical paragraph (maximum 30 words) for the slide, in CATALAN.
3. "imagePrompt": A detailed description in ENGLISH for an AI image generator. This prompt should describe a vivid, cute, and colorful scene that visually represents the slide's content.

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
    if (error instanceof Error && (error.message.toLowerCase().includes("api key") || error.message.includes("clau de l'API"))) {
        throw new Error("Hi ha hagut un problema d'autenticació amb el servei d'IA.");
    }
    throw new Error("No he pogut crear la història. Potser el tema és massa complicat. Prova amb un altre!");
  }
};

export const generateSlideImage = async (description: string, stylePrompt: string): Promise<string> => {
  const fullPrompt = `${description}, portrait aspect ratio (2:3), in the style of ${stylePrompt}`;

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
    if (error instanceof Error && (error.message.toLowerCase().includes("api key") || error.message.includes("clau de l'API"))) {
        throw new Error("Hi ha hagut un problema d'autenticació amb el servei d'IA.");
    }
    throw new Error("No he pogut dibuixar una de les imatges. Torna-ho a provar.");
  }
};