import { createStore } from 'jotai';
import { activeTeamIdState, organizationTeamsState } from '@/core/stores/teams/organization-team';
import { timerStatusState } from '@/core/stores/timer/timer';
import { userState } from '@/core/stores/user/user';

/**
 * A store where the signed-in user (`user-a`) is a member of the active team (`team-a`), with their switch in the
 * team on, their own (employee) tracking switch as given, and their timer running or not: what decides whether they
 * get a timer, or the reason they have none.
 */
export function storeWithSignedInMember({
	employeeTracking,
	running = false
}: {
	employeeTracking: boolean;
	running?: boolean;
}) {
	const store = createStore();
	const member = {
		id: 'member-a',
		isTrackingEnabled: true,
		employee: { userId: 'user-a', isTrackingEnabled: employeeTracking }
	};
	store.set(organizationTeamsState, [{ id: 'team-a', name: 'Team A', members: [member] }] as never);
	store.set(activeTeamIdState, 'team-a');
	store.set(userState, { id: 'user-a' } as never);
	store.set(timerStatusState, { running } as never);
	return store;
}
