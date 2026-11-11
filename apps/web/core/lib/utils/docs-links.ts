/**
 * The addresses of the Docs pages: a page, a place on it (`?block=<blockId>` scrolls to a block, `?thread=<commentId>`
 * opens a comment thread, `?comments=1` the comments), the task a link in a page points at, and where an Inbox entry
 * about a page leads.
 */

/** The anchors the editor gives the blocks (the platform accepts UUIDs only). */
const BLOCK_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const RECORD_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface DocsLinkTarget {
	block?: string | null;
	thread?: string | null;
	/** Opens the comments without a thread. */
	comments?: boolean;
}

/** A page's address, with a place on it. */
export function docsPageHref(pageId: string, target: DocsLinkTarget = {}): string {
	const params = new URLSearchParams();
	if (target.block) params.set('block', target.block);
	if (target.thread) params.set('thread', target.thread);
	if (target.comments && !target.thread) params.set('comments', '1');
	const query = params.toString();
	return `/docs/${encodeURIComponent(pageId)}${query ? `?${query}` : ''}`;
}

/** The place a page's address asks for; a value that is no id is ignored. */
export function docsLinkTargetOf(search: string | URLSearchParams | null | undefined): { block: string | null; thread: string | null; comments: boolean } {
	const params = typeof search === 'string' || !search ? new URLSearchParams(search ?? '') : search;
	const block = params.get('block');
	const thread = params.get('thread');
	return {
		block: block && BLOCK_ID_PATTERN.test(block) ? block : null,
		thread: thread && RECORD_ID_PATTERN.test(thread) ? thread : null,
		comments: params.get('comments') === '1'
	};
}

/** The address with the places of a page taken out, once the page went there. */
export function withoutDocsLinkTarget(href: string): string {
	const url = new URL(href, 'http://local.invalid');
	for (const key of ['block', 'thread', 'comments']) url.searchParams.delete(key);
	const query = url.searchParams.toString();
	return `${url.pathname}${query ? `?${query}` : ''}${url.hash}`;
}

/** The full address of a page (or a place on it), to copy. */
export function docsPageUrl(origin: string, pageId: string, target: DocsLinkTarget = {}): string {
	return `${origin.replace(/\/+$/, '')}${docsPageHref(pageId, target)}`;
}

/** A locale segment of the app's paths (`/en/…`, `/pt-BR/…`). */
const LOCALE_SEGMENT = /^[a-z]{2}(?:-[A-Za-z]{2,4})?$/;

/**
 * The task a link points at: this app's task page (`/task/<id>`, with or without a locale before it), on this origin or
 * relative. Any other address is no task.
 */
export function taskIdOfHref(href: string | null | undefined, origin: string): string | null {
	if (!href) return null;
	let url: URL;
	try {
		url = new URL(href, origin);
	} catch {
		return null;
	}
	if (url.origin !== new URL(origin).origin) return null;
	const segments = url.pathname.split('/').filter(Boolean);
	const start = segments.length > 0 && LOCALE_SEGMENT.test(segments[0]) && segments[0] !== 'task' ? 1 : 0;
	if (segments.length !== start + 2 || segments[start] !== 'task') return null;
	const id = decodeURIComponent(segments[start + 1]);
	return RECORD_ID_PATTERN.test(id) ? id : null;
}

/**
 * Where an Inbox entry about a page leads, or null when it is not about one:
 * - a comment on a page (a mention in it: entity `Comment`, its record in `metadata.parentEntity`) opens its thread;
 * - the page itself (a comment on a page the reader follows, a share, a review) opens the page, with the comments when
 *   the entry is about a comment.
 */
export function docsInboxHrefOf(
	entity: string | null | undefined,
	entityId: string | null | undefined,
	metadata: Record<string, unknown> | null | undefined,
	isComment = false
): string | null {
	if (!entityId) return null;
	if (entity === 'Document') return docsPageHref(entityId, { comments: isComment });
	if (entity === 'Comment' && metadata?.['parentEntity'] === 'Document') {
		const pageId = metadata['parentEntityId'];
		if (typeof pageId === 'string' && pageId.length > 0) return docsPageHref(pageId, { thread: entityId });
	}
	return null;
}

/** Whether an Inbox entry is about a page (for its group). */
export function isDocsInboxEntry(entity: string | null | undefined, metadata: Record<string, unknown> | null | undefined): boolean {
	return entity === 'Document' || entity === 'DocumentLink' || (entity === 'Comment' && metadata?.['parentEntity'] === 'Document');
}
