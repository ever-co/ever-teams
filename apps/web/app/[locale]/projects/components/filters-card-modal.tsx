import { Card, Modal } from '@/lib/components';
import { ListFilterPlus, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { MultiSelectWithSearch } from './multi-select-with-search';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@components/ui/button';
import { useOrganizationProjects, useOrganizationTeams, useTaskStatus } from '@/app/hooks';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { OrganizationProjectBudgetTypeEnum } from '@/app/interfaces';

interface IFiltersCardModalProps {
	open: boolean;
	closeModal: () => void;
}

export default function FiltersCardModal(props: IFiltersCardModalProps) {
	const { open, closeModal } = props;
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
		id: OrganizationProjectBudgetTypeEnum;
	}[] = useMemo(
		() => [
			{
				value: t('common.COST_BASED'),
				id: OrganizationProjectBudgetTypeEnum.COST
			},
			{
				value: t('common.HOURS_BASED'),
				id: OrganizationProjectBudgetTypeEnum.HOURS
			}
		],
		[]
	);
	const { taskStatus } = useTaskStatus();
	const router = useRouter();
	const statusColorsMap: Map<string | undefined, string | undefined> = useMemo(() => {
		return new Map(taskStatus.map((status) => [status.name, status.color]));
	}, [taskStatus]);

	const members = useMemo(
		() =>
			teamMembers
				?.filter((el) => !el?.isManager)
				?.map((el) => ({
					imageUrl: el?.employee?.user?.imageUrl,
					value: el?.employee?.fullName,
					id: el?.employeeId
				})) || [],
		[teamMembers]
	);

	const managers = useMemo(
		() =>
			teamMembers
				?.filter((el) => el?.isManager)
				?.map((el) => ({
					imageUrl: el?.employee?.user?.imageUrl,
					value: el?.employee?.fullName,
					id: el?.employeeId
				})) || [],
		[teamMembers]
	);

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
			<Card className="w-full border  h-full " shadow="custom">
				<div className="w-full flex gap-2 font-medium text-[1rem]">
					<ListFilterPlus size={20} strokeWidth={2} /> <span>{t('common.FILTER')}</span>
				</div>
				<hr className="w-full my-4" />
				<div className="w-full flex flex-col gap-5">
					<div className="w-full flex flex-col gap-2">
						<div className="w-full text-sm flex items-center justify-between">
							<span className="">{t('common.TEAM')}</span>
							{selectedTeams.length > 0 && (
								<button
									onClick={() => setSelectedTeams([])}
									className="flex  items-center text-xs text-primary gap-1"
								>
									<span>{t('common.CLEAR')}</span>
									<span>({selectedTeams.length})</span>
								</button>
							)}
						</div>
						<MultiSelectWithSearch
							selectedOptions={selectedTeams.map((teamId) => {
								const name = teams.find((team) => team.id === teamId)?.name ?? '-';

								return {
									value: name,
									id: teamId
								};
							})}
							onChange={(data) => setSelectedTeams(data.map((team) => team.id))}
							options={teams.map((team) => ({
								value: team.name,
								id: team.id
							}))}
							placeholder="Select a team..."
						/>
						<div className="w-full flex-wrap flex gap-1">
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
					<div className="w-full flex flex-col gap-2">
						<div className="w-full text-sm flex items-center justify-between">
							<span className="">{t('common.STATUS')}</span>
							{selectedStatus.length > 0 && (
								<button
									onClick={() => setSelectedStatus([])}
									className="flex  items-center text-xs text-primary gap-1"
								>
									<span>{t('common.CLEAR')}</span>
									<span>({selectedStatus.length})</span>
								</button>
							)}
						</div>
						<MultiSelectWithSearch
							selectedOptions={selectedStatus.map((statusId) => {
								const name = taskStatus.find((status) => status.id === statusId)?.name ?? '-';

								return {
									value: name,
									id: statusId
								};
							})}
							onChange={(data) => setSelectedStatus(data.map((status) => status.id))}
							options={taskStatus
								?.filter((el) => el.name)
								?.map((status) => ({ id: status.id, value: status.name! }))}
							placeholder="Select a status..."
						/>
						<div className="w-full flex gap-1">
							{selectedStatus.map((statusId) => (
								<div
									style={{
										backgroundColor: statusColorsMap.get(
											taskStatus.find((el) => el.id == statusId)?.name
										)
									}}
									className=" rounded-md flex items-center gap-1 bg-gray-200 py-[.125rem] dark:text-black px-2"
									key={statusId}
								>
									<span className="text-[.65rem] font-light">
										{taskStatus.find((el) => el.id == statusId)?.name}
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
					<div className="w-full flex flex-col gap-2">
						<div className="w-full text-sm flex items-center justify-between">
							<span className="">{t('common.MANAGER')}</span>
							{selectedManagers.length > 0 && (
								<button
									onClick={() => setSelectedManagers([])}
									className="flex  items-center text-xs text-primary gap-1"
								>
									<span>{t('common.CLEAR')}</span>
									<span>({selectedManagers.length})</span>
								</button>
							)}
						</div>
						<MultiSelectWithSearch
							selectedOptions={selectedManagers.map((managerId) => {
								const name = managers.find((manager) => manager.id === managerId)?.value ?? '-';

								return {
									value: name,
									id: managerId
								};
							})}
							onChange={(data) => setSelectedManagers(data.map((manager) => manager.id))}
							options={managers}
							placeholder="Select a manager..."
						/>
						<div className="w-full flex gap-1">
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
												className="w-5 h-5 rounded-full object-cover"
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
					<div className="w-full flex flex-col gap-2">
						<div className="w-full text-sm flex items-center justify-between">
							<span className="">{t('common.MEMBER')}</span>
							{selectedMembers.length > 0 && (
								<button
									onClick={() => setSelectedMembers([])}
									className="flex  items-center text-xs text-primary gap-1"
								>
									<span>{t('common.CLEAR')}</span>
									<span>({selectedMembers.length})</span>
								</button>
							)}
						</div>
						<MultiSelectWithSearch
							selectedOptions={selectedMembers.map((memberId) => {
								const name = members.find((member) => member.id === memberId)?.value ?? '-';

								return {
									value: name,
									id: memberId
								};
							})}
							onChange={(data) => setSelectedMembers(data.map((member) => member.id))}
							options={members}
							searchEnabled
							placeholder="Select a member..."
						/>
						<div className="w-full flex gap-1">
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
												className="w-5 h-5 rounded-full object-cover"
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
					<div className="w-full flex flex-col gap-2">
						<div className="w-full text-sm flex items-center justify-between">
							<span className="">{t('common.BUDGET_TYPE')}</span>
							{selectedBudgetType.length > 0 && (
								<button
									onClick={() => setSelectedBudgetType([])}
									className="flex  items-center text-xs text-primary gap-1"
								>
									<span>{t('common.CLEAR')}</span>
									<span>({selectedBudgetType.length})</span>
								</button>
							)}
						</div>
						<MultiSelectWithSearch
							selectedOptions={selectedBudgetType.map((budgetTypeId) => {
								const name = budgetTypes.find((budget) => budget.id === budgetTypeId)?.value ?? '-';

								return {
									value: name,
									id: budgetTypeId
								};
							})}
							onChange={(data) => setSelectedBudgetType(data.map((budgetType) => budgetType.id))}
							options={budgetTypes}
							placeholder="Select a budget type..."
						/>
						<div className="w-full flex gap-1">
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
				<div className="w-full flex items-center justify-end gap-2">
					<Button onClick={handleClearAllFilters} variant="outline">
						{t('common.CLEAR_FILTERS')}
					</Button>
					<Button onClick={handleApplyFilters}>{t('common.APPLY_FILTERS')}</Button>
				</div>
			</Card>
		</Modal>
	);
}
