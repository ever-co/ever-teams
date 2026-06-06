import React, { ReactElement, JSXElementConstructor } from 'react';
import { ComponentCardProps } from '../../../types/component-types';

export const ComponentCard: React.FC<ComponentCardProps> = ({
    label,
    id,
    dragProps,
    create,
    component,
    children
}) => {
    return (
        <div className="relative flex flex-col gap-2">
            <div
                id={id}
                {...dragProps}
                ref={(ref) => create(ref, component as React.ReactElement)}
                className="p-3 rounded-lg bg-white dark:bg-gray-800 shadow-sm
          hover:shadow-md hover:scale-[1.02] transition-all duration-200
          cursor-move border border-gray-100 dark:border-gray-700
          hover:border-primary/20 dark:hover:border-primary/20"
                aria-label={`Drag ${label} component`}
            >
                {children}
            </div>
            <p className="text-xs font-medium text-gray-600 dark:text-gray-300
                py-1 px-2 rounded-md bg-white dark:bg-transparent
                border border-gray-100 dark:border-transparent"
            >
                {label}
            </p>
        </div>
    );
};
