
import React, { useState } from 'react';
import { UGCInput } from '../types';
import { MOOD_OPTIONS, BACKGROUND_OPTIONS } from '../constants';
import UploadIcon from './icons/UploadIcon';

interface InputFormProps {
    onSubmit: (data: UGCInput) => void;
    isLoading: boolean;
}

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = error => reject(error);
    });
};

const ImageUpload: React.FC<{ label: string; onFileUpload: (base64: string) => void }> = ({ label, onFileUpload }) => {
    const [preview, setPreview] = useState<string | null>(null);
    const [fileName, setFileName] = useState<string>('');

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setFileName(file.name);
            const base64 = await fileToBase64(file);
            onFileUpload(base64);
            setPreview(URL.createObjectURL(file));
        }
    };

    return (
        <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">{label}</label>
            <label htmlFor={label.replace(' ', '-')} className="relative flex flex-col items-center justify-center w-full h-32 border-2 border-gray-600 border-dashed rounded-lg cursor-pointer bg-gray-800 hover:bg-gray-700">
                {preview ? (
                    <img src={preview} alt="Preview" className="object-cover h-full w-full rounded-lg" />
                ) : (
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <UploadIcon />
                        <p className="mb-2 text-sm text-gray-400"><span className="font-semibold">Click to upload</span></p>
                        <p className="text-xs text-gray-500">{fileName || 'PNG, JPG'}</p>
                    </div>
                )}
                <input id={label.replace(' ', '-')} type="file" className="hidden" onChange={handleFileChange} accept="image/png, image/jpeg" />
            </label>
        </div>
    );
};

const MultiSelect: React.FC<{ label: string; options: string[]; selected: string[]; onChange: (selected: string[]) => void; limit: number }> = ({ label, options, selected, onChange, limit }) => {
    const handleSelect = (option: string) => {
        const newSelected = selected.includes(option)
            ? selected.filter(item => item !== option)
            : [...selected, option];
        if (newSelected.length <= limit) {
            onChange(newSelected);
        }
    };
    
    return (
        <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">{label} (Choose {limit})</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {options.map(option => {
                    const isSelected = selected.includes(option);
                    const isDisabled = !isSelected && selected.length >= limit;
                    return (
                        <button
                            key={option}
                            type="button"
                            onClick={() => handleSelect(option)}
                            disabled={isDisabled}
                            className={`px-3 py-2 text-sm text-left rounded-md transition-colors ${
                                isSelected ? 'bg-indigo-600 text-white' : 'bg-gray-700 hover:bg-gray-600'
                            } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {option}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};


const InputForm: React.FC<InputFormProps> = ({ onSubmit, isLoading }) => {
    const [productName, setProductName] = useState('');
    const [moods, setMoods] = useState<string[]>([]);
    const [backgrounds, setBackgrounds] = useState<string[]>([]);
    const [productImage, setProductImage] = useState<string | null>(null);
    const [modelImage, setModelImage] = useState<string | null>(null);

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        if(moods.length !== 4 || backgrounds.length !== 4) {
            alert("Please select exactly 4 moods and 4 backgrounds.");
            return;
        }
        if(!productImage) {
            alert("Please upload a product image.");
            return;
        }
        onSubmit({ productName, moods, backgrounds, productImage, modelImage });
    };

    const isFormValid = productName && moods.length === 4 && backgrounds.length === 4 && productImage;

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div>
                <label htmlFor="productName" className="block text-sm font-medium text-gray-300">Product Name</label>
                <input
                    type="text"
                    id="productName"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    required
                    className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-white p-2"
                />
            </div>
            
            <MultiSelect label="Moods" options={MOOD_OPTIONS} selected={moods} onChange={setMoods} limit={4} />
            <MultiSelect label="Backgrounds" options={BACKGROUND_OPTIONS} selected={backgrounds} onChange={setBackgrounds} limit={4} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ImageUpload label="Product Photo (Required)" onFileUpload={setProductImage} />
              <ImageUpload label="Model Photo (Optional)" onFileUpload={setModelImage} />
            </div>

            <button
                type="submit"
                disabled={isLoading || !isFormValid}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-500 disabled:cursor-not-allowed transition-all transform hover:scale-105"
            >
                {isLoading ? (
                    <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Generating Assets...
                    </>
                ) : 'Generate Assets'}
            </button>
        </form>
    );
};

export default InputForm;
