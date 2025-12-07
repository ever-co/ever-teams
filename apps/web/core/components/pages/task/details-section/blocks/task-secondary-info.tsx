import { useModal, useTeamTasks } from '@/core/hooks';
import { activeTeamState, detailedTaskState, isTeamManagerState } from '@/core/stores';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { ERoleName } from '@/core/types/generics/enums/role';
import { PlusIcon, ChevronDownIcon } from '@heroicons/react/20/solid';
import { Button, Modal, SpinnerLoader } from '@/core/components';
import { TaskVersionForm } from '@/core/components/tasks/version-form';
import { cloneDeep } from 'lodash';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAtomValue } from 'jotai';
import TaskRow from '../components/task-row';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { AddIcon, CircleIcon, Square4OutlineIcon, TrashIcon } from 'assets/svg';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger
} from '@/core/components/common/dropdown-menu';
import { clsxm } from '@/core/lib/utils';
import { organizationProjectsState } from '@/core/stores/projects/organization-projects';
import { isValidProjectForDisplay, projectBelongsToTeam, projectHasNoTeams } from '@/core/lib/helpers/type-guards';
import { ScrollArea, ScrollBar } from '@/core/components/common/scroll-bar';
import Image from 'next/image';
import {
	ActiveTaskPropertiesDropdown,
	ActiveTaskSizesDropdown,
	ActiveTaskStatusDropdown,
	ActiveTaskVersionDropdown,
	EpicPropertiesDropdown as TaskEpicDropdown,
	TaskStatus
} from '@/core/components/tasks/task-status';
import { TaskLabels } from '@/core/components/tasks/task-labels';
import { TaskStatusesForm } from '@/core/components/tasks/task-statuses-form';
import { TaskPrioritiesForm } from '@/core/components/tasks/task-priorities-form';
import { TaskSizesForm } from '@/core/components/tasks/task-sizes-form';
import { Tooltip } from '@/core/components/duplicated-components/tooltip';
import { EverCard } from '@/core/components/common/ever-card';
import { QuickCreateProjectModal } from '@/core/components/features/projects/quick-create-project-modal';
import { EIssueType } from '@/core/types/generics/enums/task';
import { TOrganizationProject, TTaskVersion } from '@/core/types/schemas';
import { TTask } from '@/core/types/schemas/task/task.schema';
import { useTaskLabelsValue } from '@/core/hooks/tasks/use-task-labels-value';
import { cn } from '@/core/lib/helpers';

type StatusType = 'version' | 'epic' | 'status' | 'label' | 'size' | 'priority';

