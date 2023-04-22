/* eslint-disable react-native/no-inline-styles */
import React, { FC, useState } from "react"
import { ScrollView, Text, TextStyle, View, ViewStyle } from "react-native"
import { typography } from "../../../../theme/typography"
import SingleInfo from "../components/SingleInfo"
import { translate } from "../../../../i18n"
import { useStores } from "../../../../models"
import { useOrganizationTeam } from "../../../../services/hooks/useOrganization"
import SwithTimeTracking from "../components/SwitchTimeTracking"
import { IPopup } from ".."
import { observer } from "mobx-react-lite"
import { useAppTheme } from "../../../../theme"
import TeamLogo from "./TeamLogo"
import TransferOwnership from "./TransferOwnership"

interface ITeamSettingProps {
	props: any
	onOpenBottomSheet: (sheet: IPopup, snapPoint: number) => unknown
}
const TeamSettings: FC<ITeamSettingProps> = observer(({ props, onOpenBottomSheet }) => {
	const { colors } = useAppTheme()
	const {
		teamStore: { activeTeam },
	} = useStores()
	const { isTeamManager } = useOrganizationTeam()

	const [open, setOpen] = useState(false)
	const { navigation } = props

	return (
		<View style={[$contentContainer, { backgroundColor: colors.background, opacity: 0.9 }]}>
			<TransferOwnership visible={open} onDismiss={() => setOpen(false)} />
			<ScrollView
				bounces={false}
				style={{ width: "90%", height: "100%" }}
				showsVerticalScrollIndicator={false}
			>
				<TeamLogo
					buttonLabel={translate("settingScreen.teamSection.changeLogo")}
					onChange={() => onOpenBottomSheet("Team Logo", 1)}
				/>
				<SingleInfo
					title={translate("settingScreen.teamSection.teamName")}
					value={activeTeam?.name}
					onPress={() => onOpenBottomSheet("Team Name", 4)}
				/>
				{isTeamManager ? <SwithTimeTracking /> : null}
				<SingleInfo
					title={translate("settingScreen.teamSection.taskStatuses")}
					value={"there are 4 active statuses"}
					onPress={() => navigation.navigate("TaskStatus")}
				/>
				<SingleInfo
					title={translate("settingScreen.teamSection.taskPriorities")}
					value={"there are 4 active priorities"}
					onPress={() => navigation.navigate("TaskPriority")}
				/>
				<SingleInfo
					title={translate("settingScreen.teamSection.taskSizes")}
					value={"there are 5 active sizes"}
					onPress={() => navigation.navigate("TaskSizeScreen")}
				/>
				<SingleInfo
					title={translate("settingScreen.teamSection.taskLabel")}
					value={"there are 8 active label"}
					onPress={() => navigation.navigate("TaskLabelScreen")}
				/>
				<SingleInfo title={translate("settingScreen.teamSection.teamRole")} value={"No"} />
				<SingleInfo
					title={translate("settingScreen.teamSection.workSchedule")}
					value={translate("settingScreen.teamSection.workScheduleHint")}
				/>

				<View style={$dangerZoneContainer}>
					<Text style={$dangerZoneTitle}>{translate("settingScreen.dangerZone")}</Text>
					<SingleInfo
						title={translate("settingScreen.teamSection.transferOwnership")}
						value={translate("settingScreen.teamSection.transferOwnership")}
						onPress={() => setOpen(true)}
					/>
					<SingleInfo
						title={translate("settingScreen.teamSection.removeTeam")}
						value={translate("settingScreen.teamSection.removeTeamHint")}
						onPress={() => onOpenBottomSheet("Remove Team", 5)}
					/>
					<SingleInfo
						title={translate("settingScreen.teamSection.quitTeam")}
						value={translate("settingScreen.teamSection.quitTeamHint")}
						onPress={() => onOpenBottomSheet("Quit Team", 5)}
					/>
				</View>
			</ScrollView>
		</View>
	)
})

export default TeamSettings

const $contentContainer: ViewStyle = {
	width: "100%",
	flex: 1,
	alignItems: "center",
}

const $dangerZoneContainer: ViewStyle = {
	borderTopColor: "rgba(0, 0, 0, 0.09)",
	borderTopWidth: 1,
	paddingTop: 32,
	marginTop: 32,
	marginBottom: 40,
}
const $dangerZoneTitle: TextStyle = {
	color: "#DA5E5E",
	fontSize: 20,
	fontFamily: typography.primary.semiBold,
}
