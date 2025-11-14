
import React, { useState, useEffect } from 'react';
import { Scene, SceneType } from '../types';
import DownloadIcon from './icons/DownloadIcon';
import RegenerateIcon from './icons/RegenerateIcon';
import { VEO_LOADING_MESSAGES } from '../constants';

interface AssetCardProps {
    scene: Scene;
    onRegenerate: (sceneType: SceneType, assetType: 'image' | 'video' | 'audio' | 'script') => void;
}

const AssetCard: React.FC<AssetCardProps> = ({ scene, onRegenerate }) => {
    const [currentLoadingMessage, setCurrentLoadingMessage] = useState(VEO_LOADING_MESSAGES[0]);

    useEffect(() => {
        if (scene.video.isLoading) {
            const interval = setInterval(() => {
                setCurrentLoadingMessage(prev => {
                    const currentIndex = VEO_LOADING_MESSAGES.indexOf(prev);
                    const nextIndex = (currentIndex + 1) % VEO_LOADING_MESSAGES.length;
                    return VEO_LOADING_MESSAGES[nextIndex];
                });
            }, 3000);
            return () => clearInterval(interval);
        }
    }, [scene.video.isLoading]);

    const handleDownload = (base64Data: string, filename: string) => {
        const link = document.createElement('a');
        link.href = base64Data;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const isAnythingLoading = scene.image.isLoading || scene.video.isLoading || scene.audio.isLoading || scene.script.isLoading;

    return (
        <div className="bg-gray-800 rounded-xl overflow-hidden shadow-lg border border-gray-700 flex flex-col">
            <div className="aspect-[9/16] w-full bg-gray-900 flex items-center justify-center relative">
                {scene.video.isLoading && (
                    <div className="absolute inset-0 bg-black bg-opacity-70 flex flex-col items-center justify-center text-center p-4 z-20">
                        <div className="w-12 h-12 border-4 border-t-purple-400 border-gray-600 rounded-full animate-spin mb-4"></div>
                        <p className="text-lg font-semibold text-white">Generating Video...</p>
                        <p className="text-sm text-gray-300 mt-2">{currentLoadingMessage}</p>
                    </div>
                )}
                {scene.image.isLoading && !scene.video.isLoading && (
                     <div className="absolute inset-0 bg-black bg-opacity-70 flex flex-col items-center justify-center z-10">
                        <div className="w-10 h-10 border-4 border-t-pink-500 border-gray-600 rounded-full animate-spin"></div>
                         <p className="mt-2 text-gray-200">Generating Image...</p>
                    </div>
                )}

                {scene.video.data ? (
                     <video controls key={scene.video.data} className="w-full h-full object-cover">
                        <source src={scene.video.data} type="video/mp4" />
                        Your browser does not support the video tag.
                    </video>
                ) : scene.image.data ? (
                    <img src={scene.image.data} alt={`${scene.type} Asset`} className="w-full h-full object-cover" />
                ) : !scene.image.isLoading && !scene.video.isLoading && (
                     <div className="text-gray-500">Asset will be generated here</div>
                )}
            </div>
            <div className="p-4 flex-grow flex flex-col">
                <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500 mb-2">{scene.type}</h3>
                <div className="text-gray-300 mb-4 h-20 overflow-y-auto p-2 bg-gray-700/50 rounded-md text-sm">
                    {scene.script.isLoading ? <p>Generating script...</p> : <p>{scene.script.data || 'Script not generated yet.'}</p>}
                </div>
                {scene.audio.data && (
                    <div className="mb-4">
                        <audio controls className="w-full h-10" src={scene.audio.data}>
                            Your browser does not support the audio element.
                        </audio>
                    </div>
                )}
                <div className="mt-auto grid grid-cols-2 gap-2 text-sm">
                     <button
                        onClick={() => onRegenerate(scene.type, 'image')}
                        disabled={isAnythingLoading}
                        className="flex items-center justify-center px-3 py-2 bg-gray-700 rounded-md hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <RegenerateIcon /> Image
                    </button>
                    <button
                        onClick={() => onRegenerate(scene.type, 'video')}
                        disabled={isAnythingLoading}
                        className="flex items-center justify-center px-3 py-2 bg-gray-700 rounded-md hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <RegenerateIcon /> Video
                    </button>
                    <button
                        onClick={() => scene.image.data && handleDownload(scene.image.data, `${scene.type.toLowerCase()}_image.png`)}
                        disabled={!scene.image.data || isAnythingLoading}
                        className="flex items-center justify-center px-3 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors"
                    >
                        <DownloadIcon /> Image
                    </button>
                     <a
                        href={scene.video.data || '#'}
                        download={`${scene.type.toLowerCase()}_video.mp4`}
                        onClick={(e) => !scene.video.data && e.preventDefault()}
                        className={`flex items-center justify-center px-3 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors ${!scene.video.data || isAnythingLoading ? 'bg-gray-500 cursor-not-allowed opacity-50' : ''}`}
                    >
                        <DownloadIcon /> Video
                    </a>
                </div>
            </div>
        </div>
    );
};

export default AssetCard;