const TaskSecondaryInfo = () => {
	const task = useAtomValue(detailedTaskState);
	const { updateTask } = useTeamTasks();

	const { handleStatusUpdate } = useTeamTasks();

	const t = useTranslations();

	const modal = useModal();
	const [formTarget, setFormTarget] = useState<StatusType | null>(null);

	const openModalEditionHandle = useCallback(
		(type: StatusType) => {
			return () => {
				setFormTarget(type);
				modal.openModal();
			};
		},
		[modal]
	);

	const onVersionCreated = useCallback(
		(version: TTaskVersion) => {
			handleStatusUpdate(version.value || version.name, 'version', task?.taskStatusId, task);
		},
		[task, handleStatusUpdate]
	);

	const onTaskSelect = useCallback(
		async (parentTask: TTask | undefined) => {
			if (!parentTask) return;
			const childTask = cloneDeep(task);

			await updateTask({
				...childTask,
				parentId: parentTask.id ? parentTask.id : null,
				parent: parentTask.id ? { ...parentTask, id: parentTask.id } : null
			} as any);
		},
		[task, updateTask]
	);

	const taskLabels = useTaskLabelsValue();

	const tags = useMemo(() => {
		return (
			task?.tags
				?.map((tag) => {
					return taskLabels[tag.name];
				})
				.filter(Boolean) || []
		);
	}, [taskLabels, task?.tags]);

	return (
		<section className="flex flex-col gap-4 p-3.75">
			{/* Version */}
			<TaskRow labelTitle={t('pages.taskDetails.VERSION')}>
				<ActiveTaskVersionDropdown
					task={task}
					className="lg:min-w-[130px] text-black"
					forDetails={true}
					sidebarUI={true}
					taskStatusClassName="text-[0.625rem] w-[7.6875rem] h-[2.35rem] max-w-[7.6875rem] rounded-sm 3xl:text-xs"
				>
					<Button
						className="w-full px-2 py-1 mt-3 text-[0.625rem] dark:text-white dark:border-white"
						variant="outline"
						onClick={openModalEditionHandle('version')}
					>
						<PlusIcon className="w-4 h-4" />
					</Button>
				</ActiveTaskVersionDropdown>
			</TaskRow>

			{/* Epic */}
			{task && task.issueType === EIssueType.STORY && (
				<TaskRow labelTitle={t('pages.taskDetails.EPIC')}>
					<TaskEpicDropdown
						onValueChange={(d: string) => {
							onTaskSelect({
								id: d
							} as TTask);
						}}
						className="min-w-fit lg:max-w-[170px] text-black"
						forDetails={true}
						sidebarUI={true}
						taskStatusClassName="text-[0.625rem] w-[7.6875rem] h-[2.35rem] max-w-[7.6875rem] rounded-sm 3xl:text-xs"
						defaultValue={task.parentId || ''}
					/>
				</TaskRow>
			)}

			{task && <EpicParent task={task} />}

			{/* Task Status */}
			<TaskRow labelTitle={t('pages.taskDetails.STATUS')}>
				<ActiveTaskStatusDropdown
					task={task}
					className="lg:min-w-[130px] text-black"
					forDetails={true}
					sidebarUI={true}
					taskStatusClassName="text-[0.625rem] w-[7.6875rem] h-[2.35rem] max-w-[7.6875rem] rounded-sm 3xl:text-xs"
				>
					<Button
						className="w-full px-2 py-1 text-xs dark:text-white dark:border-white"
						variant="outline"
						onClick={openModalEditionHandle('status')}
					>
						<PlusIcon className="w-4 h-4" />
					</Button>
				</ActiveTaskStatusDropdown>
			</TaskRow>

			{/* Task Labels */}
			<TaskRow labelTitle={t('pages.taskDetails.LABELS')}>
				<TaskLabels
					task={task}
					className="lg:min-w-[130px] text-black lg:mt-0"
					forDetails={true}
					taskStatusClassName="text-[0.625rem] h-[2.35rem] min-w-[7.6875rem] rounded-sm 3xl:text-xs"
				/>
			</TaskRow>
			{tags.length > 0 && (
				<TaskRow>
					<div className="flex flex-row flex-wrap gap-1 max-w-[10rem]">
						{tags.map((tag, i) => {
							return (
								<Tooltip key={i} label={tag.name?.split('-').join(' ') || ''} placement="auto">
									<TaskStatus
										{...tag}
										className="rounded-[0.625rem] h-6 max-w-[8rem]"
										active={true}
										name={tag.name?.split('-').join(' ')}
										titleClassName={'text-[0.625rem] font-[500]'}
									/>
								</Tooltip>
							);
						})}
					</div>
				</TaskRow>
			)}

			{/* Task Size */}
			<TaskRow labelTitle={t('pages.taskDetails.SIZE')} wrapperClassName="text-black">
				<ActiveTaskSizesDropdown
					task={task}
					className="lg:min-w-[130px] text-black"
					forDetails={true}
					sidebarUI={true}
					taskStatusClassName="text-[0.625rem] w-[7.6875rem] h-[2.35rem] max-w-[7.6875rem] rounded-sm 3xl:text-xs"
				>
					<Button
						className="w-full px-2 py-1 text-xs dark:text-white dark:border-white"
						variant="outline"
						onClick={openModalEditionHandle('size')}
					>
						<PlusIcon className="w-4 h-4" />
					</Button>
				</ActiveTaskSizesDropdown>
			</TaskRow>

			{/* Task Properties */}
			<TaskRow labelTitle={t('pages.taskDetails.PRIORITY')} wrapperClassName="text-black">
				<ActiveTaskPropertiesDropdown
					task={task}
					className="lg:min-w-[130px] text-black"
					forDetails={true}
					sidebarUI={true}
					taskStatusClassName="text-[0.625rem] w-[7.6875rem] h-[2.35rem] max-w-[7.6875rem] rounded-sm 3xl:text-xs"
				>
					<Button
						className="w-full px-2 py-1 text-xs dark:text-white dark:border-white"
						variant="outline"
						onClick={openModalEditionHandle('priority')}
					>
						<PlusIcon className="w-4 h-4" />
					</Button>
				</ActiveTaskPropertiesDropdown>
			</TaskRow>

			{/* Task project */}
			{task && (
				<TaskRow labelTitle={t('pages.taskDetails.PROJECT')} wrapperClassName="text-black">
					<ProjectDropDown
						styles={{
							listCard: 'rounded-xl',
							container: 'lg:min-w-[130px] text-black overflow-hidden text-ellipsis'
						}}
						task={task}
					/>
				</TaskRow>
			)}
			<Modal isOpen={modal.isOpen} closeModal={modal.closeModal}>
				<EverCard className="sm:w-[530px] w-[330px]" shadow="custom">
					{formTarget === 'version' && (
						<TaskVersionForm
							onVersionCreated={onVersionCreated}
							onCreated={modal.closeModal}
							formOnly={true}
						/>
					)}
					{formTarget === 'status' && <TaskStatusesForm onCreated={modal.closeModal} formOnly={true} />}
					{formTarget === 'priority' && <TaskPrioritiesForm onCreated={modal.closeModal} formOnly={true} />}
					{formTarget === 'size' && <TaskSizesForm onCreated={modal.closeModal} formOnly={true} />}
				</EverCard>
			</Modal>
		</section>
	);
};

