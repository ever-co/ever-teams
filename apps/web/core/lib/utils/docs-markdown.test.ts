import type { IDocumentNode } from '@/core/types/interfaces/common/docs';
import { documentToMarkdown, markdownFileName, mentionedEmployeeIds } from './docs-markdown';

const text = (value: string, marks: IDocumentNode['marks'] = []): IDocumentNode => ({ type: 'text', text: value, marks });
const paragraph = (...content: IDocumentNode[]): IDocumentNode => ({ type: 'paragraph', content });

describe('documentToMarkdown', () => {
	it('writes headings, paragraphs and marks', () => {
		const doc: IDocumentNode = {
			type: 'doc',
			content: [
				{ type: 'heading', attrs: { level: 2 }, content: [text('Plan')] },
				paragraph(text('A '), text('bold', [{ type: 'bold' }]), text(' and '), text('code', [{ type: 'code' }]), text(' '), text('link', [{ type: 'link', attrs: { href: 'https://example.com' } }]))
			]
		};
		expect(documentToMarkdown(doc)).toBe('## Plan\n\nA **bold** and `code` [link](https://example.com)\n');
	});

	it('writes lists, to-do lists and nested blocks', () => {
		const doc: IDocumentNode = {
			type: 'doc',
			content: [
				{
					type: 'bulletList',
					content: [
						{ type: 'listItem', content: [paragraph(text('one')), { type: 'bulletList', content: [{ type: 'listItem', content: [paragraph(text('nested'))] }] }] },
						{ type: 'listItem', content: [paragraph(text('two'))] }
					]
				},
				{ type: 'orderedList', attrs: { start: 3 }, content: [{ type: 'listItem', content: [paragraph(text('three'))] }] },
				{
					type: 'taskList',
					content: [
						{ type: 'taskItem', attrs: { checked: true }, content: [paragraph(text('done'))] },
						{ type: 'taskItem', attrs: { checked: false }, content: [paragraph(text('open'))] }
					]
				}
			]
		};
		expect(documentToMarkdown(doc)).toBe('- one\n  - nested\n- two\n\n3. three\n\n- [x] done\n- [ ] open\n');
	});

	it('writes quotes, code, rules, pictures, mentions and tables', () => {
		const doc: IDocumentNode = {
			type: 'doc',
			content: [
				{ type: 'blockquote', content: [paragraph(text('quoted'))] },
				{ type: 'codeBlock', attrs: { language: 'ts' }, content: [text('const a = 1;')] },
				{ type: 'horizontalRule' },
				{ type: 'image', attrs: { src: 'https://x/y.png', alt: 'shot' } },
				paragraph(text('hi '), { type: 'mention', attrs: { id: 'e1', label: 'Ada' } }),
				{
					type: 'table',
					content: [
						{ type: 'tableRow', content: [{ type: 'tableHeader', content: [paragraph(text('a'))] }, { type: 'tableHeader', content: [paragraph(text('b'))] }] },
						{ type: 'tableRow', content: [{ type: 'tableCell', content: [paragraph(text('1|2'))] }, { type: 'tableCell', content: [paragraph(text('3'))] }] }
					]
				}
			]
		};
		expect(documentToMarkdown(doc)).toBe(
			'> quoted\n\n```ts\nconst a = 1;\n```\n\n---\n\n![shot](https://x/y.png)\n\nhi @Ada\n\n| a | b |\n| --- | --- |\n| 1\\|2 | 3 |\n'
		);
	});

	it('escapes Markdown characters in text and flattens unknown nodes', () => {
		const doc: IDocumentNode = {
			type: 'doc',
			content: [{ type: 'callout', content: [paragraph(text('a*b_c'))] }, { type: 'mystery' }]
		};
		expect(documentToMarkdown(doc)).toBe('a\\*b\\_c\n');
		expect(documentToMarkdown(null)).toBe('');
	});
});

describe('markdownFileName', () => {
	it('strips what a file name cannot hold', () => {
		expect(markdownFileName('Release: plan / Q4?')).toBe('Release plan Q4.md');
		expect(markdownFileName('   ')).toBe('page.md');
		expect(markdownFileName('x'.repeat(100))).toBe(`${'x'.repeat(80)}.md`);
	});
});

describe('mentionedEmployeeIds', () => {
	it('collects every mention once, in reading order', () => {
		const doc: IDocumentNode = {
			type: 'doc',
			content: [
				paragraph(text('hi '), { type: 'mention', attrs: { id: 'e2' } }, { type: 'mention', attrs: { id: 'e1' } }),
				{ type: 'bulletList', content: [{ type: 'listItem', content: [paragraph({ type: 'mention', attrs: { id: 'e2' } })] }] }
			]
		};
		expect(mentionedEmployeeIds(doc)).toEqual(['e2', 'e1']);
		expect(mentionedEmployeeIds(null)).toEqual([]);
	});
});
