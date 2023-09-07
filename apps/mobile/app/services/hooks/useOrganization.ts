/* eslint-disable camelcase */
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { showMessage } from "react-native-flash-message"
import { useStores } from "../../models"
import useFetchUserOrganization from "../client/queries/organizationTeam/organization"
import {
	createOrganizationTeamRequest,
	deleteOrganizationTeamRequest,
	removeUserFromAllTeam,
	updateOrganizationTeamRequest,
} from "../client/requests/organization-team"
import {
	deleteOrganizationTeamEmployeeRequest,
	updateOrganizationTeamEmployeeRequest,
} from "../client/requests/organization-team-employee"
import { IOrganizationTeamList, OT_Member } from "../interfaces/IOrganizationTeam"
import useAuthenticateUser from "./features/useAuthentificateUser"

function useCreateOrganizationTeam() {
	const {
		authenticationStore: { tenantId, organizationId, authToken, employeeId },
		teamStore: { teams, setOrganizationTeams, setActiveTeamId },
	} = useStores()

	const [createTeamLoading, setCreateTeamLoading] = useState(false)
	const teamsRef = useRef(teams)

	teamsRef.current = useMemo(() => (teamsRef.current = teams), [teams])

	const createOrganizationTeam = useCallback(
		async (name: string) => {
			const teams = teamsRef.current?.items || []
			const $name = name.trim()
			const exits = teams.find((t) => t.name.toLowerCase() === $name.toLowerCase())

			if (exits || $name.length < 3) {
				return {
					error: "Invalid team name",
				}
			}

			setCreateTeamLoading(true)

			const { data } = await createOrganizationTeamRequest(
				{
					name: $name,
					tenantId,
					organizationId,
					managerIds: [employeeId],
				},
				authToken,
			)

			setActiveTeamId(data.id)
			setCreateTeamLoading(false)
			return data
		},
		[setCreateTeamLoading, setActiveTeamId, setOrganizationTeams],
	)

	return {
		createOrganizationTeam,
		createTeamLoading,
	}
}

