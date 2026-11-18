// The ES and the CommonJS builds share one configuration: node --test test/*.test.mjs (from packages/api, after
// `rollup -c`). A host that imports the package while a dependency requires it loads both builds; a setConfig()
// through one must reach the requests of the other.
import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import * as esm from '../dist/index.es.js';

const require = createRequire(import.meta.url);
const cjs = require('../dist/index.cjs');
const original = { ...esm.apiConfigManager.getConfig() };

afterEach(() => {
	esm.apiConfigManager.setConfig(original);
});

test('the two builds are two copies of the module', () => {
	assert.notEqual(cjs.apiConfigManager, esm.apiConfigManager);
});

test('a configuration set through the ES build is read by the CommonJS build, and back', () => {
	esm.apiConfigManager.setConfig({ apiUrl: 'https://esm.example.com/api' });
	assert.equal(cjs.apiConfigManager.getConfig().apiUrl, 'https://esm.example.com/api');

	cjs.apiConfigManager.setConfig({ apiUrl: 'https://cjs.example.com/api' });
	assert.equal(esm.apiConfigManager.getConfig().apiUrl, 'https://cjs.example.com/api');
});

test('subscribe hears each change made through either build, and nothing once stopped', () => {
	const heard = [];
	const stop = esm.apiConfigManager.subscribe(() => heard.push(esm.apiConfigManager.getConfig().apiUrl));

	cjs.apiConfigManager.setConfig({ apiUrl: 'https://cjs.example.com/api' });
	esm.apiConfigManager.setConfig({ apiUrl: 'https://esm.example.com/api' });
	stop();
	esm.apiConfigManager.setConfig({ apiUrl: 'https://after.example.com/api' });

	assert.deepEqual(heard, ['https://cjs.example.com/api', 'https://esm.example.com/api']);
});

test('a setConfig that changes nothing tells nobody', () => {
	esm.apiConfigManager.setConfig({ apiUrl: 'https://same.example.com/api' });
	let calls = 0;
	const stop = cjs.apiConfigManager.subscribe(() => {
		calls += 1;
	});

	esm.apiConfigManager.setConfig({ apiUrl: 'https://same.example.com/api' });
	cjs.apiConfigManager.setConfig({ apiUrl: undefined });
	stop();

	assert.equal(calls, 0);
});
