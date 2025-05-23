/* eslint-disable react/display-name */
import { useTranslations } from 'next-intl';
import React, { useState, useEffect } from 'react';
import { FieldError, UseFormRegister } from 'react-hook-form';
import PhoneInput, { Country } from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { PHONE_REGEX } from '@/core/lib/helpers/index';
import en from 'react-phone-number-input/locale/en.json';

type Option = {
	value: Country;
	label: string;
};

// Define the onChange type explicitly
type CountrySelectOnChange = (value: Country) => void;

// Custom country selector with enhanced search
const CustomCountrySelect = ({
	value,
	onChange,
	options = [],
	iconComponent = () => null,
	disabled = false
}: {
	value: Country;
	onChange: CountrySelectOnChange;
	options: Option[];
	iconComponent: React.ComponentType<{ country: Country; label: string }>;
	disabled?: boolean;
}) => {
	const [isOpen, setIsOpen] = useState(false);
	const [searchValue, setSearchValue] = useState('');
	const [filteredOptions, setFilteredOptions] = useState<Option[]>(options);
	const selectRef = React.useRef<HTMLDivElement>(null);

	const Icon = iconComponent;

	// Handle clicking outside to close dropdown
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
				setIsOpen(false);
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, []);

	// Filter options when search value changes
	useEffect(() => {
		if (!searchValue.trim()) {
			setFilteredOptions(options);
			return;
		}

		const filtered = options.filter((option: Option) => {
			const countryName = en[option.value as keyof typeof en];
			const searchableName = countryName || option.value;
			return String(searchableName).toLowerCase().includes(searchValue.toLowerCase());
		});

		setFilteredOptions(filtered);
	}, [options, searchValue]);

	// Toggle dropdown
	const toggleDropdown = () => {
		if (disabled) return; // Don't toggle if disabled

		setIsOpen(!isOpen);
		if (!isOpen) {
			setSearchValue('');
			setFilteredOptions(options);
		}
	};

	return (
		<div className={`phoneinput-country-select ${disabled ? 'phoneinput-country-disabled' : ''}`} ref={selectRef}>
			<button
				type="button"
				className="phoneinput-country-button"
				onClick={toggleDropdown}
				aria-expanded={isOpen}
				aria-haspopup="listbox"
				disabled={disabled}
			>
				{value && Icon && (
					<>
						<span className="phoneinput-flag-container">
							{React.createElement(Icon, {
								country: value,
								label: String(en[value as keyof typeof en] || value)
							})}
						</span>
						<span className="phoneinput-country-name">{value}</span>
					</>
				)}
				<span
					className={`phoneinput-dropdown-arrow ${disabled ? 'phoneinput-dropdown-arrow-disabled' : ''}`}
				></span>
			</button>

			{isOpen && !disabled && (
				<div className="phoneinput-dropdown">
					<div className="phoneinput-search-container">
						<input
							type="text"
							className="phoneinput-search-input"
							placeholder="Search countries..."
							value={searchValue}
							onChange={(e) => setSearchValue(e.target.value)}
							autoFocus
						/>
						<span className="phoneinput-search-icon">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="14"
								height="14"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
							>
								<circle cx="11" cy="11" r="8"></circle>
								<line x1="21" y1="21" x2="16.65" y2="16.65"></line>
							</svg>
						</span>
					</div>

					<div className="phoneinput-countries-container">
						<ul className="phoneinput-country-list" role="listbox">
							{filteredOptions.map((option) => (
								<li
									key={option.value}
									className={`phoneinput-country-option ${option.value === value ? 'phoneinput-selected' : ''}`}
									onClick={() => {
										onChange(option.value);
										setIsOpen(false);
										setSearchValue('');
									}}
									role="option"
									aria-selected={option.value === value}
								>
									<span className="phoneinput-flag-container">
										{Icon &&
											React.createElement(Icon, {
												country: option.value,
												label: String(en[option.value as keyof typeof en] || option.value)
											})}
									</span>
									<span className="phoneinput-country-label">
										{en[option.value as keyof typeof en] || option.value}
									</span>
								</li>
							))}
							{filteredOptions.length === 0 && (
								<li className="phoneinput-no-results">No results found</li>
							)}
						</ul>
					</div>
				</div>
			)}
		</div>
	);
};

