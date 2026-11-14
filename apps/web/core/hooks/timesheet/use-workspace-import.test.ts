import type { TimeImportRow } from '@/core/lib/utils/time-import-rows';
import type { TimeImportSheet } from '@/core/lib/utils/time-import-sheet';
import type { WorkspaceTable } from '@/core/lib/utils/workspace-import-files';
import {
	existingListsStateOf,
	extraProjectsOfSheet,
	labelRequestOf,
	recordsWithCreated,
	workspaceEntryRowsOf,
	workspaceImportRightsOf
} from './use-workspace-import';

jest.mock('@/core/hooks/clients/use-clients-query', () => ({ useClientsQuery: jest.fn() }));
jest.mock('@/core/hooks/organizations/projects/use-organization-projects-query', () => ({
	useOrganizationProjectsQuery: jest.fn()
}));
jest.mock('@/core/hooks/tasks/use-task-labels-query', () => ({ useTaskLabelsQuery: jest.fn() }));
jest.mock('@/core/hooks/tasks/use-invalidate-task-labels', () => ({ useInvalidateTaskLabels: jest.fn() }));
jest.mock('@/core/hooks/roles/use-my-role-permissions-query', () => ({ useMyRolePermissionsQuery: jest.fn() }));
jest.mock('@/core/hooks/timesheet/use-time-import', () => ({ useTimeImport: jest.fn() }));
jest.mock('@/core/services/client/api/organizations', () => ({
	organizationContactService: {},
	organizationProjectService: {}
}));
jest.mock('@/core/services/client/api/tasks/task-label.service', () => ({ taskLabelService: {} }));

const NO_CELLS = {
	date: '',
	startTime: '',
	endDate: '',
	endTime: '',
	duration: '',
	project: '',
	task: '',
	notes: '',
	billable: '',
	memberEmail: ''
};

function sheetOf(projects: string[]): TimeImportSheet {
	return {
		rows: projects.map((project, index) => ({
			row: index + 2,
			cells: { ...NO_CELLS, project },
			extraCellCount: 0
		})),
		ignoredHeaders: [],
		dateOrder: 'ymd'
	} as unknown as TimeImportSheet;
}

describe('workspaceImportRightsOf', () => {
	it('lets start only a role that may add and see clients and add projects', () => {
		expect(workspaceImportRightsOf(['ORG_CONTACT_ADD', 'ORG_CONTACT_VIEW', 'ORG_PROJECT_ADD'])).toEqual({
			canStart: true,
			canCreateLabels: false
		});
		expect(workspaceImportRightsOf(['ALL_ORG_EDIT', 'ORG_CONTACT_EDIT', 'ORG_CONTACT_VIEW'])).toEqual({
			canStart: true,
			canCreateLabels: true
		});
		expect(workspaceImportRightsOf(['ORG_CONTACT_ADD', 'ORG_CONTACT_VIEW']).canStart).toBe(false);
		expect(workspaceImportRightsOf(['ORG_PROJECT_ADD', 'ORG_CONTACT_VIEW']).canStart).toBe(false);
		expect(workspaceImportRightsOf([]).canStart).toBe(false);
	});
});

describe('extraProjectsOfSheet', () => {
	it('adds each project the team lacks once: the organization one when it exists, else a stand-in', () => {
		const extra = extraProjectsOfSheet(
			sheetOf(['Website', 'website ', 'Audit', 'Roadmap', '']),
			[{ id: 'team-audit', name: 'audit' }],
			[{ id: 'org-website', name: 'Website' }]
		);

		expect(extra).toEqual([
			{ id: 'org-website', name: 'Website' },
			{ id: 'planned:roadmap', name: 'Roadmap' }
		]);
	});
});

describe('workspaceEntryRowsOf', () => {
	it('reads the client and labels of each judged row from the entries file, by its line', () => {
		const entries: WorkspaceTable = {
			fileName: 'time.csv',
			kind: 'entries',
			table: {
				headers: ['Email', 'Project', 'Client', 'Tags', 'Start Date'],
				records: [
					{ row: 2, cells: ['marie@studio.io', 'Website', 'Acme', 'Design, Meeting', '2026-10-01'] },
					{ row: 4, cells: ['amina@agency.io', 'Audit', '', '', '2026-10-02'] }
				]
			}
		};
		const rows = [
			{
				row: 2,
				cells: { ...NO_CELLS, project: 'Website', memberEmail: 'marie@studio.io' },
				entry: { employeeId: 'emp-marie' },
				problems: []
			},
			{
				row: 3,
				cells: { ...NO_CELLS, project: 'Audit', memberEmail: 'amina@agency.io' },
				entry: null,
				problems: [{ code: 'memberUnknown' }]
			}
		] as unknown as TimeImportRow[];

		expect(workspaceEntryRowsOf(rows, entries)).toEqual([
			{
				row: 2,
				projectName: 'Website',
				clientName: 'Acme',
				tagNames: ['Design', 'Meeting'],
				memberEmail: 'marie@studio.io',
				readyEmployeeId: 'emp-marie',
				isMemberUnknown: false
			},
			{
				row: 3,
				projectName: 'Audit',
				clientName: '',
				tagNames: [],
				memberEmail: 'amina@agency.io',
				readyEmployeeId: null,
				isMemberUnknown: true
			}
		]);
	});
});

describe('labelRequestOf', () => {
	it('files a label with the team and the color the app gives that name, which the API requires', () => {
		const scope = { tenantId: 'tenant-a', organizationId: 'organization-a', organizationTeamId: 'team-a' };

		const request = labelRequestOf('Design', scope);

		expect(request).toEqual({
			name: 'Design',
			color: expect.stringMatching(/^#[0-9a-f]{6}$/i),
			organizationId: 'organization-a',
			tenantId: 'tenant-a',
			organizationTeamId: 'team-a'
		});
		expect(labelRequestOf('Design', scope).color).toBe(request.color);
	});
});

describe('existingListsStateOf', () => {
	it('plans only once the clients, the projects and the labels are all read, and says when one failed', () => {
		const read = { isLoaded: true, isError: false };
		const reading = { isLoaded: false, isError: false };
		const failed = { isLoaded: false, isError: true };

		expect(existingListsStateOf([read, read, reading])).toEqual({ areLoaded: false, haveFailed: false });
		expect(existingListsStateOf([read, read, failed])).toEqual({ areLoaded: false, haveFailed: true });
		expect(existingListsStateOf([read, read, read])).toEqual({ areLoaded: true, haveFailed: false });
	});
});

describe('recordsWithCreated', () => {
	it('adds what an earlier run created to the lists read, until they come back with it', () => {
		const read = [{ id: 'client-initech', name: 'Initech' }];
		const created = [
			{ id: 'client-acme', name: 'Acme' },
			{ id: 'client-initech', name: 'Initech' }
		];

		expect(recordsWithCreated(read, created)).toEqual([
			{ id: 'client-initech', name: 'Initech' },
			{ id: 'client-acme', name: 'Acme' }
		]);
		expect(recordsWithCreated(read, [])).toBe(read);
	});
});
