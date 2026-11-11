import { createStore } from 'jotai';
import { activeTeamIdState, isTrackingEnabledState, organizationTeamsState, userState } from '@/core/stores';

type MemberSwitches = { team?: boolean; employee?: boolean };

const member = (userId: string, { team = true, employee = true }: MemberSwitches = {}) => ({
	id: `member-${userId}`,
	isTrackingEnabled: team,
	employee: { userId, isTrackingEnabled: employee }
});

function storeWith(members: unknown[] | undefined, userId: string | null = 'user-a') {
	const store = createStore();
	store.set(organizationTeamsState, [{ id: 'team-a', name: 'Team A', members }] as never);
	store.set(activeTeamIdState, 'team-a');
	store.set(userState, (userId ? { id: userId } : null) as never);
	return store;
}

describe('isTrackingEnabledState', () => {
	it('lets a member track when their team switch and their own switch are on', () => {
		const store = storeWith([member('user-a'), member('user-b', { team: false })]);

		expect(store.get(isTrackingEnabledState)).toBe(true);
	});

	it("turns tracking off with the member's own switch, the state of the demo's seeded admins", () => {
		const store = storeWith([member('user-a', { employee: false })]);

		expect(store.get(isTrackingEnabledState)).toBe(false);
	});

	it("turns tracking off with the member's switch in the team", () => {
		const store = storeWith([member('user-a', { team: false })]);

		expect(store.get(isTrackingEnabledState)).toBe(false);
	});

	it('keeps the timer while the team or the user is not known yet', () => {
		expect(storeWith(undefined).get(isTrackingEnabledState)).toBe(true);
		expect(storeWith([member('user-a', { team: false })], null).get(isTrackingEnabledState)).toBe(true);
	});

	it('follows a team refresh that turns tracking off', () => {
		const store = storeWith([member('user-a')]);
		expect(store.get(isTrackingEnabledState)).toBe(true);

		store.set(organizationTeamsState, [
			{ id: 'team-a', name: 'Team A', members: [member('user-a', { team: false })] }
		] as never);

		expect(store.get(isTrackingEnabledState)).toBe(false);
	});

	it('offers no tracking in a team the user is not a member of', () => {
		const store = storeWith([member('user-b')]);

		expect(store.get(isTrackingEnabledState)).toBe(false);
	});
});
