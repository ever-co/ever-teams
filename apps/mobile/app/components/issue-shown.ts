import type { IIssueType } from '../services/interfaces/ITaskIssue';

/** The issue type a task's plate shows: its own, or Task by default; none when the organization has no issue types. */
export function issueShownOf(allTaskIssues: IIssueType[], issueType: string | undefined): IIssueType | undefined {
	// `||`, not a default parameter: the API can send null or an empty name, which a default would not catch
	return allTaskIssues.find((issue) => issue.name === (issueType || 'Task'));
}
