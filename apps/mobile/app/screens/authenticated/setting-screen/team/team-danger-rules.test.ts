import { canQuitTeamOf } from './team-danger-rules';

describe('quitting a team', () => {
	it('lets a member who is not a manager quit, where the phone never did', () => {
		expect(canQuitTeamOf({ isTeamManager: false, managerCount: 1, isMember: true })).toBe(true);
	});

	it('keeps the only manager in the team, and lets one of two managers quit', () => {
		expect(canQuitTeamOf({ isTeamManager: true, managerCount: 1, isMember: true })).toBe(false);
		expect(canQuitTeamOf({ isTeamManager: true, managerCount: 2, isMember: true })).toBe(true);
	});

	it('offers nothing to someone outside the team', () => {
		expect(canQuitTeamOf({ isTeamManager: false, managerCount: 1, isMember: false })).toBe(false);
	});

	it('offers nothing outside the team even to a manager of another team', () => {
		expect(canQuitTeamOf({ isTeamManager: true, managerCount: 2, isMember: false })).toBe(false);
	});
});
