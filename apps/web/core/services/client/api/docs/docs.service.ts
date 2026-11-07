import qs from 'qs';
import { APIService } from '@/core/services/client/api.service';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import {
	DOCS_LIST_PAGE_SIZE,
	DOCS_TREE_MAX_PAGES,
	type IDocumentContentInput,
	type IDocumentCreateInput,
	type IDocumentDuplicateInput,
	type IDocumentLink,
	type IDocumentListQuery,
	type IDocumentMoveInput,
	type IDocumentPage,
	type IDocumentPageList,
	type IDocumentPathSegment,
	type IDocumentUpdateInput,
	type IDocumentVersion,
	type IDocumentVersionList,
	type TDocumentDeleteStrategy
} from '@/core/types/interfaces/common/docs';

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

	/** Every page of a query, page by page, up to the tree's cap. */
	listAll = async (query: IDocumentListQuery, signal?: AbortSignal): Promise<IDocumentPage[]> => {
		const items: IDocumentPage[] = [];
		let skip = 0;
		for (;;) {
			const page = await this.list({ ...query, take: DOCS_LIST_PAGE_SIZE, skip }, signal);
			items.push(...page.items);
			skip += page.items.length;
			if (page.items.length === 0 || skip >= page.total || skip >= DOCS_TREE_MAX_PAGES) break;
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
}

export const docsService = new DocsService(GAUZY_API_BASE_SERVER_URL.value);
