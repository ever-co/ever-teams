'use client';

import { useCallback, useEffect, useRef } from 'react';
import { RichEditor, type RichEditorHandle } from '@/core/components/common/rich-editor/rich-editor';
import type { MentionCandidate } from '@/core/components/common/rich-editor/mention-extension';
import { mentionedEmployeeIds } from '@/core/lib/utils/docs-markdown';
import type { IDocumentNode } from '@/core/types/interfaces/common/docs';

/** What the page view can ask the editor once it is up. */
export interface DocsEditorApi {
	getJson: () => IDocumentNode | null;
	focus: (position?: 'start' | 'end') => void;
}

interface DocsEditorSurfaceProps {
	/** The stored HTML of the page. */
	value: string;
	onChange: (html: string, json: IDocumentNode | null, mentionEmployeeIds: string[]) => void;
	onReady?: (api: DocsEditorApi) => void;
	onSaveShortcut?: () => void;
	mentions: readonly MentionCandidate[];
	placeholder: string;
	disabled?: boolean;
	title?: string;
}

/**
 * The page body: the app's rich editor, in this module so the Tiptap chunk loads with the page view and not
 * with the tree. Every change hands back the HTML (what the page shows) and the editor's JSON (what the
 * platform keeps as the canonical text).
 */
export function DocsEditorSurface({ value, onChange, onReady, onSaveShortcut, mentions, placeholder, disabled, title }: DocsEditorSurfaceProps) {
	const editorRef = useRef<RichEditorHandle>(null);

	const getJson = useCallback((): IDocumentNode | null => {
		const editor = editorRef.current?.editor;
		return editor ? (editor.getJSON() as IDocumentNode) : null;
	}, []);

	useEffect(() => {
		onReady?.({
			getJson,
			focus: (position) => editorRef.current?.focus(position)
		});
	}, [getJson, onReady]);

	const handleChange = useCallback(
		(html: string) => {
			const json = getJson();
			onChange(html, json, mentionedEmployeeIds(json));
		},
		[getJson, onChange]
	);

	return (
		<div
			className="docs-editor-surface min-h-[50vh]"
			onKeyDown={(event) => {
				if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
					event.preventDefault();
					onSaveShortcut?.();
				}
			}}
		>
			<RichEditor
				ref={editorRef}
				value={value}
				onChange={handleChange}
				placeholder={placeholder}
				chrome="bare"
				toolbar
				images
				mentions={mentions}
				disabled={disabled}
				contentClassName="min-h-[40vh] text-base"
				aria-label={title}
			/>
		</div>
	);
}
