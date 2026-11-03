import { useTaskInput } from '@/core/hooks';
import { Spinner } from '@/core/components/common/spinner';
import DeleteTask from '@/core/components/features/tasks/delete-task';
import TaskFilter from '@/core/components/tasks/task-filter';
import { CreateTaskOption } from '@/core/components/tasks/task-list';
import { TaskItem } from '@/core/components/tasks/task-item';
import {
	Combobox,
	ComboboxButton,
	ComboboxInput,
	ComboboxOptions,
	Popover,
	PopoverButton,
	PopoverPanel,
	Transition
} from '@headlessui/react';
import {
	Clock,
	MoreVertical as EllipsisVerticalIcon,
	Pencil,
	Timer,
	UserAdd,
	UserCheck,
	UserRemove
} from '@/core/components/icons';
import { useTranslations } from 'next-intl';
import React, { Dispatch, PropsWithChildren, ReactNode, SetStateAction, useMemo } from 'react';
import { TOrganizationTeamEmployee } from '@/core/types/schemas';
import { TTask } from '@/core/types/schemas/task/task.schema';
import { cn } from '@/core/lib/helpers';
import {
	MENU_ANCHOR,
	MENU_ANCHORED_PANEL,
	MENU_ROW,
	MENU_SEPARATOR,
	MENU_SURFACE
} from '@/core/components/common/menu-recipes';

interface IOption {
	name: string;
	icon: ReactNode;
	group: OptionGroup;
	handleClick: any;
	extramenu?: boolean;
}

type OptionGroup = 'task' | 'assignment' | 'time';

const OPTION_GROUP_ORDER: OptionGroup[] = ['task', 'assignment', 'time'];

const TASK_LIST_PANEL_ANCHOR = { to: 'left start', gap: 8 } as const;

const TASK_LIST_PANEL_CLASS =
	'z-[1001] w-[578px] rounded-lg bg-card py-[20px] hairline-ring ring-border shadow-md shadow-black/6.5 transition duration-100 ease-out data-closed:opacity-0';

function optionsInGroup(options: IOption[], group: OptionGroup) {
	return options.filter((option) => option.group === group);
}

interface IDropdownUserProps {
	setEdit: Dispatch<SetStateAction<boolean>>;
	setEstimateEdit: Dispatch<SetStateAction<boolean>>;
}

function OptionPopover({ setEdit, setEstimateEdit, children }: PropsWithChildren<IDropdownUserProps>) {
	const t = useTranslations();
	const options: IOption[] = [
		{
			name: t('common.EDIT'),
			icon: <Pencil />,
			group: 'task',
			handleClick: setEdit
		},
		{
			name: t('common.ESTIMATE'),
			icon: <Timer />,
			group: 'task',
			handleClick: setEstimateEdit
		},
		{
			name: t('task.ASSIGN_NEW_TASK'),
			icon: <UserAdd />,
			group: 'assignment',
			handleClick: () => {
				//
			},
			extramenu: true
		},
		{
			name: t('task.taskLabel.TASK_UNASSIGNED'),
			icon: <UserRemove />,
			group: 'assignment',
			handleClick: () => {
				//
			},
			extramenu: true
		},
		{
			name: t('task.taskLabel.TASK_ASSIGNED'),
			icon: <UserCheck />,
			group: 'assignment',
			handleClick: () => {
				//
			}
		},
		{
			name: t('task.taskLabel.WORK_LABEL'),
			icon: <Clock />,
			group: 'time',
			handleClick: () => {
				//
			}
		}
	];

	const optionGroups = OPTION_GROUP_ORDER.map((group) => optionsInGroup(options, group));

	return (
		<Popover className="relative no-underline border-none">
			{() => (
				<>
					<PopoverButton
						aria-label={t('common.MORE_OPTIONS')}
						className="no-underline border-none outline-hidden active:border-none"
					>
						<EllipsisVerticalIcon
							className="h-7 w-7 text-muted-foreground cursor-pointer no-underline"
							aria-hidden="true"
						/>
					</PopoverButton>
					<PopoverPanel anchor={MENU_ANCHOR} transition className={cn(MENU_SURFACE, MENU_ANCHORED_PANEL)}>
						{optionGroups.map((groupOptions, groupIndex) => (
							<React.Fragment key={OPTION_GROUP_ORDER[groupIndex]}>
								{groupIndex > 0 && <hr className={cn(MENU_SEPARATOR, 'border-0')} />}
								{groupOptions.map((option) => {
									const opensTaskList = Boolean(option.extramenu);
									return (
										<React.Fragment key={option.name}>
											{!opensTaskList && (
												<button onClick={option.handleClick} className={MENU_ROW}>
													{option.icon}
													{option.name}
												</button>
											)}
											{opensTaskList && (
												<Popover className="relative no-underline border-none">
													<PopoverButton onClick={option.handleClick} className={MENU_ROW}>
														{option.icon}
														{option.name}
													</PopoverButton>
													<PopoverPanel
														anchor={TASK_LIST_PANEL_ANCHOR}
														transition
														className={TASK_LIST_PANEL_CLASS}
													>
														{children}
													</PopoverPanel>
												</Popover>
											)}
										</React.Fragment>
									);
								})}
							</React.Fragment>
						))}
					</PopoverPanel>
				</>
			)}
		</Popover>
	);
}

