import {
	publicActiveTeamState,
	activeTeamState,
	teamTasksState,
	organizationTeamsState
} from '@/core/stores';
import isEqual from 'lodash/isEqual';
import cloneDeep from 'lodash/cloneDeep';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useOrganizationTeamsQuery } from './use-organization-teams-query';
import { QueryClient, QueryKey, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import { publicOrganizationTeamService } from '@/core/services/client/api/organizations';

// Shared by the queries and their loaders, so the public page's refresh interval
// refetches each query once it is stale instead of only reading the cache
const PUBLIC_TEAM_STALE_TIME = 1000 * 60 * 5; // 5 minutes - public team data is relatively stable
const PUBLIC_TEAM_MISC_STALE_TIME = 1000 * 60 * 15; // 15 minutes - misc data changes less frequently

// A query that failed before loading any data is left to its useQuery, which retries it on mount.
// Without data, ensureQueryData ignores staleTime and fetches, so every tick would call the
// unauthenticated endpoint again. Failures resolve to undefined: the query keeps the error.
function ensurePublicTeamQueryData(queryClient: QueryClient, queryKey: QueryKey, staleTime: number): Promise<unknown> {
	const state = queryClient.getQueryState(queryKey);
	if (state?.status === 'error' && state.data === undefined) {
		return Promise.resolve(undefined);
	}

	return queryClient.ensureQueryData({ queryKey, staleTime, revalidateIfStale: true }).catch(() => undefined);
}

export function usePublicOrganizationTeams() {
	const activeTeam = useAtomValue(activeTeamState);

	const [teams, setTeams] = useAtom(organizationTeamsState);
	const { getOrganizationTeamsLoading } = useOrganizationTeamsQuery();
	const setAllTasks = useSetAtom(teamTasksState);

	const [publicTeam, setPublicTeam] = useAtom(publicActiveTeamState);

	// State for query parameters - enables React Query when parameters are set
	const [queryParams, setQueryParams] = useState<{ profileLink: string; teamId: string } | null>(null);
	const [miscQueryParams, setMiscQueryParams] = useState<{ profileLink: string; teamId: string } | null>(null);

	// Memoized parameters for React Query to prevent infinite loops
	const memoizedProfileLink = useMemo(() => queryParams?.profileLink, [queryParams?.profileLink]);
	const memoizedTeamId = useMemo(() => queryParams?.teamId, [queryParams?.teamId]);
	const memoizedMiscProfileLink = useMemo(() => miscQueryParams?.profileLink, [miscQueryParams?.profileLink]);
	const memoizedMiscTeamId = useMemo(() => miscQueryParams?.teamId, [miscQueryParams?.teamId]);
	const queryClient = useQueryClient();
	// React Query: Get Public Team Data
	const { data: publicTeamData, isLoading: publicTeamLoading } = useQuery({
		queryKey: queryKeys.teams.public.byProfileAndTeam(memoizedProfileLink, memoizedTeamId),
		queryFn: () => publicOrganizationTeamService.getPublicOrganizationTeams(memoizedProfileLink!, memoizedTeamId!),
		enabled: !!(memoizedProfileLink && memoizedTeamId),
		staleTime: PUBLIC_TEAM_STALE_TIME,
		refetchOnWindowFocus: false
	});

	// React Query: Get Public Team Misc Data
	const { data: publicTeamMiscData, isLoading: publicTeamMiscLoading } = useQuery({
		queryKey: queryKeys.teams.public.miscData(memoizedMiscProfileLink, memoizedMiscTeamId),
		queryFn: () =>
			publicOrganizationTeamService.getPublicOrganizationTeamsMiscData(
				memoizedMiscProfileLink!,
				memoizedMiscTeamId!
			),
		enabled: !!(memoizedMiscProfileLink && memoizedMiscTeamId),
		staleTime: PUBLIC_TEAM_MISC_STALE_TIME
	});

	// Synchronize React Query data with Jotai stores for backward compatibility
	useEffect(() => {
		if (publicTeamData) {
			if (publicTeamData.status === 404) {
				setTeams([]);
				return;
			}

			const updatedTeams = cloneDeep(teams);
			if (updatedTeams.length) {
				const newData = [
					{
						...updatedTeams[0],
						...publicTeamData
					}
				];

				if (!isEqual(newData, updatedTeams)) {
					setTeams([
						{
							...updatedTeams[0],
							...publicTeamData
						} as any
					]);
				}
			} else {
				setTeams([publicTeamData as any]);
			}

			const newPublicTeamData = {
				...publicTeam,
				...publicTeamData
			};
			if (!isEqual(newPublicTeamData, publicTeam)) {
				setPublicTeam(newPublicTeamData as any);
			}

			let responseTasks = publicTeamData.tasks || [];
			if (Array.isArray(responseTasks) && responseTasks.length > 0) {
				responseTasks = responseTasks.map((task) => {
					const clone = cloneDeep(task);
					if (task.tags && task.tags?.length) {
						clone.label = task.tags[0].name;
					}

					return clone;
				});
			}
			setAllTasks(responseTasks);
		}
	}, [publicTeamData, setTeams, setPublicTeam, setAllTasks, teams, publicTeam]);

	useEffect(() => {
		if (publicTeamMiscData) {
			if (publicTeamMiscData?.status === 404) {
				setTeams([]);
				return;
			}

			queryClient.setQueryData(queryKeys.taskStatuses.byTeam(memoizedMiscTeamId!), {
				items: publicTeamMiscData?.statuses || []
			});
			queryClient.setQueryData(queryKeys.taskSizes.byTeam(memoizedMiscTeamId!), {
				items: publicTeamMiscData?.sizes || []
			});
			queryClient.setQueryData(queryKeys.taskPriorities.byTeam(memoizedMiscTeamId!), {
				items: publicTeamMiscData?.priorities || []
			});
			queryClient.setQueryData(queryKeys.taskLabels.byTeam(memoizedMiscTeamId!), {
				items: publicTeamMiscData?.labels || []
			});
		}
	}, [publicTeamMiscData, queryClient, memoizedMiscTeamId, setTeams]);

	const loadPublicTeamData = useCallback(
		(profileLink: string, teamId: string) => {
			// Only set query parameters if they're different to prevent infinite loops
			if (queryParams?.profileLink !== profileLink || queryParams?.teamId !== teamId) {
				setQueryParams({ profileLink, teamId });
			}

			return ensurePublicTeamQueryData(
				queryClient,
				queryKeys.teams.public.byProfileAndTeam(profileLink, teamId),
				PUBLIC_TEAM_STALE_TIME
			);
		},
		[setQueryParams, queryParams?.profileLink, queryParams?.teamId]
	);

	const loadPublicTeamMiscData = useCallback(
		(profileLink: string, teamId: string) => {
			// Only set misc query parameters if they're different to prevent infinite loops
			if (miscQueryParams?.profileLink !== profileLink || miscQueryParams?.teamId !== teamId) {
				setMiscQueryParams({ profileLink, teamId });
			}

			return ensurePublicTeamQueryData(
				queryClient,
				queryKeys.teams.public.miscData(profileLink, teamId),
				PUBLIC_TEAM_MISC_STALE_TIME
			);
		},
		[setMiscQueryParams, miscQueryParams?.profileLink, miscQueryParams?.teamId]
	);

	return {
		getOrganizationTeamsLoading,
		loadPublicTeamData,
		loadPublicTeamMiscData,
		loading: publicTeamLoading, // React Query loading state
		loadingMiscData: publicTeamMiscLoading, // React Query loading state
		activeTeam,
		publicTeam
	};
}
