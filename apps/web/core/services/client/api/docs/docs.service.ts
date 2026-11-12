import qs from 'qs';
import { APIService } from '@/core/services/client/api.service';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import {
	DOCS_LIST_PAGE_SIZE,
	DOCS_TREE_MAX_PAGES,
	type IDocumentCommentAnchorInput,
	type IDocumentCommentAnchorList,
	type IDocumentCommentAnchorResolved,
	type IDocumentContentInput,
	type IDocumentCreateInput,
	type IDocumentDuplicateInput,
	type IDocumentFollowState,
	type IDocumentLink,
	type IDocumentListQuery,
	type IDocumentMoveInput,
	type IDocumentPage,
	type IDocumentPageList,
	type IDocumentPathSegment,
	type IDocumentSpace,
	type IDocumentSpaceMoveInput,
	type IDocumentUpdateInput,
	type IDocumentVersion,
	type IDocumentVersionList,
	type TDocumentDeleteStrategy
} from '@/core/types/interfaces/common/docs';
import type { DocsLiveAck, DocsLiveStatus } from '@/core/lib/docs-live/protocol';

const BASE = '/plugins/docs/documents';
const path = (id: string) => encodeURIComponent(id);

/**
 * Client of the platform's documents (`/plugins/docs/documents`) for the Docs pages: the tree, one page with its
 * content, content saves with conflict detection, moves, the trash, versions and the records a page is attached
 * to. Both transports (this app's `/api/plugins/docs/*` proxies, or the platform directly).
 *
 * The list endpoints read the organization from `where`; the detail endpoints take it at the top level and fall
 * back to the session's. Both are always sent, so a stale session never lists another organization.
 */
class DocsService extends APIService {
	private scope() {
		return { organizationId: this.organizationId, tenantId: this.tenantId };
	}

	private scopedQuery(extra: Record<string, unknown> = {}) {
		return qs.stringify({ ...this.scope(), ...extra }, { skipNulls: true });
	}

	// ---------------------------------------------------------------- lists

	list = async (query: IDocumentListQuery, signal?: AbortSignal): Promise<IDocumentPageList> => {
		const search = qs.stringify({ ...query, where: this.scope() }, { skipNulls: true });
		const response = await this.get<IDocumentPageList>(`${BASE}?${search}`, { signal });
		return response.data;
	};

	/**
	 * Every row of a query, page by page, up to the tree's cap. Beside `take` the platform reads `skip` as a page
	 * number counted from 1 (it skips `take * (skip - 1)` rows), not as a row offset.
	 */
	listAll = async (query: IDocumentListQuery, signal?: AbortSignal): Promise<IDocumentPage[]> => {
		const items: IDocumentPage[] = [];
		const seen = new Set<string>();
		for (let pageNumber = 1; ; pageNumber += 1) {
			const page = await this.list({ ...query, take: DOCS_LIST_PAGE_SIZE, skip: pageNumber }, signal);
			// A row that moved between two reads can come twice: it is kept once.
			for (const item of page.items) {
				if (seen.has(item.id)) continue;
				seen.add(item.id);
				items.push(item);
			}
			const read = pageNumber * DOCS_LIST_PAGE_SIZE;
			if (page.items.length < DOCS_LIST_PAGE_SIZE || read >= page.total || read >= DOCS_TREE_MAX_PAGES) break;
		}
		return items;
	};

	count = async (query: IDocumentListQuery, signal?: AbortSignal): Promise<number> => {
		const search = qs.stringify({ ...query, where: this.scope() }, { skipNulls: true });
		const response = await this.get<number>(`${BASE}/count?${search}`, { signal });
		return Number(response.data);
	};

	// ---------------------------------------------------------------- one page

	getPage = async (id: string, signal?: AbortSignal): Promise<IDocumentPage> => {
		const response = await this.get<IDocumentPage>(`${BASE}/${path(id)}?${this.scopedQuery()}`, { signal });
		return response.data;
	};

	getPath = async (id: string, signal?: AbortSignal): Promise<IDocumentPathSegment[]> => {
		const response = await this.get<IDocumentPathSegment[]>(`${BASE}/${path(id)}/path?${this.scopedQuery()}`, { signal });
		return response.data;
	};

	create = async (input: IDocumentCreateInput): Promise<IDocumentPage> => {
		const response = await this.post<IDocumentPage>(BASE, { ...input });
		return response.data;
	};

