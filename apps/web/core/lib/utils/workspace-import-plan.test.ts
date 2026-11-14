import type { WorkspaceTable } from './workspace-import-files';
import {
	billableOf,
	colorOf,
	hasAnythingToCreate,
	nameKeyOf,
	plannedProjectIdOf,
	tagNamesOf,
	workspaceImportPlanOf,
	type WorkspaceEntryRow,
	type WorkspacePlanInput
} from './workspace-import-plan';

function tableOf(fileName: string, kind: WorkspaceTable['kind'], headers: string[], rows: string[][]): WorkspaceTable {
	return {
		fileName,
		kind,
		table: { headers, records: rows.map((cells, index) => ({ row: index + 2, cells })) }
	};
}

function entry(row: number, patch: Partial<WorkspaceEntryRow>): WorkspaceEntryRow {
	return {
		row,
		projectName: '',
		clientName: '',
		tagNames: [],
		memberEmail: 'marie@studio.io',
		billable: null,
		readyEmployeeId: 'emp-marie',
		isMemberUnknown: false,
		billable: null,
		...patch
	};
}

const NONE: WorkspacePlanInput['existing'] = { clients: [], projects: [], labels: [] };

const MEMBERS = [
	{ employeeId: 'emp-marie', name: 'Marie Dupont' },
	{ employeeId: 'emp-paul', name: 'Paul Martin' }
];

describe('workspaceImportPlanOf', () => {
	it('plans the clients, projects and labels of the files, and counts the entries per member', () => {
		const plan = workspaceImportPlanOf({
			clientsFile: tableOf('clients.csv', 'clients', ['Name'], [['Acme'], ['Globex'], ['Initech']]),
			projectsFile: tableOf(
				'projects.csv',
				'projects',
				['Name', 'Client', 'Color', 'Billable'],
				[
					['Website', 'Acme', '#3366ff', 'Yes'],
					['App', 'Acme', 'ff9900', 'No'],
					['Audit', 'Globex', 'blue', ''],
					['Training', 'Initech', '', 'true'],
					['Internal', '', '', 'false']
				]
			),
			tagsFile: null,
			entryRows: [
				entry(2, { projectName: 'Website', tagNames: ['Design'] }),
				entry(3, { projectName: 'website', memberEmail: 'paul@studio.io', readyEmployeeId: 'emp-paul' }),
				entry(4, { projectName: 'Audit' })
			],
			existing: NONE,
			members: MEMBERS
		});

		expect(plan.clients).toEqual({ create: ['Acme', 'Globex', 'Initech'], reuse: [] });
		expect(plan.projects.create).toEqual([
			{ name: 'Website', clientName: 'Acme', color: '#3366FF', billable: true },
			{ name: 'App', clientName: 'Acme', color: '#FF9900', billable: false },
			{ name: 'Audit', clientName: 'Globex', color: null, billable: null },
			{ name: 'Training', clientName: 'Initech', color: null, billable: true },
			{ name: 'Internal', clientName: null, color: null, billable: false }
		]);
		expect(plan.labels).toEqual({ create: ['Design'], reuse: [] });
		expect(plan.entriesByMember).toEqual([
			{ employeeId: 'emp-marie', name: 'Marie Dupont', count: 2 },
			{ employeeId: 'emp-paul', name: 'Paul Martin', count: 1 }
		]);
		expect(plan.taggedEntryCount).toBe(1);
		expect(hasAnythingToCreate(plan)).toBe(true);
	});

	it('reuses what the workspace has, by name and letter case aside, and never plans it twice', () => {
		const plan = workspaceImportPlanOf({
			clientsFile: null,
			projectsFile: null,
			tagsFile: tableOf('tags.csv', 'tags', ['Tag'], [['design'], ['Urgent']]),
			entryRows: [
				entry(2, { projectName: ' WEBSITE ', clientName: 'acme', tagNames: ['Design', 'meeting'] }),
				entry(3, { projectName: 'Roadmap', clientName: 'Acme' })
			],
			existing: {
				clients: [{ id: 'client-acme', name: 'ACME' }],
				projects: [{ id: 'project-website', name: 'Website' }],
				labels: [{ id: 'label-design', name: 'Design' }]
			},
			members: MEMBERS
		});

		expect(plan.clients).toEqual({ create: [], reuse: [{ id: 'client-acme', name: 'ACME' }] });
		expect(plan.projects.reuse).toEqual([{ id: 'project-website', name: 'Website' }]);
		expect(plan.projects.create).toEqual([{ name: 'Roadmap', clientName: 'Acme', color: null, billable: null }]);
		expect(plan.labels).toEqual({ create: ['Urgent', 'meeting'], reuse: [{ id: 'label-design', name: 'Design' }] });
	});

	it('gives a project the billable default its entries agree on, unless the projects file gives one', () => {
		const plan = workspaceImportPlanOf({
			clientsFile: null,
			projectsFile: tableOf(
				'projects.csv',
				'projects',
				['Name', 'Billable'],
				[
					['Website', ''],
					['App', 'No']
				]
			),
			tagsFile: null,
			entryRows: [
				entry(2, { projectName: 'Website', billable: false }),
				entry(3, { projectName: 'App', billable: true }),
				entry(4, { projectName: 'Roadmap', billable: true }),
				entry(5, { projectName: 'roadmap', billable: null }),
				entry(6, { projectName: 'Roadmap', billable: true }),
				entry(7, { projectName: 'Audit', billable: true }),
				entry(8, { projectName: 'Audit', billable: false }),
				entry(9, { projectName: 'Training' })
			],
			existing: NONE,
			members: MEMBERS
		});

		expect(plan.projects.create.map((project) => [project.name, project.billable])).toEqual([
			['Website', false],
			['App', false],
			['Roadmap', true],
			['Audit', null],
			['Training', null]
		]);
	});

	it('lists the emails no member has apart, with their rows, and files none of them', () => {
		const plan = workspaceImportPlanOf({
			clientsFile: null,
			projectsFile: null,
			tagsFile: null,
			entryRows: [
				entry(2, { memberEmail: 'amina@agency.io', readyEmployeeId: null, isMemberUnknown: true }),
				entry(3, { memberEmail: 'AMINA@agency.io', readyEmployeeId: null, isMemberUnknown: true }),
				entry(4, {})
			],
			existing: NONE,
			members: MEMBERS
		});

		expect(plan.unknownEmails).toEqual([{ email: 'amina@agency.io', rows: [2, 3] }]);
		expect(plan.entriesByMember).toEqual([{ employeeId: 'emp-marie', name: 'Marie Dupont', count: 1 }]);
		expect(hasAnythingToCreate(plan)).toBe(false);
	});
});

