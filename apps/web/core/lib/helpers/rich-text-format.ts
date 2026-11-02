import { marked } from 'marked';

/**
 * Task and project descriptions are stored by Gauzy as one string, read by the web, the mobile app and the Gauzy UI.
 * The editors write HTML. Older rows hold what earlier editors wrote: the Slate editor's HTML (inline code as
 * `<pre><code>` inside a paragraph, to-do items as `div.checklist-container`), Slate JSON, Markdown or plain text.
 * Everything here turns any of them into HTML the rich editor can open, without Slate in the bundle.
 */

export const isHtml = (value: string): boolean => {
	const htmlRegex = /<([a-z][a-z0-9]*)\b[^>]*>(.*?)<\/\1>/i;
	return htmlRegex.test(value);
};

export const isMarkdown = (value: string): boolean => {
	if (!value || typeof value !== 'string') return false;

	const markdownPatterns = [
		/^#{1,6}\s+.+$/m, // Headers: # ## ### etc.
		/\*\*.*?\*\*/, // Bold: **text**
		/\*.*?\*/, // Italic: *text*
		/`.*?`/, // Inline code: `code`
		/```[\s\S]*?```/, // Code blocks: ```code```
		/^\s*[-*+]\s+/m, // Unordered lists: - * +
		/^\s*\d+\.\s+/m, // Ordered lists: 1. 2. 3.
		/\[.*?\]\(.*?\)/, // Links: [text](url)
		/!\[.*?\]\(.*?\)/, // Images: ![alt](url)
		/^\s*>\s+/m, // Blockquotes: > text
		/^\s*---+\s*$/m, // Horizontal rules: ---
		/~~.*?~~/ // Strikethrough: ~~text~~
	];
	return markdownPatterns.some((pattern) => pattern.test(value));
};

export const isValidSlateObject = (value: unknown): boolean => {
	try {
		if (typeof value === 'string') {
			const parsed = JSON.parse(value);
			return (
				Array.isArray(parsed) &&
				parsed.every(
					(node) =>
						typeof node === 'object' && node !== null && 'children' in node && Array.isArray(node.children)
				)
			);
		}
		return false;
	} catch {
		return false;
	}
};

export const markdownToHtml = (markdown: string): string => {
	try {
		marked.setOptions({
			breaks: true,
			gfm: true
		});

		return marked(markdown) as string;
	} catch (error) {
		console.error('Error converting markdown to HTML:', error);
		return `<p>${markdown.replace(/\n/g, '<br>')}</p>`;
	}
};

const HTML_ESCAPES: Record<string, string> = {
	'&': '&amp;',
	'<': '&lt;',
	'>': '&gt;',
	'"': '&quot;',
	"'": '&#039;'
};

function escapeHtml(text: string) {
	return text.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
}

/** A block of plain text per blank-line-separated paragraph, single newlines kept as line breaks. */
export function plainTextToHtml(text: string) {
	const paragraphs = text.split(/\n{2,}/);
	const blocks = paragraphs.map((paragraph) => {
		const escaped = escapeHtml(paragraph);
		const withBreaks = escaped.replace(/\n/g, '<br>');
		return `<p>${withBreaks}</p>`;
	});
	return blocks.join('');
}

type SlateLeaf = {
	text: string;
	bold?: boolean;
	italic?: boolean;
	underline?: boolean;
	code?: boolean;
	strikethrough?: boolean;
};

type SlateElement = {
	type?: string;
	children: SlateNode[];
	align?: string;
	href?: string;
	url?: string;
	checked?: boolean;
};

type SlateNode = SlateLeaf | SlateElement;

const SLATE_BLOCK_TAGS: Record<string, string> = {
	paragraph: 'p',
	p: 'p',
	h1: 'h1',
	h2: 'h2',
	h3: 'h3',
	h4: 'h4',
	h5: 'h5',
	h6: 'h6',
	ul: 'ul',
	ol: 'ol',
	li: 'li',
	blockquote: 'blockquote',
	quote: 'blockquote'
};

const SLATE_MARK_TAGS: [keyof SlateLeaf, string][] = [
	['code', 'code'],
	['bold', 'strong'],
	['italic', 'em'],
	['underline', 'u'],
	['strikethrough', 's']
];

/** A to-do item in the exact shape the rich editor writes, so the read view draws its box too. */
function taskItemHtml(isChecked: boolean, innerHtml: string) {
	const checkedAttribute = checkedAttributeOf(isChecked);
	const checkedValue = String(isChecked);
	const box = `<label><input type="checkbox"${checkedAttribute}><span></span></label>`;
	return `<li data-type="taskItem" data-checked="${checkedValue}">${box}<div><p>${innerHtml}</p></div></li>`;
}

function checkedAttributeOf(isChecked: boolean) {
	if (isChecked) {
		return ' checked="checked"';
	}
	return '';
}

function isSlateLeaf(node: SlateNode): node is SlateLeaf {
	return 'text' in node;
}

