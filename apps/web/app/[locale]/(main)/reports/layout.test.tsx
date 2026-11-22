/**
 * @jest-environment jsdom
 *
 * Amani is a member of Developers and manages no team (#5623). My work, Time & activity opens
 * `/reports/time-and-activity`, a report that reads only her own time for anyone who manages nothing: it opens for her
 * once her membership is known, while the other reports keep turning her back to the team home.
 */
import { render, screen } from '@testing-library/react';

const mockReplace = jest.fn();
const mockSegment = { current: 'time-and-activity' as string | null };
const mockPermissions = { myPermissions: ['TIME_TRACKER'] as string[], isLoading: false };
const SELF = { id: 'm-self', employee: { userId: 'amani-user' } };
const OTHER = { id: 'm-other', employee: { userId: 'kofi-user' } };
const mockAuth = {
	user: { id: 'amani-user', employee: { id: 'amani' }, role: { name: 'EMPLOYEE' } } as {
		id: string;
		employee?: { id: string };
		role?: { name: string };
	},
	isTeamManager: false
};
const mockTeams = {
	getOrganizationTeamsLoading: false,
	teams: [{ id: 'developers' }],
	activeTeam: { members: [OTHER, SELF] } as { members: unknown[] } | null
};

jest.mock('next/navigation', () => ({
	useRouter: () => ({ replace: mockReplace, push: jest.fn() }),
	useSelectedLayoutSegment: () => mockSegment.current
}));
jest.mock('next/dynamic', () => () => () => <div data-testid="report-skeleton" />);
jest.mock('@/core/hooks', () => ({ useAuthenticateUser: () => mockAuth }));
jest.mock('@/core/hooks/organizations', () => ({ useOrganizationTeamsQuery: () => mockTeams }));
jest.mock('@/core/hooks/organizations/teams/use-are-teams-settled', () => ({ useAreTeamsSettled: () => true }));
jest.mock('@/core/hooks/roles/use-my-role-permissions-query', () => ({
	useMyRolePermissionsQuery: () => mockPermissions
}));
jest.mock('@/core/components/common/global-skeleton', () => () => <div data-testid="skeleton" />);

import ReportsLayout from './layout';

function renderReport(segment: string) {
	mockSegment.current = segment;
	return render(
		<ReportsLayout>
			<div>report</div>
		</ReportsLayout>
	);
}

describe('the Reports layout for a member who manages no team (#5623)', () => {
	beforeEach(() => {
		mockReplace.mockReset();
		mockAuth.isTeamManager = false;
		mockAuth.user = { id: 'amani-user', employee: { id: 'amani' }, role: { name: 'EMPLOYEE' } };
		mockPermissions.myPermissions = ['TIME_TRACKER'];
		mockPermissions.isLoading = false;
		mockTeams.activeTeam = { members: [OTHER, SELF] };
	});

	it('opens Time & activity, which reads only her own time, instead of sending her home', () => {
		renderReport('time-and-activity');

		expect(screen.getByText('report')).toBeTruthy();
		expect(mockReplace).not.toHaveBeenCalled();
	});

	it('waits for her membership before deciding, as for every report', () => {
		mockTeams.activeTeam = { members: [OTHER] };

		renderReport('time-and-activity');

		expect(screen.queryByText('report')).toBeNull();
		expect(mockReplace).not.toHaveBeenCalled();
	});

	it('waits for the permissions of her role before deciding', () => {
		mockPermissions.myPermissions = [];
		mockPermissions.isLoading = true;

		renderReport('time-and-activity');

		expect(screen.queryByText('report')).toBeNull();
		expect(mockReplace).not.toHaveBeenCalled();
	});

	it('CONTROL: still sends her home from the reports of the team, such as Timesheets', () => {
		renderReport('timesheet');

		expect(screen.queryByText('report')).toBeNull();
		expect(mockReplace).toHaveBeenCalledWith('/');
	});

	it('CONTROL: still sends home a role that may not read time reports at all', () => {
		mockPermissions.myPermissions = ['INBOX_VIEW'];

		renderReport('time-and-activity');

		expect(screen.queryByText('report')).toBeNull();
		expect(mockReplace).toHaveBeenCalledWith('/');
	});

	it('CONTROL: a team manager still opens every report', () => {
		mockAuth.isTeamManager = true;

		renderReport('timesheet');

		expect(screen.getByText('report')).toBeTruthy();
		expect(mockReplace).not.toHaveBeenCalled();
	});
});
