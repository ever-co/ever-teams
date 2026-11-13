import { DEFAULT_TEAM_TASKS_VIEW } from '@/core/lib/utils/team-tasks-view';
import { withLayout } from '@/core/lib/utils/team-tasks-view-storage';
import type { ITaskViewDefinition } from '@/core/types/interfaces/common/task-views';

export type ProjectTasksLayout = 'calendar' | 'timeline';

/**
 * The view a project's tasks are drawn with: every task, done ones included, as the tab's list shows them, kept in
 * memory by `useTeamTasksView` (a view it starts from is never written to the device).
 */
export function projectTasksViewOf(layout: ProjectTasksLayout): ITaskViewDefinition {
	const settings = withLayout(DEFAULT_TEAM_TASKS_VIEW, layout);
	return { settings, filters: {}, scope: 'all' };
}
