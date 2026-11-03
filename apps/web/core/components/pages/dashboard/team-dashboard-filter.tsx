import { Popover, PopoverContent, PopoverTrigger } from '@/core/components/common/popover';
import React from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/core/components/duplicated-components/_button';
import { Filter } from '@/core/components/icons';

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

		// Trigger data refetch via callback to parent component
		// This will cause React Query to refetch with the new filter values
		onFiltersApply?.();
	}, [onFiltersApply, totalFilteredItems, t]);

	return (
		<div>
			<Popover modal open={isOpen} onOpenChange={setIsOpen}>
				<PopoverTrigger asChild>
					<Button variant="outline" size="default">
						<Filter className="text-muted-foreground" />
						<span>{t('common.FILTER')}</span>
						{totalFilteredItems > 0 && (
							<span
								role="status"
								aria-label={`${totalFilteredItems} items filtered`}
								className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/10 px-1.5 text-[11px] font-medium tabular-nums text-primary-ink"
							>
								{totalFilteredItems > 100 ? '100+' : totalFilteredItems}
							</span>
						)}
					</Button>
				</PopoverTrigger>
				<PopoverContent className="w-96">
					<div className="flex flex-col w-full">
						<div className="flex items-center gap-2 mb-3 text-sm font-semibold">
							<Filter className="size-4 text-muted-foreground" />
							<span>{t('common.FILTER')}</span>
						</div>
						<div className="grid gap-5">
							<div className="">
								<label className="flex items-center justify-between mb-1.5 text-xs font-medium text-muted-foreground">
									<div className="flex gap-2 items-center">
										<span>{t('manualTime.TEAM')}</span>
										{allteamsState.length > 0 && (
											<span className="text-[11px] px-1.5 py-0.5 rounded-full bg-primary/10 tabular-nums text-primary-ink">
												{allteamsState.length}
											</span>
										)}
									</div>
									{allteamsState.length > 0 && (
										<button
											onClick={() => setAllTeamsState([])}
											className="rounded-sm text-xs text-primary-ink underline-offset-4 hover:underline cursor-pointer"
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
									value={allteamsState as any}
								/>
							</div>

							{isManage && (
								<div className="">
									<label className="flex items-center justify-between mb-1.5 text-xs font-medium text-muted-foreground">
										<div className="flex gap-2 items-center">
											<span>{t('manualTime.EMPLOYEE')}</span>
											{alluserState.length > 0 && (
												<span className="text-[11px] px-1.5 py-0.5 rounded-full bg-primary/10 tabular-nums text-primary-ink">
													{alluserState.length}
												</span>
											)}
										</div>
										{alluserState.length > 0 && (
											<button
												onClick={() => setAllUserState([])}
												className="rounded-sm text-xs text-primary-ink underline-offset-4 hover:underline cursor-pointer"
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
										value={alluserState as any}
									/>
								</div>
							)}

							<div className="flex gap-x-2 justify-end items-center w-full">
								<Button
									onClick={() => {
										setAllTeamsState([]);
										setAllUserState([]);
									}}
									variant={'outline'}
									size="lg"
								>
									<span>{t('common.CLEAR_FILTER')}</span>
								</Button>
								<Button onClick={applyFilters} size="lg">
									<span>{t('common.APPLY_FILTER')}</span>
								</Button>
							</div>
						</div>
					</div>
				</PopoverContent>
			</Popover>
		</div>
	);
});
