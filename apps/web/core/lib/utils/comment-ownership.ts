import { mentionTextOf, type MentionablePerson } from '@/core/lib/utils/comment-mentions';
import type { TaskCommentItem } from '@/core/types/interfaces/task/task-discussion';

/** Who is reading: their employee (when they have one) and their user. */
export interface CommentReader {
	employeeId: string | null;
	userId: string | null;
}

/**
 * Whether the reader wrote the comment, on the platform's terms (`CommentService.assertMayManage`): a comment with an
 * author is its employee's; an author-less one (posted by a user without an employee record) is the posting user's.
 * Only then does the platform let them edit, resolve, delete or restore it without acting for every employee.
 */
export function isOwnComment(
	comment: Pick<TaskCommentItem, 'authorEmployeeId' | 'authorUserId'>,
	reader: CommentReader
): boolean {
	if (comment.authorEmployeeId) {
		return !!reader.employeeId && comment.authorEmployeeId === reader.employeeId;
	}
	return !!comment.authorUserId && !!reader.userId && comment.authorUserId === reader.userId;
}

/**
 * The people already mentioned in a text being edited: their "@Full Name" is in it. An edit sends the mentions the
 * text holds, which replace the comment's, so a mention kept in the text stays one without being picked again.
 */
export function mentionedIn(text: string, candidates: readonly MentionablePerson[]): MentionablePerson[] {
	if (!text) return [];
	return candidates.filter((candidate) => text.includes(mentionTextOf(candidate)));
}

/** Whether an edit changes anything: the same text (once trimmed) is not sent. */
export function isTextChanged(original: string, edited: string): boolean {
	return original.trim() !== edited.trim();
}
