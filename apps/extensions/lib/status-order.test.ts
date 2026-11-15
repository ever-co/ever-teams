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

	it('shows a read sent after the popup reported', () => {
		const order = createStatusOrder();
		order.reported();

		assert.equal(order.isLatest(order.readSent()), true);
	});
});
