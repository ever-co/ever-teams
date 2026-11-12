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
 * The people whose name no one else shares: a complete "@Full Name" typed without picking it from the menu names one
 * of them unambiguously, so it counts as a mention. A namesake is mentioned only when picked (the pick carries who).
 */
export function uniquelyNamed(candidates: readonly MentionablePerson[]): MentionablePerson[] {
	const counts = new Map<string, number>();
	for (const candidate of candidates) {
		counts.set(candidate.name, (counts.get(candidate.name) ?? 0) + 1);
	}
	return candidates.filter((candidate) => counts.get(candidate.name) === 1);
}

/**
 * The employees a text mentions, as the composer sends them (`mentionEmployeeIds`). Each complete "@Full Name" is
 * first read against every known name, the longest first, so "@Ann Lee" is Ann Lee's mention even when an "Ann" is
 * known too. A mentioned name then counts for the people `chosen` for it (picked from the menu, or already mentioned
 * in the text being edited), or for its only bearer; a name several people share counts only for those chosen.
 *
 * @param text - The text sent.
 * @param candidates - Everyone who can be mentioned.
 * @param chosen - The people picked from the menu, and those the edited text already mentioned.
 */
export function mentionEmployeeIdsOf(
	text: string,
	candidates: readonly MentionablePerson[],
	chosen: readonly MentionablePerson[]
): string[] {
	const everyone = [...candidates, ...chosen];
	const names = new Set(mentionedIn(text, everyone).map((person) => person.name));
	const eligible = [...chosen, ...uniquelyNamed(candidates)];
	const ids = eligible.filter((person) => names.has(person.name)).map((person) => person.employeeId);
	return [...new Set(ids)];
}

/**
 * The mentions an edit of `original` into `edited` sends, as {@link mentionsToSend} decides, with one more rule: the
 * comment list does not carry a comment's stored mentions, so a name several people share cannot tell which of them
 * the original text mentioned. While such a name stays in the edited text, nothing is sent and the platform keeps
 * the stored mentions as they are (a mention added in that same edit is then not notified); no namesake is ever
 * added, and the one stored is never dropped.
 *
 * @param original - The comment's text before the edit.
 * @param edited - The text sent.
 * @param candidates - Everyone who can be mentioned.
 * @param after - The employees the composer sends for `edited` ({@link mentionEmployeeIdsOf}).
 */
export function editMentionsToSend(
	original: string,
	edited: string,
	candidates: readonly MentionablePerson[],
	after: readonly string[]
): string[] | undefined {
	const unique = new Set(uniquelyNamed(candidates).map((candidate) => candidate.name));
	const shared = new Set(candidates.map((candidate) => candidate.name).filter((name) => !unique.has(name)));
	const namesIn = (text: string) => new Set(mentionedIn(text, candidates).map((person) => person.name));
	const editedNames = namesIn(edited);
	const keepsAnAmbiguousMention = [...namesIn(original)].some((name) => shared.has(name) && editedNames.has(name));
	if (keepsAnAmbiguousMention) return undefined;
	return mentionsToSend(mentionEmployeeIdsOf(original, candidates, []), after);
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
