import {
	getActiveTeamIdCookie,
	setActiveTeamIdCookie,
	setOrganizationIdCookie,
} from '@app/helpers/cookies';
import {
	IOrganizationTeamList,
	IOrganizationTeamUpdate,
	IOrganizationTeamWithMStatus,
} from '@app/interfaces';
import {
	createOrganizationTeamAPI,
	getOrganizationTeamAPI,
	getOrganizationTeamsAPI,
	updateOrganizationTeamAPI,
} from '@app/services/client/api';
import {
	activeTeamIdState,
	activeTeamState,
	organizationTeamsState,
	teamsFetchingState,
} from '@app/stores';
import { useCallback, useEffect } from 'react';
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil';
import { useFirstLoad } from '../useFirstLoad';
import { useQuery } from '../useQuery';
import { useSyncRef } from '../useSyncRef';

/**
 * It updates the `teams` state with the `members` status from the `team` status API
 * @returns An object with three properties:
 * teams: The current value of the teams state.
 * setTeams: A function that can be used to update the teams state.
 * setTeamUpdate: A function that can be used to update the teams state.
 */
function useTeamsState() {
	const [teams, setTeams] = useRecoilState(organizationTeamsState);

	const setTeamsUpdate = useCallback(
		(team: IOrganizationTeamWithMStatus) => {
			const members = team?.members;
			const id = team.id;
			if (!members) return;

			// Update active teams fields with from team Status API
			setTeams((tms) => {
				const idx_tm = tms.findIndex((t) => t.id === id);
				if (idx_tm < 0) return tms;
				const new_tms = [...tms];
				new_tms[idx_tm] = { ...new_tms[idx_tm] };
				const new_members = [...new_tms[idx_tm].members];
				// merges status fields for a members
				new_members.forEach((mem, i) => {
					const new_mem = members.find((m) => m.id === mem.id);
					if (!new_mem) return;
					new_members[i] = {
						...mem,
						...new_mem,
						id: mem.id,
					};
				});
				// Update members for a team
				new_tms[idx_tm].members = new_members;
				return new_tms;
			});
		},
		[setTeams]
	);

	return {
		teams,
		setTeams,
		setTeamsUpdate,
	};
}

/**
 * It creates a new team for the current organization
 * @returns An object with two properties:
 * 1. createOrganizationTeam: A function that takes a string as an argument and returns a promise.
 * 2. loading: A boolean value.
 */
function useCreateOrganizationTeam() {
	const { loading, queryCall } = useQuery(createOrganizationTeamAPI);
	const [teams, setTeams] = useRecoilState(organizationTeamsState);
	const teamsRef = useSyncRef(teams);
	const setActiveTeamId = useSetRecoilState(activeTeamIdState);

	const createOrganizationTeam = useCallback(
		(name: string) => {
			const teams = teamsRef.current;
			const $name = name.trim();
			const exits = teams.find(
				(t) => t.name.toLowerCase() === $name.toLowerCase()
			);

			if (exits || $name.length < 2) {
				return Promise.reject(new Error('Invalid team name !'));
			}

			return queryCall($name).then((res) => {
				const dt = res.data?.items || [];
				setTeams(dt);
				const created = dt.find((t) => t.name === $name);
				if (created) {
					setActiveTeamIdCookie(created.id);
					setOrganizationIdCookie(created.organizationId);
					// This must be called at the end (Update store)
					setActiveTeamId(created.id);
				}
				return res;
			});
		},
		[queryCall, setActiveTeamId, setTeams]
	);

	return {
		createOrganizationTeam,
		loading,
	};
}

/**
 * It takes a team and an optional data object and updates the team with the data
 */
function useUpdateOrganizationTeam() {
	const { loading, queryCall } = useQuery(updateOrganizationTeamAPI);
	const { setTeamsUpdate } = useTeamsState();

	const updateOrganizationTeam = useCallback(
		(
			team: IOrganizationTeamList,
			data: Partial<IOrganizationTeamUpdate> = {}
		) => {
			const members = team.members;

			const body: Partial<IOrganizationTeamUpdate> = {
				id: team.id,
				memberIds: members.map((t) => t.employee.id),
				managerIds: members
					.filter((m) => m.role && m.role.name === 'MANAGER')
					.map((t) => t.employee.id),
				name: team.name,
				tenantId: team.tenantId,
				organizationId: team.organizationId,
				tags: [],
				...data,
			};

			/* Updating the team state with the data from the API. */
			queryCall(team.id, body).then((res) => {
				setTeamsUpdate(res.data);
			});
		},
		[]
	);

	return { updateOrganizationTeam, loading };
}

/**
 * It returns an object with all the data and functions needed to manage the teams in the organization
 */
export function useOrganizationTeams() {
	const { loading, queryCall } = useQuery(getOrganizationTeamsAPI);
	const { teams, setTeams, setTeamsUpdate } = useTeamsState();

	const activeTeam = useRecoilValue(activeTeamState);
	const [activeTeamId, setActiveTeamId] = useRecoilState(activeTeamIdState);
	const [teamsFetching, setTeamsFetching] = useRecoilState(teamsFetchingState);
	const { firstLoad, firstLoadData: firstLoadTeamsData } = useFirstLoad();

	// Updaters
	const { createOrganizationTeam, loading: createOTeamLoading } =
		useCreateOrganizationTeam();

	const { updateOrganizationTeam, loading: updateOTeamLoading } =
		useUpdateOrganizationTeam();

	useEffect(() => {
		setTeamsFetching(loading);
	}, [loading, setTeamsFetching]);

	const loadTeamsData = useCallback(() => {
		setActiveTeamId(getActiveTeamIdCookie());
		return queryCall().then((res) => {
			setTeams(res.data?.items || []);
			return res;
		});
	}, [queryCall, setActiveTeamId, setTeams]);

	const setActiveTeam = useCallback(
		(teamId: typeof teams[0]) => {
			setActiveTeamIdCookie(teamId.id);
			setOrganizationIdCookie(teamId.organizationId);
			// This must be called at the end (Update store)
			setActiveTeamId(teamId.id);
		},
		[setActiveTeamId]
	);

	useEffect(() => {
		if (activeTeamId && firstLoad) {
			getOrganizationTeamAPI(activeTeamId).then((res) => {
				setTeamsUpdate(res.data);
			});
		}
	}, [activeTeamId, firstLoad, setTeams]);

	return {
		loadTeamsData,
		loading,
		teams,
		teamsFetching,
		activeTeam,
		setActiveTeam,
		createOrganizationTeam,
		createOTeamLoading,
		firstLoadTeamsData,
		updateOrganizationTeam,
		updateOTeamLoading,
	};
}
