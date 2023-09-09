/* eslint-disable react-native/no-inline-styles */
/* eslint-disable react-native/no-color-literals */
import React, { FC } from "react"
import { View, Text, StyleSheet, Image } from "react-native"
import { IWorkspace } from "../../../services/interfaces/IAuthentication"
import { SvgXml } from "react-native-svg"
import { grayCircleIcon, greenCircleTickIcon } from "../../../components/svgs/icons"

interface IUserTenants {
	data: IWorkspace
	index: number
	activeTeamId: string
	setActiveTeamId: (teamId: string) => void
	selectedWorkspace: number
	setSelectedWorkspace: React.Dispatch<React.SetStateAction<number>>
}

const UserTenants: FC<IUserTenants> = ({
	data,
	index,
	activeTeamId,
	setActiveTeamId,
	setSelectedWorkspace,
	selectedWorkspace,
}) => {
	return (
		<View style={styles.tenantContainer}>
			<View
				style={{
					display: "flex",
					flexDirection: "row",
					justifyContent: "space-between",
					alignItems: "center",
					marginBottom: 10,
				}}
			>
				<Text style={{ fontSize: 17 }}>{data.user.tenant.name}</Text>
				<View
					onTouchStart={() => {
						setSelectedWorkspace(index)
						activeTeamId &&
							selectedWorkspace !== index &&
							setActiveTeamId(data.current_teams[0].team_id)
					}}
				>
					{selectedWorkspace === index ? (
						<SvgXml xml={greenCircleTickIcon} />
					) : (
						<SvgXml xml={grayCircleIcon} />
					)}
				</View>
			</View>
			<View style={{ paddingHorizontal: 10, width: "95%", gap: 5 }}>
				{data.current_teams.map((team, i) => (
					<View
						key={i}
						style={{
							display: "flex",
							flexDirection: "row",
							justifyContent: "space-between",
							alignItems: "center",
							marginVertical: 5,
						}}
					>
						<View
							style={{
								display: "flex",
								flexDirection: "row",
								justifyContent: "space-between",
								alignItems: "center",
								gap: 10,
							}}
						>
							<Image
								source={{ uri: team.team_logo }}
								style={{ width: 25, height: 25, borderRadius: 100 }}
							/>
							<Text style={{ fontSize: 18 }}>{team.team_name}</Text>
						</View>
						<View
							onTouchStart={() => {
								setActiveTeamId(team.team_id)
								setSelectedWorkspace(index)
							}}
						>
							{activeTeamId === team.team_id ? (
								<SvgXml xml={greenCircleTickIcon} />
							) : (
								<SvgXml xml={grayCircleIcon} />
							)}
						</View>
					</View>
				))}
			</View>
		</View>
	)
}

export default UserTenants

const styles = StyleSheet.create({
	tenantContainer: {
		backgroundColor: "#FCFCFC",
		borderRadius: 16,
		marginVertical: 10,
		padding: 12,
		width: "100%",
	},
})
