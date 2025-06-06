import { ITask } from '@/core/types/interfaces/task/task';
import { publicactiveTeamState } from '@/core/stores';
import isEqual from 'lodash/isEqual';
import cloneDeep from 'lodash/cloneDeep';
import { useCallback } from 'react';
import { useAtom } from 'jotai';
import { useTeamTasks } from './use-team-tasks';
import { publicOrganizationTeamService } from '@/core/services/client/api/organizations';
import { useQueryCall } from '../../common';
import { useOrganizationTeams } from './use-organization-teams';
import { useTaskLabels, useTaskPriorities, useTaskSizes, useTaskStatus } from '../../tasks';

export function usePublicOrganizationTeams() {
	const { loading, queryCall, loadingRef } = useQueryCall(publicOrganizationTeamService.getPublicOrganizationTeams);
	const { loading: loadingMiscData, queryCall: queryCallMiscData } = useQueryCall(
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

				let responseTasks = (res.data.tasks as ITask[]) || [];
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
