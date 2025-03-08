import React from 'react';
import { Button } from '@components/ui/button';
import { MultiSelect } from 'lib/components/custom-select';
import { Popover, PopoverContent, PopoverTrigger } from '@components/ui/popover';
import { SettingFilterIcon } from '@/assets/svg';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { IOrganizationTeamList, IProject, ITeamTask } from '@/app/interfaces';

interface TimeActivityHeaderProps {
    userManagedTeams?: IOrganizationTeamList[];
    projects?: IProject[];
    tasks?:ITeamTask[]
	activeTeam?:IOrganizationTeamList|null
}

export const TimeActivityFilterPopover = React.memo(function TimeActivityFilterPopover({ userManagedTeams, projects, tasks, activeTeam }: TimeActivityHeaderProps) {
	const [shouldRemoveItems, setShouldRemoveItems] = React.useState(false);
	const [selectedTeams, setSelectedTeams] = React.useState([]);
	const [selectedMembers, setSelectedMembers] = React.useState([]);
	const [selectedProjects, setSelectedProjects] = React.useState([]);
	const [selectedTasks, setSelectedTasks] = React.useState([]);
	const t = useTranslations();

	const totalFilteredItems = React.useMemo(() => {
		return selectedTeams.length + selectedMembers.length + selectedProjects.length + selectedTasks.length;
	}, [selectedTeams, selectedMembers, selectedProjects, selectedTasks]);
	return (
		<>
			<Popover>
				<PopoverTrigger asChild>
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
									<span className="text-[12px]">{t('common.TEAM')}</span>
									<span
										className={cn(
											'text-primary/10',
											'text-primary dark:text-primary-light'
										)}
									>
										{t('common.CLEAR')}
									</span>
								</label>
								<MultiSelect
									localStorageKey="time-activity-select-filter-teams"
									removeItems={shouldRemoveItems}
									items={userManagedTeams || []}
									itemToString={(team) => (team.name)}
									itemId={(item) =>item.id}
									onValueChange={(selectedItems) => selectedItems}
									multiSelect={true}
									triggerClassName="dark:border-gray-700"
								/>
							</div>
							<div className="">
								<label className="flex justify-between mb-1 text-sm text-gray-600">
									<span className="text-[12px]">{t('common.MEMBER')}</span>
									<span
										className={cn(
											'text-primary/10',
											'text-primary dark:text-primary-light'
										)}
									>
										{t('common.CLEAR')}
									</span>
								</label>
								<MultiSelect
									localStorageKey="time-activity-select-filter-member"
									removeItems={shouldRemoveItems}
									items={activeTeam?.members || []}
									itemToString={(member) => (member?.employee.fullName || '')}
									itemId={(item) =>item?.id}
									onValueChange={(selectedItems) => selectedItems}
									multiSelect={true}
									triggerClassName="dark:border-gray-700"
								/>
							</div>
							<div className="">
								<label className="flex justify-between mb-1 text-sm text-gray-600">
									<span className="text-[12px]">{t('sidebar.PROJECTS')}</span>
									<span
										className={cn(
											'text-primary/10',
											'text-primary dark:text-primary-light'
										)}
									>
										{t('common.CLEAR')}
									</span>
								</label>
								<MultiSelect
									localStorageKey="time-activity-select-filter-projects"
									removeItems={shouldRemoveItems}
									items={projects || []}
									itemToString={(project) => (project?.name || '')}
									itemId={(item) =>item?.id}
									onValueChange={(selectedItems) => selectedItems}
									multiSelect={true}
									triggerClassName="dark:border-gray-700"
								/>
							</div>
							<div className="">
								<label className="flex justify-between mb-1 text-sm text-gray-600">
									<span className="text-[12px]">{t('hotkeys.TASK')}</span>
									<span
										className={cn(
											'text-primary/10',
											'text-primary dark:text-primary-light'
										)}>
										{t('common.CLEAR')}
									</span>
								</label>
								<MultiSelect
									localStorageKey="time-activity-select-filter-task"
									removeItems={shouldRemoveItems}
									items={tasks || []}
									itemToString={(task) => (task?.title || '')}
									itemId={(item) =>item?.id}
									onValueChange={setSelectedTasks}
									multiSelect={true}
									triggerClassName="dark:border-gray-700"
								/>
							</div>
							<div className="flex gap-x-4 justify-end items-center w-full">
								<Button
									onClick={() => {
							setShouldRemoveItems(true);
							setSelectedTeams([]);
							setSelectedMembers([]);
							setSelectedProjects([]);
							setSelectedTasks([]);
						}}
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
		</>
	);
});
