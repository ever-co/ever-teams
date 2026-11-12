import {
	DEFAULT_TEAM_TASKS_VIEW,
	type TeamTaskProperty,
	type TeamTasksViewSettings
} from '@/core/lib/utils/team-tasks-view';
import { teamTasksGridOf, type TeamTasksGrid } from './team-tasks-grid';

const GUTTER_TRACK = '1.75rem';
const TITLE_TRACK = 'minmax(12rem,1fr)';
const MENU_TRACK = '2rem';
/** The only track of that width: it tells where the time worked sits. */
const PROGRESS_TRACK = '7.25rem';

function settingsWith(shown: Partial<Record<TeamTaskProperty, boolean>>): TeamTasksViewSettings {
	const properties = { ...DEFAULT_TEAM_TASKS_VIEW.properties, ...shown };
	return { ...DEFAULT_TEAM_TASKS_VIEW, properties };
}

function variableOf(grid: TeamTasksGrid, name: string) {
	const variables = grid.style as Record<string, string>;
	return variables[name];
}

function tracksOf(grid: TeamTasksGrid) {
	const template = variableOf(grid, '--team-task-grid');
	return template.split(' ');
}

/** The track a one-based grid column points at. */
function trackAt(grid: TeamTasksGrid, column: number | null) {
	if (column === null) {
		return undefined;
	}
	const tracks = tracksOf(grid);
	return tracks[column - 1];
}

describe('teamTasksGridOf, the template the labels, the bands and the rows share', () => {
	it('puts the number and the status left of the title, and the priority first on its right', () => {
		const grid = teamTasksGridOf(DEFAULT_TEAM_TASKS_VIEW);

		expect(grid.leading).toEqual(['number', 'status']);
		expect(grid.trailing).toEqual(['priority', 'labels', 'project', 'progress', 'dueDate', 'assignees']);
	});

	it('points the title and the time worked at their own columns of the template', () => {
		const grid = teamTasksGridOf(DEFAULT_TEAM_TASKS_VIEW);
		const progressColumn = grid.columnOf('progress');

		// gutter, number, status, then the title
		expect(grid.titleColumn).toBe(4);
		expect(trackAt(grid, grid.titleColumn)).toBe(TITLE_TRACK);
		// title, priority, labels, project, then the time worked
		expect(progressColumn).toBe(8);
		expect(trackAt(grid, progressColumn)).toBe(PROGRESS_TRACK);
	});

	it('gives the priority the first column after the title, wide enough for its label', () => {
		const grid = teamTasksGridOf(DEFAULT_TEAM_TASKS_VIEW);
		const priorityColumn = grid.columnOf('priority');

		expect(priorityColumn).toBe(grid.titleColumn + 1);
		expect(trackAt(grid, priorityColumn)).toBe('6rem');
	});

	it('removes the track of a hidden property and shifts the columns after it', () => {
		const withoutPriority = teamTasksGridOf(settingsWith({ priority: false }));
		expect(withoutPriority.trailing).toEqual(['labels', 'project', 'progress', 'dueDate', 'assignees']);
		expect(withoutPriority.columnOf('priority')).toBeNull();
		expect(withoutPriority.titleColumn).toBe(4);
		expect(withoutPriority.columnOf('progress')).toBe(7);
		expect(trackAt(withoutPriority, 7)).toBe(PROGRESS_TRACK);
		expect(tracksOf(withoutPriority)).toHaveLength(10);

		// A column left of the title moves the title too.
		const withoutNumber = teamTasksGridOf(settingsWith({ number: false }));
		expect(withoutNumber.leading).toEqual(['status']);
		expect(withoutNumber.titleColumn).toBe(3);
		expect(trackAt(withoutNumber, 3)).toBe(TITLE_TRACK);
		expect(withoutNumber.columnOf('progress')).toBe(7);
		expect(trackAt(withoutNumber, 7)).toBe(PROGRESS_TRACK);

		const withoutProgress = teamTasksGridOf(settingsWith({ progress: false }));
		expect(withoutProgress.columnOf('progress')).toBeNull();
		expect(tracksOf(withoutProgress)).not.toContain(PROGRESS_TRACK);
	});

	it('has one track per column, plus the gutter, the title and the menu', () => {
		const grid = teamTasksGridOf(DEFAULT_TEAM_TASKS_VIEW);
		expect(tracksOf(grid)).toEqual([
			GUTTER_TRACK,
			'4rem',
			'1.75rem',
			TITLE_TRACK,
			'6rem',
			'9.5rem',
			'8.5rem',
			PROGRESS_TRACK,
			'6rem',
			'5.5rem',
			MENU_TRACK
		]);
		expect(tracksOf(grid)).toHaveLength(grid.leading.length + grid.trailing.length + 3);

		const everyColumn = teamTasksGridOf(settingsWith({ size: true, created: true }));
		expect(everyColumn.trailing).toEqual([
			'priority',
			'labels',
			'size',
			'project',
			'progress',
			'dueDate',
			'created',
			'assignees'
		]);
		expect(tracksOf(everyColumn)).toHaveLength(2 + 8 + 3);

		const noColumn = teamTasksGridOf(
			settingsWith({
				number: false,
				status: false,
				priority: false,
				labels: false,
				project: false,
				progress: false,
				dueDate: false,
				assignees: false
			})
		);
		expect(tracksOf(noColumn)).toEqual([GUTTER_TRACK, TITLE_TRACK, MENU_TRACK]);
		expect(noColumn.titleColumn).toBe(2);
	});

	it('keeps the list at least as wide as its tracks, the priority label included', () => {
		const grid = teamTasksGridOf(DEFAULT_TEAM_TASKS_VIEW);
		expect(variableOf(grid, '--team-task-min-width')).toBe('64.25rem');

		const withoutPriority = teamTasksGridOf(settingsWith({ priority: false }));
		expect(variableOf(withoutPriority, '--team-task-min-width')).toBe('58.25rem');
	});
});
