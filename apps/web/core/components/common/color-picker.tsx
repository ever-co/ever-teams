'use client';

import { useCallbackRef, useOrganizationTeams } from '@/core/hooks';
import { useState, useCallback } from 'react';
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
	disabled,
}: {
	defaultColor?: string;
	onChange?: (color?: string | undefined) => void;
	disabled?: boolean;
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

	return (
		<div
			className={`group px-3 relative w-[100%] h-[48px] border rounded-[10px] flex gap-1 items-center justify-between input-border  dark:bg-dark--theme-light`}
		>
			<span className="w-[5rem] shrink-0 text-left ">{color || 'Color'}</span>
			{!disabled ? (
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
