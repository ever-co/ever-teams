import React, { useEffect, useState } from "react"
import { useOrganizationTeam } from "../../../../services/hooks/useOrganization"

const useTimerScreenLogic = () => {
	const { members } = useOrganizationTeam()
	const [showCreateTeamModal, setShowCreateTeamModal] = React.useState(false)
	const [showCombo, setShowCombo] = useState(false)
	const [taskInputText, setTaskInputText] = useState<string>("")
	const [isLoading, setIsLoading] = useState<boolean>(false)
	const [showCheckIcon, setShowCheckIcon] = useState<boolean>(false)
	const [isTeamModalOpen, setIsTeamModalOpen] = useState<boolean>(false)

	useEffect(() => {
		if (members.length === 0) {
			setIsLoading(true)
		}
	}, [members])

	return {
		showCreateTeamModal,
		setShowCreateTeamModal,
		showCombo,
		taskInputText,
		showCheckIcon,
		setShowCombo,
		setShowCheckIcon,
		isTeamModalOpen,
		setIsTeamModalOpen,
		isLoading,
		setTaskInputText,
	}
}

export default useTimerScreenLogic
