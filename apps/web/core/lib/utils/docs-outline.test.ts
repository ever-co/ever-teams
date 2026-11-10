import type { IDocumentNode } from '@/core/types/interfaces/common/docs';
import { countWords, nodeText, outlineOf, textStatsOf } from './docs-outline';

const text = (value: string): IDocumentNode => ({ type: 'text', text: value });
const heading = (level: number, ...content: IDocumentNode[]): IDocumentNode => ({ type: 'heading', attrs: { level }, content });
const paragraph = (...content: IDocumentNode[]): IDocumentNode => ({ type: 'paragraph', content });
const doc = (...content: IDocumentNode[]): IDocumentNode => ({ type: 'doc', content });

describe('outlineOf', () => {
	it('lists the headings of levels 1 to 3 in document order, with their place among them', () => {
		const outline = outlineOf(
			doc(
				heading(1, text('Goals')),
				paragraph(text('Why we do this.')),
				heading(2, text('This '), text('quarter')),
				heading(4, text('Too deep to list')),
				{ type: 'blockquote', content: [heading(3, text('Inside a quote'))] }
			)
		);
		expect(outline).toEqual([
			{ level: 1, text: 'Goals', index: 0 },
			{ level: 2, text: 'This quarter', index: 1 },
			{ level: 3, text: 'Inside a quote', index: 2 }
		]);
	});

	it('skips a heading with no text but keeps its place, so the others still point at their own element', () => {
		const outline = outlineOf(doc(heading(2), heading(2, text('  ')), heading(2, text('Kept'))));
		expect(outline).toEqual([{ level: 2, text: 'Kept', index: 2 }]);
	});

	it('answers an empty outline for a page with no content', () => {
		expect(outlineOf(null)).toEqual([]);
		expect(outlineOf(doc())).toEqual([]);
	});
});

describe('nodeText', () => {
	it('reads a mention as its label and a line break as a space', () => {
		expect(nodeText(paragraph(text('Ask'), { type: 'hardBreak' }, { type: 'mention', attrs: { id: 'e1', label: 'Ada' } }))).toBe('Ask @Ada');
	});
});

describe('countWords', () => {
	it('counts words separated by any white space', () => {
		expect(countWords('  one two\nthree\tfour ')).toBe(4);
		expect(countWords('')).toBe(0);
	});

	it('counts text written without spaces by its characters', () => {
		expect(countWords('这是一个测试')).toBe(3);
	});
});

describe('textStatsOf', () => {
	it('counts across blocks without joining the last word of one to the first of the next', () => {
		const stats = textStatsOf(doc(heading(1, text('Release notes')), paragraph(text('Two words')), { type: 'bulletList', content: [{ type: 'listItem', content: [paragraph(text('one'))] }] }));
		expect(stats).toEqual({ words: 5, minutes: 1 });
	});

	it('answers zero minutes for an empty page and rounds longer pages to whole minutes', () => {
		expect(textStatsOf(doc(paragraph()))).toEqual({ words: 0, minutes: 0 });
		const long = textStatsOf(doc(paragraph(text(Array.from({ length: 900 }, () => 'word').join(' ')))));
		expect(long).toEqual({ words: 900, minutes: 5 });
	});
});
