import { useTaskInput } from '@/core/hooks';
import { ITask } from '@/core/types/interfaces/task/ITask';
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
import { EllipsisVerticalIcon } from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';
import React, { Dispatch, PropsWithChildren, SetStateAction, useMemo, useState } from 'react';
import { usePopper } from 'react-popper';
import { IOrganizationTeamEmployee } from '@/core/types/interfaces/team/IOrganizationTeamEmployee';

interface IOption {
	name: string;
	handleClick: any;
	extramenu?: boolean;
}

type IMember = IOrganizationTeamEmployee;

interface IDropdownUserProps {
	setEdit: Dispatch<SetStateAction<boolean>>;
	setEstimateEdit: Dispatch<SetStateAction<boolean>>;
}

function OptionPopover({ setEdit, setEstimateEdit, children }: PropsWithChildren<IDropdownUserProps>) {
	const [referenceElement, setReferenceElement] = useState<Element | null | undefined>();
	const [popperElement, setPopperElement] = useState<HTMLElement | null | undefined>();
	const { styles, attributes } = usePopper(referenceElement, popperElement, {
		placement: 'left'
	});
	const t = useTranslations();
	const options: IOption[] = [
		{
			name: t('common.EDIT'),
			handleClick: setEdit
		},
		{
			name: t('common.ESTIMATE'),
			handleClick: setEstimateEdit
		},
		{
			name: t('task.ASSIGN_NEW_TASK'),
			handleClick: () => {
				//
			},
			extramenu: true
		},
		{
			name: t('task.taskLabel.TASK_UNASSIGNED'),
			handleClick: () => {
				//
			},
			extramenu: true
		},
		{
			name: t('task.taskLabel.TASK_ASSIGNED'),
			handleClick: () => {
				//
			}
		},
		{
			name: t('task.taskLabel.WORK_LABEL'),
			handleClick: () => {
				//
			}
		}
	];

	return (
		<Popover className="relative no-underline border-none">
			{() => (
				<>
					<PopoverButton className="no-underline border-none outline-none active:border-none">
						<EllipsisVerticalIcon
							className="h-7 w-7 text-gray-300 dark:text-[#616164] cursor-pointer no-underline"
							aria-hidden="true"
						/>
					</PopoverButton>
					<Transition
						as="div"
						enter="transition ease-out duration-200"
						enterFrom="opacity-0 translate-y-1"
						enterTo="opacity-100 translate-y-0"
						leave="transition ease-in duration-150"
						leaveFrom="opacity-100 translate-y-0"
						leaveTo="opacity-0 translate-y-1"
					>
						<PopoverPanel className="absolute left-1/2 z-10 mt-3 w-[150px] max-w-sm -translate-x-1/2 transform px-4 sm:px-0 lg:max-w-3xl drop-shadow-[0px_3px_15px_#3E1DAD1A]">
							<div className="bg-white shadow dark:bg-[#18181B] rounded-[10px] text-[14px] font-light">
								{options.map((option) =>
									!option.extramenu ? (
										<React.Fragment key={option.name}>
											<button
												onClick={option.handleClick}
												className="hover:bg-gray-100 dark:hover:bg-[#202023] dark:hover:text-white py-2 px-4 mt-1 flex items-center text-gray-600 dark:text-gray-200 justify-start w-full"
											>
												{option.name}
											</button>
										</React.Fragment>
									) : (
										<Popover key={option.name} className="relative no-underline border-none">
											{() => (
												<>
													<PopoverButton
														onClick={option.handleClick}
														ref={setReferenceElement}
														className="outline-none  hover:bg-gray-100 dark:hover:bg-[#202023] dark:hover:text-white py-2 px-4 mt-1 flex items-center text-gray-600 dark:text-gray-200 justify-start w-full"
													>
														{option.name}{' '}
													</PopoverButton>
													<Transition
														as="div"
														enter="transition ease-out duration-200"
														enterFrom="opacity-0 translate-y-1"
														enterTo="opacity-100 translate-y-0"
														leave="transition ease-in duration-150"
														leaveFrom="opacity-100 translate-y-0"
														leaveTo="opacity-0 translate-y-1"
													>
														<PopoverPanel
															ref={setPopperElement}
															style={styles.popper}
															{...attributes.popper}
															className="w-[578px] bg-[#FFFFFF] dark:bg-[#1B1B1E] rounded-[10px] drop-shadow-[0px_3px_15px_#3E1DAD1A] dark:drop-shadow-[0px_3px_15px_#0000000D] py-[20px]"
														>
															{children}
														</PopoverPanel>
													</Transition>
												</>
											)}
										</Popover>
									)
								)}
							</div>
						</PopoverPanel>
					</Transition>
				</>
			)}
		</Popover>
	);
}

const UserCardMenu = ({ setEstimateEdit, setEdit }: IDropdownUserProps & { member: IMember }) => {
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
							<div className="relative w-full cursor-default overflow-hidden rounded-lg  bg-[#EEEFF5] dark:bg-[#1B1B1E] text-left shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 focus-visible:ring-offset-2 focus-visible:ring-offset-teal-300 sm:text-sm ">
								<ComboboxInput
									key={`${editMode}`}
									className="h-[60px] bg-[#EEEFF5] dark:bg-[#202023] placeholder-[#9490A0] dark:placeholder-[#616164] w-full rounded-[10px] px-[20px] py-[18px] shadow-inner"
									displayValue={(task: ITask) => {
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
								<ComboboxOptions className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-[#FFFFFF] dark:bg-[#1B1B1E] py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
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
						<div className="w-full h-[1px] bg-[#EDEEF2] dark:bg-gray-700" />
					</div>
				))}
			</OptionPopover>
			<DeleteTask isOpen={isModalOpen} closeModal={closeModal} task={closeableTask} />
		</>
	);
};

export default UserCardMenu;
