import type { ITimeLogGroupedDailyReport } from '@/core/types/interfaces/activity/activity-report';
import { flattenDailyReport } from '@/core/lib/utils/daily-report-figures';
import { recentWorkOf } from './team';

jest.mock('@/core/hooks/activities/use-activity-filters', () => ({ getReportMemberIds: () => [] }));

const employee = { id: 'employee-a', fullName: 'Ada Lovelace', billRateValue: 50, billRateCurrency: 'EUR' };

const statedTask = (duration: number, billRateValue: number) => ({
	task: { id: 'task-home', title: 'home' },
	description: '',
	duration,
	client: null,
	billRateValue,
	billRateCurrency: 'EUR'
});

describe('recent work of a day tracked at two rates (#5212)', () => {
	it('adds the time of one task into one line, whatever rate each entry stores', () => {
		const report = [
			{
				date: '2026-11-02',
				logs: [
					{
						project: { id: 'project-a', name: 'Website' },
						employeeLogs: [
							{ employee, sum: 5400, activity: 0, tasks: [statedTask(3600, 40), statedTask(1800, 50)] }
						]
					}
				]
			}
		] as unknown as ITimeLogGroupedDailyReport[];
		const rows = flattenDailyReport(report);

		const [day] = recentWorkOf(rows, []);

		expect(rows).toHaveLength(2);
		expect(day.lines).toHaveLength(1);
		expect(day.lines[0].seconds).toBe(5400);
	});
});

describe('recent work on a project the API keeps from the reader (#5385)', () => {
	it('keeps the lock on the chip of a hidden project, and none on a visible one', () => {
		const report = [
			{
				date: '2026-11-09',
				logs: [
					{
						project: { id: 'project-client-x', projectHidden: true },
						employeeLogs: [{ employee, sum: 3600, activity: 0, tasks: [statedTask(3600, 50)] }]
					},
					{
						project: { id: 'project-website', name: 'Website' },
						employeeLogs: [{ employee, sum: 1800, activity: 0, tasks: [statedTask(1800, 50)] }]
					}
				]
			}
		] as unknown as ITimeLogGroupedDailyReport[];
		const rows = flattenDailyReport(report, null, null, { one: 'Private project', many: 'Private projects' });

		const projects = recentWorkOf(rows, []).flatMap((day) => day.lines.map((line) => line.project));

		const hidden = projects.find((project) => project?.name === 'Private project');
		const website = projects.find((project) => project?.name === 'Website');
		expect(hidden?.isProjectHidden).toBe(true);
		expect(website).not.toHaveProperty('isProjectHidden');
	});
});
