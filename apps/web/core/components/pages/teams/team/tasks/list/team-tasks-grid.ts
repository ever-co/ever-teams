import type { CSSProperties } from 'react';
import type { TeamTaskProperty, TeamTasksViewSettings } from '@/core/lib/utils/team-tasks-view';

/** The properties drawn in a column of their own; type and parent live inside the title cell. */
export type TeamTaskColumn = Exclude<TeamTaskProperty, 'issueType' | 'parent'>;

export const ROW_HEIGHT = 40;
export const GROUP_HEIGHT = 36;

const GUTTER_REM = 1.75;
const MENU_REM = 2;
const TITLE_MIN_REM = 14;

/** Left of the title: glyph-sized columns; right of it: the value columns, in the order the row reads. */
const LEADING_COLUMNS: TeamTaskColumn[] = ['priority', 'number', 'status'];
const TRAILING_COLUMNS: TeamTaskColumn[] = ['labels', 'size', 'project', 'progress', 'dueDate', 'created', 'assignees'];

const COLUMN_WIDTH_REM: Record<TeamTaskColumn, number> = {
	priority: 1.75,
	number: 4,
	status: 1.75,
	labels: 10,
	size: 5.5,
	project: 8.5,
	progress: 7.25,
	dueDate: 6,
	created: 5.25,
	assignees: 5.5
};

export interface TeamTasksGrid {
	leading: TeamTaskColumn[];
	trailing: TeamTaskColumn[];
	style: CSSProperties;
	/** One-based grid line where the title cell starts, for the group band's label to span what precedes it. */
	titleColumn: number;
	/** One-based column of a trailing property, for the group band's total; null when it is hidden. */
	columnOf: (column: TeamTaskColumn) => number | null;
}

function remOf(value: number) {
	return `${value}rem`;
}

function isShown(settings: TeamTasksViewSettings, column: TeamTaskColumn) {
	return settings.properties[column];
}

/** One template for the column labels, the group bands and the rows; below it the list scrolls sideways. */
export function teamTasksGridOf(settings: TeamTasksViewSettings): TeamTasksGrid {
	const leading = LEADING_COLUMNS.filter((column) => isShown(settings, column));
	const trailing = TRAILING_COLUMNS.filter((column) => isShown(settings, column));
	const tracks = [remOf(GUTTER_REM)];
	let minWidth = GUTTER_REM + TITLE_MIN_REM + MENU_REM;
	for (const column of leading) {
		const width = COLUMN_WIDTH_REM[column];
		tracks.push(remOf(width));
		minWidth += width;
	}
	tracks.push(`minmax(${remOf(TITLE_MIN_REM)},1fr)`);
	for (const column of trailing) {
		const width = COLUMN_WIDTH_REM[column];
		tracks.push(remOf(width));
		minWidth += width;
	}
	tracks.push(remOf(MENU_REM));
	const titleColumn = leading.length + 2;
	const columnOf = (column: TeamTaskColumn) => {
		const index = trailing.indexOf(column);
		if (index < 0) {
			return null;
		}
		return titleColumn + 1 + index;
	};
	const style = {
		'--team-task-grid': tracks.join(' '),
		'--team-task-min-width': remOf(minWidth)
	} as CSSProperties;
	return { leading, trailing, style, titleColumn, columnOf };
}

/**
 * Phones keep the status, the title, the people and the menu; from lg every chosen column joins on the shared
 * template. Cells hidden below lg carry `TEAM_TASK_WIDE_CELL`.
 */
export const TEAM_TASK_ROW_GRID =
	'grid grid-cols-[1.75rem_minmax(0,1fr)_auto_2rem] items-center lg:[grid-template-columns:var(--team-task-grid)]';

export const TEAM_TASK_WIDE_CELL = 'max-lg:hidden';

export const TEAM_TASK_LIST_MIN_WIDTH = 'lg:min-w-(--team-task-min-width)';
