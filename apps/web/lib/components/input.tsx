import clsxm from '@app/utils/clsxm';
import { useEffect, useState } from 'react';

type Props = {
	readonly errors?: Record<string, string>;
} & React.ComponentPropsWithRef<'input'>;

export function InputField({
	className,
	type = 'text',
	errors,
	name,
	...res
}: Props) {
	const [error, setError] = useState<string | undefined>(undefined);

	useEffect(() => {
		if (errors && name && errors[name]) {
			setError(errors[name]);
		} else {
			setError(undefined);
		}
	}, [errors, name]);

	return (
		<>
			<input
				type={type}
				name={name}
				className={clsxm(
					'bg-light--theme-light dark:bg-dark--theme-light',
					'border-[#0000001a] dark:border-[#ffffff33] border-solid border',
					'py-2 px-4',
					'rounded-[10px] text-sm outline-none ',
					'h-[50px] w-full',
					'font-normal tracking-tight',
					className
				)}
				onKeyUp={() => setError(undefined)}
				{...res}
			/>
			{error && (
				<span className="text-sm text-red-600 font-normal">{error}</span>
			)}
		</>
	);
}
