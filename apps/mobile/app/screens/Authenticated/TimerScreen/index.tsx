/* eslint-disable react-native/no-inline-styles */
import React, { FC, useCallback, useEffect, useState } from "react"
import { ViewStyle, View, LogBox, TouchableWithoutFeedback } from "react-native"

// COMPONENTS
import { Screen } from "../../../components"
import { AuthenticatedTabScreenProps } from "../../../navigators/AuthenticatedNavigator"
import HomeHeader from "../../../components/HomeHeader"
import DropDown from "../../../components/TeamDropdown/DropDown"
import CreateTeamModal from "../../../components/CreateTeamModal"
import { observer } from "mobx-react-lite"
import TimerTaskSection from "./components/TimerTaskSection"
import { useOrganizationTeam } from "../../../services/hooks/useOrganization"
import useTimerScreenLogic from "./logics/useTimerScreenLogic"
import TimerScreenSkeleton from "./components/TimerScreenSkeleton"
import { useAppTheme } from "../../../theme"
import { useAcceptInviteModal } from "../../../services/hooks/features/useAcceptInviteModal"
import { useTaskInput } from "../../../services/hooks/features/useTaskInput"
import AcceptInviteModal from "../TeamScreen/components/AcceptInviteModal"
import NoTeam from "../../../components/NoTeam"
import { useStores } from "../../../models"

export const AuthenticatedTimerScreen: FC<AuthenticatedTabScreenProps<"Timer">> = observer(
	function AuthenticatedTimerScreen(_props) {
		// HOOKS
		const { createOrganizationTeam } = useOrganizationTeam()
		const {
			teamStore: { isTeamsExist },
		} = useStores()
		const { showCreateTeamModal, setShowCreateTeamModal, isTeamModalOpen, setIsTeamModalOpen } =
			useTimerScreenLogic()
		const [isLoading, setIsLoading] = useState<boolean>(true)

		LogBox.ignoreAllLogs()
		const { colors, dark } = useAppTheme()
		const { openModal, closeModal, activeInvitation, onRejectInvitation, onAcceptInvitation } =
			useAcceptInviteModal()
		const taskInput = useTaskInput()

		useEffect(() => {
			setTimeout(() => {
				setIsLoading(false)
			}, 2000)
		}, [])

		const onClickOutside = useCallback(() => {
			taskInput.setEditMode(false)
			setIsTeamModalOpen(false)
		}, [])

		return (
			<Screen
				preset="scroll"
				ScrollViewProps={{ bounces: false }}
				contentContainerStyle={[$container, { backgroundColor: colors.background2 }]}
				backgroundColor={dark ? "rgb(16,17,20)" : colors.background}
				safeAreaEdges={["top"]}
			>
				<TouchableWithoutFeedback onPress={() => onClickOutside()}>
					<View style={{ flex: 1 }}>
						{isLoading ? (
							<TimerScreenSkeleton showTaskDropdown={false} />
						) : (
							<>
								<AcceptInviteModal
									visible={openModal}
									onDismiss={() => closeModal()}
									invitation={activeInvitation}
									onAcceptInvitation={onAcceptInvitation}
									onRejectInvitation={onRejectInvitation}
								/>

								<CreateTeamModal
									onCreateTeam={createOrganizationTeam}
									visible={showCreateTeamModal}
									onDismiss={() => setShowCreateTeamModal(false)}
								/>
								<View style={{ zIndex: 1000 }}>
									<HomeHeader props={_props} showTimer={false} />
								</View>

								{isTeamsExist ? (
									<>
										<View style={{ padding: 20, zIndex: 999, backgroundColor: colors.background }}>
											<DropDown
												isOpen={isTeamModalOpen}
												setIsOpen={setIsTeamModalOpen}
												resized={false}
												onCreateTeam={() => setShowCreateTeamModal(true)}
											/>
										</View>

										<TimerTaskSection outsideClick={onClickOutside} taskInput={taskInput} />
									</>
								) : (
									<NoTeam onPress={() => setShowCreateTeamModal(true)} />
								)}
							</>
						)}
					</View>
				</TouchableWithoutFeedback>
			</Screen>
		)
	},
)

const $container: ViewStyle = {
	flex: 1,
}
