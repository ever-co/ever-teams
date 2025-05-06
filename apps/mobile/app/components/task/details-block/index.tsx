import React from "react"
import Accordion from "../../accordion"
import TaskPublicity from "./blocks/task-publicity"
import TaskMainInfo from "./blocks/task-main-info"
import { translate } from "../../../i18n"

const DetailsBlock = () => {
	return (
		<Accordion title={translate("taskDetailsScreen.details")}>
			<TaskPublicity />
			<TaskMainInfo />
		</Accordion>
	)
}

export default DetailsBlock
