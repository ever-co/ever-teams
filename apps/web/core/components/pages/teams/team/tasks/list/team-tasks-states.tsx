'use client';

import type { MouseEvent } from 'react';
import { useTranslations } from 'next-intl';
import { AnimatedEmptyState } from '@/core/components/common/empty-state';
import { commandKeycapClass } from '@/core/components/common/command';
import { Button } from '@/core/components/duplicated-components/_button';
import { Archive, Search, Tag, Task, Users, X } from '@/core/components/icons';
import { TaskPropertyPlaceholderIcon, type TaskPropertyKind } from '@/core/components/tasks/task-property-icon';
import type { TeamTasksScope } from '@/core/lib/utils/team-tasks-view';
import { builtInViewTextKeysOf } from '@/core/lib/utils/task-views-index';
import type { ETaskBuiltInView } from '@/core/types/interfaces/common/task-views';
import type { TeamTaskPickerKind } from './team-tasks-list-context';

const FLOATING_ROW = 'pointer-events-none absolute inset-x-0 bottom-4 z-30 flex justify-center px-4';

function StateFrame({ children }: Readonly<{ children: React.ReactNode }>) {
	return <div className="flex h-full items-center justify-center p-4">{children}</div>;
}

export function TeamTasksEmptyTeam({ onCreate }: Readonly<{ onCreate: () => void }>) {
	const t = useTranslations();
	return (
		<StateFrame>
			<AnimatedEmptyState
				title={t('pages.teamTasks.EMPTY_TITLE')}
				message={t('pages.teamTasks.EMPTY_MESSAGE')}
				icon={<Task />}
				actionLabel={t('pages.teamTasks.NEW_TASK')}
				onAction={onCreate}
			/>
		</StateFrame>
	);
}

export function TeamTasksNoMatch({ onClear }: Readonly<{ onClear: () => void }>) {
	const t = useTranslations();
	return (
		<StateFrame>
			<AnimatedEmptyState
				title={t('pages.teamTasks.NO_MATCH_TITLE')}
				message={t('pages.teamTasks.NO_MATCH_MESSAGE')}
				icon={<Search />}
				actionLabel={t('common.CLEAR_FILTERS')}
				actionVariant="outline"
				onAction={onClear}
			/>
		</StateFrame>
	);
}

/**
 * A built-in view with nothing in it: it says what the view looked for (no task assigned to me, nothing overdue),
 * with no action to take. Without a view it says nothing matches.
 */
export function TeamTasksViewEmpty({ viewKey }: Readonly<{ viewKey?: ETaskBuiltInView }>) {
	const t = useTranslations();
	const message = viewKey ? t(builtInViewTextKeysOf(viewKey).empty) : t('taskViews.VIEW_EMPTY_TEXT');
	return (
		<StateFrame>
			<AnimatedEmptyState title={t('taskViews.VIEW_EMPTY_TITLE')} message={message} icon={<Task />} />
		</StateFrame>
	);
}

function scopeEmptyKeys(scope: TeamTasksScope) {
	if (scope === 'done') {
		return { title: 'pages.teamTasks.DONE_EMPTY_TITLE', message: 'pages.teamTasks.DONE_EMPTY_MESSAGE' } as const;
	}
	return { title: 'pages.teamTasks.ACTIVE_EMPTY_TITLE', message: 'pages.teamTasks.ACTIVE_EMPTY_MESSAGE' } as const;
}

export function TeamTasksScopeEmpty({ scope, onShowAll }: Readonly<{ scope: TeamTasksScope; onShowAll: () => void }>) {
	const t = useTranslations();
	const keys = scopeEmptyKeys(scope);
	return (
		<StateFrame>
			<AnimatedEmptyState
				title={t(keys.title)}
				message={t(keys.message)}
				icon={<TaskPropertyPlaceholderIcon kind="status" className="size-5" />}
				actionLabel={t('pages.teamTasks.SHOW_ALL_TASKS')}
				actionVariant="outline"
				onAction={onShowAll}
			/>
		</StateFrame>
	);
}

export function TeamTasksError({ onRetry }: Readonly<{ onRetry: () => void }>) {
	const t = useTranslations();
	return (
		<StateFrame>
			<AnimatedEmptyState
				title={t('pages.error.HEADING_TITLE')}
				message={t('pages.error.HEADING_DESCRIPTION')}
				actionLabel={t('pages.unauthorized.TRY_AGAIN')}
				onAction={onRetry}
			/>
		</StateFrame>
	);
}

