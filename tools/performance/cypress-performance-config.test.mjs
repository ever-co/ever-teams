import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import test from 'node:test';

async function loadHelpers() {
	try {
		return await import('./cypress-performance-config.mjs');
	} catch {
		return {};
	}
}

test('requires both deterministic AUT API origins to target the mock server', async () => {
	const { assertDeterministicApiOrigins } = await loadHelpers();
	assert.equal(typeof assertDeterministicApiOrigins, 'function', 'deterministic origin validator must exist');

	assert.doesNotThrow(() =>
		assertDeterministicApiOrigins('http://127.0.0.1:3988', {
			GAUZY_API_SERVER_URL: 'http://127.0.0.1:3988/api',
			NEXT_PUBLIC_GAUZY_API_SERVER_URL: 'http://127.0.0.1:3988'
		})
	);
	assert.throws(
		() =>
			assertDeterministicApiOrigins('http://127.0.0.1:3988', {
				NEXT_PUBLIC_GAUZY_API_SERVER_URL: 'http://127.0.0.1:3988'
			}),
		/GAUZY_API_SERVER_URL/
	);
	assert.throws(
		() =>
			assertDeterministicApiOrigins('http://127.0.0.1:3988', {
				GAUZY_API_SERVER_URL: 'http://127.0.0.1:3988',
				NEXT_PUBLIC_GAUZY_API_SERVER_URL: 'https://api.ever.team'
			}),
		/NEXT_PUBLIC_GAUZY_API_SERVER_URL/
	);
});

test('resolves candidate output inside the Cypress repository root', async () => {
	const { resolvePerformanceOutput } = await loadHelpers();
	assert.equal(typeof resolvePerformanceOutput, 'function', 'performance output resolver must exist');

	const projectRoot = resolve(tmpdir(), 'ever-teams-repository');
	assert.equal(
		resolvePerformanceOutput(projectRoot, 'artifacts/candidate.json'),
		resolve(projectRoot, 'artifacts/candidate.json')
	);
	assert.equal(resolvePerformanceOutput(projectRoot), resolve(projectRoot, 'artifacts/startup-candidate.json'));
});
