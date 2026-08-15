import React from 'react';
import { ToolbarItem, ToolbarSection } from '../toolbar';

/**
 * Settings panel for the ResizableContainer component
 */
export const ContainerSettings = () => {
    // Helper function to clean values for display
    const cleanPxValue = (value: any) => {
        if (typeof value === 'string') {
            // Remove any existing 'px' suffix
            return value.replace(/px/g, '');
        }
        return value || 0;
    };

    // Add global styles for toolbar items to ensure dark mode readability
    React.useEffect(() => {
        const styleEl = document.createElement('style');
        styleEl.innerHTML = `
            .craft-toolbar-section h3 {
                color: #1F2937 !important; /* gray-800 */
            }
            .dark .craft-toolbar-section h3 {
                color: #F3F4F6 !important; /* gray-100 */
                font-weight: 500 !important;
            }
            .craft-toolbar-section label {
                color: #374151 !important; /* gray-700 */
            }
            .dark .craft-toolbar-section label {
                color: #E5E7EB !important; /* gray-200 */
            }
            .craft-toolbar-section .value-display {
                color: #1F2937 !important; /* gray-800 */
            }
            .dark .craft-toolbar-section .value-display {
                color: #F3F4F6 !important; /* gray-100 */
                font-weight: 500 !important;
            }
            .craft-toolbar-section .summary-text {
                color: #4B5563 !important; /* gray-600 */
            }
            .dark .craft-toolbar-section .summary-text {
                color: #E5E7EB !important; /* gray-200 */
                font-weight: 500 !important;
            }
        `;
        document.head.appendChild(styleEl);

        return () => {
            document.head.removeChild(styleEl);
        };
    }, []);

    return (
        <React.Fragment>
            <ToolbarSection
                title="Dimensions"
                props={['width', 'height']}
                summary={({ width, height }: any) => {
                    // Clean the values for display (ensure only one px)
                    const cleanValue = (val: any) => {
                        if (typeof val === 'string') {
                            return val.replace(/px/g, '') + 'px';
                        }
                        return val + 'px';
                    };
                    return (
                        <span className="summary-text">
                            {`${cleanValue(width || 0)} × ${cleanValue(height || 0)}`}
                        </span>
                    );
                }}
            >
                <div className='flex space-x-3 min-w-52 col-span-12'>
                    <div className="w-1/2">
                        <ToolbarItem
                            propKey="width"
                            type="slider"
                            label="Width"
                        />
                    </div>
                    <div className="w-1/2">
                        <ToolbarItem
                            propKey="height"
                            type="slider"
                            label="Height"
                        />
                    </div>
                </div>
            </ToolbarSection>

            <ToolbarSection
                title="Colors"
                props={['background', 'color']}
                summary={({ background, color }: any) => (
                    <div className="flex flex-row-reverse">
                        <div
                            style={{
                                background: background && `rgba(${Object.values(background)})`,
                            }}
                            className="shadow-md flex-end w-7 h-7 text-center flex items-center justify-center rounded-full border border-gray-200 dark:border-gray-700"
                        >
                            <p
                                style={{
                                    color: color && `rgba(${Object.values(color)})`,
                                }}
                                className="w-full text-center font-medium"
                            >
                                T
                            </p>
                        </div>
                    </div>
                )}
            >
                <div className='flex flex-col min-w-52 space-y-3'>
                    <ToolbarItem
                        full={true}
                        propKey="background"
                        type="bg"
                        label="Background"
                    />
                    <ToolbarItem
                        full={true}
                        propKey="color"
                        type="color"
                        label="Text"
                    />
                </div>
            </ToolbarSection>

            <ToolbarSection
                title="Margin"
                props={['margin']}
                summary={({ margin }: any) => {
                    // Apply the same cleaning logic for margin
                    const cleanValues = margin.map(cleanPxValue);
                    return (
                        <span className="summary-text">
                            {`${cleanValues[0]}px ${cleanValues[1]}px ${cleanValues[2]}px ${cleanValues[3]}px`}
                        </span>
                    );
                }}
            >
                <div className="flex flex-col space-y-3 min-w-52 col-span-12">
                    <div className="flex space-x-3">
                        <div className="w-1/2">
                            <ToolbarItem
                                propKey="margin"
                                index={0}
                                type="slider"
                                label="Top"
                            />
                        </div>
                        <div className="w-1/2">
                            <ToolbarItem
                                propKey="margin"
                                index={1}
                                type="slider"
                                label="Right"
                            />
                        </div>
                    </div>
                    <div className="flex space-x-3">
                        <div className="w-1/2">
                            <ToolbarItem
                                propKey="margin"
                                index={2}
                                type="slider"
                                label="Bottom"
                            />
                        </div>
                        <div className="w-1/2">
                            <ToolbarItem
                                propKey="margin"
                                index={3}
                                type="slider"
                                label="Left"
                            />
                        </div>
                    </div>
                </div>
            </ToolbarSection>

            <ToolbarSection
                title="Padding"
                props={['padding']}
                summary={({ padding }: any) => {
                    // Display the raw numeric values with px appended once
                    const cleanValues = padding.map(cleanPxValue);
                    return (
                        <span className="summary-text">
                            {`${cleanValues[0]}px ${cleanValues[1]}px ${cleanValues[2]}px ${cleanValues[3]}px`}
                        </span>
                    );
                }}
            >
                <div className="flex flex-col space-y-3 min-w-52 col-span-12">
                    <div className="flex space-x-3">
                        <div className="w-1/2">
                            <ToolbarItem
                                propKey="padding"
                                index={0}
                                type="slider"
                                label="Top"
                            />
                        </div>
                        <div className="w-1/2">
                            <ToolbarItem
                                propKey="padding"
                                index={1}
                                type="slider"
                                label="Right"
                            />
                        </div>
                    </div>
                    <div className="flex space-x-3">
                        <div className="w-1/2">
                            <ToolbarItem
                                propKey="padding"
                                index={2}
                                type="slider"
                                label="Bottom"
                            />
                        </div>
                        <div className="w-1/2">
                            <ToolbarItem
                                propKey="padding"
                                index={3}
                                type="slider"
                                label="Left"
                            />
                        </div>
                    </div>
                </div>
            </ToolbarSection>

            {/* Radius Section */}
            <ToolbarSection
                title="Border Radius"
                props={['radius']}
                summary={({ radius }: any) => {
                    // Clean the values for display (ensure proper format)
                    const cleanValue = (val: any) => {
                        if (typeof val === 'string') {
                            return val.replace(/px/g, '') + 'px';
                        }
                        return val + 'px';
                    };
                    return (
                        <span className="summary-text">
                            {cleanValue(radius || 0)}
                        </span>
                    );
                }}
            >
                <div className='w-full min-w-52 col-span-12'>
                    <ToolbarItem
                        propKey="radius"
                        type="slider"
                        label="Radius"
                    />
                </div>
            </ToolbarSection>

            {/* Shadow Section */}
            <ToolbarSection
                title="Shadow"
                props={['shadow']}
                summary={({ shadow }: any) => {
                    // Clean the values for display (ensure proper format)
                    const cleanValue = (val: any) => {
                        if (typeof val === 'string') {
                            return val.replace(/px/g, '') + 'px';
                        }
                        return val + 'px';
                    };
                    return (
                        <span className="summary-text">
                            {cleanValue(shadow || 0)}
                        </span>
                    );
                }}
            >
                <div className='w-full min-w-52 col-span-12'>
                    <ToolbarItem
                        propKey="shadow"
                        type="slider"
                        label="Shadow"
                    />
                </div>
            </ToolbarSection>
        </React.Fragment>
    );
};
