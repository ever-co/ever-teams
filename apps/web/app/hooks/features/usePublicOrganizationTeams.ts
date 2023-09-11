import { ITeamTask } from '@app/interfaces';
import {
	getPublicOrganizationTeamsAPI,
	getPublicOrganizationTeamsMiscDataAPI,
} from '@app/services/client/api/public-organization-team';
import { publicactiveTeamState } from '@app/stores';
import isEqual from 'lodash/isEqual';
import cloneDeep from 'lodash/cloneDeep';
import { useCallback } from 'react';
import { useRecoilState } from 'recoil';
import { useQuery } from '../useQuery';
import { useOrganizationTeams } from './useOrganizationTeams';
import { useTaskLabels } from './useTaskLabels';
import { useTaskPriorities } from './useTaskPriorities';
import { useTaskSizes } from './useTaskSizes';
import { useTaskStatus } from './useTaskStatus';
import { useTeamTasks } from './useTeamTasks';

export function usePublicOrganizationTeams() {
	const { loading, queryCall } = useQuery(getPublicOrganizationTeamsAPI);
	const { loading: loadingMiscData, queryCall: queryCallMiscData } = useQuery(
		getPublicOrganizationTeamsMiscDataAPI
	);
	const { activeTeam, teams, setTeams } = useOrganizationTeams();
	const { setAllTasks } = useTeamTasks();
	const { setTaskStatus } = useTaskStatus();
	const { setTaskSizes } = useTaskSizes();
	const { setTaskPriorities } = useTaskPriorities();
	const { setTaskLabels } = useTaskLabels();
	const [publicTeam, setPublicTeam] = useRecoilState(publicactiveTeamState);

	const loadPublicTeamData = useCallback(
		(profileLink: string, teamId: string) => {
			return queryCall(profileLink, teamId).then((res) => {
				if (res.data?.data?.status === 404) {
					setTeams([]);
					return res;
				}

				const updatedTeams = cloneDeep(teams);
				if (updatedTeams.length) {
					const newData = [
						{
							...updatedTeams[0],
							...res.data.data,
						},
					];

					if (!isEqual(newData, updatedTeams)) {
						setTeams([
							{
								...updatedTeams[0],
								...res.data.data,
							},
						]);
					}
				} else {
					setTeams([res.data.data]);
				}

				const newPublicTeamData = {
					...publicTeam,
					...res.data.data,
				};
				if (!isEqual(newPublicTeamData, publicTeam)) {
					setPublicTeam(newPublicTeamData);
				}

				let responseTasks = (res.data?.data?.tasks as ITeamTask[]) || [];
				if (responseTasks && responseTasks.length) {
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
		[queryCall, setTeams, setAllTasks, setPublicTeam, teams, publicTeam]
	);

	const loadPublicTeamMiscData = useCallback(
		(profileLink: string, teamId: string) => {
			return queryCallMiscData(profileLink, teamId).then((res) => {
				if (res.data?.data?.status === 404) {
					setTeams([]);
					return res;
				}

				if (res.data) {
					setTaskStatus(res.data.data?.statuses || []);
					setTaskSizes(res.data.data?.sizes || []);
					setTaskPriorities(res.data.data?.priorities || []);
					setTaskLabels(res.data.data?.labels || []);
				}

				return res;
			});
		},
		[
			queryCallMiscData,
			setTaskLabels,
			setTaskPriorities,
			setTaskSizes,
			setTaskStatus,
			setTeams,
		]
	);

	return {
		loadPublicTeamData,
		loadPublicTeamMiscData,
		loading,
		loadingMiscData,
		activeTeam,
		publicTeam,
	};
}
