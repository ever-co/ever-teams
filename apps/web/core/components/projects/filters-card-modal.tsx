import { Button, Modal } from '@/core/components';
import { Filter, X } from '@/core/components/icons';
import { useTranslations } from 'next-intl';
import { MultiSelectWithSearch } from '../common/multi-select-with-search';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';

import { EProjectBudgetType } from '@/core/types/generics/enums/project';
import { useAtomValue } from 'jotai';
import { organizationTeamsState } from '@/core/stores';
import { useOrganizationProjectsQuery } from '@/core/hooks/organizations/projects/use-organization-projects-query';
import { useTaskStatusesQuery } from '@/core/hooks/tasks/use-task-statuses-query';
import { dataColorChipStyle, dataColorDotStyle } from '@/core/components/tasks/task-data-color';

function statusChipStyle(color: string | null | undefined) {
	if (!color) {
		return undefined;
	}
	return dataColorChipStyle(color);
}

function statusDotStyle(color: string | null | undefined) {
	if (!color) {
		return undefined;
	}
	return dataColorDotStyle(color);
}

interface IFiltersCardModalProps {
	open: boolean;
	closeModal: () => void;
}

export default function FiltersCardModal({ open, closeModal }: IFiltersCardModalProps) {
	const t = useTranslations();
	const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
	const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
	const [selectedManagers, setSelectedManagers] = useState<string[]>([]);
	const [selectedStatus, setSelectedStatus] = useState<string[]>([]);
	const [selectedBudgetType, setSelectedBudgetType] = useState<string[]>([]);
	const params = useSearchParams();
	const teams = useAtomValue(organizationTeamsState);

	const { organizationProjects } = useOrganizationProjectsQuery();
	const teamMembers = useMemo(
		() => organizationProjects?.flatMap((project) => project.members ?? []),
		[organizationProjects]
	);
	const budgetTypes: {
		value: string;
		id: EProjectBudgetType;
	}[] = useMemo(
		() => [
			{
				value: t('common.COST_BASED'),
				id: EProjectBudgetType.COST
			},
			{
				value: t('common.HOURS_BASED'),
				id: EProjectBudgetType.HOURS
			}
		],
		[t]
	);

	const { taskStatuses } = useTaskStatusesQuery();
	const router = useRouter();
	const statusColorsMap: Map<string | undefined, string | undefined | null> = useMemo(() => {
		return new Map(taskStatuses.map((status) => [status.name, status.color]));
	}, [taskStatuses]);

	const members = useMemo(() => {
		const uniqueMembers = new Map();

		teamMembers
			?.filter((el) => !el?.isManager)
			?.forEach((el) => {
				const id = el?.employeeId;
				if (!uniqueMembers.has(id)) {
					uniqueMembers.set(id, {
						imageUrl: el?.employee?.user?.imageUrl,
						value: el?.employee?.fullName,
						id
					});
				}
			});

		return Array.from(uniqueMembers.values());
	}, [teamMembers]);

	const managers = useMemo(() => {
		const uniqueManagers = new Map();

		teamMembers
			?.filter((el) => el?.isManager)
			?.forEach((el) => {
				const id = el?.employeeId;
				if (!uniqueManagers.has(id)) {
					uniqueManagers.set(id, {
						imageUrl: el?.employee?.user?.imageUrl,
						value: el?.employee?.fullName,
						id
					});
				}
			});

		return Array.from(uniqueManagers.values());
	}, [teamMembers]);

	// Memoize derived data for teams
	const teamOptions = useMemo(
		() =>
			teams.map((team) => ({
				value: team.name,
				id: team.id
			})),
		[teams]
	);

	const selectedTeamOptions = useMemo(
		() =>
			selectedTeams.map((teamId) => ({
				value: teams.find((team) => team.id === teamId)?.name ?? '-',
				id: teamId
			})),
		[selectedTeams, teams]
	);

	const handleTeamChange = useCallback((data: Array<{ id: string; value: string }>) => {
		setSelectedTeams(data.map((team) => team.id));
	}, []);

	// Memoize derived data for statuses
	const statusOptions = useMemo(
		() =>
			taskStatuses
				?.filter((el) => el.name)
				?.map((status) => ({
					id: status.id,
					value: status.name!
				})),
		[taskStatuses]
	);

	const selectedStatusOptions = useMemo(
		() =>
			selectedStatus.map((statusId) => ({
				value: taskStatuses.find((status) => status.id === statusId)?.value ?? '-',
				id: statusId
			})),
		[selectedStatus, taskStatuses]
	);

	const handleStatusChange = useCallback((data: Array<{ id: string; value: string }>) => {
		setSelectedStatus(data.map((status) => status.id));
	}, []);

	// Memoize derived data for managers
	const managerOptions = useMemo(
		() =>
			managers.map((manager) => ({
				value: manager.value,
				id: manager.id
			})),
		[managers]
	);

	const selectedManagerOptions = useMemo(
		() =>
			selectedManagers.map((managerId) => ({
				value: managers.find((manager) => manager.id === managerId)?.value ?? '-',
				id: managerId
			})),
		[selectedManagers, managers]
	);

	const handleManagerChange = useCallback((data: Array<{ id: string; value: string }>) => {
		setSelectedManagers(data.map((manager) => manager.id));
	}, []);

	// Memoize derived data for members
	const memberOptions = useMemo(() => members, [members]);

	const selectedMemberOptions = useMemo(
		() =>
			selectedMembers.map((memberId) => ({
				value: members.find((member) => member.id === memberId)?.value ?? '-',
				id: memberId
			})),
		[selectedMembers, members]
	);

	const handleMemberChange = useCallback((data: Array<{ id: string; value: string }>) => {
		setSelectedMembers(data.map((member) => member.id));
	}, []);

	// Memoize derived data for budget types
	const budgetTypeOptions = useMemo(() => budgetTypes, [budgetTypes]);

	const selectedBudgetTypeOptions = useMemo(
		() =>
			selectedBudgetType.map((budgetTypeId) => ({
				value: budgetTypes.find((budget) => budget.id === budgetTypeId)?.value ?? '-',
				id: budgetTypeId
			})),
		[selectedBudgetType, budgetTypes]
	);

	const handleBudgetTypeChange = useCallback((data: Array<{ id: string; value: string }>) => {
		setSelectedBudgetType(data.map((budgetType) => budgetType.id));
	}, []);

	const handleApplyFilters = useCallback(() => {
		const searchParams = new URLSearchParams(window.location.search);

		const updateQueryParam = (key: string, values: string[]) => {
			if (values.length > 0) {
				searchParams.set(key, values.join(','));
			} else {
				searchParams.delete(key);
			}
		};

		updateQueryParam('teams', selectedTeams);
		updateQueryParam('members', selectedMembers);
		updateQueryParam('managers', selectedManagers);
		updateQueryParam('status', selectedStatus);
		updateQueryParam('budgetTypes', selectedBudgetType);
		closeModal();

		router.replace(`?${searchParams.toString()}`, { scroll: false });
	}, [selectedTeams, selectedMembers, selectedManagers, selectedStatus, selectedBudgetType, closeModal, router]);

	const handleClearAllFilters = useCallback(() => {
		// Clear all local states
		setSelectedTeams([]);
		setSelectedMembers([]);
		setSelectedManagers([]);
		setSelectedStatus([]);
		setSelectedBudgetType([]);

		// Clear URL params directly (don't rely on state which hasn't updated yet)
		const searchParams = new URLSearchParams(window.location.search);
		searchParams.delete('teams');
		searchParams.delete('members');
		searchParams.delete('managers');
		searchParams.delete('status');
		searchParams.delete('budgetTypes');
		// Also clear date range filters
		searchParams.delete('dateFrom');
		searchParams.delete('dateTo');

		router.replace(`?${searchParams.toString()}`, { scroll: false });
		closeModal();
	}, [closeModal, router]);

	const getSelectedQueries = useCallback(() => {
		setSelectedTeams(params.get('teams')?.split(',') || []);
		setSelectedMembers(params.get('members')?.split(',') || []);
		setSelectedManagers(params.get('managers')?.split(',') || []);
		setSelectedStatus(params.get('status')?.split(',') || []);
		setSelectedBudgetType(params.get('budgetTypes')?.split(',') || []);
	}, [params]);

	useEffect(() => {
		getSelectedQueries();
	}, [getSelectedQueries]);

	return (
		<Modal className="w-full max-w-[26rem]" isOpen={open} closeModal={closeModal}>
			<div className="flex flex-col w-full h-full">
				<div className="flex gap-2 items-center pr-8 w-full text-lg font-semibold">
					<Filter className="size-5 text-muted-foreground" /> <span>{t('common.FILTER')}</span>
				</div>
				<hr className="my-4 w-full border-border" />
				<div className="flex flex-col gap-5 w-full">
					<div className="flex flex-col gap-2 w-full">
						<div className="flex justify-between items-center w-full text-sm">
							<span className="font-medium">{t('common.TEAM')}</span>
							{selectedTeams.length > 0 && (
								<button
									onClick={() => setSelectedTeams([])}
									className="flex gap-1 items-center text-xs rounded-sm outline-none text-primary-ink underline-offset-4 hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50"
								>
									<span>{t('common.CLEAR')}</span>
									<span>({selectedTeams.length})</span>
								</button>
							)}
						</div>
						<MultiSelectWithSearch
							selectedOptions={selectedTeamOptions}
							onChange={handleTeamChange}
							options={teamOptions}
							placeholder="Select a team..."
						/>
						<div className="flex flex-wrap gap-1 w-full">
							{selectedTeams.map((teamId) => (
								<div
									className="inline-flex gap-1 items-center py-0.5 pr-1 pl-2 text-xs font-medium rounded-sm shrink-0 bg-foreground/5 text-foreground"
									key={teamId}
								>
									<span>{teams.find((team) => team.id === teamId)?.name ?? '-'}</span>
									<button onClick={() => setSelectedTeams(selectedTeams.filter((t) => t !== teamId))}>
										<X className="size-3 text-muted-foreground hover:text-foreground" />
									</button>
								</div>
							))}
						</div>
					</div>
					<div className="flex flex-col gap-2 w-full">
						<div className="flex justify-between items-center w-full text-sm">
							<span className="font-medium">{t('common.STATUS')}</span>
							{selectedStatus.length > 0 && (
								<button
									onClick={() => setSelectedStatus([])}
									className="flex gap-1 items-center text-xs rounded-sm outline-none text-primary-ink underline-offset-4 hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50"
								>
									<span>{t('common.CLEAR')}</span>
									<span>({selectedStatus.length})</span>
								</button>
							)}
						</div>
						<MultiSelectWithSearch
							selectedOptions={selectedStatusOptions}
							onChange={handleStatusChange}
							options={statusOptions}
							placeholder="Select a status..."
						/>
						<div className="flex flex-wrap gap-1 w-full">
							{selectedStatus.map((statusId) => {
								const statusName = taskStatuses.find((el) => el.id == statusId)?.name;
								const statusColor = statusColorsMap.get(statusName);

								return (
									<div
										style={statusChipStyle(statusColor)}
										className="chip-3d inline-flex gap-1.5 items-center py-0.5 pr-1 pl-2 text-xs font-medium rounded-sm shrink-0 [--chip:hsl(var(--muted-foreground))]"
										key={statusId}
									>
										<span
											style={statusDotStyle(statusColor)}
											className="rounded-full size-1.5 shrink-0 bg-muted-foreground"
										/>
										<span>{statusName}</span>
										<button
											onClick={() =>
												setSelectedStatus(selectedStatus.filter((t) => t !== statusId))
											}
										>
											<X className="size-3 text-muted-foreground hover:text-foreground" />
										</button>
									</div>
								);
							})}
						</div>
					</div>
					<div className="flex flex-col gap-2 w-full">
						<div className="flex justify-between items-center w-full text-sm">
							<span className="font-medium">{t('common.MANAGER')}</span>
							{selectedManagers.length > 0 && (
								<button
									onClick={() => setSelectedManagers([])}
									className="flex gap-1 items-center text-xs rounded-sm outline-none text-primary-ink underline-offset-4 hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50"
								>
									<span>{t('common.CLEAR')}</span>
									<span>({selectedManagers.length})</span>
								</button>
							)}
						</div>
						<MultiSelectWithSearch
							selectedOptions={selectedManagerOptions}
							onChange={handleManagerChange}
							options={managerOptions}
							placeholder="Select a manager..."
						/>
						<div className="flex gap-1 flex-wrap w-full">
							{selectedManagers.map((managerId) => {
								const manager = managers.find((manager) => manager.id === managerId);

								return manager ? (
									<div
										className="inline-flex items-center p-0.5 pr-1 text-xs font-medium rounded-sm shrink-0 bg-foreground/5 text-foreground"
										key={managerId}
									>
										{manager.imageUrl ? (
											<Image
												src={manager.imageUrl}
												height={20}
												width={20}
												alt={manager.value}
												className="object-cover w-5 h-5 rounded-full"
											/>
										) : (
											<div className="flex justify-center items-center rounded-full size-5 bg-foreground/10 text-[10px] font-medium">
												{manager.value.substring(0, 2)}
											</div>
										)}

										<div className="flex gap-1 items-center pl-1.5">
											<span>{manager.value}</span>

											<button
												onClick={() =>
													setSelectedManagers(selectedManagers.filter((t) => t !== managerId))
												}
											>
												<X className="size-3 text-muted-foreground hover:text-foreground" />
											</button>
										</div>
									</div>
								) : null;
							})}
						</div>
					</div>
					<div className="flex flex-col gap-2 w-full">
						<div className="flex justify-between items-center w-full text-sm">
							<span className="font-medium">{t('common.MEMBER')}</span>
							{selectedMembers.length > 0 && (
								<button
									onClick={() => setSelectedMembers([])}
									className="flex gap-1 items-center text-xs rounded-sm outline-none text-primary-ink underline-offset-4 hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50"
								>
									<span>{t('common.CLEAR')}</span>
									<span>({selectedMembers.length})</span>
								</button>
							)}
						</div>
						<MultiSelectWithSearch
							selectedOptions={selectedMemberOptions}
							onChange={handleMemberChange}
							options={memberOptions}
							searchEnabled
							placeholder="Select a member..."
						/>
						<div className="flex flex-wrap gap-1 w-full">
							{selectedMembers.map((memberId) => {
								const member = members.find((member) => member.id === memberId);

								return member ? (
									<div
										className="inline-flex items-center p-0.5 pr-1 text-xs font-medium rounded-sm shrink-0 bg-foreground/5 text-foreground"
										key={memberId}
									>
										{member.imageUrl ? (
											<Image
												src={member.imageUrl}
												height={20}
												width={20}
												alt={member.value}
												className="object-cover w-5 h-5 rounded-full"
											/>
										) : (
											<div className="flex justify-center items-center rounded-full size-5 bg-foreground/10 text-[10px] font-medium">
												{member.value.substring(0, 2)}
											</div>
										)}
										<div className="flex gap-1 items-center pl-1.5">
											<span>{member.value}</span>

											<button
												onClick={() =>
													setSelectedMembers(selectedMembers.filter((t) => t !== memberId))
												}
											>
												<X className="size-3 text-muted-foreground hover:text-foreground" />
											</button>
										</div>
									</div>
								) : null;
							})}
						</div>
					</div>
					<div className="flex flex-col gap-2 w-full">
						<div className="flex justify-between items-center w-full text-sm">
							<span className="font-medium">{t('common.BUDGET_TYPE')}</span>
							{selectedBudgetType.length > 0 && (
								<button
									onClick={() => setSelectedBudgetType([])}
									className="flex gap-1 items-center text-xs rounded-sm outline-none text-primary-ink underline-offset-4 hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50"
								>
									<span>{t('common.CLEAR')}</span>
									<span>({selectedBudgetType.length})</span>
								</button>
							)}
						</div>
						<MultiSelectWithSearch
							selectedOptions={selectedBudgetTypeOptions}
							onChange={handleBudgetTypeChange}
							options={budgetTypeOptions}
							placeholder="Select a budget type..."
						/>
						<div className="flex flex-wrap gap-1 w-full">
							{selectedBudgetType.map((typeId) => {
								const type = budgetTypes.find((budget) => budget.id === typeId);

								return type ? (
									<div
										className="inline-flex gap-1 items-center py-0.5 pr-1 pl-2 text-xs font-medium rounded-sm shrink-0 bg-foreground/5 text-foreground"
										key={typeId}
									>
										<span>{type.value}</span>{' '}
										<button
											onClick={() =>
												setSelectedBudgetType(selectedBudgetType.filter((t) => t !== typeId))
											}
										>
											<X className="size-3 text-muted-foreground hover:text-foreground" />
										</button>
									</div>
								) : null;
							})}
						</div>
					</div>
				</div>
				<hr className="my-4 w-full border-border" />
				<div className="flex gap-2 justify-end items-center w-full">
					<Button onClick={handleClearAllFilters} variant="outline">
						{t('common.CLEAR_FILTERS')}
					</Button>
					<Button onClick={handleApplyFilters}>{t('common.APPLY_FILTERS')}</Button>
				</div>
			</div>
		</Modal>
	);
}
