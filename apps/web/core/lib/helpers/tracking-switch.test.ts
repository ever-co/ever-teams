import { ERoleName } from '@/core/types/generics/enums/role';
import { mayTurnTrackingOf, rankInTeam, rankOfRole, type TrackingSwitchRank } from './tracking-switch';

/**
 * Who may turn someone's time tracking on or off (#5015): only someone of a higher role, and an admin also for another
 * admin. The same rule Gauzy applies before it accepts the change.
 */
describe('tracking switch rule', () => {
	it.each([
		{ roleName: ERoleName.SUPER_ADMIN, rank: 'admin' },
		{ roleName: ERoleName.ADMIN, rank: 'admin' },
		{ roleName: ERoleName.MANAGER, rank: 'manager' },
		{ roleName: ERoleName.EMPLOYEE, rank: 'member' },
		{ roleName: ERoleName.VIEWER, rank: 'member' },
		{ roleName: undefined, rank: 'member' },
		{ roleName: null, rank: 'member' }
	])('ranks the role $roleName as $rank', ({ roleName, rank }) => {
		expect(rankOfRole(roleName)).toBe(rank);
	});

	it('raises a member who manages the team to manager, and never lowers a rank', () => {
		expect(rankInTeam('member', true)).toBe('manager');
		expect(rankInTeam('member', false)).toBe('member');
		expect(rankInTeam('manager', false)).toBe('manager');
		expect(rankInTeam('admin', true)).toBe('admin');
		expect(rankInTeam('admin', false)).toBe('admin');
	});

	it.each<{ who: string; whom: string; actor: TrackingSwitchRank; target: TrackingSwitchRank; allowed: boolean }>([
		{ who: 'an admin', whom: 'another admin, or themselves', actor: 'admin', target: 'admin', allowed: true },
		{ who: 'an admin', whom: 'a manager', actor: 'admin', target: 'manager', allowed: true },
		{ who: 'an admin', whom: 'a member', actor: 'admin', target: 'member', allowed: true },
		{ who: 'a manager', whom: 'a member', actor: 'manager', target: 'member', allowed: true },
		{
			who: 'a manager',
			whom: 'another manager, or themselves',
			actor: 'manager',
			target: 'manager',
			allowed: false
		},
		{ who: 'a manager', whom: 'an admin', actor: 'manager', target: 'admin', allowed: false },
		{ who: 'a member', whom: 'another member, or themselves', actor: 'member', target: 'member', allowed: false },
		{ who: 'a member', whom: 'a manager', actor: 'member', target: 'manager', allowed: false },
		{ who: 'a member', whom: 'an admin', actor: 'member', target: 'admin', allowed: false }
	])('$who acting on $whom: $allowed', ({ actor, target, allowed }) => {
		expect(mayTurnTrackingOf(actor, target)).toBe(allowed);
	});
});
