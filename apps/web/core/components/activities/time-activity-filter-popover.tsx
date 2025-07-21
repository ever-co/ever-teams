import React from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/core/components/common/popover';
import { SettingFilterIcon } from '@/assets/svg';
import { useTranslations } from 'next-intl';

import { MultiSelect } from '../common/multi-select';
import { Button } from '../duplicated-components/_button';
import { TOrganizationProject, TOrganizationTeam } from '@/core/types/schemas';
import { TTask } from '@/core/types/schemas/task/task.schema';
import { useAuthenticateUser } from '@/core/hooks/auth';

interface TimeActivityHeaderProps {
	userManagedTeams?: TOrganizationTeam[];
	projects?: TOrganizationProject[];
	tasks?: TTask[];
	activeTeam?: TOrganizationTeam | null;
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
	const { user, isTeamManager } = useAuthenticateUser();
	const t = useTranslations();

	// Initialize state with defaults based on permissions
	const initialState = React.useMemo(() => {
		const savedState = loadFilterState();

		// Set default selections based on user permissions
		const defaultState = {
			teams: activeTeam ? [activeTeam] : [], // Default to current team
			members: isTeamManager ? [] : user ? [{ id: user.id, name: user.name }] : [], // Non-managers see only themselves
			projects: [],
			tasks: []
		};

		// Merge saved state with defaults, prioritizing saved state if it exists
		return {
			teams: savedState.teams.length > 0 ? savedState.teams : defaultState.teams,
			members: savedState.members.length > 0 ? savedState.members : defaultState.members,
			projects: savedState.projects.length > 0 ? savedState.projects : defaultState.projects,
			tasks: savedState.tasks.length > 0 ? savedState.tasks : defaultState.tasks
		};
	}, [activeTeam, isTeamManager, user]);

	const [selectedTeams, setSelectedTeams] = React.useState(initialState.teams);
	const [selectedMembers, setSelectedMembers] = React.useState(initialState.members);
	const [selectedProjects, setSelectedProjects] = React.useState(initialState.projects);
	const [selectedTasks, setSelectedTasks] = React.useState(initialState.tasks);

	// Filter to show only valid projects with proper access control
	const validProjects = React.useMemo(() => {
		return (projects || []).filter((project) => {
			// Basic validation: valid name and status
			const isValidProject =
				project?.name &&
				project?.name?.trim().length > 0 &&
				project?.status?.length &&
				project?.status?.length > 0;

			if (!isValidProject) return false;

			// Access control logic:
			// 1. Managers can see all team projects
			if (isTeamManager) return true;

			// 2. Regular users can see:
			//    - Public projects
			//    - Projects they are members of
			//    - Projects where they have tasks assigned
			if (user) {
				// Check if project is public
				if (project.public === true) return true;

				// Check if user is a member of the project
				if (project.members?.some((member) => member.employee?.userId === user.id)) {
					return true;
				}

				// Check if user has tasks in this project
				if (project.tasks?.some((task) => task.members?.some((member: any) => member.userId === user.id))) {
					return true;
				}
			}

			return false;
		});
	}, [projects, isTeamManager, user]);

	// Filter members based on permissions
	const availableMembers = React.useMemo(() => {
		if (!activeTeam?.members) return [];

		// If user is not a manager, they can only see themselves
		if (!isTeamManager && user) {
			const currentUserMember = activeTeam.members.find((member) => member.employee?.userId === user.id);
			return currentUserMember ? [currentUserMember] : [];
		}

		// Managers can see all team members
		return activeTeam.members;
	}, [activeTeam?.members, isTeamManager, user]);

	// Filter tasks based on permissions
	const availableTasks = React.useMemo(() => {
		if (!tasks || tasks.length === 0) return [];

		// If user is not a manager, they can only see tasks assigned to them
		if (!isTeamManager && user) {
			return tasks.filter((task) => task.members?.some((member) => member.userId === user.id));
		}

		// Managers can see all team tasks
		return tasks;
	}, [tasks, isTeamManager, user]);

	// Format task display string for better readability
	const formatTaskDisplay = React.useCallback((task: TTask) => {
		if (!task) return '';

		const taskNumber = task.taskNumber || task.number ? `#${task.number || task.taskNumber}` : '';
		const title = task.title || '';

		// Limit title length for better readability
		const maxTitleLength = 40;
		const truncatedTitle = title.length > maxTitleLength ? `${title.substring(0, maxTitleLength)}...` : title;

		return taskNumber ? `${taskNumber} ${truncatedTitle}` : truncatedTitle;
	}, []);

