import type { IReactionSummary } from '@/core/types/interfaces/common/reaction';
import { joinReactorNames, namedReactors, reactionsByComment, toggledReactions } from './comment-reactions';

const ann = { employeeId: 'ann', name: 'Ann Lee', imageUrl: null };
const bo = { employeeId: 'bo', name: 'Bo Ray', imageUrl: null };
const me = { employeeId: 'me', name: 'Me Self', imageUrl: null };

function summary(entityId: string, emoji: string, reactors: (typeof ann)[], reactedByMe = false): IReactionSummary {
	return { entity: 'Comment', entityId, emoji, count: reactors.length, reactedByMe, reactionId: null, reactors };
}

describe('reactionsByComment', () => {
	it('groups the summaries by comment, keeping the order the platform answered', () => {
		const byComment = reactionsByComment([
			summary('c1', '👍', [ann]),
			summary('c2', '🎉', [bo]),
			summary('c1', '❤️', [bo])
		]);

		expect(byComment.get('c1')?.map((entry) => entry.emoji)).toEqual(['👍', '❤️']);
		expect(byComment.get('c2')?.map((entry) => entry.emoji)).toEqual(['🎉']);
	});

	it('leaves out empty and malformed entries, and reads nothing as no reactions', () => {
		const byComment = reactionsByComment([
			{ ...summary('c1', '👍', []), count: 0 },
			{ ...summary('', '👍', [ann]) },
			{ ...summary('c1', '', [ann]) }
		]);

		expect(byComment.size).toBe(0);
		expect(reactionsByComment(undefined).size).toBe(0);
	});
});

describe('toggledReactions — the optimistic toggle', () => {
	it('adds the caller to an emoji others used, last among its reactors', () => {
		const next = toggledReactions([summary('c1', '👍', [ann])], 'c1', '👍', me);

		expect(next).toEqual([{ ...summary('c1', '👍', [ann, me], true), reactionId: null }]);
	});

	it('takes the caller’s reaction back, and drops the chip when nobody else has it', () => {
		const shared = toggledReactions([summary('c1', '👍', [ann, me], true)], 'c1', '👍', me);
		expect(shared).toEqual([summary('c1', '👍', [ann], false)]);

		const alone = toggledReactions([summary('c1', '👍', [me], true), summary('c1', '🎉', [ann])], 'c1', '👍', me);
		expect(alone.map((entry) => entry.emoji)).toEqual(['🎉']);
	});

	it('adds a new emoji after the comment’s last chip, leaving other comments’ chips in place', () => {
		const next = toggledReactions([summary('c1', '👍', [ann]), summary('c2', '🎉', [bo])], 'c1', '👀', me);

		expect(next.map((entry) => `${entry.entityId}:${entry.emoji}`)).toEqual(['c1:👍', 'c1:👀', 'c2:🎉']);
		expect(next[1]).toMatchObject({ count: 1, reactedByMe: true, reactors: [me] });
	});

	it('adds the first reaction of a comment without any', () => {
		expect(toggledReactions([], 'c9', '👍', me)).toEqual([
			{
				entity: 'Comment',
				entityId: 'c9',
				emoji: '👍',
				count: 1,
				reactedByMe: true,
				reactionId: null,
				reactors: [me]
			}
		]);
	});

	it('never changes the list it was given', () => {
		const list = [summary('c1', '👍', [ann])];
		const copy = structuredClone(list);

		toggledReactions(list, 'c1', '👍', me);

		expect(list).toEqual(copy);
	});
});

describe('who reacted — the tooltip', () => {
	const labels = { meEmployeeId: 'me', meLabel: 'You', unknownLabel: 'Someone' };

	it('names up to three reactors in order, the caller as “You”, and counts the rest', () => {
		const named = namedReactors(
			{ count: 5, reactors: [ann, me, { employeeId: 'x', name: '  ' }, bo, { employeeId: 'y', name: 'Yu' }] },
			labels
		);

		expect(named).toEqual({ names: ['Ann Lee', 'You', 'Someone'], others: 2 });
	});

	it('counts reactors the platform did not list', () => {
		expect(namedReactors({ count: 4, reactors: [ann] }, labels)).toEqual({ names: ['Ann Lee'], others: 3 });
	});

	it('joins the names as the reader’s language joins a list', () => {
		const others = (count: number) => `${count} others`;

		expect(joinReactorNames({ names: ['Ann Lee', 'Bo Ray'], others: 0 }, 'en', others)).toBe('Ann Lee and Bo Ray');
		expect(joinReactorNames({ names: ['Ann Lee', 'Bo Ray', 'You'], others: 2 }, 'en', others)).toBe(
			'Ann Lee, Bo Ray, You, and 2 others'
		);
		expect(joinReactorNames({ names: [], others: 0 }, 'en', others)).toBe('');
	});
});
