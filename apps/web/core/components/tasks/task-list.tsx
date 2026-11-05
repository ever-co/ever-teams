import { Combobox, Transition } from '@headlessui/react';
import { ChevronsUpDown as ChevronUpDownIcon, Plus as PlusIcon } from '@/core/components/icons';
import { useCallback, useEffect, useState } from 'react';

import { useTaskInput } from '@/core/hooks';
import { Spinner } from '@/core/components/common/spinner';
import { clsxm } from '@/core/lib/utils';
import DeleteTask from '../features/tasks/delete-task';
import TaskFilter from './task-filter';
import { TaskItem } from './task-item';
import { useTranslations } from 'next-intl';
import { TTask } from '@/core/types/schemas/task/task.schema';

export function CreateTaskOption({ onClick, loading }: { onClick: () => void; loading?: boolean }) {
	const t = useTranslations();
	return (
		<div
			className="relative px-3 py-1.5 rounded-md text-foreground cursor-pointer select-none transition-colors hover:bg-foreground/5"
			onClick={!loading ? onClick : undefined}
		>
			<div className="flex justify-start items-center cursor-pointer text-primary-ink">
				<span className="mr-[11px]">
					{loading && <Spinner dark={false} />}
					{!loading && <PlusIcon className="size-4" />}
				</span>
				{t('common.CREATE_TASK')}
			</div>
		</div>
	);
}

export function TasksList({ onClickTask }: { onClickTask?: (task: TTask) => void }) {
	const {
		inputTask,
		setActiveTask,
		editMode,
		setEditMode,
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
	} = useTaskInput();
	const t = useTranslations();
	const [combxShow, setCombxShow] = useState<true | undefined>(undefined);

	useEffect(() => {
		if (isModalOpen) {
			setCombxShow(true);
		}
	}, [isModalOpen]);

	const closeCombox = useCallback(() => {
		setCombxShow(undefined);
	}, [setCombxShow]);

	// Wrapper to handle null values from Headless UI Combobox
	const handleTaskChange = useCallback(
		(task: TTask | null) => {
			// Guard against null values - preserve existing behavior
			if (!task) return;

			if (onClickTask) {
				onClickTask(task);
			} else {
				setActiveTask(task);
			}
		},
		[onClickTask, setActiveTask]
	);

	return (
		<>
			<Combobox value={inputTask} onChange={handleTaskChange}>
				<div className="relative mt-1">
					<div className="overflow-hidden relative w-full text-left rounded-md cursor-default input-border bg-card sm:text-sm">
						<Combobox.Input
							key={`${editMode}`}
							className="h-[60px] bg-transparent text-foreground placeholder:text-muted-foreground w-full rounded-md px-5 py-[18px] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25"
							displayValue={(task: TTask) => {
								return task ? (!editMode ? `#${task.taskNumber} ` : '') + task.title : '';
							}}
							onFocus={() => setEditMode(true)}
							onBlur={() => setEditMode(false)}
							onChange={(event) => setQuery(event.target.value)}
							onKeyDown={(event: any) => {
								if (event.key === 'Enter') {
									handleTaskCreation();
								}
							}}
							autoComplete="off"
							placeholder={t('form.TASK_INPUT_PLACEHOLDER')}
							readOnly={tasksFetching}
						/>
						<Combobox.Button
							onClick={closeCombox}
							className="flex absolute inset-y-0 right-0 items-center pr-2"
						>
							{tasksFetching || createLoading || updateLoading ? (
								<Spinner dark={false} />
							) : (
								<ChevronUpDownIcon className="size-4 text-muted-foreground" aria-hidden="true" />
							)}
						</Combobox.Button>
					</div>
					<Transition
						as="div"
						leave="transition ease-in duration-100"
						leaveFrom="opacity-100"
						leaveTo="opacity-0"
						show={combxShow}
						appear={true}
						afterLeave={() => {
							!createLoading && setQuery('');
							setFilter('open');
						}}
					>
						<Combobox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-xl bg-popover p-1 text-sm text-popover-foreground hairline-ring ring-border shadow-md shadow-black/6.5 focus:outline-none">
							<div className="flex justify-start items-center mt-2 mb-4 ml-10 space-x-2">
								<TaskFilter
									count={openTaskCount}
									type="open"
									selected={filter === 'open'}
									handleChange={() => {
										setFilter('open');
									}}
								/>
								<TaskFilter
									count={closedTaskCount}
									type="closed"
									selected={filter === 'closed'}
									handleChange={() => {
										if (closedTaskCount > 0) {
											setFilter('closed');
										}
									}}
								/>
							</div>
							{hasCreateForm ? (
								<CreateTaskOption onClick={handleTaskCreation} loading={createLoading} />
							) : (
								<>
									{filteredTasks.map((task) => {
										return (
											<Combobox.Option
												key={task.id}
												className={({ active }) =>
													clsxm(
														'relative text-sm cursor-pointer select-none rounded-md pl-10 pr-4 text-foreground transition-colors',
														active && 'bg-foreground/5'
													)
												}
												value={task}
											>
												{({ selected, active }) => {
													return (
														<div>
															<div className="py-2">
																<InputTaskItem
																	selected={selected}
																	active={active}
																	item={task}
																	onDelete={() => handleOpenModal(task)}
																	onReopen={() => handleReopenTask(task)}
																/>
															</div>
															<div className="w-full h-px bg-border" />
														</div>
													);
												}}
											</Combobox.Option>
										);
									})}
								</>
							)}

							<DeleteTask isOpen={isModalOpen} closeModal={closeModal} task={closeableTask} />
						</Combobox.Options>
					</Transition>
				</div>
			</Combobox>
		</>
	);
}

function InputTaskItem({
	selected,
	item,
	onDelete,
	onReopen
}: {
	selected: boolean;
	item: TTask;
	active: boolean;
	onDelete: () => void;
	onReopen: () => Promise<any>;
}) {
	const [loading, setLoading] = useState(false);

	const handleOnReopen = useCallback(() => {
		setLoading(true);
		return onReopen().finally(() => setLoading(false));
	}, [onReopen]);

	return (
		<TaskItem
			selected={selected}
			item={item}
			onDelete={onDelete}
			onReopen={handleOnReopen}
			updateLoading={loading}
		/>
	);
}

export default function TaskInput() {
	return (
		<div className="w-full">
			<TasksList />
		</div>
	);
}
