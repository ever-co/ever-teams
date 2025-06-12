import { publicActiveTeamState } from '@/core/stores';
import isEqual from 'lodash/isEqual';
import cloneDeep from 'lodash/cloneDeep';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAtom } from 'jotai';
import { useTeamTasks } from './use-team-tasks';
import { useOrganizationTeams } from './use-organization-teams';
import { useTaskLabels, useTaskPriorities, useTaskSizes, useTaskStatus } from '../../tasks';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import { publicOrganizationTeamService } from '@/core/services/client/api/organizations';

export function usePublicOrganizationTeams() {
	const { activeTeam, teams, setTeams, getOrganizationTeamsLoading } = useOrganizationTeams();
	const { setAllTasks } = useTeamTasks();
	const { setTaskStatuses } = useTaskStatus();
	const { setTaskSizes } = useTaskSizes();
	const { setTaskPriorities } = useTaskPriorities();
	const { setTaskLabels } = useTaskLabels();
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
		staleTime: 1000 * 60 * 5, // 5 minutes - public team data is relatively stable
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
		staleTime: 1000 * 60 * 15 // 15 minutes - misc data changes less frequently
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

			setTaskStatuses(publicTeamMiscData?.statuses || []);
			setTaskSizes(publicTeamMiscData?.sizes || []);
			setTaskPriorities(publicTeamMiscData?.priorities || []);
			setTaskLabels(publicTeamMiscData?.labels || []);
		}
	}, [publicTeamMiscData, setTaskStatuses, setTaskSizes, setTaskPriorities, setTaskLabels, setTeams]);

	const loadPublicTeamData = useCallback(
		(profileLink: string, teamId: string) => {
			// Only set query parameters if they're different to prevent infinite loops
			if (queryParams?.profileLink !== profileLink || queryParams?.teamId !== teamId) {
				setQueryParams({ profileLink, teamId });
			}

			return queryClient.ensureQueryData({
				queryKey: queryKeys.teams.public.byProfileAndTeam(profileLink, teamId)
			});
		},
		[setQueryParams, queryParams?.profileLink, queryParams?.teamId]
	);

	const loadPublicTeamMiscData = useCallback(
		(profileLink: string, teamId: string) => {
			// Only set misc query parameters if they're different to prevent infinite loops
			if (miscQueryParams?.profileLink !== profileLink || miscQueryParams?.teamId !== teamId) {
				setMiscQueryParams({ profileLink, teamId });
			}

			return queryClient.ensureQueryData({
				queryKey: queryKeys.teams.public.miscData(profileLink, teamId)
			});
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
