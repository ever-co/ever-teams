import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import { getEmojiDataFromNative } from 'emoji-mart';
import { useTheme } from 'next-themes';
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import { useCallback, useEffect, useState } from 'react';
import { CheckSquareOutlineIcon, EditPenUnderlineIcon, TrashIcon } from 'assets/svg';
import { init } from 'emoji-mart';
import { useCallbackRef, useOrganizationTeams } from '@/core/hooks';
import { useAtomValue } from 'jotai';
import { activeTeamState } from '@/core/stores';
import { toast } from 'sonner';
import { LoaderCircle } from 'lucide-react';

// init has to be called on page load to load the emojis, otherwise it won't show it in Picker
init({ data });

export const EmojiPicker = ({
	defaultEmoji,
	onChange,
	disabled
}: {
	defaultEmoji?: string | null;
	onChange: (emoji: string | undefined) => void;
	disabled?: boolean;
}) => {
	const { theme } = useTheme();

	const [value, setValue] = useState<{ id: string; name: string; native: string }>();
	const { editOrganizationTeam, editOrganizationTeamLoading } = useOrganizationTeams();
	const onChangeRef = useCallbackRef(onChange);
	const activeTeam = useAtomValue(activeTeamState);

	useEffect(() => {
		if (!defaultEmoji) {
			setValue(undefined);
			return;
		}
		getEmojiDataFromNative(defaultEmoji).then((item) => setValue(item));
	}, [defaultEmoji]);

	const updateTeamEmoji = useCallback(async () => {
		try {
			if (!value || value.native === activeTeam?.emoji) return;
			await editOrganizationTeam({
				id: activeTeam?.id,
				emoji: value.native
			});

			toast.success('Team emoji updated successfully');
		} catch (error) {
			console.error('Team emoji update failed:', error);
			toast.error('Failed to update team emoji. Please try again.');
		}
	}, [editOrganizationTeam, activeTeam?.id, value?.native]);

	const removeTeamEmoji = useCallback(async () => {
		try {
			if (!value) return;

			if (onChangeRef.current) {
				onChangeRef.current(undefined);
			}

			await editOrganizationTeam({
				id: activeTeam?.id,
				emoji: null
			});

			setValue(undefined);

			toast.success('Team emoji removed successfully');
		} catch (error) {
			console.error('Team emoji removal failed:', error);
			toast.error('Failed to remove team emoji. Please try again.');
		}
	}, [editOrganizationTeam, activeTeam?.id, value?.native]);

	return (
		<div
			className={`group px-3 relative w-[100%] h-[48px] border rounded-[10px] flex gap-1 items-center justify-between input-border  dark:bg-dark--theme-light ${
				disabled ? 'bg-[#FCFCFC]' : 'bg-light--theme-light'
			}`}
		>
			<span className="w-[12rem] shrink-0 text-left truncate ">{value ? `${value?.native} ${value?.name}` : 'Emoji'}</span>
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
													await updateTeamEmoji();
													close();
												}}
											/>
										)}
									</div>
								) : (
									<div className="grow h-full flex items-center  justify-end gap-2">
										<EditPenUnderlineIcon className="w-6 h-6 cursor-pointer" />
										{ value ? (
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
														await removeTeamEmoji();
													}}
												/>
											)
										) : null}
									</div>
								)}
							</PopoverButton>
							<PopoverPanel anchor="bottom" className="shadow-lgcard mt-6">
								<Picker
									data={data}
									onEmojiSelect={(emoji: any) => {
										setValue(emoji);
										onChange(emoji.native);
									}}
									theme={theme}
									skinTonePosition={'none'}
									maxFrequentRows={1}
									autoFocus
									className="h-full overflow-y-hidden"
								/>
							</PopoverPanel>
						</>
					)}
				</Popover>
			) : null}
		</div>
	);
};
