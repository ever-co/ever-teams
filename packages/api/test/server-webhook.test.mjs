// verifyWebhook and isTimeEntryEvent (src/lib/server/webhook.ts) against deliveries signed as the API signs them:
// node --test test/*.test.mjs (from packages/api). esbuild bundles the modules with the error classes they throw.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { inspect } from 'node:util';
import {
	PREVIOUS_SECRET,
	SECRET,
	SIGNED_AT,
	TIME_ENTRY,
	deliveryBody,
	signatureOf
} from './support/webhook-deliveries.mjs';
import { bundleServerHelper } from './support/bundle-server.mjs';

let server;
let events;
let removeBundles = [];

before(async () => {
	const webhook = await bundleServerHelper('webhook');
	const webhookEvents = await bundleServerHelper('webhook-events');
	server = webhook.server;
	events = webhookEvents.server;
	removeBundles = [webhook.remove, webhookEvents.remove];
});

after(() => {
	for (const remove of removeBundles) {
		remove();
	}
});

const STARTED = deliveryBody('time_log.started');

const verify = (more = {}) =>
	server.verifyWebhook({ body: STARTED, signature: signatureOf(STARTED), secret: SECRET, now: SIGNED_AT, ...more });

// The refusal of a delivery: a typed error with no HTTP status, whose text never shows the secret.
async function refusalOf(more) {
	const error = await verify(more).then(
		() => assert.fail('the delivery was accepted'),
		(thrown) => thrown
	);
	assert.ok(error instanceof server.EverTeamsError, inspect(error));
	assert.equal(error.status, 0);
	assert.ok(error.nextStep);
	const shown = `${inspect(error, { depth: 10 })} ${error.nextStep}`;
	assert.equal(shown.includes(SECRET), false, shown);
	return error;
}

test('a delivery signed like the API answers its event, typed once isTimeEntryEvent says it is a time entry', async () => {
	const event = await verify();

	assert.equal(event.name, 'time_log.started');
	assert.equal(event.id, 'e1c0b9a8-7d6f-4e5d-8c4b-3a2f1e0d9c8b');
	assert.equal(event.version, 1);
	assert.equal(event.occurredAt, '2026-11-18T09:00:00.120Z');
	assert.deepEqual(event.aggregate, { type: 'TIME_LOG', id: TIME_ENTRY.timeLogId });
	assert.deepEqual(event.data, TIME_ENTRY);
	assert.equal('channelId' in event, false, 'a member the API leaves out stays out');
	assert.equal(events.isTimeEntryEvent(event), true);
});

test('the raw body as bytes, as express.raw gives it, verifies the same', async () => {
	const event = await verify({ body: Buffer.from(STARTED, 'utf8') });
	const fromUint8Array = await verify({ body: new TextEncoder().encode(STARTED) });

	assert.equal(event.name, 'time_log.started');
	assert.deepEqual(fromUint8Array, event);
});

test('a body with accents and emoji is checked over the bytes that were sent', async () => {
	const body = deliveryBody('time_log.updated', { ...TIME_ENTRY, source: 'Ünïcødé 商品 🔐' });

	const asText = await verify({ body, signature: signatureOf(body) });
	const asBytes = await verify({ body: Buffer.from(body, 'utf8'), signature: signatureOf(body) });

	assert.equal(asText.data.source, 'Ünïcødé 商品 🔐');
	assert.deepEqual(asBytes, asText);
});

test('during a rotation the header carries two v1 values, and either secret verifies', async () => {
	const signature = signatureOf(STARTED, { previousSecret: PREVIOUS_SECRET });

	assert.match(signature, /^t=\d+,v1=[0-9a-f]{64},v1=[0-9a-f]{64}$/);
	assert.equal((await verify({ signature })).name, 'time_log.started');
	assert.equal((await verify({ signature, secret: PREVIOUS_SECRET })).name, 'time_log.started');
});

