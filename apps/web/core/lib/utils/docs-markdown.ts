import type { IDocumentNode } from '@/core/types/interfaces/common/docs';

/**
 * A page's editor document as Markdown, for the export. Covers what the editor writes (headings, paragraphs,
 * lists and to-do lists, quotes, code, rules, pictures, links, mentions, tables); a node it does not know is
 * flattened to its text, so nothing is lost silently.
 */
export function documentToMarkdown(doc: IDocumentNode | null | undefined): string {
	if (!doc) return '';
	const blocks = blocksOf(doc.content ?? [], '');
	return `${blocks.join('\n\n').replace(/\n{3,}/g, '\n\n').trim()}\n`;
}

/** The export file name of a page. */
export function markdownFileName(title: string): string {
	const safe = title
		.trim()
		.replace(/[\\/:*?"<>|]+/g, ' ')
		.replace(/\s+/g, ' ')
		.trim()
		.slice(0, 80);
	return `${safe || 'page'}.md`;
}

function blocksOf(nodes: readonly IDocumentNode[], indent: string): string[] {
	const out: string[] = [];
	for (const node of nodes) {
		const block = blockOf(node, indent);
		if (block !== null) out.push(block);
	}
	return out;
}

function blockOf(node: IDocumentNode, indent: string): string | null {
	switch (node.type) {
		case 'paragraph':
			return indent + inlineOf(node.content ?? []);
		case 'heading': {
			const level = Math.min(6, Math.max(1, Number(node.attrs?.level ?? 1)));
			return `${indent}${'#'.repeat(level)} ${inlineOf(node.content ?? [])}`;
		}
		case 'bulletList':
			return listOf(node, indent, () => '- ');
		case 'orderedList': {
			const start = Number(node.attrs?.start ?? 1);
			return listOf(node, indent, (at) => `${start + at}. `);
		}
		case 'taskList':
			return listOf(node, indent, (_at, item) => (item.attrs?.checked ? '- [x] ' : '- [ ] '));
		case 'blockquote':
			return blocksOf(node.content ?? [], indent)
				.join('\n\n')
				.split('\n')
				.map((line) => `${indent}> ${line.slice(indent.length)}`)
				.join('\n');
		case 'codeBlock': {
			const language = String(node.attrs?.language ?? '');
			const code = (node.content ?? []).map((child) => child.text ?? '').join('');
			return `${indent}\`\`\`${language}\n${code}\n${indent}\`\`\``;
		}
		case 'horizontalRule':
			return `${indent}---`;
		case 'image': {
			const alt = String(node.attrs?.alt ?? node.attrs?.title ?? '');
			return `${indent}![${alt}](${String(node.attrs?.src ?? '')})`;
		}
		case 'table':
			return tableOf(node, indent);
		case 'hardBreak':
			return null;
		default: {
			if (node.text !== undefined) return indent + inlineOf([node]);
			const inner = blocksOf(node.content ?? [], indent);
			return inner.length > 0 ? inner.join('\n\n') : null;
		}
	}
}

function listOf(node: IDocumentNode, indent: string, marker: (at: number, item: IDocumentNode) => string): string {
	const lines: string[] = [];
	(node.content ?? []).forEach((item, at) => {
		const prefix = marker(at, item);
		const children = item.content ?? [];
		const [first, ...rest] = children;
		const firstText = first ? (blockOf(first, '') ?? '') : '';
		lines.push(`${indent}${prefix}${firstText}`);
		if (rest.length > 0) {
			const nested = blocksOf(rest, indent + ' '.repeat(prefix.length));
			lines.push(...nested);
		}
	});
	return lines.join('\n');
}

function tableOf(node: IDocumentNode, indent: string): string {
	const rows = (node.content ?? []).map((row) =>
		(row.content ?? []).map((cell) => blocksOf(cell.content ?? [], '').join(' ').replace(/\|/g, '\\|').replace(/\n/g, ' '))
	);
	if (rows.length === 0) return '';
	const width = Math.max(...rows.map((row) => row.length));
	const line = (cells: string[]) => `${indent}| ${Array.from({ length: width }, (_, at) => cells[at] ?? '').join(' | ')} |`;
	const [head, ...body] = rows;
	return [line(head), `${indent}| ${Array.from({ length: width }, () => '---').join(' | ')} |`, ...body.map(line)].join('\n');
}

function inlineOf(nodes: readonly IDocumentNode[]): string {
	return nodes.map(inlineNodeOf).join('');
}

function inlineNodeOf(node: IDocumentNode): string {
	switch (node.type) {
		case 'text':
			return withMarks(escapeText(node.text ?? ''), node.marks ?? []);
		case 'hardBreak':
			return '  \n';
		case 'mention': {
			const label = String(node.attrs?.label ?? node.attrs?.name ?? node.attrs?.id ?? '');
			return label ? `@${label}` : '';
		}
		case 'image': {
			const alt = String(node.attrs?.alt ?? '');
			return `![${alt}](${String(node.attrs?.src ?? '')})`;
		}
		default:
			return node.text !== undefined ? escapeText(node.text) : inlineOf(node.content ?? []);
	}
}

function withMarks(text: string, marks: readonly { type: string; attrs?: Record<string, unknown> }[]): string {
	if (text.length === 0) return text;
	let out = text;
	for (const mark of marks) {
		switch (mark.type) {
			case 'bold':
				out = `**${out}**`;
				break;
			case 'italic':
				out = `*${out}*`;
				break;
			case 'strike':
				out = `~~${out}~~`;
				break;
			case 'code':
				out = `\`${text}\``;
				break;
			case 'link':
				out = `[${out}](${String(mark.attrs?.href ?? '')})`;
				break;
			default:
				break;
		}
	}
	return out;
}

function escapeText(text: string): string {
	return text.replace(/([\\`*_~[\]])/g, '\\$1');
}

/** The employees mentioned in a document, once each, in reading order; the platform notifies them on save. */
export function mentionedEmployeeIds(doc: IDocumentNode | null | undefined): string[] {
	const ids: string[] = [];
	const seen = new Set<string>();
	const walk = (node: IDocumentNode | undefined) => {
		if (!node) return;
		if (node.type === 'mention') {
			const id = String(node.attrs?.id ?? '');
			if (id && !seen.has(id)) {
				seen.add(id);
				ids.push(id);
			}
		}
		for (const child of node.content ?? []) walk(child);
	};
	walk(doc ?? undefined);
	return ids;
}
