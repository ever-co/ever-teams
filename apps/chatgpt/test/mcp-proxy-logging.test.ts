/**
 * The proxy logged whole MCP request and response bodies (at `debug`, and error bodies at `error`): the `login`
 * tool's email and password, the session id the server answers with, and every tool's data. Logs leave the process
 * when LOGTAIL_SOURCE_TOKEN is set, so they now carry only the method, the tool and the error code.
 *
 * Run with `yarn workspace @ever-teams/chatgpt test` (Node's built-in test runner through tsx).
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

// Keep the pino logger quiet; set before the modules below read the env.
process.env.LOG_LEVEL = 'silent';

const { describeRpc } = await import('../src/server/mcp-proxy.js');

describe('describeRpc', () => {
	it('names the tool a login calls, and nothing it was given', () => {
		const request = {
			jsonrpc: '2.0',
			id: 1,
			method: 'tools/call',
			params: { name: 'login', arguments: { email: 'someone@example.com', password: 'hunter2' } }
		};

		for (const body of [request, JSON.stringify(request)]) {
			const logged = describeRpc(body);
			assert.deepEqual(logged, { rpcMethod: 'tools/call', tool: 'login' });
			assert.doesNotMatch(JSON.stringify(logged), /hunter2|someone@example\.com/);
		}
	});

	it('keeps an error code and drops the result', () => {
		assert.deepEqual(
			describeRpc({ jsonrpc: '2.0', id: 1, result: { content: [{ text: 'Session ID: abc' }] } }),
			{}
		);
		assert.deepEqual(
			describeRpc({ jsonrpc: '2.0', id: 1, error: { code: -32602, message: 'bad password for x', data: {} } }),
			{ rpcError: -32602 }
		);
	});

	it('logs nothing of a body it cannot read', () => {
		assert.deepEqual(describeRpc('<html>502 Bad Gateway</html>'), {});
		assert.deepEqual(describeRpc(undefined), {});
		assert.deepEqual(describeRpc(42), {});
	});
});
