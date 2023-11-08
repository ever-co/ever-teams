import React from "react"
import Accordion from "../../Accordion"
import ChildIssues from "./blocks/ChildIssues"
import RelatedIssues from "./blocks/RelatedIssues"

const LinkedIssuesBlock = () => {
	return (
		<Accordion title="Linked Issues">
			<ChildIssues />
			<RelatedIssues />
		</Accordion>
	)
}

export default LinkedIssuesBlock