export function useOrganizationTeam() {
	const {
		teamStore: {
			activeTeamId,
			setIsTrackingEnabled,
			setActiveTeam,
			setOrganizationTeams,
			activeTeam,
			setActiveTeamId,
		},
		authenticationStore: { tenantId, authToken, organizationId },
	} = useStores()
	const { user } = useAuthenticateUser()
	const { createOrganizationTeam, createTeamLoading } = useCreateOrganizationTeam()

	const {
		data: organizationTeams,
		isSuccess,
		refetch,
		isRefetching,
	} = useFetchUserOrganization({
		tenantId,
		authToken,
		userId: user?.id,
	})

	const [isTeamManager, setIsTeamManager] = useState(false)
	const [teamsFetching, setTeamsFetching] = useState(false)

	const members = activeTeam?.members || []

	const currentUser = members.find((m) => {
		return m.employee.userId === user?.id
	})

	const $otherMembers = members.filter((m) => {
		return m.employee.userId !== user?.id
	})

	const activeTeamManagers = members?.filter((m) => m.role?.name === "MANAGER")

	const isManager = () => {
		if (activeTeam) {
			const $u = user
			const isM = members.find((member) => {
				const isUser = member.employee.userId === $u?.id
				return isUser && member.role && member.role.name === "MANAGER"
			})
			setIsTeamManager(!!isM)
		}
	}

	const isTrackingEnabled = useMemo(() => currentUser?.isTrackingEnabled, [currentUser])

	const makeMemberAsManager = useCallback(
		async (employeeId: string) => {
			// Check if user is already manager
			const member = members.find((m) => m.employeeId === employeeId)

			if (member.role?.name === "MANAGER") {
				showMessage({
					message: "Info",
					description: "User is already manager",
					type: "warning",
				})
				return
			}

			const managerIds = members.filter((m) => m.role).map((t) => t.employeeId)
			managerIds.push(employeeId)

			const team: IOrganizationTeamList = {
				...activeTeam,
				managerIds,
			}

			const { response } = await updateOrganizationTeamRequest({
				datas: team,
				id: activeTeamId,
				bearer_token: authToken,
			})

			if (response.ok || response.status === 202) {
				showMessage({
					message: "Info",
					description: "The current user is now manager ! ",
					type: "success",
				})
			}
		},
		[activeTeamId],
	)

	const removeMemberFromTeam = useCallback(
		async (employeeId: string) => {
			const member = members.find((m) => m.employeeId === employeeId)
			const managerIds = members.filter((m) => m.role).map((t) => t.employeeId)

			// Verify if member is manager And Check if he is the only manager in the active team
			if (member.role && managerIds.length < 2) {
				showMessage({
					message: "Quit the team",
					description: "You're the only manager you can't quit the team",
					type: "warning",
				})
				return
			}

			await deleteOrganizationTeamEmployeeRequest({
				employeeId,
				bearer_token: authToken,
				organizationId,
				tenantId,
				organizationTeamId: activeTeamId,
				id: member.id,
			})
				.then((res) => {
					const { response } = res
					console.log(JSON.stringify(res))
					if (
						!response.ok ||
						response.status === 401 ||
						response.status === 402 ||
						response.status === 403
					) {
						showMessage({
							message: "QUIT THE TEAM",
							description: "Sorry, something went wrong !",
							type: "warning",
						})
					} else {
						refreshTeams()
					}
				})
				.catch((e) => console.log(e))
		},
		[activeTeam, isTeamManager],
	)
	// console.log(JSON.stringify(user))
	/**
	 * Remove user from all teams
	 */
	const removeUserFromAllTeams = useCallback(
		async (userId: string) => {
			const member = members.find((m) => m.employee?.userId === userId)
			const managerIds = members.filter((m) => m.role).map((t) => t.employeeId)
			// Verify if member is manager And Check if he is the only manager in the active team

			if (member.role && managerIds.length < 2) {
				showMessage({
					message: "REMOVE FROM ALL TEAMS",
					description: "You are not able to removed account where you are only the manager!",
					type: "warning",
				})
				return
			}

			await removeUserFromAllTeam({
				userId,
				bearer_token: authToken,
				tenantId,
			})
				.then((res) => {
					const { response } = res
					if (response.ok || response.status === 200) {
						refreshTeams()
					} else {
						showMessage({
							message: "REMOVE FROM ALL TEAMS",
							description: "You are not able to removed account where you are only the manager!",
							type: "warning",
						})
					}
				})
				.catch((e) => console.log(e))
		},
		[removeUserFromAllTeam],
	)

	/**
	 * Enable or Disable user time tracking
	 */
	const toggleTimeTracking = useCallback(async (user: OT_Member, isEnabled: boolean) => {
		const { data, response } = await updateOrganizationTeamEmployeeRequest({
			id: user.id,
			body: {
				id: user.id,
				organizationId,
				organizationTeamId: activeTeamId,
				isTrackingEnabled: isEnabled,
			},
			tenantId,
			bearer_token: authToken,
		})
		refreshTeams()
		return { data, response }
	}, [])

	/**
	 * Update Organization Team Employee
	 */

	const updateOrganizationTeamEmployeeActiveTask = useCallback(
		async (user: OT_Member, activeTaskId: string, activeTeamId: string) => {
			const { data, response } = await updateOrganizationTeamEmployeeRequest({
				id: user.id,
				body: {
					id: user.id,
					organizationId,
					organizationTeamId: activeTeamId,
					activeTaskId,
				},
				tenantId,
				bearer_token: authToken,
			})

			return { data, response }
		},
		[],
	)

	/**
	 * Update Organization Team
	 */
	const onUpdateOrganizationTeam = useCallback(
		async ({ id, data }: { id: string; data: IOrganizationTeamList }) => {
			await updateOrganizationTeamRequest({
				id,
				datas: data,
				bearer_token: authToken,
			})
				.then((res) => {
					const { response } = res
					if (response.ok || response.status === 202 || response.status === 200) {
						refreshTeams()
					}
				})
				.catch((e) => console.log(e))
		},
		[],
	)

	/**
	 * Remove the active team
	 */
	const onRemoveTeam = useCallback(async (teamId: string) => {
		await deleteOrganizationTeamRequest({
			id: teamId,
			bearer_token: authToken,
			organizationId,
			tenantId,
		})
			.then((res) => {
				const { response } = res
				if (response.ok || response.status === 202 || response.status === 200) {
					refreshTeams()
				}
			})
			.catch((e) => console.log(e))
	}, [])

	const refreshTeams = useCallback(() => {
		refetch()
			.then((res) => {
				const { isSuccess, data } = res
				if (isSuccess) {
					const currentTeam = data?.items.find((t) => t.id === activeTeamId)
					setActiveTeam(currentTeam)
					setOrganizationTeams(data)
				}
			})
			.catch((e) => console.log(e))
	}, [])

	// Load Teams
	useEffect(() => {
		if (isSuccess) {
			// If there no team, user will be logged out
			if (organizationTeams?.total === 0 || !organizationTeams) {
				setActiveTeamId("")
				setActiveTeam(null)
				return
			}
			// UPDATE ACTIVE TEAM
			const updateActiveTeam =
				organizationTeams?.items.find((t) => t.id === activeTeamId) || organizationTeams?.items[0]
			if (updateActiveTeam) {
				setActiveTeam(updateActiveTeam)
				setActiveTeamId(updateActiveTeam.id)
			}
			setOrganizationTeams(organizationTeams)
			setTeamsFetching(false)
		}
		isManager()
		setIsTrackingEnabled(currentUser?.isTrackingEnabled)
	}, [organizationTeams, isSuccess, isRefetching])

	return {
		removeUserFromAllTeams,
		isTeamManager,
		members,
		activeTeam,
		createOrganizationTeam,
		$otherMembers,
		currentUser,
		createTeamLoading,
		teamsFetching,
		makeMemberAsManager,
		removeMemberFromTeam,
		toggleTimeTracking,
		updateOrganizationTeamEmployeeActiveTask,
		onUpdateOrganizationTeam,
		onRemoveTeam,
		activeTeamManagers,
		isTrackingEnabled,
	}
}
