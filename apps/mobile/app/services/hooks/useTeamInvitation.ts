import React, { useCallback, useEffect, useState } from "react";
import { generateToken } from "../../helpers/generate-token";
import {
    INVITE_CALLBACK_URL
} from "@env"
import { useQueryClient } from "react-query"
import { useStores } from "../../models";
import { IInviteCreate } from "../interfaces/IInvite";
import { acceptInviteRequest, getTeamInvitationsRequest, inviteByEmailsRequest, verifyInviteCodeRequest } from "../client/requests/invite";
import { getEmployeeRoleRequest } from "../client/requests/roles";
import useFetchTeamInvitations from "../client/queries/invitation/invitations";

export function useTeamInvitations() {
    const queryClient = useQueryClient()
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
    const {isLoading, isFetching, isRefetching, data:invitations}=useFetchTeamInvitations({authToken,tenantId, organizationId, activeTeamId});

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
                departmentIds:[],
                organizationContactIds:[],
                emailIds: [email],
                roleId: employeeRole?.id || '',
                invitationExpirationPeriod: 'Never',
                inviteType: 'TEAM',
                appliedDate:null,
                invitedById: user.id,
                teamIds: [activeTeamId],
                projectIds: [],
                fullName: name,
                ...(INVITE_CALLBACK_URL ? { callbackUrl: INVITE_CALLBACK_URL } : {}),
            },
            authToken
        )
            queryClient.invalidateQueries("invitations")
        setLoading(false)
        return response
    }



    useEffect(() => {
        setTeamInvitations(invitations||[])
    }, [activeTeamId, teams, loading, user, isFetching, isRefetching])

    return {
        inviterMember,
        loading,
        teamInvitations,
    }
}