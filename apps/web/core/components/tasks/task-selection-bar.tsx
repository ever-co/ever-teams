'use client';

import type { MouseEvent, ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { commandKeycapClass } from '@/core/components/common/command';
import { Button } from '@/core/components/duplicated-components/_button';
import { cn } from '@/core/lib/helpers';
import { Archive, Calendar, Tag, Users, X } from '@/core/components/icons';
import { TaskPropertyPlaceholderIcon, type TaskPropertyKind } from '@/core/components/tasks/task-property-icon';
import type { TeamTaskPickerKind } from '@/core/components/pages/teams/team/tasks/list/team-tasks-list-context';

type SelectionLabelKey =
	| 'taskMenus.fields.status'
	| 'taskMenus.fields.priority'
	| 'taskMenus.fields.size'
	| 'common.ASSIGNEE'
	| 'taskViews.LABELS'
	| 'taskMenus.fields.project'
	| 'pages.taskDetails.DUE_DATE';

interface SelectionAction {
	kind: TeamTaskPickerKind;
	labelKey: SelectionLabelKey;
	glyph?: TaskPropertyKind;
	icon?: 'users' | 'tag' | 'calendar';
	/** Only with the platform's bulk update: one label or one archive for every task, in one request. */
	needsBulk?: boolean;
}

/** The properties a selection changes at once, in the order the bar shows them. */
const TASK_SELECTION_ACTIONS: readonly SelectionAction[] = [
	{ kind: 'status', labelKey: 'taskMenus.fields.status', glyph: 'status' },
	{ kind: 'priority', labelKey: 'taskMenus.fields.priority', glyph: 'priority' },
	{ kind: 'size', labelKey: 'taskMenus.fields.size', glyph: 'size' },
	{ kind: 'assignees', labelKey: 'common.ASSIGNEE', icon: 'users' },
	{ kind: 'labels', labelKey: 'taskViews.LABELS', icon: 'tag', needsBulk: true },
	{ kind: 'project', labelKey: 'taskMenus.fields.project', glyph: 'project' },
	{ kind: 'dueDate', labelKey: 'pages.taskDetails.DUE_DATE', icon: 'calendar' }
];

const ACTION_ICONS = {
	users: <Users />,
	tag: <Tag />,
	calendar: <Calendar />
};

function iconOf(action: SelectionAction): ReactNode {
	if (action.glyph) {
		return <TaskPropertyPlaceholderIcon kind={action.glyph} />;
	}
	return action.icon ? ACTION_ICONS[action.icon] : null;
}

/** One button of the bar: an icon, and a label unless it is the Clear key cap. */
function BarButton({
	icon,
	label,
	ariaLabel,
	className,
	onClick
}: Readonly<{
	icon: ReactNode;
	label?: string;
	ariaLabel?: string;
	className?: string;
	onClick: (event: MouseEvent<HTMLButtonElement>) => void;
}>) {
	return (
		<Button
			variant="ghost"
			size="default"
			className={cn('shrink-0', className)}
			aria-label={ariaLabel}
			onClick={onClick}
		>
			{icon}
			{label}
		</Button>
	);
}

function BarSeparator() {
	return <span className="h-4 w-px shrink-0 bg-border" aria-hidden="true" />;
}

/**
 * The bulk bar of a selection on a board (the Kanban page, a view shown as a board), floating over its bottom like the
 * list's: the count, every property a selection changes (each opens the shared picker against its button), Labels and
 * Archive when the platform's bulk update is on (one request, one undo), and Clear.
 */
export function TaskSelectionBar({
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
	const actions = TASK_SELECTION_ACTIONS.filter((action) => canBulk || !action.needsBulk);
	const clearIcon = (
		<>
			<X />
			<kbd className={commandKeycapClass}>Esc</kbd>
		</>
	);
	return (
		<div className="pointer-events-none absolute inset-x-0 bottom-4 z-30 flex justify-center px-4">
			<div
				role="toolbar"
				aria-label={label}
				className="surface-raised pointer-events-auto flex h-11 max-w-full items-center gap-1 overflow-x-auto rounded-full py-1 pr-1.5 pl-4"
			>
				<span className="shrink-0 pr-2 text-[13px] font-medium tabular-nums text-foreground">{label}</span>
				<BarSeparator />
				{actions.map((action) => (
					<BarButton
						key={action.kind}
						icon={iconOf(action)}
						label={t(action.labelKey)}
						onClick={(event) => onEdit(action.kind, event.currentTarget)}
					/>
				))}
				{canBulk && <BarButton icon={<Archive />} label={t('taskViews.ARCHIVE')} onClick={onArchive} />}
				<BarSeparator />
				<BarButton
					icon={clearIcon}
					ariaLabel={t('pages.teamTasks.CLEAR_SELECTION')}
					className="text-muted-foreground"
					onClick={onClear}
				/>
			</div>
		</div>
	);
}
