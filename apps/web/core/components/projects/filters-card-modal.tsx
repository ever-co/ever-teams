import { Modal } from '@/core/components';
import { ListFilterPlus, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { MultiSelectWithSearch } from '../common/multi-select-with-search';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@ever-teams/ui';
import { useOrganizationProjects, useOrganizationTeams, useTaskStatus } from '@/core/hooks';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card } from '../duplicated-components/card';
import { EProjectBudgetType } from '@/core/types/interfaces/enums/project';

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
	const { teams } = useOrganizationTeams();
	const { organizationProjects } = useOrganizationProjects();
	const teamMembers = useMemo(
		() => organizationProjects.flatMap((project) => project.members ?? []),
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
	const { taskStatuses } = useTaskStatus();
	const router = useRouter();
	const statusColorsMap: Map<string | undefined, string | undefined> = useMemo(() => {
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
				value: taskStatuses.find((status) => status.name === statusId)?.name ?? '-',
				id: statusId
			})),
		[selectedStatus, taskStatuses]
	);

	const handleStatusChange = useCallback((data: Array<{ id: string; value: string }>) => {
		setSelectedStatus(data.map((status) => status.value));
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
		setSelectedTeams([]);
		setSelectedMembers([]);
		setSelectedManagers([]);
		setSelectedStatus([]);
		setSelectedBudgetType([]);
		handleApplyFilters();
		closeModal();
	}, [closeModal, handleApplyFilters]);

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
		<Modal className="w-[26rem]" isOpen={open} closeModal={closeModal}>
			<Card className="w-full h-full border " shadow="custom">
				<div className="w-full flex gap-2 font-medium text-[1rem]">
					<ListFilterPlus size={20} strokeWidth={2} /> <span>{t('common.FILTER')}</span>
				</div>
				<hr className="w-full my-4" />
				<div className="flex flex-col w-full gap-5">
					<div className="flex flex-col w-full gap-2">
						<div className="flex items-center justify-between w-full text-sm">
							<span className="">{t('common.TEAM')}</span>
							{selectedTeams.length > 0 && (
								<button
									onClick={() => setSelectedTeams([])}
									className="flex items-center gap-1 text-xs text-primary"
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
						<div className="flex flex-wrap w-full gap-1">
							{selectedTeams.map((teamId) => (
								<div
									className=" rounded-md shrink-0 flex items-center gap-1 bg-gray-200 py-[.125rem] dark:text-black px-2"
									key={teamId}
								>
									<span className="text-[.65rem] font-light">
										{teams.find((team) => team.id === teamId)?.name ?? '-'}
									</span>
									<button onClick={() => setSelectedTeams(selectedTeams.filter((t) => t !== teamId))}>
										<X size={10} />
									</button>
								</div>
							))}
						</div>
					</div>
					<div className="flex flex-col w-full gap-2">
						<div className="flex items-center justify-between w-full text-sm">
							<span className="">{t('common.STATUS')}</span>
							{selectedStatus.length > 0 && (
								<button
									onClick={() => setSelectedStatus([])}
									className="flex items-center gap-1 text-xs text-primary"
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
						<div className="flex w-full gap-1">
							{selectedStatus.map((statusId) => (
								<div
									style={{
										backgroundColor: statusColorsMap.get(
											taskStatuses.find((el) => el.name == statusId)?.name
										)
									}}
									className=" rounded-md flex items-center gap-1 bg-gray-200 py-[.125rem] dark:text-black px-2"
									key={statusId}
								>
									<span className="text-[.65rem] font-light">
										{taskStatuses.find((el) => el.name == statusId)?.name}
									</span>
									<button
										onClick={() => setSelectedStatus(selectedStatus.filter((t) => t !== statusId))}
									>
										<X size={10} />
									</button>
								</div>
							))}
						</div>
					</div>
					<div className="flex flex-col w-full gap-2">
						<div className="flex items-center justify-between w-full text-sm">
							<span className="">{t('common.MANAGER')}</span>
							{selectedManagers.length > 0 && (
								<button
									onClick={() => setSelectedManagers([])}
									className="flex items-center gap-1 text-xs text-primary"
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
						<div className="flex w-full gap-1">
							{selectedManagers.map((managerId) => {
								const manager = managers.find((manager) => manager.id === managerId);

								return manager ? (
									<div
										className=" pl-[1px] rounded-l-lg rounded-r-md flex items-center bg-gray-200"
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
											<div className="w-5 h-5 rounded-full">{manager.value.substring(0, 2)}</div>
										)}

										<div className="h-full grow flex  py-[.125rem] gap-1 dark:text-black px-2">
											<span className="text-[.65rem] font-light">{manager.value}</span>

											<button
												onClick={() =>
													setSelectedManagers(selectedManagers.filter((t) => t !== managerId))
												}
											>
												<X size={10} />
											</button>
										</div>
									</div>
								) : null;
							})}
						</div>
					</div>
					<div className="flex flex-col w-full gap-2">
						<div className="flex items-center justify-between w-full text-sm">
							<span className="">{t('common.MEMBER')}</span>
							{selectedMembers.length > 0 && (
								<button
									onClick={() => setSelectedMembers([])}
									className="flex items-center gap-1 text-xs text-primary"
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
						<div className="flex w-full gap-1">
							{selectedMembers.map((memberId) => {
								const member = members.find((member) => member.id === memberId);

								return member ? (
									<div
										className=" pl-[1px] rounded-l-lg rounded-r-md flex items-center bg-gray-200"
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
											<div className="w-5 h-5 rounded-full">{member.value.substring(0, 2)}</div>
										)}
										<div className="h-full grow flex  py-[.125rem] dark:text-black gap-1 px-2">
											<span className="text-[.65rem] font-light">{member.value}</span>

											<button
												onClick={() =>
													setSelectedMembers(selectedMembers.filter((t) => t !== memberId))
												}
											>
												<X size={10} />
											</button>
										</div>
									</div>
								) : null;
							})}
						</div>
					</div>
					<div className="flex flex-col w-full gap-2">
						<div className="flex items-center justify-between w-full text-sm">
							<span className="">{t('common.BUDGET_TYPE')}</span>
							{selectedBudgetType.length > 0 && (
								<button
									onClick={() => setSelectedBudgetType([])}
									className="flex items-center gap-1 text-xs text-primary"
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
						<div className="flex w-full gap-1">
							{selectedBudgetType.map((typeId) => {
								const type = budgetTypes.find((budget) => budget.id === typeId);

								return type ? (
									<div
										className=" rounded-md flex items-center gap-1 bg-gray-200 py-[.125rem] dark:text-black px-2"
										key={typeId}
									>
										<span className="text-[.65rem] font-light">{type.value}</span>{' '}
										<button
											onClick={() =>
												setSelectedBudgetType(selectedBudgetType.filter((t) => t !== typeId))
											}
										>
											<X size={10} />
										</button>
									</div>
								) : null;
							})}
						</div>
					</div>
				</div>
				<hr className="w-full my-4" />
				<div className="flex items-center justify-end w-full gap-2">
					<Button onClick={handleClearAllFilters} variant="outline">
						{t('common.CLEAR_FILTERS')}
					</Button>
					<Button onClick={handleApplyFilters}>{t('common.APPLY_FILTERS')}</Button>
				</div>
			</Card>
		</Modal>
	);
}
