'use client';

/* eslint-disable no-mixed-spaces-and-tabs */

import { getTeamTasksAPI } from '@app/services/client/api';
import { activeTeamState } from '@app/stores';
import { teamTasksState } from '@app/stores';
import { useCallback } from 'react';
import { useRecoilValue, useSetRecoilState } from 'recoil';
import { useQuery } from '../useQuery';
import { useSyncRef } from '../useSyncRef';
import { useAuthenticateUser } from './useAuthenticateUser';

export function useTeamTasksMutate() {
	const { user } = useAuthenticateUser();

	const setAllTasks = useSetRecoilState(teamTasksState);

	const activeTeam = useRecoilValue(activeTeamState);
	const activeTeamRef = useSyncRef(activeTeam);

	// Queries hooks
	const { queryCall, loadingRef } = useQuery(getTeamTasksAPI);

	const loadTeamTasksData = useCallback(async () => {
		console.log("mutate.rendar")
		// if (loadingRef.current || !user || !activeTeamRef.current?.id) {
		// 	return new Promise((response) => {
		// 		response(true);
		// 	});
		// }

		const res = await queryCall(
			user?.employee.organizationId,
			user?.employee.tenantId,
			activeTeamRef.current?.projects && activeTeamRef.current?.projects.length
				? activeTeamRef.current?.projects[0].id
				: '',
			activeTeamRef.current?.id || ''
		);
		setAllTasks(res?.data?.items);
		return res;
	}, [loadingRef, user, activeTeamRef, queryCall, setAllTasks]);

	// Global loading state
	// Reload tasks after active team changed
	// Queries calls

	return {
		loadTeamTasksData
	};
}
