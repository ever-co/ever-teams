/**
 * @jest-environment node
 */
/**
 * PUT and DELETE /api/task-statuses/:id (#5726): a refusal of the API (its 403 for a role that may not change this) left the handler as an
 * unhandled rejection, and the browser got an empty 500 that the app read as "Try again in a moment".
 */
const mockAuthenticatedGuard = jest.fn();
const mockUpdate = jest.fn();
const mockRemove = jest.fn();

jest.mock('@/core/services/server/guards/authenticated-guard-app', () => ({
	authenticatedGuard: (...args: unknown[]) => mockAuthenticatedGuard(...args)
}));
jest.mock('@/core/services/server/requests/taskStatus', () => ({
	editTaskStatusRequest: (...args: unknown[]) => mockUpdate(...args),
	deleteTaskStatusRequest: (...args: unknown[]) => mockRemove(...args)
}));

import { DELETE, PUT } from './route';
import { describeRefusalsPassedOn } from '@/test/api/refusals-passed-on';

function requestOf(method: 'PUT' | 'DELETE', body?: unknown) {
	let sentBody: string | undefined = undefined;
	if (body !== undefined) {
		sentBody = JSON.stringify(body);
	}
	return new Request('https://app.example.com/api/task-statuses/status-1', {
		method,
		headers: { 'content-type': 'application/json', origin: 'https://app.example.com' },
		body: sentBody
	});
}

const routeParams = { params: Promise.resolve({ id: 'status-1' }) } as never;
const update = () => PUT(requestOf('PUT', { order: 2 }), routeParams) as Promise<Response>;
const remove = () => DELETE(requestOf('DELETE'), routeParams) as Promise<Response>;

describeRefusalsPassedOn('PUT and DELETE /api/task-statuses/:id', mockAuthenticatedGuard, [
	['an update', update, mockUpdate],
	['a removal', remove, mockRemove]
]);
