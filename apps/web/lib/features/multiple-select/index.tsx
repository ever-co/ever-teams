import React from 'react';
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
    SelectGroup,
    SelectLabel,
} from '@components/ui/select';
import { Check } from 'lucide-react';

type Option = {
    label: string;
    value: string;
};

interface MultipleSelectProps {
    options: Option[];
    selectedValues: string[];
    onChange: (values: string[]) => void;
    placeholder?: string;
    label?: string;
    setOpen: (_: any) => void;
    open: boolean;
}

export function MultipleSelect({
    options,
    selectedValues,
    onChange,
    placeholder = 'Select options',
    label,
    open = false,
    setOpen
}: MultipleSelectProps) {

    const handleSelect = (value: string) => {
        const newSelectedValues = selectedValues.includes(value)
            ? selectedValues.filter((v) => v !== value)
            : [...selectedValues, value];

        onChange(newSelectedValues);
    };

    return (
        <div>
            <Select open={open} onOpenChange={setOpen}>
                <SelectTrigger
                    className="w-64"
                    onClick={() => setOpen(true)}
                >
                    <SelectValue>
                        {selectedValues.length > 0
                            ? selectedValues.join(', ')
                            : placeholder}
                    </SelectValue>
                </SelectTrigger>
                <SelectContent
                    className="max-h-60 z-50"
                    onClick={() => setOpen(true)}
                >
                    <SelectGroup>
                        {label && <SelectLabel>{label}</SelectLabel>}
                        {options.map((option) => (
                            <SelectItem
                                key={option.value}
                                value={option.value}
                                onClick={() => handleSelect(option.value)}
                            >
                                <div className="flex items-center">
                                    <span>{option.label}</span>
                                    {selectedValues.includes(option.value) && (
                                        <Check className="ml-auto h-4 w-4 text-primary" />
                                    )}
                                </div>
                            </SelectItem>
                        ))}
                    </SelectGroup>
                </SelectContent>
            </Select>
        </div>
    );
}
