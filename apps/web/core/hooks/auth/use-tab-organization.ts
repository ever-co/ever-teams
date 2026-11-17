'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { useAtomValue } from 'jotai';
import { useQueryClient } from '@tanstack/react-query';
import { storeLastOpenedTeamId } from '@/core/lib/auth/last-opened-team';
import {
	TAB_SCOPE_CHANGED_EVENT,
	bringTabOrganizationBack,
	putBackLeftCookies,
	tabScope
} from '@/core/lib/auth/tab-organization';
import { syncTokenOrganization } from '@/core/lib/auth/token-organization';
import { queryKeys } from '@/core/query/keys';
import { activeTeamState, timerStartsInFlightState, timerStatusState } from '@/core/stores';
import { currentOrganizationState } from '@/core/stores/user/user-organizations';

/**
 * Another tab switches the cookies without telling this one, and a cookie change fires no event of its own where the
 * browser has no cookie store: the state is read again on these events and every few seconds.
 */
const RECHECK_MS = 2_000;

/** Where this tab works while another tab has the shared cookies on another organization (#5134). */
type TabOrganizationState = 'shared' | 'own' | 'lost';

let snapshot: TabOrganizationState = 'shared';
const subscribers = new Set<() => void>();
let stopListening: (() => void) | null = null;

function readState(): TabOrganizationState {
	const scope = tabScope();
	// This tab's own switch back to its organization on its way is nothing to tell
	if (!scope.held || !scope.isOtherOrganizationOpen) return 'shared';
	return scope.accessToken ? 'own' : 'lost';
}

function recheck(): void {
	const next = readState();
	if (next === snapshot) return;
	snapshot = next;
	subscribers.forEach((subscriber) => subscriber());
}

function recheckWhenVisible(): void {
	if (document.visibilityState === 'visible') recheck();
}

function startListening(): () => void {
	const cookieStore = (window as typeof window & { cookieStore?: EventTarget }).cookieStore;
	window.addEventListener(TAB_SCOPE_CHANGED_EVENT, recheck);
	window.addEventListener('focus', recheck);
	document.addEventListener('visibilitychange', recheckWhenVisible);
	cookieStore?.addEventListener('change', recheck);
	const interval = window.setInterval(recheck, RECHECK_MS);
	return () => {
		window.removeEventListener(TAB_SCOPE_CHANGED_EVENT, recheck);
		window.removeEventListener('focus', recheck);
		document.removeEventListener('visibilitychange', recheckWhenVisible);
		cookieStore?.removeEventListener('change', recheck);
		window.clearInterval(interval);
	};
}

function subscribe(onChange: () => void): () => void {
	if (typeof window === 'undefined') return () => undefined;
	subscribers.add(onChange);
	stopListening ??= startListening();
	recheck();
	return () => {
		subscribers.delete(onChange);
		if (subscribers.size === 0 && stopListening) {
			stopListening();
			stopListening = null;
		}
	};
}

const getSnapshot = () => snapshot;
const getServerSnapshot = (): TabOrganizationState => 'shared';

/**
 * Moves the session's token to `organizationId`. Resolves false when it did not move: Gauzy refused or did not answer,
 * or the call itself threw or rejected, so that the caller puts the cookies back in every case.
 */
async function switchSessionTo(organizationId: string): Promise<boolean> {
	try {
		return await syncTokenOrganization(organizationId);
	} catch (error) {
		console.error('[Auth] Could not move the session back to the organization of this tab:', error);
		return false;
	}
}

/**
 * Whether this tab works in its own organization while another tab opened another one (`own`), can no longer do so
 * because its token for it is gone (`lost`), or works with the cookies as usual (`shared`); and the two ways out:
 * open the other organization in this tab too, or bring this tab's organization back in every tab.
 */
export function useTabOrganization() {
	const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
	const activeTeam = useAtomValue(activeTeamState);
	const currentOrganization = useAtomValue(currentOrganizationState);
	const timerStatus = useAtomValue(timerStatusState);
	// A start still on its way counts: the API may already run it, as the team menu holds a switch for it too
	const timerStartsInFlight = useAtomValue(timerStartsInFlightState);
	const queryClient = useQueryClient();

	// The page starts again on the cookies, which name the other organization and its team
	const openSharedOrganization = useCallback(() => {
		globalThis.window?.location.reload();
	}, []);

	// This tab's organization, team and project again for every tab: the cookies and the session move back to them. The
	// tab stays on its team, so a team switch, which empties its tasks and takes the team's default project, is not made.
	const activeTeamId = activeTeam?.id;
	const bringOwnOrganizationBack = useCallback(() => {
		const organizationId = bringTabOrganizationBack();
		if (!organizationId) return;
		// The session follows the cookies right after they moved, before anything that could throw: a step failing in
		// between left the cookies on this tab's organization while the token stayed on the other one (Greptile on #5345)
		void switchSessionTo(organizationId).then((switched) => {
			if (switched) {
				// This browser's next start opens the team too, only once the session followed it. The write never throws
				// and gates nothing: refused storage only loses that convenience
				if (activeTeamId) storeLastOpenedTeamId(activeTeamId);
				// The user (its employee) is read again for that organization, as after a team switch
				queryClient.invalidateQueries({ queryKey: queryKeys.users.me });
				return;
			}
			// Refused, no answer, or the switch failed: the session stays where it is, and so do the cookies again
			putBackLeftCookies(organizationId);
		});
	}, [activeTeamId, queryClient]);

	const ownOrganizationName =
		currentOrganization?.id === activeTeam?.organizationId ? currentOrganization?.name : undefined;

	return {
		state,
		/** The name of this tab's organization, else of its team. */
		ownOrganizationName: ownOrganizationName || activeTeam?.name || '',
		/** A run of this tab's timer keeps going in this tab's organization: the tab does not leave it meanwhile. */
		isTimerRunning: Boolean(timerStatus?.running) || timerStartsInFlight > 0,
		canBringOwnOrganizationBack: Boolean(activeTeam),
		openSharedOrganization,
		bringOwnOrganizationBack
	};
}
