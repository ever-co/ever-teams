'use client';

import type { ReactNode } from 'react';
import { useTranslations, type DottedLanguageObjectStringPaths } from 'next-intl';
import { Checkbox } from '@/core/components/common/checkbox';
import { ArrowUp, Calendar, Clock, Tag, Users } from '@/core/components/icons';
import { TaskPropertyPlaceholderIcon } from '@/core/components/tasks/task-property-icon';
import { cn } from '@/core/lib/helpers';
import type { TeamTasksOrdering } from '@/core/lib/utils/team-tasks-view';
import { TEAM_TASK_ROW_GRID, type TeamTaskColumn, type TeamTasksGrid } from './team-tasks-grid';

type CheckedState = boolean | 'indeterminate';

interface ColumnLabel {
	labelKey: DottedLanguageObjectStringPaths;
	icon: ReactNode;
	ordering?: TeamTasksOrdering;
	/** Glyph-sized columns show their glyph alone, the name stays for screen readers. */
	isGlyphOnly?: boolean;
}

const COLUMN_LABELS: Record<TeamTaskColumn, ColumnLabel> = {
	priority: {
		labelKey: 'taskMenus.fields.priority',
		icon: null,
		ordering: 'priority'
	},
	number: { labelKey: 'pages.teamTasks.COLUMN_NUMBER', icon: null, ordering: 'number' },
	status: {
		labelKey: 'taskMenus.fields.status',
		icon: <TaskPropertyPlaceholderIcon kind="status" />,
		isGlyphOnly: true
	},
	labels: { labelKey: 'taskMenus.fields.label', icon: <Tag /> },
	size: { labelKey: 'taskMenus.fields.size', icon: <TaskPropertyPlaceholderIcon kind="size" /> },
	project: { labelKey: 'taskMenus.fields.project', icon: <TaskPropertyPlaceholderIcon kind="project" /> },
	progress: { labelKey: 'pages.teamTasks.COLUMN_TIME', icon: <Clock /> },
	dueDate: { labelKey: 'pages.taskDetails.DUE_DATE', icon: <Calendar />, ordering: 'dueDate' },
	created: { labelKey: 'pages.taskDetails.CREATED', icon: <Calendar />, ordering: 'created' },
	assignees: { labelKey: 'pages.taskDetails.ASSIGNEES', icon: <Users /> }
};

const LABEL_CLASS =
	'flex h-full min-w-0 items-center gap-1.5 px-1.5 text-xs font-medium text-muted-foreground [&_svg]:size-3.5 [&_[data-slot=task-property-icon]]:size-3.5';

function SortableLabel({
	label,
	icon,
	ordering,
	activeOrdering,
	isDescending,
	isGlyphOnly,
	onOrder,
	className
}: Readonly<{
	label: string;
	icon: ReactNode;
	ordering: TeamTasksOrdering;
	activeOrdering: TeamTasksOrdering;
	isDescending: boolean;
	isGlyphOnly: boolean;
	onOrder: (ordering: TeamTasksOrdering) => void;
	className?: string;
}>) {
	const isActive = activeOrdering === ordering;
	return (
		<button
			type="button"
			role="columnheader"
			aria-label={label}
			aria-sort={sortStateOf(isActive, isDescending)}
			onClick={() => onOrder(ordering)}
			className={cn(
				LABEL_CLASS,
				'outline-none transition-colors hover:text-foreground focus-visible:text-foreground',
				isActive && 'text-foreground',
				isGlyphOnly && 'justify-center px-0',
				className
			)}
		>
			{icon}
			{!isGlyphOnly && <span className="truncate">{label}</span>}
			{isActive && !isGlyphOnly && (
				<ArrowUp className={cn('text-muted-foreground', isDescending && 'rotate-180')} />
			)}
		</button>
	);
}

function sortStateOf(isActive: boolean, isDescending: boolean) {
	if (!isActive) {
		return 'none' as const;
	}
	if (isDescending) {
		return 'descending' as const;
	}
	return 'ascending' as const;
}

function ColumnCell({
	column,
	activeOrdering,
	isDescending,
	onOrder
}: Readonly<{
	column: TeamTaskColumn;
	activeOrdering: TeamTasksOrdering;
	isDescending: boolean;
	onOrder: (ordering: TeamTasksOrdering) => void;
}>) {
	const t = useTranslations();
	const definition = COLUMN_LABELS[column];
	const label = t(definition.labelKey);
	const isGlyphOnly = Boolean(definition.isGlyphOnly);
	if (definition.ordering) {
		return (
			<SortableLabel
				label={label}
				icon={definition.icon}
				ordering={definition.ordering}
				activeOrdering={activeOrdering}
				isDescending={isDescending}
				isGlyphOnly={isGlyphOnly}
				onOrder={onOrder}
			/>
		);
	}
	return (
		<span role="columnheader" aria-label={label} className={cn(LABEL_CLASS, isGlyphOnly && 'justify-center px-0')}>
			{definition.icon}
			{!isGlyphOnly && <span className="truncate">{label}</span>}
		</span>
	);
}

/** The column labels, on the rows' own grid, kept at the top of the list while it scrolls; wide screens only. */
export function TeamTasksColumnHeader({
	grid,
	ordering,
	isDescending,
	onOrder,
	selectionState,
	onSelectAll
}: Readonly<{
	grid: TeamTasksGrid;
	ordering: TeamTasksOrdering;
	isDescending: boolean;
	onOrder: (ordering: TeamTasksOrdering) => void;
	selectionState: CheckedState;
	onSelectAll: (isSelected: boolean) => void;
}>) {
	const t = useTranslations();
	return (
		<div
			role="row"
			className={cn(
				TEAM_TASK_ROW_GRID,
				'sticky top-0 z-20 h-9 bg-background pr-1 hairline-b border-border max-lg:hidden'
			)}
		>
			<span role="columnheader" className="flex justify-center">
				<Checkbox
					checked={selectionState}
					onCheckedChange={onSelectAll}
					aria-label={t('pages.teamTasks.SELECT_ALL_TASKS')}
				/>
			</span>
			{grid.leading.map((column) => (
				<ColumnCell
					key={column}
					column={column}
					activeOrdering={ordering}
					isDescending={isDescending}
					onOrder={onOrder}
				/>
			))}
			<SortableLabel
				label={t('pages.teamTasks.COLUMN_TASK')}
				icon={null}
				ordering="title"
				activeOrdering={ordering}
				isDescending={isDescending}
				isGlyphOnly={false}
				onOrder={onOrder}
			/>
			{grid.trailing.map((column) => (
				<ColumnCell
					key={column}
					column={column}
					activeOrdering={ordering}
					isDescending={isDescending}
					onOrder={onOrder}
				/>
			))}
			<span role="columnheader" />
		</div>
	);
}
