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
  // REMOVED explicit aspect ratio request to improve reliability.
  const fullPrompt = `Image content description: "${description}".

The image MUST strictly adhere to the following artistic style and constraints: "${stylePrompt}".`;

  const callApi = async () => {
    const aiClient = getAiClient();
    const response = await aiClient.models.generateContent({
      model: imageModel,
      contents: { parts: [{ text: fullPrompt }] },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });
    
    // Check for explicit safety blocks first
    if (response.promptFeedback?.blockReason) {
        throw new Error(`El tema ha estat bloquejat per la IA per motius de seguretat (${response.promptFeedback.blockReason}). Prova amb un altre tema.`);
    }
    
    const candidate = response.candidates?.[0];
    if (!candidate) {
      throw new Error("La IA no ha generat cap resposta per a la imatge.");
    }
    
    if (candidate.finishReason === 'SAFETY') {
        throw new Error("El contingut d'una imatge ha estat bloquejat per motius de seguretat. La presentació no s'ha pogut completar.");
    }

    const firstPart = candidate.content?.parts?.[0];
    if (firstPart && firstPart.inlineData) {
      return `data:${firstPart.inlineData.mimeType};base64,${firstPart.inlineData.data}`;
    } else {
      // This case means we got a valid response, but no image data.
      // It might be due to a subtle issue like recitation or other finish reasons.
      const reason = candidate.finishReason ? ` Raó: ${candidate.finishReason}` : '';
      throw new Error(`No he rebut dades d'imatge de l'API.${reason}`);
    }
  };

  try {
    // First attempt
    return await callApi();
  } catch (error) {
    console.warn("First attempt to generate image failed. Retrying once...", error);
    // On failure, wait a moment and try one more time.
    await new Promise(resolve => setTimeout(resolve, 1500));
    try {
        // Second attempt
        return await callApi();
    } catch (finalError) {
        console.error("Error generating slide image after retry:", finalError);
        if (finalError instanceof Error) {
            // Propagate our specific, user-friendly safety messages
            if (finalError.message.includes('seguretat') || finalError.message.includes('bloquejat')) {
                throw finalError;
            }
            if (finalError.message.toLowerCase().includes("api key")) {
                throw new Error("Hi ha hagut un problema d'autenticació amb el servei d'IA. Verifica que la teva API Key estigui ben configurada.");
            }
        }
        // Fallback to the generic error message for all other failures after retry.
        throw new Error("No he pogut dibuixar una de les imatges. Torna-ho a provar.");
    }
  }
};