function slateLeafToHtml(leaf: SlateLeaf) {
	const escaped = escapeHtml(leaf.text);
	let html = escaped.replace(/\n/g, '<br>');
	for (const [mark, tag] of SLATE_MARK_TAGS) {
		if (leaf[mark]) {
			html = `<${tag}>${html}</${tag}>`;
		}
	}
	return html;
}

function alignStyleOf(align: string | undefined) {
	if (!align) {
		return '';
	}
	return ` style="text-align: ${escapeHtml(align)}"`;
}

function slateChildrenToHtml(children: SlateNode[]): string {
	return children.map(slateNodeToHtml).join('');
}

function slateNodeToHtml(node: SlateNode): string {
	if (isSlateLeaf(node)) {
		return slateLeafToHtml(node);
	}
	const inner = slateChildrenToHtml(node.children ?? []);
	const type = node.type ?? 'paragraph';
	if (type === 'link') {
		const rawHref = node.href ?? node.url ?? '';
		const href = escapeHtml(rawHref);
		return `<a href="${href}">${inner}</a>`;
	}
	if (type === 'code') {
		return `<pre><code>${inner}</code></pre>`;
	}
	if (type === 'checklist') {
		const item = taskItemHtml(Boolean(node.checked), inner);
		return `<ul data-type="taskList">${item}</ul>`;
	}
	const tag = SLATE_BLOCK_TAGS[type] ?? 'p';
	const style = alignStyleOf(node.align);
	return `<${tag}${style}>${inner}</${tag}>`;
}

export function slateJsonToHtml(value: string) {
	const nodes = JSON.parse(value) as SlateNode[];
	return slateChildrenToHtml(nodes);
}

const TEXT_BLOCK = /<(p|h[1-6])(\s[^>]*)?>([\s\S]*?)<\/\1>/gi;
const PRE_TAG = /<\/?pre\b[^>]*>/gi;
const ONLY_ONE_PRE = /^\s*<pre\b[^>]*>(?:(?!<pre\b)[\s\S])*<\/pre>\s*$/i;

/**
 * The Slate serializer wrote inline code as `<pre><code>` inside the paragraph, and the mobile app writes its code
 * blocks as `<p><pre><code>`. A browser would split such a paragraph around the `<pre>`. A paragraph that holds
 * only the `<pre>` becomes the code block; a `<pre>` among words becomes inline code, as the Slate editor showed it.
 */
function unnestPreFromTextBlocks(html: string) {
	return html.replace(TEXT_BLOCK, (block: string, tag: string, attributes: string | undefined, inner: string) => {
		const hasPre = /<pre\b/i.test(inner);
		if (!hasPre) {
			return block;
		}
		if (ONLY_ONE_PRE.test(inner)) {
			return inner.trim();
		}
		const inlineCode = inner.replace(PRE_TAG, '');
		const blockAttributes = attributes ?? '';
		return `<${tag}${blockAttributes}>${inlineCode}</${tag}>`;
	});
}

function isChecklistDiv(node: Element | null): node is HTMLElement {
	if (!node) {
		return false;
	}
	return node.matches('div.checklist-container');
}

function checklistItemOf(doc: Document, container: Element) {
	const checkbox = container.querySelector('input');
	const isChecked = checkbox?.getAttribute('checked') === 'true';
	const label = container.querySelector('span');
	const template = doc.createElement('template');
	template.innerHTML = taskItemHtml(isChecked, label?.innerHTML ?? '');
	return template.content;
}

/** Consecutive Slate checklist rows become one Tiptap to-do list. */
function checklistsToTaskLists(html: string) {
	const hasChecklist = html.includes('checklist-container');
	const canParse = typeof DOMParser !== 'undefined';
	if (!hasChecklist || !canParse) {
		return html;
	}
	const doc = new DOMParser().parseFromString(html, 'text/html');
	const containers = Array.from(doc.querySelectorAll('div.checklist-container'));
	for (const container of containers) {
		if (!container.isConnected) {
			continue;
		}
		const list = doc.createElement('ul');
		list.setAttribute('data-type', 'taskList');
		container.before(list);
		let current: Element | null = container;
		while (isChecklistDiv(current)) {
			const next: Element | null = current.nextElementSibling;
			list.appendChild(checklistItemOf(doc, current));
			current.remove();
			current = next;
		}
	}
	return doc.body.innerHTML;
}

const BLOCK_TAG_AT_START = /^\s*<(p|div|h[1-6]|ul|ol|pre|blockquote|table|hr|br|img)\b/i;

function looksLikeHtml(value: string) {
	if (isHtml(value)) {
		return true;
	}
	return BLOCK_TAG_AT_START.test(value);
}

/** Any stored description, as HTML the rich editor opens. An empty description is an empty string. */
export function storedTextToEditorHtml(value: string | null | undefined) {
	const text = value ?? '';
	const isBlank = text.trim().length === 0;
	if (isBlank) {
		return '';
	}
	if (looksLikeHtml(text)) {
		const unnested = unnestPreFromTextBlocks(text);
		return checklistsToTaskLists(unnested);
	}
	if (isValidSlateObject(text)) {
		return slateJsonToHtml(text);
	}
	if (isMarkdown(text)) {
		return markdownToHtml(text);
	}
	return plainTextToHtml(text);
}
