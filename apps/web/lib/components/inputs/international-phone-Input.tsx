import { useTranslations } from 'next-intl';
import React, { useEffect } from 'react';
import { FieldError, UseFormRegister } from 'react-hook-form';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import { PHONE_REGEX } from '@app/helpers';

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
	value,
	onChange,
	disabled = false,
	className = '',
	wrapperClassName = '',
	notValidBorder = false,
	defaultCountry = 'us'
}: PhoneInputProps<T>) => {
	const t = useTranslations();

	const { ref, ...registerProps } = register(name as any, {
		validate: (value: string) => {
			if (!value || value.trim() === '') {
				return required ? t('pages.settingsPersonal.phoneNotValid') : true;
			}

			const digitsOnly = value.replace(/\D/g, '');
			if (digitsOnly.length < 10) {
				return t('pages.settingsPersonal.phoneNotValid');
			}

			if (!value.match(PHONE_REGEX)) {
				return t('pages.settingsPersonal.phoneNotValid');
			}

			return true;
		}
	});

	const inputId = `phone-input-${name}`;

	// Apply custom styles to dropdown to match theme
	useEffect(() => {
		// Apply styles for dropdown to match container theme
		const style = document.createElement('style');
		style.innerHTML = `
			.react-tel-input .country-list {
				background-color: var(--background-color, #fff);
				color: var(--text-color, #333);
				border-color: var(--border-color, #ccc);
			}
			.react-tel-input .country-list .search-box {
				background-color: var(--background-color, #fff);
				color: var(--text-color, #333);
			}
			.react-tel-input .country-list .search-box:focus {
				background-color: var(--background-color, #fff);
			}
			.react-tel-input .country-list .country.highlight,
			.react-tel-input .country-list .country:hover {
				background-color: var(--highlight-color, #f0f0f0);
			}
			.react-tel-input .country-list::-webkit-scrollbar {
				width: 8px;
			}
			.react-tel-input .country-list::-webkit-scrollbar-track {
				background: var(--scrollbar-track, #f1f1f1);
			}
			.react-tel-input .country-list::-webkit-scrollbar-thumb {
				background: var(--scrollbar-thumb, #888);
				border-radius: 4px;
			}
			.search-class {
				background-color: var(--background-color, #fff) !important;
				color: var(--text-color, #333) !important;
			}

			/* Dark mode specific styles */
			.dark .react-tel-input .country-list {
				--background-color: #1B1D22;
				--text-color: #e0e0e0;
				--border-color: #2d2f34;
				--highlight-color: #2a2d33;
				--scrollbar-track: #2a2d33;
				--scrollbar-thumb: #4a4d52;
			}
			.dark .react-tel-input .search-box {
				background-color: #1B1D22 !important;
				color: #e0e0e0 !important;
			}
			.dark .search-class {
				background-color: #1B1D22 !important;
				color: #e0e0e0 !important;
				border-color: #2d2f34 !important;
			}
		`;
		document.head.appendChild(style);

		return () => {
			document.head.removeChild(style);
		};
	}, []);

	return (
		<div className={`w-full h-full ${wrapperClassName}`}>
			{label && (
				<label htmlFor={inputId} className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
					{label} {required && <span className="text-red-500">*</span>}
				</label>
			)}
			<div
				className={`phone-input-wrapper w-full h-[54px] ${notValidBorder ? 'border border-red-500 rounded-lg' : 'input-border rounded-[10px]'}`}
				aria-invalid={notValidBorder || !!error}
			>
				<PhoneInput
					country={defaultCountry}
					inputClass={`w-full h-[54px] !rounded-lg !pl-12 ${className} ${disabled ? 'bg-[#FCFCFC] dark:bg-[#1B1D22] cursor-not-allowed' : ''}`}
					containerClass="phone-input-container w-full h-full"
					buttonClass="phone-input-button h-full no-border"
					enableSearch={true}
					searchClass="search-class"
					dropdownClass="country-dropdown"
					searchPlaceholder={'Search'}
					{...registerProps}
					inputProps={{
						ref: ref,
						id: inputId,
						name: name,
						disabled,
						className: notValidBorder ? '!border-red-500' : 'no-focus-border',
						'aria-required': required,
						'aria-invalid': notValidBorder || !!error,
						'aria-describedby': (error || notValidBorder) ? `${name}-error` : undefined,
						style: {
							width: '100%',
							height: '100%',
							borderRadius: '10px',
							border: 'none',
							paddingLeft: '56px',
							outline: 'none'
						}
					}}
					value={value || ''}
					onChange={(phone) => {
						if (registerProps.onChange) {
							registerProps.onChange({ target: { value: phone } });
						}
						if (onChange) {
							onChange(phone);
						}
					}}
					disabled={disabled}
				/>
			</div>
			{error && (
				<p
					id={`${name}-error`}
					className="mt-1 text-xs text-red-500"
					role="alert"
				>
					{error.message}
				</p>
			)}
			{notValidBorder && !error && (
				<p
					id={`${name}-error`}
					className="mt-1 text-xs text-red-500"
					role="alert"
				>
					{t('pages.settingsPersonal.phoneNotValid')}
				</p>
			)}
		</div>
	);
};

export default InternationalPhoneInput;
