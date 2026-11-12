import { atom } from 'jotai';
import { canMemberTrackTime } from '@/core/lib/helpers/team-member-tracking';
import type { TOrganizationTeamEmployee } from '@/core/types/schemas';
import { activeTeamState } from '../teams/organization-team';
import { userState } from '../user/user';
import { timerStatusState } from './timer';

export const activeTimerState = atom<boolean>(false);

/** The signed-in user's membership of the active team: `unknown` while the team or the user loads. */
const ownMembershipState = atom<TOrganizationTeamEmployee | 'unknown' | undefined>((get) => {
	const members = get(activeTeamState)?.members;
	const userId = get(userState)?.id;
	if (!members || !userId) {
		return 'unknown';
	}
	return members.find((teamMember) => teamMember.employee?.userId === userId);
});

/**
 * Whether the signed-in user can track time in the active team: their membership's switch and their own (employee)
 * switch, which Gauzy both checks before a start. Derived from the team and the user, so it follows every refresh;
 * true until both are known, so the timer does not blink out while the app loads. A running timer keeps it true:
 * Gauzy still accepts a stop after tracking was turned off, and the timer is where the user stops it.
 */
export const isTrackingEnabledState = atom<boolean>((get) => {
	if (get(timerStatusState)?.running) {
		return true;
	}
	const membership = get(ownMembershipState);
	if (membership === 'unknown') {
		return true;
	}
	return canMemberTrackTime(membership);
});

/**
 * Whether the timer is hidden because the signed-in member's time tracking is turned off in the active team, so the
 * app says so where the timer would be. False while the team or the user loads, while a timer runs (it stays, to be
 * stopped), and in a team the user is not a member of, where there is no tracking of theirs to turn on.
 */
export const isOwnTrackingOffState = atom<boolean>((get) => {
	if (get(timerStatusState)?.running) {
		return false;
	}
	const membership = get(ownMembershipState);
	if (membership === 'unknown' || !membership) {
		return false;
	}
	return !canMemberTrackTime(membership);
});
