import { Fragment, useCallback, useMemo, useState } from 'react';
import { Combobox, Transition } from '@headlessui/react';
import { ChevronUpDownIcon } from '@heroicons/react/20/solid';
import { PlusIcon } from '@heroicons/react/24/solid';

import { useTeamTasks } from '@app/hooks/useTeamTasks';
import { ITaskStatus, ITeamTask } from '@app/interfaces/ITask';
import { Spinner } from '../spinner';
import { TaskItem } from './task-item';
import DeleteTask from '../delete-task';
import TaskFilter from './task-filter';

export function CreateTaskOption({
	onClick,
	loading,
}: {
	onClick: () => void;
	loading?: boolean;
}) {
	return (
		<div
			className="relative cursor-pointer select-none py-2 px-4 text-gray-700"
			onClick={!loading ? onClick : undefined}
		>
			<div className="flex items-center justify-start cursor-pointer text-primary dark:text-white">
				<span className="mr-[11px]">
					{loading ? (
						<Spinner dark={false} />
					) : (
						<PlusIcon className=" font-bold w-[16px] h-[16px]" />
					)}
				</span>
				Create new task
			</div>
		</div>
	);
}

function useModal() {
	const [isOpen, setIsOpen] = useState(false);
	const closeModal = useCallback(() => {
		setIsOpen(false);
	}, []);

	const openModal = useCallback(() => {
		setIsOpen(true);
	}, []);

	return {
		isOpen,
		closeModal,
		openModal,
	};
}

export const h_filter = (status: ITaskStatus, filters: 'closed' | 'open') => {
	switch (filters) {
		case 'open':
			return status !== 'Closed';
		case 'closed':
			return status === 'Closed';
		default:
			return true;
	}
};

export default function TaskInput() {
	const { isOpen, openModal, closeModal } = useModal();
	const [closeTask, setCloseTask] = useState<ITeamTask | null>(null);
	const [openFilter, setOpenFilter] = useState(true);
	const [closeFilter, setCloseFilter] = useState(false);
	const {
		tasks,
		activeTeamTask,
		setActiveTask,
		createLoading,
		tasksFetching,
		updateLoading,
		createTask,
		updateTask,
	} = useTeamTasks();
	const [filter, setFilter] = useState<'closed' | 'open'>('open');
	const [editMode, setEditMode] = useState(false);

	const handleOpenModal = (concernedTask: ITeamTask) => {
		setCloseTask(concernedTask);
		openModal();
	};

	const handleReopenTask = (concernedTask: ITeamTask) => {
		if (concernedTask) {
			updateTask({
				...concernedTask,
				status: 'Todo',
			});
		}
	};

	const [query, setQuery] = useState('');

	const filteredTasks = useMemo(() => {
		return query.trim() === ''
			? tasks.filter((task) => h_filter(task.status, filter))
			: tasks.filter(
					(task) =>
						task.title
							.trim()
							.toLowerCase()
							.replace(/\s+/g, '')
							.startsWith(query.toLowerCase().replace(/\s+/g, '')) &&
						h_filter(task.status, filter)
			  );
	}, [query, tasks, filter]);

	const filteredTasks2 = useMemo(() => {
		return query.trim() === ''
			? tasks
			: tasks.filter((task) =>
					task.title
						.trim()
						.toLowerCase()
						.replace(/\s+/g, '')
						.startsWith(query.toLowerCase().replace(/\s+/g, ''))
			  );
	}, [query, tasks]);

	const hasCreateForm = filteredTasks2.length === 0 && query !== '';

	const handleTaskCreation = () => {
		if (query.trim().length < 2) return;
		createTask(query.trim()).then((res) => {
			setQuery('');
			const items = res.data?.items || [];
			const created = items.find((t) => t.title === query.trim());
			if (created) setActiveTask(created);
		});
	};

	return (
		<div className="w-full">
			<Combobox value={activeTeamTask} onChange={setActiveTask}>
				<div className="relative mt-1">
					<div className="relative w-full cursor-default overflow-hidden rounded-lg  bg-[#EEEFF5] dark:bg-[#1B1B1E] text-left shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 focus-visible:ring-offset-2 focus-visible:ring-offset-teal-300 sm:text-sm ">
						<Combobox.Input
							key={`${editMode}`}
							className="h-[60px] bg-[#EEEFF5] dark:bg-[#1B1B1E] placeholder-[#9490A0] dark:placeholder-[#616164] w-full rounded-[10px] px-[20px] py-[18px] shadow-inner"
							displayValue={(task: ITeamTask) => {
								return task
									? (!editMode ? `#${task.taskNumber} ` : '') + task.title
									: '';
							}}
							onFocus={() => setEditMode(true)}
							onBlur={() => setEditMode(false)}
							onChange={(event) => setQuery(event.target.value)}
							onKeyUp={(event: any) => {
								if (event.key === 'Enter') {
									handleTaskCreation();
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
								<ChevronUpDownIcon
									className="h-5 w-5 text-gray-400"
									aria-hidden="true"
								/>
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
							<div className="ml-10 flex items-center justify-start space-x-2 mb-4 mt-2">
								<TaskFilter
									count={
										filteredTasks2.filter((f_task) => {
											return f_task.status !== 'Closed';
										}).length
									}
									type="open"
									selected={openFilter}
									handleChange={() => {
										setOpenFilter(true);
										setCloseFilter(false);
										setFilter('open');
									}}
								/>
								<TaskFilter
									count={
										filteredTasks2.filter((f_task) => {
											return f_task.status === 'Closed';
										}).length
									}
									type="closed"
									selected={closeFilter}
									handleChange={() => {
										if (
											filteredTasks2.filter((f_task) => {
												return f_task.status === 'Closed';
											}).length > 0
										) {
											setCloseFilter(true);
											setOpenFilter(false);
											setFilter('closed');
										}
									}}
								/>
							</div>
							{hasCreateForm ? (
								<CreateTaskOption
									onClick={handleTaskCreation}
									loading={createLoading}
								/>
							) : (
								<>
									{filteredTasks.map((task) => {
										return (
											<Combobox.Option
												key={task.id}
												className={({ active }) =>
													`relative text-[14px] cursor-pointer select-none pl-10 pr-4 text-primary ${
														active
															? 'bg-[#F9FAFB] text-opacity-80 dark:text-white dark:bg-[#202023] cursor-pointer'
															: ' dark:text-white text-opacity-100'
													}`
												}
												value={task}
											>
												{({ selected, active }) => {
													return (
														<div>
															<div className="py-2">
																<TaskItem
																	selected={selected}
																	active={active}
																	item={task}
																	onDelete={() => handleOpenModal(task)}
																	onReopen={() => handleReopenTask(task)}
																	updateLoading={updateLoading}
																/>
															</div>
															<div className="w-full h-[1px] bg-[#EDEEF2] dark:bg-gray-700" />
														</div>
													);
												}}
											</Combobox.Option>
										);
									})}
								</>
							)}
						</Combobox.Options>
					</Transition>
				</div>
			</Combobox>
			<DeleteTask
				isOpen={isOpen}
				closeModal={closeModal}
				Fragment={Fragment}
				task={closeTask}
			/>
		</div>
	);
}
