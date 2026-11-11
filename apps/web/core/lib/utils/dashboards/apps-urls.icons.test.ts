import { flattenActivityReport, titleTotalsOf } from './apps-urls';

/**
 * The report rows carry an app's or site's kind and a visited address where Gauzy sends them (`type`, `url`), for
 * their icons (#5023); a report without them still gives every row, with neither.
 */
describe('the kind and address of the usage rows', () => {
	const reportOf = (activity: Array<Record<string, unknown>>) => [
		{
			date: '2026-11-10',
			employees: [
				{
					employee: {
						id: 'employee-1',
						fullName: 'Ada Lovelace',
						user: { id: 'user-1', name: 'Ada Lovelace' }
					},
					projects: [{ project: null, activity }]
				}
			]
		}
	];

	it("reads Gauzy's type and address when the report has them", () => {
		const rows = flattenActivityReport(
			reportOf([
				{
					employeeId: 'employee-1',
					date: '2026-11-10',
					title: 'github.com',
					type: 'URL',
					url: 'https://github.com/ever-co',
					duration: 120
				},
				{ employeeId: 'employee-1', date: '2026-11-10', title: 'Figma', type: 'APP', duration: 60 }
			])
		);

		expect(rows.map((row) => [row.title, row.kind, row.url])).toEqual([
			['github.com', 'url', 'https://github.com/ever-co'],
			['Figma', 'app', null]
		]);
	});

	it('keeps them when two rows share a key and only the second carries them', () => {
		const rows = flattenActivityReport(
			reportOf([
				{ employeeId: 'employee-1', date: '2026-11-10', title: 'Pull requests', duration: 30 },
				{
					employeeId: 'employee-1',
					date: '2026-11-10',
					title: 'Pull requests',
					type: 'URL',
					url: 'https://github.com/ever-co/ever-teams/pulls',
					duration: 90
				}
			])
		);

		expect(rows).toHaveLength(1);
		expect([rows[0].kind, rows[0].url, rows[0].seconds]).toEqual([
			'url',
			'https://github.com/ever-co/ever-teams/pulls',
			120
		]);
	});

	it('keeps them for the period totals, from the first row that has them', () => {
		const rows = flattenActivityReport(
			reportOf([
				{ employeeId: 'employee-1', date: '2026-11-10', title: 'github.com', duration: 30 },
				{
					employeeId: 'employee-1',
					projectId: 'project-1',
					date: '2026-11-10',
					title: 'github.com',
					type: 'URL',
					url: 'https://github.com',
					duration: 90
				}
			])
		);

		expect(titleTotalsOf(rows)).toEqual([
			{ key: 'github.com', title: 'github.com', kind: 'url', url: 'https://github.com', seconds: 120 }
		]);
	});

	it('leaves them empty for a report without them', () => {
		const [row] = flattenActivityReport(
			reportOf([{ employeeId: 'employee-1', date: '2026-11-10', title: 'Chrome', duration: 10 }])
		);

		expect(row).toMatchObject({ title: 'Chrome', kind: null, url: null });
	});
});
