import React from "react"
import Accordion from "../../Accordion"
import TaskPublicity from "./blocks/TaskPublicity"
import TaskMainInfo from "./blocks/TaskMainInfo"
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
