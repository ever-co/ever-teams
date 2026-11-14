// cspell:ignore FGHIJ
import { twoFactorProofSchema, twoFactorUserIdSchema, twoFactorVerifySchema } from './two-factor';

describe('two-factor request bodies', () => {
	it('accept a six-digit code or a recovery code', () => {
		expect(twoFactorProofSchema.safeParse({ code: '123456' }).success).toBe(true);
		expect(twoFactorProofSchema.safeParse({ recoveryCode: 'ABCDE-FGHIJ' }).success).toBe(true);
	});

	it('refuse a proof with neither, or with an unknown field', () => {
		expect(twoFactorProofSchema.safeParse({}).success).toBe(false);
		expect(twoFactorProofSchema.safeParse({ code: '  ' }).success).toBe(false);
		expect(twoFactorProofSchema.safeParse({ code: '123456', userId: 'someone-else' }).success).toBe(false);
	});

	it('ask a sign-in completion for its challenge and a proof', () => {
		expect(twoFactorVerifySchema.safeParse({ challenge: 'signed.challenge', code: '123456' }).success).toBe(true);
		expect(twoFactorVerifySchema.safeParse({ code: '123456' }).success).toBe(false);
		expect(twoFactorVerifySchema.safeParse({ challenge: 'signed.challenge' }).success).toBe(false);
	});

	it('take only a user id for a reset', () => {
		expect(twoFactorUserIdSchema.safeParse('3db49a7e-69d2-471a-9495-3b69ece6fc54').success).toBe(true);
		expect(twoFactorUserIdSchema.safeParse('../tenant').success).toBe(false);
	});
});
