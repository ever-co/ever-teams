'use client';

import { useCallback, useDeferredValue, useMemo, useState, type KeyboardEvent } from 'react';
import { useAtomValue } from 'jotai';
import { useTranslations } from 'next-intl';
import { controlGroupRecipe } from '@/core/components/common/input';
import { Button } from '@/core/components/common/button';
import { SelectedMark } from '@/core/components/common/selected-mark';
import { ChevronLeft, Plus, Search } from '@/core/components/icons';
import { TaskNameInfoDisplay } from '@/core/components/tasks/task-displays';
import { PLAN_TASK_TITLE_MIN_LENGTH } from '@/core/hooks/daily-plans/use-plan-task-actions';
import { cn } from '@/core/lib/helpers';
import { tasksByTeamState, teamTasksPagesLoadingState } from '@/core/stores';
import type { TTask } from '@/core/types/schemas/task/task.schema';
import { useFocusOnMount } from '@/core/hooks/common/use-focus-on-mount';

/** Enough rows to find a task by eye; past this the person narrows the search instead of scrolling. */
const SHOWN_RESULTS = 50;

interface PlanTaskSearchProps {
	plannedTaskIds: Set<string>;
	canEdit: boolean;
	isCreatingTask: boolean;
	onBack: () => void;
	/** The picked tasks, in the order they were picked. */
	onAddMany: (tasks: TTask[]) => void;
	onCreate: (title: string) => void;
}

function matchesQuery(task: TTask, query: string) {
	const title = task.title.toLowerCase();
	return title.includes(query);
}

/** Tasks not in the plan yet come first: they are the ones the person came to add. */
function searchResults(tasks: TTask[], rawQuery: string, plannedTaskIds: Set<string>) {
	const query = rawQuery.trim().toLowerCase();
	const matches = tasks.filter((task) => matchesQuery(task, query));
	const unplanned = matches.filter((task) => !plannedTaskIds.has(task.id));
	const planned = matches.filter((task) => plannedTaskIds.has(task.id));
	return [...unplanned, ...planned];
}

const SEARCH_ROW =
	'flex h-11 cursor-pointer items-center gap-3 rounded-lg px-2 outline-none transition-colors hover:bg-foreground/[0.04] focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-ring/25 aria-selected:bg-primary/[0.06] aria-disabled:pointer-events-none';

function isToggleKey(event: KeyboardEvent<HTMLLIElement>) {
	return event.key === ' ' || event.key === 'Enter';
}

function SearchRow({
	task,
	isPlanned,
	isSelected,
	canEdit,
	onToggle
}: Readonly<{
	task: TTask;
	isPlanned: boolean;
	isSelected: boolean;
	canEdit: boolean;
	onToggle: (task: TTask) => void;
}>) {
	const t = useTranslations();
	if (isPlanned) {
		return (
			<li role="option" aria-selected={false} aria-disabled={true} className={cn(SEARCH_ROW, 'cursor-default')}>
				<span aria-hidden="true" className="size-[18px] shrink-0" />
				<div className="min-w-0 flex-1 text-[13px] opacity-60">
					<TaskNameInfoDisplay task={task} />
				</div>
				<span className="inline-flex h-6 shrink-0 items-center rounded-md bg-foreground/[0.05] px-2 text-xs font-medium text-muted-foreground">
					{t('dailyPlan.editor.IN_PLAN')}
				</span>
			</li>
		);
	}
	const toggle = () => {
		if (canEdit) {
			onToggle(task);
		}
	};
	const toggleFromKey = (event: KeyboardEvent<HTMLLIElement>) => {
		if (!isToggleKey(event)) {
			return;
		}
		event.preventDefault();
		toggle();
	};
	return (
		<li
			role="option"
			aria-selected={isSelected}
			aria-disabled={!canEdit}
			tabIndex={0}
			onClick={toggle}
			onKeyDown={toggleFromKey}
			className={SEARCH_ROW}
		>
			{isSelected && <SelectedMark />}
			{!isSelected && (
				<span
					aria-hidden="true"
					className="size-[18px] shrink-0 rounded-full hairline-ring ring-foreground/25"
				/>
			)}
			<div className="min-w-0 flex-1 text-[13px]">
				<TaskNameInfoDisplay task={task} />
			</div>
		</li>
	);
}

/** The picked tasks and the one way to add them, pinned under the results. */
function SelectionBar({ count, onClear, onAdd }: Readonly<{ count: number; onClear: () => void; onAdd: () => void }>) {
	const t = useTranslations();
	return (
		<div className="sticky bottom-0 -mx-1 mt-1 flex items-center gap-2 rounded-xl bg-card/95 px-3 py-2 hairline-ring ring-border shadow-sm backdrop-blur-sm">
			<span className="text-[13px] font-medium tabular-nums text-foreground">
				{t('dailyPlan.editor.SELECTED_COUNT', { count })}
			</span>
			<Button type="button" variant="ghost" size="sm" onClick={onClear} className="ml-auto">
				{t('common.CLEAR')}
			</Button>
			<Button type="button" size="sm" onClick={onAdd}>
				<Plus />
				{t('dailyPlan.editor.ADD_SELECTED', { count })}
			</Button>
		</div>
	);
}