const EpicParent = ({ task }: { task: TTask }) => {
	const t = useTranslations();

	if (task?.issueType === EIssueType.STORY) {
		return <></>;
	}

	return (!task?.issueType || task?.issueType === EIssueType.TASK || task?.issueType === EIssueType.BUG) &&
		task?.rootEpic ? (
		<TaskRow labelTitle={t('pages.taskDetails.EPIC')}>
			<Tooltip label={`#${task?.rootEpic?.number} ${task?.rootEpic?.title}`} placement="auto">
				<Link href={`/task/${task?.rootEpic?.id}`} target="_blank">
					<div className="flex items-center w-32">
						<div className="bg-[#8154BA] p-1 rounded-xs mr-1">
							<Square4OutlineIcon className="w-full max-w-[10px] text-white" />
						</div>
						<div className="overflow-hidden text-xs whitespace-nowrap text-ellipsis">{`#${task?.rootEpic?.number} ${task?.rootEpic?.title}`}</div>
					</div>
				</Link>
			</Tooltip>
		</TaskRow>
	) : (
		<></>
	);
};

interface ITaskProjectDropdownProps {
	task?: TTask;
	controlled?: boolean;
	onChange?: (project: TOrganizationProject) => void;
	styles?: {
		container?: string; // The dropdown element
		value?: string;
		listCard?: string; // The listbox
	};
}

export default TaskSecondaryInfo;

/**
 * TaskProject dropdown
 *
 * @param {Object} props - The props object
 * @param {TTask} props.task - The TTask object which
 * @param {boolean} props.controlled - If [true], changes are managed by external handlers (i.e :props.onChange)
 * @param {(project: 	IOrganizationProject) => void} props.onChange - The function called when user selects a value (external handler)
 *
 * @returns {JSX.Element} - The Dropdown element
 */
