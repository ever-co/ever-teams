import React from 'react';
import { ChevronUp, ChevronDown } from "lucide-react";
import { CollapsibleSectionProps } from '../../../types/component-types';

export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
    title,
    icon,
    isExpanded,
    onToggle,
    children
}) => {
    return (
        <div className="relative space-y-3 pb-3">
            <button
                type="button"
                className="w-full flex items-center justify-between px-3 py-2.5 cursor-pointer bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors border border-gray-200 dark:border-gray-800 shadow-sm"
                onClick={onToggle}
                aria-expanded={isExpanded}
            >
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-7 h-7 rounded-md bg-primary/10 dark:bg-primary/20 text-primary">
                        {icon}
                    </div>
                    <h3 className="text-sm font-medium text-gray-800 dark:text-gray-200">
                        {title}
                    </h3>
                </div>
                <div className="text-gray-500 dark:text-gray-400">
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
            </button>

            {isExpanded && (
                <div className="bg-gray-50/50 dark:bg-gray-900/50 rounded-lg p-3 border border-gray-100 dark:border-gray-800">
                    {children}
                </div>
            )}

            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/3 h-px bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-700 to-transparent" />
        </div>
    );
};
