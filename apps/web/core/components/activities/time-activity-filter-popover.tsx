import React from 'react';
import { Button } from '@/core/components/common/button2';
import { Popover, PopoverContent, PopoverTrigger } from '@/core/components/common/popover';
import { SettingFilterIcon } from '@/assets/svg';
import { useTranslations } from 'next-intl';
import { cn } from '@/core/lib/helpers';
import { IOrganizationTeamList, IProject, ITeamTask } from '@/core/types/interfaces';
import { MultiSelect } from '../common/multi-select';

interface TimeActivityHeaderProps {
	userManagedTeams?: IOrganizationTeamList[];
	projects?: IProject[];
	tasks?: ITeamTask[];
	activeTeam?: IOrganizationTeamList | null;
}

const STORAGE_KEY = 'ever-teams-activity-filters';

interface FilterState {
	teams: any[];
	members: any[];
	projects: any[];
	tasks: any[];
}

const loadFilterState = (): FilterState => {
	if (typeof window === 'undefined') {
		return { teams: [], members: [], projects: [], tasks: [] };
	}

	try {
		const savedState = localStorage.getItem(STORAGE_KEY);
		if (!savedState) return { teams: [], members: [], projects: [], tasks: [] };

		const parsedState = JSON.parse(savedState);
		return {
			teams: Array.isArray(parsedState.teams) ? parsedState.teams : [],
			members: Array.isArray(parsedState.members) ? parsedState.members : [],
			projects: Array.isArray(parsedState.projects) ? parsedState.projects : [],
			tasks: Array.isArray(parsedState.tasks) ? parsedState.tasks : []
		};
	} catch {
		return { teams: [], members: [], projects: [], tasks: [] };
	}
};

