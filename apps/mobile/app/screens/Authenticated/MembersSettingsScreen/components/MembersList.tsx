/* eslint-disable camelcase */
/* eslint-disable react-native/no-inline-styles */
/* eslint-disable react-native/no-color-literals */
import { View, Text, FlatList, StyleSheet, TouchableOpacity, TextInput } from "react-native"
import React, { SetStateAction, useEffect, useState } from "react"
import { IOrganizationTeamList, OT_Member } from "../../../../services/interfaces/IOrganizationTeam"
import { Avatar } from "react-native-paper"
import { imgTitleProfileAvatar } from "../../../../helpers/img-title-profile-avatar"
import { typography, useAppTheme } from "../../../../theme"
import moment from "moment-timezone"
import { SvgXml } from "react-native-svg"
import { searchIconDark, searchIconLight } from "../../../../components/svgs/icons"

interface IMembersList {
	teamList: IOrganizationTeamList
	selectMode: boolean
	setSelectMode: React.Dispatch<SetStateAction<boolean>>
}

const MembersList: React.FC<IMembersList> = ({ teamList, selectMode, setSelectMode }) => {
	const [filteredMembersList, setFilteredMembersList] = useState<string>("")
	const [selectedMembers, setSelectedMembers] = useState<OT_Member[]>([])
	const { dark } = useAppTheme()

	const membersList = teamList?.members?.filter(
		(member) =>
			member?.employee?.fullName.toLowerCase().includes(filteredMembersList.toLowerCase()) ||
			member?.employee?.user?.email.toLowerCase().includes(filteredMembersList.toLowerCase()),
	)

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
			setSelectedMembers([...selectedMembers, member])
		}
		setSelectMode(true)
	}

	useEffect(() => {
		console.log("mode:", selectMode)
		console.log("members list:", selectedMembers)
	}, [selectedMembers, selectMode])

	return (
		<View style={styles.container}>
			<View style={styles.searchContainer}>
				<TextInput
					placeholder="Search members"
					value={filteredMembersList}
					onChangeText={(text) => setFilteredMembersList(text)}
					style={styles.textInput}
					placeholderTextColor={"black"}
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
					/>
				)}
				keyExtractor={(item, index) => index.toString()}
			/>
		</View>
	)
}

export default MembersList

interface IMemberCard {
	member: OT_Member
	addOrRemoveToSelectedList: (member: OT_Member) => void
	setSelectMembersMode: (member: OT_Member) => void
}

const MemberCard: React.FC<IMemberCard> = ({
	member,
	addOrRemoveToSelectedList,
	setSelectMembersMode,
}) => {
	const imageUrl =
		member?.employee?.user?.image?.thumbUrl ||
		member?.employee?.user?.image?.fullUrl ||
		member?.employee?.user?.imageUrl
	return (
		<TouchableOpacity
			onPress={() => addOrRemoveToSelectedList(member)}
			onLongPress={() => setSelectMembersMode(member)}
			style={styles.memberContainer}
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
					<Text style={{ fontSize: 16, fontWeight: "600" }}>
						{member?.employee?.fullName}
					</Text>
					<Text style={styles.grayedText}>{member?.employee?.user?.email}</Text>
				</View>
			</View>
			<View style={{ gap: 7, flexDirection: "column" }}>
				<View style={styles.roleContainer}>
					<Text style={styles.roleText}>Member</Text>
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
		paddingHorizontal: 15,
		paddingVertical: 4,
		width: 73,
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
