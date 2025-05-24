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
				<label
					htmlFor={name}
					className={`block ${centered && 'text-center'} text-[14px] font-light text-[#ACB3BB]`}
				>
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
				className={`w-full py-[9px] text-[16px] ${
					centered && 'text-center'
				} border-b placeholder:font-light focus:border-b-2 focus:border-[#1B005D]
         border-[#D7E1EB] dark:focus:border-[#D7E1EB] bg-white pb-1
        font-medium text-primary dark:text-white outline-none dark:bg-transparent`}
			/>
			{errors && errors[name] && <span className="text-sm text-red-600 font-light">{errors[name]}</span>}
		</div>
	);
};

export default Input;
