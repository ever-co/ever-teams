import React, { useState } from 'react';
import { useNode } from '@craftjs/core';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Plus, Minus, Layout, Grip, AlignLeft, AlignCenter, AlignRight, StretchHorizontal } from 'lucide-react';
import { EditBar } from '../../../editbar';
import { RowProps, RowDefaultProps, ROW_PRESETS } from './row';
import type { ColumnSize } from './column';
import { cn } from '@/lib/utils';
import { COLUMN_PRESETS } from './column';
import { ColumnWidthStorage } from './column-width-storage';
import { adjustColumnsToTotal12 } from './row';

const RowSettings: React.FC = () => {
    const { actions, columns, gap, alignment, padding, backgroundColor, borderRadius, border, id } = useNode((node) => ({
        columns: node.data.props.columns,
        gap: node.data.props.gap,
        alignment: node.data.props.alignment,
        padding: node.data.props.padding,
        backgroundColor: node.data.props.backgroundColor,
        borderRadius: node.data.props.borderRadius,
        border: node.data.props.border,
        id: node.id
    }));

    const [activePreset, setActivePreset] = useState<string | null>(null);

    const addColumn = () => {
        actions.setProp((props: RowProps) => {
            const newColumn = {
                size: '4' as ColumnSize,
                id: `col${props.columns.length + 1}`
            };
            return {
                ...props,
                columns: [...props.columns, newColumn]
            };
        });
    };

    const removeColumn = () => {
        actions.setProp((props: RowProps) => {
            if (props.columns.length > 1) {
                return {
                    ...props,
                    columns: props.columns.slice(0, -1)
                };
            }
            return props;
        });
    };

    const applyPreset = (preset: keyof typeof ROW_PRESETS) => {
        setActivePreset(preset);
        actions.setProp((props: RowProps) => ({
            ...props,
            columns: ROW_PRESETS[preset]
        }));
    };

    const updateColumnSize = (index: number, size: ColumnSize) => {
        const newColumns = [...columns];
        newColumns[index] = { ...newColumns[index], size };

        const adjustedColumns = adjustColumnsToTotal12(newColumns);

        actions.setProp((props: RowProps) => {
            const updatedColumns = JSON.parse(JSON.stringify(adjustedColumns));
            ColumnWidthStorage.storeColumnWidths(id || 'unknown', updatedColumns);
            props.columns = updatedColumns;
            return { ...props };
        });
    };

    return (
        <div className="space-y-4">
            <div className="space-y-3">
                <div className="flex justify-between items-center">
                    <h3 className="text-sm font-medium text-foreground">Row Layout</h3>
                    <div className="flex gap-1">
                        <Button
                            variant="outline"
                            size="sm"
                            className={cn("text-xs h-7", activePreset === 'Equal' && "bg-primary/10")}
                            onClick={() => applyPreset('Equal')}
                        >
                            <Layout className="mr-1 h-3 w-3" /> 2 Columns
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className={cn("text-xs h-7", activePreset === 'Thirds' && "bg-primary/10")}
                            onClick={() => applyPreset('Thirds')}
                        >
                            <Layout className="mr-1 h-3 w-3" /> 3 Columns
                        </Button>
                    </div>
                </div>

                <div className="p-2 border border-border rounded-md bg-background/50 space-y-2">
                    <div className="flex items-center justify-between">
                        <Label className="text-primary dark:text-white text-xs">Columns ({columns.length})</Label>
                        <div className="flex justify-between items-center gap-2">
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                Total: {columns.reduce((acc: number, col: { size: ColumnSize; id: string }) => acc + parseInt(col.size, 10), 0)}/12
                            </div>
                            <div className="flex gap-1">
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="text-xs h-6 w-6"
                                    onClick={removeColumn}
                                    disabled={columns.length <= 1}
                                >
                                    <Minus className="h-3 w-3" />
                                </Button>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="text-xs h-6 w-6"
                                    onClick={addColumn}
                                    disabled={columns.length >= 6}
                                >
                                    <Plus className="h-3 w-3" />
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {columns.map((column: { size: ColumnSize; id: string }, index: number) => (
                            <div
                                key={index}
                                className="flex-grow flex flex-col items-center gap-1 rounded-md p-2 min-h-[48px] shadow-sm bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                                style={{
                                    width: `calc(${column.size}/12 * 100%)`,
                                    background: backgroundColor || undefined,
                                    border: border ? undefined : 'none',
                                    transition: 'background 0.2s, border 0.2s'
                                }}
                            >
                                <Select
                                    value={column.size}
                                    onValueChange={(value) => updateColumnSize(index, value as ColumnSize)}
                                >
                                    <SelectTrigger className="h-6 text-xs w-full text-gray-800 dark:text-white">
                                        <SelectValue placeholder="Size" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.keys(COLUMN_PRESETS).map((size: string) => (
                                            <SelectItem key={size} value={size}>
                                                {size}/12 ({COLUMN_PRESETS[size as keyof typeof COLUMN_PRESETS]})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="border-t border-border pt-3">
                <Label className="text-primary dark:text-white text-sm font-medium mb-2 block">Layout Presets</Label>
                <div className="grid grid-cols-2 gap-2">
                    {Object.keys(ROW_PRESETS).map((preset) => (
                        <Button
                            key={preset}
                            variant="outline"
                            size="sm"
                            className={cn("text-xs", activePreset === preset && "bg-primary/10")}
                            onClick={() => applyPreset(preset as keyof typeof ROW_PRESETS)}
                        >
                            {preset}
                        </Button>
                    ))}
                </div>
            </div>

            <div className="border-t border-border pt-3">
                <EditBar
                    config={[
                        {
                            type: 'select',
                            label: 'Gap',
                            property: 'gap',
                            list: [
                                { label: 'None', value: '0px' },
                                { label: 'Small', value: '8px' },
                                { label: 'Medium', value: '16px' },
                                { label: 'Large', value: '24px' },
                                { label: 'Extra Large', value: '32px' }
                            ]
                        },
                        {
                            type: 'select',
                            label: 'Padding',
                            property: 'padding',
                            list: [
                                { label: 'None', value: '0' },
                                { label: 'Small', value: '8' },
                                { label: 'Medium', value: '16' },
                                { label: 'Large', value: '24' },
                                { label: 'Extra Large', value: '32' }
                            ]
                        },
                        {
                            type: 'color',
                            label: 'Background Color',
                            property: 'backgroundColor'
                        },
                        {
                            type: 'select',
                            label: 'Border Radius',
                            property: 'borderRadius',
                            list: [
                                { label: 'None', value: '0' },
                                { label: 'Small', value: '4' },
                                { label: 'Medium', value: '8' },
                                { label: 'Large', value: '12' },
                                { label: 'Extra Large', value: '16' }
                            ]
                        },
                        {
                            type: 'switch',
                            label: 'Show Border',
                            property: 'border'
                        }
                    ]}
                />
            </div>
        </div>
    );
};

export default RowSettings;