	update = async (id: string, input: IDocumentUpdateInput): Promise<IDocumentPage> => {
		const response = await this.put<IDocumentPage>(`${BASE}/${path(id)}`, { ...input, ...this.scope() });
		return response.data;
	};

	/** A content save: 409 when `expectedUpdatedAt` is stale, 423 when the page is locked. */
	updateContent = async (id: string, input: IDocumentContentInput): Promise<IDocumentPage> => {
		const response = await this.put<IDocumentPage>(`${BASE}/${path(id)}/content`, { ...input, ...this.scope() });
		return response.data;
	};

	// ---------------------------------------------------------------- tree

	move = async (id: string, input: IDocumentMoveInput): Promise<IDocumentPage> => {
		const response = await this.post<IDocumentPage>(`${BASE}/${path(id)}/move`, { ...input });
		return response.data;
	};

	reorder = async (parentId: string | null, orderedIds: string[]): Promise<void> => {
		await this.post<void>(`${BASE}/reorder`, { parentId, orderedIds });
	};

	duplicate = async (id: string, input: IDocumentDuplicateInput = {}): Promise<IDocumentPage> => {
		const response = await this.post<IDocumentPage>(`${BASE}/${path(id)}/duplicate`, { ...input });
		return response.data;
	};

	/** Into the trash. */
	archive = async (id: string): Promise<IDocumentPage> => {
		const response = await this.post<IDocumentPage>(`${BASE}/${path(id)}/archive`, {});
		return response.data;
	};

	/** Out of the trash. */
	unarchive = async (id: string): Promise<IDocumentPage> => {
		const response = await this.post<IDocumentPage>(`${BASE}/${path(id)}/unarchive`, {});
		return response.data;
	};

	/** Deletes on the platform (recoverable there by an administrator). */
	remove = async (id: string, strategy: TDocumentDeleteStrategy = 'subtree'): Promise<IDocumentPage> => {
		const response = await this.delete<IDocumentPage>(`${BASE}/${path(id)}?${this.scopedQuery({ strategy })}`);
		return response.data;
	};

	recover = async (id: string): Promise<IDocumentPage> => {
		const response = await this.post<IDocumentPage>(`${BASE}/${path(id)}/recover`, {});
		return response.data;
	};

	// ---------------------------------------------------------------- comment anchors

	/**
	 * The text-range anchors of the page's comments, each with where the platform finds it in the page as it stores it.
	 * A platform without ranges answers 404 (its comments are on their blocks).
	 */
	commentAnchors = async (id: string, signal?: AbortSignal): Promise<IDocumentCommentAnchorList> => {
		const response = await this.get<IDocumentCommentAnchorList>(`${BASE}/${path(id)}/comment-anchors?${this.scopedQuery()}`, { signal });
		return response.data;
	};

	/** Where a comment (a thread's first, by its author) was made: a range of one block's text. */
	setCommentAnchor = async (id: string, commentId: string, anchor: IDocumentCommentAnchorInput): Promise<IDocumentCommentAnchorResolved> => {
		// Exactly the anchor's fields: the platform refuses others.
		const body = {
			blockId: anchor.blockId,
			start: anchor.start,
			end: anchor.end,
			quote: anchor.quote,
			...(anchor.prefix ? { prefix: anchor.prefix } : {}),
			...(anchor.suffix ? { suffix: anchor.suffix } : {}),
			...(anchor.relativeStart && anchor.relativeEnd ? { relativeStart: anchor.relativeStart, relativeEnd: anchor.relativeEnd } : {}),
			...this.scope()
		};
		const response = await this.put<IDocumentCommentAnchorResolved>(`${BASE}/${path(id)}/comments/${path(commentId)}/anchor`, body);
		return response.data;
	};

	/** Takes a comment's range away (its author only): the comment is on its block again. */
	removeCommentAnchor = async (id: string, commentId: string): Promise<boolean> => {
		const response = await this.delete<{ removed: boolean }>(`${BASE}/${path(id)}/comments/${path(commentId)}/anchor?${this.scopedQuery()}`);
		return response.data?.removed === true;
	};

	// ---------------------------------------------------------------- export

	/**
	 * A page or a folder and the pages under it the reader may read, as a zip of Markdown files (`index.md` for the page
	 * or the folder's list, a folder per page with sub-pages and per sub-folder, links between them relative, the files
	 * they show under `assets/`). A platform that exports pages only answers 409 for a folder.
	 */
	exportSubtreeZip = async (id: string, signal?: AbortSignal): Promise<Blob> => {
		const response = await this.get<Blob>(`${BASE}/${path(id)}/export/markdown?${this.scopedQuery({ subtree: true })}`, {
			signal,
			responseType: 'blob'
		});
		return response.data;
	};

