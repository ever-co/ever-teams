/**
 * The platform's documents as the Docs pages read them (`/plugins/docs/documents`): a page is a document of kind
 * `PAGE` whose content is the editor's JSON plus a rendered HTML cache; a folder groups pages; files are the
 * uploads the task and project attachments already use.
 */

export enum EDocumentKind {
	FOLDER = 'FOLDER',
	PAGE = 'PAGE',
	FILE = 'FILE'
}

export enum EDocumentVisibility {
	/** Every member of the organization can read it. */
	ORGANIZATION = 'ORGANIZATION',
	/** Its author, and the people it is shared with. */
	PRIVATE = 'PRIVATE',
	/** The members of a team (`organizationTeamId`), on a platform with Docs collaboration on. */
	TEAM = 'TEAM'
}

/** The spaces of the tree: the organization's, one per team the reader is in, and the reader's private one. */
export type TDocumentSpaceKind = 'organization' | 'team' | 'private';

/** A space of the tree as the reader sees it (`GET /plugins/docs/documents/spaces`). */
export interface IDocumentSpace {
	kind: TDocumentSpaceKind;
	/** The team of a team space. */
	organizationTeamId?: string | null;
	name: string;
	documentCount: number;
}

/** Moves a page (with the sub-pages the reader may write, unless told otherwise) to another space. */
export interface IDocumentSpaceMoveInput {
	visibility: EDocumentVisibility;
	organizationTeamId?: string | null;
	applyToSubtree?: boolean;
}

/** Whether the reader follows a page (comments and changes reach the Inbox) and whether they muted it. */
export interface IDocumentFollowState {
	following: boolean;
	muted: boolean;
}

/** A node of the editor's document, as the platform stores it. */
export interface IDocumentNode {
	type?: string;
	attrs?: Record<string, unknown>;
	content?: IDocumentNode[];
	marks?: { type: string; attrs?: Record<string, unknown> }[];
	text?: string;
}

export interface IDocumentPage {
	id: string;
	tenantId?: string;
	organizationId?: string;
	kind: EDocumentKind;
	/** The parent folder or page; null or absent at the root. */
	parentId?: string | null;
	/** Sort order among its siblings. */
	index: number;
	name: string;
	/** An emoji, shown before the title. */
	icon?: string | null;
	color?: string | null;
	description?: string | null;
	/** The editor's document; only the single-page read carries it, the list never does. */
	contentJson?: IDocumentNode | null;
	/** The rendered cache of `contentJson`; same availability. */
	contentHtml?: string | null;
	/** A locked page is read-only until unlocked on the platform. */
	isLocked?: boolean;
	/** Bumped by the platform on every version snapshot. */
	version?: number;
	visibility: EDocumentVisibility;
	/** The team whose space holds the page (`visibility: TEAM`). */
	organizationTeamId?: string | null;
	/** The Docs trash: an archived page is hidden from the tree and can be restored. */
	isArchived?: boolean;
	archivedAt?: string | null;
	createdByUserId?: string | null;
	createdAt: string;
	updatedAt: string;
	/** A search result's snippet (`GET /plugins/docs/documents?q=…`); a platform without snippets sends none. */
	searchSnippet?: IDocumentSearchSnippet | null;
}

/** One match of a search term: `[start, end)` UTF-16 offsets into a snippet's text (or into a document's name). */
interface IDocumentSearchMatchRange {
	start: number;
	end: number;
}

/**
 * Which text a snippet was cut from: the page's text, a file's extracted text, the description, or — when only the
 * name matched — the beginning of the text (`leading`, without matches).
 */
type TDocumentSearchSnippetSource = 'content' | 'extractedText' | 'description' | 'leading';

/** The plain-text snippet of a search result: about 160 characters around the first match, never HTML. */
export interface IDocumentSearchSnippet {
	source: TDocumentSearchSnippetSource;
	/** Whitespace collapsed, cut at word boundaries. */
	text: string;
	/** Every match of the term inside `text`, in order. */
	matches: IDocumentSearchMatchRange[];
	/** The matches of the term in the document's `name`. */
	nameMatches: IDocumentSearchMatchRange[];
	/** Text was cut before the snippet: an ellipsis goes first. */
	truncatedStart: boolean;
	/** Text was cut after the snippet: an ellipsis goes last. */
	truncatedEnd: boolean;
}

/**
 * Where a page comment was made: a range of one block's text. A block is a node of the page's JSON with a `blockId`;
 * its text is the `text` of every text node under it, in order, with nothing between them (a mention or a hard break
 * adds nothing). `start` / `end` are UTF-16 offsets into that text, `end` excluded.
 */
export interface IDocumentCommentAnchorInput {
	blockId: string;
	start: number;
	end: number;
	/** The text the range covered, exactly `blockText.slice(start, end)`, at most 1000 characters. */
	quote: string;
	/** Up to 32 characters of the block's text right before the range. */
	prefix?: string | null;
	/** Up to 32 characters of the block's text right after the range. */
	suffix?: string | null;
	/** Live sessions only: base64 `Y.RelativePosition` of `start` in the page's shared document (both or neither). */
	relativeStart?: string | null;
	relativeEnd?: string | null;
}

/**
 * How an anchor was found again in the page as it is now: `exact` (the range still covers the quote), `moved` (the
 * quote was found elsewhere, or approximately), `block` (only the block is left), `orphaned` (neither is).
 */
