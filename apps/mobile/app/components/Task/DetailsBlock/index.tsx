import React from "react"
import Accordion from "../../Accordion"
import TaskPublicity from "./blocks/TaskPublicity"
import TaskMainInfo from "./blocks/TaskMainInfo"

const DetailsBlock = () => {
	return (
		<Accordion title="Details">
			<TaskPublicity />
			<TaskMainInfo />
		</Accordion>
	)
}

export default DetailsBlock
