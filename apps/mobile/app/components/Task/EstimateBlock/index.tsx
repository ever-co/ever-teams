/* eslint-disable react-native/no-inline-styles  */
/* eslint-disable react-native/no-color-literals  */
import { View, Text, StyleSheet } from "react-native"
import React from "react"
import Accordion from "../../Accordion"
import TaskRow from "../DetailsBlock/components/TaskRow"
import { useStores } from "../../../models"
import ProfileInfoWithTime from "./components/ProfileInfoWithTime"
import { useAppTheme } from "../../../theme"
import { translate } from "../../../i18n"

const EstimateBlock = () => {
	const {
		TaskStore: { detailedTask: task },
	} = useStores()

	const { colors } = useAppTheme()
	return (
		<Accordion title={translate("taskDetailsScreen.estimate")}>
			<View style={{ paddingBottom: 12 }}>
				<TaskRow
					labelComponent={
						<View style={[styles.labelComponent, { marginLeft: 12 }]}>
							<Text style={styles.labelText}>
								{translate("taskDetailsScreen.estimations")}
							</Text>
						</View>
					}
				>
					<Text
						style={{
							fontWeight: "600",
							fontSize: 14,
							marginLeft: 5,
							color: colors.primary,
						}}
					>
						6 h: 40 m
					</Text>
					{task?.members?.map((member, index) => (
						<ProfileInfoWithTime
							key={index}
							userId={member?.userId || member?.user?.id}
							profilePicSrc={member?.user?.imageUrl}
							names={`${member?.user?.firstName || ""} ${
								member?.user?.lastName || ""
							}`}
						/>
					))}
				</TaskRow>
			</View>
		</Accordion>
	)
}

export default EstimateBlock

const styles = StyleSheet.create({
	labelComponent: {
		alignItems: "center",
		flexDirection: "row",
		gap: 7,
	},
	labelText: {
		color: "#A5A2B2",
		fontSize: 12,
	},
})
