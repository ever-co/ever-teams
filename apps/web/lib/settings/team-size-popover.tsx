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

	return (
		<Popover className="relative border-none no-underline w-full">
			{() => (
				<>
					<Popover.Button
						className="outline-none mb-[15px] w-full"
						ref={buttonRef}
						disabled={disabled}
					>
						<div
							className={`relative w-[100%] h-[48px] ${
								disabled ? 'bg-[#FCFCFC]' : ''
							} bg-light--theme-light dark:bg-dark--theme-light border rounded-[10px] flex items-center justify-between input-border`}
						>
							<div className="flex gap-[8px] h-[40px] items-center pl-[15px]">
								<div className="text-[16px] font-medium">{value}</div>
							</div>
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
							<div className="bg-white shadow dark:bg-[#202023] rounded-[10px] text-[14px] font-light p-[16px]">
								<div className="text-[18px] text-[#7E7991] font-[500]">
									Select Team Size
								</div>
								<div className="bg-[#EDEEF2] h-[1px] w-full mt-[10px]"></div>
								<div className="mt-[10px]">
									<div className="flex flex-col gap-y-[15px] hover:cursor-pointer">
										{sizeOption.map((size, index) => {
											return (
												<div
													key={index}
													className="flex gap-[10px] items-center pl-[15px]"
													style={{ gap: 15 }}
													onClick={() => onSelect(size.name)}
												>
													<div className="text-[16px]  font-[600]">
														{size.name}
													</div>
												</div>
											);
										})}
									</div>
								</div>
								<div className="bg-[#EDEEF2] mt-[10px] h-[1px] w-full"></div>
								<div className="mt-[10px] pt-[5px]">
									<div className="flex items-center space-x-2 justify-end">
										<Button
											variant="primary"
											className="font-normal rounded-xl text-md min-w-[90px] bg-[#E6E6E9] text-[#1A1C1E]"
											type="submit"
											style={{ background: '#E6E6E9' }}
											onClick={() => setDisabled(true)}
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
							</div>
						</Popover.Panel>
					</Transition>
				</>
			)}
		</Popover>
	);
};

export default TeamSize;
