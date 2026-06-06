'use client';

import { useRef, useState } from 'react';
import { Lock, LockOpen } from 'lucide-react';
import { Label } from './label';
import { cn } from '../utils/utils';

interface ColorPickerProps extends React.InputHTMLAttributes<HTMLInputElement> {
	label?: string;
	className?: string;
	value?: string;
}

const ColorPicker = ({ className, label, value, name, onChange, placeholder }: ColorPickerProps) => {
	const [locked, setLocked] = useState(false);
	const colorInputRef = useRef<HTMLInputElement>(null);

	const openColorPicker = () => {
		if (!locked && colorInputRef.current) {
			colorInputRef.current.click();
		}
	};

	return (
		<div className="flex flex-col gap-2">
			{label && <Label className="text-slate-500 dark:text-white text-sm">{label}</Label>}
			<div className={cn('flex items-center gap-2 border rounded-md h-10 px-3 dark:border-slate-800', className)}>
				<div
					role="button"
					tabIndex={0}
					onClick={openColorPicker}
					onKeyDown={(e) => {
						if (e.key === 'Enter' || e.key === ' ') {
							e.preventDefault();
							openColorPicker();
						}
					}}
					className={`size-5 rounded-full cursor-pointer border dark:border-slate-800 relative ${
						locked ? 'opacity-50 cursor-not-allowed' : ''
					}`}
					style={{ backgroundColor: value?.toString() }}
				>
					<input
						type="color"
						name={name}
						ref={colorInputRef}
						value={value}
						onChange={onChange}
						className="opacity-0 absolute top-1"
						aria-label="Select color"
					/>
				</div>
				<input
					type="text"
					name={name}
					value={value}
					onChange={onChange}
					className="flex-1 bg-transparent outline-hidden text-sm"
					disabled={locked}
					maxLength={7}
					placeholder={placeholder}
				/>
				<button type="button" onClick={() => setLocked((prev) => !prev)}>
					{locked ? (
						<Lock className="w-4 h-4 text-gray-500" />
					) : (
						<LockOpen className="w-4 h-4 text-gray-500" />
					)}
				</button>
			</div>
		</div>
	);
};

export { ColorPicker };
