import type { IDocumentNode } from '@/core/types/interfaces/common/docs';

/** What a section of a template starts with under its heading. */
type DocsTemplateBlock = 'text' | 'bullets' | 'todos';

interface DocsTemplateSection {
	heading: string;
	block: DocsTemplateBlock;
}

export interface DocsTemplateContent {
	contentJson: IDocumentNode;
	contentHtml: string;
}

/** The page templates the Docs home offers, with the emoji a page made from one starts with. */
export const DOCS_TEMPLATES = [
	{ id: 'meeting', icon: '🗓️', blocks: ['bullets', 'bullets', 'text', 'todos'] },
	{ id: 'brief', icon: '🎯', blocks: ['text', 'text', 'bullets', 'bullets', 'bullets'] },
	{ id: 'decision', icon: '⚖️', blocks: ['text', 'bullets', 'text', 'bullets'] }
] as const satisfies readonly { id: string; icon: string; blocks: readonly DocsTemplateBlock[] }[];

export type DocsTemplateId = (typeof DOCS_TEMPLATES)[number]['id'];

function escapeHtml(value: string): string {
	return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const EMPTY_PARAGRAPH: IDocumentNode = { type: 'paragraph' };

function blockJson(block: DocsTemplateBlock): IDocumentNode {
	if (block === 'bullets') return { type: 'bulletList', content: [{ type: 'listItem', content: [EMPTY_PARAGRAPH] }] };
	if (block === 'todos') return { type: 'taskList', content: [{ type: 'taskItem', attrs: { checked: false }, content: [EMPTY_PARAGRAPH] }] };
	return EMPTY_PARAGRAPH;
}

function blockHtml(block: DocsTemplateBlock): string {
	if (block === 'bullets') return '<ul><li><p></p></li></ul>';
	if (block === 'todos') return '<ul data-type="taskList"><li data-type="taskItem" data-checked="false"><p></p></li></ul>';
	return '<p></p>';
}

/**
 * The starting content of a page made from a template: a heading per section and, under it, an empty line, an empty
 * list or an empty to-do, as the editor's document and as the HTML the editor opens.
 */
export function buildTemplateContent(sections: readonly DocsTemplateSection[]): DocsTemplateContent {
	const content: IDocumentNode[] = [];
	let html = '';
	for (const section of sections) {
		const heading = section.heading.trim();
		if (heading) {
			content.push({ type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: heading }] });
			html += `<h2>${escapeHtml(heading)}</h2>`;
		}
		content.push(blockJson(section.block));
		html += blockHtml(section.block);
	}
	if (content.length === 0) return { contentJson: { type: 'doc', content: [EMPTY_PARAGRAPH] }, contentHtml: '' };
	return { contentJson: { type: 'doc', content }, contentHtml: html };
}