const saveFilterState = (state: FilterState) => {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

export const TimeActivityFilterPopover = React.memo(function TimeActivityFilterPopover({
	userManagedTeams,
	projects,
	tasks,
	activeTeam
}: TimeActivityHeaderProps) {
	const [shouldRemoveItems, setShouldRemoveItems] = React.useState(false);
	const initialState = React.useMemo(() => loadFilterState(), []);

	const [selectedTeams, setSelectedTeams] = React.useState(initialState.teams);
	const [selectedMembers, setSelectedMembers] = React.useState(initialState.members);
	const [selectedProjects, setSelectedProjects] = React.useState(initialState.projects);
	const [selectedTasks, setSelectedTasks] = React.useState(initialState.tasks);
	const t = useTranslations();

	const clearAllFilters = React.useCallback(() => {
		setShouldRemoveItems(true);
		setSelectedTeams([]);
		setSelectedMembers([]);
		setSelectedProjects([]);
		setSelectedTasks([]);
		saveFilterState({ teams: [], members: [], projects: [], tasks: [] });
		setTimeout(() => setShouldRemoveItems(false), 100);
	}, []);

	const totalFilteredItems = React.useMemo(() => {
		return selectedTeams.length + selectedMembers.length + selectedProjects.length + selectedTasks.length;
	}, [selectedTeams, selectedMembers, selectedProjects, selectedTasks]);
	return (
		<>
			<Popover>
				<PopoverTrigger asChild>
					<div>
						<Button
							variant="outline"
							className="flex items-center justify-center h-[2.2rem] rounded-lg bg-white dark:bg-dark--theme-light border dark:border-gray-700 hover:bg-white p-3 gap-2"
						>
							<SettingFilterIcon className="text-gray-700 dark:text-white w-3.5" strokeWidth="1.8" />
							<span className="text-gray-700 dark:text-white">{t('common.FILTER')}</span>
							{totalFilteredItems > 0 && (
								<span
									role="status"
									aria-label={`${totalFilteredItems} items filtered`}
									className="ml-1 rounded-full bg-primary dark:bg-primary-light min-h-[1.75rem] min-w-[1.75rem] flex items-center justify-center text-white text-center text-[12px] font-medium shadow-sm transition-all"
								>
									{totalFilteredItems > 100 ? '100+' : totalFilteredItems}
								</span>
							)}
						</Button>
					</div>
				</PopoverTrigger>
				<PopoverContent className="w-96 dark:bg-dark-high">
					<div className="flex flex-col w-full">
						<div className="flex gap-2 mb-3 text-xl font-bold">
							<SettingFilterIcon className="w-4 text-gray-700 dark:text-white" strokeWidth="1.8" />
							<span className="text-gray-700 dark:text-white">{t('common.FILTER')}</span>
						</div>
						<div className="grid gap-5">
							<div className="">
								<label className="flex justify-between mb-1 text-sm text-gray-600">
									<div className="flex items-center gap-2">
										<span className="text-[12px]">{t('common.TEAM')}</span>
										{selectedTeams.length > 0 && (
											<span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary dark:text-primary-light">
												{selectedTeams.length}
											</span>
										)}
									</div>
									<button
										onClick={() => {
											setSelectedTeams([]);
											saveFilterState({
												teams: [],
												members: selectedMembers,
												projects: selectedProjects,
												tasks: selectedTasks
											});
										}}
										className={cn(
											'text-primary/10',
											'text-primary dark:text-primary-light hover:opacity-80 cursor-pointer'
										)}
									>
										{t('common.CLEAR')}
									</button>
								</label>
								<MultiSelect
									localStorageKey="time-activity-select-filter-teams"
									removeItems={shouldRemoveItems}
									items={userManagedTeams || []}
									itemToString={(team) => team.name}
									itemId={(item) => item.id}
									onValueChange={(selectedItems) => setSelectedTeams(selectedItems as any)}
									multiSelect={true}
									triggerClassName="dark:border-gray-700"
								/>
							</div>
							<div className="">
								<label className="flex justify-between mb-1 text-sm text-gray-600">
									<div className="flex items-center gap-2">
										<span className="text-[12px]">{t('common.MEMBER')}</span>
										{selectedMembers.length > 0 && (
											<span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary dark:text-primary-light">
												{selectedMembers.length}
											</span>
										)}
									</div>
									<button
										onClick={() => {
											setSelectedMembers([]);
											saveFilterState({
												teams: selectedTeams,
												members: [],
												projects: selectedProjects,
												tasks: selectedTasks
											});
										}}
										className={cn(
											'text-primary/10',
											'text-primary dark:text-primary-light hover:opacity-80 cursor-pointer'
										)}
									>
										{t('common.CLEAR')}
									</button>
								</label>
								<MultiSelect
									localStorageKey="time-activity-select-filter-member"
									removeItems={shouldRemoveItems}
									items={activeTeam?.members || []}
									itemToString={(member) => member?.employee.fullName || ''}
									itemId={(item) => item?.id}
									onValueChange={(selectedItems) => setSelectedMembers(selectedItems as any)}
									multiSelect={true}
									triggerClassName="dark:border-gray-700"
								/>
							</div>
							<div className="">
								<label className="flex justify-between mb-1 text-sm text-gray-600">
									<div className="flex items-center gap-2">
										<span className="text-[12px]">{t('sidebar.PROJECTS')}</span>
										{selectedProjects.length > 0 && (
											<span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary dark:text-primary-light">
												{selectedProjects.length}
											</span>
										)}
									</div>
									<button
										onClick={() => {
											setSelectedProjects([]);
											saveFilterState({
												teams: selectedTeams,
												members: selectedMembers,
												projects: [],
												tasks: selectedTasks
											});
										}}
										className={cn(
											'text-primary/10',
											'text-primary dark:text-primary-light hover:opacity-80 cursor-pointer'
										)}
									>
										{t('common.CLEAR')}
									</button>
								</label>
								<MultiSelect
									localStorageKey="time-activity-select-filter-projects"
									removeItems={shouldRemoveItems}
									items={projects || []}
									itemToString={(project) => project?.name || ''}
									itemId={(item) => item?.id}
									onValueChange={(selectedItems) => setSelectedProjects(selectedItems as any)}
									multiSelect={true}
									triggerClassName="dark:border-gray-700"
								/>
							</div>
							<div className="">
								<label className="flex justify-between mb-1 text-sm text-gray-600">
									<div className="flex items-center gap-2">
										<span className="text-[12px]">{t('hotkeys.TASK')}</span>
										{selectedTasks.length > 0 && (
											<span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary dark:text-primary-light">
												{selectedTasks.length}
											</span>
										)}
									</div>
									<button
										onClick={() => {
											setSelectedTasks([]);
											saveFilterState({
												teams: selectedTeams,
												members: selectedMembers,
												projects: selectedProjects,
												tasks: []
											});
										}}
										className={cn(
											'text-primary/10',
											'text-primary dark:text-primary-light hover:opacity-80 cursor-pointer'
										)}
									>
										{t('common.CLEAR')}
									</button>
								</label>
								<MultiSelect
									localStorageKey="time-activity-select-filter-task"
									removeItems={shouldRemoveItems}
									items={tasks || []}
									itemToString={(task) => task?.title || ''}
									itemId={(item) => item?.id}
									onValueChange={(selectedItems) => setSelectedTasks(selectedItems as any)}
									multiSelect={true}
									triggerClassName="dark:border-gray-700"
								/>
							</div>
							<div className="flex gap-x-4 justify-end items-center w-full">
								<Button
									onClick={clearAllFilters}
									variant={'outline'}
									className="flex justify-center items-center h-10 text-sm rounded-lg dark:text-gray-300 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
									disabled={!totalFilteredItems}
								>
									<span className="text-sm">{t('common.CLEAR_FILTER')}</span>
								</Button>
								<Button
									onClick={() => {
										saveFilterState({
											teams: selectedTeams,
											members: selectedMembers,
											projects: selectedProjects,
											tasks: selectedTasks
										});
									}}
									className="flex justify-center items-center h-10 text-sm rounded-lg bg-primary dark:bg-primary-light dark:text-gray-300 hover:opacity-90 transition-opacity"
								>
									<span className="text-sm">{t('common.APPLY_FILTER')}</span>
								</Button>
							</div>
						</div>
					</div>
				</PopoverContent>
			</Popover>
		</>
	);
});
