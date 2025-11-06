import { Popover, PopoverButton, PopoverPanel, Transition } from '@headlessui/react';
import { Button } from '@/core/components';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { EditPenUnderlineIcon } from 'assets/svg';
import { sizeOption } from '@/core/constants/config/constants';
import { LoaderCircle } from 'lucide-react';

const TeamSize = ({
	defaultValue,
	onChange,
	isTeamManager,
	disabled: disableButton,
	onSave
}: {
	defaultValue: string;
	onChange: (teamSize: string) => void;
	isTeamManager: boolean;
	disabled?: boolean;
	onSave? : (data? : Record<string, any>) => Promise<void>
}) => {
	const t = useTranslations();
	const [value, setValue] = useState(defaultValue || 'Only me');
	const buttonRef = useRef<HTMLButtonElement>(null);
	const panelRef = useRef<HTMLDivElement>(null);
	const [disabled, setDisabled] = useState<boolean>(true);
	const [loading, setLoading] = useState(false)

	const toggleDisabled = useCallback(() => {
		setDisabled(!disabled);
	}, [disabled]);

	const onSelect = (value: any) => {
		setValue(value);
		onChange(value);
	};
	// const Close = () => {
	// 	setValue('');
	// 	buttonRef.current?.click();
	// };

	const handleSave = useCallback(async () => {
		setLoading(true);
		try {
			await onSave?.();
		} catch (error) {
			console.error('Error saving team size:', error);
		} finally {
		setLoading(false);
		}
		setDisabled(true);
	}, [value, onChange, onSave]);

	useEffect(() => {
		setValue(defaultValue);
	}, [defaultValue]);

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

	const handleClose = useCallback(() => {
		onChange(defaultValue);
		setValue(defaultValue);
		setDisabled(true);
	}, [defaultValue, onChange]);

	return (
		<div
			className={`group px-3 relative w-[100%] h-[48px] border rounded-[10px] flex gap-1 items-center justify-between input-border  dark:bg-dark--theme-light ${
				disabled ? 'bg-[#FCFCFC]' : 'bg-light--theme-light'
			}`}
		>
			<span className="w-[5rem] shrink-0 text-left ">{defaultValue}</span>
			<Popover className="group grow">
				{({ close }) => (
					<>
						<PopoverButton className="w-full flex items-center gap-2 justify-end h-full outline-none"
							ref={buttonRef}
							disabled={disableButton}
							onClick={toggleDisabled}
							as="div"
						>
							<div className="flex gap-[8px] h-[40px] items-center pl-[15px]">
								<div className="dark:text-white">{defaultValue}</div>
							</div>
							{isTeamManager && (
								<button
									className={`flex mr-[0.5rem] gap-3 outline-none`}
									disabled={false}
									onClick={() => {
										setDisabled(!disabled);
									}}
								>
									<EditPenUnderlineIcon className="w-6 h-6 text-inherit" />
								</button>
							)}
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
								anchor="bottom end"
								className="mt-5 bg-light--theme-light dark:bg-dark--theme-light border p-3 rounded-xl shadow-xlcard flex flex-col gap-3"
							>
								<div className="text-lg text-[#7E7991] dark:text-gray-400 font-[500]">
									{t('form.SELECT_TEAM_SIZE')}
								</div>
								{/* Divider */}
								<div className="h-[0.0625rem] bg-[#E5E5E5] dark:bg-[#FFFFFF14]"></div>
								<div className="flex flex-col hover:cursor-pointer">
									{sizeOption.map((size, index) => {
										return (
											<div
												key={index}
												className={`flex gap-3 items-center rounded-xl px-5 py-2 ${
													size.name === value && 'bg-primary dark:bg-primary-light'
												}`}
												style={{ gap: 15 }}
												onClick={() => onSelect(size.name)}
											>
												<div
													className={`text-base font-[600] text-[#282048] dark:text-white ${
														size.name === value && '!text-white'
													}`}
												>
													{size.name}
												</div>
											</div>
										);
									})}
								</div>
								{/* Divider */}
								<div className="h-[0.0625rem] bg-[#E5E5E5] dark:bg-[#FFFFFF14]"></div>
								<div className="flex items-center justify-end space-x-2">
									<Button
										variant="primary"
										className="font-normal rounded-xl text-md min-w-[90px] bg-[#E6E6E9] text-[#1A1C1E]"
										type="submit"
										style={{ background: '#E6E6E9' }}
										onClick={handleClose}
										disabled={loading}
									>
										{t('common.CANCEL')}
									</Button>
									<Button
										variant="primary"
										className="font-normal rounded-xl text-sm min-w-[90px] h-[48px]"
										type="submit"
										onClick={handleSave}
										disabled={loading}
									>
										{loading ? <LoaderCircle className="w-[18px] h-[18px] animate-spin" strokeWidth="1.4" /> : t('common.SAVE')}
									</Button>
								</div>
							</PopoverPanel>
						</Transition>
					</>
				)}
			</Popover>
		</div>
	);
};

export default TeamSize;
