import React from "react"
import Accordion from "../../accordion"
import ChildIssues from "./blocks/child-issues"
import RelatedIssues from "./blocks/related-issues"
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