function CreateTaskRow({
	title,
	isCreating,
	isListLoading,
	onCreate
}: Readonly<{ title: string; isCreating: boolean; isListLoading: boolean; onCreate: (title: string) => void }>) {
	const t = useTranslations();
	const trimmed = title.trim();
	const isTooShort = trimmed.length < PLAN_TASK_TITLE_MIN_LENGTH;
	// No match in a list whose pages are still loading is no proof the task is missing.
	const isDisabled = isTooShort || isListLoading;
	let hint = t('dailyPlan.editor.NO_MATCH');
	if (isListLoading) {
		hint = t('dailyPlan.editor.TASKS_LOADING');
	}
	if (isTooShort) {
		hint = t('dailyPlan.editor.CREATE_TOO_SHORT', { count: PLAN_TASK_TITLE_MIN_LENGTH });
	}
	return (
		<div className="flex flex-col items-start gap-2 py-4">
			<p className="text-xs text-muted-foreground">{hint}</p>
			<Button
				type="button"
				variant="outline"
				size="default"
				onClick={() => onCreate(trimmed)}
				disabled={isDisabled}
				loading={isCreating}
				className="max-w-full"
			>
				<Plus />
				<span className="truncate">{t('dailyPlan.editor.CREATE_NAMED', { title: trimmed })}</span>
			</Button>
		</div>
	);
}

/**
 * The plan's "add a task" screen: it takes the dialog's place with a way back, searches the team's tasks as the
 * person types, and offers to create the task when nothing matches.
 */
export function PlanTaskSearch({
	plannedTaskIds,
	canEdit,
	isCreatingTask,
	onBack,
	onAddMany,
	onCreate
}: Readonly<PlanTaskSearchProps>) {
	const t = useTranslations();
	const focusOnMount = useFocusOnMount<HTMLInputElement>();
	const teamTasks = useAtomValue(tasksByTeamState);
	const isListLoading = useAtomValue(teamTasksPagesLoadingState);
	const [query, setQuery] = useState('');
	const [selectedTasks, setSelectedTasks] = useState<TTask[]>([]);
	const deferredQuery = useDeferredValue(query);
	const results = useMemo(
		() => searchResults(teamTasks, deferredQuery, plannedTaskIds),
		[deferredQuery, plannedTaskIds, teamTasks]
	);
	const shownResults = results.slice(0, SHOWN_RESULTS);
	const hiddenCount = results.length - shownResults.length;
	const hasHiddenResults = hiddenCount > 0;
	const hasResults = results.length > 0;
	const hasQuery = query.trim().length > 0;
	const offersCreation = hasQuery && !hasResults;
	const selectedIds = useMemo(() => new Set(selectedTasks.map((task) => task.id)), [selectedTasks]);
	const selectionCount = selectedTasks.length;
	const hasSelection = selectionCount > 0;

	const toggleTask = useCallback((task: TTask) => {
		setSelectedTasks((current) => {
			const isSelected = current.some((selected) => selected.id === task.id);
			if (isSelected) {
				return current.filter((selected) => selected.id !== task.id);
			}
			return [...current, task];
		});
	}, []);

	const clearSelection = useCallback(() => setSelectedTasks([]), []);

	const addSelection = useCallback(() => onAddMany(selectedTasks), [onAddMany, selectedTasks]);
	return (
		<div className="flex flex-col gap-2 pt-1 pb-4">
			<div className="flex items-center gap-2">
				<Button
					type="button"
					variant="ghost"
					size="icon-sm"
					onClick={onBack}
					aria-label={t('common.BACK')}
					className="shrink-0 text-muted-foreground"
				>
					<ChevronLeft />
				</Button>
				<label className={cn(controlGroupRecipe, 'h-9 flex-1 gap-2 px-3')}>
					<Search aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
					<input
						type="text"
						ref={focusOnMount}
						data-initial-focus=""
						value={query}
						onChange={(event) => setQuery(event.target.value)}
						placeholder={t('dailyPlan.editor.SEARCH_PLACEHOLDER')}
						aria-label={t('modals.dailyPlan.selectOrCreateTask')}
						autoComplete="off"
						className="h-full w-full min-w-0 bg-transparent text-[13px] outline-none placeholder:text-muted-foreground/75"
					/>
				</label>
			</div>
			{hasResults && (
				<ul
					role="listbox"
					aria-multiselectable={true}
					aria-label={t('modals.dailyPlan.selectOrCreateTask')}
					className="-mx-1 flex flex-col gap-px"
				>
					{shownResults.map((task) => (
						<SearchRow
							key={task.id}
							task={task}
							isPlanned={plannedTaskIds.has(task.id)}
							isSelected={selectedIds.has(task.id)}
							canEdit={canEdit}
							onToggle={toggleTask}
						/>
					))}
				</ul>
			)}
			{hasHiddenResults && (
				<p className="text-xs text-muted-foreground">
					{t('dailyPlan.editor.MORE_RESULTS', { count: hiddenCount })}
				</p>
			)}
			{offersCreation && (
				<CreateTaskRow
					title={query}
					isCreating={isCreatingTask}
					isListLoading={isListLoading}
					onCreate={onCreate}
				/>
			)}
			{hasSelection && <SelectionBar count={selectionCount} onClear={clearSelection} onAdd={addSelection} />}
		</div>
	);
}
