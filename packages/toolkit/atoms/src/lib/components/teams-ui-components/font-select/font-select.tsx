import { BaseSelectProps, Select } from '@lib/common';
import React from 'react';

const fontOptions = [
	{ value: 'Inter', label: 'Inter' },
	{ value: 'Roboto', label: 'Roboto' },
	{ value: 'Montserrat', label: 'Montserrat' },
	{ value: 'Open Sans', label: 'Open Sans' },
	{ value: 'Lato', label: 'Lato' },
	{ value: 'Poppins', label: 'Poppins' },
	{ value: 'Source Code Pro', label: 'Source Code Pro' },
	{ value: 'Digital-7', label: 'Digital-7' }
];

type FontSelectProps = Omit<BaseSelectProps, 'options' | 'label'> & {
	label?: string;
};

export const FontSelect: React.FC<FontSelectProps> = ({ value, onChange, label = 'Font', id, className }) => {
	return (
		<Select id={id} label={label} value={value} options={fontOptions} onChange={onChange} className={className} />
	);
};
