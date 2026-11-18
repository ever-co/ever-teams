import { useEffect, useRef } from 'react';
import type { ICurrentTeamsState } from '@ever-teams/toolkit-types';
import { useTeamsContext } from '@lib/context/teams-context';

/** No task, project, team or client picked: what a timer or a time form holds for an account that picked none. */
export const NO_TEAMS_STATE: ICurrentTeamsState = {
	taskId: null,
	projectId: null,
	organizationTeamId: null,
	clientId: null
};

/**
 * Calls `forget` once the kit works for another account: another user, or another organization. A sign-out that keeps
 * the page (scopedStyles or onSignOut) leaves the widgets mounted, so what they hold for one account (the task, project
 * and team to start with, today's total, a form's text) would otherwise stay on screen and go out with the next
 * account's requests. A new token for the same user and organization keeps it. It also runs when a widget mounted
 * signed out sees its first account (a session restored after mount), on state that is still empty. Call it before an
 * effect that fills the same state from the new account's answers: effects run in order, so the forgetting never
 * undoes them.
 */
export function useForgetOnAccountChange(forget: () => void) {
	const { authenticatedUser: user, selectedOrganization: organizationId } = useTeamsContext();
	const account = `${user?.id ?? ''}|${organizationId ?? ''}`;
	const latestForget = useRef(forget);
	latestForget.current = forget;
	const previousAccount = useRef(account);

	useEffect(() => {
		if (previousAccount.current === account) {
			return;
		}
		previousAccount.current = account;
		latestForget.current();
	}, [account]);
}
