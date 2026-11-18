// Webhook deliveries as the API sends them (Gauzy develop): the body of webhook-outbox.consumer.ts (bodyOf), the data
// of a time entry's event (time-log-facts.service.ts, timeLogFactData), and the X-Signature of webhook-signature.ts
// (signWebhookPayload), computed here with node:crypto as a receiver reproduces it.
import { createHmac } from 'node:crypto';

// A secret as the API generates one (32 random bytes, hex), made up for the tests.
export const SECRET = '6b0f6c2a9d3e4f5a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a';
export const PREVIOUS_SECRET = '0a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f9';

export const SIGNED_AT = 1_795_000_000;

export const TIME_ENTRY = {
	timeLogId: '8f2c1a90-5b3e-4d7f-9a61-2c4e8b0d3f15',
	employeeId: '3d9a7c21-0e4b-4f6a-8c5d-7e1f2a3b4c5d',
	projectId: '5d1e2f3a-4b5c-4d6e-8f70-81a2b3c4d5e6',
	taskId: null,
	organizationContactId: 'b7a4c8a2-3f0e-4c41-9a37-2d6f1c9e8b10',
	organizationTeamId: null,
	startedAt: '2026-11-18T09:00:00.000Z',
	stoppedAt: '2026-11-18T09:00:00.000Z',
	isRunning: true,
	isBillable: true,
	source: 'DESKTOP',
	logType: 'TRACKED'
};

// The body, member by member as bodyOf writes it; JSON.stringify drops the members it leaves undefined.
export function deliveryBody(name, data = TIME_ENTRY) {
	return JSON.stringify({
		id: 'e1c0b9a8-7d6f-4e5d-8c4b-3a2f1e0d9c8b',
		name,
		version: 1,
		occurredAt: '2026-11-18T09:00:00.120Z',
		tenantId: 'tenant-1',
		organizationId: 'org-1',
		channelId: undefined,
		aggregate: { type: 'TIME_LOG', id: data?.timeLogId ?? 'record-1' },
		sequence: 1,
		partitionKey: `TIME_LOG:${data?.timeLogId ?? 'record-1'}`,
		correlationId: undefined,
		causationId: undefined,
		producer: name.split('.')[0],
		data
	});
}

const hmacHex = (secret, payload) => createHmac('sha256', secret).update(payload, 'utf8').digest('hex');

// signWebhookPayload: `t=<seconds>,v1=<hex>` over `<seconds>.<body>`, and a second v1 under the previous secret while
// a rotation lasts.
export function signatureOf(body, { timestamp = SIGNED_AT, secret = SECRET, previousSecret } = {}) {
	const signed = `${timestamp}.${body}`;
	const values = [hmacHex(secret, signed)];
	if (previousSecret) {
		values.push(hmacHex(previousSecret, signed));
	}
	return `t=${timestamp},${values.map((value) => `v1=${value}`).join(',')}`;
}
