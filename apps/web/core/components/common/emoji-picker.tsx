import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import { getEmojiDataFromNative } from 'emoji-mart';
import { useTheme } from 'next-themes';
import { Popover, PopoverButton, PopoverPanel, Transition } from '@headlessui/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckSquareOutlineIcon } from 'assets/svg';
import { init } from 'emoji-mart';
import { Edit, Spinner, Trash } from '@/core/components/icons';
import { cn } from '@/core/lib/helpers';
import { buttonVariants } from '@/core/components/duplicated-components/_button';
import { controlGroupRecipe } from './input';

const iconButtonClassName = buttonVariants({ variant: 'ghost', size: 'icon-sm' });

// init has to be called on page load to load the emojis, otherwise it won't show it in Picker
init({ data });

export const EmojiPicker = ({
	emoji,
	onChange,
	isTeamManager,
	disabled: disableButton,
	onSave
}: {
	emoji: string | null;
	onChange: (emoji: string) => void;
	isTeamManager: boolean;
	disabled?: boolean;
	onSave?: (data?: Record<string, any>) => Promise<void>;
}) => {
	const { theme } = useTheme();

	const [value, setValue] = useState<any>();
	const buttonRef = useRef<HTMLButtonElement>(null);
	const panelRef = useRef<HTMLDivElement>(null);
	const [disabled, setDisabled] = useState<boolean>(true);
	const [loading, setLoading] = useState(false);

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

	return (
		<Popover className="relative border-none no-underline w-full mt-3">
			{({ open }) => (
				<>
					<PopoverButton
						className="outline-none mb-[15px] w-full"
						ref={buttonRef}
						disabled={disableButton}
						onClick={toggleDisabled}
						as="div"
					>
						<div
							className={cn(
								controlGroupRecipe,
								'relative h-9 justify-between',
								disabled && 'bg-muted/50'
							)}
						>
							<div className="flex gap-2 items-center pl-2.5">
								<div className="text-sm text-foreground">
									{value?.native} {value?.name}
								</div>
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
														onClick={() => {
															setValue(null);
															onChange('');
														}}
														type="button"
														className={iconButtonClassName}
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
						<PopoverPanel
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
						</PopoverPanel>
					</Transition>
				</>
			)}
		</Popover>
	);
};
