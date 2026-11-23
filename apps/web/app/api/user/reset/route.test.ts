/**
 * @jest-environment node
 */
/**
 * DELETE /api/user/reset (#5726): a refusal of the API left the handler as an unhandled rejection, and the
 * browser got an empty 500 that the app read as "Try again in a moment".
 */
const mockAuthenticatedGuard = jest.fn();
const mockDELETE = jest.fn();

jest.mock('@/core/services/server/guards/authenticated-guard-app', () => ({
	authenticatedGuard: (...args: unknown[]) => mockAuthenticatedGuard(...args)
}));
jest.mock('@/core/services/server/requests/user', () => ({
	resetUserRequest: (...args: unknown[]) => mockDELETE(...args)
}));

import { DELETE } from './route';
import { describeRefusalsPassedOn, routeRequest } from '@/test/api/refusals-passed-on';

const ROUTE = 'https://app.example.com/api/user/reset';

describeRefusalsPassedOn('DELETE /api/user/reset', mockAuthenticatedGuard, [
	['a deletion', () => DELETE(routeRequest(ROUTE, 'DELETE')) as Promise<Response>, mockDELETE]
]);
