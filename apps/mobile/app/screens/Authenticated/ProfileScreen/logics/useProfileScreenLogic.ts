import { FC, useCallback, useEffect, useMemo, useState } from "react"
import { useStores } from "../../../../models"
import { useAuthTeamTasks } from "../../../../services/hooks/features/useAuthTeamTasks"
import { useTeamTasks } from "../../../../services/hooks/features/useTeamTasks"
import { useOrganizationTeam } from "../../../../services/hooks/useOrganization"
import { ITaskStatus, ITeamTask } from "../../../../services/interfaces/ITask"

const useProfileScreenLogic = ({
	activeTabIndex,
	userId,
}: {
	activeTabIndex: number
	userId: string
}) => {
	const {
		TaskStore: {
			teamTasks,
			activeTask,
			setUnassignedTasks,
			unassignedTasks,
			assignedTasks,
			setAssignedTasks,
			filter,
		},
		teamStore: { activeTeam },
	} = useStores()
	const [selectedTabIndex, setSelectedTabIndex] = useState(0)
	const [showModal, setShowModal] = useState(false)
	const [isLoading, setIsLoading] = useState(true)
	const [allTasks, setAllTasks] = useState<ITeamTask[]>([])
	const [otherTasks, setOtherTasks] = useState<ITeamTask[]>([])
	const [showFilterPopup, setShowFilterPopup] = useState(false)
	const [showCreateTeamModal, setShowCreateTeamModal] = useState(false)
	const [assignListRefresh, setAssignListRefresh] = useState(false)
	const { members } = useOrganizationTeam()

	const member = useMemo(
		() =>
			members.find((m) => {
				return m.employee.userId === userId
			}),
		[userId],
	)

	const currentUser = useMemo(() => member?.employee.user, [member])

	const { onAssignTask, onUnassignedTask, createNewTask, isRefetching } = useTeamTasks()

	const handleAssignTask = async (taskId: string) => {
		const data = await onAssignTask({
			taskId,
			memberId: currentUser?.id,
		})
	}

	const handleUnassignTask = async (taskId: string) => {
		const data = await onUnassignedTask({
			taskId,
			memberId: currentUser?.id,
		})
	}

	const createAndAssign = useCallback(async (title: string) => {
		const { data: created } = await createNewTask(title)
		await handleAssignTask(created?.id)
	}, [])

	const loadAssignAndUnassign = () => {
		const assigntasks = allTasks.filter((task) => {
			return task.members.some((m) => m.userId === userId)
		})

		setAssignedTasks(assigntasks)

		const unassigntasks = allTasks.filter((task) => {
			return !task.members.some((m) => m.userId === userId)
		})
		setUnassignedTasks(unassigntasks)
		setAssignListRefresh(!assignListRefresh)
	}

	const countTasksByTab = useCallback(
		(tabIndex: number) => {
			const otherTasks = activeTask ? allTasks.filter((t) => t.id !== activeTask.id) : allTasks

			switch (tabIndex) {
				case 0:
					return otherTasks.length
				case 1:
					return assignedTasks.length
				case 2:
					return unassignedTasks.length
				default:
					return 0
			}
		},
		[teamTasks, activeTeam, allTasks],
	)

	const filterTasks = useCallback(() => {
		if (filter.apply) {
			const dataFilteredByStatus = teamTasks.filter((t) => {
				if (filter.statuses.length === 0) {
					return teamTasks
				}
				return filter.statuses.some((s) => s === t.status)
			})
			setAllTasks(dataFilteredByStatus)
		} else {
			setAllTasks(teamTasks)
		}
	}, [filter])

	useEffect(() => {
		filterTasks()
	}, [teamTasks, filter])

	useEffect(() => {
		const otherTasks = activeTask ? allTasks.filter((t) => t.id !== activeTask.id) : allTasks

		setOtherTasks(otherTasks)
		loadAssignAndUnassign()
	}, [allTasks, filter, isRefetching])

	useEffect(() => {
		setTimeout(() => {
			setIsLoading(false)
		}, 2000)
	}, [])

	return {
		handleAssignTask,
		handleUnassignTask,
		otherTasks,
		showModal,
		showFilterPopup,
		setShowFilterPopup,
		selectedTabIndex,
		setShowModal,
		currentUser,
		countTasksByTab,
		setSelectedTabIndex,
		member,
		showCreateTeamModal,
		setShowCreateTeamModal,
		assignedTasks,
		unassignedTasks,
		activeTask,
		assignListRefresh,
		createAndAssign,
		isLoading,
	}
}

export default useProfileScreenLogic
