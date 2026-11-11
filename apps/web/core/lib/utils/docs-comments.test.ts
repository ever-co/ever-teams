import { EBaseEntityEnum } from '@/core/types/generics/enums/entity';
import type { IComment } from '@/core/types/interfaces/common/comment';
import {
	anchoredBlocksOf,
	docsCommentThreads,
	isCommentAuthor,
	openThreadBlockIds,
	openThreadOnBlock,
	parseBlockAnchor,
	quoteOf,
	sortThreadsByDocument,
	threadOfComment,
	threadsOfTab,
	withBlockAnchor
} from './docs-comments';

const BLOCK_A = '11111111-1111-4111-8111-111111111111';
const BLOCK_B = '22222222-2222-4222-8222-222222222222';

function comment(id: string, body: string, overrides: Partial<IComment> = {}): IComment {
	return {
		id,
		comment: body,
		entity: EBaseEntityEnum.Document,
		entityId: 'page-1',
		createdAt: `2026-11-10T10:00:0${id.length % 10}.000Z`,
		...overrides
	};
}

describe('block anchors', () => {
	it('reads the anchor line the platform editor writes and leaves the text', () => {
		expect(parseBlockAnchor(`[[block:${BLOCK_A}]]\nLooks good`)).toEqual({ blockId: BLOCK_A, body: 'Looks good' });
		expect(parseBlockAnchor(`[[block:${BLOCK_A}]]\r\nWindows line`)).toEqual({ blockId: BLOCK_A, body: 'Windows line' });
		expect(parseBlockAnchor('On the page')).toEqual({ blockId: null, body: 'On the page' });
		expect(parseBlockAnchor(null)).toEqual({ blockId: null, body: '' });
		// Only a first line is an anchor.
		expect(parseBlockAnchor(`Text\n[[block:${BLOCK_A}]]`).blockId).toBeNull();
	});

	it('writes the anchor once, and none for a page comment', () => {
		expect(withBlockAnchor(BLOCK_A, 'Hello')).toBe(`[[block:${BLOCK_A}]]\nHello`);
		expect(withBlockAnchor(BLOCK_A, `[[block:${BLOCK_B}]]\nHello`)).toBe(`[[block:${BLOCK_A}]]\nHello`);
		expect(withBlockAnchor(null, `[[block:${BLOCK_A}]]\nHello`)).toBe('Hello');
		expect(parseBlockAnchor(withBlockAnchor(BLOCK_B, 'Round trip'))).toEqual({ blockId: BLOCK_B, body: 'Round trip' });
	});
});

