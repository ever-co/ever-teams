import type { IDocumentNode } from '@/core/types/interfaces/common/docs';

/** The CSS selector of the headings the outline lists (levels 1 to 3), in document order (what `index` counts). */
export const DOCS_OUTLINE_SELECTOR = 'h1, h2, h3';

/** The words an adult reads per minute, for the reading time. */
const WORDS_PER_MINUTE = 200;

export interface DocsOutlineItem {
	level: 1 | 2 | 3;
	text: string;
	/** The heading's place among the listed headings of the page, in document order. */
	index: number;
}

interface DocsTextStats {
	words: number;
	/** Whole minutes to read the page; 0 for an empty page. */
	minutes: number;
}

/** The plain text of a node and everything inside it. */
export function nodeText(node: IDocumentNode | null | undefined): string {
	if (!node) return '';
	if (typeof node.text === 'string') return node.text;
	if (node.type === 'hardBreak') return ' ';
	if (node.type === 'mention') {
		const label = node.attrs?.label;
		return typeof label === 'string' && label ? `@${label}` : '';
	}
	return (node.content ?? []).map(nodeText).join('');
}

/** The headings of a page, in document order. A heading with no text is not listed, but it still counts. */
export function outlineOf(doc: IDocumentNode | null | undefined): DocsOutlineItem[] {
	const items: DocsOutlineItem[] = [];
	let index = 0;
	const walk = (node: IDocumentNode) => {
		if (node.type === 'heading') {
			const level = Number(node.attrs?.level);
			if (level === 1 || level === 2 || level === 3) {
				const text = nodeText(node).replace(/\s+/g, ' ').trim();
				if (text) items.push({ level, text, index });
				index += 1;
			}
			return;
		}
		for (const child of node.content ?? []) walk(child);
	};
	if (doc) walk(doc);
	return items;
}

/** The words of some plain text. Text written without spaces between words counts one word per two characters. */
export function countWords(text: string): number {
	let words = 0;
	for (const chunk of text.split(/\s+/)) {
		if (!chunk) continue;
		// Han, kana and Hangul run together without spaces: about two characters a word.
		const dense = chunk.match(/[぀-ヿ㐀-鿿가-힯]/g)?.length ?? 0;
		words += dense > 0 ? Math.ceil(dense / 2) + (chunk.length > dense ? 1 : 0) : 1;
	}
	return words;
}

/** The word count and the reading time of a page. */
export function textStatsOf(doc: IDocumentNode | null | undefined): DocsTextStats {
	const blocks: string[] = [];
	const walk = (node: IDocumentNode) => {
		const children = node.content ?? [];
		const isLeafBlock = children.length === 0 || children.some((child) => typeof child.text === 'string' || child.type === 'hardBreak' || child.type === 'mention');
		if (isLeafBlock) {
			blocks.push(nodeText(node));
			return;
		}
		for (const child of children) walk(child);
	};
	if (doc) walk(doc);
	const words = countWords(blocks.join(' '));
	return { words, minutes: words === 0 ? 0 : Math.max(1, Math.round(words / WORDS_PER_MINUTE)) };
}
