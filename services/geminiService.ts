

import { GoogleGenAI, Type, Modality } from "@google/genai";
import { UGCInput, Scripts, SceneType } from '../types';

// Helper to create a new Gemini AI client. Necessary for Veo to pick up the latest API key.
const getAiClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

const SCRIPT_SCHEMA = {
    type: Type.OBJECT,
    properties: {
        [SceneType.Hook]: { type: Type.STRING, description: 'A short, attention-grabbing hook (1-2 sentences).' },
        [SceneType.Problem]: { type: Type.STRING, description: 'A relatable problem the target audience faces (1-2 sentences).' },
        [SceneType.Solution]: { type: Type.STRING, description: 'How the product solves this problem (1-2 sentences).' },
        [SceneType.CTA]: { type: Type.STRING, description: 'A clear call to action (1 sentence).' },
    },
    required: [SceneType.Hook, SceneType.Problem, SceneType.Solution, SceneType.CTA],
};

export const generateScripts = async (inputs: UGCInput): Promise<Scripts> => {
    const ai = getAiClient();
    const prompt = `
        Create a 4-part UGC (User-Generated Content) video ad script for a product called "${inputs.productName}".
        The ad should feel authentic and be suitable for platforms like TikTok, Instagram Reels, and YouTube Shorts.
        Product Image is provided as context. Model image is provided for visual style reference.
        
        Desired Moods: ${inputs.moods.join(', ')}.
        Desired Backgrounds: ${inputs.backgrounds.join(', ')}.

        Generate a concise script for each of the following four scenes: Hook, Problem, Solution, and CTA.
        Each part should be 1-2 sentences long.
    `;

    const imageParts = [];
    if (inputs.productImage) {
        imageParts.push({ inlineData: { mimeType: 'image/jpeg', data: inputs.productImage } });
    }
    if (inputs.modelImage) {
        imageParts.push({ inlineData: { mimeType: 'image/jpeg', data: inputs.modelImage } });
    }

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: { parts: [{ text: prompt }, ...imageParts] },
        config: {
            responseMimeType: 'application/json',
            responseSchema: SCRIPT_SCHEMA,
        },
    });

    const text = response.text.trim();
    return JSON.parse(text) as Scripts;
};

export const generateImage = async (script: string, inputs: UGCInput): Promise<string> => {
    const ai = getAiClient();
    const prompt = `
        Generate a photorealistic, UGC-style image for a social media video ad.
        The scene depicts: "${script}".
        The product is "${inputs.productName}".
        The overall mood is "${inputs.moods[0]}" and the background is "${inputs.backgrounds[0]}".
        The image should look like it was shot on a modern smartphone.
        Use a vertical 9:16 aspect ratio.
    `;
    
    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt,
        config: {
            numberOfImages: 1,
            aspectRatio: '9:16',
            outputMimeType: 'image/png'
        }
    });

    return response.generatedImages[0].image.imageBytes;
};

export const generateAudio = async (script: string): Promise<string> => {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `In a friendly, conversational tone, say: ${script}` }] }],
        config: {
            // FIX: Use Modality.AUDIO enum instead of a raw string.
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: 'Kore' },
                },
            },
        },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data ?? '';
};

export const generateVideo = async (script: string, inputs: UGCInput): Promise<string> => {
    const ai = getAiClient();
    const prompt = `
        A 5-second, UGC-style vertical video for social media.
        Scene: "${script}".
        The product in the video is "${inputs.productName}".
        The mood is "${inputs.moods[0]}" and the background is "${inputs.backgrounds[0]}".
        The style should be authentic, as if shot on a smartphone.
    `;
    
    const imagePayload = inputs.productImage ? {
        imageBytes: inputs.productImage,
        mimeType: 'image/jpeg'
    } : undefined;

    let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: prompt,
        image: imagePayload,
        config: {
            numberOfVideos: 1,
            resolution: '720p',
            aspectRatio: '9:16',
        }
    });

    while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) {
        throw new Error("Video generation failed to produce a download link.");
    }
    
    // FIX: The API key must be appended to the download link to fetch the video.
    return `${downloadLink}&key=${process.env.API_KEY}`;
};
