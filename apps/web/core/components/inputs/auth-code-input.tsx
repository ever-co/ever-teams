'use client';

import { clsxm } from '@app/utils';
import React, { MutableRefObject, forwardRef, useState, useEffect, useImperativeHandle, useRef } from 'react';
import { InputField } from './input';
import { useTranslations } from 'next-intl';
import { useCallbackRef } from '@app/hooks';

const allowedCharactersValues = ['alpha', 'numeric', 'alphanumeric'] as const;

export type AuthCodeProps = {
	inputReference?: MutableRefObject<HTMLInputElement[]>;
	allowedCharacters?: (typeof allowedCharactersValues)[number];
	ariaLabel?: string;
	autoFocus?: boolean;
	containerClassName?: string;
	disabled?: boolean;
	inputClassName?: string;
	isPassword?: boolean;
	length?: number;
	placeholder?: string;
	onChange: (res: string) => void;
	submitCode?: () => void;
	defaultValue?: string;
	hintType?: 'success' | 'error' | 'warning' | undefined;
	autoComplete?: string;
};

type InputMode = 'text' | 'numeric';

type InputType = 'text' | 'tel' | 'password';

type InputProps = {
	type: InputType;
	inputMode: InputMode;
	pattern: string;
	min?: string;
	max?: string;
};

export type AuthCodeRef = {
	focus: () => void;
	clear: () => void;
};

const propsMap: { [key: string]: InputProps } = {
	alpha: {
		type: 'text',
		inputMode: 'text',
		pattern: '[a-zA-Z]{1}'
	},

	alphanumeric: {
		type: 'text',
		inputMode: 'text',
		pattern: '[a-zA-Z0-9]{1}'
	},

	numeric: {
		type: 'tel',
		inputMode: 'numeric',
		pattern: '[0-9]{1}',
		min: '0',
		max: '9'
	}
};

