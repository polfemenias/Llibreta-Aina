
export type Language = 'ca' | 'es';

export interface ImageStyle {
  name: string;
  prompt: string;
}

export interface Slide {
  title: string;
  content: string;
  imagePrompt: string;
  imageUrl?: string; 
}

export interface Presentation {
  id: string;
  topic: string;
  slides: Slide[];
  style: ImageStyle;
  language: Language;
}

export interface GenerationProgress {
  currentStep: number;
  totalSteps: number;
  message: string;
}
