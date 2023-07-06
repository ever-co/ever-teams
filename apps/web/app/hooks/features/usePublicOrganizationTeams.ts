import { ITeamTask } from '@app/interfaces';
import { getPublicOrganizationTeamsAPI } from '@app/services/client/api/public-organization-team';
import { publicactiveTeamState } from '@app/stores';
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
	const { activeTeam, setTeams } = useOrganizationTeams();
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

				setTeams([res.data.data]);
				setPublicTeam(res.data.data);

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

				if (res.data) {
					setTaskStatus(res.data.data?.statuses || []);
					setTaskSizes(res.data.data?.sizes || []);
					setTaskPriorities(res.data.data?.priorities || []);
					setTaskLabels(res.data.data?.labels || []);
				}

				return res;
			});
		},
		[queryCall, setTeams]
	);

	return {
		loadPublicTeamData,
		loading,
		activeTeam,
		publicTeam,
	};
}
