'use client';

import { useCallbackRef } from '@/core/hooks';
import { Transition, Popover, PopoverButton } from '@headlessui/react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { HexColorPicker } from 'react-colorful';
import { CheckSquareOutlineIcon } from 'assets/svg';
import { PopoverTrigger, PopoverContent, Popover as PopoverDropdown } from '@/core/components/common/popover';
import { Edit, Spinner, Trash } from '@/core/components/icons';
import { cn } from '@/core/lib/helpers';
import { buttonVariants } from '@/core/components/duplicated-components/_button';
import { controlGroupRecipe } from './input';

const iconButtonClassName = buttonVariants({ variant: 'ghost', size: 'icon-sm' });

export const ColorPicker = ({
	defaultColor,
	onChange,
	fullWidthInput,
	isTeamManager,
	disabled: disableButton,
	className,
	onSave
}: {
	defaultColor?: string;
	onChange?: (color?: string | null) => void;
	fullWidthInput?: boolean;
	isTeamManager?: boolean;
	disabled?: boolean;
	className?: string;
	onSave?: (data?: Record<string, any>) => Promise<void>;
}) => {
	const [color, setColor] = useState(defaultColor || null);
	const onChangeRef = useCallbackRef(onChange);
	const buttonRef = useRef<HTMLButtonElement>(null);
	const panelRef = useRef<HTMLDivElement>(null);
	const [disabled, setDisabled] = useState<boolean>(true);
	const [, setIsInternalUpdate] = useState(false);
	const [loading, setLoading] = useState(false);

	const toggleDisabled = useCallback(() => {
		setDisabled(!disabled);
	}, [disabled]);

	// Handle external defaultColor changes (avoid infinite loop)
	// ⚠️ This hook is setting the color back to the default color on color change (when isInternalUpdate is set back to false)
	// useEffect(() => {
	// 	// Only sync when defaultColor is actually provided and different
	// 	if (defaultColor && defaultColor !== color && !isInternalUpdate) {
	// 		setColor(defaultColor);
	// 	}
	// }, [defaultColor, isInternalUpdate]); // Removed 'color' to prevent circular dependency

	// If parent supplies defaultColor asynchronously, use it only if we don't already have a selection
	useEffect(() => {
		if (defaultColor && !color && !loading) {
			setColor(defaultColor);
		}
	}, [defaultColor, color, loading]);

	// Handle internal color changes and notify parent
	const handleColorChange = useCallback(
		(newColor: string) => {
			setIsInternalUpdate(true);
			setColor(newColor);

			// Notify parent of change
			if (onChangeRef.current) {
				onChangeRef.current(newColor);
			}

			// Reset flag after a brief delay to allow parent updates
			setTimeout(() => {
				setIsInternalUpdate(false);
			}, 0);
		},
		[onChangeRef]
	);

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

	const handleSave = useCallback(async () => {
		try {
			setLoading(true);

			if (onSave) {
				await onSave();
			}
			setDisabled(true);
		} catch (error) {
			console.log(error);
		} finally {
			setLoading(false);
		}
	}, [onSave]);

	const isLocked = disabled || disableButton;

	return fullWidthInput ? (
		<Popover
			className={'z-[1000] relative border-none no-underline w-full mt-3' + className}
			onProgressCapture={(e) => e.stopPropagation()}
		>
			{({ open }) => (
				<>
					<PopoverButton
						className={'w-full outline-hidden mb-[15px]'}
						ref={buttonRef}
						disabled={disableButton}
						onClick={toggleDisabled}
						as="div"
					>
						<div
							className={cn(
								controlGroupRecipe,
								'relative h-9 justify-between',
								isLocked && 'bg-muted/50'
							)}
						>
							<div className="flex items-center gap-2 pl-2.5">
								<div
									className="size-4 rounded-full hairline-ring ring-foreground/10"
									style={{
										backgroundColor: color || undefined
									}}
								></div>
								<div className="text-sm uppercase tabular-nums text-foreground">{color || ''}</div>
							</div>
							{isTeamManager && (
								<div className="flex mr-1 gap-1">
									{open ? (
										<button type="button" onClick={handleSave} className={iconButtonClassName}>
											{loading ? (
												<Spinner className="size-4 animate-spin" />
											) : (
												<CheckSquareOutlineIcon
													className="w-[18px] h-[18px]"
													strokeWidth="1.4"
												/>
											)}
										</button>
									) : (
										<>
											{loading ? (
												<Spinner className="size-4 animate-spin text-muted-foreground" />
											) : (
												<>
													<button
														disabled={loading}
														className={cn(iconButtonClassName, 'z-50')}
														onClick={() => {
															setDisabled(!disabled);
														}}
														type="button"
													>
														<Edit className="size-4 text-muted-foreground" />
													</button>
													<button
														disabled={loading}
														onClick={() => {
															setIsInternalUpdate(true);
															setColor(null);
															if (onChange) {
																onChange(null);
															}
															setTimeout(() => {
																setIsInternalUpdate(false);
															}, 0);
														}}
														className={iconButtonClassName}
														type="button"
													>
														<Trash className="size-4 text-muted-foreground" />
													</button>
												</>
											)}
										</>
									)}
								</div>
							)}
						</div>
					</PopoverButton>
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
										onChange={handleColorChange}
										key={color ? `color-picker-${color}` : 'color-picker-default'}
									/>
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
				<div className={cn(controlGroupRecipe, 'h-9 cursor-pointer gap-2 px-2.5')}>
					<span
						className="block size-4 rounded-full hairline-ring ring-foreground/10"
						style={{ backgroundColor: color || '#000' }}
					/>
					<span className="text-sm text-foreground">{color || 'Color'}</span>
				</div>
			</PopoverTrigger>
			<PopoverContent align="end" side="bottom" className="w-fit p-3">
				{/* @ts-ignore */}
				<HexColorPicker className="relative h-10" color={color || undefined} onChange={handleColorChange} />
			</PopoverContent>
		</PopoverDropdown>
	);
};