interface PhoneInputProps<T extends Record<string, any>> {
	name: string;
	label?: string;
	error?: FieldError;
	register: UseFormRegister<T>;
	required?: boolean;
	value?: string;
	onChange?: (value: string) => void;
	disabled?: boolean;
	className?: string;
	wrapperClassName?: string;
	notValidBorder?: boolean;
	defaultCountry?: string;
}

const InternationalPhoneInput = <T extends Record<string, any>>({
	name,
	label,
	error,
	register,
	required,
	value: externalValue, // rename to avoid semantic conflict
	onChange,
	disabled = false,
	className = '',
	wrapperClassName = '',
	notValidBorder = false,
	defaultCountry = 'US'
}: PhoneInputProps<T>) => {
	const t = useTranslations();
	const [phoneValue, setPhoneValue] = useState<string>(externalValue || '');
	const inputRef = React.useRef<HTMLInputElement>(null);

	// Register with custom validation
	const {
		ref: registerRef,
		onChange: formOnChange,
		...registerProps
	} = register(name as any, {
		validate: (val: string) => {
			if (!val || val.trim() === '') {
				return required ? t('pages.settingsPersonal.phoneNotValid') : true;
			}

			const digitsOnly = val.replace(/\D/g, '');
			if (digitsOnly.length < 10) {
				return t('pages.settingsPersonal.phoneNotValid');
			}

			if (!val.match(PHONE_REGEX)) {
				return t('pages.settingsPersonal.phoneNotValid');
			}

			return true;
		}
	});

	// :warning: Avoid conflict between external value and user input
	useEffect(() => {
		if (externalValue !== undefined && externalValue !== phoneValue) {
			setPhoneValue(externalValue);
		}
	}, [externalValue]);

	// Connect ref of react-hook-form
	useEffect(() => {
		if (inputRef.current) {
			registerRef(inputRef.current);
		}
	}, [registerRef]);

	// :repeat: Centralized value management
	const handlePhoneChange = (newValue: string | undefined) => {
		const finalValue = newValue || '';
		setPhoneValue(finalValue);

		// react-hook-form
		formOnChange?.({ target: { value: finalValue } });

		// external callback
		onChange?.(finalValue);
	};

	const inputId = `phone-input-${name}`;
	const inputClassName = `phoneinput-field dark:bg-dark--theme-light ${className} ${
		disabled ? 'phoneinput-disabled' : ''
	} ${notValidBorder ? 'phoneinput-error' : ''}`;
	const wrapperClasses = `phoneinput-wrapper dark:bg-dark--theme-light ${notValidBorder ? 'phoneinput-wrapper-error' : ''} ${wrapperClassName}`;

	return (
		<div className={`phoneinput-container ${wrapperClassName}`}>
			{label && (
				<label htmlFor={inputId} className="phoneinput-label dark:bg-dark--theme-light">
					{label} {required && <span className="phoneinput-required dark:bg-dark--theme-light">*</span>}
				</label>
			)}

			<div className={wrapperClasses} aria-invalid={notValidBorder || !!error}>
				<PhoneInput
					international
					countryCallingCodeEditable={false}
					defaultCountry={defaultCountry as any}
					value={phoneValue}
					onChange={handlePhoneChange}
					disabled={disabled}
					inputRef={inputRef}
					countrySelectComponent={(props) => <CustomCountrySelect {...props} disabled={disabled} />}
					numberInputProps={{
						id: inputId,
						className: inputClassName,
						'aria-required': required,
						'aria-invalid': notValidBorder || !!error,
						'aria-describedby': error || notValidBorder ? `${name}-error` : undefined,
						...registerProps,
						name
					}}
				/>
			</div>

			{error && (
				<p id={`${name}-error`} className="phoneinput-error-message" role="alert">
					{error.message}
				</p>
			)}

			{notValidBorder && !error && (
				<p id={`${name}-error`} className="phoneinput-error-message" role="alert">
					{t('pages.settingsPersonal.phoneNotValid')}
				</p>
			)}
		</div>
	);
};

export default InternationalPhoneInput;
