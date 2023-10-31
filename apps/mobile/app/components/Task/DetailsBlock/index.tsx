import React from "react"
import Accordion from "../../Accordion"
import TaskPublicity from "./blocks/TaskPublicity"
import TaskMainInfo from "./blocks/TaskMainInfo"
import { ScrollView } from "react-native"

const DetailsBlock = () => {
	return (
		<Accordion title="Details">
			<ScrollView>
				<TaskPublicity />
				<TaskMainInfo />
			</ScrollView>
		</Accordion>
	)
}

export default DetailsBlock
