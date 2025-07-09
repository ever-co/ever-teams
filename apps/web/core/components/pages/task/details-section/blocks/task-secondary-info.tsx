import { useModal, useTeamTasks } from '@/core/hooks';
import { detailedTaskState } from '@/core/stores';
import { PlusIcon } from '@heroicons/react/20/solid';
import { Button, Modal, SpinnerLoader } from '@/core/components';
import { VersionForm } from '@/core/components/tasks/version-form';
import { cloneDeep } from 'lodash';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAtomValue } from 'jotai';
import TaskRow from '../components/task-row';
import { useTranslations } from 'next-intl';
import { AddIcon, CircleIcon, Square4OutlineIcon, TrashIcon } from 'assets/svg';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger
} from '@/core/components/common/dropdown-menu';
import { clsxm } from '@/core/lib/utils';
import { organizationProjectsState } from '@/core/stores/projects/organization-projects';
import { ScrollArea, ScrollBar } from '@/core/components/common/scroll-bar';
import { ChevronDownIcon } from '@heroicons/react/20/solid';
import Image from 'next/image';
import {
	ActiveTaskPropertiesDropdown,
	ActiveTaskSizesDropdown,
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
import { ITaskVersionCreate } from '@/core/types/interfaces/task/task-version';
import { EIssueType } from '@/core/types/generics/enums/task';
import { TOrganizationProject } from '@/core/types/schemas';
import { TTask } from '@/core/types/schemas/task/task.schema';
import { useTaskLabelsValue } from '@/core/hooks/tasks/use-task-labels-value';
import { ActiveTaskStatusDropdown } from '@/core/components/tasks/active-task-status-dropdown';

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
		(version: ITaskVersionCreate) => {
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
				parent: parentTask.id ? parentTask : null
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
		<section className="flex flex-col gap-4 p-[0.9375rem]">
			{/* Version */}
			<TaskRow labelTitle={t('pages.taskDetails.VERSION')}>
				<ActiveTaskVersionDropdown
					task={task}
					className="lg:min-w-[130px] text-black"
					forDetails={true}
					sidebarUI={true}
					taskStatusClassName="text-[0.625rem] w-[7.6875rem] h-[2.35rem] max-w-[7.6875rem] rounded 3xl:text-xs"
				>
					<Button
						className="w-full py-1 px-2 text-[0.625rem] mt-3  dark:text-white dark:border-white"
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
						taskStatusClassName="text-[0.625rem] w-[7.6875rem] h-[2.35rem] max-w-[7.6875rem] rounded 3xl:text-xs"
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
					taskStatusClassName="text-[0.625rem] w-[7.6875rem] h-[2.35rem] max-w-[7.6875rem] rounded 3xl:text-xs"
				>
					<Button
						className="px-2 py-1 w-full text-xs dark:text-white dark:border-white"
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
					taskStatusClassName="text-[0.625rem] h-[2.35rem] min-w-[7.6875rem] rounded 3xl:text-xs"
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
					taskStatusClassName="text-[0.625rem] w-[7.6875rem] h-[2.35rem] max-w-[7.6875rem] rounded 3xl:text-xs"
				>
					<Button
						className="px-2 py-1 w-full text-xs dark:text-white dark:border-white"
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
					taskStatusClassName="text-[0.625rem] w-[7.6875rem] h-[2.35rem] max-w-[7.6875rem] rounded 3xl:text-xs"
				>
					<Button
						className="px-2 py-1 w-full text-xs dark:text-white dark:border-white"
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
					<ProjectDropDown styles={{ listCard: 'rounded-xl' }} task={task} />
				</TaskRow>
			)}
			<Modal isOpen={modal.isOpen} closeModal={modal.closeModal}>
				<EverCard className="sm:w-[530px] w-[330px]" shadow="custom">
					{formTarget === 'version' && (
						<VersionForm onVersionCreated={onVersionCreated} onCreated={modal.closeModal} formOnly={true} />
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
						<div className="bg-[#8154BA] p-1 rounded-sm mr-1">
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
	const { updateTask, updateLoading } = useTeamTasks();
	const t = useTranslations();

	const [selected, setSelected] = useState<TOrganizationProject | null>(() => {
		if (task && task.projectId) {
			return organizationProjects?.find((project) => project.id === task.projectId) || null;
		}
		return null;
	});

	// Keep selected in sync with task project in controlled mode
	useEffect(() => {
		if (controlled && task) {
			const projectMatch = organizationProjects.find((project) => project.id === task.projectId);
			setSelected(projectMatch || null);
		}
	}, [controlled, organizationProjects, task, task?.projectId]);

	// Update the project
	const handleUpdateProject = useCallback(
		async (project: TOrganizationProject) => {
			try {
				if (task) {
					await updateTask({ ...task, projectId: project.id });
				}
			} catch (error) {
				console.error(error);
			}
		},
		[task, updateTask]
	);

	// Remove the project
	const handleRemoveProject = useCallback(async () => {
		try {
			if (task) {
				await updateTask({ ...task, projectId: undefined });
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
					'relative text-xs font-medium border text-[0.625rem] w-fit h-fit max-w-[7.6875rem] rounded-[8px]',
					styles?.container
				)}
			>
				<DropdownMenu>
					<div>
						<DropdownMenuTrigger asChild>
							<button
								className={clsxm(
									`cursor-pointer outline-none min-w-fit w-full flex dark:text-white
										items-center justify-between h-fit p-1
										border-solid border-color-[#F2F2F2]
										dark:bg-[#1B1D22] dark:border dark:border-[#ffffffc1] rounded-[8px]`,
									styles?.value
								)}
								aria-label={selected ? `Current project: ${selected.name}` : 'Select a project'}
							>
								{selected ? (
									<div className="flex gap-1 items-center mx-1 w-fit">
										{selected.imageUrl && (
											<Image
												className="w-4 h-4 rounded-full"
												src={selected.imageUrl}
												alt={selected.name || ''}
												width={25}
												height={25}
											/>
										)}
										<span className="max-w-44 text-ellipsis">
											{updateLoading ? <SpinnerLoader size={10} /> : selected?.name || 'Project'}
										</span>
									</div>
								) : (
									<CircleIcon className="w-4 h-4" />
								)}
								<ChevronDownIcon
									className={clsxm(
										'w-5 h-5 transition duration-150 ease-in-out group-hover:text-opacity-80 text-default dark:text-white'
									)}
									aria-hidden="true"
								/>
							</button>
						</DropdownMenuTrigger>

						<DropdownMenuContent
							className={clsxm('z-[9999] min-w-full outline-none w-max p-0', styles?.listCard)}
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
									'p-0 md:p-0 shadow-xl card dark:shadow-lg card-white dark:bg-[#1B1D22] dark:border dark:border-[#FFFFFF33] flex flex-col gap-2.5 h-[13rem] max-h-[13rem] overflow-x-auto rounded-none overflow-hidden',
									styles?.listCard
								)}
							>
								<ScrollArea className="w-full h-full">
									<div className="flex flex-col gap-2.5 w-full p-4">
										{organizationProjects?.map((item) => {
											return (
												<DropdownMenuItem
													key={item.id}
													onSelect={() => {
														if (controlled && onChange) {
															onChange(item);
														} else {
															handleUpdateProject(item);
															setSelected(item);
														}
													}}
													className="relative border flex items-center gap-2 p-1.5 rounded-lg outline-none cursor-pointer dark:text-white"
												>
													{item.imageUrl && (
														<Image
															src={item.imageUrl}
															alt={item.name || ''}
															width={20}
															height={20}
															className="rounded-full"
														/>
													)}
													<span className="w-full text-xs truncate max-w-64 text-ellipsis">
														{item.name || 'Project'}
													</span>
												</DropdownMenuItem>
											);
										})}
										<div className="mt-2">
											{!controlled && (
												<Button
													className=" px-2 py-1 w-full !justify-start !gap-2  !min-w-min h-[2rem] rounded-lg text-xs dark:text-white dark:border-white"
													variant="outline"
													onClick={handleRemoveProject}
												>
													<TrashIcon className="w-5" /> {t('common.REMOVE')}
												</Button>
											)}
											<Button
												className=" px-2 py-1 mt-2 w-full !justify-start !min-w-min h-[2rem] rounded-lg text-xs dark:text-white dark:border-white"
												variant="outline"
												onClick={openModal}
											>
												<AddIcon className="w-3 h-3 text-dark dark:text-white" />{' '}
												<span className="truncate">{t('common.CREATE_NEW')}</span>
											</Button>
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
