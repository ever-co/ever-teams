/**
 * The signed-in user's address verification status: Gauzy's answer where the deployment verifies addresses, and
 * `null` where it answers 404 because FEATURE_EMAIL_VERIFICATION is off (ever-co/ever-teams#5677).
 */
import { emailVerificationService } from './email-verification.service';

describe('emailVerificationService.getVerificationStatus', () => {
	afterEach(() => {
		jest.restoreAllMocks();
	});

	it("answers Gauzy's status where the deployment verifies addresses", async () => {
		const status = { isEmailVerified: false, verificationEmailSent: true };
		const get = jest.spyOn(emailVerificationService, 'get').mockResolvedValue({ data: status } as never);

		await expect(emailVerificationService.getVerificationStatus()).resolves.toEqual(status);

		expect(get).toHaveBeenCalledWith(expect.stringMatching(/\/auth\/(email\/)?verify\/status$/));
	});

	it('answers null where the deployment verifies no address (404)', async () => {
		jest.spyOn(emailVerificationService, 'get').mockRejectedValue({
			statusCode: 404,
			message: 'Cannot GET /api/auth/email/verify/status'
		});

		await expect(emailVerificationService.getVerificationStatus()).resolves.toBeNull();
	});

	it('lets any other failure through, so nothing is decided on an error', async () => {
		const outage = { statusCode: 502, message: 'The Gauzy API is unreachable' };
		jest.spyOn(emailVerificationService, 'get').mockRejectedValue(outage);

		await expect(emailVerificationService.getVerificationStatus()).rejects.toBe(outage);
	});
});
