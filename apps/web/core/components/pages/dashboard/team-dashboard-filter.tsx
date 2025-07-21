import { Popover, PopoverContent, PopoverTrigger } from '@/core/components/common/popover';
import React from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/core/components/duplicated-components/_button';
import { SettingFilterIcon } from '@/assets/svg';

import { useOrganizationAndTeamManagers } from '@/core/hooks/organizations/teams/use-organization-teams-managers';
import { useTimelogFilterOptions } from '@/core/hooks';
import { MultiSelect } from '../../common/multi-select';
interface TeamDashboardFilterProps {
	isManage?: boolean | null;
	onFiltersApply?: () => void;
}
export const TeamDashboardFilter = React.memo(function TeamDashboardFilter({
	isManage,
	onFiltersApply
}: TeamDashboardFilterProps) {
	const t = useTranslations();
	const { userManagedTeams } = useOrganizationAndTeamManagers();
	const { allteamsState, setAllTeamsState, alluserState, setAllUserState } = useTimelogFilterOptions();
	const [isOpen, setIsOpen] = React.useState(false);

	const totalFilteredItems = React.useMemo(() => {
		let total = 0;
		// Count selected teams
		if (allteamsState?.length) total += allteamsState.length;
		// Count selected employees (only if manager)
		if (isManage && alluserState?.length) total += alluserState.length;
		return total;
	}, [allteamsState, alluserState, isManage]);

	// Apply filters function - triggers data refetch and closes popover
	const applyFilters = React.useCallback(() => {
		// Close the popover
		setIsOpen(false);

		// Show success feedback
		const filterCount = totalFilteredItems;

		// Trigger data refetch via callback to parent component
		// This will cause React Query to refetch with the new filter values
		onFiltersApply?.();
	}, [onFiltersApply, totalFilteredItems, t]);

	return (
		<div>
			<Popover modal open={isOpen} onOpenChange={setIsOpen}>
				<PopoverTrigger asChild>
					<Button
						variant="outline"
						className="flex items-center justify-center  h-[2.2rem] rounded-lg bg-white dark:bg-dark--theme-light border dark:border-gray-700 hover:bg-white p-3 gap-2"
					>
						<SettingFilterIcon className="text-gray-700 dark:text-white w-3.5" strokeWidth="1.8" />
						<span className="text-gray-700 dark:text-white">{t('common.FILTER')}</span>
						{totalFilteredItems > 0 && (
							<span
								role="status"
								aria-label={`${totalFilteredItems} items filtered`}
								className="rounded-full bg-primary dark:bg-primary-light h-7 w-7 flex items-center justify-center text-white text-center text-[12px]"
							>
								{totalFilteredItems > 100 ? '100+' : totalFilteredItems}
							</span>
						)}
					</Button>
				</PopoverTrigger>
				<PopoverContent className="w-96 dark:bg-dark--theme-light">
					<div className="flex flex-col w-full">
						<div className="flex gap-2 mb-3 text-xl font-bold">
							<SettingFilterIcon className="w-4 text-gray-700 dark:text-white" strokeWidth="1.8" />
							<span className="text-gray-700 dark:text-white">{t('common.FILTER')}</span>
						</div>
						<div className="grid gap-5">
							<div className="">
								<label className="flex justify-between mb-1 text-sm text-gray-600">
									<div className="flex gap-2 items-center">
										<span className="text-[12px]">{t('manualTime.TEAM')}</span>
										{allteamsState.length > 0 && (
											<span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary dark:text-primary-light">
												{allteamsState.length}
											</span>
										)}
									</div>
									{allteamsState.length > 0 && (
										<button
											onClick={() => setAllTeamsState([])}
											className="text-primary dark:text-primary-light hover:opacity-80 cursor-pointer text-[12px]"
										>
											{t('common.CLEAR')}
										</button>
									)}
								</label>
								<MultiSelect
									items={userManagedTeams ?? []}
									itemToString={(team) => team?.name ?? ''}
									itemId={(item) => item.id}
									onValueChange={(selectedItems) => setAllTeamsState(selectedItems as any)}
									multiSelect
									triggerClassName="dark:border-gray-700"
									value={allteamsState as any}
								/>
							</div>

							{isManage && (
								<div className="">
									<label className="flex justify-between mb-1 text-sm text-gray-600">
										<div className="flex gap-2 items-center">
											<span className="text-[12px]">{t('manualTime.EMPLOYEE')}</span>
											{alluserState.length > 0 && (
												<span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary dark:text-primary-light">
													{alluserState.length}
												</span>
											)}
										</div>
										{alluserState.length > 0 && (
											<button
												onClick={() => setAllUserState([])}
												className="text-primary dark:text-primary-light hover:opacity-80 cursor-pointer text-[12px]"
											>
												{t('common.CLEAR')}
											</button>
										)}
									</label>
									<MultiSelect
										items={allteamsState.flatMap((team) => {
											const members = team.members ?? [];
											return members.filter((member) => member && member.employee);
										})}
										itemToString={(member) => {
											if (!member?.employee) return '';
											return member.employee.fullName || t('manualTime.EMPLOYEE');
										}}
										itemId={(item) => item.id}
										onValueChange={(selectedItems) => setAllUserState(selectedItems as any)}
										multiSelect={true}
										triggerClassName="dark:border-gray-700"
										value={alluserState as any}
									/>
								</div>
							)}

							<div className="flex gap-x-4 justify-end items-center w-full">
								<Button
									onClick={() => {
										setAllTeamsState([]);
										setAllUserState([]);
									}}
									variant={'outline'}
									className="flex justify-center items-center h-10 text-sm rounded-lg dark:text-gray-300"
								>
									<span className="text-sm">{t('common.CLEAR_FILTER')}</span>
								</Button>
								<Button
									onClick={applyFilters}
									className="flex justify-center items-center h-10 text-sm rounded-lg bg-primary dark:bg-primary-light dark:text-gray-300"
								>
									<span className="text-sm">{t('common.APPLY_FILTER')}</span>
								</Button>
							</div>
						</div>
					</div>
				</PopoverContent>
			</Popover>
		</div>
	);
});
