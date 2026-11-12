import qs from 'qs';
import { APIService } from '../../api.service';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { EBaseEntityEnum } from '@/core/types/generics/enums/entity';
import { PaginationResponse } from '@/core/types/interfaces/common/data-response';
import {
	IComment,
	ICommentCreateInput,
	ICommentResolveUpdate,
	ICommentTextUpdate,
	ICommentUpdateInput
} from '@/core/types/interfaces/common/comment';
import { IEntityRecordScope } from '@/core/types/interfaces/common/entity-record';

/** Gauzy's `PaginationQueryDTO.take` is `@Max(100)`: asking for more is a 400, not a bigger page. */
const COMMENTS_PAGE_SIZE = 100;

const COMMENT_AUTHOR_RELATIONS = [
	'employee',
	'employee.user',
	'createdByUser',
	'resolvedByEmployee',
	'resolvedByEmployee.user'
];

/**
 * Client for Gauzy's generic comment API (`/comment`), where a comment hangs off any record through
 * `(entity, entityId)`. Ported from the Gauzy UI's `CommentService` (`packages/ui-core/core/src/lib/services/comment`).
 */
class CommentService extends APIService {
	/**
	 * All of a record's comments with their authors, oldest first, read page by page until `total`: with the
	 * oldest first, a single page would leave out the newest comments.
	 */
	getAll = async (
		entity: EBaseEntityEnum,
		entityId: string,
		scope: IEntityRecordScope,
		signal?: AbortSignal
	): Promise<PaginationResponse<IComment>> => {
		const items: IComment[] = [];
		let total = 0;

		do {
			const page = await this.getPage(entity, entityId, scope, items.length, signal);
			total = page.total;
			items.push(...page.items);
			// An empty page ends the read even if `total` says more, so a shrinking list cannot loop forever.
			if (page.items.length === 0) {
				break;
			}
		} while (items.length < total);

		return { items, total };
	};

	/** Posts a comment. The author is never sent: Gauzy takes it from the caller's token. */
	create = async (input: ICommentCreateInput): Promise<IComment> => {
		const response = await this.post<IComment>('/comment', input);

		return response.data;
	};

	/**
	 * Edits, resolves or reopens a comment. Gauzy finds the comment on the caller's employee: only its author may
	 * change it, `resolved` included (anyone else gets a 400). A text edit stamps `editedAt` and replaces the
	 * comment's mentions with `mentionEmployeeIds` (an empty list removes them all). The record's scope goes with
	 * the body when the caller has it (a task's comments).
	 */
	update = async (
		id: string,
		input: ICommentUpdateInput | ICommentTextUpdate,
		scope?: IEntityRecordScope
	): Promise<IComment> => {
		const response = await this.put<IComment>(`/comment/${encodeURIComponent(id)}`, { ...input, ...scope });

		return response.data;
	};

	/** Removes a comment (its author's to remove). */
	remove = async (id: string): Promise<void> => {
		await this.delete<unknown>(`/comment/${encodeURIComponent(id)}`);

		return;
	};

	/**
	 * Resolves or reopens a comment thread. The platform records the caller as the resolver whatever employee the
	 * body names, so the caller's own is sent; a reopen clears it.
	 */
	setResolved = async (id: string, input: ICommentResolveUpdate, scope: IEntityRecordScope): Promise<IComment> => {
		const response = await this.put<IComment>(`/comment/${encodeURIComponent(id)}`, { ...input, ...scope });

		return response.data;
	};

	/** Withdraws a comment (a soft delete): {@link recover} brings it back. Its author only, as an edit. */
	softDelete = async (id: string, scope: IEntityRecordScope): Promise<void> => {
		await this.delete(`/comment/${encodeURIComponent(id)}/soft?${qs.stringify(scope)}`);
	};

	/** Brings a withdrawn comment back (the undo of {@link softDelete}). */
	recover = async (id: string, scope: IEntityRecordScope): Promise<void> => {
		await this.put(`/comment/${encodeURIComponent(id)}/recover?${qs.stringify(scope)}`);
	};

	private readonly getPage = async (
		entity: EBaseEntityEnum,
		entityId: string,
		scope: IEntityRecordScope,
		skip: number,
		signal?: AbortSignal
	): Promise<PaginationResponse<IComment>> => {
		// `where` carries the scope as well: Gauzy's `BaseQueryDTO.where` is `@IsNotEmpty()` and validates it.
		const query = qs.stringify({
			where: {
				entity,
				entityId,
				tenantId: scope.tenantId,
				organizationId: scope.organizationId
			},
			relations: COMMENT_AUTHOR_RELATIONS,
			// The id breaks timestamp ties, so page boundaries stay fixed between requests.
			order: { createdAt: 'ASC', id: 'ASC' },
			take: COMMENTS_PAGE_SIZE,
			// A row offset on `GET /comment`, not a page number.
			skip
		});
		const response = await this.get<PaginationResponse<IComment>>(`/comment?${query}`, { signal });

		return response.data;
	};
}

export const commentService = new CommentService(GAUZY_API_BASE_SERVER_URL.value);
