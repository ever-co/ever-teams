/**
 * @jest-environment node
 */
/**
 * GET, PUT and DELETE /api/daily-plan/:id (#5726): a refusal of the API left the handler as an unhandled rejection, and the browser got an
 * empty 500 that the app read as "Try again in a moment".
 */
const mockAuthenticatedGuard = jest.fn();
const mockRead = jest.fn();
const mockUpdate = jest.fn();
const mockRemove = jest.fn();

jest.mock('@/core/services/server/guards/authenticated-guard-app', () => ({
	authenticatedGuard: (...args: unknown[]) => mockAuthenticatedGuard(...args)
}));
jest.mock('@/core/services/server/requests', () => ({
	getPlanByIdRequest: (...args: unknown[]) => mockRead(...args),
	updatePlanRequest: (...args: unknown[]) => mockUpdate(...args),
	deleteDailyPlanRequest: (...args: unknown[]) => mockRemove(...args)
}));

import { GET, PUT, DELETE } from './route';
import { describeRefusalsPassedOn } from '@/test/api/refusals-passed-on';

function requestOf(method: string, body?: unknown) {
	let sentBody: string | undefined = undefined;
	if (body !== undefined) {
		sentBody = JSON.stringify(body);
	}
	return new Request('https://app.example.com/api/daily-plan/plan-1', {
		method,
		headers: { 'content-type': 'application/json', origin: 'https://app.example.com' },
		body: sentBody
	});
}

const routeParams = { params: Promise.resolve({ id: 'plan-1' }) };
const read = () => GET(requestOf('GET'), routeParams) as Promise<Response>;
const update = () => PUT(requestOf('PUT', { workTimePlanned: 6 }), routeParams) as Promise<Response>;
const remove = () => DELETE(requestOf('DELETE'), routeParams) as Promise<Response>;

describeRefusalsPassedOn('GET, PUT and DELETE /api/daily-plan/:id', mockAuthenticatedGuard, [
	['a read', read, mockRead],
	['an update', update, mockUpdate],
	['a deletion', remove, mockRemove]
]);