describe('cell readers', () => {
	it('gives a project named only by entries the billable default its entries agree on', () => {
		const plan = workspaceImportPlanOf({
			clientsFile: null,
			projectsFile: null,
			tagsFile: null,
			entryRows: [
				entry(2, { projectName: 'Field', billable: true }),
				entry(3, { projectName: 'field', billable: true }),
				entry(4, { projectName: 'Mixed', billable: true }),
				entry(5, { projectName: 'Mixed', billable: false }),
				entry(6, { projectName: 'Unsaid' })
			],
			existing: NONE,
			members: MEMBERS
		});

		expect(plan.projects.create.map((project) => [project.name, project.billable])).toEqual([
			['Field', true],
			['Mixed', null],
			['Unsaid', null]
		]);
	});

	it('reads billable words, colours and label lists', () => {
		expect([billableOf('Yes'), billableOf('NO'), billableOf('maybe')]).toEqual([true, false, null]);
		expect([colorOf('#a1b2c3'), colorOf('A1B2C3'), colorOf('red')]).toEqual(['#A1B2C3', '#A1B2C3', null]);
		expect(tagNamesOf('Design, Meeting; urgent ,')).toEqual(['Design', 'Meeting', 'urgent']);
	});

	it('gives a project still to create a stand-in id from its name', () => {
		// Compared as the time import compares the project of an entry: spaces inside a name count
		expect(nameKeyOf('  My   Project ')).toBe('my   project');
		expect(plannedProjectIdOf('My Project')).toBe('planned:my project');
	});
});
