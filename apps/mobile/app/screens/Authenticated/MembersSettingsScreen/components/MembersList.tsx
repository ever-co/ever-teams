/* eslint-disable camelcase */
/* eslint-disable react-native/no-inline-styles */
/* eslint-disable react-native/no-color-literals */
import { View, Text, FlatList, StyleSheet, TouchableOpacity, TextInput } from "react-native"
import React, { SetStateAction, useCallback, useMemo, useState } from "react"
import { IOrganizationTeamList, OT_Member } from "../../../../services/interfaces/IOrganizationTeam"
import { Avatar } from "react-native-paper"
import { imgTitleProfileAvatar } from "../../../../helpers/img-title-profile-avatar"
import { typography, useAppTheme } from "../../../../theme"
import moment from "moment-timezone"
import { SvgXml } from "react-native-svg"
import { searchIconDark, searchIconLight } from "../../../../components/svgs/icons"
import { useSettings } from "../../../../services/hooks/features/useSettings"
import { limitTextCharaters } from "../../../../helpers/sub-text"

interface IMembersList {
	teamList: IOrganizationTeamList
	selectedMembers: OT_Member[]
	selectMode: boolean
	setSelectMembersMode: (member: OT_Member) => void
	addOrRemoveToSelectedList: (member: OT_Member) => void
	isNameEditMode: boolean
	setIsNameEditMode: React.Dispatch<SetStateAction<boolean>>
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
					{ borderColor: dark ? colors.border : "#0000001A" },
				]}
			>
				<TextInput
					placeholder="Search members"
					value={filteredMembersList}
					onChangeText={(text) => setFilteredMembersList(text)}
					style={[styles.textInput, { color: colors.primary }]}
					placeholderTextColor={colors.primary}
				/>
				<SvgXml xml={dark ? searchIconDark : searchIconLight} style={styles.searchIcon} />
			</View>

			<FlatList
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
				<Text style={{ fontSize: 14, fontWeight: "400", color: colors.primary }}>
					{selectMode ? "Selected:" : "Total members:"}
				</Text>
				<Text style={{ fontSize: 14, fontWeight: "400", color: colors.primary }}>
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

	const { colors, dark } = useAppTheme()

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
			style={[
				styles.memberContainer,
				{
					backgroundColor: isSelected
						? dark
							? colors.border
							: "#F4F4F4"
						: "transparent",
				},
			]}
		>
			<View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
				{imageUrl ? (
					<Avatar.Image size={36} source={{ uri: imageUrl }} />
				) : (
					<Avatar.Text
						size={36}
						label={imgTitleProfileAvatar(member?.employee?.user?.name)}
						labelStyle={styles.prefix}
					/>
				)}
				<View style={{ gap: 6 }}>
					{isNameEditMode && isSelected ? (
						<TextInput
							value={newName}
							onChangeText={(text) => setNewName(text)}
							style={{ fontSize: 16, color: colors.primary, width: 180 }}
							autoFocus={isNameEditMode}
						/>
					) : (
						<Text style={{ fontSize: 16, fontWeight: "600", color: colors.primary }}>
							{limitTextCharaters({ text: member?.employee?.fullName, numChars: 24 })}
						</Text>
					)}

					<Text style={styles.grayedText}>{member?.employee?.user?.email}</Text>
				</View>
			</View>
			<View style={{ gap: 7, flexDirection: "column" }}>
				<View style={styles.roleContainer}>
					<Text style={styles.roleText}>
						{member?.role?.name ? member?.role?.name : "Member"}
					</Text>
				</View>
				<Text style={styles.grayedText}>
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
	grayedText: { color: "#938FA4", fontSize: 12 },
	memberContainer: {
		flexDirection: "row",
		justifyContent: "space-between",
		paddingHorizontal: 24,
		paddingVertical: 14,
		width: "100%",
	},
	prefix: {
		fontFamily: typography.fonts.PlusJakartaSans.light,
		fontSize: 22,
	},
	roleContainer: {
		backgroundColor: "#D4EFDF",
		borderRadius: 80,
		marginLeft: "auto",
		minWidth: 73,
		paddingHorizontal: 15,
		paddingVertical: 4,
	},
	roleText: { color: "#77846D", fontSize: 10, fontWeight: "700" },
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
