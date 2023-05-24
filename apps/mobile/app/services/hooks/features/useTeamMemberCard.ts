import { useCallback, useMemo, useRef, useState } from "react"
import { useSyncRef } from "../useSyncRef"
import { useTeamTasks } from "./useTeamTasks"
import cloneDeep from "lodash/cloneDeep"
import { useStores } from "../../../models"
import { IOrganizationTeamList } from "../../interfaces/IOrganizationTeam"
import useAuthenticateUser from "./useAuthentificateUser"
import { useIsMemberManager } from "./useIsMemberManager"
import { ITeamTask } from "../../interfaces/ITask"
import { Nullable } from "../../interfaces/hooks"
import { useOrganizationTeam } from "../useOrganization"

/**
 * It returns a bunch of data about a team member, including whether or not the user is the team
 * manager, whether or not the user is the authenticated user, and the last task the user worked on
 * @param {IOrganizationTeamList['members'][number] | undefined} member -
 * IOrganizationTeamList['members'][number] | undefined
 */
export function useTeamMemberCard(member: IOrganizationTeamList["members"][number] | undefined) {
	const {
		TaskStore: {
			activeTaskId,
			setActiveTaskId,
			activeTask,
			teamTasks: tasks,
			tasksStatisticsState,
		},
		teamStore: { activeTeam, activeTeamId },
	} = useStores()
	const { updateTask, setActiveTeamTask, deleteEmployeeFromTasks } = useTeamTasks()

	const publicTeam = false

	const { user: authUser, isTeamManager: isAuthTeamManager } = useAuthenticateUser()

	const activeTeamTask = activeTask

	const { onUpdateOrganizationTeam } = useOrganizationTeam()

	const activeTeamRef = useSyncRef(activeTeam)

	const memberUser = member?.employee.user

	// const memberUserRef = useSyncRef(memberUser);
	const isAuthUser = member?.employee.userId === authUser?.id
	const { isTeamManager, isTeamCreator } = useIsMemberManager(memberUser)

	const memberTaskRef = useRef<Nullable<ITeamTask>>(null)

	const setActiveUserTask = useCallback(
		(task: ITeamTask | null) => {
			if (task?.id && authUser?.id) {
				// setActiveUserTaskCookie({
				// 	taskId: task.id,
				// 	userId: authUser.id,
				// })
				setActiveTaskId(task.id)
			}
		},
		[authUser],
	)

	memberTaskRef.current = useMemo(() => {
		let cTask
		let find

		if (!member) {
			return null
		}

		if (activeTaskId && isAuthUser) {
			cTask = tasks.find((t) => activeTaskId === t.id || publicTeam)
			find = cTask
		} else if (member.lastWorkedTask) {
			cTask = tasks.find((t) => t.id === member.lastWorkedTask?.id)
			find = cTask?.members.some((m) => m.id === member.employee.id)
		} else {
			cTask = tasks.find((t) => t.members.some((m) => m.userId === member.employee.userId))
			find = cTask?.members.some((m) => m.id === member.employee.id)
		}

		if (isAuthUser && member.lastWorkedTask && !activeTaskId) {
			setActiveUserTask(member.lastWorkedTask)
		} else if (isAuthUser && find && cTask && !activeTaskId) {
			setActiveUserTask(cTask)
		}

		const responseTask = find ? cloneDeep(cTask) : null

		if (responseTask) {
			const taskStatistics =
				tasksStatisticsState?.all.find((statistics) => statistics.id === responseTask.id) || []
			responseTask.totalWorkedTime = taskStatistics?.duration || 0
		}

		return responseTask
	}, [activeTeamTask, isAuthUser, authUser, member, tasks, publicTeam])

	/**
	 * Give the manager role to the member
	 */
	const makeMemberManager = useCallback(() => {
		const employeeId = member?.employee?.id

		if (!activeTeamRef.current || !employeeId) return
		const team = activeTeamRef.current

		onUpdateOrganizationTeam({
			id: activeTeamId,
			data: {
				...activeTeam,
				managerIds: team.members
					.filter((r) => r.role && r.role.name === "MANAGER")
					.map((r) => r.employee.id)
					.concat(employeeId),
			},
		})
	}, [onUpdateOrganizationTeam, member, activeTeamRef])

	/**
	 * remove manager role to the member
	 */
	const unMakeMemberManager = useCallback(() => {
		const employeeId = member?.employee?.id

		if (!activeTeamRef.current || !employeeId) return
		const team = activeTeamRef.current

		onUpdateOrganizationTeam({
			id: activeTeamId,
			data: {
				...activeTeam,
				managerIds: team.members
					.filter((r) => r.role && r.role.name === "MANAGER")
					.filter((r) => r.employee.id !== employeeId)
					.map((r) => r.employee.id)
					.filter((value, index, array) => array.indexOf(value) === index), // To make the array Unique list of ids
			},
		})
	}, [onUpdateOrganizationTeam, member, activeTeamRef])

	/**
	 * Remove member from team API call
	 */
	const removeMemberFromTeam = useCallback(() => {
		const employeeId = member?.employee?.id

		if (!activeTeamRef.current || !employeeId) return
		const team = activeTeamRef.current

		deleteEmployeeFromTasks(employeeId, team.id) // Unassign all the task
		onUpdateOrganizationTeam({
			id: activeTeamId,
			data: {
				...activeTeam,
				// remove from members
				memberIds: team.members
					.filter((r) => r.employee.id !== employeeId)
					.map((r) => r.employee.id),

				// remove from managers
				managerIds: team.members
					.filter((r) => r.role && r.role.name === "MANAGER")
					.filter((r) => r.employee.id !== employeeId)
					.map((r) => r.employee.id),
			},
		})
	}, [onUpdateOrganizationTeam, member, activeTeamRef])

	/**
	 * Returns all tasks not assigned to the member
	 */
	const memberUnassignTasks = useMemo(() => {
		if (!memberUser) return []

		return tasks.filter((task) => {
			return !task.members.some((m) => m.userId === memberUser.id)
		})
	}, [tasks, memberUser])

	/**
	 * Assign task to the member
	 */
	const assignTask = useCallback(
		(task: ITeamTask) => {
			if (!member?.employeeId) {
				return Promise.resolve()
			}

			return updateTask(
				{
					...task,
					members: [...task.members, (member?.employeeId ? { id: member?.employeeId } : {}) as any],
				},
				task.id,
			).then(() => {
				if (isAuthUser && !activeTeamTask) {
					setActiveTeamTask(task)
				}
			})
		},
		[updateTask, member, isAuthUser, setActiveTeamTask, activeTeamTask],
	)

	const unassignTask = useCallback(
		(task: ITeamTask) => {
			if (!member?.employeeId) {
				return Promise.resolve()
			}

			return updateTask(
				{
					...task,
					members: task.members.filter((m) => m.id !== member.employeeId),
				},
				task.id,
			).finally(() => {
				isAuthUser && setActiveTeamTask(null)
			})
		},
		[updateTask, member, isAuthUser, setActiveTeamTask],
	)

	return {
		assignTask,
		memberUnassignTasks,
		isTeamManager,
		memberUser,
		member,
		memberTask: memberTaskRef.current,
		isAuthUser,
		isAuthTeamManager,
		makeMemberManager,
		removeMemberFromTeam,
		unMakeMemberManager,
		isTeamCreator,
		unassignTask,
		isTeamOwner: activeTeam?.createdBy?.id === memberUser?.id,
	}
}

export function useTMCardTaskEdit(task: Nullable<ITeamTask>) {
	const [editMode, setEditMode] = useState(false)
	const [estimateEditMode, setEstimateEditMode] = useState(false)
	const [loading, setLoading] = useState(false)

	return {
		editMode,
		setEditMode,
		task,
		estimateEditMode,
		setEstimateEditMode,
		loading,
		setLoading,
	}
}

export type I_TMCardTaskEditHook = ReturnType<typeof useTMCardTaskEdit>

export type I_TeamMemberCardHook = ReturnType<typeof useTeamMemberCard>
// function useOrganizationTeams(): {
// 	activeTeam: any
// 	updateOrganizationTeam: any
// 	updateOTeamLoading: any
// } {
// 	throw new Error("Function not implemented.")
// }
