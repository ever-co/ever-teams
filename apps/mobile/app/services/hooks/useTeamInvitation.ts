import React, { useCallback, useEffect, useState } from "react";
import { useStores } from "../../models";
import { IInviteCreate } from "../interfaces/IInvite";
import { getTeamInvitationsRequest, inviteByEmailsRequest } from "../requests/invite";

export function useTeamInvitations() {
    const { authenticationStore: { user, organizationId, tenantId, authToken, employeeId },
        teamStore: { activeTeamId, activeTeam, teamInvitations, setTeamInvitations } } = useStores();
  
    const [loading, setLoading] = useState<boolean>(false);
    const members = activeTeam.members || [];

    const currentUser = members?.find((t) => t.employeeId === employeeId);


    const inviterMember = async ({ name, email }: { name: string, email: string }) => {
        setLoading(true)
        const body: IInviteCreate = {
            emailIds: [email],
            fullName: name,
            organizationId,
            roleId: currentUser?.roleId,
            invitationExpirationPeriod: 1,
            inviteType: "TEAM",
            teamIds: [activeTeamId],
        }
        const { data, response } = await inviteByEmailsRequest(body, authToken, tenantId)
        setLoading(false)
    }

    const getTeamInvitations = async () => {

        const { data } = await getTeamInvitationsRequest(
            {
                tenantId,
                teamId: activeTeamId,
                organizationId,
                role: "EMPLOYEE",
            },
            authToken
        );
        setTeamInvitations(data)
        //  console.log("Load invitations:" + JSON.stringify(data))
        return data;
    }

    useEffect(() => {
        getTeamInvitations()
    }, [activeTeamId, loading])

    return {
        inviterMember,
        loading
    }
}