/* eslint-disable camelcase */
/* eslint-disable react-native/no-inline-styles */
/* eslint-disable react-native/no-color-literals */
import { View, Text, FlatList, StyleSheet, TouchableOpacity, TextInput } from "react-native"
import React, { SetStateAction, useCallback, useMemo, useState } from "react"
import { IOrganizationTeamList, OT_Member } from "../../../../services/interfaces/IOrganizationTeam"
import { Avatar } from "react-native-paper"
import { imgTitleProfileAvatar } from "../../../../helpers/img-title-profile-avatar"
import { typography, useAppTheme, useWebTheme } from "../../../../theme"
import { inputLookOf } from "../../../../../src/theme/form-look"
import moment from "moment-timezone"
import { SvgXml } from "react-native-svg"
import { searchIconDark, searchIconLight } from "../../../../components/svgs/icons"
import { useSettings } from "../../../../services/hooks/features/use-settings"
import { limitTextCharaters } from "../../../../helpers/sub-text"
import { translate } from "../../../../i18n"
import LabelItem from "../../../../components/label-item"
import { memberRowLookOf } from "../../../../../src/theme/member-row-look"

interface IMembersList {
	teamList: IOrganizationTeamList
	selectedMembers: OT_Member[]
	selectMode: boolean
	setSelectMembersMode: (member: OT_Member) => void
	addOrRemoveToSelectedList: (member: OT_Member) => void
	isNameEditMode: boolean
	setIsNameEditMode: React.Dispatch<SetStateAction<boolean>>
}

// The role names are the API's: the two the team uses read in the person's language, any other as the API names it
function roleLabel(name: string | undefined): string {
	if (!name || name.toUpperCase() === "MEMBER") {
		return translate("common.member")
	}
	if (name.toUpperCase() === "MANAGER") {
		return translate("common.manager")
	}
	return name
}

function footerLabel(selectMode: boolean): string {
	if (selectMode) {
		return translate("settingScreen.membersSettingsScreen.selected")
	}
	return translate("settingScreen.membersSettingsScreen.totalMembers")
}

const MembersList: React.FC<IMembersList> = ({
	teamList,
	selectedMembers,
	addOrRemoveToSelectedList,
	setSelectMembersMode,
	selectMode,
	isNameEditMode,
	setIsNameEditMode,
}) => {
	const [filteredMembersList, setFilteredMembersList] = useState<string>("")
	// const [selectedMembers, setSelectedMembers] = useState<OT_Member[]>([])

	const { dark, colors } = useAppTheme()
	const webTheme = useWebTheme()
	const input = inputLookOf(webTheme)

	const membersList = teamList?.members?.filter(
		(member) =>
			member?.employee?.fullName.toLowerCase().includes(filteredMembersList.toLowerCase()) ||
			member?.employee?.user?.email.toLowerCase().includes(filteredMembersList.toLowerCase()),
	)

	return (
		<View style={styles.container}>
			<View
				style={[
					styles.searchContainer,
					{ borderColor: input.field.borderColor },
				]}
			>
				<TextInput
					placeholder={translate("settingScreen.membersSettingsScreen.searchPlaceholder")}
					value={filteredMembersList}
					onChangeText={(text) => setFilteredMembersList(text)}
					style={[styles.textInput, { color: input.field.color }]}
					placeholderTextColor={input.placeholderColor}
				/>
				<SvgXml xml={dark ? searchIconDark : searchIconLight} style={styles.searchIcon} />
			</View>

			<FlatList
				bounces={false}
				data={membersList}
				renderItem={({ item }) => (
					<MemberCard
						member={item}
						addOrRemoveToSelectedList={addOrRemoveToSelectedList}
						setSelectMembersMode={setSelectMembersMode}
						selectedMembers={selectedMembers}
						isNameEditMode={isNameEditMode}
						setIsNameEditMode={setIsNameEditMode}
					/>
				)}
				keyExtractor={(item, index) => index.toString()}
			/>
			<View style={[styles.footerContainer, { backgroundColor: colors.background }]}>
				<Text style={{ fontSize: 14, fontWeight: "400", color: webTheme.colors.foreground }}>
					{footerLabel(selectMode)}
				</Text>
				<Text style={{ fontSize: 14, fontWeight: "400", color: webTheme.colors.foreground }}>
					{selectMode ? selectedMembers?.length : teamList?.members.length}
				</Text>
			</View>
		</View>
	)
}

export default MembersList

interface IMemberCard {
	member: OT_Member
	addOrRemoveToSelectedList: (member: OT_Member) => void
	setSelectMembersMode: (member: OT_Member) => void
	selectedMembers: OT_Member[]
	isNameEditMode: boolean
	setIsNameEditMode: React.Dispatch<SetStateAction<boolean>>
}

