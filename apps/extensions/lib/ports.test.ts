import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { isOwnPagePort } from './ports.ts';

describe('isOwnPagePort', () => {
	it("listens to the popup's port, which names no tab", () => {
		assert.equal(isOwnPagePort({ sender: { id: 'extension-id', url: 'chrome-extension://extension-id/popup.html' } }), true);
		assert.equal(isOwnPagePort({}), true);
	});

	it('ignores a port a web page opened through a content script, which names its tab', () => {
		assert.equal(isOwnPagePort({ sender: { id: 'extension-id', tab: { id: 7, url: 'https://example.org/' } } }), false);
	});
});
