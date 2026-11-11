'use client';

import { useCallback, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import { docsService } from '@/core/services/client/api/docs';
import { ApiErrorService } from '@/core/services/client/api-error.service';
import {
	EDocumentSpaceKind,
	type IDocumentFollowState,
	type IDocumentSpace
} from '@/core/types/interfaces/common/docs';
import { useDocsScope } from './use-docs-scope';

/** The spaces change rarely (a team joined or left); the tree refreshes them with the window's focus. */
const SPACES_STALE_MS = 5 * 60_000;

/** Whether an answer says the platform's Docs collaboration is off (404 `DOCS_COLLAB_DISABLED`, or no such route). */
function isCollaborationOff(error: unknown): boolean {
	return ApiErrorService.isApiError(error) && (error.isEndpointUnavailable() || error.statusCode === 404);
}

export interface DocsSpacesState {
	/** The platform lists spaces (its Docs collaboration is on): team spaces and moves between spaces are offered. */
	available: boolean;
	/** The team spaces the reader is in, by name. */
	teamSpaces: IDocumentSpace[];
}

/**
 * The spaces of the tree (`GET /plugins/docs/documents/spaces`): the organization's, the reader's private one, and
 * one per team the reader is in. A platform without Docs collaboration answers 404: the tree then shows the
 * workspace and the private pages, as before.
 */
export function useDocsSpaces(enabled: boolean): DocsSpacesState {
	const scope = useDocsScope();
	const query = useQuery({
		queryKey: queryKeys.docs.spaces(scope?.tenantId, scope?.organizationId),
		queryFn: ({ signal }) => docsService.spaces(signal),
		enabled: enabled && scope !== null,
		staleTime: SPACES_STALE_MS,
		refetchOnWindowFocus: true,
		retry: (failures, error) => !isCollaborationOff(error) && failures < 2
	});
	const teamSpaces = useMemo(
		() =>
			(query.data ?? [])
				.filter((space) => space.kind === EDocumentSpaceKind.TEAM && space.organizationTeamId)
				.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '')),
		[query.data]
	);
	return { available: query.isSuccess, teamSpaces };
}

export type DocsFollowAction = 'follow' | 'unfollow' | 'mute' | 'unmute';

/**
 * Whether the reader follows the page (its comments and changes reach the Inbox) and whether they muted it, with the
 * four actions. `available` is false on a platform without Docs collaboration (404): the page menu leaves them out.
 */
export function useDocsFollow(pageId: string | null, enabled: boolean) {
	const scope = useDocsScope();
	const queryClient = useQueryClient();
	const key = queryKeys.docs.follow(scope?.tenantId, pageId);
	const query = useQuery({
		queryKey: key,
		queryFn: ({ signal }) => docsService.followState(pageId as string, signal),
		enabled: enabled && Boolean(pageId) && scope !== null,
		staleTime: 60_000,
		retry: (failures, error) => !isCollaborationOff(error) && failures < 2
	});
	const mutation = useMutation({
		mutationFn: (action: DocsFollowAction) => docsService.setFollow(pageId as string, action),
		onSuccess: (state) => queryClient.setQueryData<IDocumentFollowState>(key, state)
	});
	const { mutateAsync } = mutation;
	const run = useCallback((action: DocsFollowAction) => mutateAsync(action), [mutateAsync]);
	return {
		available: query.isSuccess,
		following: query.data?.following ?? false,
		muted: query.data?.muted ?? false,
		isPending: mutation.isPending,
		run
	};
}
