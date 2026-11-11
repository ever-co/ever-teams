import { isInboxDeliveryStatus } from './inbox-delivery.service';

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
});
