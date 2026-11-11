'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { useSetAtom } from 'jotai';
import type { CreateWorkspaceBody } from '@/core/lib/validation/workspace';
import { queryKeys } from '@/core/query/keys';
import { ApiErrorService } from '@/core/services/client/api-error.service';
import { workspaceService } from '@/core/services/client/api/auth/workspace.service';
import { workspaceOpeningState } from '@/core/stores';

/** The page that creates a workspace, from the workspace menu and the sign-in's workspace list alike. */
export const CREATE_WORKSPACE_PATH = '/workspace/new';

/** Why a workspace was not created, as `POST /api/auth/create-workspace` answers it. */
export type CreateWorkspaceErrorCode =
	| 'ADDRESS_UNCONFIRMED'
	| 'REGISTRATION_CLOSED'
	| 'CREATED_NOT_OPENED'
	| 'OUTCOME_UNKNOWN'
	| 'INVALID'
	| 'FAILED';

const KNOWN_CODES: ReadonlySet<string> = new Set([
	'ADDRESS_UNCONFIRMED',
	'REGISTRATION_CLOSED',
	'CREATED_NOT_OPENED',
	'INVALID'
]);

/**
 * Whether the request failed without the route's answer (a timeout, the network): the workspace may have been created
 * all the same, so this is never read as a failure to retry.
 */
function isUnanswered(error: unknown): boolean {
	if (ApiErrorService.isApiError(error)) {
		return error.httpResponseStatus === undefined;
	}
	return isAxiosError(error) && !error.response;
}

/** What a gateway (the ingress 504, Cloudflare 524) answers once it stops waiting for the route; never the route. */
const GATEWAY_TIMEOUTS: ReadonlySet<number> = new Set([504, 524]);

/** A gateway stopped waiting for the route, which may still be creating the workspace. */
function isGatewayTimeout(error: unknown): boolean {
	if (ApiErrorService.isApiError(error)) {
		return error.hasHttpResponseStatus(...GATEWAY_TIMEOUTS.values());
	}
	return isAxiosError(error) && GATEWAY_TIMEOUTS.has(error.response?.status ?? 0);
}

/**
 * The reason of a failed creation, from the API client's error (ApiErrorService carries the answer's `code` as its
 * `errorCode`) or a bare axios one. Without the route's answer (none at all, or a gateway's timeout) the outcome is
 * unknown; anything else the route did not explain is a failure to retry.
 */
export function createWorkspaceErrorCodeOf(error: unknown): CreateWorkspaceErrorCode {
	if (isUnanswered(error)) {
		return 'OUTCOME_UNKNOWN';
	}
	const fromClient = (error as { errorCode?: unknown } | null | undefined)?.errorCode;
	const fromAxios = isAxiosError(error) ? (error.response?.data as { code?: unknown } | undefined)?.code : undefined;
	const code = fromClient ?? fromAxios;
	if (typeof code === 'string' && KNOWN_CODES.has(code)) {
		return code as CreateWorkspaceErrorCode;
	}
	return isGatewayTimeout(error) ? 'OUTCOME_UNKNOWN' : 'FAILED';
}

/** Where the new workspace opens: its welcome page, told how the invitations went. */
export function workspaceWelcomePathOf({ invited, invitesFailed }: { invited: number; invitesFailed: boolean }) {
	const query = new URLSearchParams({ invited: String(invited) });
	if (invitesFailed) {
		query.set('invitesFailed', '1');
	}
	return `/workspace/welcome?${query.toString()}`;
}

/**
 * Creates another workspace for the signed-in person (#5025) and opens it. The route signs the browser in to it (its
 * cookies); a full page load then starts every query and store afresh in the new workspace, as a workspace switch does.
 * While it is in flight the timer does not start: it would keep running in the workspace left behind.
 */
export function useCreateWorkspace() {
	const queryClient = useQueryClient();
	const setWorkspaceOpening = useSetAtom(workspaceOpeningState);
	return useMutation({
		mutationFn: (body: CreateWorkspaceBody) => workspaceService.createWorkspace(body),
		// The page says why a creation failed: no generic toast on top of it
		meta: { handlesOwnError: true },
		onMutate: () => setWorkspaceOpening(true),
		// On success the page is replaced, which ends the hold
		onError: (error) => {
			setWorkspaceOpening(false);
			// The workspace exists, or may: the page sends the person to the workspace menu, which reads the list
			// again instead of the one cached before the creation (kept 15 minutes)
			const failure = createWorkspaceErrorCodeOf(error);
			if (failure === 'CREATED_NOT_OPENED' || failure === 'OUTCOME_UNKNOWN') {
				void queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.all });
			}
		},
		onSuccess: (created) => {
			window.location.href = workspaceWelcomePathOf(created);
		}
	});
}
