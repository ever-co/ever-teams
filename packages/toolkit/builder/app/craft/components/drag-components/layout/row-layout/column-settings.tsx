import React from 'react';
import { useNode } from '@craftjs/core';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { COLUMN_PRESETS, ColumnSize } from './column';

const ColumnSettings: React.FC<{}> = () => {
    const { actions, size } = useNode((node) => ({
        size: node.data.props.size,
    }));

    return (
        <div className="space-y-3">
            <h3 className="text-sm font-medium text-foreground">Column Settings</h3>
            <div className="space-y-2">
                <Label className="text-primary dark:text-white text-xs">Column Size: {size}/12</Label>
                <Select
                    value={size}
                    onValueChange={(value) => {
                        actions.setProp((props: any) => {
                            props.size = value;
                            return props;
                        });
                    }}
                >
                    <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Size" />
                    </SelectTrigger>
                    <SelectContent>
                        {Object.keys(COLUMN_PRESETS).map((size) => (
                            <SelectItem key={size} value={size}>
                                {size}/12 ({COLUMN_PRESETS[size as ColumnSize]})
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </div>
    );
};

export default ColumnSettings;
