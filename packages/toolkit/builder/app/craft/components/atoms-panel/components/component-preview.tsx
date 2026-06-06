import React from 'react';
import Image from 'next/image';
import { ComponentDefinition } from '../../../types/component-types';

type ComponentPreviewProps = Pick<ComponentDefinition, 'component' | 'customPreview' | 'imageSrc' | 'label'>;

export const ComponentPreview: React.FC<ComponentPreviewProps> = ({
    component,
    customPreview,
    imageSrc,
    label
}) => {
    return (
        <div className="relative w-full p-2 border border-gray-200 dark:border-gray-700 rounded-md h-24 overflow-hidden flex items-center justify-center">
            {customPreview ? (
                customPreview
            ) : imageSrc ? (
                <div className="relative w-full h-full flex items-center justify-center">
                    <Image
                        src={imageSrc}
                        alt={label}
                        fill
                        className="object-contain"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        priority={false}
                    />
                </div>
            ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-gray-600 dark:text-gray-300">
                    {component}
                </div>
            )}
        </div>
    );
};
