import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import { getEmojiDataFromNative } from 'emoji-mart';
import { useTheme } from 'next-themes';
import { Popover, Transition } from '@headlessui/react';
import { Fragment, useEffect, useRef, useState } from 'react';
import { Edit2Icon, TrashIcon } from './svgs';
import { init } from 'emoji-mart';

// init has to be called on page load to load the emojis, otherwise it won't show it in Picker
init({ data });

export const EmojiPicker = ({
	emoji,
	onChange,
	isTeamManager,
}: {
	emoji: string | null;
	onChange: (emoji: string) => void;
	isTeamManager: boolean;
}) => {
	const { theme } = useTheme();

	const [value, setValue] = useState<any>();
	const buttonRef = useRef<any>();

	useEffect(() => {
		getEmojiDataFromNative(emoji).then((item) => {
			setValue(item);
		});
	}, [emoji]);

	return (
		<Popover className="relative border-none no-underline w-full mt-3">
			{() => (
				<>
					<Popover.Button
						className="outline-none mb-[15px] w-full"
						ref={buttonRef}
						disabled={!isTeamManager}
					>
						<div
							className={`${
								isTeamManager ? 'cursor-pointer' : ''
							} relative w-[100%] h-[48px] ${
								!isTeamManager ? 'bg-[#FCFCFC]' : ''
							} bg-light--theme-light dark:bg-dark--theme-light border rounded-[10px] flex items-center justify-between input-border`}
						>
							<div className="flex gap-[8px] h-[40px]  items-center pl-[15px]">
								<div className="font-medium">
									{value?.native} {value?.name}
								</div>
							</div>
							<div className="flex mr-[0.5rem] gap-3">
								<Edit2Icon />
								<TrashIcon />
							</div>
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
					>
						<Popover.Panel className="absolute left-1/2 z-10 mt-0 w-[354px] max-w-sm -translate-x-1/2 transform  sm:px-0 lg:max-w-3xl shandow ">
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
							/>
						</Popover.Panel>
					</Transition>
				</>
			)}
		</Popover>
	);
};
