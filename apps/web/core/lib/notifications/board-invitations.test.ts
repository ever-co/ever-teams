import { EEmployeeNotificationType } from '@/core/types/interfaces/common/employee-notification';
import { boardInvitationHref, boardInviteeIdsOf, isBoardInvitation } from './board-invitations';

describe('Board invitations (#5022)', () => {
	const invitation = {
		type: EEmployeeNotificationType.Invitation,
		entity: 'OrganizationTeam',
		rawTitle: 'Ana Invited you to a Board with the Team "Design"'
	};

	it('tells a Board invitation from an invitation to join a team', () => {
		expect(isBoardInvitation(invitation)).toBe(true);
		expect(
			isBoardInvitation({ ...invitation, rawTitle: 'Ana Invited you to join the OrganizationTeam "Design"' })
		).toBe(false);
		expect(isBoardInvitation({ ...invitation, type: EEmployeeNotificationType.Assignment })).toBe(false);
		expect(isBoardInvitation({ ...invitation, entity: 'Task' })).toBe(false);
	});

	it('reads the action before the quoted team name, so a team named after it is still a team invitation', () => {
		expect(
			isBoardInvitation({
				...invitation,
				rawTitle: 'Ana Invited you to join the OrganizationTeam "Design Invited you to a Board with the Team"'
			})
		).toBe(false);
		expect(
			isBoardInvitation({ ...invitation, rawTitle: 'Ana Invited you to a Board with the Team "A "quoted" team"' })
		).toBe(true);
	});

	it('opens the Board app, told which deployment opened it, or the in-app board without one', () => {
		const href = new URL(boardInvitationHref('https://board.ever.team', 'https://app.ever.team'));
		expect(href.origin).toBe('https://board.ever.team');
		expect(href.searchParams.get('origin')).toBe('https://app.ever.team');
		expect(boardInvitationHref('', 'https://app.ever.team')).toBe('/board');
		expect(boardInvitationHref('not a url', 'https://app.ever.team')).toBe('/board');
	});

	it("names the picked people's employees among the team's members, once each", () => {
		const members = [
			{ employeeId: 'employee-1', employee: { id: 'employee-1', user: { id: 'user-1' } } },
			{ employeeId: 'employee-2', employee: { id: 'employee-2', user: { id: 'user-2' } } },
			{ employee: { id: 'employee-3', user: { id: 'user-3' } } }
		];
		expect(boardInviteeIdsOf(['user-1', 'user-3', 'user-9', 'user-1'], members)).toEqual([
			'employee-1',
			'employee-3'
		]);
		expect(boardInviteeIdsOf([], members)).toEqual([]);
	});
});
