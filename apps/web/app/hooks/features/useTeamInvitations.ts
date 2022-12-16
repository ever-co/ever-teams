import {
	getTeamInvitationsAPI,
	inviteByEmailsAPI,
} from '@app/services/client/api';
import {
	activeTeamIdState,
	fetchingTeamInvitationsState,
	getTeamInvitationsState,
	teamInvitationsState,
} from '@app/stores';
import { useCallback, useEffect } from 'react';
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil';
import { useFirstLoad } from '../useFirstLoad';
import { useQuery } from '../useQuery';

export function useTeamInvitations() {
	const setTeamInvitations = useSetRecoilState(teamInvitationsState);
	const teamInvitations = useRecoilValue(getTeamInvitationsState);
	const [fetchingInvitations, setFetchingInvitations] = useRecoilState(
		fetchingTeamInvitationsState
	);

	const activeTeamId = useRecoilValue(activeTeamIdState);
	const { firstLoad, firstLoadData: firstLoadTeamInvitationsData } =
		useFirstLoad();

	// Queries
	const { queryCall, loading } = useQuery(getTeamInvitationsAPI);
	const { queryCall: inviteQueryCall, loading: inviteLoading } =
		useQuery(inviteByEmailsAPI);

	const invateUser = useCallback((email: string, name: string) => {
		return inviteQueryCall({ email, name }).then((res) => {
			setTeamInvitations(res.data?.items || []);
			return res;
		});
	}, []);

	useEffect(() => {
		if (activeTeamId && firstLoad) {
			queryCall().then((res) => {
				setTeamInvitations(res.data?.items || []);
			});
		}
	}, [activeTeamId, firstLoad]);

	useEffect(() => {
		if (firstLoad) {
			setFetchingInvitations(loading);
		}
	}, [loading, firstLoad]);

	return {
		teamInvitations,
		firstLoadTeamInvitationsData,
		fetchingInvitations,
		inviteLoading,
		invateUser,
	};
}
