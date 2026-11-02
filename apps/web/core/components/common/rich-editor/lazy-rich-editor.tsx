'use client';

import dynamic from 'next/dynamic';

/** Starts fetching the editor chunk, for instance when the pointer reaches an Edit button. */
export const preloadRichEditor = () => import('./rich-editor');

function RichEditorLoading() {
	return (
		<div role="status" aria-busy="true" className="flex min-h-24 flex-col gap-2 rounded-md px-3 py-2.5">
			<div className="h-3 w-2/3 animate-pulse rounded-md bg-foreground/[0.06]" />
			<div className="h-3 w-1/2 animate-pulse rounded-md bg-foreground/[0.06]" />
		</div>
	);
}

/**
 * The rich editor, loaded on demand (Tiptap and its menus are a separate chunk). Same props as `RichEditor`; a
 * description that is only read uses `RichTextView` and never loads this.
 */
export const LazyRichEditor = dynamic(() => preloadRichEditor().then((module) => module.RichEditor), {
	ssr: false,
	loading: RichEditorLoading
});