export function ProjectDropDown(props: ITaskProjectDropdownProps) {
	const { task, controlled = false, onChange, styles } = props;
	const { openModal, isOpen, closeModal } = useModal();
	const organizationProjects = useAtomValue(organizationProjectsState);
	const activeTeam = useAtomValue(activeTeamState);
	const { updateTask, updateLoading } = useTeamTasks();
	const t = useTranslations();

	// Get current user and manager status
	const { data: user } = useUserQuery();
	const isTeamManager = useAtomValue(isTeamManagerState);

	// Check if user can create projects (admin or manager)
	const canCreateProject = useMemo(() => {
		// Check if user has global admin role
		const userRole = user?.role?.name;
		const isGlobalAdmin = userRole === ERoleName.ADMIN || userRole === ERoleName.SUPER_ADMIN;

		// User can create project if they are a global admin or team manager
		return isGlobalAdmin || isTeamManager;
	}, [user?.role?.name, isTeamManager]);

	// Filter to show only valid projects that belong to the active team OR are "Global" projects
	// This ensures we only show REAL projects (not Teams or other entities)
	// AND that belong to the current team OR have no team assigned (Global projects)
	const validProjects = useMemo(() => {
		return organizationProjects.filter((project) => {
			// First check if it's a valid project
			if (!isValidProjectForDisplay(project)) return false;
			if (!activeTeam?.id) return true;
			// Show projects that either:
			// 1. Belong to the active team
			// 2. Have no teams assigned ("Global" projects - accessible to everyone)
			const belongsToTeam = projectBelongsToTeam(project, activeTeam.id);
			const isGlobalProject = projectHasNoTeams(project);
			return belongsToTeam || isGlobalProject;
		});
	}, [organizationProjects, activeTeam?.id]);

	const [selected, setSelected] = useState<TOrganizationProject | null>(null);

	const projectMatch = useMemo(() => {
		return validProjects.find((project) => project.id === task?.projectId);
	}, [validProjects, task?.projectId]);

	// Additional sync for controlled mode
	useEffect(() => {
		setSelected(projectMatch || null);
	}, [controlled, validProjects, task, task?.projectId]);

	// Update the project
	const handleUpdateProject = useCallback(
		async (project: TOrganizationProject) => {
			try {
				if (task) {
					if (task?.projectId === project.id) return;
					await updateTask({ ...task, projectId: project.id });
					// Update local selected state immediately for optimistic UI
					setSelected(project);
					toast.success('Task project updated successfully', {
						description: `Project changed to "${project.name}"`
					});
				}
			} catch (error) {
				console.error(error);
				toast.error('Failed to update task project', {
					description: (error as any)?.message || 'Please try again'
				});
			}
		},
		[task, updateTask]
	);

	// Remove the project
	const handleRemoveProject = useCallback(async () => {
		try {
			if (task) {
				if (!task?.projectId) return;
				await updateTask({ ...task, projectId: null });
				setSelected(null);
			}
		} catch (error) {
			console.error(error);
		}
	}, [task, updateTask]);

	return (
		<>
			<div
				className={clsxm(
					'relative text-xs font-medium border text-[0.625rem] w-fit h-fit max-w-32 min-w-24 rounded-[8px]!',
					styles?.container
				)}
			>
				<DropdownMenu>
					<div className="w-full">
						<DropdownMenuTrigger className="w-full" asChild>
							<button
								className={clsxm(
									`cursor-pointer outline-hidden min-w-fit w-full flex dark:text-white
										items-center justify-between h-fit p-1
										border-solid border-color-[#F2F2F2]
										dark:bg-[#1B1D22] dark:border dark:border-gray-800 gap-[.4rem] rounded-lg`,
									styles?.value
								)}
								aria-label={selected ? `Current project: ${selected.name}` : 'Select a project'}
							>
								<div className="flex items-center gap-1 w-fit">
									{selected?.imageUrl ? (
										<Image
											className="w-4 h-4 rounded-full"
											src={selected.imageUrl}
											alt={selected.name || ''}
											width={25}
											height={25}
										/>
									) : (
										<CircleIcon
											className={clsxm(
												'w-4 h-4',
												!selected && '!text-[#64748b] dark:text-white/70'
											)}
										/>
									)}
									<span
										className={cn(
											'overflow-hidden whitespace-nowrap max-w-20 text-ellipsis',
											!selected && '!text-[#64748b] dark:text-white/70'
										)}
									>
										{selected?.name || t('pages.projects.projectTitle.SINGULAR')}
									</span>
								</div>

								{updateLoading ? (
									<SpinnerLoader size={10} />
								) : (
									<ChevronDownIcon
										className={clsxm(
											'w-5 h-5 transition duration-150 ease-in-out group-hover:text-default/80 dark:group-hover:text-white/80 text-default dark:text-white'
										)}
										aria-hidden="true"
									/>
								)}
							</button>
						</DropdownMenuTrigger>

						<DropdownMenuContent
							className={clsxm('z-9999 min-w-full outline-hidden w-max p-0', styles?.listCard)}
							style={{
								maxHeight: 'calc(100vh - 100%)',
								overflow: 'auto'
							}}
							align="end"
							sideOffset={8}
						>
							<EverCard
								shadow="bigger"
								className={clsxm(
									'p-0 md:p-4 shadow-xl card dark:shadow-lg card-white dark:bg-[#1c1f26] dark:border dark:border-transparent flex flex-col gap-2.5 min-h-24  h-52  max-h-52 overflow-x-auto rounded-none overflow-hidden',
									styles?.listCard
								)}
							>
								<ScrollArea className="w-full h-full! ">
									<div className="flex flex-col gap-2.5 h-44  w-full">
										{validProjects?.map((item) => {
											return (
												<DropdownMenuItem
													key={item.id}
													onSelect={() => {
														setSelected(item);
														if (controlled && onChange) {
															onChange(item);
														} else {
															handleUpdateProject(item);
														}
													}}
													className="relative border flex items-center gap-2 p-1.5 rounded-lg outline-hidden cursor-pointer dark:text-white"
												>
													{item.imageUrl && (
														<Image
															src={item.imageUrl}
															alt={item.name || ''}
															width={20}
															height={20}
															className="flex-none rounded-full shrink-0 aspect-square"
														/>
													)}
													<span className="w-full overflow-hidden text-xs truncate max-w-32 text-ellipsis">
														{item.name || 'Project'}
													</span>
												</DropdownMenuItem>
											);
										})}
										<div className="mt-auto">
											{!controlled && (
												<Button
													className=" px-2 py-1 w-full justify-start! gap-2!  min-w-min! h-8 rounded-lg text-xs dark:text-white dark:border-gray-800"
													variant="outline"
													onClick={handleRemoveProject}
												>
													<TrashIcon className="w-5" /> {t('common.REMOVE')}
												</Button>
											)}
											{/* Only show create button for admins and managers */}
											{canCreateProject && (
												<Button
													className=" px-2 py-1 mt-2 w-full justify-start! min-w-min! h-8 rounded-lg text-xs dark:text-white dark:border-white"
													variant="outline"
													onClick={openModal}
												>
													<AddIcon className="w-3 h-3 text-dark dark:text-white" />{' '}
													<span className="truncate">{t('common.CREATE_NEW')}</span>
												</Button>
											)}
										</div>
									</div>
									<ScrollBar className="-pr-60" />
								</ScrollArea>
							</EverCard>
						</DropdownMenuContent>
					</div>
				</DropdownMenu>
			</div>
			<QuickCreateProjectModal
				onSuccess={(project) => {
					setSelected(project);
					onChange?.(project);
					if (!controlled) {
						handleUpdateProject(project);
					}
				}}
				open={isOpen}
				closeModal={closeModal}
			/>
		</>
	);
}
