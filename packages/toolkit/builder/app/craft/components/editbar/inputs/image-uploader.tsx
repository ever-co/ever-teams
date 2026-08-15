import axios from 'axios';
import { useState } from 'react';
import Image from 'next/image';
import { ImageConfigItem } from '../../../types/editor-config';

interface ImageUploaderProps {
    value: string | null;
    onChange: (url: string | null) => void;
    sizeLimit: ImageConfigItem['sizeLimit'];
    validFormats: ImageConfigItem['validFormats'];
}

export const ImageUploader = ({
    value,
    onChange,
    sizeLimit,
    validFormats
}: ImageUploaderProps) => {
    const [isLoading, setIsLoading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    const handleImageChange = async (file: File) => {
        const formData = new FormData();
        formData.append('image', file);
        setIsLoading(true);
        try {
            const { data } = await axios.post('https://api.imgbb.com/1/upload', formData, {
                params: { key: '26927d595a6056a9266f90db67f108e0' },
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            const imageUrl = data.data.url;
            onChange(imageUrl);
        } catch (error) {
            console.error('Image upload failed:', error);
        } finally {
            setIsLoading(false);
            setIsDragging(false);
        }
    };

    const validateFile = (file: File) => {
        if (sizeLimit && file.size > sizeLimit * 1024 * 1024) {
            console.error(`File size exceeds the limit of ${sizeLimit}MB`);
            return false;
        }
        return true;
    };

    const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file && validateFile(file)) await handleImageChange(file);
    };

    const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        const file = event.dataTransfer.files?.[0];
        if (file && validateFile(file)) await handleImageChange(file);
    };

    const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        setIsDragging(true);
    };

    return (
        <div
            className={`relative w-full h-40 border-2 border-dashed transition-colors duration-200
                ${isDragging
                    ? 'border-primary/70 dark:border-primary-light/70 bg-primary/5 dark:bg-primary-light/5'
                    : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50'
                } rounded-lg flex items-center justify-center`
            }
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragEnter={() => setIsDragging(true)}
            onDragLeave={() => setIsDragging(false)}
        >
            {isLoading ? (
                <div className="border-4 border-gray-300 border-l-transparent dark:border-gray-600 dark:border-l-transparent rounded-full h-10 w-10 animate-spin"></div>
            ) : value ? (
                <div className="relative w-full h-full">
                    <Image src={value} alt="Selected" fill className="object-contain rounded-lg p-2" />
                    <button
                        className="absolute top-2 right-2 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-md hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 p-1 shadow-lg transition-colors"
                        onClick={() => onChange(null)}
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
                    </button>
                </div>
            ) : (
                <div className="text-center p-4">
                    <label htmlFor="imageInput" className="cursor-pointer flex flex-col items-center">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="36"
                            height="36"
                            viewBox="0 0 24 24"
                            className="mx-auto mb-2 text-gray-500 dark:text-gray-300"
                        >
                            <g fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5">
                                <path d="M6.286 19C3.919 19 2 17.104 2 14.765s1.919-4.236 4.286-4.236q.427.001.83.08m7.265-2.582a5.8 5.8 0 0 1 1.905-.321c.654 0 1.283.109 1.87.309m-11.04 2.594a5.6 5.6 0 0 1-.354-1.962C6.762 5.528 9.32 3 12.476 3c2.94 0 5.361 2.194 5.68 5.015m-11.04 2.594a4.3 4.3 0 0 1 1.55.634m9.49-3.228C20.392 8.78 22 10.881 22 13.353c0 2.707-1.927 4.97-4.5 5.52" />
                                <path strokeLinecap="round" d="M12 16v6m0-6l2 2m-2-2l-2 2" />
                            </g>
                        </svg>
                        <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">
                            Drag and drop an image or click to browse
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Max size: {sizeLimit}MB
                        </p>
                    </label>
                    <input
                        type="file"
                        id="imageInput"
                        className="hidden"
                        accept={validFormats.join(',')}
                        onChange={handleImageUpload}
                    />
                </div>
            )}
        </div>
    );
};
