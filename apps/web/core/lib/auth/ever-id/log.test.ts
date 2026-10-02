/**
 * The Ever ID outcome log lines feed the rollout alerts. They carry the event, the outcome, the latency, the
 * HTTP status and the replica, and NOTHING that identifies a person or a credential.
 */
import { everIdLogLine, everIdLogPayload, logEverIdOutcome } from './log';

const FORBIDDEN_KEYS = [
	'token',
	'id_token',
	'access_token',
	'logout_token',
	'sub',
	'sid',
	'email',
	'tenantId',
	'tenant_id'
];

const ORIGINAL_HOSTNAME = process.env.HOSTNAME;

afterEach(() => {
	if (ORIGINAL_HOSTNAME === undefined) delete process.env.HOSTNAME;
	else process.env.HOSTNAME = ORIGINAL_HOSTNAME;
	jest.restoreAllMocks();
});

describe('Ever ID outcome logs', () => {
	it('builds the payload from the allow-listed fields only', () => {
		process.env.HOSTNAME = 'web-7d9f';
		const payload = everIdLogPayload('ever_id.signin', { outcome: 'ok', latencyMs: 120.4, status: 200 });

		expect(payload).toEqual({
			event: 'ever_id.signin',
			outcome: 'ok',
			latency_ms: 120,
			status: 200,
			replica: 'web-7d9f'
		});
		expect(Object.keys(payload).filter((key) => FORBIDDEN_KEYS.includes(key))).toEqual([]);
	});

	it('drops anything else a caller might pass', () => {
		const smuggled = {
			outcome: 'replay',
			token: `${Buffer.from('{"alg":"none"}').toString('base64url')}.e30.unsigned`,
			sub: 'person-1',
			sid: 'session-1',
			email: 'person@example.test'
		} as unknown as Parameters<typeof everIdLogPayload>[1];

		const payload = everIdLogPayload('ever_id.backchannel', smuggled);

		expect(Object.keys(payload).filter((key) => FORBIDDEN_KEYS.includes(key))).toEqual([]);
		expect(JSON.stringify(payload)).not.toMatch(/eyJ|person|session-1|@/);
	});

	it('logs one logfmt line per outcome', () => {
		process.env.HOSTNAME = 'web-1';
		const info = jest.spyOn(console, 'info').mockImplementation(() => undefined);
		const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

		logEverIdOutcome('ever_id.signin', { outcome: 'ok', latencyMs: 5, status: 200 });
		logEverIdOutcome('ever_id.backchannel', { outcome: 'forward_failed', latencyMs: 9, status: 503 });

		expect(info.mock.calls).toEqual([['ever_id.signin outcome=ok latency_ms=5 status=200 replica=web-1']]);
		expect(warn.mock.calls).toEqual([
			['ever_id.backchannel outcome=forward_failed latency_ms=9 status=503 replica=web-1']
		]);
	});

	it('keeps every value on one line', () => {
		expect(everIdLogLine({ event: 'ever_id.confirm', outcome: 'ok', replica: 'pod a=b "c"' })).toBe(
			'ever_id.confirm outcome=ok replica=pod_a_b_c_'
		);
	});
});
