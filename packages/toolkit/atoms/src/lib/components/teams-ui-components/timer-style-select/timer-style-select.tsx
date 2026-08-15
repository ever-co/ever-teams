import { BaseSelectProps, DigitStyle, Select } from '@lib/common';
import React from 'react';

const styleOptions = [
	{ value: 'normal', label: 'Normal' },
	{ value: 'outlined', label: 'Outlined' },
	{ value: 'shadowed', label: 'Shadowed' }
];

type TimerStyleSelectProps = Omit<BaseSelectProps, 'options' | 'label' | 'onChange'> & {
	label?: string;
	onChange: (style: DigitStyle) => void;
};

export const TimerStyleSelect: React.FC<TimerStyleSelectProps> = ({
	value,
	onChange,
	label = 'Digit Style',
	id,
	className
}) => {
	return (
		<Select
			id={id}
			label={label}
			value={value}
			options={styleOptions}
			onChange={(value) => onChange(value as DigitStyle)}
			className={className}
		/>
	);
};