test('the header is read as the API reads it: spaces around its parts, and upper-case hex', async () => {
	const signature = signatureOf(STARTED);
	const spaced = signature.replace(',', ' , ');
	const upper = signature.replace(/v1=([0-9a-f]+)/, (_, hex) => `v1=${hex.toUpperCase()}`);

	assert.equal((await verify({ signature: spaced })).name, 'time_log.started');
	assert.equal((await verify({ signature: upper })).name, 'time_log.started');
});

test("a secret with the line break of an environment file still verifies, and Node's header array of one", async () => {
	assert.equal((await verify({ secret: `${SECRET}\n` })).name, 'time_log.started');
	assert.equal((await verify({ signature: [signatureOf(STARTED)] })).name, 'time_log.started');
});

test('a body changed after it was signed, another secret or a rewritten timestamp is WEBHOOK_SIGNATURE', async () => {
	const changed = await refusalOf({ body: STARTED.replace('DESKTOP', 'BROWSER') });
	const otherSecret = await refusalOf({ secret: PREVIOUS_SECRET });
	const later = signatureOf(STARTED).replace(`t=${SIGNED_AT}`, `t=${SIGNED_AT + 10}`);
	const rewritten = await refusalOf({ signature: later, now: SIGNED_AT + 10 });

	for (const error of [changed, otherSecret, rewritten]) {
		assert.equal(error.code, 'WEBHOOK_SIGNATURE');
		assert.match(error.nextStep, /raw body/);
	}
});

test('a signature within the tolerance on either side is accepted, one second past it is WEBHOOK_EXPIRED', async () => {
	assert.ok(await verify({ now: SIGNED_AT + 300 }));
	assert.ok(await verify({ now: SIGNED_AT - 300 }));

	const late = await refusalOf({ now: SIGNED_AT + 301 });
	const early = await refusalOf({ now: SIGNED_AT - 301 });
	const shorter = await refusalOf({ now: SIGNED_AT + 61, tolerance: 60 });

	for (const error of [late, early, shorter]) {
		assert.equal(error.code, 'WEBHOOK_EXPIRED');
		assert.match(error.nextStep, /clock/);
	}
});

test('without a now, the clock is used: a delivery signed now passes, one signed an hour ago is WEBHOOK_EXPIRED', async () => {
	const clock = Math.floor(Date.now() / 1000);

	const fresh = await verify({ now: undefined, signature: signatureOf(STARTED, { timestamp: clock }) });
	const error = await refusalOf({ now: undefined, signature: signatureOf(STARTED, { timestamp: clock - 3600 }) });

	assert.equal(fresh.name, 'time_log.started');
	assert.equal(error.code, 'WEBHOOK_EXPIRED');
});

test('bytes the caller changes while the signature is checked change neither the check nor the event', async () => {
	const bytes = Buffer.from(STARTED, 'utf8');
	const checking = verify({ body: bytes });
	// The same length: the name of another event, written over the bytes once verifyWebhook took them.
	bytes.write(STARTED.replace('time_log.started', 'time_log.stopped'), 'utf8');

	const event = await checking;

	assert.equal(event.name, 'time_log.started');
});

test('a forged header with an old timestamp is a wrong signature, never an expired one', async () => {
	const forged = `t=${SIGNED_AT - 10_000},v1=${'a'.repeat(64)}`;

	assert.equal((await refusalOf({ signature: forged })).code, 'WEBHOOK_SIGNATURE');
});

test('a missing or unreadable X-Signature is WEBHOOK_SIGNATURE, and refused before any parsing', async () => {
	const digest = signatureOf(STARTED).split('v1=')[1];
	const unreadable = [
		undefined,
		null,
		'',
		[],
		[signatureOf(STARTED), signatureOf(STARTED)],
		`v1=${digest}`,
		`t=${SIGNED_AT}`,
		`t=0${SIGNED_AT},v1=${digest}`,
		`t=+${SIGNED_AT},v1=${digest}`,
		`t=${SIGNED_AT}.0,v1=${digest}`,
		`t=1.795e9,v1=${digest}`
	];

	for (const signature of unreadable) {
		const error = await refusalOf({ signature });
		assert.equal(error.code, 'WEBHOOK_SIGNATURE', inspect(signature));
		assert.match(error.nextStep, /X-Signature/);
	}
});

