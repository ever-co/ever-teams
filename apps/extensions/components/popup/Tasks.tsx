import classNames from 'classnames';
import React, { useMemo, useState, type FC, type FormEvent } from 'react';

import { SearchIcon, SpinnerIcon } from '~components/shared/Icons';
import Notice from '~components/shared/Notice';
import { ApiError } from '~lib/api-client';
import { createTask, type TaskItem } from '~lib/gauzy';
import { t } from '~lib/i18n';
import { refusalOf, type Refusal } from '~lib/refusal';
import { orderTasks } from '~lib/task-order';
import type { Session } from '~lib/workspaces';
import { ghostButton, inheritTextSize, roundInput, textEllipsis } from '~misc/tailwindClasses';

import TasksEstimatedInputs from './TasksEstimatedInputs';

interface Props {
	session: Session;
	tasks: TaskItem[];
	loading: boolean;
	error: Refusal | null;
	recentIds: string[];
	selectedTaskId: string | null;
	/** While a run goes on, picking another task waits for the stop. */
	locked: boolean;
	onSelect: (taskId: string) => void;
	/** The team the task was created in, which may no longer be the active one when it is answered. */
	onCreated: (task: TaskItem, teamId: string | null) => void;
	onRetry: () => void;
}

/** "#12" for a task with a number; nothing for one without. */
function numberOf(task: TaskItem): string {
	if (!task.taskNumber) {
		return '';
	}
	return `#${task.taskNumber}`;
}

/** Seconds from the estimate fields, "hh:mm". */
function estimateSecondsOf(estimate: string): number {
	const [hours, minutes] = estimate.split(':').map((part) => Number(part) || 0);
	return hours * 3600 + minutes * 60;
}

function ListState({
	loading,
	error,
	isEmpty,
	hasSearch,
	onRetry
}: {
	loading: boolean;
	error: Refusal | null;
	isEmpty: boolean;
	hasSearch: boolean;
	onRetry: () => void;
}) {
	if (loading) {
		return (
			<p className="flex items-center gap-2 px-1 py-3 text-xs text-zinc-500 dark:text-zinc-400" role="status">
				<SpinnerIcon className="h-4 w-4" />
				{t('tasksLoading')}
			</p>
		);
	}
	if (error) {
		return (
			<Notice tone="error" action={{ label: t('actionRetry'), onClick: onRetry }}>
				{t('tasksLoadFailed')} {t(error.key, error.reason)}
			</Notice>
		);
	}
	if (isEmpty && hasSearch) {
		return <p className="px-1 py-3 text-xs text-zinc-500 dark:text-zinc-400">{t('tasksNoMatch')}</p>;
	}
	if (isEmpty) {
		return <p className="px-1 py-3 text-xs text-zinc-500 dark:text-zinc-400">{t('tasksEmpty')}</p>;
	}
	return null;
}

function refusalFrom(failure: unknown): Refusal {
	if (failure instanceof ApiError) {
		return refusalOf(failure);
	}
	return { key: 'errorGeneric' };
}

