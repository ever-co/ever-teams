import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { APIService } from '@/core/services/client/api.service';
import { validateApiResponse } from '@/core/types/schemas';
import {
	createdUserApiTokenSchema,
	userApiTokenConfigSchema,
	userApiTokenListSchema,
	type TCreatedUserApiToken,
	type TCreateUserApiTokenInput,
	type TUserApiToken,
	type TUserApiTokenConfig
} from '@/core/types/schemas/user/user-api-token.schema';

/**
 * The signed-in person's personal API tokens. Direct mode calls Gauzy's `/user-api-tokens` routes; proxy mode calls
 * the app's `/api/user-api-tokens` twins, which have the same paths.
 */
class UserApiTokensService extends APIService {
	/** Whether this server has the tokens on (`GAUZY_USER_API_TOKENS_ENABLED`); an API without the route answers 404. */
	readConfig = async (signal?: AbortSignal): Promise<TUserApiTokenConfig> => {
		const response = await this.get<unknown>('/user-api-tokens/config', { signal });
		return validateApiResponse(userApiTokenConfigSchema, response.data, 'userApiTokens.config API response');
	};

	/** The person's tokens that are not revoked, expired ones included; never their secrets. */
	list = async (signal?: AbortSignal): Promise<TUserApiToken[]> => {
		const response = await this.get<unknown>('/user-api-tokens', { signal });
		const page = validateApiResponse(userApiTokenListSchema, response.data, 'userApiTokens.list API response');
		return page.items;
	};

	/** Creates a token: the answer holds its secret, which no later read gives again. */
	create = async (input: TCreateUserApiTokenInput): Promise<TCreatedUserApiToken> => {
		const response = await this.post<unknown>('/user-api-tokens', input, undefined, false);
		return validateApiResponse(createdUserApiTokenSchema, response.data, 'userApiTokens.create API response');
	};

	/** Revokes a token at once: its secret is refused from then on. */
	revoke = async (id: string): Promise<void> => {
		await this.delete(`/user-api-tokens/${encodeURIComponent(id)}`);
	};
}

export const userApiTokensService = new UserApiTokensService(GAUZY_API_BASE_SERVER_URL.value);
