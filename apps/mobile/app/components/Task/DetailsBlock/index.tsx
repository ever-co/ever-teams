import React from "react"
import Accordion from "../../Accordion"
import TaskPublicity from "./blocks/TaskPublicity"

const DetailsBlock = () => {
	return (
		<Accordion title="Details">
			<TaskPublicity />
		</Accordion>
	)
}

export default DetailsBlock
