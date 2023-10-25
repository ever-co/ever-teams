import { useQuery } from 'react-query';
import { getMyInvitationsRequest, getTeamInvitationsRequest } from '../../requests/invite';

interface IGetTeamInvitationParams {
	authToken: string;
	tenantId: string;
	organizationId: string;
	activeTeamId: string;
}

export const fetchAllTeamInvitations = async (params: IGetTeamInvitationParams) => {
	const { tenantId, activeTeamId, organizationId, authToken } = params;
	const { data } = await getTeamInvitationsRequest(
		{
			tenantId,
			teamId: activeTeamId,
			organizationId,
			role: 'EMPLOYEE'
		},
		authToken
	);
	const activeInvitations = data.items.filter((i) => i.status !== 'ACCEPTED' && i.status !== 'REJECTED') || [];
	return activeInvitations;
};

export const useFetchTeamInvitations = (IGetTeamInvitationParams) =>
	useQuery(['invitations', IGetTeamInvitationParams], () => fetchAllTeamInvitations(IGetTeamInvitationParams), {
		refetchInterval: 10000
	});

interface IMyInvitationsParams {
	tenantId: string;
	authToken: string;
}
const fetchAllMyInvitations = async ({ tenantId, authToken }: IMyInvitationsParams) => {
	const { data } = await getMyInvitationsRequest(tenantId, authToken);
	return data;
};

export const useFetchMyInvitations = (IMyInvitationsParams) =>
	useQuery(['myInvitations', IMyInvitationsParams], () => fetchAllMyInvitations(IMyInvitationsParams), {
		refetchInterval: 10000
	});
