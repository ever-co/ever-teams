import { isTaskViewsEnabled } from './task-views-enabled';
import type { TeamTasksLayout, TeamTasksViewSettings } from './team-tasks-view';

const ON_EVERY_DEPLOYMENT: TeamTasksLayout[] = ['list', 'calendar', 'table'];

const WITH_SAVED_VIEWS: TeamTasksLayout[] = ['list', 'board', 'calendar', 'table', 'timeline'];

/**
 * The layouts this deployment offers, in the order the page's switch shows them: the list, the calendar and the
 * table everywhere, the board and the timeline with the saved-views feature they came with.
 */
export function availableTeamTasksLayouts(): TeamTasksLayout[] {
	if (isTaskViewsEnabled()) {
		return WITH_SAVED_VIEWS;
	}
	return ON_EVERY_DEPLOYMENT;
}

/** The layout the page draws: the view's own when this deployment offers it, the list otherwise. */
export function shownTeamTasksLayout(settings: Pick<TeamTasksViewSettings, 'layout'>): TeamTasksLayout {
	const layout = settings.layout ?? 'list';
	const isOffered = availableTeamTasksLayouts().includes(layout);
	if (!isOffered) {
		return 'list';
	}
	return layout;
}
