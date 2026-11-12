import { MENTION_TRIGGER, mentionTextOf, type MentionablePerson } from '@/core/lib/utils/comment-mentions';
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

/** A character that would carry a name on past its end ("@Ann" in "@Annabel"). */
const NAME_CHARACTER = /[\p{L}\p{N}_]/u;

const WHITESPACE = /\s/;

/**
 * The people already mentioned in a text being edited: their complete "@Full Name" is in it. An edit sends the
 * mentions the text holds, which replace the comment's, so a mention kept in the text stays one without being picked
 * again.
 *
 * A mention starts a word and ends where the name ends, and the longest name wins: "@Ann Lee" is Ann Lee's mention,
 * never also Ann's, and "@Annabel" is nobody's. Namesakes share their mention, as the text cannot tell them apart.
 */
export function mentionedIn(text: string, candidates: readonly MentionablePerson[]): MentionablePerson[] {
	if (!text || candidates.length === 0) return [];
	const longestFirst = [...candidates].sort((first, second) => second.name.length - first.name.length);
	const names = new Set<string>();
	let index = text.indexOf(MENTION_TRIGGER);
	while (index >= 0) {
		const startsAWord = index === 0 || WHITESPACE.test(text[index - 1]);
		const match = startsAWord
			? longestFirst.find((candidate) => {
					const mention = mentionTextOf(candidate);
					return (
						candidate.name.length > 0 &&
						text.startsWith(mention, index) &&
						!NAME_CHARACTER.test(text[index + mention.length] ?? '')
					);
				})
			: undefined;
		if (match) {
			names.add(match.name);
		}
		const next = match ? index + mentionTextOf(match).length : index + MENTION_TRIGGER.length;
		index = text.indexOf(MENTION_TRIGGER, next);
	}
	return candidates.filter((candidate) => names.has(candidate.name));
}

/**
 * The mentions an edit sends: the new list when the text gains or loses a mention, nothing (`undefined`) when the
 * mentions are the ones the text already had. Left out, the platform keeps the comment's mentions exactly as stored,
 * so an edit that only fixes a typo never drops a mention of someone who left the team, nor adds a namesake.
 *
 * @param before - The employees the text named before the edit (as the people known now read it).
 * @param after - The employees the edited text names.
 */
export function mentionsToSend(before: readonly string[], after: readonly string[]): string[] | undefined {
	const was = new Set(before);
	const now = new Set(after);
	const isSame = was.size === now.size && [...now].every((id) => was.has(id));
	return isSame ? undefined : [...now];
}

/** Whether an edit changes anything: the same text (once trimmed) is not sent. */
export function isTextChanged(original: string, edited: string): boolean {
	return original.trim() !== edited.trim();
}
