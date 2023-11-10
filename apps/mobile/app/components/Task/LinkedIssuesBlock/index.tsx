import React from "react"
import Accordion from "../../Accordion"
import ChildIssues from "./blocks/ChildIssues"
import RelatedIssues from "./blocks/RelatedIssues"
import { translate } from "../../../i18n"

const LinkedIssuesBlock = () => {
	return (
		<Accordion title={translate("taskDetailsScreen.linkedIssues")}>
			<ChildIssues />
			<RelatedIssues />
		</Accordion>
	)
}

export default LinkedIssuesBlock
