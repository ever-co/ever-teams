import qs from 'qs';
import { APIService } from '../../api.service';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { EBaseEntityEnum } from '@/core/types/generics/enums/entity';
import { IEntityRecordScope } from '@/core/types/interfaces/common/entity-record';
import { IReactionSummary, IReactionToggleInput } from '@/core/types/interfaces/common/reaction';

/**
 * Client for the reactions on comments: the platform's summary of a record's comments (`GET /reaction/comments`,
 * everyone's reactions on the comments the caller can list) and its toggle (`POST /reaction`).
 */
class CommentReactionService extends APIService {
	/** The reactions on the comments of one record (a task), one entry per comment and emoji. */
	getForRecord = async (
		entity: EBaseEntityEnum,
		entityId: string,
		scope: IEntityRecordScope,
		signal?: AbortSignal
	): Promise<IReactionSummary[]> => {
		const query = qs.stringify({
			entity,
			entityId,
			tenantId: scope.tenantId,
			organizationId: scope.organizationId
		});
		const response = await this.get<IReactionSummary[]>(`/reaction/comments?${query}`, { signal });

		return Array.isArray(response.data) ? response.data : [];
	};

	/**
	 * Adds the caller's reaction, or takes it back when they already reacted with that emoji: the platform answers the
	 * new reaction, or nothing for a take-back.
	 */
	toggle = async (input: IReactionToggleInput): Promise<void> => {
		await this.post('/reaction', input);
	};
}

export const commentReactionService = new CommentReactionService(GAUZY_API_BASE_SERVER_URL.value);
