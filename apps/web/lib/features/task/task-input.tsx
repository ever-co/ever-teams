import {
	RTuseTaskInput,
	useCallbackRef,
	useOutsideClick,
	useTaskInput,
} from '@app/hooks';
import { ITeamTask, Nullable } from '@app/interfaces';
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
import {
	MutableRefObject,
	PropsWithChildren,
	useCallback,
	useEffect,
	useState,
} from 'react';
import { TaskItem } from './task-item';

type Props = {
	task?: Nullable<ITeamTask>;
	onTaskClick?: (task: ITeamTask) => void;
	initEditMode?: boolean;
	onCloseCombobox?: () => void;
	inputLoader?: boolean;
	onEnterKey?: (taskName: string, task: ITeamTask) => void;
	keepOpen?: boolean;
	loadingRef?: MutableRefObject<boolean>;
	closeable_fc?: () => void;
	viewType?: 'input-trigger' | 'one-view';
} & PropsWithChildren;

/**
 * If task passed then some function should not considered as global state
 *
 * @param param0
 * @returns
 */
export function TaskInput({
	task,
	onTaskClick,
	initEditMode,
	onCloseCombobox,
	onEnterKey,
	inputLoader,
	keepOpen,
	loadingRef,
	closeable_fc,
	viewType = 'input-trigger',
	children,
}: Props) {
	const datas = useTaskInput(task, initEditMode);
	const onCloseComboboxRef = useCallbackRef(onCloseCombobox);
	const closeable_fcRef = useCallbackRef(closeable_fc);

	const {
		inputTask,
		editMode,
		setEditMode,
		setQuery,
		tasksFetching,
		updateLoading,
		updatTaskTitleHandler,
	} = datas;

	const [taskName, setTaskName] = useState('');

	const { targetEl, ignoreElementRef } = useOutsideClick<HTMLInputElement>(
		() => !keepOpen && setEditMode(false)
	);

	useEffect(() => {
		setQuery(taskName === inputTask?.title ? '' : taskName);
	}, [taskName, inputTask, setQuery]);

	useEffect(() => {
		setTaskName(inputTask?.title || '');
		if (inputTask) {
			setTaskName((v) => {
				return (!editMode ? `#${inputTask.taskNumber} ` : '') + v;
			});
		}
	}, [editMode, inputTask]);

	useEffect(() => {
		/**
		 * Call onCloseCombobox only when the menu has been closed
		 */
		!editMode && onCloseComboboxRef.current && onCloseComboboxRef.current();
	}, [editMode, onCloseComboboxRef]);

	/**
	 * set the active task for the authenticated user
	 */
	const setAuthActiveTask = useCallback(
		(task: ITeamTask) => {
			if (datas.setActiveTask) {
				datas.setActiveTask(task);
			}
			setEditMode(false);
		},
		[datas, setEditMode]
	);

	/**
	 * On update task name
	 */
	const updateTaskNameHandler = useCallback(
		(task: ITeamTask, title: string) => {
			if (task.title !== title) {
				!updateLoading && updatTaskTitleHandler(task, title);
			}
		},
		[updateLoading, updatTaskTitleHandler]
	);

	/**
	 * Signle parent about updating and close event (that can trigger close component e.g)
	 */
	useEffect(() => {
		if (loadingRef?.current && !updateLoading) {
			closeable_fcRef.current && closeable_fcRef.current();
		}

		if (loadingRef) {
			loadingRef.current = updateLoading;
		}
	}, [updateLoading, loadingRef, closeable_fcRef]);

	const inputField = (
		<InputField
			value={taskName}
			onFocus={() => setEditMode(true)}
			onChange={(event) => setTaskName(event.target.value)}
			placeholder="What you working on?"
			ref={targetEl}
			onKeyUp={(e) => {
				if (e.key === 'Enter' && inputTask) {
					updateTaskNameHandler(inputTask, taskName);
					onEnterKey && onEnterKey(taskName, inputTask);
				}
			}}
			trailingNode={
				<div className="p-2 flex justify-center items-center h-full">
					{task ? (
						(updateLoading || inputLoader) && <SpinnerLoader size={25} />
					) : (
						<>
							{(tasksFetching || updateLoading) && <SpinnerLoader size={25} />}
						</>
					)}
				</div>
			}
		/>
	);

	const taskCard = (
		<TaskCard
			datas={datas}
			onItemClick={
				task !== undefined || onTaskClick ? onTaskClick : setAuthActiveTask
			}
			autoActiveTask={task !== undefined ? false : true}
			inputField={viewType === 'one-view' ? inputField : undefined}
		/>
	);

	return viewType === 'one-view' ? (
		taskCard
	) : (
		<Popover className="relative w-full z-30">
			{inputField}
			{children}

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
					{taskCard}
				</Popover.Panel>
			</Transition>
		</Popover>
	);
}

function TaskCard({
	datas,
	onItemClick,
	autoActiveTask,
	inputField,
}: {
	datas: Partial<RTuseTaskInput>;
	onItemClick?: (task: ITeamTask) => void;
	autoActiveTask?: boolean;
	inputField?: JSX.Element;
}) {
	return (
		<>
			<Card
				shadow="custom"
				className={clsxm(
					'rounded-lg md:px-4 md:py-4 w-[500px] max-h-96',
					'overflow-auto shadow-xlcard'
				)}
			>
				{inputField}
				{/* Create team button */}
				<Button
					variant="outline"
					disabled={!datas.hasCreateForm || datas.createLoading}
					loading={datas.createLoading}
					className="font-normal text-sm rounded-xl"
					onClick={() =>
						datas?.handleTaskCreation &&
						datas?.handleTaskCreation(autoActiveTask)
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
									selected={datas.inputTask === task}
									onClick={onItemClick}
									className="cursor-pointer"
								/>

								{!last && <Divider className="my-5" />}
							</li>
						);
					})}
				</ul>
			</Card>

			{/* Just some spaces at the end */}
			<div className="h-5 w-2 opacity-0">{'|'}</div>
		</>
	);
}
