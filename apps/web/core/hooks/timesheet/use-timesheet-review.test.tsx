/** @jest-environment jsdom */

import type { ReactNode } from 'react';
import { act, renderHook } from '@testing-library/react';
import { createStore, Provider } from 'jotai';
import { organizationTeamsState } from '@/core/stores';
import type { TOrganizationTeam } from '@/core/types/schemas';

jest.mock('@/core/hooks/roles/use-my-role-permissions-query', () => {
	const permissions = { myPermissions: ['TIME_TRACKER'] };
	return { useMyRolePermissionsQuery: () => permissions };
});
jest.mock('@/core/hooks/queries/user-user.query', () => {
	const query = { data: { id: 'kofi-user', employee: { id: 'kofi' } } };
	return { useUserQuery: () => query };
});

import { useTimesheetReviewer } from './use-timesheet-review';

function platformTeam(ronan: Record<string, unknown>): TOrganizationTeam {
	const members = [
		{ employeeId: 'kofi', isManager: true, isActive: true, isArchived: false },
		{ employeeId: 'ronan', isManager: false, isActive: true, isArchived: false, ...ronan }
	];
	return { id: 'platform', name: 'Platform', members } as unknown as TOrganizationTeam;
}

function renderReviewer(teams: TOrganizationTeam[]) {
	const store = createStore();
	store.set(organizationTeamsState, teams);
	const wrapper = ({ children }: { children: ReactNode }) => <Provider store={store}>{children}</Provider>;
	const rendered = renderHook(() => useTimesheetReviewer(), { wrapper });
	return { store, ...rendered };
}

describe('useTimesheetReviewer', () => {
	it('reads the role permissions, the own employee and the loaded teams', () => {
		const teams = [platformTeam({})];
		const { result } = renderReviewer(teams);

		expect(result.current.permissions).toEqual(['TIME_TRACKER']);
		expect(result.current.employeeId).toBe('kofi');
		expect(result.current.teams).toBe(teams);
	});

	it('keeps the same reviewer while the teams only refresh a member timer', () => {
		const { store, result } = renderReviewer([platformTeam({ timerStatus: 'idle' })]);
		const firstReviewer = result.current;

		act(() => {
			store.set(organizationTeamsState, [platformTeam({ timerStatus: 'running', totalTodayTasks: [] })]);
		});

		expect(result.current).toBe(firstReviewer);
	});

	it('gives a new reviewer when a membership the rule reads changes', () => {
		const { store, result } = renderReviewer([platformTeam({})]);
		const firstReviewer = result.current;

		act(() => {
			store.set(organizationTeamsState, [platformTeam({ isArchived: true })]);
		});

		expect(result.current).not.toBe(firstReviewer);
		const ronan = result.current.teams[0].members?.[1];
		expect(ronan?.isArchived).toBe(true);
	});

	it('gives a new reviewer when another member takes a place in a team read without employeeId', () => {
		const teamReadWithoutEmployeeIds = (memberId: string) => {
			const members = [
				{ employee: { id: 'kofi' }, isManager: true, isActive: true, isArchived: false },
				{ employee: { id: memberId }, isManager: false, isActive: true, isArchived: false }
			];
			return { id: 'platform', name: 'Platform', members } as unknown as TOrganizationTeam;
		};
		const { store, result } = renderReviewer([teamReadWithoutEmployeeIds('ronan')]);
		const firstReviewer = result.current;
		const teamsWithAma = [teamReadWithoutEmployeeIds('ama')];

		act(() => {
			store.set(organizationTeamsState, teamsWithAma);
		});

		expect(result.current).not.toBe(firstReviewer);
		expect(result.current.teams).toBe(teamsWithAma);
	});
});
