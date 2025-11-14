

import React, { useState, useEffect, useCallback } from 'react';
import InputForm from './components/InputForm';
import AssetCard from './components/AssetCard';
import ApiKeySelector from './components/ApiKeySelector';
import { Scene, SceneType, UGCInput } from './types';
import { SCENE_ORDER } from './constants';
import * as geminiService from './services/geminiService';
import { Scripts } from './types';

// Helper to create a clean initial state for a scene
const createInitialScene = (type: SceneType): Scene => ({
    type,
    script: { data: null, isLoading: false, error: null },
    image: { data: null, isLoading: false, error: null },
    video: { data: null, isLoading: false, error: null },
    audio: { data: null, isLoading: false, error: null },
});

// Audio decoding helper functions
function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// FIX: Update decodeAudioData to be more robust and align with guidelines.
async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}


const App: React.FC = () => {
    const [isApiKeyReady, setIsApiKeyReady] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [scenes, setScenes] = useState<Scene[]>(() => SCENE_ORDER.map(createInitialScene));
    const [error, setError] = useState<string | null>(null);
    const [currentInputs, setCurrentInputs] = useState<UGCInput | null>(null);

    useEffect(() => {
        const checkApiKey = async () => {
            if (window.aistudio) {
                const hasKey = await window.aistudio.hasSelectedApiKey();
                setIsApiKeyReady(hasKey);
            } else {
                // Fallback for environments where aistudio is not injected
                console.warn('aistudio global not found. Assuming API key is set via environment variable.');
                setIsApiKeyReady(true);
            }
        };
        checkApiKey();
    }, []);
    
    const updateSceneAsset = <T,>(sceneType: SceneType, assetType: keyof Omit<Scene, 'type'>, value: Partial<Scene[keyof Omit<Scene, 'type'>]>) => {
      setScenes(prevScenes => prevScenes.map(s => 
          s.type === sceneType ? { ...s, [assetType]: { ...s[assetType], ...value } } : s
      ));
    };

    const generateAllAssets = useCallback(async (scripts: Scripts, inputs: UGCInput) => {
      SCENE_ORDER.forEach(sceneType => {
        const script = scripts[sceneType];
        if (!script) return;

        // Generate Image
        updateSceneAsset(sceneType, 'image', { isLoading: true });
        geminiService.generateImage(script, inputs)
          .then(imageData => updateSceneAsset(sceneType, 'image', { data: `data:image/png;base64,${imageData}` }))
          .catch(err => updateSceneAsset(sceneType, 'image', { error: `Image failed: ${err.message}` }))
          .finally(() => updateSceneAsset(sceneType, 'image', { isLoading: false }));

        // Generate Audio
        updateSceneAsset(sceneType, 'audio', { isLoading: true });
        geminiService.generateAudio(script)
          .then(async audioData => {
            // FIX: Set sampleRate on AudioContext and pass parameters to decodeAudioData
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
            const decoded = decode(audioData);
            const buffer = await decodeAudioData(decoded, audioContext, 24000, 1);
            const wavBlob = bufferToWave(buffer);
            const url = URL.createObjectURL(wavBlob);
            updateSceneAsset(sceneType, 'audio', { data: url });
          })
          .catch(err => updateSceneAsset(sceneType, 'audio', { error: `Audio failed: ${err.message}` }))
          .finally(() => updateSceneAsset(sceneType, 'audio', { isLoading: false }));

        // Generate Video
        updateSceneAsset(sceneType, 'video', { isLoading: true });
        geminiService.generateVideo(script, inputs)
          .then(videoUrl => updateSceneAsset(sceneType, 'video', { data: videoUrl }))
          .catch(err => {
              updateSceneAsset(sceneType, 'video', { error: `Video failed: ${err.message}` });
              if (err.message?.includes("Requested entity was not found")) {
                  setError("API Key error. Please re-select your key.");
                  setIsApiKeyReady(false);
              }
          })
          .finally(() => updateSceneAsset(sceneType, 'video', { isLoading: false }));
      });
    }, []);


    const handleSubmit = async (inputs: UGCInput) => {
        setIsLoading(true);
        setError(null);
        setCurrentInputs(inputs);
        setScenes(SCENE_ORDER.map(createInitialScene)); // Reset scenes

        try {
            SCENE_ORDER.forEach(type => updateSceneAsset(type, 'script', { isLoading: true }));
            const scripts = await geminiService.generateScripts(inputs);
            SCENE_ORDER.forEach(type => updateSceneAsset(type, 'script', { data: scripts[type], isLoading: false }));
            await generateAllAssets(scripts, inputs);
        } catch (err: any) {
            setError(`Failed to generate scripts: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleRegenerate = async (sceneType: SceneType, assetType: 'image' | 'video' | 'audio' | 'script') => {
        if (!currentInputs) return;
        
        const sceneToUpdate = scenes.find(s => s.type === sceneType);
        if (!sceneToUpdate?.script.data) {
            alert("Script must exist to regenerate assets.");
            return;
        }

        const script = sceneToUpdate.script.data;
        updateSceneAsset(sceneType, assetType, { isLoading: true, error: null });

        try {
            if (assetType === 'image') {
                const imageData = await geminiService.generateImage(script, currentInputs);
                updateSceneAsset(sceneType, 'image', { data: `data:image/png;base64,${imageData}` });
            } else if (assetType === 'video') {
                const videoUrl = await geminiService.generateVideo(script, currentInputs);
                updateSceneAsset(sceneType, 'video', { data: videoUrl });
            } else if (assetType === 'audio') {
                 // FIX: Set sampleRate on AudioContext and pass parameters to decodeAudioData
                 const audioData = await geminiService.generateAudio(script);
                 const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
                 const decoded = decode(audioData);
                 const buffer = await decodeAudioData(decoded, audioContext, 24000, 1);
                 const wavBlob = bufferToWave(buffer);
                 const url = URL.createObjectURL(wavBlob);
                 updateSceneAsset(sceneType, 'audio', { data: url });
            }
        } catch (err: any) {
            updateSceneAsset(sceneType, assetType, { error: `Failed to regenerate ${assetType}: ${err.message}` });
             if (assetType === 'video' && err.message?.includes("Requested entity was not found")) {
                setError("API Key error. Please re-select your key.");
                setIsApiKeyReady(false);
            }
        } finally {
             updateSceneAsset(sceneType, assetType, { isLoading: false });
        }
    };
    
    const handleKeySelected = () => {
        setIsApiKeyReady(true);
        setError(null);
    };

    if (!isApiKeyReady) {
        return <ApiKeySelector onKeySelected={handleKeySelected} />;
    }

    // bufferToWave function to convert AudioBuffer to a WAV Blob URL
    const bufferToWave = (abuffer: AudioBuffer) : Blob => {
        let numOfChan = abuffer.numberOfChannels,
        length = abuffer.length * numOfChan * 2 + 44,
        buffer = new ArrayBuffer(length),
        view = new DataView(buffer),
        channels = [], i, sample,
        offset = 0,
        pos = 0;

        setUint32(0x46464952); // "RIFF"
        setUint32(length - 8); // file length - 8
        setUint32(0x45564157); // "WAVE"

        setUint32(0x20746d66); // "fmt " chunk
        setUint32(16); // length = 16
        setUint16(1); // PCM (uncompressed)
        setUint16(numOfChan);
        setUint32(abuffer.sampleRate);
        setUint32(abuffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
        setUint16(numOfChan * 2); // block-align
        setUint16(16); // 16-bit

        setUint32(0x61746164); // "data" - chunk
        setUint32(length - pos - 4); // chunk length

        for(i = 0; i < abuffer.numberOfChannels; i++)
            channels.push(abuffer.getChannelData(i));

        while(pos < length) {
            for(i = 0; i < numOfChan; i++) {
                sample = Math.max(-1, Math.min(1, channels[i][offset]));
                sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767)|0;
                view.setInt16(pos, sample, true);
                pos += 2;
            }
            offset++
        }

        return new Blob([view], {type: 'audio/wav'});

        function setUint16(data:number) {
            view.setUint16(pos, data, true);
            pos += 2;
        }

        function setUint32(data:number) {
            view.setUint32(pos, data, true);
            pos += 4;
        }
    }


    return (
        <div className="min-h-screen bg-gray-900 text-white font-sans">
            <header className="py-6 text-center">
                <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">
                    UGC Ad Asset Generator
                </h1>
                <p className="text-gray-400 mt-2 max-w-2xl mx-auto">
                    Create a complete 4-part ad campaign for your product in minutes. Just provide the details and let AI do the heavy lifting.
                </p>
            </header>
            <main className="container mx-auto px-4 py-8">
                 {error && <div className="bg-red-900 border border-red-500 text-red-200 px-4 py-3 rounded-lg relative mb-6 text-center" role="alert">{error}</div>}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-1 p-6 bg-gray-800/50 rounded-2xl border border-gray-700 h-fit sticky top-8">
                        <InputForm onSubmit={handleSubmit} isLoading={isLoading} />
                    </div>
                    <div className="lg:col-span-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            {scenes.map(scene => (
                                <AssetCard key={scene.type} scene={scene} onRegenerate={handleRegenerate}/>
                            ))}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

export default App;
