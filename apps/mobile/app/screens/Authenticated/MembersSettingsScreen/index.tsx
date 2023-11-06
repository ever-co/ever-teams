/* eslint-disable camelcase */
import { View, Text, ViewStyle, TouchableOpacity, StyleSheet } from "react-native"
import React, { FC, useEffect, useState } from "react"
import { AuthenticatedDrawerScreenProps } from "../../../navigators/AuthenticatedNavigator"
import { Screen } from "../../../components"
import { typography, useAppTheme } from "../../../theme"
import { AntDesign, Feather } from "@expo/vector-icons"
import { translate } from "../../../i18n"
import { useStores } from "../../../models"
import MembersList from "./components/MembersList"
import { OT_Member } from "../../../services/interfaces/IOrganizationTeam"
import { SvgXml } from "react-native-svg"
import { moreButtonDark, moreButtonLight } from "../../../components/svgs/icons"

export const MembersSettingsScreen: FC<AuthenticatedDrawerScreenProps<"MembersSettingsScreen">> = (
	_props,
) => {
	const { colors, dark } = useAppTheme()
	const { navigation } = _props

	const {
		teamStore: { activeTeam },
	} = useStores()

	const [selectMode, setSelectMode] = useState<boolean>(false)
	const [selectedMembers, setSelectedMembers] = useState<OT_Member[]>([])

	const addOrRemoveToSelectedList = (member: OT_Member): void => {
		if (selectMode) {
			if (!selectedMembers.includes(member)) {
				setSelectedMembers([...selectedMembers, member])
			} else {
				const updatedSelectedMembers = selectedMembers.filter(
					(selectedMember) => selectedMember.id !== member.id,
				)
				setSelectedMembers(updatedSelectedMembers)
				if (selectedMembers.length === 1) {
					setSelectMode(false)
				}
			}
		}
	}

	const setSelectMembersMode = (member: OT_Member): void => {
		if (!selectedMembers.some((selectedMember) => selectedMember.id === member.id)) {
			const updatedSelectedMembers = [...selectedMembers, member]
			setSelectedMembers(updatedSelectedMembers)
		}
		setSelectMode(true)
	}

	// const fall = new Animated.Value(1)

	useEffect(() => {
		console.log("mode:", selectMode)
		console.log("members list:", selectedMembers)
	}, [selectedMembers, selectMode])

	return (
		<Screen
			contentContainerStyle={[$container, { backgroundColor: colors.background }]}
			safeAreaEdges={["top"]}
		>
			<View style={[$headerContainer, { backgroundColor: colors.background }]}>
				<View style={[styles.container, { backgroundColor: colors.background }]}>
					<TouchableOpacity onPress={() => navigation.navigate("Setting")}>
						<AntDesign name="arrowleft" size={24} color={colors.primary} />
					</TouchableOpacity>
					<Text style={[styles.title, { color: colors.primary }]}>
						{translate("settingScreen.membersSettingsScreen.mainTitle")}
					</Text>
					<TouchableOpacity>
						{selectMode ? (
							<SvgXml xml={dark ? moreButtonDark : moreButtonLight} />
						) : (
							<Feather name="plus" size={24} color="black" />
						)}
					</TouchableOpacity>
				</View>
			</View>
			<MembersList
				teamList={activeTeam}
				selectMode={selectMode}
				selectedMembers={selectedMembers}
				setSelectMembersMode={setSelectMembersMode}
				addOrRemoveToSelectedList={addOrRemoveToSelectedList}
			/>
		</Screen>
	)
}

const $container: ViewStyle = {
	flex: 1,
}

const $headerContainer: ViewStyle = {
	padding: 20,

	paddingVertical: 16,
	shadowColor: "rgba(0, 0, 0, 0.6)",
	shadowOffset: {
		width: 0,
		height: 5,
	},
	shadowOpacity: 0.07,
	shadowRadius: 10,
	elevation: 1,
	zIndex: 10,
}

const styles = StyleSheet.create({
	container: {
		alignItems: "center",
		flexDirection: "row",
		justifyContent: "space-between",
		width: "100%",
	},

	title: {
		alignSelf: "center",
		fontFamily: typography.primary.semiBold,
		fontSize: 16,
		textAlign: "center",
		width: "80%",
	},
})
