import type { IDocumentCommentAnchorResolved, IDocumentNode } from '@/core/types/interfaces/common/docs';
import {
	anchorBlocksOf,
	anchorsByComment,
	approximateMatch,
	commentAnchorInputOf,
	closestRunFrom,
	DOCS_ANCHOR_QUOTE_MAX_LENGTH,
	resolveCommentAnchor,
	storedAnchorOf,
	threadPlaceOf,
	type DocsAnchorBlock
} from './docs-comment-anchors';

const paragraph = (blockId: string, ...texts: string[]): IDocumentNode => ({
	type: 'paragraph',
	attrs: { blockId },
	content: texts.map((text) => ({ type: 'text', text }))
});

const blocks = (...entries: Array<[string, string]>): DocsAnchorBlock[] => entries.map(([blockId, text]) => ({ blockId, text }));

const ANCHOR = { blockId: 'b1', start: 10, end: 19, quote: 'brown fox', prefix: 'The quick ', suffix: ' jumps' };

describe('anchorBlocksOf', () => {
	it('reads every block with an anchor in document order, its text the text nodes only, a copied anchor once', () => {
		const doc: IDocumentNode = {
			type: 'doc',
			content: [
				paragraph('b1', 'Hello ', 'world'),
				{ type: 'bulletList', attrs: { blockId: 'list' }, content: [{ type: 'listItem', content: [paragraph('b2', 'Item')] }] },
				paragraph('b1', 'A copy'),
				{ type: 'paragraph', content: [{ type: 'text', text: 'No anchor' }] }
			]
		};
		expect(anchorBlocksOf(doc)).toEqual([
			{ blockId: 'b1', text: 'Hello world' },
			{ blockId: 'list', text: 'Item' },
			{ blockId: 'b2', text: 'Item' }
		]);
		expect(anchorBlocksOf(null)).toEqual([]);
	});
});

describe('resolveCommentAnchor', () => {
	it('keeps the offsets while they still cover the quote', () => {
		expect(resolveCommentAnchor(ANCHOR, blocks(['b1', 'The quick brown fox jumps over the lazy dog.']))).toEqual({
			status: 'exact',
			method: 'offsets',
			blockId: 'b1',
			start: 10,
			end: 19,
			text: 'brown fox'
		});
	});

	it('finds the quote again in its block, the occurrence whose context fits', () => {
		const text = 'A brown fox. Then the quick brown fox jumps.';
		expect(resolveCommentAnchor(ANCHOR, blocks(['b1', text]))).toMatchObject({ status: 'moved', method: 'quote', blockId: 'b1', start: 28, end: 37 });
	});

	it('follows the quote to another block when its own no longer holds it', () => {
		expect(resolveCommentAnchor(ANCHOR, blocks(['b1', 'Rewritten.'], ['b2', 'The quick brown fox moved here.']))).toMatchObject({
			status: 'moved',
			method: 'quote',
			blockId: 'b2',
			start: 10,
			end: 19
		});
	});

	it('takes a slightly edited quote in its block, then the block alone, else nothing', () => {
		const long = { blockId: 'b1', start: 0, end: 21, quote: 'the lazy dog sleeps on' };
		const fuzzy = resolveCommentAnchor(long, blocks(['b1', 'and the lazy dogs slept on the mat']));
		expect(fuzzy).toMatchObject({ status: 'moved', method: 'fuzzy', blockId: 'b1' });
		expect(fuzzy.text).toContain('lazy dog');

		expect(resolveCommentAnchor(ANCHOR, blocks(['b1', 'Nothing alike at all here.']))).toEqual({
			status: 'block',
			method: 'block',
			blockId: 'b1',
			start: null,
			end: null,
			text: null
		});
		expect(resolveCommentAnchor(ANCHOR, blocks(['b9', 'Elsewhere']))).toMatchObject({ status: 'orphaned', blockId: null });
	});

	it('reads the live relative positions first, even when the text under them was edited', () => {
		const live = (relative: string) => (relative === 'S' ? { blockId: 'b1', offset: 4 } : relative === 'E' ? { blockId: 'b1', offset: 13 } : null);
		const anchor = { ...ANCHOR, relativeStart: 'S', relativeEnd: 'E' };
		expect(resolveCommentAnchor(anchor, blocks(['b1', 'Oh, brown fox!']), live)).toMatchObject({ status: 'exact', method: 'relative', start: 4, end: 13 });
		expect(resolveCommentAnchor(anchor, blocks(['b1', 'Oh, brown cat!']), live)).toMatchObject({ status: 'moved', method: 'relative', text: 'brown cat' });
		// Ends in two blocks (or unreadable) are not a range: the stored offsets and the quote take over.
		const split = (relative: string) => (relative === 'S' ? { blockId: 'b1', offset: 4 } : { blockId: 'b2', offset: 2 });
		expect(resolveCommentAnchor(anchor, blocks(['b1', 'The quick brown fox']), split)).toMatchObject({ method: 'offsets' });
	});
});