const Tasks: FC<Props> = ({
	session,
	tasks,
	loading,
	error,
	recentIds,
	selectedTaskId,
	locked,
	onSelect,
	onCreated,
	onRetry
}) => {
	const [search, setSearch] = useState('');
	const [newTitle, setNewTitle] = useState('');
	const [newEstimate, setNewEstimate] = useState('');
	// The estimate fields keep their own hours and minutes: a new key empties them with the value sent
	const [estimateFieldsKey, setEstimateFieldsKey] = useState(0);
	const [adding, setAdding] = useState(false);
	const [addError, setAddError] = useState<Refusal | null>(null);

	const shown = useMemo(() => orderTasks(tasks, recentIds, search), [tasks, recentIds, search]);
	const recentSet = useMemo(() => new Set(recentIds), [recentIds]);
	const hasSearch = search.trim().length > 0;
	const isEmpty = shown.length === 0;
	const showList = !loading && !error && !isEmpty;

	const onEstimateChange = (hours: string, minutes: string) => {
		setNewEstimate(`${hours || '00'}:${minutes || '00'}`);
	};

	const onAddTask = async (event: FormEvent) => {
		event.preventDefault();
		const title = newTitle.trim();
		if (!title) {
			return;
		}
		setAdding(true);
		setAddError(null);
		try {
			const teamId = session.teamId;
			const created = await createTask(session, title, estimateSecondsOf(newEstimate));
			onCreated(created, teamId);
			setNewTitle('');
			setNewEstimate('');
			setEstimateFieldsKey((key) => key + 1);
		} catch (failure) {
			setAddError(refusalFrom(failure));
		} finally {
			setAdding(false);
		}
	};

	return (
		<section aria-label={t('tasksAll')} className="flex flex-col gap-2">
			<div className="relative">
				<SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
				<input
					type="search"
					aria-label={t('tasksSearch')}
					placeholder={t('tasksSearch')}
					className={classNames(roundInput, 'pl-8')}
					value={search}
					onChange={(event) => setSearch(event.target.value)}
				/>
			</div>

			<ListState loading={loading} error={error} isEmpty={isEmpty} hasSearch={hasSearch} onRetry={onRetry} />

			{showList && (
				<ul
					className="scrollbar flex max-h-52 flex-col gap-1 overflow-y-auto pr-0.5"
					role="listbox"
					aria-label={t('tasksAll')}
				>
					{shown.map((task) => {
						const isSelected = task.id === selectedTaskId;
						const isRecent = recentSet.has(task.id);
						return (
							<li key={task.id} role="option" aria-selected={isSelected}>
								<button
									type="button"
									disabled={locked}
									onClick={() => onSelect(task.id)}
									className={classNames(
										'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-start text-sm ring-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 disabled:cursor-not-allowed',
										{
											'bg-zinc-900 text-white ring-zinc-900 dark:bg-white dark:text-zinc-900 dark:ring-white':
												isSelected,
											'ring-zinc-900/10 hover:bg-zinc-900/5 dark:ring-white/10 dark:hover:bg-white/5':
												!isSelected,
											'disabled:opacity-60': !isSelected
										}
									)}
								>
									<span
										className={classNames('min-w-0 flex-1', textEllipsis, inheritTextSize)}
										title={task.title}
									>
										{task.title}
									</span>
									{isRecent && (
										<span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium bg-indigo-500/10 text-indigo-600 dark:text-indigo-300">
											{t('tasksRecent')}
										</span>
									)}
									<span className="shrink-0 text-xs tabular-nums opacity-60">{numberOf(task)}</span>
								</button>
							</li>
						);
					})}
				</ul>
			)}

			<form
				className="flex flex-col gap-2 rounded-lg p-2 ring-1 ring-zinc-900/10 dark:ring-white/10"
				onSubmit={onAddTask}
				aria-label={t('tasksNewTaskLabel')}
			>
				<input
					type="text"
					className={roundInput}
					aria-label={t('tasksNewTaskLabel')}
					placeholder={t('tasksNewTaskPlaceholder')}
					value={newTitle}
					onChange={(event) => setNewTitle(event.target.value)}
				/>
				<div className="flex items-center justify-between gap-2 text-sm">
					<div className="flex items-center">
						<TasksEstimatedInputs key={estimateFieldsKey} task={null} onEstimateChange={onEstimateChange} />
					</div>
					<button type="submit" className={ghostButton} disabled={adding || !newTitle.trim()}>
						{adding && <SpinnerIcon className="h-4 w-4" />}
						{t('tasksAddTask')}
					</button>
				</div>
				{addError && (
					<Notice tone="error">
						{t('tasksAddFailed')} {t(addError.key, addError.reason)}
					</Notice>
				)}
			</form>
		</section>
	);
};

export default Tasks;
