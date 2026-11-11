'use client';

import { useMutation } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import type { CreateWorkspaceBody } from '@/core/lib/validation/workspace';
import { workspaceService } from '@/core/services/client/api/auth/workspace.service';

/** The page that creates a workspace, from the workspace menu and the sign-in's workspace list alike. */
export const CREATE_WORKSPACE_PATH = '/workspace/new';

/** Why a workspace was not created, as `POST /api/auth/create-workspace` answers it. */
export type CreateWorkspaceErrorCode =
	| 'ADDRESS_UNCONFIRMED'
	| 'REGISTRATION_CLOSED'
	| 'CREATED_NOT_OPENED'
	| 'INVALID'
	| 'FAILED';

const KNOWN_CODES: ReadonlySet<string> = new Set([
	'ADDRESS_UNCONFIRMED',
	'REGISTRATION_CLOSED',
	'CREATED_NOT_OPENED',
	'INVALID'
]);

/**
 * The reason of a failed creation, from the API client's error (ApiErrorService carries the answer's `code` as its
 * `errorCode`) or a bare axios one; anything the route did not explain is a failure to retry.
 */
export function createWorkspaceErrorCodeOf(error: unknown): CreateWorkspaceErrorCode {
	const fromClient = (error as { errorCode?: unknown } | null | undefined)?.errorCode;
	const fromAxios = isAxiosError(error) ? (error.response?.data as { code?: unknown } | undefined)?.code : undefined;
	const code = fromClient ?? fromAxios;
	return typeof code === 'string' && KNOWN_CODES.has(code) ? (code as CreateWorkspaceErrorCode) : 'FAILED';
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
 */
export function useCreateWorkspace() {
	return useMutation({
		mutationFn: (body: CreateWorkspaceBody) => workspaceService.createWorkspace(body),
		// The page says why a creation failed: no generic toast on top of it
		meta: { handlesOwnError: true },
		onSuccess: (created) => {
			window.location.href = workspaceWelcomePathOf(created);
		}
	});
}