export const AuthCodeInputField = forwardRef<AuthCodeRef, AuthCodeProps>(
	(
		{
			inputReference = null,
			allowedCharacters = 'alphanumeric',
			ariaLabel,
			autoFocus = true,
			containerClassName,
			disabled,
			inputClassName,
			isPassword = false,
			length = 6,
			placeholder,
			onChange,
			defaultValue,
			hintType,
			autoComplete = '',
			submitCode
		},
		ref
	) => {
		const t = useTranslations();
		if (isNaN(length) || length < 1) {
			throw new Error(t('errors.LENGTH_NUMBER_ERROR'));
		}

		if (!allowedCharactersValues.some((value) => value === allowedCharacters)) {
			throw new Error(t('errors.INVALID_ALLOWED_CHARACTER'));
		}
		const [canSubmit, setCanSubmit] = useState<boolean>(false);
		const reference = useRef<HTMLInputElement[]>([]);
		const $submitCode = useCallbackRef(submitCode);

		const inputsRef = inputReference || reference;
		const inputProps = propsMap[allowedCharacters];
		const validDefaultValue =
			defaultValue && defaultValue.length === length && defaultValue.match(inputProps.pattern) ? true : false;

		useImperativeHandle(ref, () => ({
			focus: () => {
				if (inputsRef.current) {
					inputsRef.current[0].focus();
				}
			},
			clear: () => {
				if (inputsRef.current) {
					for (let i = 0; i < inputsRef.current.length; i++) {
						inputsRef.current[i].value = '';
					}
					inputsRef.current[0].focus();
				}
				sendResult();
			}
		}));

		useEffect(() => {
			if (autoFocus) {
				setTimeout(() => {
					inputsRef.current[0].focus();
				}, 100);
			}
		}, [autoFocus, inputsRef]);

		useEffect(() => {
			canSubmit && $submitCode.current?.();
		}, [canSubmit, $submitCode]);

		const sendResult = () => {
			const res = inputsRef.current.map((input) => input.value).join('');
			onChange && onChange(res);
		};
		const handleOnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
			const {
				target: { value, nextElementSibling }
			} = e;

			e.target.value = value.toUpperCase();

			if (value.length > 1) {
				e.target.value = value.charAt(0);

				if (nextElementSibling !== null) {
					(nextElementSibling as HTMLInputElement).focus();
				}
			} else {
				if (value.match(inputProps.pattern)) {
					if (nextElementSibling !== null) {
						(nextElementSibling as HTMLInputElement).focus();
					}
				} else {
					e.target.value = '';
				}
			}
			sendResult();
		};

		const handleOnKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
			const { key } = e;
			const target = e.target as HTMLInputElement;
			if (key === 'Backspace') {
				if (target.value === '') {
					if (target.previousElementSibling !== null) {
						const t = target.previousElementSibling as HTMLInputElement;
						t.value = '';
						t.focus();
						e.preventDefault();
					}
				} else {
					target.value = '';
				}
				sendResult();
			}
		};

		const handleOnFocus = (e: React.FocusEvent<HTMLInputElement>) => {
			e.target.select();
		};

		const handleOnPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
			e.preventDefault();
			const pastedValue = e.clipboardData.getData('Text');

			let currentInput = 0;

			for (let i = 0; i < pastedValue.length; i++) {
				const pastedCharacter = pastedValue.charAt(i);
				if (pastedCharacter.match(inputProps.pattern)) {
					inputsRef.current[currentInput].value = pastedCharacter;
					if (inputsRef.current[currentInput].nextElementSibling !== null) {
						(inputsRef.current[currentInput].nextElementSibling as HTMLInputElement).focus();
						currentInput++;
					}
				}
			}
			sendResult();
		};

		const handleAutoComplete = (code: string) => {
			let currentInput = 0;

			for (let i = 0; i < code.length; i++) {
				const pastedCharacter = code.charAt(i);
				const currentValue = inputsRef.current[currentInput].value;
				if (pastedCharacter.match(inputProps.pattern)) {
					if (!currentValue) {
						inputsRef.current[currentInput].value = pastedCharacter;
						if (inputsRef.current[currentInput].nextElementSibling !== null) {
							(inputsRef.current[currentInput].nextElementSibling as HTMLInputElement).focus();
							currentInput++;
						}
					}
				}
			}
			sendResult();
		};

		useEffect(() => {
			if (autoComplete && autoComplete.length > 0) {
				handleAutoComplete(autoComplete);
				setCanSubmit(true);
			}
			// eslint-disable-next-line react-hooks/exhaustive-deps
		}, [autoComplete, canSubmit]);

		const hintColor = {
			success: '#4BB543',
			error: '#FF9494',
			warning: '#ffcc00'
		} as const;

		const inputs = [];
		for (let i = 0; i < length; i++) {
			const dvalue = validDefaultValue ? defaultValue?.charAt(i) : undefined;

			inputs.push(
				<InputField
					key={i}
					onChange={handleOnChange}
					onKeyDown={handleOnKeyDown}
					onFocus={handleOnFocus}
					onPaste={handleOnPaste}
					noWrapper={true}
					defaultValue={dvalue}
					{...inputProps}
					type={isPassword ? 'password' : inputProps.type}
					ref={(el: HTMLInputElement) => {
						inputsRef.current[i] = el;
					}}
					maxLength={1}
					className={clsxm('transition-[border-color]', inputClassName)}
					autoComplete={i === 0 ? 'one-time-code' : 'off'}
					aria-label={ariaLabel ? `${ariaLabel}. Character ${i + 1}.` : `Character ${i + 1}.`}
					disabled={disabled}
					placeholder={placeholder}
					style={{
						transitionDuration: hintType ? `${i + 10}90ms` : undefined,
						transitionTimingFunction: hintType ? 'ease-in-out' : undefined,
						borderColor: hintType ? hintColor[hintType] : undefined
					}}
				/>
			);
		}

		return <div className={containerClassName}>{inputs}</div>;
	}
);

AuthCodeInputField.displayName = 'AuthCodeInputField';
