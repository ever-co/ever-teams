/** @jest-environment jsdom */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ShareProfileViewsToggle } from './switch';

const mockEditOrganizationTeam = jest.fn(async () => undefined);
let mockActiveTeam: Record<string, unknown> = {};

jest.mock('jotai', () => ({
	...jest.requireActual('jotai'),
	useAtomValue: () => mockActiveTeam
}));
jest.mock('@/core/stores', () => ({ activeTeamState: 'active-team' }));
jest.mock('../../hooks/organizations', () => ({
	useEditOrganizationTeam: () => ({ editOrganizationTeam: mockEditOrganizationTeam }),
	useOrganizationEmployeeTeams: () => ({})
}));
jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
jest.mock('./typography', () => ({ Text: ({ children }: React.PropsWithChildren) => <span>{children}</span> }));

/**
 * Turning profile sharing on or off saves the team with its managers. The list was rebuilt from the MANAGER, ADMIN and
 * SUPER_ADMIN roles only, so a manager who holds the flag without such a role was dropped, and the API took the
 * team's management away from them.
 */
describe('ShareProfileViewsToggle', () => {
	beforeEach(() => {
		mockEditOrganizationTeam.mockClear();
		mockActiveTeam = {
			id: 'team-1',
			shareProfileView: false,
			members: [
				{
					id: 'row-flagged',
					isManager: true,
					role: { name: 'EMPLOYEE' },
					employee: { id: 'employee-flagged' }
				},
				{ id: 'row-role', isManager: false, role: { name: 'MANAGER' }, employee: { id: 'employee-role' } },
				{ id: 'row-member', isManager: false, role: { name: 'EMPLOYEE' }, employee: { id: 'employee-member' } }
			]
		};
	});

	it('keeps every manager, flagged or by role, when the team is saved', async () => {
		render(<ShareProfileViewsToggle />);

		fireEvent.click(screen.getByRole('switch'));

		await waitFor(() => expect(mockEditOrganizationTeam).toHaveBeenCalledTimes(1));
		expect(mockEditOrganizationTeam).toHaveBeenCalledWith(
			expect.objectContaining({ shareProfileView: true, managerIds: ['employee-flagged', 'employee-role'] })
		);
	});

	it('sends the employee id of a member row whose employee was not loaded, and never an empty id', async () => {
		const members = mockActiveTeam.members as Record<string, unknown>[];
		members.push({ id: 'row-bare', isManager: true, employeeId: 'employee-bare' });

		render(<ShareProfileViewsToggle />);
		fireEvent.click(screen.getByRole('switch'));

		await waitFor(() => expect(mockEditOrganizationTeam).toHaveBeenCalledTimes(1));
		expect(mockEditOrganizationTeam).toHaveBeenCalledWith(
			expect.objectContaining({
				memberIds: ['employee-flagged', 'employee-role', 'employee-member', 'employee-bare'],
				managerIds: ['employee-flagged', 'employee-role', 'employee-bare']
			})
		);
	});
});
