import { atom } from 'jotai';
import { canMemberTrackTime } from '@/core/lib/helpers/team-member-tracking';
import { activeTeamState } from '../teams/organization-team';
import { userState } from '../user/user';
import { timerStatusState } from './timer';

export const activeTimerState = atom<boolean>(false);

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
	const members = get(activeTeamState)?.members;
	const userId = get(userState)?.id;
	if (!members || !userId) {
		return true;
	}
	const member = members.find((teamMember) => teamMember.employee?.userId === userId);
	return canMemberTrackTime(member);
});
