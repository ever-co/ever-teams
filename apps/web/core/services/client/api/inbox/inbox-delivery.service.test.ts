import { loggedStatuses, refusingClient } from '@/test/api/refusing-client';
import { inboxDeliveryService, isInboxDeliveryStatus } from './inbox-delivery.service';

describe('isInboxDeliveryStatus', () => {
	it('accepts the platform answer', () => {
		expect(
			isInboxDeliveryStatus({
				email: { enabled: true, available: false },
				push: { enabled: false, available: false },
				checkedAt: '2026-11-11T12:00:00.000Z'
			})
		).toBe(true);
	});

	it('refuses what an older platform or a proxy page answers instead', () => {
		expect(isInboxDeliveryStatus(null)).toBe(false);
		expect(isInboxDeliveryStatus('<!doctype html>')).toBe(false);
		expect(isInboxDeliveryStatus({ statusCode: 404, message: 'Not Found' })).toBe(false);
		expect(isInboxDeliveryStatus({ email: { enabled: 'yes', available: true } })).toBe(false);
	});

	it('refuses a partial answer: email only, push without its fields, or no check time', () => {
		expect(isInboxDeliveryStatus({ email: { enabled: true, available: false } })).toBe(false);
		expect(
			isInboxDeliveryStatus({ email: { enabled: true, available: false }, push: {}, checkedAt: '2026-11-11T12:00:00.000Z' })
		).toBe(false);
		expect(
			isInboxDeliveryStatus({ email: { enabled: true, available: false }, push: { enabled: false, available: false } })
		).toBe(false);
	});
});

/**
 * The status read as it leaves the client: a platform without the delivery plugin answers 404, which the read turns
 * into `null` (nothing changes on the page) and keeps out of the error log. Any other failure is `null` too, as
 * before, but is still logged.
 */
describe('inboxDeliveryService.status', () => {
	const refusing = refusingClient(inboxDeliveryService);
	afterEach(() => {
		refusing.restore();
		jest.restoreAllMocks();
	});

	it('answers null for a platform without the plugin and logs nothing, and still logs a 500', async () => {
		const errorLog = refusing.refuse(404);
		await expect(inboxDeliveryService.status()).resolves.toBeNull();
		expect(loggedStatuses(errorLog)).toEqual([]);

		refusing.refuse(500);
		await expect(inboxDeliveryService.status()).resolves.toBeNull();
		expect(loggedStatuses(errorLog)).toEqual([500]);
	});
});
