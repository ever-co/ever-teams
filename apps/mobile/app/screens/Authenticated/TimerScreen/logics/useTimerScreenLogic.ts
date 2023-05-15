import React, { useState } from "react"
import { useTeamTasks } from "../../../../services/hooks/features/useTeamTasks"
import { ITeamTask } from "../../../../services/interfaces/ITask"

const useTimerScreenLogic = () => {
	const [showCreateTeamModal, setShowCreateTeamModal] = React.useState(false)
	const [showCombo, setShowCombo] = useState(false)
	const [taskInputText, setTaskInputText] = useState<string>("")
	const [isLoading, setIsLoading] = useState<boolean>(false)
	const [showCheckIcon, setShowCheckIcon] = useState<boolean>(false)

	const { createNewTask, setActiveTeamTask } = useTeamTasks()

	const onCreateNewTask = async () => {
		if (taskInputText.trim().length === 0) {
			alert("Task title can't be empty")
			return
		}
		setShowCheckIcon(false)
		setIsLoading(true)
		await createNewTask(taskInputText)
		setIsLoading(false)
		setShowCombo(false)
	}

	const handleChangeText = (value: string) => {
		setTaskInputText(value)
		if (value.trim().length > 0) {
			setShowCombo(true)
			setShowCheckIcon(false)
		} else {
			setShowCombo(false)
		}

		if (value.trim().length >= 3) {
			setShowCheckIcon(true)
		}
	}

	const handleActiveTask = (value: ITeamTask) => {
		setActiveTeamTask(value)
		setShowCheckIcon(false)
		setTaskInputText(value.title)
		setShowCombo(false)
	}

	return {
		showCreateTeamModal,
		setShowCreateTeamModal,
		handleActiveTask,
		handleChangeText,
		onCreateNewTask,
		showCombo,
		taskInputText,
		showCheckIcon,
		setShowCombo,
		setShowCheckIcon,
		isLoading,
		setTaskInputText,
	}
}

export default useTimerScreenLogic
