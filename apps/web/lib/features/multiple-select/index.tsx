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
import { clsxm } from '@/app/utils';

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




type CustomSelectProps = {


    className?: string,
    ariaLabel?: string
    defaultValue?: string
    classNameGroup?: string
    /**
     * Array of string options to be displayed in the dropdown.
     * Each string represents a selectable , such as "daily" or "weekly".
     */
    options: string[] | any[];

    /**
     * Optional render function that customizes the display of each option.
     * Receives the option string as an argument and returns a ReactNode to render.
     * If not provided, options will display with the first letter capitalized.
     */
    renderOption?: (option: string) => React.ReactNode;
};

/**
 * CustomSelect Component
 *
 * This component renders a customizable dropdown select menu for choosing a .
 * It allows passing an array of options and optionally customizes the appearance of each option.
 *
 * @component
 * @param {CustomSelectProps} props - Props for configuring the select component.
 * @param {string[]} props.options - Array of selectable options to be displayed in the dropdown.
 * @param {(option: string) => React.ReactNode} [props.renderOption] - Optional function for custom rendering of each option.
 *
 * @example
 * <CustomSelect
 *    options={['daily', 'weekly', 'monthly']}
 *    renderOption={(option) => (
 *       <div className="flex items-center">
 *          <span className="text-blue-500">{option.charAt(0).toUpperCase()}</span>
 *          <span className="ml-1">{option.slice(1)}</span>
 *       </div>
 *    )}
 * />
 */
export function CustomSelect({
    options,
    renderOption,
    ariaLabel,
    className,
    value,
    onChange,
    defaultValue,
    classNameGroup
}: CustomSelectProps & {
    value?: string,
    onChange?: (value: string) => void
}) {
    // Render the select component with dynamic options and optional custom rendering.
    return (
        <Select
            defaultValue={defaultValue}
            value={value}
            onValueChange={onChange}
            aria-label={ariaLabel || "Select an option"} >

            <SelectTrigger
                className={`overflow-hidden text-clip border border-gray-200 dark:border-gray-700 bg-white dark:bg-dark--theme-light focus:ring-2 focus:ring-transparent ${className}`}
            >
                <SelectValue placeholder="Select an option" />
            </SelectTrigger>
            <SelectContent className='z-[10000] dark:bg-dark--theme-light w-auto'>
                <SelectGroup className={clsxm('overflow-y-auto', classNameGroup)}>
                    {options.map((value) => (
                        <SelectItem key={value} value={value}>
                            {renderOption ? renderOption(value) : value.charAt(0).toUpperCase() + value.slice(1)}
                        </SelectItem>
                    ))}
                </SelectGroup>
            </SelectContent>
        </Select>
    );
}
