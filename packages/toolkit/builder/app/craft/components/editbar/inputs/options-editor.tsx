import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { AlertCircle, ChevronDown, ChevronUp, CopyIcon, Plus, SettingsIcon, Trash2, X } from 'lucide-react';
import { SelectOption } from '../../../types/editor-config';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
    DialogClose
} from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface OptionsEditorProps {
    value: SelectOption[];
    onChange: (value: SelectOption[]) => void;
    label: string;
}

export function OptionsEditor({ value = [], onChange, label }: OptionsEditorProps) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [currentOptionIndex, setCurrentOptionIndex] = useState<number | null>(null);
    const [newOption, setNewOption] = useState<SelectOption>({ label: '', value: '' });
    const [bulkInput, setBulkInput] = useState<string>('');
    const [showBulkInput, setShowBulkInput] = useState(false);

    const handleAddOption = () => {
        if (!newOption.label || !newOption.value) return;

        const newOptions = [...value];
        if (currentOptionIndex !== null) {
            newOptions[currentOptionIndex] = newOption;
        } else {
            newOptions.push(newOption);
        }

        onChange(newOptions);
        setNewOption({ label: '', value: '' });
        setCurrentOptionIndex(null);
        setIsDialogOpen(false);
    };

    const handleEditOption = (index: number) => {
        setCurrentOptionIndex(index);
        setNewOption(value[index]);
        setIsDialogOpen(true);
    };

    const handleRemoveOption = (index: number) => {
        const newOptions = [...value];
        newOptions.splice(index, 1);
        onChange(newOptions);
    };

    const handleDuplicateOption = (index: number) => {
        const optionToDuplicate = value[index];
        const newOption = {
            ...optionToDuplicate,
            label: `${optionToDuplicate.label} (copy)`,
            value: `${optionToDuplicate.value}_copy`
        };
        const newOptions = [...value, newOption];
        onChange(newOptions);
    };

    const handleMoveOption = (fromIndex: number, toIndex: number) => {
        if (toIndex < 0 || toIndex >= value.length) return;

        const newOptions = [...value];
        const [removed] = newOptions.splice(fromIndex, 1);
        newOptions.splice(toIndex, 0, removed);
        onChange(newOptions);
    };

    const moveUp = (index: number) => {
        handleMoveOption(index, index - 1);
    };

    const moveDown = (index: number) => {
        handleMoveOption(index, index + 1);
    };

    const processBulkInput = () => {
        if (!bulkInput.trim()) return;

        const lines = bulkInput
            .split('\n')
            .filter(line => line.trim())
            .map(line => {
                const parts = line.split(',');
                const label = parts[0]?.trim() || '';
                // Generate a value based on label if not provided
                const value = parts[1]?.trim() || label.toLowerCase().replace(/\s+/g, '_');
                return { label, value };
            });

        // Add new options to existing ones
        onChange([...value, ...lines]);
        setBulkInput('');
        setShowBulkInput(false);
    };

    return (
        <div className="space-y-2">
            <div className="flex justify-between items-center">
                <Label className="text-white font-medium">{label}</Label>
                <div className="flex space-x-1">
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-7 w-7 text-white border-[#2D303E] bg-[#1C1E29] hover:bg-[#151723]"
                                    onClick={() => setShowBulkInput(!showBulkInput)}
                                >
                                    <CopyIcon className="h-3.5 w-3.5" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Bulk Add Options</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>

                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button
                                variant="default"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => {
                                    setCurrentOptionIndex(null);
                                    setNewOption({ label: '', value: '' });
                                }}
                            >
                                <Plus className="h-3.5 w-3.5 mr-1" /> Add Option
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md bg-[#151723] text-white border-[#2D303E]">
                            <DialogHeader>
                                <DialogTitle className="text-white">
                                    {currentOptionIndex !== null ? 'Edit Option' : 'Add New Option'}
                                </DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="option-label">Display Label</Label>
                                    <Input
                                        id="option-label"
                                        value={newOption.label}
                                        onChange={(e) => setNewOption({ ...newOption, label: e.target.value })}
                                        placeholder="Display text for users"
                                        className="bg-[#1C1E29] border-[#2D303E] text-white focus:border-[#3B4EFB] focus:ring-1 focus:ring-[#3B4EFB]"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="option-value">Value</Label>
                                    <Input
                                        id="option-value"
                                        value={newOption.value}
                                        onChange={(e) => setNewOption({ ...newOption, value: e.target.value })}
                                        placeholder="Internal value for this option"
                                    />
                                </div>
                            </div>
                            <DialogFooter className="sm:justify-between">
                                <DialogClose asChild>
                                    <Button type="button" variant="secondary" className="text-white bg-[#1C1E29] hover:bg-[#242735]">
                                        Cancel
                                    </Button>
                                </DialogClose>
                                <Button type="button" onClick={handleAddOption}>
                                    {currentOptionIndex !== null ? 'Update' : 'Add'}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {showBulkInput && (
                <Card className="p-3">
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <Label>Bulk Add (one per line)</Label>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => setShowBulkInput(false)}
                            >
                                <X className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                        <div className="text-xs text-muted-foreground">
                            Format: Label, Value (if value is omitted, it will be generated from the label)
                        </div>
                        <textarea
                            className="w-full h-20 p-2 text-sm border rounded-md"
                            value={bulkInput}
                            onChange={(e) => setBulkInput(e.target.value)}
                            placeholder="Option 1, option1
Option 2, option2
Option 3, option3"
                        />
                        <div className="flex justify-end space-x-2">
                            <Button variant="secondary" size="sm" onClick={() => setBulkInput('')}>
                                Clear
                            </Button>
                            <Button size="sm" onClick={processBulkInput}>
                                Add All
                            </Button>
                        </div>
                    </div>
                </Card>
            )}

            <div className="border rounded-md border-[#2D303E] bg-[#151723] overflow-hidden">
                {value.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground text-sm flex flex-col items-center justify-center">
                        <AlertCircle className="mb-2 h-5 w-5" />
                        No options added yet. Click &quot;Add Option&quot; to create dropdown items.
                    </div>
                ) : (
                    <ScrollArea className="max-h-[200px]">
                        <div className="w-full">
                            {value.map((option, index) => (
                                <div
                                    key={`${option.value}-${index}`}
                                    className="flex items-center justify-between p-2 border-b border-[#2D303E] hover:bg-[#1C1E29] transition-colors"
                                >
                                    <div className="flex items-center space-x-2 overflow-hidden">
                                        <div className="flex flex-col space-y-0.5">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-4 w-4"
                                                onClick={() => moveUp(index)}
                                                disabled={index === 0}
                                            >
                                                <ChevronUp className="h-3 w-3" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-4 w-4"
                                                onClick={() => moveDown(index)}
                                                disabled={index === value.length - 1}
                                            >
                                                <ChevronDown className="h-3 w-3" />
                                            </Button>
                                        </div>
                                        <span className="text-xs font-medium truncate max-w-[120px] text-white">
                                            {option.label}
                                        </span>
                                        <Badge variant="outline" className="text-[9px] px-1 py-0 text-[#A8ADBD] border-[#2D303E] bg-[#1C1E29]">
                                            {option.value}
                                        </Badge>
                                    </div>
                                    <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 text-[#A8ADBD] hover:text-white hover:bg-[#242735]"
                                            onClick={() => handleDuplicateOption(index)}
                                        >
                                            <CopyIcon className="h-3 w-3" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                                            onClick={() => handleEditOption(index)}
                                        >
                                            <SettingsIcon className="h-3 w-3" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 text-red-400 hover:text-red-300 hover:bg-red-900/20"
                                            onClick={() => handleRemoveOption(index)}
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                )}
            </div>
        </div>
    );
}