	// ---------------------------------------------------------------- versions

	versions = async (id: string, take: number, skip = 0, signal?: AbortSignal): Promise<IDocumentVersionList> => {
		const response = await this.get<IDocumentVersionList>(`${BASE}/${path(id)}/versions?${this.scopedQuery({ take, skip })}`, { signal });
		return response.data;
	};

	version = async (id: string, versionId: string, signal?: AbortSignal): Promise<IDocumentVersion> => {
		const response = await this.get<IDocumentVersion>(`${BASE}/${path(id)}/versions/${path(versionId)}?${this.scopedQuery()}`, { signal });
		return response.data;
	};

	/** Puts a version back as the content; the platform keeps the current content as a version first. */
	restoreVersion = async (id: string, versionId: string): Promise<IDocumentPage> => {
		const response = await this.post<IDocumentPage>(`${BASE}/${path(id)}/versions/${path(versionId)}/restore`, {});
		return response.data;
	};

	// ---------------------------------------------------------------- records

	/** The records (projects, tasks) a page is attached to. */
	links = async (id: string, signal?: AbortSignal): Promise<IDocumentLink[]> => {
		const response = await this.get<IDocumentLink[] | { items: IDocumentLink[] }>(`${BASE}/${path(id)}/links?${this.scopedQuery()}`, { signal });
		const data = response.data;
		return Array.isArray(data) ? data : (data?.items ?? []);
	};

	// ---------------------------------------------------------------- spaces and follows (Docs collaboration)

	/** The spaces of the tree the reader sees; 404 while the platform's Docs collaboration is off. */
	spaces = async (signal?: AbortSignal): Promise<IDocumentSpace[]> => {
		const response = await this.get<IDocumentSpace[]>(`${BASE}/spaces?${this.scopedQuery()}`, { signal });
		return Array.isArray(response.data) ? response.data : [];
	};

	/** Moves a page (with the sub-pages the reader may write, unless told otherwise) to another space. */
	moveToSpace = async (id: string, input: IDocumentSpaceMoveInput): Promise<IDocumentPage> => {
		const response = await this.post<IDocumentPage>(`${BASE}/${path(id)}/space`, { ...input, ...this.scope() });
		return response.data;
	};

	followState = async (id: string, signal?: AbortSignal): Promise<IDocumentFollowState> => {
		const response = await this.get<IDocumentFollowState>(`${BASE}/${path(id)}/follow`, { signal });
		return response.data;
	};

	/** Follows, unfollows, mutes or unmutes the page; answers the new state. */
	setFollow = async (id: string, action: 'follow' | 'unfollow' | 'mute' | 'unmute'): Promise<IDocumentFollowState> => {
		const response = await this.post<IDocumentFollowState>(`${BASE}/${path(id)}/${action}`, {});
		return response.data;
	};

	// ---------------------------------------------------------------- live sessions

	/** Whether the platform serves live sessions of pages; 404 when it does not. */
	liveStatus = async (): Promise<DocsLiveStatus> => {
		const response = await this.get<DocsLiveStatus>('/plugins/docs/live/status');
		return response.data;
	};

	/**
	 * An edit (a base64 Yjs update) of this tab's live session of the page. Exactly these fields: the platform refuses
	 * others, so the tenant and organization `post` adds to a body by default stay out (the headers carry them).
	 */
	liveUpdate = async (id: string, input: { connectionId: string; update: string }): Promise<DocsLiveAck> => {
		const response = await this.post<DocsLiveAck>(
			`${BASE}/${path(id)}/live/updates`,
			{ connectionId: input.connectionId, update: input.update },
			undefined,
			false
		);
		return response.data;
	};

	/** This tab's cursor and presence (a base64 y-protocols awareness update) in its live session of the page. */
	liveAwareness = async (id: string, input: { connectionId: string; awareness: string }): Promise<DocsLiveAck> => {
		const response = await this.post<DocsLiveAck>(
			`${BASE}/${path(id)}/live/awareness`,
			{ connectionId: input.connectionId, awareness: input.awareness },
			undefined,
			false
		);
		return response.data;
	};
}

export const docsService = new DocsService(GAUZY_API_BASE_SERVER_URL.value);
