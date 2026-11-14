import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { isAllowedAddress } from './address.ts';

describe('isAllowedAddress', () => {
	it('accepts an https address, and plain http on this computer only', () => {
		assert.equal(isAllowedAddress('https://api.ever.team'), true);
		assert.equal(isAllowedAddress(' https://gauzy.example.com:8443/api '), true);
		assert.equal(isAllowedAddress('http://localhost:3000'), true);
		assert.equal(isAllowedAddress('http://127.0.0.1:3000'), true);
		assert.equal(isAllowedAddress('http://api.example.com'), false);
	});

	it('refuses an address the browser cannot open, such as a port out of range', () => {
		assert.equal(isAllowedAddress('https://api.ever.team:99999'), false);
		assert.equal(isAllowedAddress('http://localhost:70000'), false);
		assert.equal(isAllowedAddress('https://'), false);
		assert.equal(isAllowedAddress('api.ever.team'), false);
	});
});
