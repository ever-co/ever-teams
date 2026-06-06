'use client';

import {
	Dispatch,
	forwardRef,
	MutableRefObject,
	ReactNode,
	Ref,
	RefCallback,
	SetStateAction,
	useEffect,
	useRef,
	useState
} from 'react';
import { SpinnerLoader } from '../loader';
import { Text } from '../typography';
import { mergeRefs, useOutsideClick } from '@ever-teams/atoms';
import { cn, IClassName } from '@ever-teams/toolkit-ui';

type Props = {
	readonly errors?: Record<string, string>;
	readonly setErrors?: Dispatch<SetStateAction<Record<string, string>>>;
	wrapperClassName?: string;
	noWrapper?: boolean;
	trailingNode?: ReactNode;
	leadingNode?: ReactNode;
	autoCustomFocus?: boolean;
	notValidBorder?: boolean;
	emojis?: boolean;
	setTaskName?: (taskName: string) => void;
	ignoreElementRefForTitle?: MutableRefObject<HTMLDivElement | null>;
} & React.ComponentPropsWithRef<'input'>;

export const InputField = forwardRef<HTMLInputElement, Props>(
	(
		{
			className,
			type = 'text',
			errors,
			name,
			wrapperClassName,
			noWrapper,
			setErrors,
			trailingNode,
			leadingNode,
			autoCustomFocus,
			notValidBorder,
			emojis,
			setTaskName,
			ignoreElementRefForTitle,
			...res
		},
		ref
	) => {
		const [error, setError] = useState<string | undefined>(undefined);
		const inputRef = useRef<HTMLInputElement>(null);
		const [showEmoji, setShowEmoji] = useState<boolean>(false);
		const [clickInput, setClickInput] = useState<boolean>(false);

		const handleOutsideClick = () => {
			setShowEmoji(false);
		};

		useEffect(() => {
			const handleClickOutside = (event: MouseEvent) => {
				if (inputRef.current && !inputRef.current.contains(event.target as Node)) {
					setClickInput(false);
				}
			};
			document.addEventListener('mousedown', handleClickOutside);
			return () => {
				document.removeEventListener('mousedown', handleClickOutside);
			};
		}, [setClickInput]);

		const { targetEl } = useOutsideClick<HTMLDivElement>(handleOutsideClick);
		useEffect(() => {
			if (errors && name && errors[name]) {
				setError(errors[name]);
			} else {
				setError(undefined);
			}
		}, [errors, name]);

		const onKeyUp = () => {
			if (setErrors && name) {
				setErrors((ls) => ({ ...ls, [name]: '' }));
			} else {
				setError(undefined);
			}
		};

		/**
		 *  Focusing on the input field when the modal is open.
		 */
		useEffect(() => {
			if (autoCustomFocus) {
				inputRef.current?.focus();
			}
		}, [inputRef, autoCustomFocus]);

		const inputElement = (
			<input
				type={type}
				ref={mergeRefs([ref, inputRef])}
				className={cn(
					'bg-light--theme-light dark:bg-dark--theme-light dark:text-white',
					noWrapper && ['input-border'],
					'py-2 px-4 rounded-[10px]',
					'text-sm outline-none ',
					'h-[50px] w-full',
					'font-light tracking-tight',
					className
				)}
				onKeyUp={onKeyUp}
				onClick={() => setClickInput(true)}
				onMouseOut={() => {
					if (showEmoji == true) {
						setShowEmoji(false);
					}
				}}
				{...res}
			/>
		);

		const filteredRefs = [targetEl, ignoreElementRefForTitle].filter(Boolean);

		return noWrapper ? (
			inputElement
		) : (
			<div
				className={cn('w-full mb-3 relative bg-light--theme-light dark:bg-dark--theme-light', wrapperClassName)}
			>
				<div
					className={cn(
						notValidBorder ? 'border border-red-500' : 'input-border',
						'rounded-[10px] flex justify-between h-auto items-center bg-light--theme-light dark:bg-transparent'
					)}
				>
					{leadingNode && <div className="flex items-center">{leadingNode}</div>}
					<div className="flex-1">{inputElement}</div>
					{trailingNode && <div className="flex items-center">{trailingNode}</div>}
				</div>
				{error && <Text.Error className="self-start justify-self-start">{error}</Text.Error>}
			</div>
		);
	}
);

InputField.displayName = 'InputField';

/**
 * TimeInputField
 */

type ITimeProps = {
	label: string;
	dash?: string;
	wrapperClassName?: string;
	loading?: boolean;
} & IClassName &
	React.ComponentPropsWithRef<'input'>;

export const TimeInputField = forwardRef<HTMLInputElement, ITimeProps>(
	({ className, type = 'text', label, dash = '__', wrapperClassName, value, loading, ...res }, ref) => {
		return (
			<div className={cn('flex items-center', loading && 'gap-1')}>
				<div className={cn('relative isolate w-7', wrapperClassName)}>
					<input
						type={type}
						ref={ref}
						value={value}
						{...res}
						className={cn('outline-none p-0 bg-transparent w-full text-center', className)}
					/>
					<span className="absolute left-0 w-full text-center -z-10 dark:text-[#7E7991] mt-1">{dash}</span>
				</div>

				{loading && <SpinnerLoader size={15} />}
				{!loading && <span>{label} </span>}
			</div>
		);
	}
);

TimeInputField.displayName = 'TimeInputField';

/**
 * RadioButtonField
 */
export const RadioButtonField = forwardRef<HTMLInputElement, Props>(
	({ className, type = 'radio', errors, name, wrapperClassName, noWrapper, ...res }, ref) => {
		const [error, setError] = useState<string | undefined>(undefined);

		useEffect(() => {
			if (errors && name && errors[name]) {
				setError(errors[name]);
			} else {
				setError(undefined);
			}
		}, [errors, name]);

		const inputElement = (
			<input
				type={type}
				name={name}
				ref={ref}
				className={cn(
					'w-4 h-4',
					'text-[#3826A6] bg-gray-100 border-gray-300 focus:ring-[#3826A6]',
					'dark:focus:ring-[#3826A6] dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600',
					className
				)}
				onKeyUp={() => setError(undefined)}
				{...res}
			/>
		);

		return noWrapper ? (
			inputElement
		) : (
			<div className={cn('w-full', wrapperClassName)}>
				{inputElement}
				{error && <Text.Error className="self-start justify-self-start">{error}</Text.Error>}
			</div>
		);
	}
);

RadioButtonField.displayName = 'RadioButtonField';
