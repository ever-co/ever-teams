import { Popover, PopoverContent, PopoverTrigger } from '@components/ui/popover';
import React from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@components/ui/button';
import { SettingFilterIcon } from '@/assets/svg';
import { MultiSelect } from '@/lib/components/custom-select';
import { cn } from '@/lib/utils';
import { useOrganizationAndTeamManagers } from '@/app/hooks/features/useOrganizationTeamManagers';
import { useTimelogFilterOptions } from '@/app/hooks';

export const TeamDashboardFilter = React.memo(function TeamDashboardFilter() {
	const t = useTranslations();
	const { userManagedTeams } = useOrganizationAndTeamManagers();
	const { allteamsState, setAllTeamsState, alluserState, setAllUserState } = useTimelogFilterOptions();
	const [shouldRemoveItems, setShouldRemoveItems] = React.useState(false);
	React.useEffect(() => {
		if (shouldRemoveItems) {
			setShouldRemoveItems(false);
		}
	}, [shouldRemoveItems]);

	const totalFilteredItems = React.useMemo(() => {
		let total = 0;
		if (allteamsState?.length) total += allteamsState.length;
		total += allteamsState?.reduce((acc, team) => acc + (team.members?.length || 0), 0) || 0;
		return total;
	}, [allteamsState]);

	return (
		<div>
			<Popover modal>
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
				<PopoverContent className="w-96">
					<div className="flex flex-col w-full">
						<div className="flex gap-2 mb-3 text-xl font-bold">
							<SettingFilterIcon className="w-4 text-gray-700 dark:text-white" strokeWidth="1.8" />
							<span className="text-gray-700 dark:text-white">{t('common.FILTER')}</span>
						</div>
						<div className="grid gap-5">
							<div className="">
								<label className="flex justify-between mb-1 text-sm text-gray-600">
									<span className="text-[12px]">{t('manualTime.TEAM')}</span>
									<span
										className={cn(
											'text-primary/10',
											allteamsState.length > 0 && 'text-primary dark:text-primary-light'
										)}
									>
										{t('common.CLEAR')}
									</span>
								</label>
								<MultiSelect
									localStorageKey="timesheet-select-filter-employee"
									removeItems={shouldRemoveItems}
									items={userManagedTeams ?? []}
									itemToString={(team) => team?.name ?? ''}
									itemId={(item) => item.id}
									onValueChange={(selectedItems) => setAllTeamsState(selectedItems as any)}
									multiSelect={true}
									triggerClassName="dark:border-gray-700"
								/>
							</div>

							<div className="">
								<label className="flex justify-between mb-1 text-sm text-gray-600">
									<span className="text-[12px]">{t('manualTime.EMPLOYEE')}</span>
									<span
										className={cn(
											'text-primary/10',
											alluserState.length > 0 && 'text-primary dark:text-primary-light'
										)}
									>
										{t('common.CLEAR')}
									</span>
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
								/>
							</div>

							<div className="flex gap-x-4 justify-end items-center w-full">
								<Button
									onClick={() => setShouldRemoveItems(true)}
									variant={'outline'}
									className="flex justify-center items-center h-10 text-sm rounded-lg dark:text-gray-300"
								>
									<span className="text-sm">{t('common.CLEAR_FILTER')}</span>
								</Button>
								<Button className="flex justify-center items-center h-10 text-sm rounded-lg bg-primary dark:bg-primary-light dark:text-gray-300">
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
