import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import { Button } from '@/core/components';
import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { EditPenUnderlineIcon } from 'assets/svg';
import { sizeOption } from '@/core/constants/config/constants';
import { LoaderCircle } from 'lucide-react';
import { useOrganizationTeams } from '@/core/hooks';
import { toast } from 'sonner';

const TeamSize = ({
	defaultValue,
	onChange,
	disabled
}: {
	defaultValue: string;
	onChange: (teamSize: string) => void;
	disabled?: boolean;
}) => {
	const t = useTranslations();
	const [value, setValue] = useState(defaultValue || 'Only me');
	const { editOrganizationTeamLoading, editOrganizationTeam } = useOrganizationTeams();

	const onSelect = (value: any) => {
		setValue(value);
	};

	const handleSave = useCallback(() => {
		onChange(value);
	}, [value, onChange]);

	useEffect(() => {
		setValue(defaultValue);
	}, [defaultValue]);

	const handleClose = useCallback(() => {
		onChange(defaultValue);
		setValue(defaultValue);
	}, [defaultValue, onChange]);

	const updateTeamSize = useCallback(async () => {
		if (value === defaultValue) return;
		try {
			await editOrganizationTeam({
				teamSize: value
			});
			handleSave();
			toast.success('Team size updated successfully.');
		} catch (error) {
			toast.error('Failed to update team size. Please try again.');
			console.error('Failed to update team size:', error);
		}
	}, [value, editOrganizationTeam]);

	return (
		<div
			className={`group px-3 relative w-[100%] h-[48px] border rounded-[10px] flex gap-1 items-center justify-between input-border  dark:bg-dark--theme-light ${
				disabled ? 'bg-[#FCFCFC]' : 'bg-light--theme-light'
			}`}
		>
			<span className="w-[5rem] shrink-0 text-left ">{defaultValue}</span>
			{!disabled ? (
				<Popover className="group grow">
					{({ close }) => (
						<>
							<PopoverButton className="w-full flex items-center gap-2 justify-between h-full outline-none">
								<EditPenUnderlineIcon className="w-6 h-6 cursor-pointer" />
							</PopoverButton>
							<PopoverPanel
								anchor="bottom end"
								className="mt-5 bg-light--theme-light dark:bg-dark--theme-light border p-3 rounded-xl shadow-xlcard"
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
										onClick={() => {
											handleClose();
											close();
										}}
										disabled={editOrganizationTeamLoading}
									>
										{t('common.CANCEL')}
									</Button>
									<Button
										variant="primary"
										className="font-normal rounded-xl text-sm min-w-[90px] h-[48px]"
										type="submit"
										onClick={async () => {
											await updateTeamSize();
											close();
										}}
										disabled={editOrganizationTeamLoading}
									>
										{editOrganizationTeamLoading ? (
											<LoaderCircle
												className="w-[18px] h-[18px] animate-spin"
												strokeWidth="1.4"
											/>
										) : (
											t('common.SAVE')
										)}
									</Button>
								</div>
							</PopoverPanel>
						</>
					)}
				</Popover>
			) : null}
		</div>
	);
};

export default TeamSize;
