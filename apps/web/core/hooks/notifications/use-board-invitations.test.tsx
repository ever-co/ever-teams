/** @jest-environment jsdom */

import { renderHook } from '@testing-library/react';

let mockActiveTeam: { id?: string; members?: unknown[] } | null = null;
const mockInviteToBoard = jest.fn(async (input: { organizationTeamId: string; receiverEmployeeIds: string[] }) => ({
	invited: input.receiverEmployeeIds.length
}));

jest.mock('@/core/stores', () => ({ activeTeamState: 'active-team' }));
jest.mock('jotai', () => ({ useAtomValue: () => mockActiveTeam }));
jest.mock('@/core/services/client/api/notifications/employee-notification.service', () => ({
	employeeNotificationService: {
		inviteToBoard: (input: { organizationTeamId: string; receiverEmployeeIds: string[] }) =>
			mockInviteToBoard(input)
	}
}));

import { useBoardInvitations } from './use-board-invitations';

function teamOf(size: number) {
	const members = Array.from({ length: size }, (_, index) => ({
		employeeId: `employee-${index}`,
		employee: { id: `employee-${index}`, user: { id: `user-${index}` } }
	}));
	return { id: 'team-1', members };
}

describe('useBoardInvitations (#5022)', () => {
	beforeEach(() => {
		mockInviteToBoard.mockClear();
	});

	it('invites everyone picked in a large team, in requests Gauzy takes (50 invitees at most)', () => {
		mockActiveTeam = teamOf(120);
		const { result } = renderHook(() => useBoardInvitations());

		result.current(Array.from({ length: 120 }, (_, index) => `user-${index}`));

		const requests = mockInviteToBoard.mock.calls.map(([input]) => input);
		expect(requests.length).toBeGreaterThan(1);
		for (const request of requests) {
			expect(request.organizationTeamId).toBe('team-1');
			expect(request.receiverEmployeeIds.length).toBeLessThanOrEqual(50);
		}
		const invited = requests.flatMap((request) => request.receiverEmployeeIds);
		expect(invited).toHaveLength(120);
		expect(new Set(invited).size).toBe(120);
	});

	it('sends one request for a few teammates, and none for nobody picked or no team', () => {
		mockActiveTeam = teamOf(3);
		const { result, rerender } = renderHook(() => useBoardInvitations());

		result.current(['user-1', 'user-2']);
		expect(mockInviteToBoard).toHaveBeenCalledTimes(1);
		expect(mockInviteToBoard).toHaveBeenCalledWith({
			organizationTeamId: 'team-1',
			receiverEmployeeIds: ['employee-1', 'employee-2']
		});

		result.current([]);
		mockActiveTeam = null;
		rerender();
		result.current(['user-1']);
		expect(mockInviteToBoard).toHaveBeenCalledTimes(1);
	});

	it('keeps a refused request to itself: the Board opens whatever Gauzy answers', async () => {
		mockActiveTeam = teamOf(2);
		mockInviteToBoard.mockRejectedValueOnce(new Error('Not Found'));
		const { result } = renderHook(() => useBoardInvitations());

		expect(() => result.current(['user-0'])).not.toThrow();
		await Promise.resolve();
	});
});
