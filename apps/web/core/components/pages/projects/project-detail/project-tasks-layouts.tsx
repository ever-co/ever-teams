'use client';

import { useCallback, useMemo, useState } from 'react';
import {
	TeamTaskPicker,
	type TeamTaskPickerTarget
} from '@/core/components/pages/teams/team/tasks/list/team-task-picker';
import { TeamTasksCalendarView } from '@/core/components/pages/teams/team/tasks/list/team-tasks-calendar';
import type { TeamTasksListCommands } from '@/core/components/pages/teams/team/tasks/list/team-tasks-list';
import type { TeamTaskPickerKind } from '@/core/components/pages/teams/team/tasks/list/team-tasks-list-context';
import { TeamTasksTimelineView } from '@/core/components/pages/teams/team/tasks/list/team-tasks-timeline';
import { useTaskDrawer } from '@/core/hooks/tasks/use-task-drawer';
import { useTeamTasksView, type TeamTasksViewState } from '@/core/hooks/tasks/use-team-tasks-view';
import { DEFAULT_TEAM_TASKS_VIEW } from '@/core/lib/utils/team-tasks-view';
import { withLayout } from '@/core/lib/utils/team-tasks-view-storage';
import type { ITaskViewDefinition } from '@/core/types/interfaces/common/task-views';
import type { TTask } from '@/core/types/schemas/task/task.schema';

export type ProjectTasksLayout = 'calendar' | 'timeline';

function doNothing() {
	return undefined;
}

/** Every task of the project, done ones included, as the tab's list shows them. */
function initialViewOf(layout: ProjectTasksLayout): ITaskViewDefinition {
	const settings = withLayout(DEFAULT_TEAM_TASKS_VIEW, layout);
	return { settings, filters: {}, scope: 'all' };
}

/**
 * A project's tasks as the Team tasks calendar or timeline: the same views, fed with the project's tasks and kept in
 * memory, so the device's own Team tasks view stays as it is. A task opens in the drawer and the due date picker
 * opens here. The tab has no selection bar, so a Cmd or Ctrl click on a task selects nothing.
 */
export function ProjectTasksLayoutView({ layout, tasks }: Readonly<{ layout: ProjectTasksLayout; tasks: TTask[] }>) {
	const initial = useMemo(() => initialViewOf(layout), [layout]);
	const view = useTeamTasksView({ tasks, initial, resetKey: layout });
	const { openTaskDrawer } = useTaskDrawer();
	const [pickerTarget, setPickerTarget] = useState<TeamTaskPickerTarget | null>(null);
	const [isPickerOpen, setIsPickerOpen] = useState(false);
	// The tab has no selection bar: nothing is ever selected there.
	const [noSelection] = useState(() => new Set<string>());
	const { orderedIds } = view;

	const openPicker = useCallback(
		(kind: TeamTaskPickerKind, taskIds: string[], anchor: Element, shortcut?: string) => {
			setPickerTarget({ kind, taskIds, anchor, shortcut });
			setIsPickerOpen(true);
		},
		[]
	);
	const commands = useMemo<TeamTasksListCommands>(
		() => ({
			openTask: (taskId: string) => openTaskDrawer(taskId, orderedIds),
			openPicker,
			openMenu: doNothing,
			createTaskInGroup: doNothing
		}),
		[openPicker, openTaskDrawer, orderedIds]
	);
	const projectView = useMemo<TeamTasksViewState>(
		() => ({ ...view, selectedIds: noSelection, toggleSelected: doNothing }),
		[noSelection, view]
	);
	const isCalendar = layout === 'calendar';
	const isTimeline = layout === 'timeline';

	return (
		<div
			className="h-[min(78dvh,760px)] min-h-120 overflow-clip rounded-xl bg-card hairline-ring ring-border shadow-sm shadow-black/6.5"
			data-testid={`project-tasks-${layout}`}
		>
			{isCalendar && <TeamTasksCalendarView view={projectView} commands={commands} />}
			{isTimeline && <TeamTasksTimelineView view={projectView} commands={commands} />}
			<TeamTaskPicker
				target={pickerTarget}
				isOpen={isPickerOpen}
				statuses={view.statuses}
				taskById={view.taskById}
				onOpenChange={setIsPickerOpen}
				onClosed={() => setPickerTarget(null)}
			/>
		</div>
	);
}
