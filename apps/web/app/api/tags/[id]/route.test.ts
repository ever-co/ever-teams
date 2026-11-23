/**
 * @jest-environment node
 */
/**
 * DELETE and PUT /api/tags/:id (#5726): a refusal of the API left the handler as an unhandled rejection, and the
 * browser got an empty 500 that the app read as "Try again in a moment".
 */
const mockAuthenticatedGuard = jest.fn();
const mockDELETE = jest.fn();
const mockPUT = jest.fn();

jest.mock('@/core/services/server/guards/authenticated-guard-app', () => ({
	authenticatedGuard: (...args: unknown[]) => mockAuthenticatedGuard(...args)
}));
jest.mock('@/core/services/server/requests', () => ({
	deleteTaskLabelsRequest: (...args: unknown[]) => mockDELETE(...args),
	editTaskLabelsRequest: (...args: unknown[]) => mockPUT(...args)
}));

import { DELETE, PUT } from './route';
import { describeRefusalsPassedOn, routeRequest } from '@/test/api/refusals-passed-on';

const ROUTE = 'https://app.example.com/api/tags/tag-1';

const routeParams = { params: Promise.resolve({ id: 'tag-1' }) } as never;

describeRefusalsPassedOn('DELETE and PUT /api/tags/:id', mockAuthenticatedGuard, [
	['a deletion', () => DELETE(routeRequest(ROUTE, 'DELETE'), routeParams) as Promise<Response>, mockDELETE],
	['an update', () => PUT(routeRequest(ROUTE, 'PUT'), routeParams) as Promise<Response>, mockPUT]
]);
