import { flattenActivityReport } from './apps-urls';

/**
 * `GET /timesheet/activity/report?shape=lean` (ever-co/ever-gauzy#11730): the group heads carry a trimmed employee
 * and project, the rows under a head carry only their ids and numbers. The flattener reads the head's copy when a
 * row has none, so every usage row still names the person, the project, its image and colour, and the seconds.
 */
describe('flattenActivityReport on a lean report', () => {
	const leanReport = [
		{
			date: '2026-11-07',
			employees: [
				{
					employee: {
						id: 'employee-1',
						userId: 'user-1',
						kind: 'HUMAN',
						isOnline: true,
						isAway: false,
						fullName: 'Ada Lovelace',
						user: { id: 'user-1', name: 'Ada Lovelace', firstName: 'Ada', lastName: 'Lovelace', imageUrl: 'https://cdn.example.com/ada.png' }
					},
					projects: [
						{
							project: { id: 'project-1', name: 'Gauzy', imageUrl: 'https://cdn.example.com/gauzy.png', color: '#123456', membersCount: 7 },
							activity: [
								{ employeeId: 'employee-1', projectId: 'project-1', date: '2026-11-07', title: 'Chrome', duration: 300, sessions: 3, duration_percentage: '75.00' },
								{ employeeId: 'employee-1', projectId: 'project-1', date: '2026-11-07', title: 'Code', duration: '100', sessions: 1, duration_percentage: '25.00' }
							]
						},
						{
							project: null,
							activity: [{ employeeId: 'employee-1', projectId: null, date: '2026-11-07', title: 'Slack', duration: 60, sessions: 1, duration_percentage: '0.00' }]
						}
					]
				}
			]
		}
	];

	it('keeps the person, the project (image and colour) and the seconds of every row', () => {
		const rows = flattenActivityReport(leanReport);
		expect(rows).toHaveLength(3);
		const chrome = rows.find((row) => row.title === 'Chrome');
		expect(chrome).toMatchObject({
			dateKey: '2026-11-07',
			title: 'Chrome',
			seconds: 300,
			employee: { id: 'employee-1', name: 'Ada Lovelace', imageUrl: 'https://cdn.example.com/ada.png' },
			project: { id: 'project-1', name: 'Gauzy', imageUrl: 'https://cdn.example.com/gauzy.png', color: '#123456' }
		});
		expect(rows.find((row) => row.title === 'Code')).toMatchObject({ seconds: 100, employee: { id: 'employee-1' }, project: { id: 'project-1' } });
		// a row without a project keeps the person and lands under "no project"
		expect(rows.find((row) => row.title === 'Slack')).toMatchObject({
			seconds: 60,
			employee: { id: 'employee-1', name: 'Ada Lovelace' },
			project: { id: null, name: null, imageUrl: null, color: null }
		});
	});

	it('reads the full report the same way, preferring a row\'s own employee and project when present', () => {
		const fullRow = {
			employeeId: 'employee-1',
			projectId: 'project-1',
			date: '2026-11-07',
			title: 'Chrome',
			duration: 300,
			employee: { id: 'employee-1', fullName: 'Row Copy', user: { imageUrl: 'https://cdn.example.com/row.png' } },
			project: { id: 'project-1', name: 'Row Project', imageUrl: null, image: { thumbUrl: 'https://cdn.example.com/thumb.png' }, color: '#abcdef' }
		};
		const [row] = flattenActivityReport([{ date: '2026-11-07', employees: [{ employee: leanReport[0].employees[0].employee, projects: [{ project: leanReport[0].employees[0].projects[0].project, activity: [fullRow] }] }] }]);
		expect(row).toMatchObject({
			employee: { id: 'employee-1', name: 'Row Copy', imageUrl: 'https://cdn.example.com/row.png' },
			project: { id: 'project-1', name: 'Row Project', imageUrl: 'https://cdn.example.com/thumb.png', color: '#abcdef' },
			seconds: 300
		});
	});
});
