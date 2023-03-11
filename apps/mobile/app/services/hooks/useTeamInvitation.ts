import React, { useCallback, useEffect, useState } from "react";
import { generateToken } from "../../helpers/generate-token";
import {
    INVITE_CALLBACK_URL
} from "@env"
import { useQueryClient } from "react-query"
import { useStores } from "../../models";
import { IInviteCreate } from "../interfaces/IInvite";
import { acceptInviteRequest, getTeamInvitationsRequest, inviteByEmailsRequest, resendInvitationEmailRequest, verifyInviteCodeRequest } from "../client/requests/invite";
import { getEmployeeRoleRequest } from "../client/requests/roles";
import useFetchTeamInvitations from "../client/queries/invitation/invitations";
import { getAllUsersRequest } from "../client/requests/user";

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
    const { isLoading, isFetching, isRefetching, data: invitations } = useFetchTeamInvitations({ authToken, tenantId, organizationId, activeTeamId });

    const [loading, setLoading] = useState<boolean>(false);


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
                departmentIds: [],
                organizationContactIds: [],
                emailIds: [email],
                roleId: employeeRole?.id || '',
                invitationExpirationPeriod: 'Never',
                inviteType: 'TEAM',
                appliedDate: null,
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

    const resendInvite = useCallback(async (inviteId: string) => {

        const { data } = await resendInvitationEmailRequest(
            {
                tenantId,
                inviteId: inviteId,
                inviteType: 'TEAM',
                organizationId,
                ...(INVITE_CALLBACK_URL ? { callbackUrl: INVITE_CALLBACK_URL } : {}),
            },
            authToken
        );
    }, [])

    useEffect(() => {
        setTeamInvitations(invitations || [])
    }, [activeTeamId, teams, loading, user, isFetching, isRefetching])

    return {
        inviterMember,
        loading,
        teamInvitations,
        resendInvite
    }
}