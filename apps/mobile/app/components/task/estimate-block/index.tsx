/* eslint-disable react-native/no-inline-styles  */
/* eslint-disable react-native/no-color-literals  */
import { View, Text } from "react-native"
import React from "react"
import Accordion from "../../accordion"
import TaskRow from "../details-block/components/task-row"
import { PropertyLabel } from "../details-block/components/property-label"
import { useStores } from "../../../models"
import ProfileInfoWithTime from "./components/profile-info-with-time"
import { useAppTheme } from "../../../theme"
import { translate } from "../../../i18n"
import { estimateTextOf } from "./estimate-text"

const EstimateBlock = () => {
	const {
		TaskStore: { detailedTask: task },
	} = useStores()

	const { colors } = useAppTheme()
	const estimateText = estimateTextOf(task?.estimate)
	return (
		<Accordion title={translate("taskDetailsScreen.estimate")}>
			<View style={{ paddingBottom: 12, paddingHorizontal: 16 }}>
				<TaskRow
					labelComponent={<PropertyLabel icon="target" label={translate("taskDetailsScreen.estimations")} />}
				>
					{estimateText && (
						<Text
							style={{
								fontWeight: "600",
								fontSize: 12,
								marginLeft: 5,
								color: colors.primary,
							}}
						>
							{estimateText}
						</Text>
					)}
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
