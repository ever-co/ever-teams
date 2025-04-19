'use client';

import { useCallbackRef } from '@app/hooks';
import { Transition, Popover } from '@headlessui/react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { HexColorPicker } from 'react-colorful';
import { EditPenUnderlineIcon, TrashIcon } from 'assets/svg';
import { PopoverTrigger, PopoverContent, Popover as PopoverDropdown } from '@components/ui/popover';

export const ColorPicker = ({
	defaultColor,
	onChange,
	fullWidthInput,
	isTeamManager,
	disabled: disableButton,
	className
}: {
	defaultColor?: string;
	onChange?: (color?: string | null) => void;
	fullWidthInput?: boolean;
	isTeamManager?: boolean;
	disabled?: boolean;
	className?: string;
}) => {
	const [color, setColor] = useState(defaultColor || null);
	const onChangeRef = useCallbackRef(onChange);
	const buttonRef = useRef<HTMLButtonElement>(null);
	const panelRef = useRef<HTMLDivElement>(null);
	const [disabled, setDisabled] = useState<boolean>(true);

	const toggleDisabled = useCallback(() => {
		setDisabled(!disabled);
	}, [disabled]);

	useEffect(() => {
		if (defaultColor) {
			setColor(defaultColor);
		}
	}, [defaultColor]);

	useEffect(() => {
		if (color && onChangeRef.current) {
			onChangeRef.current(color);
		}
	}, [color, onChangeRef]);

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
				setDisabled(true);
			}
		};

		const handleKeyPress = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				setDisabled(true);
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		document.addEventListener('keydown', handleKeyPress);

		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
			document.removeEventListener('keydown', handleKeyPress);
		};
	}, []);

	return fullWidthInput ? (
		<Popover
			className={'z-[9999] relative border-none no-underline w-full mt-3' + className}
			onProgressCapture={(e) => e.stopPropagation()}
		>
			{() => (
				<>
					<Popover.Button
						className={'outline-none mb-[15px] w-full'}
						ref={buttonRef}
						disabled={disableButton}
						onClick={toggleDisabled}
						as="div"
					>
						<div
							className={`relative w-[100%] h-[48px] border rounded-[10px] flex items-center justify-between input-border ${
								disabled || disableButton ? 'bg-[#FCFCFC]' : 'bg-light--theme-light'
							}  dark:bg-dark--theme-light`}
						>
							<div className={`flex gap-[8px] h-[40px] items-center pl-[15px]`}>
								<div
									className={`w-5 h-5 rounded-xl`}
									style={{
										backgroundColor: color || undefined
									}}
								></div>
								<div className="uppercase dark:text-white">{color || ''}</div>
							</div>
							{isTeamManager && (
								<div className="flex mr-[0.5rem] gap-3">
									<button
										disabled={!isTeamManager}
										className={`outline-none z-50`}
										onClick={() => {
											setDisabled(!disabled);
										}}
									>
										<EditPenUnderlineIcon className="w-6 h-6 cursor-pointer" />
									</button>

									<span
										onClick={() => {
											setColor(null);
											onChange && onChange(null);
										}}
										className={`outline-none ${'cursor-pointer'}`}
									>
										<TrashIcon className="w-5" />
									</span>
								</div>
							)}
						</div>
					</Popover.Button>
					<Transition
						as="div"
						enter="transition ease-out duration-200"
						enterFrom="opacity-0 translate-y-1"
						enterTo="opacity-100 translate-y-0"
						leave="transition ease-in duration-150"
						leaveFrom="opacity-100 translate-y-0"
						leaveTo="opacity-0 translate-y-1"
						show={!disabled}
					>
						<PopoverDropdown>
							<PopoverTrigger asChild>
								<div className="h-10">
									{/* @ts-ignore */}
									<HexColorPicker
										color={color || undefined}
										onChange={setColor}
										key={color ? `color-picker-${color}` : 'color-picker-default'}
									/>{' '}
									as unknown as JSX.Element
								</div>
							</PopoverTrigger>
						</PopoverDropdown>
					</Transition>
				</>
			)}
		</Popover>
	) : (
		<PopoverDropdown>
			<PopoverTrigger asChild>
				<div className="flex items-center space-x-2 dark:bg-dark--theme-light input-border rounded-xl cursor-pointer h-14 px-2">
					<span className="w-5 h-5 rounded-full block" style={{ backgroundColor: color || '#000' }} />
					<span className="font-normal">{color || 'Color'}</span>
				</div>
			</PopoverTrigger>
			<PopoverContent align="end" side="bottom" className="w-fit dark:bg-dark--theme-light input-border">
				{/* @ts-ignore */}
				<HexColorPicker className="relative h-10" color={color || undefined} onChange={setColor} />
			</PopoverContent>
		</PopoverDropdown>
	);
};
