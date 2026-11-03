import { ChangeEventHandler } from 'react';

export interface IInputProps {
	label: string;
	name: string;
	type: string;
	placeholder: string;
	required: boolean;
	onChange?: ChangeEventHandler<HTMLInputElement>;
	value: string;
	centered?: boolean;
	errors?: { [x: string]: any };
}

const Input = ({
	label,
	name,
	type = 'text',
	placeholder,
	required,
	onChange,
	value,
	centered = false,
	errors
}: IInputProps) => {
	return (
		<div>
			{value.length > 0 && (
				<label htmlFor={name} className={`block ${centered && 'text-center'} text-sm text-muted-foreground`}>
					{label}
				</label>
			)}
			<input
				type={type}
				name={name}
				value={value}
				id={name}
				placeholder={placeholder}
				required={required}
				onChange={onChange}
				className={`w-full py-[9px] text-base ${
					centered && 'text-center'
				} hairline-b border-border bg-transparent pb-1 font-medium text-foreground outline-hidden placeholder:text-muted-foreground/75 focus:border-b-2 focus:border-primary`}
			/>
			{errors?.[name] && <span className="text-sm text-destructive-ink">{errors[name]}</span>}
		</div>
	);
};

export default Input;
