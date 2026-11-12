import { generateHTML, type Extensions, type JSONContent } from '@tiptap/core';
import { editorSchemaTypes, schemaExtensions } from '@/core/components/common/rich-editor/editor-extensions';
import { anchoredBlocksOf } from '@/core/lib/utils/docs-comments';
import { unsupportedTypesOf } from '@/core/lib/utils/docs-content';
import type { IDocumentNode } from '@/core/types/interfaces/common/docs';

let docsSchemaExtensions: Extensions | null = null;

/**
 * A page's HTML with its block anchors: rendered from the stored JSON when its blocks carry anchors (the platform's
 * HTML cache does not keep them) and the editor knows every type in it; the stored HTML otherwise. What the editor
 * opens, and what the read-only view shows, so a link to a block finds it in both.
 */
export function editorHtmlOf(value: string, json: IDocumentNode | null | undefined): string {
	if (!json || anchoredBlocksOf(json).order.length === 0) return value;
	try {
		docsSchemaExtensions ??= schemaExtensions();
		if (unsupportedTypesOf(json, editorSchemaTypes()).length > 0) return value;
		return generateHTML(json as JSONContent, docsSchemaExtensions);
	} catch {
		return value;
	}
}
