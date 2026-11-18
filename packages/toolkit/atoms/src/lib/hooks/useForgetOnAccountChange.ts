import { useEffect, useLayoutEffect, useRef } from 'react';
import type { ICurrentTeamsState } from '@ever-teams/toolkit-types';
import { useTeamsContext } from '@lib/context/teams-context';

/**
 * No task, project, team or client picked: what a timer or a time form holds for an account that picked none. A new
 * object each time, so no two widgets ever share one.
 */
export function noTeamsState(): ICurrentTeamsState {
	return { taskId: null, projectId: null, organizationTeamId: null, clientId: null };
}

// In the browser, during the commit that shows another account: before it paints and before any pending answer can
// resume. On the server, where layout effects do not run, a plain effect.
const useCommitEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

/**
 * Calls `forget` once the kit works for another account: another user, or another organization. A sign-out that keeps
 * the page (scopedStyles or onSignOut) leaves the widgets mounted, so what they hold for one account (the task, project
 * and team to start with, today's total, a form's text) would otherwise stay on screen and go out with the next
 * account's requests. A new token for the same user and organization keeps it. A widget mounted signed in does not
 * call it; one mounted signed out calls it when it sees its first account, on state that is still empty.
 *
 * It runs in the commit that shows the new account, before the effects that fill the same state from that account's
 * answers, so it never undoes them. The returned generation counts the changes of account: work started under one
 * generation (a start, a stop, a submission) leaves the widget alone once it answers under another, even after a
 * switch back to the same account.
 */
export function useForgetOnAccountChange(forget: () => void): { readonly current: number } {
	const { authenticatedUser: user, selectedOrganization: organizationId } = useTeamsContext();
	const account = `${user?.id ?? ''}|${organizationId ?? ''}`;
	const latestForget = useRef(forget);
	const previousAccount = useRef(account);
	const generation = useRef(0);

	// Committed renders only: one React discards never stands in for the forgetting.
	useCommitEffect(() => {
		latestForget.current = forget;
	});

	useCommitEffect(() => {
		if (previousAccount.current === account) {
			return;
		}
		previousAccount.current = account;
		generation.current += 1;
		latestForget.current();
	}, [account]);

	return generation;
}
