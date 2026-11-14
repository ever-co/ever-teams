import { z } from 'zod';

/** Gauzy refuses a longer token name (`CreateUserApiTokenDTO`). */
export const USER_API_TOKEN_NAME_MAX_LENGTH = 100;

/** The lifetimes Gauzy offers a personal API token (`UserApiTokenExpiryEnum`). */
export const USER_API_TOKEN_EXPIRIES = ['90d', '1y', 'never'] as const;

export const userApiTokenExpirySchema = z.enum(USER_API_TOKEN_EXPIRIES);

/** `GET /user-api-tokens/config`: whether this server has personal API tokens on. */
export const userApiTokenConfigSchema = z.object({
	enabled: z.boolean()
});

/** A token as the settings page shows it. Gauzy never lists the secret; the owner's ids are not kept either. */
export const userApiTokenSchema = z.object({
	id: z.string().min(1),
	name: z.string(),
	createdAt: z.string(),
	expiresAt: z.string().nullable(),
	lastUsedAt: z.string().nullable()
});

/** `GET /user-api-tokens`: the caller's own tokens that are not revoked. */
export const userApiTokenListSchema = z.object({
	items: z.array(userApiTokenSchema),
	total: z.number().optional()
});

/** `POST /user-api-tokens`: the token just created, with its secret, which Gauzy answers this once. */
export const createdUserApiTokenSchema = userApiTokenSchema.extend({
	token: z.string().min(1)
});

/** What the page sends to create a token, and all a proxy route forwards. */
export const createUserApiTokenInputSchema = z.object({
	name: z.string().trim().min(1).max(USER_API_TOKEN_NAME_MAX_LENGTH),
	expiry: userApiTokenExpirySchema
});

export type TUserApiTokenExpiry = z.infer<typeof userApiTokenExpirySchema>;
export type TUserApiTokenConfig = z.infer<typeof userApiTokenConfigSchema>;
export type TUserApiToken = z.infer<typeof userApiTokenSchema>;
export type TUserApiTokenList = z.infer<typeof userApiTokenListSchema>;
export type TCreatedUserApiToken = z.infer<typeof createdUserApiTokenSchema>;
export type TCreateUserApiTokenInput = z.infer<typeof createUserApiTokenInputSchema>;
