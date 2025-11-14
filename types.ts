

export enum SceneType {
    Hook = 'Hook',
    Problem = 'Problem',
    Solution = 'Solution',
    CTA = 'CTA',
}

export interface Asset<T> {
    data: T | null;
    isLoading: boolean;
    error: string | null;
}

export interface Scene {
    type: SceneType;
    script: Asset<string>;
    image: Asset<string>; // base64 string
    video: Asset<string>; // URL
    audio: Asset<string>; // base64 string
}

export interface UGCInput {
    productName: string;
    moods: string[];
    backgrounds: string[];
    productImage: string | null; // base64 string
    modelImage: string | null; // base64 string
}

export interface Scripts {
    [SceneType.Hook]: string;
    [SceneType.Problem]: string;
    [SceneType.Solution]: string;
    [SceneType.CTA]: string;
}

// FIX: Define a named interface for aistudio and use it on the Window object.
// This resolves the "Subsequent property declarations must have the same type" error.
// This is a global declaration for aistudio, which is injected by the environment.
interface AIStudio {
  hasSelectedApiKey: () => Promise<boolean>;
  openSelectKey: () => Promise<void>;
}

declare global {
  interface Window {
    aistudio: AIStudio;
  }
}
