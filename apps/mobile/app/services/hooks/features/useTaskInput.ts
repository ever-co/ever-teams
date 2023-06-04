/* eslint-disable camelcase */
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ITeamTask } from "../../interfaces/ITask"
import { useTeamTasks } from "./useTeamTasks"
import useAuthenticateUser from "./useAuthentificateUser"
import { useSyncRef } from "../useSyncRef"
import { Nullable } from "../../interfaces/hooks"
import { useModal } from "../useModal"
import { useStores } from "../../../models"

export const h_filter = (status: string, filters: "closed" | "open") => {
	switch (filters) {
		case "open":
			return status !== "closed"
		case "closed":
			return status === "closed"
		default:
			return true
	}
}

/**
 * It returns a bunch of variables and functions that are used to manage the task input
 * @param [task] - The task to be edited. If not provided, the active task will be used.
 * @param {boolean} [initEditMode] - boolean
 * @returns An object with the following properties:
 */
export function useTaskInput({
	task,
	initEditMode,
	tasks: customTasks,
}: {
	tasks?: ITeamTask[]
	task?: Nullable<ITeamTask>
	initEditMode?: boolean
} = {}) {
	const {
		teamStore: { activeTeam },
	} = useStores()
	const { isOpen: isModalOpen, openModal, closeModal } = useModal()
	const [closeableTask, setCloseableTaskTask] = useState<ITeamTask | null>(null)

	const {
		teamTasks,
		createNewTask,
		activeTask,
		createLoading,
		tasksFetching,
		updateTask,
		setActiveTeamTask,
	} = useTeamTasks()

	const { user } = useAuthenticateUser()
	const userRef = useSyncRef(user)

	const taskIssue = useRef<null | string>(null)

	const tasks = customTasks || (teamTasks as ITeamTask[])

	/**
	 * If task has null value then consider it as value 😄
	 */
	const inputTask = task !== undefined ? task : activeTask

	const [filter, setFilter] = useState<"closed" | "open">("open")
	const [editMode, setEditMode] = useState(initEditMode || false)

	const handleOpenModal = useCallback(
		(concernedTask: ITeamTask) => {
			setCloseableTaskTask(concernedTask)
			openModal()
		},
		[setCloseableTaskTask],
	)

	const handleReopenTask = useCallback(
		async (concernedTask: ITeamTask) => {
			return updateTask(
				{
					...concernedTask,
					status: "open",
				},
				concernedTask.id,
			)
		},
		[updateTask],
	)

	const [query, setQuery] = useState("")

	const filteredTasks = useMemo(() => {
		return query.trim() === ""
			? tasks.filter((task) => h_filter(task.status, filter))
			: tasks.filter(
					(task) =>
						task.title
							.trim()
							.toLowerCase()
							.replace(/\s+/g, "")
							.startsWith(query.toLowerCase().replace(/\s+/g, "")) && h_filter(task.status, filter),
			  )
	}, [query, filter, editMode, activeTeam])

	const filteredTasks2 = useMemo(() => {
		return query.trim() === ""
			? tasks
			: tasks.filter((task) => {
					return task.title
						.trim()
						.toLowerCase()
						.replace(/\s+/g, "")
						.startsWith(query.toLowerCase().replace(/\s+/g, ""))
			  })
	}, [query])

	const hasCreateForm = filteredTasks2.length === 0 && query !== ""

	const handleTaskCreation = ({
		autoAssignTaskAuth = true,
		assignToUsers = [],
	}: {
		autoActiveTask?: boolean
		autoAssignTaskAuth?: boolean
		assignToUsers?: {
			id: string
		}[]
	} = {}) => {
		if (
			query.trim().length < 2 ||
			inputTask?.title === query.trim() ||
			!userRef.current?.isEmailVerified
		)
			return null

		setEditMode(false)
		return createNewTask(
			{
				taskName: query.trim(),
				issueType: taskIssue.current || undefined,
			},
			!autoAssignTaskAuth ? assignToUsers : undefined,
		)
	}

	const updateTaskTitleHandler = useCallback((itask: ITeamTask, title: string) => {
		if (!userRef.current?.isEmailVerified) return null

		return updateTask(
			{
				...itask,
				title,
			},
			itask.id,
		)
	}, [])

	const closedTaskCount = filteredTasks2.filter((f_task) => {
		return f_task.status === "closed"
	}).length

	const openTaskCount = filteredTasks2.filter((f_task) => {
		return f_task.status !== "closed"
	}).length

	useEffect(() => {
		taskIssue.current = null
	}, [hasCreateForm])

	return {
		closedTaskCount,
		openTaskCount,
		hasCreateForm,
		handleTaskCreation,
		filteredTasks,
		handleReopenTask,
		handleOpenModal,
		activeTask,
		createLoading,
		tasksFetching,
		setFilter,
		closeModal,
		isModalOpen,
		closeableTask,
		editMode,
		setEditMode,
		inputTask,
		setQuery,
		filter,
		updateTaskTitleHandler,
		taskIssue,
		user,
		userRef,
		setActiveTeamTask,
	}
}

export type RTuseTaskInput = ReturnType<typeof useTaskInput>
