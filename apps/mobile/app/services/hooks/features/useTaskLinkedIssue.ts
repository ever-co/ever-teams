import { useState } from "react"
import {
	createTaskLinkedIsssue,
	updateTaskLinkedIssue,
} from "../../client/requests/task-linked-issue"
import { useStores } from "../../../models"

export const useTaskLinkedIssues = () => {
	const {
		authenticationStore: { authToken, tenantId },
	} = useStores()

	const [loading, setLoading] = useState(false)
	const [error, setError] = useState(null)

	const createTaskLinkedIssueRequest = async (data) => {
		try {
			setLoading(true)
			await createTaskLinkedIsssue(data, authToken, tenantId)
		} catch (err) {
			setError(err)
		} finally {
			setLoading(false)
		}
	}

	const updateTaskLinkedIssueRequest = async (data) => {
		try {
			setLoading(true)
			await updateTaskLinkedIssue(data, authToken, tenantId)
		} catch (err) {
			setError(err)
		} finally {
			setLoading(false)
		}
	}

	return {
		loading,
		error,
		createTaskLinkedIssue: createTaskLinkedIssueRequest,
		updateTaskLinkedIssue: updateTaskLinkedIssueRequest,
	}
}
