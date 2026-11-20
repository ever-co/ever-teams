import { issueShownOf } from './issue-shown';
import type { IIssueType } from '../services/interfaces/ITaskIssue';

const task = { name: 'Task', color: '#5483ba' } as IIssueType;
const bug = { name: 'Bug', color: '#C24A4A' } as IIssueType;

describe("a task's issue type plate", () => {
	it("shows the task's own type, and Task for a task without one", () => {
		expect(issueShownOf([task, bug], 'Bug')).toBe(bug);
		expect(issueShownOf([task, bug], undefined)).toBe(task);
		expect(issueShownOf([task, bug], '')).toBe(task);
	});

	it('shows nothing when the organization has no issue types, where an empty box was drawn', () => {
		expect(issueShownOf([], undefined)).toBeUndefined();
	});
});
