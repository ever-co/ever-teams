/** @jest-environment jsdom */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { createStore, Provider } from 'jotai';
import type { PropsWithChildren } from 'react';
import type { Period } from '@/core/lib/utils/dashboard-period';
import { rowIdentityOfTask } from '@/core/lib/utils/dashboards/timesheet-sheet-edit';
import { emptySheetMemberOf } from '@/core/lib/utils/dashboards/timesheets';
import type { TOrganization } from '@/core/types/schemas/organization/organization.schema';
import type { TOrganizationProject } from '@/core/types/schemas/organization/organization-project.schema';
import type { TTask } from '@/core/types/schemas/task/task.schema';

const mockPermissions = jest.fn();
const mockProjects = jest.fn();

jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
jest.mock('sonner', () => {
	const toast = Object.assign(jest.fn(), { error: jest.fn(), success: jest.fn() });
	return { toast };
});
jest.mock('@/core/services/client/api/timesheets/time-log.service', () => ({ timeLogService: {} }));
jest.mock('@/core/hooks/organizations/projects/use-organization-projects-query', () => ({
	useOrganizationProjectsQuery: () => ({ organizationProjects: mockProjects() })
}));
jest.mock('@/core/hooks/roles/use-my-role-permissions-query', () => ({
	useMyRolePermissionsQuery: () => mockPermissions()
}));

import { currentOrganizationState } from '@/core/stores/user/user-organizations';
import { type SheetEditingSource, useSheetEditing } from './use-sheet-editing';
import { useTimesheetSheet } from './use-timesheet-sheet';

const period: Period = { from: new Date(2024, 0, 8), to: new Date(2024, 0, 14) };

const NO_PROJECTS: TOrganizationProject[] = [];

const VIEWER = emptySheetMemberOf('viewer', 'Viewer', null);
const TEAMMATE = emptySheetMemberOf('teammate', 'Teammate', null);

function sourceOf(overrides: Partial<SheetEditingSource>): SheetEditingSource {
	return {
		ownEmployeeId: 'viewer',
		hasOrganizationRole: false,
		period,
		periodLogs: [],
		hasPeriodLogs: true,
		isFiltered: false,
		tenantId: 'tenant',
		organizationId: 'organization',
		userTimeZone: 'UTC',
		...overrides
	};
}

function organizationOf(overrides: Partial<TOrganization>): TOrganization {
	return { id: 'organization', allowManualTime: true, ...overrides } as TOrganization;
}

interface Scenario {
	source: SheetEditingSource;
	member: typeof VIEWER;
	organization: TOrganization | null;
}

function renderEditing(scenario: Scenario) {
	const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	const store = createStore();
	store.set(currentOrganizationState, scenario.organization);
	const members = [scenario.member];
	const wrapper = ({ children }: PropsWithChildren) => (
		<Provider store={store}>
			<QueryClientProvider client={client}>{children}</QueryClientProvider>
		</Provider>
	);
	const { result } = renderHook(
		() => {
			const sheet = useTimesheetSheet(scenario.source.periodLogs, period, members);
			return useSheetEditing(scenario.source, sheet);
		},
		{ wrapper }
	);
	return result.current;
}

function renderSheetLock(scenario: Scenario) {
	return renderEditing(scenario).sheetLock;
}

describe('useSheetEditing', () => {
	beforeEach(() => {
		window.localStorage.clear();
		mockPermissions.mockReturnValue({ myPermissions: ['ALLOW_MANUAL_TIME'], isLoading: false });
		mockProjects.mockReturnValue(NO_PROJECTS);
	});

	it("opens the viewer's own sheet when their role may add manual time", () => {
		const lock = renderSheetLock({ source: sourceOf({}), member: VIEWER, organization: organizationOf({}) });

		expect(lock).toBe('none');
	});

	it('keeps the sheet read only without the manual time permission', () => {
		mockPermissions.mockReturnValue({ myPermissions: ['TIME_TRACKER'], isLoading: false });

		const lock = renderSheetLock({ source: sourceOf({}), member: VIEWER, organization: organizationOf({}) });

		expect(lock).toBe('permission');
	});

	it('keeps the sheet read only when the organization turns manual time off', () => {
		const organization = organizationOf({ allowManualTime: false });

		const lock = renderSheetLock({ source: sourceOf({}), member: VIEWER, organization });

		expect(lock).toBe('manualTimeOff');
	});

	it("opens another member's sheet to an organization role only", () => {
		const organization = organizationOf({});
		const asMember = renderSheetLock({ source: sourceOf({}), member: TEAMMATE, organization });
		const asAdmin = renderSheetLock({
			source: sourceOf({ hasOrganizationRole: true }),
			member: TEAMMATE,
			organization
		});

		expect(asMember).toBe('permission');
		expect(asAdmin).toBe('none');
	});

	it("stays closed until the period's logs and the permissions are read, and under a filter", () => {
		const organization = organizationOf({});
		const withoutLogs = renderSheetLock({
			source: sourceOf({ hasPeriodLogs: false }),
			member: VIEWER,
			organization
		});
		const filtered = renderSheetLock({ source: sourceOf({ isFiltered: true }), member: VIEWER, organization });
		mockPermissions.mockReturnValue({ myPermissions: [], isLoading: true });
		const withoutPermissions = renderSheetLock({ source: sourceOf({}), member: VIEWER, organization });

		expect(withoutLogs).toBe('loading');
		expect(filtered).toBe('filtered');
		expect(withoutPermissions).toBe('loading');
	});

	it("names a row added before the projects were read, and bills it, as its project says once they are", () => {
		const task = { id: 'task', projectId: 'project', title: 'Landing page' } as TTask;
		const addedEarly = rowIdentityOfTask(task, undefined, 'team');
		const drafts = { 'viewer:2024-01-08:2024-01-14': [addedEarly] };
		window.localStorage.setItem('timesheets-sheet-draft-rows', JSON.stringify(drafts));
		const project = { id: 'project', name: 'Website', billable: true } as TOrganizationProject;
		mockProjects.mockReturnValue([project]);

		const editing = renderEditing({ source: sourceOf({}), member: VIEWER, organization: organizationOf({}) });

		expect(addedEarly).toMatchObject({ projectName: null, isBillable: false });
		expect(editing.draftRows).toEqual([
			expect.objectContaining({ key: addedEarly.key, projectName: 'Website', isBillable: true })
		]);
	});
});
