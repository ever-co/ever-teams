import { flattenDailyReport, groupRowsBy, projectKeyOf } from '@/core/lib/utils/daily-report-figures';
import { myWeekProjectsOf, type MyWeekEntry } from '@/core/lib/utils/dashboards/my-week';
import { pricedProjectIdOf } from '@/core/lib/utils/dashboards/time-activity-billable';
import { exportRowsOf, reportTotalsOf } from '@/core/lib/utils/dashboards/time-activity';
import { timesheetExportRowsOf } from '@/core/lib/utils/dashboards/timesheet-export';
import {
	logMatchesPickedProjectsAndTasks,
	NO_PROJECT_VALUE,
	projectFilterValueOf,
	rowIdentityOfLog
} from '@/core/lib/utils/dashboards/timesheets';
import { PRIVATE_PROJECTS_KEY } from '@/core/lib/utils/project-visibility';
import type { ITimeLogGroupedDailyReport } from '@/core/types/interfaces/activity/activity-report';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';

/**
 * CORE-27 (ever-co/ever-teams#5370): where the API keeps a private project from the reader, it answers it as its id
 * and `projectHidden`. Ever Teams names that time "Private project", gathers every such project on one "Private
 * projects" row or choice beside "No project", and never shows "No project" or an id for it.
 */

const LABELS = { one: 'Private project', many: 'Private projects' };
const CLIENT_X = 'project-client-x-redesign';
const AUDIT = 'project-internal-audit';
const WEBSITE = 'project-website';
const HOUR = 3600;

const marie = { id: 'employee-marie', fullName: 'Marie', user: { imageUrl: null } };

function projectLog(project: Record<string, unknown> | null, seconds: number) {
	return {
		project,
		employeeLogs: [{ employee: marie, sum: seconds, activity: 50, tasks: [] }]
	};
}

// Marie's week: 12 h on the private "Client X redesign", 2 h on another private project, 3 h on the website
const REPORT = [
	{
		date: '2026-11-09',
		logs: [
			projectLog({ id: CLIENT_X, projectHidden: true }, 12 * HOUR),
			projectLog({ id: AUDIT, projectHidden: true }, 2 * HOUR),
			projectLog({ id: WEBSITE, name: 'Website', imageUrl: null, color: '#0ea5e9' }, 3 * HOUR)
		]
	}
] as unknown as ITimeLogGroupedDailyReport[];

describe('the daily report of a reader who is not on some private projects', () => {
	const rows = flattenDailyReport(REPORT, null, null, LABELS);

	it('names the time of a hidden project as a private project, never by an id', () => {
		const hidden = rows.filter((row) => row.isProjectHidden);

		expect(hidden).toHaveLength(2);
		for (const row of hidden) {
			expect(row.projectName).toBe('Private project');
			expect(row.projectGroupName).toBe('Private projects');
			expect(row.projectImageUrl).toBeNull();
		}
	});

	it('gathers every hidden project on one "Private projects" row, and leaves the total as it was', () => {
		const groups = groupRowsBy(rows, projectKeyOf);

		expect(groups.map((group) => [group.key, group.seconds])).toEqual([
			[PRIVATE_PROJECTS_KEY, 14 * HOUR],
			[WEBSITE, 3 * HOUR]
		]);
		expect(reportTotalsOf(rows).seconds).toBe(17 * HOUR);
	});

	it('prices the time of a hidden project by the project it was logged on', () => {
		const clientX = rows.find((row) => row.loggedProjectId === CLIENT_X);

		expect(clientX && pricedProjectIdOf(clientX)).toBe(CLIENT_X);
	});

	it('leaves the rows of the projects the reader sees as they were', () => {
		const website = rows.find((row) => row.projectId === WEBSITE);

		expect(website).not.toHaveProperty('isProjectHidden');
		expect(website).not.toHaveProperty('projectGroupName');
		expect(website?.projectName).toBe('Website');
	});

	it('writes "Private project" in the project column of an export', () => {
		const exported = exportRowsOf(REPORT, null, null, null, null, 'Private project');

		expect(exported.filter((row) => row.projectKey === PRIVATE_PROJECTS_KEY).map((row) => row.project)).toEqual([
			'Private project',
			'Private project'
		]);
		expect(exported.find((row) => row.projectKey === WEBSITE)?.project).toBe('Website');
	});
});

function timeLog(id: string, project: Record<string, unknown> | null): ITimeLog {
	return {
		id,
		startedAt: '2026-11-09T08:00:00.000Z',
		stoppedAt: '2026-11-09T09:00:00.000Z',
		projectId: (project?.id as string) ?? null,
		project,
		employee: { id: 'employee-marie', fullName: 'Marie' }
	} as unknown as ITimeLog;
}

describe('Timesheets for a reader who is not on some private projects', () => {
	const clientX = timeLog('log-1', { id: CLIENT_X, projectHidden: true });
	const audit = timeLog('log-2', { id: AUDIT, projectHidden: true });
	const withoutProject = timeLog('log-3', null);
	const website = timeLog('log-4', { id: WEBSITE, name: 'Website' });

	it('puts every hidden project under one filter choice, apart from "No project"', () => {
		expect(projectFilterValueOf(clientX)).toBe(PRIVATE_PROJECTS_KEY);
		expect(projectFilterValueOf(audit)).toBe(PRIVATE_PROJECTS_KEY);
		expect(projectFilterValueOf(withoutProject)).toBe(NO_PROJECT_VALUE);
		expect(projectFilterValueOf(website)).toBe(WEBSITE);
	});

	it('keeps the entries of the hidden projects when "Private projects" is picked', () => {
		const picked = [PRIVATE_PROJECTS_KEY];
		const kept = [clientX, audit, withoutProject, website].filter((log) =>
			logMatchesPickedProjectsAndTasks(log, picked, [])
		);

		expect(kept.map((log) => log.id)).toEqual(['log-1', 'log-2']);
	});

	it('flags the week sheet row of a hidden project, and saves its own project', () => {
		const identity = rowIdentityOfLog(clientX);

		expect(identity.isProjectHidden).toBe(true);
		expect(identity.projectId).toBe(CLIENT_X);
		expect(rowIdentityOfLog(website)).not.toHaveProperty('isProjectHidden');
	});

	it('writes "Private project" in the project column of an export', () => {
		const exported = timesheetExportRowsOf([clientX, website], 'Private project');

		expect(exported.map((row) => row.project)).toEqual(['Private project', 'Website']);
	});
});

describe('My week of a person whose time went to private projects they are not on', () => {
	it('shows that time on one "Private projects" row', () => {
		const entryOf = (id: string, project: MyWeekEntry['project'], seconds: number) =>
			({ id, project, seconds }) as unknown as MyWeekEntry;
		const hidden = {
			id: PRIVATE_PROJECTS_KEY,
			name: '',
			color: null,
			imageUrl: null,
			isProjectHidden: true as const
		};
		const projects = myWeekProjectsOf([
			entryOf('log-1', hidden, 12 * HOUR),
			entryOf('log-2', hidden, 2 * HOUR),
			entryOf('log-3', { id: WEBSITE, name: 'Website', color: null, imageUrl: null }, 3 * HOUR)
		]);

		expect(projects.map((project) => [project.key, project.seconds, project.isProjectHidden])).toEqual([
			[PRIVATE_PROJECTS_KEY, 14 * HOUR, true],
			[WEBSITE, 3 * HOUR, undefined]
		]);
	});
});
