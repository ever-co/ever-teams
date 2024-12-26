import { useModal, useOrganizationProjects, useOrganizationTeams, useTeamTasks } from '@app/hooks';
import { IProject, ITaskVersionCreate, ITeamTask } from '@app/interfaces';
import { detailedTaskState } from '@app/stores';
import { PlusIcon } from '@heroicons/react/20/solid';
import { Button, Card, Modal, SpinnerLoader, Tooltip } from 'lib/components';
import {
	ActiveTaskPropertiesDropdown,
	ActiveTaskSizesDropdown,
	ActiveTaskStatusDropdown,
	ActiveTaskVersionDropdown,
	EpicPropertiesDropdown as TaskEpicDropdown,
	TaskLabels,
	TaskStatus,
	useTaskLabelsValue
} from 'lib/features';
import { TaskPrioritiesForm, TaskSizesForm, TaskStatusesForm } from 'lib/settings';
import { VersionForm } from 'lib/settings/version-form';
import { cloneDeep } from 'lodash';
import Link from 'next/link';
import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { useAtomValue } from 'jotai';
import TaskRow from '../components/task-row';
import { useTranslations } from 'next-intl';
import { AddIcon, ChevronDownIcon, Square4OutlineIcon, TrashIcon } from 'assets/svg';
import { Listbox, Transition } from '@headlessui/react';
import { clsxm } from '@/app/utils';
import { organizationProjectsState } from '@/app/stores/organization-projects';
import ProjectIcon from '@components/ui/svgs/project-icon';
import { ScrollArea, ScrollBar } from '@components/ui/scroll-bar';
import { CreateProjectModal } from '@/lib/features/project/create-project-modal';

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
		async (parentTask: ITeamTask | undefined) => {
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
				.map((tag) => {
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
					className="lg:min-w-[170px] text-black"
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
			{task && task.issueType === 'Story' && (
				<TaskRow labelTitle={t('pages.taskDetails.EPIC')}>
					<TaskEpicDropdown
						onValueChange={(d) => {
							onTaskSelect({
								id: d
							} as ITeamTask);
						}}
						className="lg:min-w-[170px] text-black"
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
					className="lg:min-w-[170px] text-black"
					forDetails={true}
					sidebarUI={true}
					taskStatusClassName="text-[0.625rem] w-[7.6875rem] h-[2.35rem] max-w-[7.6875rem] rounded 3xl:text-xs"
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
					className="lg:min-w-[170px] text-black lg:mt-0"
					forDetails={true}
					taskStatusClassName="text-[0.625rem] w-[7.6875rem] h-[2.35rem] max-w-[7.6875rem] rounded 3xl:text-xs"
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
					className="lg:min-w-[170px] text-black"
					forDetails={true}
					sidebarUI={true}
					taskStatusClassName="text-[0.625rem] w-[7.6875rem] h-[2.35rem] max-w-[7.6875rem] rounded 3xl:text-xs"
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
					className="lg:min-w-[170px] text-black rounded-xl"
					forDetails={true}
					sidebarUI={true}
					taskStatusClassName="text-[0.625rem] w-[7.6875rem] h-[2.35rem] max-w-[7.6875rem] rounded 3xl:text-xs"
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
					<ProjectDropDown styles={{ listCard: 'rounded-xl' }} task={task} />
				</TaskRow>
			)}
			<Modal isOpen={modal.isOpen} closeModal={modal.closeModal}>
				<Card className="sm:w-[530px] w-[330px]" shadow="custom">
					{formTarget === 'version' && (
						<VersionForm onVersionCreated={onVersionCreated} onCreated={modal.closeModal} formOnly={true} />
					)}
					{formTarget === 'status' && <TaskStatusesForm onCreated={modal.closeModal} formOnly={true} />}
					{formTarget === 'priority' && <TaskPrioritiesForm onCreated={modal.closeModal} formOnly={true} />}
					{formTarget === 'size' && <TaskSizesForm onCreated={modal.closeModal} formOnly={true} />}
				</Card>
			</Modal>
		</section>
	);
};

const EpicParent = ({ task }: { task: ITeamTask }) => {
	const t = useTranslations();

	if (task?.issueType === 'Story') {
		return <></>;
	}

	return (!task?.issueType || task?.issueType === 'Task' || task?.issueType === 'Bug') && task?.rootEpic ? (
		<TaskRow labelTitle={t('pages.taskDetails.EPIC')}>
			<Tooltip label={`#${task?.rootEpic?.number} ${task?.rootEpic?.title}`} placement="auto">
				<Link href={`/task/${task?.rootEpic?.id}`} target="_blank">
					<div className="flex items-center w-32">
						<div className="bg-[#8154BA] p-1 rounded-sm mr-1">
							<Square4OutlineIcon className="w-full max-w-[10px] text-white" />
						</div>
						<div className="overflow-hidden text-xs text-ellipsis whitespace-nowrap">{`#${task?.rootEpic?.number} ${task?.rootEpic?.title}`}</div>
					</div>
				</Link>
			</Tooltip>
		</TaskRow>
	) : (
		<></>
	);
};

interface ITaskProjectDropdownProps {
	task?: ITeamTask;
	controlled?: boolean;
	onChange?: (project: IProject) => void;
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
 * @param {ITeamTask} props.task - The ITeamTask object which
 * @param {boolean} props.controlled - If [true], changes are managed by external handlers (i.e :props.onChange)
 * @param {(project: IProject) => void} props.onChange - The function called when user selects a value (external handler)
 *
 * @returns {JSX.Element} - The Dropdown element
 */
export function ProjectDropDown(props: ITaskProjectDropdownProps) {
	const { task, controlled = false, onChange, styles } = props;
	const { openModal, isOpen, closeModal } = useModal();
	const organizationProjects = useAtomValue(organizationProjectsState);
	const { getOrganizationProjects } = useOrganizationProjects();
	const { updateTask, updateLoading } = useTeamTasks();
	const { teams } = useOrganizationTeams();
	const t = useTranslations();

	useEffect(() => {
		getOrganizationProjects();
	}, [getOrganizationProjects, teams]);

	const [selected, setSelected] = useState<IProject>();

	// Set the task project if any
	useEffect(() => {
		if (task) {
			setSelected(
				organizationProjects.find((project) => {
					return project.id == task.projectId;
				})
			);
		}
	}, [organizationProjects, task, task?.projectId]);

	// Update the project
	const handleUpdateProject = useCallback(
		async (project: IProject) => {
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
				await updateTask({ ...task, projectId: null });

				setSelected(undefined);
			}
		} catch (error) {
			console.error(error);
		}
	}, [task, updateTask]);

	return (
		<>
			<div
				className={clsxm(
					'relative  text-sm font-medium border text-[0.625rem] w-[7.6875rem] h-[2.35rem] max-w-[7.6875rem] rounded 3xl:text-xs',
					styles?.container
				)}
			>
				<Listbox
					value={selected}
					onChange={(project) => {
						if (controlled && onChange) {
							onChange(project);
						} else {
							handleUpdateProject(project);
						}

						setSelected(project);
					}}
				>
					{({ open }) => {
						return (
							<>
								<Listbox.Button
									className={clsxm(
										`cursor-pointer outline-none w-full flex dark:text-white
									items-center justify-between px-4 h-full
									border-solid border-color-[#F2F2F2]
									dark:bg-[#1B1D22] dark:border dark:border-[#FFFFFF33] rounded-lg`,
										styles?.value
									)}
								>
									{selected && (
										<div className="">
											<ProjectIcon />
										</div>
									)}
									{updateLoading ? (
										<SpinnerLoader size={10} />
									) : (
										<p className={clsxm('truncate', !selected && ' text-slate-400 font-light')}>
											{selected?.name ?? 'Project'}
										</p>
									)}
									<ChevronDownIcon
										className={clsxm(
											'h-4 w-4 text-slate-400 transition duration-150 ease-in-out group-hover:text-opacity-80'
										)}
										aria-hidden="true"
									/>
								</Listbox.Button>

								<Transition
									show={open}
									enter="transition duration-100 ease-out"
									enterFrom="transform scale-95 opacity-0"
									enterTo="transform scale-100 opacity-100"
									leave="transition duration-75 ease-out"
									leaveFrom="transform scale-100 opacity-100"
									leaveTo="transform scale-95 opacity-0"
									className={clsxm('absolute  right-0 left-0 top-10  z-40 min-w-min outline-none')}
								>
									<Listbox.Options className="outline-none">
										<Card
											shadow="bigger"
											className={clsxm(
												'p-0 md:p-0 shadow-xlcard dark:shadow-lgcard-white dark:bg-[#1B1D22] dark:border dark:border-[#FFFFFF33] flex flex-col gap-2.5 h-[13rem] max-h-[13rem] overflow-x-auto rounded-none overflow-hidden',
												styles?.listCard
											)}
										>
											<ScrollArea className="w-full h-full">
												<div className="flex flex-col gap-2.5 w-full p-4">
													{organizationProjects.map((item, i) => {
														return (
															<Listbox.Option key={item.id} value={item} as={Fragment}>
																<li className="relative border h-[2rem] flex items-center gap-1 px-2 rounded-lg outline-none cursor-pointer dark:text-white">
																	<ProjectIcon width={14} height={14} />{' '}
																	<span className=" truncate">{item.name}</span>
																</li>
															</Listbox.Option>
														);
													})}
													<div className="mt-2">
														{!controlled && (
															<Button
																className=" px-2 py-1 w-full !justify-start !gap-2  !min-w-min h-[2rem] rounded-lg text-xs dark:text-white dark:border-white"
																variant="outline"
																onClick={handleRemoveProject}
															>
																<TrashIcon className="w-5 " /> {t('common.REMOVE')}
															</Button>
														)}
														<Button
															className=" px-2 py-1 mt-2 w-full !justify-start !min-w-min h-[2rem] rounded-lg text-xs dark:text-white dark:border-white"
															variant="outline"
															onClick={openModal}
														>
															<AddIcon className="w-3 h-3 text-dark dark:text-white" />{' '}
															<span className=" truncate">{t('common.CREATE_NEW')}</span>
														</Button>
													</div>
												</div>
												<ScrollBar className="-pr-60" />
											</ScrollArea>
										</Card>
									</Listbox.Options>
								</Transition>
							</>
						);
					}}
				</Listbox>
			</div>
			<CreateProjectModal
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
