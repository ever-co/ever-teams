import { useCallback, useEffect, useMemo, useState } from "react"
import { useStores } from "../../../../models"
import { useAuthTeamTasks } from "../../../../services/hooks/features/useAuthTeamTasks"
import { useTeamTasks } from "../../../../services/hooks/features/useTeamTasks"
import { ICreateTask, ITeamTask } from "../../../../services/interfaces/ITask"
import { createTaskRequest } from "../../../../services/client/requests/tasks"

export const useProfileScreenLogic = ({
	activeTab,
	userId,
}: {
	activeTab: "worked" | "assigned" | "unassigned"
	userId: string
}) => {
	const {
		TaskStore: { activeTask },
		authenticationStore: { user, authToken, tenantId, organizationId },
		teamStore: { activeTeam },
	} = useStores()
	const { updateTask, isRefetching } = useTeamTasks()

	const [showCreateTeamModal, setShowCreateTeamModal] = useState(false)
	const [isLoading, setIsLoading] = useState(true)

	const members = activeTeam?.members || []
	const currentUserId = userId || user?.id

	const matchUser = useMemo(
		() =>
			members.find((m) => {
				return m.employee.userId === userId
			}) ||
			members.find((m) => {
				return m.employee.userId === user?.id
			}),
		[activeTeam, currentUserId],
	)

	const isAuthUser = user?.employee.userId === currentUserId

	const activeUserTeamTask = useMemo(
		() => (isAuthUser ? activeTask : matchUser?.lastWorkedTask),
		[userId, isRefetching],
	)

	const userProfile = isAuthUser ? user : matchUser?.employee.user

	const employeeId = isAuthUser ? user?.employee.id : matchUser?.employeeId

	/* Filtering the tasks */
	const tasksGrouped = useAuthTeamTasks(userProfile)

	useEffect(() => {
		if (employeeId) {
			// getTasksStatsData(employeeId)
		}
	}, [employeeId])

	const assignTask = useCallback(
		(task: ITeamTask) => {
			if (!matchUser?.employeeId) {
				return Promise.resolve()
			}

			return updateTask(
				{
					...task,
					members: [
						...task.members,
						(matchUser?.employeeId ? { id: matchUser?.employeeId } : {}) as any,
					],
				},
				task.id,
			)
		},
		[updateTask, matchUser],
	)

	const unassignTask = useCallback(
		(task: ITeamTask) => {
			if (!matchUser?.employeeId) {
				return Promise.resolve()
			}

			return updateTask(
				{
					...task,
					members: [
						...task.members.filter((member) => member.id !== matchUser?.employeeId),
					],
				},
				task.id,
			)
		},
		[updateTask, matchUser],
	)

	const onCreateNewTask = useCallback(
		async (task: ICreateTask) => {
			return await createTaskRequest({
				data: {
					...task,
					organizationId,
					tenantId,
					teams: [{ id: activeTeam?.id }],
					members: [{ id: employeeId }],
				},
				bearer_token: authToken,
			})
		},
		[authToken],
	)

	useEffect(() => {
		setTimeout(() => setIsLoading(false), 2000)
	}, [])
	return {
		showCreateTeamModal,
		setShowCreateTeamModal,
		isAuthUser,
		activeUserTeamTask,
		userProfile,
		tasksGrouped,
		member: matchUser,
		assignTask,
		unassignTask,
		activeTab,
		onCreateNewTask,
		isLoading,
	}
}

export type IUserProfile = ReturnType<typeof useProfileScreenLogic>
