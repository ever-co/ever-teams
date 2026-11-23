/**
 * @jest-environment node
 */
/**
 * PUT and DELETE /api/task-versions/:id (#5726): a refusal of the API left the handler as an unhandled rejection, and the
 * browser got an empty 500 that the app read as "Try again in a moment".
 */
const mockAuthenticatedGuard = jest.fn();
const mockPUT = jest.fn();
const mockDELETE = jest.fn();

jest.mock('@/core/services/server/guards/authenticated-guard-app', () => ({
	authenticatedGuard: (...args: unknown[]) => mockAuthenticatedGuard(...args)
}));
jest.mock('@/core/services/server/requests/task-version', () => ({
	editTaskVersionRequest: (...args: unknown[]) => mockPUT(...args),
	deleteTaskVersionRequest: (...args: unknown[]) => mockDELETE(...args)
}));

import { PUT, DELETE } from './route';
import { describeRefusalsPassedOn, routeRequest } from '@/test/api/refusals-passed-on';

const ROUTE = 'https://app.example.com/api/task-versions/version-1';

const routeParams = { params: Promise.resolve({ id: 'version-1' }) } as never;

describeRefusalsPassedOn('PUT and DELETE /api/task-versions/:id', mockAuthenticatedGuard, [
	['an update', () => PUT(routeRequest(ROUTE, 'PUT'), routeParams) as Promise<Response>, mockPUT],
	['a deletion', () => DELETE(routeRequest(ROUTE, 'DELETE'), routeParams) as Promise<Response>, mockDELETE]
]);
