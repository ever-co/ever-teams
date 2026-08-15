import React, { useEffect, useRef, useCallback } from 'react';
import { useNode, Element } from '@craftjs/core';
import Column from './column';
import type { ColumnProps, ColumnSize } from './column';
import { ColumnWidthStorage } from './column-width-storage';
import { COLUMN_PRESETS } from './column';
import RowSettings from './row-settings';

export const ROW_PRESETS = {
    'Equal': [
        { size: '6' as ColumnSize, id: 'col1' },
        { size: '6' as ColumnSize, id: 'col2' }
    ],
    'Thirds': [
        { size: '4' as ColumnSize, id: 'col1' },
        { size: '4' as ColumnSize, id: 'col2' },
        { size: '4' as ColumnSize, id: 'col3' }
    ],
    'Quarters': [
        { size: '3' as ColumnSize, id: 'col1' },
        { size: '3' as ColumnSize, id: 'col2' },
        { size: '3' as ColumnSize, id: 'col3' },
        { size: '3' as ColumnSize, id: 'col4' }
    ],
    'Left Sidebar': [
        { size: '3' as ColumnSize, id: 'col1' },
        { size: '9' as ColumnSize, id: 'col2' }
    ],
    'Right Sidebar': [
        { size: '9' as ColumnSize, id: 'col1' },
        { size: '3' as ColumnSize, id: 'col2' }
    ],
    'Header Content Footer': [
        { size: '12' as ColumnSize, id: 'col1' },
        { size: '12' as ColumnSize, id: 'col2' },
        { size: '12' as ColumnSize, id: 'col3' }
    ],
};

export interface RowProps {
    columns: ColumnProps[];
    gap: string;
    alignment: 'flex-start' | 'center' | 'flex-end' | 'stretch';
    padding: number;
    backgroundColor: string;
    borderRadius: number;
    border: boolean;
}

export const RowDefaultProps: RowProps = {
    columns: ROW_PRESETS['Thirds'],
    gap: '16px',
    alignment: 'stretch',
    padding: 16,
    backgroundColor: '',
    borderRadius: 4,
    border: false
};

export function adjustColumnsToTotal12(columns: ColumnProps[]): ColumnProps[] {
    const total = columns.reduce((acc, col) => acc + parseInt(col.size), 0);

    if (total === 12) return columns;

    const adjustedColumns = [...columns];

    if (total < 12) {
        const deficit = 12 - total;
        const lastIndex = adjustedColumns.length - 1;
        const lastCol = adjustedColumns[lastIndex];
        const newLastColSize = Math.min(12, parseInt(lastCol.size) + deficit);

        adjustedColumns[lastIndex] = {
            ...lastCol,
            size: newLastColSize.toString() as ColumnSize
        };
    } else {
        const excess = total - 12;
        const lastIndex = adjustedColumns.length - 1;
        const lastCol = adjustedColumns[lastIndex];
        const newLastColSize = Math.max(1, parseInt(lastCol.size) - excess);

        adjustedColumns[lastIndex] = {
            ...lastCol,
            size: newLastColSize.toString() as ColumnSize
        };
    }

    return adjustedColumns;
}

type CraftComponent<T> = React.FC<T> & {
    craft: {
        displayName: string;
        props: Record<string, any>;
        rules?: {
            canDrag: () => boolean;
        };
        related?: {
            settings: React.ComponentType;
        };
    };
};

