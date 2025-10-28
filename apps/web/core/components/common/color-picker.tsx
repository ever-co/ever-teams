'use client';

import { useCallbackRef, useOrganizationTeams } from '@/core/hooks';
import { useState, useRef, useCallback } from 'react';
import { HexColorPicker } from 'react-colorful';
import { CheckSquareOutlineIcon, EditPenUnderlineIcon, TrashIcon } from 'assets/svg';
import { LoaderCircle } from 'lucide-react';
import { useAtomValue } from 'jotai';
import { activeTeamState } from '@/core/stores';
import { toast } from 'sonner';
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';

export const ColorPicker = ({
	defaultColor,
	onChange,
	fullWidthInput,
	isTeamManager,
	disabled: disableButton,
	className
}: {
	defaultColor?: string;
	onChange?: (color?: string | undefined) => void;
	fullWidthInput?: boolean;
	isTeamManager?: boolean;
	disabled?: boolean;
	className?: string;
}) => {
	const [color, setColor] = useState<string | undefined>(defaultColor);
	const onChangeRef = useCallbackRef(onChange);
	const activeTeam = useAtomValue(activeTeamState);
	const { editOrganizationTeam, editOrganizationTeamLoading } = useOrganizationTeams();

	// Handle internal color changes and notify parent
	const handleColorChange = useCallback(
		(newColor: string) => {
			setColor(newColor);

			// Notify parent of change
			if (onChangeRef.current) {
				onChangeRef.current(newColor);
			}
		},
		[onChangeRef]
	);

	const updateTeamColor = useCallback(async () => {
		try {
			if (!color || color === activeTeam?.color) return;
			await editOrganizationTeam({
				id: activeTeam?.id,
				color
			});

			toast.success('Team color updated successfully');
		} catch (error) {
			console.error('Team color update failed:', error);
			toast.error('Failed to update team color. Please try again.');
		}
	}, [editOrganizationTeam, activeTeam?.id, color]);

	const removeTeamColor = useCallback(async () => {
		try {
			if (!color) return;

			if (onChangeRef.current) {
				onChangeRef.current(undefined);
			}

			await editOrganizationTeam({
				id: activeTeam?.id,
				color: null
			});

			setColor(undefined);

			toast.success('Team color removed successfully');
		} catch (error) {
			console.error('Team color removal failed:', error);
			toast.error('Failed to remove team color. Please try again.');
		}
	}, [editOrganizationTeam, activeTeam?.id, color]);

	// return fullWidthInput ? (
	// 	<Popover
	// 		className={'z-[1000] relative border-none no-underline w-full mt-3' + className}
	// 		onProgressCapture={(e) => e.stopPropagation()}
	// 	>
	// 		{({ open, close }) => (
	// 			<>
	// 				<PopoverButton
	// 					className={'w-full outline-none mb-[15px]'}
	// 					ref={buttonRef}
	// 					disabled={disableButton}
	// 					onClick={toggleDisabled}
	// 					as="div"
	// 				>
	// 					<div
	// 						className={`relative w-[100%] h-[48px] border rounded-[10px] flex items-center justify-between input-border ${
	// 							disabled || disableButton ? 'bg-[#FCFCFC]' : 'bg-light--theme-light'
	// 						}  dark:bg-dark--theme-light`}
	// 					>
	// 						<div className={`flex items-center gap-[8px] h-[40px] pl-[15px]`}>
	// 							<div
	// 								className={`w-5 h-5 rounded-xl`}
	// 								style={{
	// 									backgroundColor: color || undefined
	// 								}}
	// 							></div>
	// 							<div className="uppercase dark:text-white">{color || ''}</div>
	// 						</div>
	// 						{isTeamManager && (
	// 							<div className="flex mr-[0.5rem] gap-3">
	// 								<button
	// 									disabled={!isTeamManager}
	// 									className={`z-50 outline-none`}
	// 									onClick={() => {
	// 										setDisabled(!disabled);
	// 									}}
	// 								>
	// 									{open ? (
	// 										editOrganizationTeamLoading ? (
	// 											<LoaderCircle
	// 												className="w-[18px] h-[18px] animate-spin"
	// 												strokeWidth="1.4"
	// 											/>
	// 										) : (
	// 											<CheckSquareOutlineIcon
	// 												className="w-[18px] h-[18px]"
	// 												strokeWidth="1.4"
	// 												onClick={async () => {
	// 													await updateTeamColor();
	// 													close();
	// 												}}
	// 											/>
	// 										)
	// 									) : (
	// 										<EditPenUnderlineIcon className="w-6 h-6 cursor-pointer" />
	// 									)}
	// 								</button>

	// 								<span
	// 									onClick={removeTeamColor}
	// 									className={`outline-none ${'cursor-pointer'}`}
	// 								>
	// 									<TrashIcon className="w-5" />
	// 								</span>
	// 							</div>
	// 						)}
	// 					</div>
	// 				</PopoverButton>
	// 				<Transition
	// 					as="div"
	// 					enter="transition ease-out duration-200"
	// 					enterFrom="opacity-0 translate-y-1"
	// 					enterTo="opacity-100 translate-y-0"
	// 					leave="transition ease-in duration-150"
	// 					leaveFrom="opacity-100 translate-y-0"
	// 					leaveTo="opacity-0 translate-y-1"
	// 					show={!disabled}
	// 				>
	// 					<PopoverDropdown>
	// 						<PopoverTrigger asChild>
	// 							<div className="h-10">
	// 								{/* @ts-ignore */}
	// 								<HexColorPicker
	// 									color={color || undefined}
	// 									onChange={handleColorChange}
	// 									key={color ? `color-picker-${color}` : 'color-picker-default'}
	// 								/>{' '}
	// 								as unknown as JSX.Element
	// 							</div>
	// 						</PopoverTrigger>
	// 					</PopoverDropdown>
	// 				</Transition>
	// 			</>
	// 		)}
	// 	</Popover>
	// ) : (
	// 	<PopoverDropdown>
	// 		<PopoverTrigger asChild>
	// 			<div className="flex items-center px-2 space-x-2 h-14 rounded-xl cursor-pointer dark:bg-dark--theme-light input-border">
	// 				<span className="block w-5 h-5 rounded-full" style={{ backgroundColor: color || '#000' }} />
	// 				<span className="font-normal">{color || 'Color'}</span>
	// 			</div>
	// 		</PopoverTrigger>
	// 		<PopoverContent align="end" side="bottom" className="w-fit dark:bg-dark--theme-light input-border">
	// 			{/* @ts-ignore */}
	// 			<HexColorPicker className="relative h-10" color={color || undefined} onChange={handleColorChange} />
	// 		</PopoverContent>
	// 	</PopoverDropdown>
	// );

	return (
		<div
			className={`group px-3 relative w-[100%] h-[48px] border rounded-[10px] flex gap-1 items-center justify-between input-border  dark:bg-dark--theme-light`}
		>
			<span className="w-[5rem] shrink-0 text-left ">{color || 'Color'}</span>
			{isTeamManager ? (
				<Popover className="group grow">
					{({ open, close }) => (
						<>
							<PopoverButton className="w-full flex items-center gap-2 justify-between h-full outline-none">
								{open ? (
									<div className="grow h-full flex items-center justify-end gap-2">
										{editOrganizationTeamLoading ? (
											<LoaderCircle
												className="w-[18px] h-[18px] animate-spin"
												strokeWidth="1.4"
											/>
										) : (
											<CheckSquareOutlineIcon
												className="w-[18px] h-[18px]"
												strokeWidth="1.4"
												onClick={async (e) => {
													e.stopPropagation();
													await updateTeamColor();
													close();
												}}
											/>
										)}
									</div>
								) : (
									<div className="grow h-full flex items-center  justify-end gap-2">
										<EditPenUnderlineIcon className="w-6 h-6 cursor-pointer" />
										{!open && color ? (
											editOrganizationTeamLoading ? (
												<LoaderCircle
													className="w-[18px] h-[18px] animate-spin"
													strokeWidth="1.4"
												/>
											) : (
												<TrashIcon
													className="w-5 cursor-pointer"
													onClick={async (e) => {
														e.stopPropagation();
														await removeTeamColor();
													}}
												/>
											)
										) : null}
									</div>
								)}
							</PopoverButton>
							<PopoverPanel anchor="bottom end" className="h-[14rem] w-[13rem] mt-5">
								<HexColorPicker
									color={color || undefined}
									onChange={handleColorChange}
									key={color ? `color-picker-${color}` : 'color-picker-default'}
								/>
							</PopoverPanel>
						</>
					)}
				</Popover>
			) : null}
		</div>
	);
};
