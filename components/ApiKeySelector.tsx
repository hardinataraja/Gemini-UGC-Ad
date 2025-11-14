
import React from 'react';

interface ApiKeySelectorProps {
    onKeySelected: () => void;
}

const ApiKeySelector: React.FC<ApiKeySelectorProps> = ({ onKeySelected }) => {
    const handleSelectKey = async () => {
        try {
            await window.aistudio.openSelectKey();
            onKeySelected();
        } catch (error) {
            console.error("Error opening API key selection:", error);
            alert("Could not open the API key selection dialog. Please ensure you are in a supported environment.");
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center text-center p-4 bg-gray-900">
            <div className="max-w-2xl bg-gray-800 p-8 rounded-2xl shadow-2xl border border-gray-700">
                <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500 mb-4">
                    Welcome to the UGC Ad Asset Generator
                </h1>
                <p className="text-gray-300 mb-6">
                    This application uses the Veo video generation model, which requires you to select your own API key for billing purposes.
                </p>
                <button
                    onClick={handleSelectKey}
                    className="w-full px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-indigo-500 transition-transform transform hover:scale-105"
                >
                    Select Your API Key to Continue
                </button>
                <p className="text-xs text-gray-500 mt-4">
                    By continuing, you acknowledge that you are responsible for any costs incurred. For more information, please see the 
                    <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline ml-1">
                        billing documentation
                    </a>.
                </p>
            </div>
        </div>
    );
};

export default ApiKeySelector;
