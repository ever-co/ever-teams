import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
	estimateFieldOf,
	estimateSecondsOf,
	MAX_ESTIMATE_HOURS,
	MAX_ESTIMATE_MINUTES,
	paddedEstimateField
} from './estimate.ts';

describe('estimateSecondsOf', () => {
	it('reads hours and minutes, and an empty or zero estimate as none', () => {
		assert.equal(estimateSecondsOf('01:30'), 5400);
		assert.equal(estimateSecondsOf('999:59'), 999 * 3600 + 59 * 60);
		assert.equal(estimateSecondsOf('00:00'), 0);
		assert.equal(estimateSecondsOf(''), 0);
		assert.equal(estimateSecondsOf('2'), 7200);
	});

	it('refuses minutes from 60 on, hours beyond the field, and negative values, instead of reading them', () => {
		assert.equal(estimateSecondsOf('01:60'), null);
		assert.equal(estimateSecondsOf('01:75'), null);
		assert.equal(estimateSecondsOf('1000:00'), null);
		assert.equal(estimateSecondsOf('-1:00'), null);
		assert.equal(estimateSecondsOf('01:-5'), null);
	});

	it('reads leading zeros as the same number, never as another base', () => {
		assert.equal(estimateSecondsOf('005:00'), 5 * 3600);
		assert.equal(estimateSecondsOf('010:09'), 10 * 3600 + 9 * 60);
		assert.equal(estimateSecondsOf('000:00'), 0);
	});

	it('refuses more parts than hours and minutes, and parts that are not whole numbers', () => {
		assert.equal(estimateSecondsOf('01:02:03'), null);
		assert.equal(estimateSecondsOf('1.5:00'), null);
		assert.equal(estimateSecondsOf('1e2:00'), null);
		assert.equal(estimateSecondsOf('ab:cd'), null);
	});
});

describe('estimateFieldOf', () => {
	it('keeps whole numbers within the field, and an emptied field', () => {
		assert.equal(estimateFieldOf('7', MAX_ESTIMATE_HOURS), '7');
		assert.equal(estimateFieldOf('999', MAX_ESTIMATE_HOURS), '999');
		assert.equal(estimateFieldOf('59', MAX_ESTIMATE_MINUTES), '59');
		assert.equal(estimateFieldOf('05', MAX_ESTIMATE_MINUTES), '05');
		assert.equal(estimateFieldOf('', MAX_ESTIMATE_MINUTES), '');
	});

	it('refuses what the estimate would refuse, so the field keeps its value', () => {
		assert.equal(estimateFieldOf('60', MAX_ESTIMATE_MINUTES), null);
		assert.equal(estimateFieldOf('1000', MAX_ESTIMATE_HOURS), null);
		assert.equal(estimateFieldOf('005', MAX_ESTIMATE_MINUTES), null);
		assert.equal(estimateFieldOf('-1', MAX_ESTIMATE_HOURS), null);
		assert.equal(estimateFieldOf('1.5', MAX_ESTIMATE_HOURS), null);
		assert.equal(estimateFieldOf('1e', MAX_ESTIMATE_HOURS), null);
	});
});

describe('paddedEstimateField', () => {
	it('shows the number on two digits at least, without the extra leading zeros typed', () => {
		assert.equal(paddedEstimateField('5'), '05');
		assert.equal(paddedEstimateField('05'), '05');
		assert.equal(paddedEstimateField('005'), '05');
		assert.equal(paddedEstimateField('010'), '10');
		assert.equal(paddedEstimateField('0'), '00');
		assert.equal(paddedEstimateField('000'), '00');
		assert.equal(paddedEstimateField('59'), '59');
		assert.equal(paddedEstimateField('999'), '999');
	});

	it('leaves an emptied field empty, and the estimate it makes the same', () => {
		assert.equal(paddedEstimateField(''), '');
		for (const hours of ['5', '005', '010', '0', '999']) {
			const shown = paddedEstimateField(hours);
			assert.equal(estimateSecondsOf(`${shown}:30`), estimateSecondsOf(`${hours}:30`), `hours ${hours}`);
		}
		for (const minutes of ['5', '05', '0', '59']) {
			const shown = paddedEstimateField(minutes);
			assert.equal(estimateSecondsOf(`2:${shown}`), estimateSecondsOf(`2:${minutes}`), `minutes ${minutes}`);
		}
	});
});
