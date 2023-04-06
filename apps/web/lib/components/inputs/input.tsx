import { mergeRefs } from '@app/helpers';
import { IClassName } from '@app/interfaces';
import { clsxm } from '@app/utils';
import {
	Dispatch,
	forwardRef,
	ReactNode,
	SetStateAction,
	useEffect,
	useRef,
	useState,
} from 'react';
import { SpinnerLoader } from '../loader';
import { Text } from '../typography';

type Props = {
	readonly errors?: Record<string, string>;
	readonly setErrors?: Dispatch<SetStateAction<Record<string, string>>>;
	wrapperClassName?: string;
	noWrapper?: boolean;
	trailingNode?: ReactNode;
	leadingNode?: ReactNode;
	autoCustomFocus?: boolean;
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
			...res
		},
		ref
	) => {
		const [error, setError] = useState<string | undefined>(undefined);
		const inputRef = useRef<HTMLInputElement>(null);

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
				name={name}
				ref={mergeRefs([ref, inputRef])}
				className={clsxm(
					'bg-light--theme-light dark:bg-dark--theme-light',
					noWrapper && ['input-border'],
					'py-2 px-4 rounded-[10px]',
					'text-sm outline-none ',
					'h-[50px] w-full',
					'font-light tracking-tight',
					className
				)}
				onKeyUp={onKeyUp}
				{...res}
			/>
		);

		return noWrapper ? (
			inputElement
		) : (
			<div
				className={clsxm(
					'w-full mb-3 relative bg-light--theme-light dark:bg-dark--theme-light',
					wrapperClassName
				)}
			>
				<div className="input-border rounded-[10px] flex justify-between h-auto">
					{leadingNode && (
						<div className="flex items-center">{leadingNode}</div>
					)}
					<div className="flex-1">{inputElement}</div>
					{trailingNode && (
						<div className="flex items-center">{trailingNode}</div>
					)}
				</div>

				{error && (
					<Text.Error className="self-start justify-self-start">
						{error}
					</Text.Error>
				)}
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
	(
		{
			className,
			type = 'text',
			label,
			dash = '__',
			wrapperClassName,
			value,
			loading,
			...res
		},
		ref
	) => {
		return (
			<div className="flex items-center">
				<div className={clsxm('relative isolate w-7', wrapperClassName)}>
					<input
						type={type}
						ref={ref}
						defaultValue={value === undefined ? '00' : undefined}
						value={value}
						{...res}
						className={clsxm(
							'outline-none p-0 bg-transparent w-full text-center',
							className
						)}
					/>
					<span className="absolute bottom-0 left-0 w-full text-center -z-10">
						{dash}
					</span>
				</div>
				<span className="pl-1">
					{!loading ? label : <SpinnerLoader size={15} />}
				</span>
			</div>
		);
	}
);

TimeInputField.displayName = 'TimeInputField';

/**
 * RadioButtonField
 */

export const RadioButtonField = forwardRef<HTMLInputElement, Props>(
	(
		{
			className,
			type = 'radio',
			errors,
			name,
			wrapperClassName,
			noWrapper,
			...res
		},
		ref
	) => {
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
				className={clsxm(
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
			<div className={clsxm('w-full', wrapperClassName)}>
				{inputElement}
				{error && (
					<Text.Error className="self-start justify-self-start">
						{error}
					</Text.Error>
				)}
			</div>
		);
	}
);

RadioButtonField.displayName = 'RadioButtonField';
