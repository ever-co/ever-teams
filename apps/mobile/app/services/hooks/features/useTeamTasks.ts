/* eslint-disable camelcase */
import { useCallback, useEffect } from "react"
import { useStores } from "../../../models"
import useFetchAllTasks from "../../client/queries/task/tasks"
import {
	createTaskRequest,
	deleteTaskRequest,
	getTeamTasksRequest,
	updateTaskRequest,
} from "../../client/requests/tasks"
import { OT_Member } from "../../interfaces/IOrganizationTeam"
import { ICreateTask, ITeamTask } from "../../interfaces/ITask"

export function useTeamTasks() {
	const {
		authenticationStore: { tenantId, organizationId, authToken },
		teamStore: { activeTeam, activeTeamId },
		TaskStore: { teamTasks, setTeamTasks, setActiveTask, activeTaskId, setActiveTaskId },
	} = useStores()

	const {
		data: allTasks,
		isRefetching,
		isSuccess,
		isLoading,
		refetch,
	} = useFetchAllTasks({ tenantId, organizationId, authToken, activeTeamId })

	// Create a new Task
	const createNewTask = useCallback(
		async (title: string) => {
			if (title.trim().length > 2) {
				const dataBody: ICreateTask = {
					title,
					status: "open",
					description: "",
					tags: [],
					teams: [
						{
							id: activeTeamId,
						},
					],
					estimate: 0,
					organizationId,
					tenantId,
				}

				await createTaskRequest({
					data: dataBody,
					bearer_token: authToken,
				})
					.then((response) => {
						const { data: created } = response
						refetch()
							.then((res) => {
								const { data } = res
								const activeTeamTasks = getTasksByTeamState({ tasks: data, activeTeamId })
								setTeamTasks(data)
								const createdTask = activeTeamTasks.find((t) => t.id === created?.id)
								setActiveTeamTask(createdTask)
							})
							.catch((e) => console.log(e))
					})
					.catch((e) => console.log(e))
			}
		},
		[activeTeamId],
	)

	// Update a task
	const updateTask = async (task: ITeamTask, id: string) => {
		const { data, response } = await updateTaskRequest({ data: task, id }, authToken)
		refetch().then((res) => {
			const { data } = res
			setActiveTeamTasks(data)
		})
		return { data, response }
	}

	// Delete a Task
	const deleteTask = useCallback(
		async (task: (typeof teamTasks)[0]) => {
			const { data } = await deleteTaskRequest({
				tenantId,
				taskId: task.id,
				bearer_token: authToken,
			})

			const affected = data.affected || 0

			if (affected > 0) {
				setTeamTasks((ts) => {
					return ts.filter((t) => t.id !== task.id)
				})
			}

			return data
		},
		[setTeamTasks],
	)

	// Assign a task to a member
	const onAssignTask = async ({ taskId, memberId }: { taskId: string; memberId: string }) => {
		const teamMembers: OT_Member[] = activeTeam?.members
		const currentMember = teamMembers?.find((m) => m.employee.user.id === memberId)

		if (!currentMember) {
			return {
				error: "This user is not part of this team",
			}
		}

		const { data: tasks } = await getTeamTasksRequest({
			bearer_token: authToken,
			tenantId,
			organizationId,
		})

		const activeTeamTasks = getTasksByTeamState({ tasks: tasks?.items, activeTeamId })
		const task: ITeamTask = activeTeamTasks.find((ts) => ts.id === taskId)
		const members = task.members

		const editTask = {
			...task,
			members: [
				...members,
				{
					id: currentMember.employeeId,
				},
			],
		}
		const { data } = await updateTaskRequest({ data: editTask, id: taskId }, authToken)
		refetch().then((res) => {
			const { data } = res
			setActiveTeamTasks(data)
		})
		return data
	}

	// UNASSIGN A TASK
	const onUnassignedTask = async ({ taskId, memberId }: { taskId: string; memberId: string }) => {
		const teamMembers: OT_Member[] = activeTeam?.members
		const currentMember = teamMembers?.find((m) => m.employee.user.id === memberId)

		if (!currentMember) {
			return {
				error: "This member is not in this team",
			}
		}

		const task: ITeamTask = teamTasks.find((ts) => ts.id === taskId)

		const members = task.members.filter((m) => m.userId !== memberId)

		const editTask = {
			...task,
			members,
		}

		const { data } = await updateTaskRequest({ data: editTask, id: taskId }, authToken)
		refetch().then((res) => {
			const { data: tasks } = res
			setActiveTeamTasks(tasks)
		})
		return data
	}

	// // Get the active task id and update active task data
	useEffect(() => {
		const active_taskId = activeTaskId || ""
		setActiveTask(teamTasks.find((ts) => ts.id === active_taskId) || null)
	}, [teamTasks])

	useEffect(() => {
		if (isSuccess) {
			setTeamTasks(allTasks)
			if (activeTaskId) {
				setActiveTeamTask(allTasks.find((ts) => ts.id === activeTaskId) || null)
			}
		}
	}, [activeTeamId, allTasks, isRefetching, isLoading])
	/**
	 * Change active task
	 */
	const setActiveTeamTask = useCallback((task: (typeof teamTasks)[0] | null) => {
		setActiveTaskId(task?.id || "")
		setActiveTask(task)
	}, [])

	const setActiveTeamTasks = useCallback((tasks: ITeamTask[]) => {
		const activeTeamTasks = getTasksByTeamState({ tasks, activeTeamId })
		setTeamTasks(activeTeamTasks)
	}, [])

	return {
		createNewTask,
		deleteTask,
		updateTask,
		setActiveTeamTask,
		onUnassignedTask,
		onAssignTask,
		teamTasks,
		isRefetching,
	}
}

interface IFilterTask {
	tasks: ITeamTask[]
	activeTeamId: string
}

export const getTasksByTeamState = (params: IFilterTask) => {
	if (!params.tasks) return []
	const data = params.tasks.filter((task) => {
		return task.teams.some((tm) => {
			return tm.id === params.activeTeamId
		})
	})

	return data
}
