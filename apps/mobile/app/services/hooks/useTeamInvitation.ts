import React, { useCallback, useEffect, useState } from "react";
import { generateToken } from "../../helpers/generate-token";
import { useStores } from "../../models";
import { IInviteCreate } from "../interfaces/IInvite";
import { acceptInviteRequest, getTeamInvitationsRequest, inviteByEmailsRequest, verifyInviteCodeRequest } from "../client/requests/invite";
import { getEmployeeRoleRequest } from "../client/requests/roles";

export function useTeamInvitations() {
    const { authenticationStore: {
        user,
        organizationId,
        tenantId,
        authToken,
        employeeId,
        setOrganizationId,
        setTenantId,
        setAuthToken,
        setUser,
        setEmployeeId
    },
        teamStore: { activeTeamId, activeTeam, teamInvitations, setTeamInvitations, teams } } = useStores();

    const [loading, setLoading] = useState<boolean>(false);
    const members = activeTeam.members || [];

    const currentUser = members?.find((t) => t.employeeId === employeeId);


    const inviterMember = async ({ name, email }: { name: string, email: string }) => {
        setLoading(true)
        const { data: employeeRole } = await getEmployeeRoleRequest({
            tenantId,
            role: 'EMPLOYEE',
            bearer_token: authToken,
        });

        const { data, response } = await inviteByEmailsRequest(
            {
                startedWorkOn: new Date().toISOString(),
                tenantId,
                organizationId,
                emailIds: [email],
                roleId: employeeRole?.id || '',
                invitationExpirationPeriod: 'Never',
                inviteType: 'TEAM',
                invitedById: user.id,
                teamIds: [activeTeamId],
                projectIds: [activeTeamId],
                fullName: name,
                // ...(INVITE_CALLBACK_URL ? { callbackUrl: INVITE_CALLBACK_URL } : {}),
            },
            authToken
        )
        setLoading(false)
        return response
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
        return data;
    }



    useEffect(() => {
        getTeamInvitations()
    }, [activeTeamId, loading, user])

    return {
        inviterMember,
        loading,
        teamInvitations
    }
}