describe('the work budget of the approximate matches', () => {
	it('falls back to the block once the budget is spent, as the platform does', () => {
		const anchor = { blockId: 'b1', start: 0, end: 10, quote: 'betta gama' };
		const page = blocks(['b1', 'alpha beta gamma delta']);
		const budget = { cells: 10 * page[0].text.length };
		expect(resolveCommentAnchor(anchor, page, null, budget)).toMatchObject({ status: 'moved', method: 'fuzzy' });
		expect(resolveCommentAnchor(anchor, page, null, budget)).toMatchObject({ status: 'block' });
		expect(threadPlaceOf({ blockId: 'b1' }, anchor, page, null, { cells: 0 }).kind).toBe('block-fallback');
	});
});

describe('approximateMatch', () => {
	it('finds a near match within a quarter of the quote, and nothing for a short or distant one', () => {
		expect(approximateMatch('say hello, world now', 'hello world')).toMatchObject({ start: 4, distance: 1 });
		expect(approximateMatch('abc', 'abd')).toBeNull();
		expect(approximateMatch('something else entirely', 'hello world')).toBeNull();
	});

	it('checks the whole of a quote longer than the compared part, as the platform does', () => {
		const quote = 'the river runs past the old mill and the green field '.repeat(8);
		const edited = `Intro. ${quote.slice(0, 300)}${quote.slice(300).replace('mill', 'mall')}`;
		expect(approximateMatch(edited, quote)).toMatchObject({ start: 7, end: 7 + quote.length, distance: 1 });
		expect(approximateMatch(`Intro. ${quote.slice(0, 256)}${'x'.repeat(quote.length - 256)}`, quote)).toBeNull();
		expect(closestRunFrom('xx kitten', 3, 'sitting', 3)).toEqual({ length: 6, distance: 3 });
		expect(closestRunFrom('xx kitten', 3, 'sitting', 2)).toBeNull();
	});

	it('lets tail insertions move the end, and tries the next start when the first is not the quote', () => {
		const inserted = `${'a'.repeat(256)}${'b'.repeat(72)}${'c'.repeat(72)}`;
		expect(approximateMatch(`${'a'.repeat(256)}${'x'.repeat(100)}${'b'.repeat(72)}${'c'.repeat(72)}`, inserted)).toEqual({ start: 0, end: 500, distance: 100 });
		const quote = `${'a'.repeat(256)}${'b'.repeat(144)}`;
		const first = `${'a'.repeat(256)}${'x'.repeat(144)}`;
		const text = `${first} ${'a'.repeat(256)}${'b'.repeat(143)}c`;
		expect(approximateMatch(text, quote)).toEqual({ start: first.length + 1, end: text.length, distance: 1 });
		const front = `${'a'.repeat(256)}${'b'.repeat(744)}`;
		expect(approximateMatch(`${'x'.repeat(65)}${'a'.repeat(191)}${'b'.repeat(744)}`, front)).toMatchObject({ start: 0, end: 1000, distance: 65 });
	});
});

