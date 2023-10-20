/* eslint-disable react-native/no-inline-styles */
/* eslint-disable react-native/no-color-literals */
/* eslint-disable react-native/no-unused-styles */
import React, { FC } from "react"
import { View, Text, StyleSheet, Image, FlatList } from "react-native"
import { IWorkspace } from "../../../services/interfaces/IAuthentication"
import { SvgXml } from "react-native-svg"
import { grayCircleIcon, greenCircleTickIcon } from "../../../components/svgs/icons"

interface IValid {
	step1: boolean
	step2: boolean
	step3: boolean
}
interface IUserTenants {
	data: IWorkspace
	index: number
	activeTeamId: string
	setActiveTeamId: (teamId: string) => void
	selectedWorkspace: number
	setSelectedWorkspace: React.Dispatch<React.SetStateAction<number>>
	isValid: IValid
	setIsValid: React.Dispatch<React.SetStateAction<IValid>>
	setTempAuthToken: (token: string) => void
}

const UserTenants: FC<IUserTenants> = ({
	data,
	index,
	activeTeamId,
	setActiveTeamId,
	setSelectedWorkspace,
	selectedWorkspace,
	isValid,
	setIsValid,
	setTempAuthToken,
}) => {
	return (
		<View style={styles.tenantContainer}>
			<View style={styles.tenantNameContainer}>
				<Text style={{ fontSize: 17 }}>{data.user.tenant.name}</Text>
				<View
					onTouchStart={() => {
						setSelectedWorkspace(index)
						selectedWorkspace !== index && setActiveTeamId(data.current_teams[0].team_id)
						data.current_teams.filter((team) => team.team_id === activeTeamId) &&
							setIsValid({ ...isValid, step3: true })
						setTempAuthToken(data.token)
					}}
				>
					{selectedWorkspace === index ? (
						<SvgXml xml={greenCircleTickIcon} />
					) : (
						<SvgXml xml={grayCircleIcon} />
					)}
				</View>
			</View>
			<View style={{ backgroundColor: "#E5E5E5", height: 1, width: "100%" }} />
			<View style={{ paddingHorizontal: 10, width: "95%", gap: 5 }}>
				<FlatList
					data={data.current_teams}
					renderItem={({ item }) => (
						<View style={styles.teamsContainer}>
							<View style={styles.teamInfoContainer}>
								<Image
									source={{ uri: item.team_logo }}
									style={{ width: 25, height: 25, borderRadius: 100 }}
								/>
								<Text style={{ fontSize: 18 }}>
									{item.team_name}({item.team_member_count})
								</Text>
							</View>
							<View
								onTouchStart={() => {
									setActiveTeamId(item.team_id)
									setSelectedWorkspace(index)
									setIsValid({ ...isValid, step3: true })
									setTempAuthToken(data.token)
								}}
							>
								{activeTeamId === item.team_id ? (
									<SvgXml xml={greenCircleTickIcon} />
								) : (
									<SvgXml xml={grayCircleIcon} />
								)}
							</View>
						</View>
					)}
					keyExtractor={(item, index) => index.toString()}
				/>
			</View>
		</View>
	)
}

export default UserTenants

const styles = StyleSheet.create({
	teamInfoContainer: {
		alignItems: "center",
		display: "flex",
		flexDirection: "row",
		gap: 10,
		justifyContent: "space-between",
	},
	teamsContainer: {
		alignItems: "center",
		display: "flex",
		flexDirection: "row",
		justifyContent: "space-between",
		marginVertical: 5,
		paddingBottom: 10,
		paddingTop: 17,
	},
	tenantContainer: {
		backgroundColor: "#FCFCFC",
		borderColor: "#0000001A",
		borderRadius: 12,
		borderWidth: 1,
		marginVertical: 8,
		padding: 12,
		width: "100%",
	},
	tenantNameContainer: {
		alignItems: "center",
		display: "flex",
		flexDirection: "row",
		justifyContent: "space-between",
		marginBottom: 22,
		marginTop: 10,
	},
})
