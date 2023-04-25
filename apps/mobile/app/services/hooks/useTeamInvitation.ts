import { useCallback, useEffect, useState } from "react"
import { INVITE_CALLBACK_URL } from "@env"
import isEqual from "lodash/isEqual"
import { useStores } from "../../models"
import { inviteByEmailsRequest, resendInvitationEmailRequest } from "../client/requests/invite"
import { getEmployeeRoleRequest } from "../client/requests/roles"
import { useFetchTeamInvitations } from "../client/queries/invitation/invitations"
import { useSyncRef } from "./useSyncRef"

export function useTeamInvitations() {
	const {
		authenticationStore: { user, organizationId, tenantId, authToken },
		teamStore: { activeTeamId, teamInvitations, setTeamInvitations, teams },
	} = useStores()
	const {
		isFetching,
		isSuccess,
		refetch,
		isRefetching,
		data: invitations,
	} = useFetchTeamInvitations({ authToken, tenantId, organizationId, activeTeamId })

	const [loading, setLoading] = useState<boolean>(false)
	const invitationsRef = useSyncRef(teamInvitations || [])
	const inviterMember = async ({ name, email }: { name: string; email: string }) => {
		setLoading(true)
		const { data: employeeRole } = await getEmployeeRoleRequest({
			tenantId,
			role: "EMPLOYEE",
			bearer_token: authToken,
		})

		const { response } = await inviteByEmailsRequest(
			{
				startedWorkOn: new Date().toISOString(),
				tenantId,
				organizationId,
				departmentIds: [],
				organizationContactIds: [],
				emailIds: [email],
				roleId: employeeRole?.id || "",
				invitationExpirationPeriod: "Never",
				inviteType: "TEAM",
				appliedDate: null,
				invitedById: user.id,
				teamIds: [activeTeamId],
				projectIds: [],
				fullName: name,
				...(INVITE_CALLBACK_URL ? { callbackUrl: INVITE_CALLBACK_URL } : {}),
			},
			authToken,
		)
		refetch()
		setLoading(false)
		return response
	}

	const resendInvite = useCallback(async (inviteId: string) => {
		await resendInvitationEmailRequest(
			{
				tenantId,
				inviteId,
				inviteType: "TEAM",
				organizationId,
				...(INVITE_CALLBACK_URL ? { callbackUrl: INVITE_CALLBACK_URL } : {}),
			},
			authToken,
		)
	}, [])

	useEffect(() => {
		if (isSuccess) {
			const latestTeamInvitations = invitations || []

			const latestTeamInvitationsSorted = latestTeamInvitations
				.slice()
				.sort((a, b) => a.email.localeCompare(b.email))

			const teamInvitationsRefSorted = invitationsRef.current
				.slice()
				.sort((a, b) => a.email.localeCompare(b.email))

			/**
			 * Check deep equality,
			 * No need to update state if all the invitation details are same
			 * (It prevents unnecessary re-rendering)
			 *
			 * Use tinvitationsRef to make we always get the lastest value
			 */
			if (!isEqual(latestTeamInvitationsSorted, teamInvitationsRefSorted)) {
				setTeamInvitations(invitations)
			}
		}
	}, [activeTeamId, teams, loading, user, isFetching, isRefetching])

	return {
		inviterMember,
		loading,
		teamInvitations,
		resendInvite,
	}
}