/** One floating pill when the search or the filters hide tasks, as on the Kanban: never a band over the list. */
export function TeamTasksHiddenPill({ count, onClear }: Readonly<{ count: number; onClear: () => void }>) {
	const t = useTranslations();
	return (
		<div className={FLOATING_ROW}>
			<div className="surface-raised pointer-events-auto flex h-9 items-center gap-3 rounded-full pr-1.5 pl-4 text-[13px] text-muted-foreground">
				<span>{t('pages.kanban.TASKS_HIDDEN_BY_FILTERS', { count })}</span>
				<button
					type="button"
					onClick={onClear}
					className="flex h-6 items-center gap-1 rounded-full px-2.5 font-medium text-foreground transition-colors hover:bg-foreground/5"
				>
					{t('common.CLEAR_FILTERS')}
					<X className="size-3.5" />
				</button>
			</div>
		</div>
	);
}

interface SelectionAction {
	kind: TeamTaskPickerKind;
	labelKey:
		| 'taskMenus.fields.status'
		| 'taskMenus.fields.priority'
		| 'taskMenus.fields.size'
		| 'common.ASSIGNEE'
		| 'taskViews.LABELS';
	glyph: TaskPropertyKind | null;
	icon?: 'users' | 'tag';
}

const SELECTION_ACTIONS: SelectionAction[] = [
	{ kind: 'status', labelKey: 'taskMenus.fields.status', glyph: 'status' },
	{ kind: 'priority', labelKey: 'taskMenus.fields.priority', glyph: 'priority' },
	{ kind: 'size', labelKey: 'taskMenus.fields.size', glyph: 'size' },
	{ kind: 'assignees', labelKey: 'common.ASSIGNEE', glyph: null, icon: 'users' }
];

/** Labels on a selection add one label to every task: that needs the platform's bulk update. */
const LABELS_ACTION: SelectionAction = { kind: 'labels', labelKey: 'taskViews.LABELS', glyph: null, icon: 'tag' };

/**
 * The bulk bar of a selection, floating over the bottom of the list like the projects page: the count, the
 * properties that apply to every selected task (each opens the shared picker against its button), Labels and
 * Archive when the platform's bulk update is on (one request, one undo), and Clear.
 */
export function TeamTasksSelectionBar({
	count,
	canBulk,
	onEdit,
	onArchive,
	onClear
}: Readonly<{
	count: number;
	canBulk: boolean;
	onEdit: (kind: TeamTaskPickerKind, anchor: Element) => void;
	onArchive: () => void;
	onClear: () => void;
}>) {
	const t = useTranslations();
	const label = t('taskMenus.selectedCount', { count });
	const actions = canBulk ? [...SELECTION_ACTIONS, LABELS_ACTION] : SELECTION_ACTIONS;
	return (
		<div className={FLOATING_ROW}>
			<div
				role="toolbar"
				aria-label={label}
				className="surface-raised pointer-events-auto flex h-11 max-w-full items-center gap-1 overflow-x-auto rounded-full py-1 pr-1.5 pl-4"
			>
				<span className="shrink-0 pr-2 text-[13px] font-medium tabular-nums text-foreground">{label}</span>
				<span className="h-4 w-px shrink-0 bg-border" aria-hidden="true" />
				{actions.map((action) => (
					<Button
						key={action.kind}
						variant="ghost"
						size="default"
						className="shrink-0"
						onClick={(event: MouseEvent<HTMLButtonElement>) => onEdit(action.kind, event.currentTarget)}
					>
						{action.glyph && <TaskPropertyPlaceholderIcon kind={action.glyph} />}
						{action.icon === 'users' && <Users />}
						{action.icon === 'tag' && <Tag />}
						{t(action.labelKey)}
					</Button>
				))}
				{canBulk && (
					<Button variant="ghost" size="default" className="shrink-0" onClick={onArchive}>
						<Archive />
						{t('taskViews.ARCHIVE')}
					</Button>
				)}
				<span className="h-4 w-px shrink-0 bg-border" aria-hidden="true" />
				<Button
					variant="ghost"
					size="default"
					onClick={onClear}
					aria-label={t('pages.teamTasks.CLEAR_SELECTION')}
					className="shrink-0 text-muted-foreground"
				>
					<X />
					<kbd className={commandKeycapClass}>Esc</kbd>
				</Button>
			</div>
		</div>
	);
}
