import { z } from 'zod';

/** A proof carries a six-digit code or a recovery code: a body with neither is refused before Gauzy. */
const hasProof = (proof: { code?: string; recoveryCode?: string }) => Boolean(proof.code || proof.recoveryCode);

/** A proof of the second factor: a six-digit code or a recovery code (Gauzy accepts 16 and 32 characters at most). */
export const twoFactorProofSchema = z
	.object({
		code: z.string().trim().max(16).optional(),
		recoveryCode: z.string().trim().max(32).optional()
	})
	.strict()
	.refine(hasProof);

/** `POST /api/auth/two-factor/confirm`: the first code from the app. */
export const twoFactorConfirmSchema = z.object({ code: z.string().trim().min(1).max(16) }).strict();

/** `POST /api/auth/two-factor/enroll`: the name the authenticator app shows. */
export const twoFactorEnrollSchema = z.object({ issuer: z.string().trim().max(64).optional() }).strict();

/** `POST /api/auth/two-factor/verify`: the challenge a sign-in answered, its proof, and the team to open. */
export const twoFactorVerifySchema = z
	.object({
		challenge: z.string().min(1).max(4096),
		code: z.string().trim().max(16).optional(),
		recoveryCode: z.string().trim().max(32).optional(),
		teamId: z.string().max(64).optional()
	})
	.strict()
	.refine(hasProof);

export const twoFactorUserIdSchema = z.guid();
