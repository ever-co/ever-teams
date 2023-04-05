import React, { FC, useEffect, useState } from "react"
import { ViewStyle, View, TouchableOpacity, LogBox } from "react-native"

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

export const AuthenticatedTimerScreen: FC<AuthenticatedTabScreenProps<"Timer">> = observer(
	function AuthenticatedTimerScreen(_props) {
		// HOOKS
		const { createOrganizationTeam } = useOrganizationTeam()
		const { showCreateTeamModal, setShowCreateTeamModal } = useTimerScreenLogic()
		const [isLoading, setIsLoading] = useState<boolean>(true)

		LogBox.ignoreAllLogs()
		const { colors, dark } = useAppTheme()

		useEffect(() => {
			setTimeout(() => {
				setIsLoading(false)
			}, 2000)
		}, [])

		return (
			<Screen
				preset="scroll"
				ScrollViewProps={{ bounces: false }}
				contentContainerStyle={[$container, { backgroundColor: colors.background2 }]}
				backgroundColor={dark ? "rgb(16,17,20)" : colors.background}
				safeAreaEdges={["top"]}
			>
				{isLoading ? (
					<TimerScreenSkeleton showTaskDropdown={false} />
				) : (
					<>
						<View>
							<CreateTeamModal
								onCreateTeam={createOrganizationTeam}
								visible={showCreateTeamModal}
								onDismiss={() => setShowCreateTeamModal(false)}
							/>
							<View style={{ zIndex: 1000 }}>
								<HomeHeader props={_props} showTimer={false} />
							</View>
							<View style={{ padding: 20, zIndex: 999, backgroundColor: colors.background }}>
								<DropDown resized={false} onCreateTeam={() => setShowCreateTeamModal(true)} />
							</View>
							<TimerTaskSection />
						</View>
					</>
				)}
			</Screen>
		)
	},
)

const $container: ViewStyle = {
	flex: 1,
}
