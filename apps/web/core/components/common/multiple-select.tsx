import React from 'react';
import {
	Select,
	SelectTrigger,
	SelectValue,
	SelectContent,
	SelectItem,
	SelectGroup,
	SelectLabel
} from '@/core/components/common/select';
import { Check } from 'lucide-react';
import { clsxm } from '@/core/lib/utils';

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
				<SelectTrigger className="w-64" onClick={() => setOpen(true)}>
					<SelectValue>{selectedValues.length > 0 ? selectedValues.join(', ') : placeholder}</SelectValue>
				</SelectTrigger>
				<SelectContent className="max-h-60 z-50" onClick={() => setOpen(true)}>
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
	className?: string;
	ariaLabel?: string;
	defaultValue?: string;
	classNameGroup?: string;
	options: any[];
	renderOption?: (option: any) => React.ReactNode;
	value?: any;
	onChange?: (value: any) => void;
	valueKey?: string;
	placeholder?: string;
};

/**
 * A customizable dropdown select menu for choosing a .
 *
 * @param {CustomSelectProps} props - Props for configuring the select component.
 * @param {string[]} props.options - Array of selectable options to be displayed in the dropdown.
 * @param {(option: string) => React.ReactNode} [props.renderOption] - Optional function for custom rendering of each option.
 * @param {string} [props.ariaLabel] - Optional aria-label for the select component.
 * @param {string} [props.className] - Optional class name for styling the select component.
 * @param {string} [props.classNameGroup] - Optional class name for styling the select group.
 * @param {string} [props.defaultValue] - Optional default value of the select component.
 * @param {string} [props.value] - Optional value of the select component.
 * @param {(value: string) => void} [props.onChange] - Optional function for handling the change event of the select component.
 *
 * @returns {React.ReactNode} A React component representing the customizable dropdown select menu.
 */
export function CustomSelect({
	options,
	renderOption,
	ariaLabel,
	className,
	value,
	onChange,
	defaultValue,
	classNameGroup,
	valueKey = 'id',
	placeholder = 'Select an option'
}: CustomSelectProps) {
	return (
		<Select
			defaultValue={defaultValue}
			value={value}
			onValueChange={onChange}
			aria-label={ariaLabel || 'Select an option'}
		>
			<SelectTrigger
				className={`overflow-hidden text-clip bg-white dark:bg-dark--theme-light focus:ring-0 ${className}`}
			>
				<SelectValue placeholder={placeholder} />
			</SelectTrigger>
			<SelectContent className="z-[10000] dark:bg-dark--theme-light w-auto">
				<SelectGroup className={clsxm('overflow-y-auto', classNameGroup)}>
					{options?.map((option, index) => {
						const optionValue = typeof option === 'object' ? option[valueKey] : option;
						return (
							<SelectItem key={optionValue || index} value={optionValue}>
								{renderOption ? renderOption(option) : option.label || option.name || option.toString()}
							</SelectItem>
						);
					})}
				</SelectGroup>
			</SelectContent>
		</Select>
	);
}
