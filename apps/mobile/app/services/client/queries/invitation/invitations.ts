import { useQuery } from "react-query"
import { getTeamInvitationsRequest } from "../../requests/invite";

interface IGetTeamInvitationParams {
    authToken: string;
    tenantId: string;
    organizationId: string;
    activeTeamId: string
}

const fetchAllTeamInvitations = async (params: IGetTeamInvitationParams) => {
    const { tenantId, activeTeamId, organizationId, authToken } = params;
    const { data } = await getTeamInvitationsRequest(
        {
            tenantId,
            teamId: activeTeamId,
            organizationId,
            role: "EMPLOYEE",
        },
        authToken
    );
    const activeInvitations = data.items.filter((i) => i.status !== "ACCEPTED") || [];
    return activeInvitations;
};

const useFetchTeamInvitations = (IGetTeamInvitationParams) => useQuery(['invitations', IGetTeamInvitationParams], () => fetchAllTeamInvitations(IGetTeamInvitationParams));
export default useFetchTeamInvitations;