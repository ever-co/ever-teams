import { ChangeEventHandler, HTMLInputTypeAttribute } from 'react';

type ITimeInputProps = {
	placeholder?: string;
	handleChange?: ChangeEventHandler<HTMLInputElement>;
	value: string;
	type: HTMLInputTypeAttribute;
	style: string;
	name?: string;
	handleDoubleClick?: any;
	handleEnter?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
	disabled?: boolean;
	handleFocus?: any;
	handleBlur?: any;
};

export const TimeInput = ({
	value,
	placeholder,
	handleChange,
	type,
	style,
	name,
	handleDoubleClick,
	handleEnter,
	disabled,
	handleFocus,
	handleBlur
}: ITimeInputProps) => {
	const onEnter = (event: React.KeyboardEvent<HTMLInputElement>) => {
		if (event.key === 'Enter') {
			handleEnter && handleEnter(event);
		}
	};

	return (
		<input
			autoComplete="off"
			className={`placeholder:font-light text-[14px] text-center border-b-2 dark:border-[#616164] border-dashed outline-none  placeholder:text-center ${style}`}
			placeholder={placeholder}
			value={value}
			name={name}
			onChange={handleChange}
			onFocus={handleFocus}
			onBlur={handleBlur}
			type={type}
			onDoubleClick={handleDoubleClick}
			onKeyPress={onEnter}
			disabled={disabled}
		/>
	);
};
