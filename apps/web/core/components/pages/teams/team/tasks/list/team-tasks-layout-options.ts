import type { DottedLanguageObjectStringPaths } from 'next-intl';
import { Calendar, Kanban, ListView, Table, Timeline, type IconComponent } from '@/core/components/icons';
import type { TeamTasksLayout } from '@/core/lib/utils/team-tasks-view';

interface LayoutOption {
	Icon: IconComponent;
	labelKey: DottedLanguageObjectStringPaths;
	hintKey: DottedLanguageObjectStringPaths;
}

/**
 * Each layout's glyph, its name and the sentence that says what it shows: the page's switch and the Views page both
 * read them, so a layout looks the same wherever it is named.
 */
export const TEAM_TASKS_LAYOUT_OPTIONS: Record<TeamTasksLayout, LayoutOption> = {
	list: {
		Icon: ListView,
		labelKey: 'pages.teamTasks.LAYOUT_LIST',
		hintKey: 'pages.teamTasks.LAYOUT_LIST_HINT'
	},
	board: {
		Icon: Kanban,
		labelKey: 'common.KANBAN',
		hintKey: 'pages.teamTasks.LAYOUT_BOARD_HINT'
	},
	calendar: {
		Icon: Calendar,
		labelKey: 'common.CALENDAR',
		hintKey: 'pages.teamTasks.LAYOUT_CALENDAR_HINT'
	},
	table: {
		Icon: Table,
		labelKey: 'common.TABLE',
		hintKey: 'pages.teamTasks.LAYOUT_TABLE_HINT'
	},
	timeline: {
		Icon: Timeline,
		labelKey: 'pages.teamTasks.LAYOUT_TIMELINE',
		hintKey: 'pages.teamTasks.LAYOUT_TIMELINE_HINT'
	}
};
