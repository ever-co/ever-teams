import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { apiOriginOf } from './api-client.ts';

describe('apiOriginOf', () => {
	it('keeps the origin a person typed, without trailing slashes or an /api suffix', () => {
		assert.equal(apiOriginOf(' https://api.ever.team/ '), 'https://api.ever.team');
		assert.equal(apiOriginOf('https://gauzy.example.com/api//'), 'https://gauzy.example.com');
		assert.equal(apiOriginOf('https://gauzy.example.com/apis'), 'https://gauzy.example.com/apis');
		assert.equal(apiOriginOf('http://localhost:3000'), 'http://localhost:3000');
	});
});
