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
				<SelectContent className="z-50 max-h-60" onClick={() => setOpen(true)}>
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
										<Check className="ml-auto w-4 h-4 text-primary" />
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
				className={`overflow-hidden bg-white text-clip dark:bg-dark--theme-light focus:ring-0 ${className}`}
			>
				<SelectValue placeholder={placeholder} />
			</SelectTrigger>
			<SelectContent className="z-[10000] dark:bg-dark--theme-light w-auto">
				<SelectGroup className={clsxm('overflow-y-auto', classNameGroup)}>
					{options
						?.map((option, index) => {
							// Handle both string and object options
							if (typeof option === 'string') {
								// String option (like manualTimeReasons)
								return (
									<SelectItem key={`${option}-${index}`} value={option}>
										<span className="overflow-x-hidden whitespace-nowrap text-ellipsis max-w-96">
											{option}
										</span>
									</SelectItem>
								);
							}

							// Object option validation
							if (!option || typeof option !== 'object') {
								if (process.env.NODE_ENV === 'development') {
									console.warn('🚨 Invalid option in CustomSelect:', option);
								}
								return null;
							}

							const optionValue = option[valueKey];

							// Ensure we have a valid value for object options
							if (!optionValue || typeof optionValue !== 'string') {
								if (process.env.NODE_ENV === 'development') {
									console.warn('🚨 Invalid option value in CustomSelect:', {
										option,
										valueKey,
										optionValue
									});
								}
								return null;
							}

							// Get display text with fallback for object options
							let displayText: string = '';
							if (renderOption) {
								const rendered = renderOption(option);
								displayText = typeof rendered === 'string' ? rendered : String(rendered || '');
							} else {
								displayText = option.label || option.name || option.title || optionValue;
							}

							// Ensure display text is valid
							if (!displayText || typeof displayText !== 'string') {
								if (process.env.NODE_ENV === 'development') {
									console.warn('🚨 Invalid display text in CustomSelect:', { option, displayText });
								}
								return null;
							}

							return (
								<SelectItem key={`${optionValue}-${index}`} value={optionValue}>
									<span className="overflow-x-hidden whitespace-nowrap text-ellipsis max-w-96">
										{displayText}
									</span>
								</SelectItem>
							);
						})
						.filter(Boolean)}
				</SelectGroup>
			</SelectContent>
		</Select>
	);
}
