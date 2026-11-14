import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const WEB = resolve(__dirname, '../..');

/**
 * Files that write a time of day where people track time. They read the workspace locale, so the time follows the
 * workspace clock: a formatter built from the reader's language alone writes the language's clock instead.
 */
const TIME_WRITERS = [
	'core/components/calendar/calendar-page-skeleton.tsx',
	'core/components/dashboards/apps-urls/apps-urls-day.tsx',
	'core/components/dashboards/kit/hour-axis.tsx',
	'core/components/dashboards/my-week/my-week-recent-entries.tsx',
	'core/components/dashboards/team/team-day-timeline.tsx',
	'core/components/dashboards/team/team-hour-heatmap.tsx',
	'core/components/dashboards/team/use-team-export-options.tsx',
	'core/components/features/manual-time/duration-field.tsx',
	'core/components/features/manual-time/time-overlap-confirm-dialog.tsx',
	'core/components/pages/profile/screenshots/screenshot-item.tsx',
	'core/components/pages/profile/screenshots/screenshot-details.tsx',
	'core/components/pages/profile/screenshots/screenshoots.tsx',
	'core/hooks/activities/use-manual-time.ts',
	'core/hooks/timer/use-stale-timer-guard.ts',
	'core/hooks/timesheet/use-time-entry-duplicate.ts'
];

describe('times of day follow the workspace clock', () => {
	it.each(TIME_WRITERS)('%s writes times with the workspace locale', (file) => {
		const source = readFileSync(resolve(WEB, file), 'utf8');

		expect(source).toContain('useWorkspaceLocale()');
		expect(source).not.toMatch(/new Intl\.DateTimeFormat\(locale\b/);
		expect(source).not.toMatch(/\.toLocale(Time|Date)?String\(locale\b/);
	});
});
