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

        const { response } = await inviteByEmailsRequest(
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

        const { data } = await getTeamInvitationsRequest(
            {
                tenantId,
                teamId: activeTeamId,
                organizationId,
                role: 'EMPLOYEE',
            },
            authToken
        );
        setLoading(false)
        setTeamInvitations(data)
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

    const verifyInviteByCode = async ({ email, code }: { email: string, code: string }) => {

        try {

            const { data: inviteData, response: verifyResponse } = await verifyInviteCodeRequest({ email, code: parseInt(code) });

            const password = "123456" || generateToken(8);
            const names = inviteData.fullName.split(" ");

            const { data, response } = await acceptInviteRequest({
                user: {
                    firstName: names[0],
                    lastName: names[1] || "",
                    email: inviteData.email
                },
                password,
                code: parseInt(code),
                email
            })

            setOrganizationId(data.employee?.organizationId)
            setAuthToken(data?.token)
            setTenantId(data.employee?.tenantId)
            setEmployeeId(data.employee?.id)
            setUser(data?.user)

        } catch (error) {
            console.log("catch error" + error)
        }
    }

    useEffect(() => {
        getTeamInvitations()
    }, [activeTeamId, loading, user])

    return {
        inviterMember,
        loading
    }
}