test('a v1 value that is not 64 hex digits is a mismatch, not an exception', async () => {
	const values = ['zz', 'g'.repeat(64), 'ab'.repeat(16), `${'a'.repeat(64)}0`];

	for (const value of values) {
		const error = await refusalOf({ signature: `t=${SIGNED_AT},v1=${value}` });
		assert.equal(error.code, 'WEBHOOK_SIGNATURE');
	}
});

test('a body already parsed as JSON, or none, is WEBHOOK_BODY with the raw body step', async () => {
	for (const body of [JSON.parse(STARTED), undefined, null, 42]) {
		const error = await refusalOf({ body });
		assert.equal(error.code, 'WEBHOOK_BODY');
		assert.match(error.nextStep, /express\.raw/);
	}
});

test('a signed body that is not an event is WEBHOOK_BODY, once its signature is checked', async () => {
	for (const body of ['not json', '{}', JSON.stringify({ name: 'time_log.started' }), '[]', '']) {
		const error = await refusalOf({ body, signature: signatureOf(body) });
		assert.equal(error.code, 'WEBHOOK_BODY', body);
	}
});

test('a missing secret, or a tolerance or now that is not a number, is CLIENT_OPTIONS before anything is read', async () => {
	assert.equal((await refusalOf({ secret: undefined })).code, 'CLIENT_OPTIONS');
	assert.equal((await refusalOf({ secret: '  ' })).code, 'CLIENT_OPTIONS');
	assert.equal((await refusalOf({ tolerance: -1 })).code, 'CLIENT_OPTIONS');
	assert.equal((await refusalOf({ tolerance: Number.NaN })).code, 'CLIENT_OPTIONS');
	assert.equal((await refusalOf({ now: '1795000000' })).code, 'CLIENT_OPTIONS');
	assert.match((await refusalOf({ secret: undefined })).nextStep, /EVER_TEAMS_WEBHOOK_SECRET/);
});

test('each of the five time entry events is typed', async () => {
	const names = ['time_log.started', 'time_log.stopped', 'time_log.created', 'time_log.updated', 'time_log.deleted'];

	for (const name of names) {
		const body = deliveryBody(name);
		const event = await verify({ body, signature: signatureOf(body) });
		assert.equal(event.name, name);
		assert.equal(events.isTimeEntryEvent(event), true, name);
	}
});

test('an event the SDK does not type keeps its name and raw data, and is no time entry', async () => {
	const data = { invoiceId: 'invoice-1', total: '199.90' };
	const body = deliveryBody('invoice.paid', data);

	const event = await verify({ body, signature: signatureOf(body) });

	assert.equal(event.name, 'invoice.paid');
	assert.deepEqual(event.data, data);
	assert.equal(events.isTimeEntryEvent(event), false);
});

test("a time entry's name with data of another shape stays untyped", async () => {
	const shapes = [
		null,
		{ ...TIME_ENTRY, timeLogId: undefined },
		{ ...TIME_ENTRY, projectId: 42 },
		{ ...TIME_ENTRY, isRunning: 'true' }
	];

	for (const data of shapes) {
		const body = deliveryBody('time_log.started', data);
		const event = await verify({ body, signature: signatureOf(body) });
		assert.equal(events.isTimeEntryEvent(event), false, inspect(data));
	}
});

test('in a page, verifyWebhook is refused with SERVER_ONLY', async () => {
	globalThis.window = {};
	globalThis.document = {};
	try {
		const error = await refusalOf();
		assert.equal(error.code, 'SERVER_ONLY');
	} finally {
		delete globalThis.window;
		delete globalThis.document;
	}
});
