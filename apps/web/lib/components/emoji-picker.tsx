import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import { getEmojiDataFromNative } from 'emoji-mart';
import { useTheme } from 'next-themes';
import { Popover, Transition } from '@headlessui/react';
import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { Edit2Icon, TrashIcon } from './svgs';
import { init } from 'emoji-mart';

// init has to be called on page load to load the emojis, otherwise it won't show it in Picker
init({ data });

export const EmojiPicker = ({
	emoji,
	onChange,
	isTeamManager,
	disabled: disableButton
}: {
	emoji: string | null;
	onChange: (emoji: string) => void;
	isTeamManager: boolean;
	disabled?: boolean;
}) => {
	const { theme } = useTheme();

	const [value, setValue] = useState<any>();
	const buttonRef = useRef<HTMLButtonElement>(null);
	const panelRef = useRef<HTMLDivElement>(null);
	const [disabled, setDisabled] = useState<boolean>(true);

	const toggleDisabled = useCallback(() => {
		setDisabled(!disabled);
	}, [disabled]);

	useEffect(() => {
		getEmojiDataFromNative(emoji).then((item) => {
			setValue(item);
		});
	}, [emoji]);

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

	return (
		<Popover className="relative border-none no-underline w-full mt-3">
			{() => (
				<>
					<Popover.Button
						className="outline-none mb-[15px] w-full"
						ref={buttonRef}
						disabled={disableButton}
						onClick={toggleDisabled}
					>
						<div
							className={` relative w-[100%] h-[48px] ${
								disabled ? 'bg-[#FCFCFC]' : 'bg-light--theme-light'
							}  dark:bg-dark--theme-light border rounded-[10px] flex items-center justify-between input-border`}
						>
							<div className="flex gap-[8px] h-[40px]  items-center pl-[15px]">
								<div className="dark:text-white">
									{value?.native} {value?.name}
								</div>
							</div>
							{isTeamManager && (
								<div className="flex mr-[0.5rem] gap-3">
									<button
										disabled={!isTeamManager}
										className={`outline-none ${!isTeamManager && 'pointer-events-none'}`}
										onClick={() => {
											setDisabled(!disabled);
										}}
									>
										<Edit2Icon className="cursor-pointer" />
									</button>
									<button
										onClick={() => {
											setValue(null);
											onChange('');
										}}
										className={`outline-none ${!isTeamManager && 'pointer-events-none'}`}
									>
										<TrashIcon />
									</button>
								</div>
							)}
						</div>
					</Popover.Button>
					<Transition
						as={Fragment}
						enter="transition ease-out duration-200"
						enterFrom="opacity-0 translate-y-1"
						enterTo="opacity-100 translate-y-0"
						leave="transition ease-in duration-150"
						leaveFrom="opacity-100 translate-y-0"
						leaveTo="opacity-0 translate-y-1"
						show={!disabled}
					>
						<Popover.Panel
							ref={panelRef}
							className="absolute left-1/2 z-10 mt-0 w-[354px] max-w-sm -translate-x-1/2 transform  sm:px-0 lg:max-w-3xl shandow "
						>
							<Picker
								data={data}
								onEmojiSelect={(emoji: any) => {
									setValue(emoji);
									onChange(emoji.native);
									setDisabled(true);
								}}
								theme={theme}
								skinTonePosition={'none'}
								maxFrequentRows={1}
								autoFocus
							/>
						</Popover.Panel>
					</Transition>
				</>
			)}
		</Popover>
	);
};