const UserCardMenu = ({ setEstimateEdit, setEdit }: IDropdownUserProps & { member: TOrganizationTeamEmployee }) => {
	const {
		editMode,
		setQuery,
		handleTaskCreation,
		tasksFetching,
		createLoading,
		updateLoading,
		setFilter,
		openTaskCount,
		filter,
		closedTaskCount,
		hasCreateForm,
		filteredTasks,
		handleOpenModal,
		handleReopenTask,
		isModalOpen,
		closeModal,
		closeableTask
	} = useTaskInput({});

	const reversedTask = useMemo(() => {
		return filteredTasks.slice().reverse();
	}, [filteredTasks]);
	const t = useTranslations();
	return (
		<>
			<OptionPopover setEstimateEdit={setEstimateEdit} setEdit={setEdit}>
				{/* Combobox Input task search */}
				<div className="mx-9">
					<Combobox>
						<div className="relative mt-1">
							<div className="relative w-full cursor-default overflow-hidden rounded-lg  bg-foreground/5 text-left shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-white/75 focus-visible:ring-offset-2 focus-visible:ring-offset-teal-300 sm:text-sm ">
								<ComboboxInput
									key={`${editMode}`}
									className="h-[60px] bg-foreground/5 placeholder:text-muted-foreground/75 w-full rounded-lg px-[20px] py-[18px] shadow-sm shadow-black/10"
									displayValue={(task: TTask) => {
										return task ? (!editMode ? `#${task.taskNumber} ` : '') + task.title : '';
									}}
									onChange={(event) => setQuery(event.target.value)}
									onKeyDown={(event: any) => {
										if (event.key === 'Enter') {
											handleTaskCreation({ autoActiveTask: false });
										}
									}}
									autoComplete="off"
									placeholder={t('form.TASK_INPUT_PLACEHOLDER')}
									readOnly={tasksFetching}
								/>
								<ComboboxButton className="absolute inset-y-0 right-0 flex items-center pr-2">
									{tasksFetching || createLoading || updateLoading ? <Spinner dark={false} /> : <></>}
								</ComboboxButton>
							</div>
							<Transition
								as="div"
								leave="transition ease-in duration-100"
								leaveFrom="opacity-100"
								leaveTo="opacity-0"
								afterLeave={() => {
									!createLoading && setQuery('');
									setFilter('open');
								}}
							>
								<ComboboxOptions className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-card py-1 text-base shadow-md shadow-black/6.5 hairline-ring ring-border focus:outline-none sm:text-sm">
									{hasCreateForm && (
										<CreateTaskOption
											onClick={() => handleTaskCreation({ autoActiveTask: false })}
											loading={createLoading}
										/>
									)}
								</ComboboxOptions>
							</Transition>
						</div>
					</Combobox>
				</div>

				{/* task filter (closed or open) */}
				<div className="ml-9 flex items-center justify-start space-x-2 mb-4 mt-[26px]">
					<TaskFilter
						count={openTaskCount}
						type="open"
						selected={filter === 'open'}
						handleChange={() => setFilter('open')}
					/>
					<TaskFilter
						count={closedTaskCount}
						type="closed"
						selected={filter === 'closed'}
						handleChange={() => setFilter('closed')}
					/>
				</div>

				{/* task list */}
				{reversedTask.map((task) => (
					<div key={task.id} className="cursor-pointer px-9">
						<div className="py-2">
							<TaskItem
								selected={false}
								active={false}
								item={task}
								onDelete={() => handleOpenModal(task)}
								onReopen={() => handleReopenTask(task)}
								updateLoading={updateLoading}
							/>
						</div>
						<div className="w-full h-[1px] bg-border" />
					</div>
				))}
			</OptionPopover>
			<DeleteTask isOpen={isModalOpen} closeModal={closeModal} task={closeableTask} />
		</>
	);
};

export default UserCardMenu;
