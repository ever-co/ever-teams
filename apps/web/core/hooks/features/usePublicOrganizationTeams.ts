import { ITeamTask } from '@/core/types/interfaces';
import { publicactiveTeamState } from '@/core/stores';
import isEqual from 'lodash/isEqual';
import cloneDeep from 'lodash/cloneDeep';
import { useCallback } from 'react';
import { useAtom } from 'jotai';
import { useQuery } from '../useQuery';
import { useOrganizationTeams } from './useOrganizationTeams';
import { useTaskLabels } from './useTaskLabels';
import { useTaskPriorities } from './useTaskPriorities';
import { useTaskSizes } from './useTaskSizes';
import { useTaskStatus } from './useTaskStatus';
import { useTeamTasks } from './useTeamTasks';
import { publicOrganizationTeamService } from '../../services/client/api';

export function usePublicOrganizationTeams() {
	const { loading, queryCall, loadingRef } = useQuery(publicOrganizationTeamService.getPublicOrganizationTeams);
	const { loading: loadingMiscData, queryCall: queryCallMiscData } = useQuery(
		publicOrganizationTeamService.getPublicOrganizationTeamsMiscData
	);
	const { activeTeam, teams, setTeams, getOrganizationTeamsLoading } = useOrganizationTeams();
	const { setAllTasks } = useTeamTasks();
	const { setTaskStatuses } = useTaskStatus();
	const { setTaskSizes } = useTaskSizes();
	const { setTaskPriorities } = useTaskPriorities();
	const { setTaskLabels } = useTaskLabels();
	const [publicTeam, setPublicTeam] = useAtom(publicactiveTeamState);

	const loadPublicTeamData = useCallback(
		(profileLink: string, teamId: string) => {
			if (loadingRef.current) {
				return new Promise((response) => {
					response({});
				});
			}

			return queryCall(profileLink, teamId).then((res) => {
				if (res.data.status === 404) {
					setTeams([]);
					return res;
				}

				const updatedTeams = cloneDeep(teams);
				if (updatedTeams.length) {
					const newData = [
						{
							...updatedTeams[0],
							...res.data
						}
					];

					if (!isEqual(newData, updatedTeams)) {
						setTeams([
							{
								...updatedTeams[0],
								...res.data
							}
						]);
					}
				} else {
					setTeams([res.data]);
				}

				const newPublicTeamData = {
					...publicTeam,
					...res.data
				};
				if (!isEqual(newPublicTeamData, publicTeam)) {
					setPublicTeam(newPublicTeamData);
				}

				let responseTasks = (res.data.tasks as ITeamTask[]) || [];
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

				return res;
			});
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[queryCall, setTeams, setAllTasks, setPublicTeam, teams, publicTeam]
	);

	const loadPublicTeamMiscData = useCallback(
		(profileLink: string, teamId: string) => {
			return queryCallMiscData(profileLink, teamId).then((res) => {
				if (res.data?.status === 404) {
					setTeams([]);
					return res;
				}

				if (res.data) {
					setTaskStatuses(res.data?.statuses || []);
					setTaskSizes(res.data?.sizes || []);
					setTaskPriorities(res.data?.priorities || []);
					setTaskLabels(res.data?.labels || []);
				}

				return res;
			});
		},
		[queryCallMiscData, setTaskLabels, setTaskPriorities, setTaskSizes, setTaskStatuses, setTeams]
	);

	return {
		getOrganizationTeamsLoading,
		loadPublicTeamData,
		loadPublicTeamMiscData,
		loading,
		loadingMiscData,
		activeTeam,
		publicTeam
	};
}
