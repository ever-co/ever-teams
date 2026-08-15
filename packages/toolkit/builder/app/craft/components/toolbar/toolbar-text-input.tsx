import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState, useEffect } from 'react';
import { ToolbarTextInputProps, RGBAColor } from '../../types';

export const ToolbarTextInput: React.FC<ToolbarTextInputProps> = ({
	onChange,
	value,
	prefix,
	label,
	type,
	...props
}) => {
	const [internalValue, setInternalValue] = useState<string>('');
	const [active, setActive] = useState(false);

	useEffect(() => {
		let val = value;
		if (type === 'color' || type === 'bg') {
			// Assume value is a RGBAColor object
			const rgba = value as RGBAColor;
			val = `rgba(${rgba.r}, ${rgba.g}, ${rgba.b}, ${rgba.a})`;
		}
		setInternalValue(val);
	}, [value, type]);

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setInternalValue(e.target.value);
	};

	const handleBlur = () => {
		if (onChange) onChange(internalValue);
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === 'Enter' && onChange) {
			onChange(internalValue);
		}
	};

	return (
		<div className="min-w-52 relative" onClick={() => setActive(true)}>
			{(type === 'color' || type === 'bg') && active ? (
				<div className="absolute" style={{ top: 'calc(100% + 10px)', left: '-5%' }}>
					<div
						className="fixed top-0 left-0 w-full h-full cursor-pointer"
						onClick={(e) => {
							e.preventDefault();
							e.stopPropagation();
							setActive(false);
						}}
					/>
					<div className="absolute z-10">
						<input
							type="color"
							value={value}
							onChange={(e) => {
								if (onChange) {
									// This is a simplified approach - would need a proper color picker
									// that handles RGBA conversion
									onChange(e.target.value);
								}
							}}
						/>
					</div>
				</div>
			) : null}

			<Label>{label}</Label>

			<Input
				className="bg-slate-50 dark:bg-slate-700 dark:text-slate-300 rounded-full pl-6 h-8 space-x-2"
				value={internalValue || ''}
				onKeyDown={handleKeyDown}
				onChange={handleChange}
				onBlur={handleBlur}
				{...props}
			/>

			{['color', 'bg'].includes(type) && (
				<div className="relative -mt-6 pl-2">
					<div
						className="w-4 h-4 inline-block rounded-full"
						style={{
							backgroundColor: internalValue
						}}
					/>
				</div>
			)}
		</div>
	);
};