const Row: CraftComponent<RowProps & { children?: React.ReactNode }> = ({
    columns,
    gap,
    alignment,
    padding,
    backgroundColor,
    borderRadius,
    border,
    children
}) => {
    const { connectors: { connect, drag }, id, actions } = useNode();

    useEffect(() => {
        const restoredColumns = ColumnWidthStorage.checkAndRestore(id, columns);
        if (restoredColumns) {
            actions.setProp((props: RowProps) => ({
                ...props,
                columns: restoredColumns
            }));
        } else {
            ColumnWidthStorage.storeColumnWidths(id, columns);
        }
    }, [columns, id, actions]);

    const previousColumnsRef = useRef<ColumnProps[]>([]);

    const totalSize = columns.reduce((acc, col) => acc + parseInt(col.size), 0);

    useEffect(() => {
        if (totalSize !== 12) {
            const adjustedColumns = adjustColumnsToTotal12(columns);
            const isDifferent = JSON.stringify(adjustedColumns) !== JSON.stringify(columns);

            if (isDifferent) {
                actions.setProp((props: RowProps) => {
                    return {
                        ...props,
                        columns: adjustedColumns
                    };
                });
            }
        }
    }, [columns, totalSize, id, actions]);

    useEffect(() => {
        if (previousColumnsRef.current.length > 0) {
            columns.forEach((col, index) => {
                const prevCol = previousColumnsRef.current[index];
                if (prevCol && prevCol.size !== col.size) {
                }
            });
        }

        previousColumnsRef.current = [...columns];
    }, [columns, id, totalSize, actions]);

    const forceUpdateColumnWidths = useCallback(() => {
        try {
            const rowSelectors = [
                `[data-id="${id}"]`,
                `[data-row-id="${id}"]`,
                `[data-craftjs-type="Row"]`
            ];

            let rowElement: Element | null = null;

            for (const selector of rowSelectors) {
                const element = document.querySelector(selector);
                if (element) {
                    rowElement = element;
                    break;
                }
            }

            if (!rowElement) {
                const anyRowElement = document.querySelector('.row-layout');
                if (anyRowElement) {
                    rowElement = anyRowElement;
                } else {
                    return;
                }
            }

            columns.forEach((column, index) => {
                const columnSelectors = [
                    `[data-id="${id}-${column.id}"]`,
                    `[data-column-id="${column.id}"]`,
                    `[data-craftjs-type="Column"][data-column-size="${column.size}"]`
                ];

                if (rowElement && index < rowElement.children.length) {
                    const columnByIndex = rowElement.children[index] as HTMLElement;
                    if (columnByIndex) {
                        updateColumnElement(columnByIndex, column);
                        return;
                    }
                }

                let columnElement: HTMLElement | null = null;
                for (const selector of columnSelectors) {
                    const el = document.querySelector(selector) as HTMLElement;
                    if (el) {
                        columnElement = el;
                        break;
                    }
                }

                if (columnElement) {
                    updateColumnElement(columnElement, column);
                } else {
                    console.warn(`[Row ${id}] Column element ${column.id} not found for width update`);
                }
            });

            function updateColumnElement(el: HTMLElement, column: ColumnProps) {
                const width = COLUMN_PRESETS[column.size as ColumnSize];
                el.style.width = width;
                el.style.flex = `0 0 ${width}`;
                el.setAttribute('style',
                    `width: ${width} !important;
                     flex: 0 0 ${width} !important;
                     position: relative;
                     min-height: 50px;`
                );

                el.setAttribute('data-column-size', column.size);
                el.setAttribute('data-column-id', column.id);

                const className = `column-width-${column.size}`;
                el.classList.remove(...Array.from(el.classList)
                    .filter(cls => cls.startsWith('column-width-')));
                el.classList.add(className);

                el.getBoundingClientRect();
            }

            rowElement.getBoundingClientRect();

        } catch (err) {
            console.error('[Row] Error updating column widths:', err);
        }
    }, [columns, id]);

    useEffect(() => {
        requestAnimationFrame(forceUpdateColumnWidths);

        const timeouts = [
            setTimeout(() => requestAnimationFrame(forceUpdateColumnWidths), 50),
            setTimeout(() => requestAnimationFrame(forceUpdateColumnWidths), 200),
            setTimeout(() => requestAnimationFrame(forceUpdateColumnWidths), 500)
        ];

        return () => {
            timeouts.forEach(timeout => clearTimeout(timeout));
        };
    }, [columns, forceUpdateColumnWidths]);

    return (
        <div
            ref={(ref) => {
                if (ref) connect(drag(ref));
            }}
            style={{
                padding: `${padding}px`,
                backgroundColor: backgroundColor || 'transparent',
                borderRadius: `${borderRadius}px`,
                display: 'flex',
                flexWrap: 'nowrap',
                width: '100%',
                alignItems: alignment,
                gap: gap,
                border: border ? '1px solid var(--border-color, rgba(226, 232, 240, 0.5))' : 'none',
                position: 'relative',
                overflow: 'hidden'
            }}
            className="relative hover:outline hover:outline-primary/20 dark:hover:outline-primary/30 hover:outline-1 hover:outline-offset-2 transition-all row-layout group"
            data-row-id={id}
            data-craftjs-type="Row"
            data-columns-count={columns.length}
            data-columns-sizes={columns.map(col => col.size).join(',')}
        >
            {columns.map((column, index) => (
                <Element
                    key={`${id}-${column.id}-size-${column.size}-${index}`}
                    id={`${id}-${column.id}`}
                    canvas
                    is={Column}
                    size={column.size}
                    custom={{
                        columnId: column.id,
                        columnIndex: index
                    }}
                />
            ))}
        </div>
    );
};

Row.craft = {
    props: RowDefaultProps,
    displayName: 'Row',
    related: {
        settings: RowSettings
    },
    rules: {
        canDrag: () => true
    }
};

export default Row;
