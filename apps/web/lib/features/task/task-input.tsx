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
import { useTranslation } from 'lib/i18n';
import {
	MutableRefObject,
	PropsWithChildren,
	useCallback,
	useEffect,
	useState,
} from 'react';
import { ActiveTaskIssuesDropdown } from './task-issue';
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
	createOnEnterClick?: boolean;
	showTaskNumber?: boolean;
	showCombobox?: boolean;
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
	createOnEnterClick,
	showTaskNumber = false,
	showCombobox = true,
}: Props) {
	const { trans } = useTranslation();
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
		setFilter,
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

	/* Setting the filter to open when the edit mode is true. */
	useEffect(() => {
		editMode && setFilter('open');
	}, [editMode]);

	/*
		If task is passed then we don't want to set the active task for the authenticated user.
		after task creation
	 */
	const autoActiveTask = task !== undefined ? false : true;

	const inputField = (
		<InputField
			value={taskName}
			onFocus={() => setEditMode(true)}
			onChange={(event) => setTaskName(event.target.value)}
			placeholder={trans.form.TASK_INPUT_PLACEHOLDER}
			ref={targetEl}
			onKeyUp={(e) => {
				if (e.key === 'Enter' && inputTask) {
					/* If createOnEnterClick is false then updateTaskNameHandler is called. */
					!createOnEnterClick && updateTaskNameHandler(inputTask, taskName);

					onEnterKey && onEnterKey(taskName, inputTask);
				}

				/* Creating a new task when the enter key is pressed. */
				if (e.key === 'Enter') {
					createOnEnterClick &&
						datas?.handleTaskCreation &&
						datas.hasCreateForm &&
						datas?.handleTaskCreation(autoActiveTask);
				}
			}}
			trailingNode={
				/* Showing the spinner when the task is being updated. */
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
			className={clsxm(showTaskNumber && inputTask && ['pl-2'])}
			/* Showing the task number. */
			leadingNode={
				showTaskNumber &&
				inputTask && (
					<div className="pl-3 flex items-center space-x-2">
						<ActiveTaskIssuesDropdown key={inputTask.id} task={inputTask} />
						<span className="text-gray-500 text-sm">
							#{inputTask?.taskNumber}
						</span>
					</div>
				)
			}
		/>
	);

	const taskCard = (
		<TaskCard
			datas={datas}
			onItemClick={
				task !== undefined || onTaskClick ? onTaskClick : setAuthActiveTask
			}
			autoActiveTask={autoActiveTask}
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
				show={editMode && showCombobox}
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

/**
 * A component that is used to render the task list.
 */
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
	const { trans } = useTranslation();

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
						/* Checking if the `handleTaskCreation` is available and if the `hasCreateForm` is true. */
						datas?.handleTaskCreation &&
						datas.hasCreateForm &&
						datas?.handleTaskCreation(autoActiveTask)
					}
				>
					{!datas.createLoading && <PlusIcon className="w-[16px] h-[16px]" />}{' '}
					{trans.common.CREATE_TASK}
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
							{datas.openTaskCount || 0} {trans.common.OPEN}
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
							{datas.closedTaskCount || 0} {trans.common.CLOSED}
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
