import type { IReactionReactor, IReactionSummary } from '@/core/types/interfaces/common/reaction';

/** How many reactors a tooltip names before it says "and N others". */
export const NAMED_REACTORS = 3;

const NO_REACTIONS: readonly IReactionSummary[] = [];

/** The summaries by comment, each comment's in the order the platform answered (the order emojis were first used). */
export function reactionsByComment(summaries: readonly IReactionSummary[] | undefined): Map<string, IReactionSummary[]> {
	const byComment = new Map<string, IReactionSummary[]>();
	for (const summary of summaries ?? NO_REACTIONS) {
		if (!summary?.entityId || !summary.emoji || summary.count <= 0) {
			continue;
		}
		const list = byComment.get(summary.entityId) ?? [];
		list.push(summary);
		byComment.set(summary.entityId, list);
	}
	return byComment;
}

function withoutReactor(reactors: readonly IReactionReactor[], employeeId: string): IReactionReactor[] {
	return reactors.filter((reactor) => reactor.employeeId !== employeeId);
}

/**
 * The summaries once the caller toggled `emoji` on a comment, as the platform's toggle will leave them: their reaction
 * is taken back when they had it (the chip goes when nobody else has it), added otherwise (a new chip goes last).
 * Used as the optimistic state, the refetch confirms it.
 *
 * @param summaries - The summaries as read.
 * @param commentId - The comment.
 * @param emoji - The emoji toggled.
 * @param me - The caller as a reactor (their employee and name).
 */
export function toggledReactions(
	summaries: readonly IReactionSummary[],
	commentId: string,
	emoji: string,
	me: IReactionReactor
): IReactionSummary[] {
	const index = summaries.findIndex((summary) => summary.entityId === commentId && summary.emoji === emoji);
	if (index < 0) {
		const added: IReactionSummary = {
			entity: 'Comment',
			entityId: commentId,
			emoji,
			count: 1,
			reactedByMe: true,
			reactionId: null,
			reactors: [me]
		};
		// After the comment's last chip, so the existing chips keep their places.
		let lastOfComment = -1;
		summaries.forEach((summary, at) => {
			if (summary.entityId === commentId) lastOfComment = at;
		});
		const next = [...summaries];
		next.splice(lastOfComment < 0 ? next.length : lastOfComment + 1, 0, added);
		return next;
	}

	const current = summaries[index];
	const next = [...summaries];
	if (current.reactedByMe) {
		const count = Math.max(current.count - 1, 0);
		if (count === 0) {
			next.splice(index, 1);
			return next;
		}
		next[index] = {
			...current,
			count,
			reactedByMe: false,
			reactionId: null,
			reactors: withoutReactor(current.reactors, me.employeeId)
		};
		return next;
	}
	next[index] = {
		...current,
		count: current.count + 1,
		reactedByMe: true,
		reactors: [...withoutReactor(current.reactors, me.employeeId), me]
	};
	return next;
}

/** The people a tooltip names: the first few by name, and how many more reacted. */
export interface NamedReactors {
	names: string[];
	others: number;
}

/**
 * The reactors a tooltip names (the first {@link NAMED_REACTORS}, in the order they reacted, the caller as `meLabel`),
 * and how many it leaves for "and N others". A reactor without a name is `unknownLabel`. The count is the platform's,
 * which can exceed the reactors listed.
 */
export function namedReactors(
	summary: Pick<IReactionSummary, 'count' | 'reactors'>,
	labels: { meEmployeeId?: string | null; meLabel: string; unknownLabel: string },
	limit = NAMED_REACTORS
): NamedReactors {
	const reactors = summary.reactors ?? [];
	const shown = reactors.slice(0, limit).map((reactor) => {
		if (labels.meEmployeeId && reactor.employeeId === labels.meEmployeeId) return labels.meLabel;
		const name = reactor.name?.trim();
		return name || labels.unknownLabel;
	});
	const total = Math.max(summary.count, reactors.length);
	return { names: shown, others: Math.max(total - shown.length, 0) };
}

/**
 * "Ann, Bo and 2 others" in the reader's language: the names and the "N others" part joined as the locale joins a
 * list (`Intl.ListFormat`), falling back to commas where the runtime has no list format.
 */
export function joinReactorNames(named: NamedReactors, locale: string, othersLabel: (count: number) => string): string {
	const parts = [...named.names];
	if (named.others > 0) parts.push(othersLabel(named.others));
	if (parts.length === 0) return '';
	try {
		return new Intl.ListFormat(locale, { style: 'long', type: 'conjunction' }).format(parts);
	} catch {
		return parts.join(', ');
	}
}
