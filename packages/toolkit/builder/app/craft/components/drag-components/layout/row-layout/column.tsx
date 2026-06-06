import React, { useEffect, useState } from 'react';
import { useNode } from '@craftjs/core';

export const COLUMN_PRESETS = {
    '1': '8.33%',
    '2': '16.66%',
    '3': '25%',
    '4': '33.33%',
    '5': '41.66%',
    '6': '50%',
    '7': '58.33%',
    '8': '66.66%',
    '9': '75%',
    '10': '83.33%',
    '11': '91.66%',
    '12': '100%',
} as const;

export type ColumnSize = keyof typeof COLUMN_PRESETS;

export interface ColumnProps {
    size: ColumnSize;
    id: string;
}

export const ColumnDefaultProps = {
    size: '4' as ColumnSize,
};

const Column: React.FC<{
    size: string;
    children?: React.ReactNode;
    custom?: {
        columnId: string;
        columnIndex: number;
    };
}> = ({ size, children, custom }) => {
    const { connectors: { connect }, id } = useNode();
    const columnWidth = COLUMN_PRESETS[size as ColumnSize] || '33.33%';
    const columnId = custom?.columnId || '';
    const columnIndex = custom?.columnIndex || 0;

    const [, forceRender] = useState({});

    const isEmpty = React.Children.count(children) === 0;

    const isNarrowColumn = size === '1';

    useEffect(() => {
        forceRender({});

        const updateColumnSize = () => {
            try {
                const selectors = [
                    `[data-id="${id}"]`,
                    `[data-column-id="${columnId}"]`,
                    `[data-craftjs-node-id="${id}"]`,
                    `.craft-node-${id}`
                ];

                let columnEl: HTMLElement | null = null;

                for (const selector of selectors) {
                    const el = document.querySelector(selector) as HTMLElement;
                    if (el) {
                        columnEl = el;
                        break;
                    }
                }

                if (!columnEl) {
                    const cols = document.querySelectorAll(`[data-column-size="${size}"]`);
                    if (cols.length > columnIndex && cols[columnIndex]) {
                        columnEl = cols[columnIndex] as HTMLElement;
                    }
                }

                if (columnEl) {
                    columnEl.style.width = columnWidth;
                    columnEl.style.flex = `0 0 ${columnWidth}`;

                    columnEl.setAttribute('data-column-id', columnId);
                    columnEl.setAttribute('data-column-size', size);
                    columnEl.setAttribute('data-craftjs-node-id', id);

                    columnEl.classList.add(`column-width-${size}`);
                }
            } catch (err) {
                console.warn(`[Column ${id}] Error updating column size:`, err);
            }
        };

        updateColumnSize();
        const timeout = setTimeout(updateColumnSize, 100);

        return () => {
            clearTimeout(timeout);
        };
    }, [id, size, columnWidth, columnId, columnIndex]);

    return (
        <div
            ref={(ref: HTMLDivElement | null) => {
                if (ref) connect(ref);
            }}
            style={{
                width: columnWidth,
                flex: `0 0 ${columnWidth}`,
                position: 'relative',
                minHeight: isEmpty ? '60px' : '50px',
                transition: 'width 0.2s ease-in-out, flex 0.2s ease-in-out',
                overflow: 'hidden'
            }}
            className={`craft-block column-layout column-width-${size} group-hover:bg-gray-50/50 dark:group-hover:bg-gray-800/20`}
            data-column-id={columnId}
            data-column-size={size}
            data-craftjs-type="Column"
            data-empty={isEmpty ? "true" : "false"}
            data-narrow={isNarrowColumn ? "true" : "false"}
            key={`column-${id}-${size}`}
        >
            {isEmpty && (
                <div className="absolute inset-2 flex items-center justify-center bg-gray-50 dark:bg-gray-800/30 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-md transition-colors">
                    {size !== '1' && (
                        <div className="flex flex-col items-center text-center p-2">
                            <p className="text-gray-500 dark:text-gray-400 text-xs font-medium">Drag here</p>
                        </div>
                    )}
                </div>
            )}
            {!isEmpty && children}
        </div>
    );
};

export default Column;
