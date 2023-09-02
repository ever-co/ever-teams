import { Popover, Transition } from '@headlessui/react';
import { Button } from 'lib/components';
import { Edit2Icon } from 'lib/components/svgs';
import { Fragment, useCallback, useEffect, useRef, useState } from 'react';

const sizeOption = [
	{
		name: 'Only me',
	},
	{
		name: '2 - 5',
	},
	{
		name: '6 - 20',
	},
	{
		name: '21 - 100',
	},
	{
		name: '100+',
	},
];
const TeamSize = ({
	defaultValue,
	onChange,
	isTeamManager,
}: {
	defaultValue: string;
	onChange: (teamSize: string) => void;
	isTeamManager: boolean;
}) => {
	const [value, setValue] = useState(defaultValue || 'Only me');
	const buttonRef = useRef<HTMLButtonElement>(null);
	const panelRef = useRef<HTMLDivElement>(null);
	const [disabled, setDisabled] = useState<boolean>(true);

	const onSelect = (value: any) => {
		setValue(value);
	};
	// const Close = () => {
	// 	setValue('');
	// 	buttonRef.current?.click();
	// };

	const handleSave = useCallback(() => {
		onChange(value);
		setDisabled(true);
	}, [value, onChange]);

	useEffect(() => {
		setValue(defaultValue);
	}, [defaultValue]);

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				panelRef.current &&
				!panelRef.current.contains(event.target as Node)
			) {
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
		<Popover className="relative border-none no-underline w-full">
			{() => (
				<>
					<Popover.Button
						className="outline-none mb-[15px] w-full"
						ref={buttonRef}
						disabled={disabled}
						onClick={() => setDisabled(true)}
					>
						<div
							className={`relative w-[100%] h-[48px] ${
								disabled ? 'bg-[#FCFCFC]' : ''
							} bg-light--theme-light dark:bg-dark--theme-light border rounded-[10px] flex items-center justify-between input-border`}
						>
							<div className="flex gap-[8px] h-[40px] items-center pl-[15px]">
								<div className="dark:text-white">{defaultValue}</div>
							</div>
							{isTeamManager && (
								<button
									className={`flex mr-[0.5rem] gap-3 outline-none ${
										!isTeamManager && 'pointer-events-none'
									}`}
									disabled={!isTeamManager}
									onClick={() => {
										setDisabled(!disabled);
									}}
								>
									<Edit2Icon />
								</button>
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
							<div className="bg-white shadow rounded-xl text-[14px] font-light p-[16px] dark:bg-[#1B1D22] dark:border dark:border-[#FFFFFF33] flex flex-col gap-4">
								<div className="text-lg text-[#7E7991] dark:text-gray-400 font-[500]">
									Select Team Size
								</div>
								{/* Divider */}
								<div className="h-[0.0625rem] bg-[#E5E5E5] dark:bg-[#FFFFFF14]"></div>

								<div className="flex flex-col  hover:cursor-pointer">
									{sizeOption.map((size, index) => {
										return (
											<div
												key={index}
												className={`flex gap-3 items-center rounded-sm p-2 ${
													size.name === value &&
													'bg-primary dark:bg-primary-light'
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

								<div className="flex items-center space-x-2 justify-end">
									<Button
										variant="primary"
										className="font-normal rounded-xl text-md min-w-[90px] bg-[#E6E6E9] text-[#1A1C1E]"
										type="submit"
										style={{ background: '#E6E6E9' }}
										onClick={handleClose}
									>
										Cancel
									</Button>
									<Button
										variant="primary"
										className="font-normal rounded-xl text-sm min-w-[90px] h-[48px]"
										type="submit"
										onClick={handleSave}
									>
										Save
									</Button>
								</div>
							</div>
						</Popover.Panel>
					</Transition>
				</>
			)}
		</Popover>
	);
};

export default TeamSize;
