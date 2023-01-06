import clsxm from '@app/utils/clsxm';
import { forwardRef, useEffect, useState } from 'react';
import { Text } from '../typography';

type Props = {
	readonly errors?: Record<string, string>;
	wrapperClassName?: string;
	noWrapper?: boolean;
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
					'bg-light--theme-light dark:bg-dark--theme-light',
					'border-[#00000021] dark:border-[#ffffff33] border-solid border',
					'py-2 px-4 mb-1',
					'rounded-[10px] text-sm outline-none ',
					'h-[50px] w-full',
					'font-light tracking-tight',
					className
				)}
				onKeyUp={() => setError(undefined)}
				{...res}
			/>
		);

		return noWrapper ? (
			inputElement
		) : (
			<div className={clsxm('w-full mb-3', wrapperClassName)}>
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

InputField.displayName = 'InputField';
