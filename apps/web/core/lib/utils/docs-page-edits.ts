/**
 * Whether the platform holds what a page's editor shows: the live session's confirmation, or the autosave's save. A
 * block's anchor (what a comment or a `?block=` link names) is an edit of the page like any other: until the platform
 * holds it, it exists in this tab only, and a link or a comment naming it would lead nowhere.
 */
export interface DocsPageEdits {
	/** Edits wait to reach the platform at this moment (a live batch, a session that is down, a draft not saved yet). */
	pending(): boolean;
	/** Waits for them to reach it: `false` when they do not (a save failing or in conflict, a session that stays down). */
	hold(): Promise<boolean>;
}

/**
 * Whether an export of the platform's saved text (the PDF, the zip of Markdown files) may go: once the page's pending
 * edits are saved, or confirmed live (a reconnecting session's included). Never while the tab holds text `edits` does
 * not cover yet: the text a stopped live session left before the autosave adopted it (the page read again, the text
 * being adopted, or its adoption failed), or edits remembered from an earlier visit before the session's first sync.
 * The export would leave that text out.
 *
 * @param edits Where the page's edits stand.
 * @param uncovered The tab holds unsent text that `edits` does not cover yet.
 */
export async function holdForExport(edits: DocsPageEdits, uncovered: boolean): Promise<boolean> {
	if (uncovered) return false;
	return !edits.pending() || edits.hold();
}

/** How a block link's copy ended: copied, not copied because the page's edits were not saved, or refused by the browser. */
export type DocsBlockLinkCopy = 'copied' | 'unsaved' | 'copy-failed';

/**
 * Copies a link to a block once the platform holds the block's anchor, so it leads to the block for whoever opens it.
 * With nothing pending the link is written at once (in the click itself, which some browsers require to write the
 * clipboard); otherwise after the page's edits are held, or not at all when they are not.
 *
 * @param link The block's link.
 * @param edits Where the page's edits stand.
 * @param write Writes the clipboard (rejects without one, or when the browser refuses).
 */
export async function copyBlockLinkOnceHeld(
	link: string,
	edits: DocsPageEdits,
	write: (text: string) => Promise<void>
): Promise<DocsBlockLinkCopy> {
	if (edits.pending() && !(await edits.hold())) return 'unsaved';
	try {
		await write(link);
		return 'copied';
	} catch {
		return 'copy-failed';
	}
}
