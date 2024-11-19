import { useModal, useOrganizationProjects, useTeamTasks } from '@app/hooks';
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
import {
  TaskPrioritiesForm,
  TaskSizesForm,
  TaskStatusesForm
} from 'lib/settings';
import { VersionForm } from 'lib/settings/version-form';
import { cloneDeep } from 'lodash';
import Link from 'next/link';
import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { useAtomValue } from 'jotai';
import TaskRow from '../components/task-row';
import { useTranslations } from 'next-intl';
import { ChevronDownIcon, Square4OutlineIcon } from 'assets/svg';
import { Listbox, Transition } from '@headlessui/react';
import { clsxm } from '@/app/utils';
import { organizationProjectsState } from '@/app/stores/organization-projects';

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
      handleStatusUpdate(
        version.value || version.name,
        'version',
        task?.taskStatusId,
        task
      );
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
					<ProjectDropDown task={task} />
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

  return (!task?.issueType ||
    task?.issueType === 'Task' ||
    task?.issueType === 'Bug') &&
    task?.rootEpic ? (
    <TaskRow labelTitle={t('pages.taskDetails.EPIC')}>
      <Tooltip
        label={`#${task?.rootEpic?.number} ${task?.rootEpic?.title}`}
        placement="auto"
      >
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
	task: ITeamTask;
}

export default TaskSecondaryInfo;

/**
 * TaskProject dropdown
 *
 * @param {Object} props - The props object
 * @param {ITeamTask} props.task - The ITeamTask object which
 *
 * @returns {JSX.Element} - The Dropdown element
 */
function ProjectDropDown (props : ITaskProjectDropdownProps) {

	const {task} = props

	const organizationProjects = useAtomValue(organizationProjectsState)
	const {getOrganizationProjects} = useOrganizationProjects()
	const {updateTask, updateLoading} = useTeamTasks()
	const t = useTranslations()

	useEffect(() => {
		getOrganizationProjects()
	},[getOrganizationProjects])


	const [selected, setSelected] = useState<IProject>();

	// Set the task project if any
	useEffect(() => {
		setSelected(organizationProjects.find(project => {
			return  project.id === task.projectId
		}))
	},[organizationProjects, task.projectId])

	// Update the project
	const handleUpdateProject = useCallback(async (project : IProject) => {
		try {
			await updateTask({ ...task, projectId: project.id });

			setSelected(project);
		} catch (error) {
			console.error(error);
		}
	},[task, updateTask])


	// Remove the project
	const handleRemoveProject = useCallback(async () => {
		try {
			await updateTask({ ...task, projectId: null });

			setSelected(undefined);
		} catch (error) {
			console.error(error);
		}
	}, [task, updateTask]);

	return (
		<div
			className={clsxm(
				'relative  text-sm font-medium border text-[0.625rem] w-[7.6875rem] h-[2.35rem] max-w-[7.6875rem] rounded 3xl:text-xs'
			)}
		>
			<Listbox
				value={selected}
				onChange={handleUpdateProject}
			>
				{({ open }) => {
					return (
						<>
							<Listbox.Button
								className={clsxm(
									'cursor-pointer outline-none w-full flex items-center justify-between px-4 h-full '
								)}
							>
								{updateLoading ? (
									<SpinnerLoader size={10} />
								) : (
									<p className=" truncate ">{selected?.name ?? 'Project'}</p>
								)}
								<ChevronDownIcon
									className={clsxm(
										'h-4 w-4 text-default transition duration-150 ease-in-out group-hover:text-opacity-80'
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
								className={clsxm('absolute right-0 left-0 top-10 z-40 min-w-min outline-none')}
							>
								<Listbox.Options className="outline-none">
									<Card
										shadow="bigger"
										className="p-4 md:p-4 shadow-xlcard dark:shadow-lgcard-white dark:bg-[#1B1D22] dark:border dark:border-[#FFFFFF33] flex flex-col gap-2.5 max-h-[206px] overflow-x-auto rounded-none"
									>
										{organizationProjects.map((item, i) => {
											return (
												<Listbox.Option key={item.id} value={item} as={Fragment}>
													<li className="relative outline-none cursor-pointer">
														{item.name}
													</li>
												</Listbox.Option>
											);
										})}
										<Button
											className=" px-2 py-1 mt-2 !min-w-min rounded-none text-xs dark:text-white dark:border-white"
											variant="outline"
											onClick={handleRemoveProject}
										>
											{t('common.REMOVE')}
										</Button>
									</Card>
								</Listbox.Options>
							</Transition>
						</>
					);
				}}
			</Listbox>
		</div>
	);
}
