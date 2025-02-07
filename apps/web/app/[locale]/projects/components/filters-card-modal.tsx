import { Card, Modal } from '@/lib/components';
import { ListFilterPlus, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { MultiSelectWithSearch } from './multi-select-with-search';
import { useCallback, useMemo, useState } from 'react';
import { Button } from '@components/ui/button';
import { useTaskStatus } from '@/app/hooks';
import Image from 'next/image';

interface IFiltersCardModalProps {
	open: boolean;
	closeModal: () => void;
}

const people: { value: string; id: string; imageUrl: string }[] = [
	{ value: 'Wade Cooper', id: 'Wade Cooper', imageUrl: 'https://dummyimage.com/600x400/000/fff' },
	{ value: 'Arlene Mccoy', id: 'Arlene Mccoy', imageUrl: 'https://dummyimage.com/600x400/000/fff' },
	{ value: 'Devon Webb', id: 'Devon', imageUrl: 'https://dummyimage.com/600x400/000/fff' },
	{ value: 'Tom Cook', id: 'Tom', imageUrl: 'https://dummyimage.com/600x400/000/fff' },
	{ value: 'Tanya Fox', id: 'Tanya', imageUrl: 'https://dummyimage.com/600x400/000/fff' },
	{ value: 'Hellen Schmidt', id: 'Hellen', imageUrl: 'https://dummyimage.com/600x400/000/fff' }
];

const budgetTypes: { value: string; id: string }[] = [
	{ value: 'Cost-based', id: 'cost-based' },
	{ value: 'Hours-based', id: 'hours-based' }
];

export default function FiltersCardModal(props: IFiltersCardModalProps) {
	const { open, closeModal } = props;
	const t = useTranslations();
	const [selectedTeams, setSelectedTeams] = useState<{ value: string; id: string }[]>([]);
	const [selectedMembers, setSelectedMembers] = useState<{ value: string; id: string; imageUrl: string }[]>([]);
	const [selectedManagers, setSelectedManagers] = useState<{ value: string; id: string; imageUrl: string }[]>([]);
	const [selectedStatus, setSelectedStatus] = useState<{ value: string; id: string }[]>([]);
	const [selectedBudgetType, setSelectedBudgetType] = useState<{ value: string; id: string }[]>([]);

	const { taskStatus } = useTaskStatus();

	const statusColorsMap: Map<string | undefined, string | undefined> = useMemo(() => {
		return new Map(taskStatus.map((status) => [status.name, status.color]));
	}, [taskStatus]);

	const handleClearAllFilters = useCallback(() => {
		setSelectedTeams([]);
		setSelectedMembers([]);
		setSelectedManagers([]);
		setSelectedStatus([]);
		setSelectedBudgetType([]);
	}, []);

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
									<span>Clear</span>
									<span>({selectedTeams.length})</span>
								</button>
							)}
						</div>
						<MultiSelectWithSearch
							selectedOptions={selectedTeams}
							onChange={setSelectedTeams}
							options={people}
							placeholder="Search a team..."
						/>
						<div className="w-full flex-wrap flex gap-1">
							{selectedTeams.map((team) => (
								<div
									className=" rounded-md shrink-0 flex items-center gap-1 bg-gray-200 py-[.125rem] px-2"
									key={team.id}
								>
									<span className="text-[.65rem] font-light">{team.value}</span>
									<button
										onClick={() => setSelectedTeams(selectedTeams.filter((t) => t.id !== team.id))}
									>
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
									<span>Clear</span>
									<span>({selectedStatus.length})</span>
								</button>
							)}
						</div>
						<MultiSelectWithSearch
							selectedOptions={selectedStatus}
							onChange={setSelectedStatus}
							options={taskStatus
								?.filter((el) => el.name)
								?.map((status) => ({ id: status.id, value: status.name! }))}
							placeholder="Select a status..."
						/>
						<div className="w-full flex gap-1">
							{selectedStatus.map((status) => (
								<div
									style={{ backgroundColor: statusColorsMap.get(status.value) }}
									className=" rounded-md flex items-center gap-1 bg-gray-200 py-[.125rem] px-2"
									key={status.id}
								>
									<span className="text-[.65rem] font-light">{status.value}</span>{' '}
									<button
										onClick={() =>
											setSelectedStatus(selectedStatus.filter((t) => t.id !== status.id))
										}
									>
										<X size={10} />
									</button>
								</div>
							))}
						</div>
					</div>
					<div className="w-full flex flex-col gap-2">
						<div className="w-full text-sm flex items-center justify-between">
							<span className="">Manager</span>
							{selectedManagers.length > 0 && (
								<button
									onClick={() => setSelectedManagers([])}
									className="flex  items-center text-xs text-primary gap-1"
								>
									<span>Clear</span>
									<span>({selectedManagers.length})</span>
								</button>
							)}
						</div>
						<MultiSelectWithSearch
							selectedOptions={selectedManagers}
							onChange={setSelectedManagers}
							options={people}
							placeholder="Select a manager..."
						/>
						<div className="w-full flex gap-1">
							{selectedManagers.map((manager) => (
								<div
									className=" pl-[1px] rounded-l-lg rounded-r-md flex items-center bg-gray-200"
									key={manager.id}
								>
									<Image
										src={manager.imageUrl}
										height={20}
										width={20}
										alt={manager.value}
										className="w-5 h-5 rounded-full object-cover"
									/>
									<div className="h-full grow flex  py-[.125rem] gap-1 px-2">
										<span className="text-[.65rem] font-light">{manager.value}</span>

										<button
											onClick={() =>
												setSelectedManagers(selectedManagers.filter((t) => t.id !== manager.id))
											}
										>
											<X size={10} />
										</button>
									</div>
								</div>
							))}
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
									<span>Clear</span>
									<span>({selectedMembers.length})</span>
								</button>
							)}
						</div>
						<MultiSelectWithSearch
							selectedOptions={selectedMembers}
							onChange={setSelectedMembers}
							options={people}
							searchEnabled
							placeholder="Select a member..."
						/>
						<div className="w-full flex gap-1">
							{selectedMembers.map((member) => (
								<div
									className=" pl-[1px] rounded-l-lg rounded-r-md flex items-center bg-gray-200"
									key={member.id}
								>
									<Image
										src={member.imageUrl}
										height={20}
										width={20}
										alt={member.value}
										className="w-5 h-5 rounded-full object-cover"
									/>
									<div className="h-full grow flex  py-[.125rem] gap-1 px-2">
										<span className="text-[.65rem] font-light">{member.value}</span>

										<button
											onClick={() =>
												setSelectedManagers(selectedManagers.filter((t) => t.id !== member.id))
											}
										>
											<X size={10} />
										</button>
									</div>
								</div>
							))}
						</div>
					</div>
					<div className="w-full flex flex-col gap-2">
						<div className="w-full text-sm flex items-center justify-between">
							<span className="">Budget Type</span>
							{selectedBudgetType.length > 0 && (
								<button
									onClick={() => setSelectedBudgetType([])}
									className="flex  items-center text-xs text-primary gap-1"
								>
									<span>Clear</span>
									<span>({selectedBudgetType.length})</span>
								</button>
							)}
						</div>
						<MultiSelectWithSearch
							selectedOptions={selectedBudgetType}
							onChange={setSelectedBudgetType}
							options={budgetTypes}
							placeholder="Select a budget type..."
						/>
						<div className="w-full flex gap-1">
							{selectedBudgetType.map((type) => (
								<div
									className=" rounded-md flex items-center gap-1 bg-gray-200 py-[.125rem] px-2"
									key={type.id}
								>
									<span className="text-[.65rem] font-light">{type.value}</span>{' '}
									<button
										onClick={() =>
											setSelectedBudgetType(selectedBudgetType.filter((t) => t.id !== type.id))
										}
									>
										<X size={10} />
									</button>
								</div>
							))}
						</div>
					</div>
				</div>
				<hr className="w-full my-4" />
				<div className="w-full flex items-center justify-end gap-2">
					<Button variant="outline">Clear Filters</Button>
					<Button onClick={handleClearAllFilters}>Clear Filters</Button>
				</div>
			</Card>
		</Modal>
	);
}