	// Custom render function for task items with better formatting
	const renderTaskItem = React.useCallback((task: TTask, onClick: () => void, isSelected: boolean) => {
		const taskNumber = task.taskNumber || `#${task.number || ''}`;
		const title = task.title || '';

		return (
			<div
				onClick={onClick}
				className={`flex flex-col p-2 hover:cursor-pointer hover:bg-slate-50 dark:hover:bg-primary rounded-lg transition-colors ${
					isSelected ? 'font-medium bg-slate-100 dark:bg-primary-light' : ''
				}`}
			>
				<div className="flex gap-2 items-center">
					{taskNumber && taskNumber.trim() && (
						<span className="text-xs font-mono text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">
							{taskNumber}
						</span>
					)}
				</div>
				<span className="mt-1 text-sm text-gray-900 dark:text-white line-clamp-2">{title}</span>
			</div>
		);
	}, []);

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
									<div className="flex gap-2 items-center">
										<span className="text-[12px]">{t('common.TEAM')}</span>
										{selectedTeams.length > 0 && (
											<span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary dark:text-primary-light">
												{selectedTeams.length}
											</span>
										)}
									</div>
									{selectedTeams.length > 0 && (
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
											className="text-primary dark:text-primary-light hover:opacity-80 cursor-pointer text-[12px]"
										>
											{t('common.CLEAR')}
										</button>
									)}
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
									<div className="flex gap-2 items-center">
										<span className="text-[12px]">{t('common.MEMBER')}</span>
										{selectedMembers.length > 0 && (
											<span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary dark:text-primary-light">
												{selectedMembers.length}
											</span>
										)}
									</div>
									{selectedMembers.length > 0 && (
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
											className="text-primary dark:text-primary-light hover:opacity-80 cursor-pointer text-[12px]"
										>
											{t('common.CLEAR')}
										</button>
									)}
								</label>
								<MultiSelect
									localStorageKey="time-activity-select-filter-member"
									removeItems={shouldRemoveItems}
									items={availableMembers}
									itemToString={(member) => member?.employee?.fullName || ''}
									itemId={(item) => item?.employee?.id || item?.id}
									onValueChange={(selectedItems) => setSelectedMembers(selectedItems as any)}
									multiSelect={true}
									triggerClassName="dark:border-gray-700"
								/>
							</div>
							<div className="">
								<label className="flex justify-between mb-1 text-sm text-gray-600">
									<div className="flex gap-2 items-center">
										<span className="text-[12px]">{t('sidebar.PROJECTS')}</span>
										{selectedProjects.length > 0 && (
											<span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary dark:text-primary-light">
												{selectedProjects.length}
											</span>
										)}
									</div>
									{selectedProjects.length > 0 && (
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
											className="text-primary dark:text-primary-light hover:opacity-80 cursor-pointer text-[12px]"
										>
											{t('common.CLEAR')}
										</button>
									)}
								</label>
								<MultiSelect
									localStorageKey="time-activity-select-filter-projects"
									removeItems={shouldRemoveItems}
									items={validProjects}
									itemToString={(project) => project?.name || ''}
									itemId={(item) => item?.id}
									onValueChange={(selectedItems) => setSelectedProjects(selectedItems as any)}
									multiSelect={true}
									triggerClassName="dark:border-gray-700"
								/>
							</div>
							<div className="">
								<label className="flex justify-between mb-1 text-sm text-gray-600">
									<div className="flex gap-2 items-center">
										<span className="text-[12px]">{t('hotkeys.TASK')}</span>
										{selectedTasks.length > 0 && (
											<span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary dark:text-primary-light">
												{selectedTasks.length}
											</span>
										)}
									</div>
									{selectedTasks.length > 0 && (
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
											className="text-primary dark:text-primary-light hover:opacity-80 cursor-pointer text-[12px]"
										>
											{t('common.CLEAR')}
										</button>
									)}
								</label>
								<MultiSelect
									localStorageKey="time-activity-select-filter-task"
									removeItems={shouldRemoveItems}
									items={availableTasks}
									itemToString={formatTaskDisplay}
									itemId={(item) => item?.id}
									onValueChange={(selectedItems) => setSelectedTasks(selectedItems as any)}
									multiSelect={true}
									triggerClassName="dark:border-gray-700"
									renderItem={renderTaskItem}
									popoverClassName="max-h-[300px] overflow-y-auto"
								/>
							</div>
							<div className="flex gap-x-4 justify-end items-center w-full">
								<Button
									onClick={clearAllFilters}
									variant={'outline'}
									className="flex justify-center items-center h-10 text-sm rounded-lg transition-colors dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
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
									className="flex justify-center items-center h-10 text-sm rounded-lg transition-opacity bg-primary dark:bg-primary-light dark:text-gray-300 hover:opacity-90"
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
