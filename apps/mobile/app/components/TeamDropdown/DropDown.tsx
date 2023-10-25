/* eslint-disable react-native/no-color-literals */
/* eslint-disable react-native/no-inline-styles */
import { observer } from "mobx-react-lite"
import React, { FC } from "react"
import { View, StyleSheet, TouchableOpacity, Text } from "react-native"
import { Avatar } from "react-native-paper"
import { AntDesign } from "@expo/vector-icons"
import { imgTitle } from "../../helpers/img-title"
import { useStores } from "../../models"
import { IOrganizationTeamList } from "../../services/interfaces/IOrganizationTeam"
import { typography, useAppTheme } from "../../theme"
import DropDownSection from "./DropDownSection"
import { limitTextCharaters } from "../../helpers/sub-text"

export interface Props {
	onCreateTeam: () => unknown
	resized: boolean
	isOpen: boolean
	setIsOpen: (value: boolean) => unknown
	isAccountVerified: boolean
	isDrawer: boolean
}

const DropDown: FC<Props> = observer(function CreateTeamModal({
	onCreateTeam,
	resized,
	setIsOpen,
	isOpen,
	isAccountVerified,
	isDrawer,
}) {
	const { colors } = useAppTheme()
	const {
		teamStore: { teams, setActiveTeam, activeTeam },
		TaskStore: { setActiveTask, setActiveTaskId },
	} = useStores()

	const changeActiveTeam = (newActiveTeam: IOrganizationTeamList) => {
		setActiveTeam(newActiveTeam)
		setActiveTask(null)
		setActiveTaskId("")
		setIsOpen(false)
	}

	return (
		<View style={styles.mainContainer}>
			<TouchableOpacity
				style={[
					styles.mainDropDown,
					{ backgroundColor: colors.background, borderColor: colors.border },
				]}
				activeOpacity={0.7}
				onPress={() => setIsOpen(!isOpen)}
			>
				<View style={{ flexDirection: "row", alignItems: "center" }}>
					{activeTeam?.image?.thumbUrl ||
					activeTeam?.logo ||
					activeTeam?.image?.fullUrl ? (
						<Avatar.Image
							style={styles.teamImage}
							size={40}
							source={{
								uri:
									activeTeam.image?.thumbUrl ||
									activeTeam.logo ||
									activeTeam.image?.fullUrl,
							}}
						/>
					) : (
						<Avatar.Text
							style={styles.teamImage}
							size={40}
							label={imgTitle(activeTeam?.name)}
							labelStyle={styles.prefix}
						/>
					)}

					<Text
						style={[styles.activeTeamTxt, { color: colors.primary }]}
					>{`${limitTextCharaters({
						text: activeTeam?.name,
						numChars: resized ? 9 : 30,
					})} (${activeTeam?.members.length})`}</Text>
				</View>

				{isOpen ? (
					<AntDesign name="up" size={24} color={colors.primary} />
				) : (
					<AntDesign name="down" size={24} color={colors.primary} />
				)}
			</TouchableOpacity>

			{isOpen && (
				<DropDownSection
					resized={resized}
					changeTeam={changeActiveTeam}
					teams={teams.items}
					onCreateTeam={onCreateTeam}
					isAccountVerified={isAccountVerified}
					isDrawer={isDrawer}
				/>
			)}
		</View>
	)
})

const styles = StyleSheet.create({
	activeTeamTxt: {
		fontFamily: typography.fonts.PlusJakartaSans.semiBold,
		fontSize: 14,
		fontWeight: "600",
		left: 12,
	},
	mainContainer: {
		alignItems: "center",
		flexDirection: "column",
		justifyContent: "center",
		width: "100%",
		zIndex: 999,
	},
	mainDropDown: {
		alignItems: "center",
		borderRadius: 10,
		borderWidth: 1,
		flexDirection: "row",
		height: 56,
		justifyContent: "space-between",
		paddingHorizontal: 10,
		paddingVertical: 10,
		width: "100%",
	},
	prefix: {
		fontFamily: typography.fonts.PlusJakartaSans.semiBold,
		fontSize: 14,
		fontWeight: "600",
	},
	teamImage: {
		backgroundColor: "#C1E0EA",
		elevation: 2,
		shadowColor: "#000",
		shadowOffset: {
			width: 0,
			height: 1.5,
		},
		shadowOpacity: 0.18,
		shadowRadius: 1.0,
	},
})

export default DropDown