describe('commentAnchorInputOf', () => {
	const text = 'The quick brown fox jumps over the lazy dog.';

	it('makes the anchor of a selection: offsets, quote and context', () => {
		expect(commentAnchorInputOf('b1', text, 10, 19)).toEqual({ blockId: 'b1', start: 10, end: 19, quote: 'brown fox', prefix: 'The quick ', suffix: ' jumps over the lazy dog.' });
	});

	it('keeps the live ends only while the range is the selection as made', () => {
		const relative = { relativeStart: 'AAA=', relativeEnd: 'BBB=' };
		expect(commentAnchorInputOf('b1', text, 10, 19, relative)).toMatchObject(relative);
		// Cut to the block's text: the live ends no longer name the range.
		expect(commentAnchorInputOf('b1', text, 40, 99, relative)).not.toHaveProperty('relativeStart');
	});

	it('cuts a long selection to the quote limit, and has none for an empty one', () => {
		const long = 'x'.repeat(DOCS_ANCHOR_QUOTE_MAX_LENGTH + 50);
		expect(commentAnchorInputOf('b1', long, 0, long.length)?.quote).toHaveLength(DOCS_ANCHOR_QUOTE_MAX_LENGTH);
		expect(commentAnchorInputOf('b1', text, 5, 5)).toBeNull();
		expect(commentAnchorInputOf('', text, 0, 3)).toBeNull();
	});
});

describe('threadPlaceOf', () => {
	const resolved = (overrides: Partial<IDocumentCommentAnchorResolved> = {}): IDocumentCommentAnchorResolved => ({
		...ANCHOR,
		commentId: 'c1',
		documentId: 'page-1',
		position: { status: 'exact', method: 'offsets', blockId: 'b1', start: 10, end: 19, text: 'brown fox' },
		...overrides
	});

	it('places a thread by its range in the page as it is now', () => {
		const place = threadPlaceOf({ blockId: 'b1' }, resolved(), blocks(['b1', 'Now the quick brown fox jumps']));
		expect(place).toMatchObject({ kind: 'range', blockId: 'b1', start: 14, end: 23, text: 'brown fox' });
	});

	it("falls back to the platform's own position when the page's text is not known", () => {
		expect(threadPlaceOf({ blockId: 'b1' }, resolved(), null)).toMatchObject({ kind: 'range', start: 10, end: 19 });
	});

	it('says when only the block is left, and when nothing is', () => {
		expect(threadPlaceOf({ blockId: 'b1' }, resolved(), blocks(['b1', 'Gone.'])).kind).toBe('block-fallback');
		expect(threadPlaceOf({ blockId: 'b1' }, resolved(), blocks(['b2', 'Other'])).kind).toBe('orphaned');
	});

	it('places a thread without a range on its block, on the page, or nowhere', () => {
		expect(threadPlaceOf({ blockId: 'b1' }, null, blocks(['b1', 'Text']))).toMatchObject({ kind: 'block', blockId: 'b1' });
		expect(threadPlaceOf({ blockId: null }, null, blocks(['b1', 'Text'])).kind).toBe('page');
		expect(threadPlaceOf({ blockId: 'b9' }, null, blocks(['b1', 'Text']))).toMatchObject({ kind: 'orphaned', blockId: null });
	});
});

describe('anchorsByComment and storedAnchorOf', () => {
	it('keys the anchors by comment and keeps only what is stored', () => {
		const item = { ...ANCHOR, id: 'a1', commentId: 'c1', documentId: 'page-1', position: { status: 'exact', method: 'offsets', blockId: 'b1', start: 10, end: 19, text: 'brown fox' } } as IDocumentCommentAnchorResolved;
		const byComment = anchorsByComment([item, null as never]);
		expect([...byComment.keys()]).toEqual(['c1']);
		expect(storedAnchorOf(item)).toEqual({ ...ANCHOR, relativeStart: null, relativeEnd: null });
	});
});
