import React from 'react';
import { BaseSelectProps } from './types';

export const Select: React.FC<BaseSelectProps> = ({ id, label, value, options, onChange, className = '' }) => {
	const selectId = id || `select-${label.toLowerCase().replace(/\s+/g, '-')}`;

	return (
		<div className="flex flex-col gap-2">
			<label htmlFor={selectId} className="text-sm font-medium text-gray-700">
				{label}
			</label>
			<select
				id={selectId}
				value={value}
				onChange={(e) => onChange(e.target.value)}
				className={`px-3 py-2 w-full text-base rounded-md border border-gray-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${className}`}
			>
				{options.map((option) => (
					<option key={option.value} value={option.value}>
						{option.label}
					</option>
				))}
			</select>
		</div>
	);
};
