/* eslint-disable camelcase */
/* eslint-disable react-native/no-inline-styles */
/* eslint-disable react-native/no-color-literals */
import { View, Text, ViewStyle, TouchableOpacity, StyleSheet } from "react-native"
import React, { FC, SetStateAction, useState } from "react"
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
import { GLOBAL_STYLE as GS } from "../../../../assets/ts/styles"
import ChangeRoleModal from "./components/ChangeRoleModal"
import ConfirmationModal from "../../../components/ConfirmationModal"
import { useOrganizationTeam } from "../../../services/hooks/useOrganization"

export const MembersSettingsScreen: FC<AuthenticatedDrawerScreenProps<"MembersSettingsScreen">> = (
	_props,
) => {
	const { colors, dark } = useAppTheme()
	const { navigation } = _props
	const { isTeamManager } = useOrganizationTeam()

	const {
		teamStore: { activeTeam },
	} = useStores()

	const [selectMode, setSelectMode] = useState<boolean>(false)
	const [showDropdownMenu, setShowDropdownMenu] = useState<boolean>(false)
	const [selectedMembers, setSelectedMembers] = useState<OT_Member[]>([])

	const addOrRemoveToSelectedList = (member: OT_Member): void => {
		if (selectMode) {
			if (!selectedMembers.some((selected) => selected.id === member.id)) {
				setSelectedMembers([...selectedMembers, member])
			} else {
				const updatedSelectedMembers = selectedMembers.filter(
					(selectedMember) => selectedMember.id !== member.id,
				)
				setSelectedMembers(updatedSelectedMembers)
				if (selectedMembers.length === 1) {
					setSelectMode(false)
					setShowDropdownMenu(false)
				}
			}
		}
	}

	const setSelectMembersMode = (member: OT_Member): void => {
		if (!isTeamManager) return
		if (!selectMode) {
			setSelectMode(true)
		}
		if (!selectedMembers.some((selectedMember) => selectedMember.id === member.id)) {
			const updatedSelectedMembers = [...selectedMembers, member]
			setSelectedMembers(updatedSelectedMembers)
		}
		setSelectMode(true)
	}

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
					<View style={{ position: "relative" }}>
						<TouchableOpacity
							onPress={() => selectMode && setShowDropdownMenu(!showDropdownMenu)}
						>
							{selectMode ? (
								showDropdownMenu ? (
									<AntDesign name="close" size={24} color={colors.primary} />
								) : (
									<SvgXml xml={dark ? moreButtonDark : moreButtonLight} />
								)
							) : (
								<Feather name="plus" size={24} color={colors.primary} />
							)}
						</TouchableOpacity>
						<MenuDropdown
							showDropdownMenu={showDropdownMenu && selectMode}
							setShowDropdownMenu={setShowDropdownMenu}
							selectedMembers={selectedMembers}
						/>
					</View>
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

interface IMenuDropdown {
	showDropdownMenu: boolean
	setShowDropdownMenu: React.Dispatch<SetStateAction<boolean>>
	selectedMembers: OT_Member[]
}

const MenuDropdown: React.FC<IMenuDropdown> = ({
	showDropdownMenu,
	setShowDropdownMenu,
	selectedMembers,
}) => {
	const [showRoleModal, setShowRoleModal] = useState<boolean>(false)
	const [showDeleteConfirmation, setShowDeleteConfirmation] = useState<boolean>(false)

	const { colors } = useAppTheme()

	return showDropdownMenu ? (
		<>
			<ChangeRoleModal
				member={selectedMembers[0]}
				visible={showRoleModal}
				onDismiss={() => {
					setShowRoleModal(false)
					setTimeout(() => setShowDropdownMenu(false), 300)
				}}
			/>
			<ConfirmationModal
				visible={showDeleteConfirmation}
				onDismiss={() => {
					setShowDeleteConfirmation(false)
					setTimeout(() => setShowDropdownMenu(false), 300)
				}}
				onConfirm={() => {
					setShowDeleteConfirmation(false)
					setShowDropdownMenu(false)
				}}
				confirmationText="Are you sure you want to remove selected user?"
			/>
			<View
				style={[
					styles.dropdownContainer,
					{
						...GS.shadowLg,
						backgroundColor: colors.background,
					},
				]}
			>
				{selectedMembers.length === 1 && (
					<TouchableOpacity
						onPress={() => {
							setShowRoleModal(true)
						}}
					>
						<Text style={{ fontSize: 12, color: colors.primary }}>Change Role</Text>
					</TouchableOpacity>
				)}

				<TouchableOpacity
					onPress={() => {
						setShowDeleteConfirmation(true)
					}}
				>
					<Text style={{ fontSize: 12, color: "#DA5E5E" }}>Delete</Text>
				</TouchableOpacity>
			</View>
		</>
	) : (
		<></>
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
	dropdownContainer: {
		borderRadius: 14,
		flexDirection: "column",
		gap: 8,
		padding: 10,
		position: "absolute",
		right: 20,
		shadowColor: "rgba(0, 0, 0, 0.52)",
		top: 6,
		width: 100,
	},

	title: {
		alignSelf: "center",
		fontFamily: typography.primary.semiBold,
		fontSize: 16,
		textAlign: "center",
		width: "80%",
	},
})
