import type { IDocumentNode } from '@/core/types/interfaces/common/docs';

/** The node and mark types an editor's schema knows. */
export interface DocsEditorTypes {
	nodes: ReadonlySet<string>;
	marks: ReadonlySet<string>;
}

/**
 * The node and mark types of a page's JSON that the editor does not know (written by another client). The app's
 * editor would drop them when it opens the page and save the reduced text: such a page is shown read-only instead.
 */
export function unsupportedTypesOf(json: IDocumentNode | null | undefined, known: DocsEditorTypes): string[] {
	const unknown = new Set<string>();
	const walk = (node: IDocumentNode | null | undefined, depth: number) => {
		if (!node || typeof node !== 'object' || depth > 200) return;
		if (typeof node.type === 'string' && !known.nodes.has(node.type)) unknown.add(node.type);
		for (const mark of (node as { marks?: Array<{ type?: unknown }> }).marks ?? []) {
			if (typeof mark?.type === 'string' && !known.marks.has(mark.type)) unknown.add(mark.type);
		}
		for (const child of (node.content ?? []) as IDocumentNode[]) walk(child, depth + 1);
	};
	walk(json, 0);
	return [...unknown].sort();
}
