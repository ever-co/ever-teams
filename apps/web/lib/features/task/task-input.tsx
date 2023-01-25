import { RTuseTaskInput, useOutsideClick, useTaskInput } from '@app/hooks';
import { ITeamTask } from '@app/interfaces';
import { clsxm } from '@app/utils';
import { Popover, Transition } from '@headlessui/react';
import { PlusIcon } from '@heroicons/react/20/solid';
import {
	Button,
	Card,
	Divider,
	InputField,
	OutlineBadge,
	SpinnerLoader,
} from 'lib/components';
import { TickCircleIcon } from 'lib/components/svgs';
import { useCallback, useEffect, useState } from 'react';
import { TaskItem } from './task-item';

export function TaskInput() {
	const datas = useTaskInput();

	const {
		activeTeamTask,
		editMode,
		setEditMode,
		setQuery,
		tasksFetching,
		updateLoading,
		// closedTaskCount,
		// hasCreateForm,
		// handleOpenModal,
		// handleReopenTask,
		// isModalOpen,
		// closeModal,
		// closeableTask,
	} = datas;

	const [taskName, setTaskName] = useState('');

	const { targetEl, ignoreElementRef } = useOutsideClick<HTMLInputElement>(() =>
		setEditMode(false)
	);

	useEffect(() => {
		setQuery(taskName === activeTeamTask?.title ? '' : taskName);
	}, [taskName, activeTeamTask, setQuery]);

	useEffect(() => {
		setTaskName(activeTeamTask?.title || '');
		if (activeTeamTask) {
			setTaskName((v) => {
				return (!editMode ? `#${activeTeamTask.taskNumber} ` : '') + v;
			});
		}
	}, [editMode, activeTeamTask]);

	/**
	 * Change the active task
	 */
	const useItemClick = useCallback(
		(task: ITeamTask) => {
			if (datas.setActiveTask) {
				datas.setActiveTask(task);
			}
			setEditMode(false);
		},
		[datas, setEditMode]
	);

	return (
		<>
			<Popover className="relative w-full z-30">
				<InputField
					value={taskName}
					onFocus={() => setEditMode(true)}
					onChange={(event) => setTaskName(event.target.value)}
					placeholder="What you working on?"
					ref={targetEl}
					trailingNode={
						<div className="p-2 flex justify-center items-center h-full">
							{(tasksFetching || updateLoading) && <SpinnerLoader size={30} />}
						</div>
					}
				/>

				<Transition
					show={editMode}
					enter="transition duration-100 ease-out"
					enterFrom="transform scale-95 opacity-0"
					enterTo="transform scale-100 opacity-100"
					leave="transition duration-75 ease-out"
					leaveFrom="transform scale-100 opacity-100"
					leaveTo="transform scale-95 opacity-0"
				>
					<Popover.Panel className="absolute -mt-3" ref={ignoreElementRef}>
						<TaskCard
							datas={datas}
							onItemClick={useItemClick}
							autoActiveTask={true}
						/>
					</Popover.Panel>
				</Transition>
			</Popover>
		</>
	);
}

export function TaskCard({
	datas,
	onItemClick,
	autoActiveTask,
}: {
	datas: Partial<RTuseTaskInput>;
	onItemClick?: (task: ITeamTask) => void;
	autoActiveTask?: boolean;
}) {
	return (
		<Card
			shadow="bigger"
			className={clsxm(
				'rounded-lg md:px-4 md:py-4 w-[500px] max-h-96',
				'overflow-auto shadow-xlcard dark:shadow-xlcard'
			)}
		>
			{/* Create team button */}
			<Button
				variant="outline"
				disabled={!datas.hasCreateForm || datas.createLoading}
				loading={datas.createLoading}
				className="font-normal text-sm rounded-xl"
				onClick={() =>
					datas?.handleTaskCreation && datas?.handleTaskCreation(autoActiveTask)
				}
			>
				{!datas.createLoading && <PlusIcon className="w-[16px] h-[16px]" />}{' '}
				Create new task
			</Button>

			{/* Task filter buttons */}
			<div className="mt-4 flex space-x-3">
				<OutlineBadge
					className="input-border text-xs py-2 cursor-pointer"
					onClick={() => datas.setFilter && datas.setFilter('open')}
				>
					<div
						className={clsxm('w-4 h-4 rounded-full opacity-50 bg-green-300')}
					/>
					<span
						className={clsxm(
							datas.filter === 'open' && [
								'text-primary dark:text-primary-light font-semibold',
							]
						)}
					>
						{datas.openTaskCount || 0} Open
					</span>
				</OutlineBadge>

				<OutlineBadge
					className="input-border text-xs py-2 cursor-pointer"
					onClick={() => datas.setFilter && datas.setFilter('closed')}
				>
					<TickCircleIcon className="opacity-50" />
					<span
						className={clsxm(
							datas.filter === 'closed' && [
								'text-primary dark:text-primary-light font-semibold',
							]
						)}
					>
						{datas.closedTaskCount || 0} Closed
					</span>
				</OutlineBadge>
			</div>

			<Divider className="mt-4" />

			{/* Task list */}
			<ul className="my-6">
				{datas.filteredTasks?.map((task, i) => {
					const last = (datas.filteredTasks?.length || 0) - 1 === i;
					return (
						<li key={task.id}>
							<TaskItem
								task={task}
								onClick={onItemClick}
								className="cursor-pointer"
							/>

							{!last && <Divider className="my-5" />}
						</li>
					);
				})}
			</ul>
		</Card>
	);
}
