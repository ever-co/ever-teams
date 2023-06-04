/* eslint-disable react-native/no-inline-styles */
import { Text, TouchableOpacity, Image, View, TextStyle, ViewStyle, Dimensions } from "react-native"
import React, { useState } from "react"
import { typography, useAppTheme } from "../../../../theme"
import { translate } from "../../../../i18n"
import { IUserProfile } from "../logics/useProfileScreenLogic"
import ProfileTabs from "./ProfileTabs"
import AssignTaskFormModal from "./AssignTaskSection"
import FilterPopup from "./FilterPopup"
import { ITaskFilter } from "../../../../services/hooks/features/useTaskFilters"

const TaskFilter = ({ profile, hook }: { profile: IUserProfile; hook: ITaskFilter }) => {
	const { colors, dark } = useAppTheme()
	const { isAuthUser } = profile
	const [showFilterPopup, setShowFilterPopup] = useState(false)
	const [showModal, setShowModal] = useState(false)
	return (
		<View>
			<AssignTaskFormModal
				visible={showModal}
				createNewTask={profile.onCreateNewTask}
				isAuthUser={isAuthUser}
				onDismiss={() => setShowModal(false)}
			/>
			<FilterPopup
				hook={hook}
				visible={showFilterPopup}
				onDismiss={() => setShowFilterPopup(false)}
			/>
			<View style={{ ...$wrapButtons, backgroundColor: colors.background }}>
				<TouchableOpacity
					onPress={() => setShowModal(true)}
					style={[
						$assignStyle,
						{
							backgroundColor: colors.background,
							borderColor: colors.secondary,
						},
					]}
				>
					<Text style={[$createTaskTitle, { color: colors.secondary }]}>
						{isAuthUser
							? translate("tasksScreen.createTaskButton")
							: translate("tasksScreen.assignTaskButton")}
					</Text>
				</TouchableOpacity>
				<TouchableOpacity
					style={{ ...$filterButton, borderColor: colors.border }}
					onPress={() => setShowFilterPopup(true)}
				>
					{dark ? (
						<Image source={require("../../../../../assets/icons/new/setting-dark.png")} />
					) : (
						<Image source={require("../../../../../assets/icons/new/setting-light.png")} />
					)}
					<Text style={{ ...$createTaskTitle, color: colors.primary, marginLeft: 10 }}>Filter</Text>
				</TouchableOpacity>
			</View>
			<ProfileTabs hook={hook} />
		</View>
	)
}

export default TaskFilter

const { width } = Dimensions.get("window")
const $wrapButtons: ViewStyle = {
	zIndex: 1000,
	paddingHorizontal: 20,
	paddingBottom: 30,
	flexDirection: "row",
	justifyContent: "space-between",
}

const $filterButton: ViewStyle = {
	flexDirection: "row",
	alignItems: "center",
	width: 149,
	borderWidth: 1,
	borderRadius: 10,
	paddingVertical: 12,
	paddingHorizontal: 24,
	justifyContent: "center",
}

const $assignStyle: ViewStyle = {
	borderColor: "#3826A6",
	borderWidth: 2,
	justifyContent: "center",
	alignItems: "center",
	paddingHorizontal: 20,
	paddingVertical: 5,
	width: width / 2.5,
	borderRadius: 8,
}

const $createTaskTitle: TextStyle = {
	fontSize: 14,
	fontFamily: typography.primary.semiBold,
}
