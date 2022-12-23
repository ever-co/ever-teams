import { IOrganizationTeamList } from '@app/interfaces/IOrganizationTeam';
import { ITeamTask } from '@app/interfaces/ITask';
import { Combobox, Popover, Transition } from '@headlessui/react';
import { EllipsisVerticalIcon } from '@heroicons/react/24/outline';
import React, {
	Dispatch,
	Fragment,
	PropsWithChildren,
	SetStateAction,
	useMemo,
	useState,
} from 'react';
import { usePopper } from 'react-popper';
import DeleteTask from '../../tasks/delete-task';
import { Spinner } from '../../../ui/loaders/spinner';
import TaskFilter from '../../tasks/task-filter';
import { TaskItem } from '../../tasks/task-item';
import { CreateTaskOption, useTaskInput } from '../../tasks/task-input';

interface IOption {
	name: string;
	handleClick: any;
	extramenu?: boolean;
}

type IMember = IOrganizationTeamList['members'][number];

interface IDropdownUserProps {
	setEdit: Dispatch<SetStateAction<boolean>>;
	setEstimateEdit: Dispatch<SetStateAction<boolean>>;
}

function OptionPopover({
	setEdit,
	setEstimateEdit,
	children,
}: PropsWithChildren<IDropdownUserProps>) {
	const [referenceElement, setReferenceElement] = useState<
		Element | null | undefined
	>();
	const [popperElement, setPopperElement] = useState<
		HTMLElement | null | undefined
	>();
	const { styles, attributes } = usePopper(referenceElement, popperElement, {
		placement: 'left',
	});

	const options: IOption[] = [
		{
			name: 'Edit',
			handleClick: setEdit,
		},
		{
			name: 'Estimate',
			handleClick: setEstimateEdit,
		},
		{
			name: 'Assign new task',
			handleClick: () => {
				//
			},
			extramenu: true,
		},
		{
			name: 'Unassign task',
			handleClick: () => {
				//
			},
			extramenu: true,
		},
		{
			name: 'Make a manager ',
			handleClick: () => {
				//
			},
		},
		{
			name: 'Remove',
			handleClick: () => {
				//
			},
		},
	];

	return (
		<Popover className="relative border-none no-underline">
			{() => (
				<>
					<Popover.Button className="border-none outline-none active:border-none no-underline">
						<EllipsisVerticalIcon
							className="h-7 w-7 text-gray-300 dark:text-[#616164] cursor-pointer no-underline"
							aria-hidden="true"
						/>
					</Popover.Button>
					<Transition
						as={Fragment}
						enter="transition ease-out duration-200"
						enterFrom="opacity-0 translate-y-1"
						enterTo="opacity-100 translate-y-0"
						leave="transition ease-in duration-150"
						leaveFrom="opacity-100 translate-y-0"
						leaveTo="opacity-0 translate-y-1"
					>
						<Popover.Panel className="absolute left-1/2 z-10 mt-3 w-[150px] max-w-sm -translate-x-1/2 transform px-4 sm:px-0 lg:max-w-3xl drop-shadow-[0px_3px_15px_#3E1DAD1A]">
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
										<Popover
											key={option.name}
											className="relative border-none no-underline"
										>
											{() => (
												<>
													<Popover.Button
														onClick={option.handleClick}
														ref={setReferenceElement}
														className="outline-none  hover:bg-gray-100 dark:hover:bg-[#202023] dark:hover:text-white py-2 px-4 mt-1 flex items-center text-gray-600 dark:text-gray-200 justify-start w-full"
													>
														{option.name}{' '}
													</Popover.Button>
													<Transition
														as={Fragment}
														enter="transition ease-out duration-200"
														enterFrom="opacity-0 translate-y-1"
														enterTo="opacity-100 translate-y-0"
														leave="transition ease-in duration-150"
														leaveFrom="opacity-100 translate-y-0"
														leaveTo="opacity-0 translate-y-1"
													>
														<Popover.Panel
															ref={setPopperElement}
															style={styles.popper}
															{...attributes.popper}
															className="w-[578px] bg-[#FFFFFF] dark:bg-[#1B1B1E] rounded-[10px] drop-shadow-[0px_3px_15px_#3E1DAD1A] dark:drop-shadow-[0px_3px_15px_#0000000D] py-[20px]"
														>
															{children}
														</Popover.Panel>
													</Transition>
												</>
											)}
										</Popover>
									)
								)}
							</div>
						</Popover.Panel>
					</Transition>
				</>
			)}
		</Popover>
	);
}

const UserCardMenu = ({
	setEstimateEdit,
	setEdit,
}: IDropdownUserProps & { member: IMember }) => {
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
		closeableTask,
	} = useTaskInput();

	const reversedTask = useMemo(() => {
		return filteredTasks.slice().reverse();
	}, [filteredTasks]);

	return (
		<>
			<OptionPopover setEstimateEdit={setEstimateEdit} setEdit={setEdit}>
				{/* Combobox Input task search */}
				<div className="mx-9">
					<Combobox>
						<div className="relative mt-1">
							<div className="relative w-full cursor-default overflow-hidden rounded-lg  bg-[#EEEFF5] dark:bg-[#1B1B1E] text-left shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 focus-visible:ring-offset-2 focus-visible:ring-offset-teal-300 sm:text-sm ">
								<Combobox.Input
									key={`${editMode}`}
									className="h-[60px] bg-[#EEEFF5] dark:bg-[#202023] placeholder-[#9490A0] dark:placeholder-[#616164] w-full rounded-[10px] px-[20px] py-[18px] shadow-inner"
									displayValue={(task: ITeamTask) => {
										return task
											? (!editMode ? `#${task.taskNumber} ` : '') + task.title
											: '';
									}}
									onChange={(event) => setQuery(event.target.value)}
									onKeyDown={(event: any) => {
										if (event.key === 'Enter') {
											handleTaskCreation(false);
										}
									}}
									autoComplete="off"
									placeholder="What you working on?"
									readOnly={tasksFetching}
								/>
								<Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
									{tasksFetching || createLoading || updateLoading ? (
										<Spinner dark={false} />
									) : (
										<></>
									)}
								</Combobox.Button>
							</div>
							<Transition
								as={Fragment}
								leave="transition ease-in duration-100"
								leaveFrom="opacity-100"
								leaveTo="opacity-0"
								afterLeave={() => {
									!createLoading && setQuery('');
									setFilter('open');
								}}
							>
								<Combobox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-[#FFFFFF] dark:bg-[#1B1B1E] py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
									{hasCreateForm && (
										<CreateTaskOption
											onClick={() => handleTaskCreation(false)}
											loading={createLoading}
										/>
									)}
								</Combobox.Options>
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
					<div key={task.id} className="px-9 cursor-pointer">
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
			<DeleteTask
				isOpen={isModalOpen}
				closeModal={closeModal}
				task={closeableTask}
				Fragment={Fragment}
			/>
		</>
	);
};

export default UserCardMenu;
