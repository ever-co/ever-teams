import qs from 'qs';
import { APIService } from '../../api.service';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { EBaseEntityEnum } from '@/core/types/generics/enums/entity';
import { PaginationResponse } from '@/core/types/interfaces/common/data-response';
import { IComment, ICommentCreateInput } from '@/core/types/interfaces/common/comment';
import { IEntityRecordScope } from '@/core/types/interfaces/common/entity-record';

/** Gauzy's `PaginationQueryDTO.take` is `@Max(100)`: asking for more is a 400, not a bigger page. */
const COMMENTS_PAGE_SIZE = 100;

const COMMENT_AUTHOR_RELATIONS = ['employee', 'employee.user', 'createdByUser'];

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
