import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createStatusOrder } from './status-order.ts';

describe('createStatusOrder', () => {
	it("drops an alarm's read that left before the popup reported a stop", () => {
		const order = createStatusOrder();
		const alarmRead = order.readSent();

		// The popup stops the timer and reports the stopped status it read; then the alarm's older answer lands
		order.reported();

		assert.equal(order.isLatest(alarmRead), false);
	});

	it('shows the answer of the last read sent, and drops an older one that lands after it', () => {
		const order = createStatusOrder();
		const first = order.readSent();
		const second = order.readSent();

		assert.equal(order.isLatest(second), true);
		assert.equal(order.isLatest(first), false);
	});

	it('drops a read that left before its session ended, and shows one sent after it', () => {
		const order = createStatusOrder();
		const beforeSignOut = order.readSent();

		order.sessionEnded();

		assert.equal(order.isLatest(beforeSignOut), false);
		assert.equal(order.isLatest(order.readSent()), true);
	});

	it('ends the reads once for a sign-out told several times', () => {
		const order = createStatusOrder();
		const beforeSignOut = order.readSent();

		assert.equal(order.sessionEnded(), true);
		assert.equal(order.sessionEnded(), false, 'nothing sent since: nothing more to end');
		assert.equal(order.sessionEnded(), false);

		assert.equal(order.isLatest(beforeSignOut), false);
		assert.equal(order.isLatest(order.readSent()), true);
	});

	it('ends the reads again once a read was sent or a status reported after the last end', () => {
		const order = createStatusOrder();
		order.readSent();
		order.sessionEnded();

		const nextRead = order.readSent();
		assert.equal(order.sessionEnded(), true);
		assert.equal(order.isLatest(nextRead), false);

		const report = order.reported();
		assert.equal(order.sessionEnded(), true);
		assert.equal(order.isLatest(report), false);
	});

	it('has nothing to end before any read was sent', () => {
		assert.equal(createStatusOrder().sessionEnded(), false);
	});

	it('shows a read sent after the popup reported', () => {
		const order = createStatusOrder();
		order.reported();

		assert.equal(order.isLatest(order.readSent()), true);
	});
});