const MemberCard: React.FC<IMemberCard> = ({
	member,
	addOrRemoveToSelectedList,
	setSelectMembersMode,
	selectedMembers,
	isNameEditMode,
	setIsNameEditMode,
}) => {
	const { updateUserInfo } = useSettings()
	const [newName, setNewName] = useState<string>(member?.employee?.fullName)

	const updateUserName = useCallback(
		async (member: OT_Member): Promise<void> => {
			if (newName === member?.employee?.fullName) return

			const firstNameIndex = newName?.indexOf(" ")
			const formattedFirstName = newName?.substring(0, firstNameIndex)
			const formattedLastName = newName?.substring(firstNameIndex)

			await updateUserInfo({
				...member?.employee?.user,
				firstName: formattedFirstName,
				lastName: formattedLastName,
			})
			setIsNameEditMode(false)
		},
		[updateUserInfo, newName],
	)

	const imageUrl =
		member?.employee?.user?.image?.thumbUrl ||
		member?.employee?.user?.image?.fullUrl ||
		member?.employee?.user?.imageUrl

	const webTheme = useWebTheme()
	const secondaryText = [styles.grayedText, { color: webTheme.colors["muted-foreground"] }]

	const isSelected = useMemo(
		() => selectedMembers.some((selected) => selected.id === member.id),
		[selectedMembers, member],
	)
	return (
		<TouchableOpacity
			onPress={() => {
				addOrRemoveToSelectedList(member)
				isNameEditMode && updateUserName(member)
				setIsNameEditMode(false)
			}}
			onLongPress={() => {
				setSelectMembersMode(member)
			}}
			style={[styles.memberContainer, memberRowLookOf(isSelected, webTheme)]}
		>
			<View style={styles.identity}>
				{imageUrl ? (
					<Avatar.Image size={36} source={{ uri: imageUrl }} />
				) : (
					<Avatar.Text
						size={36}
						label={imgTitleProfileAvatar(member?.employee?.user?.name)}
						labelStyle={styles.prefix}
					/>
				)}
				<View style={styles.identityText}>
					{isNameEditMode && isSelected ? (
						<TextInput
							value={newName}
							onChangeText={(text) => setNewName(text)}
							style={{ fontSize: 16, color: webTheme.colors.foreground, width: 180 }}
							autoFocus={isNameEditMode}
						/>
					) : (
						<Text style={{ fontSize: 16, fontWeight: "600", color: webTheme.colors.foreground }}>
							{limitTextCharaters({ text: member?.employee?.fullName, numChars: 24 })}
						</Text>
					)}

					<Text style={secondaryText} numberOfLines={1}>
						{member?.employee?.user?.email}
					</Text>
				</View>
			</View>
			<View style={{ gap: 7, flexDirection: "column" }}>
				<View style={styles.role}>
					<LabelItem label={roleLabel(member?.role?.name)} background="" icon={undefined} />
				</View>
				<Text style={secondaryText}>
					{moment(member?.employee?.createdAt).format("DD MMM YYYY hh:mm a")}
				</Text>
			</View>
		</TouchableOpacity>
	)
}

const styles = StyleSheet.create({
	container: { height: "88%", paddingTop: 10, width: "100%" },
	footerContainer: {
		elevation: -1,
		flexDirection: "row",
		justifyContent: "space-between",
		paddingHorizontal: 24,
		paddingTop: 10,
		shadowColor: "rgba(0, 0, 0, 0.6)",
		shadowOffset: {
			width: 0,
			height: -5,
		},
		shadowOpacity: 0.07,
		shadowRadius: 10,
	},
	grayedText: { fontSize: 12 },
	// a long name or address shrinks with an ellipsis, so the role and the day stay on screen
	identity: { alignItems: "center", flexDirection: "row", flexShrink: 1, gap: 12 },
	identityText: { flexShrink: 1, gap: 6 },
	// the row's own inset plus its margin keep the content 24 from the screen's edge, where it was
	memberContainer: {
		flexDirection: "row",
		gap: 12,
		justifyContent: "space-between",
		marginHorizontal: 12,
		marginVertical: 2,
		paddingHorizontal: 12,
		paddingVertical: 14,
	},
	prefix: {
		fontFamily: typography.fonts.PlusJakartaSans.light,
		fontSize: 22,
	},
	role: { alignSelf: "flex-end" },
	searchContainer: {
		borderColor: "#0000001A",
		borderRadius: 8,
		borderWidth: 1,
		marginHorizontal: 24,
		marginVertical: 10,
		position: "relative",
	},
	searchIcon: { left: 20, position: "absolute", top: 11 },
	textInput: {
		fontSize: 12,
		paddingHorizontal: 50,
		paddingVertical: 12,
		width: "100%",
	},
})