describe('threads', () => {
	const root = comment('c1', `[[block:${BLOCK_B}]]\nFirst`, { createdAt: '2026-11-10T10:00:00.000Z' });
	const reply = comment('c2', `[[block:${BLOCK_B}]]\nReply`, { parentId: 'c1', createdAt: '2026-11-10T10:05:00.000Z' });
	const pageComment = comment('c3', 'On the page', { createdAt: '2026-11-10T09:00:00.000Z' });
	const resolved = comment('c4', `[[block:${BLOCK_A}]]\nDone`, { resolved: true, createdAt: '2026-11-10T11:00:00.000Z' });
	const orphan = comment('c5', 'Parent gone', { parentId: 'missing', createdAt: '2026-11-10T12:00:00.000Z' });

	it('groups replies under their thread and keeps a reply without its parent as a thread', () => {
		const threads = docsCommentThreads([reply, root, pageComment, resolved, orphan]);
		expect(threads.map((thread) => thread.id)).toEqual(['c3', 'c1', 'c4', 'c5']);
		expect(threads[1]).toMatchObject({ blockId: BLOCK_B, resolved: false });
		expect(threads[1].replies.map((item) => item.id)).toEqual(['c2']);
		expect(threads[2].resolved).toBe(true);
		expect(threads[3].blockId).toBeNull();
	});

	it('orders by the blocks on the page, then the page and detached threads by age', () => {
		const threads = docsCommentThreads([root, pageComment, resolved, orphan]);
		expect(sortThreadsByDocument(threads, [BLOCK_A, BLOCK_B]).map((thread) => thread.id)).toEqual(['c4', 'c1', 'c3', 'c5']);
		// A thread whose block is gone goes with the page's.
		expect(sortThreadsByDocument(threads, [BLOCK_A]).map((thread) => thread.id)).toEqual(['c4', 'c3', 'c1', 'c5']);
	});

	it('splits open and resolved, and marks only the blocks with an open thread', () => {
		const threads = docsCommentThreads([root, reply, pageComment, resolved]);
		expect(threadsOfTab(threads, 'open').map((thread) => thread.id)).toEqual(['c3', 'c1']);
		expect(threadsOfTab(threads, 'resolved').map((thread) => thread.id)).toEqual(['c4']);
		expect(openThreadBlockIds(threads)).toEqual([BLOCK_B]);
	});

	it('finds the thread of a comment or of a reply, and the open thread of a block', () => {
		const threads = docsCommentThreads([root, reply, resolved]);
		expect(threadOfComment(threads, 'c2')?.id).toBe('c1');
		expect(threadOfComment(threads, 'c4')?.id).toBe('c4');
		expect(threadOfComment(threads, 'nope')).toBeNull();
		expect(threadOfComment(threads, null)).toBeNull();
		expect(openThreadOnBlock(threads, BLOCK_B)?.id).toBe('c1');
		expect(openThreadOnBlock(threads, BLOCK_A)).toBeNull();
	});
});

describe('authors', () => {
	it('is the employee who wrote it, or the user of an author-less comment', () => {
		expect(isCommentAuthor({ employeeId: 'e1' }, { employeeId: 'e1', userId: 'u1' })).toBe(true);
		expect(isCommentAuthor({ employeeId: 'e1' }, { employeeId: 'e2', userId: 'u1' })).toBe(false);
		expect(isCommentAuthor({ employeeId: 'e1' }, { employeeId: null, userId: 'u1' })).toBe(false);
		expect(isCommentAuthor({ employeeId: null, createdByUserId: 'u1' }, { employeeId: null, userId: 'u1' })).toBe(true);
		expect(isCommentAuthor({ employeeId: null, createdByUserId: 'u1' }, { employeeId: 'e1', userId: 'u2' })).toBe(false);
	});
});

describe('quotes and blocks', () => {
	it('quotes one line and cuts long text at a word', () => {
		expect(quoteOf('  two\n lines ')).toBe('two lines');
		const long = 'word '.repeat(60);
		const quote = quoteOf(long, 40);
		expect(quote.length).toBeLessThanOrEqual(41);
		expect(quote.endsWith('…')).toBe(true);
		expect(quoteOf(null)).toBe('');
	});

	it('reads the anchored blocks of a page in order with their text', () => {
		const json = {
			type: 'doc',
			content: [
				{ type: 'heading', attrs: { level: 1, blockId: BLOCK_A }, content: [{ type: 'text', text: 'Title' }] },
				{
					type: 'bulletList',
					content: [
						{
							type: 'listItem',
							content: [
								{
									type: 'paragraph',
									attrs: { blockId: BLOCK_B },
									content: [
										{ type: 'text', text: 'Ask ' },
										{ type: 'mention', attrs: { id: 'e1', label: 'Ana' } },
										{ type: 'text', text: ' today' }
									]
								}
							]
						}
					]
				},
				{ type: 'paragraph', content: [{ type: 'text', text: 'No anchor' }] }
			]
		};
		const blocks = anchoredBlocksOf(json);
		expect(blocks.order).toEqual([BLOCK_A, BLOCK_B]);
		expect(blocks.text.get(BLOCK_A)).toBe('Title');
		expect(blocks.text.get(BLOCK_B)).toBe('Ask @Ana today');
		expect(anchoredBlocksOf(null).order).toEqual([]);
	});
});
