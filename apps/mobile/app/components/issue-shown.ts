import type { IIssueType } from '../services/interfaces/ITaskIssue';

/** The issue type a task's plate shows: its own, or Task by default; none when the organization has no issue types. */
export function issueShownOf(allTaskIssues: IIssueType[], issueType: string | undefined): IIssueType | undefined {
	const name = issueType || 'Task';
	return allTaskIssues.find((issue) => issue.name === name);
}