export type TDocumentCommentAnchorStatus = 'exact' | 'moved' | 'block' | 'orphaned';

/** What found an anchor again. */
export type TDocumentCommentAnchorMethod = 'offsets' | 'relative' | 'quote' | 'fuzzy' | 'block';

/** Where an anchor is now; `start` / `end` / `text` are null without a range. */
export interface IDocumentCommentAnchorPosition {
	status: TDocumentCommentAnchorStatus;
	method: TDocumentCommentAnchorMethod | null;
	blockId: string | null;
	start: number | null;
	end: number | null;
	text: string | null;
}

/** A comment's stored anchor, with where the platform found it in the page as it stores it. */
export interface IDocumentCommentAnchorResolved extends IDocumentCommentAnchorInput {
	id?: string;
	commentId: string;
	documentId: string;
	createdAt?: string;
	updatedAt?: string;
	position: IDocumentCommentAnchorPosition;
}

/** `GET /plugins/docs/documents/:id/comment-anchors`. */
export interface IDocumentCommentAnchorList {
	documentId: string;
	/** The page's revision the positions were computed on. */
	revision: number;
	/** The positions were computed on the page's live state. */
	live: boolean;
	items: IDocumentCommentAnchorResolved[];
}

export interface IDocumentPageList {
	items: IDocumentPage[];
	total: number;
}

export interface IDocumentVersion {
	id: string;
	documentId: string;
	/** The title at capture time. */
	name: string;
	contentJson?: IDocumentNode | null;
	contentHtml?: string | null;
	/** Capture time; the history is ordered by it. */
	lastSavedAt: string;
	/** The employee whose save triggered the capture; absent for platform writes. */
	createdById?: string | null;
	createdBy?: {
		id: string;
		user?: { id?: string; name?: string | null; firstName?: string | null; lastName?: string | null; imageUrl?: string | null } | null;
	} | null;
	createdAt?: string;
}

export interface IDocumentVersionList {
	items: IDocumentVersion[];
	total: number;
}

/** One step of a page's path, root first; `restricted` hides the name of an ancestor the reader may not see. */
export interface IDocumentPathSegment {
	id: string | null;
	name?: string;
	kind?: EDocumentKind;
	restricted?: boolean;
}

export type TDocumentArchivedFilter = 'exclude' | 'include' | 'only';

export interface IDocumentListQuery {
	kind?: EDocumentKind[];
	/** A parent id, or `root` for the top level. */
	parentId?: string | 'root';
	archived?: TDocumentArchivedFilter;
	visibility?: EDocumentVisibility;
	/** Free text; matched against the names, or the names and the text with `searchIn: 'content'`. */
	q?: string;
	searchIn?: 'name' | 'content';
	sort?: 'name' | 'updatedAt' | 'createdAt' | 'size' | 'kind';
	sortOrder?: 'ASC' | 'DESC';
	take?: number;
	skip?: number;
}

export interface IDocumentCreateInput {
	kind: EDocumentKind;
	name: string;
	parentId?: string | null;
	index?: number;
	icon?: string | null;
	color?: string | null;
	description?: string | null;
	contentJson?: IDocumentNode;
	contentHtml?: string;
	visibility?: EDocumentVisibility;
	/** With `visibility: TEAM`: the team whose space the page goes in. */
	organizationTeamId?: string | null;
	mentionEmployeeIds?: string[];
}

export interface IDocumentUpdateInput {
	name?: string;
	icon?: string | null;
	color?: string | null;
	description?: string | null;
	visibility?: EDocumentVisibility;
}

/** A content save; `expectedUpdatedAt` is the page's last known `updatedAt`, refused with 409 when stale. */
export interface IDocumentContentInput {
	contentJson: IDocumentNode;
	contentHtml?: string;
	expectedUpdatedAt: string;
	/** Capture a version before this write even inside the platform's debounce window. */
	forceSnapshot?: boolean;
	mentionEmployeeIds?: string[];
}

export interface IDocumentMoveInput {
	/** Null moves to the root. */
	parentId: string | null;
	index?: number;
}

export interface IDocumentDuplicateInput {
	/** Also copy the sub-pages. */
	deep?: boolean;
	parentId?: string;
	name?: string;
}

export type TDocumentDeleteStrategy = 'subtree' | 'promote-children';

/** A document attached to a record (a project, a task, a comment). */
export interface IDocumentLink {
	id: string;
	documentId: string;
	entity: string;
	entityId: string;
	document?: IDocumentPage | null;
	metadata?: unknown;
	createdAt?: string | null;
}

/** The platform's error codes the editor reacts to. */
export const DOCS_CONTENT_CONFLICT = 'DOCS_CONTENT_CONFLICT';
export const DOCS_LOCKED = 'DOCS_LOCKED';
/**
 * A zip export asked of a file (only pages and folders export).
 * @public Listed with the other Docs error codes; nothing in the app compares against it yet.
 */
export const DOCS_NOT_A_PAGE = 'DOCS_NOT_A_PAGE';

/** The platform refuses a list page of more rows than this (400 "take must not be greater than 100"). */
export const DOCS_LIST_PAGE_SIZE = 100;
/** The tree never loads more pages than this; a larger workspace browses by search. */
export const DOCS_TREE_MAX_PAGES = 2000;
/** The platform refuses a larger content save. */
export const DOCS_CONTENT_MAX_BYTES = 2 * 1024 * 1024;
