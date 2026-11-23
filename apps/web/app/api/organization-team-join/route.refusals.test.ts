/**
 * @jest-environment node
 */
/**
 * POST /api/organization-team-join (#5726): a refusal of the API left the handler as an unhandled rejection, and the
 * browser got an empty 500 that the app read as "Try again in a moment".
 */
const mockGuard = jest.fn();
const mockPOST = jest.fn();

jest.mock('@/core/services/server/requests', () => ({
	getRequestToJoinRequest: jest.fn(),
	requestToJoinRequest: (...args: unknown[]) => mockPOST(...args)
}));
jest.mock('@/core/services/server/guards/authenticated-guard-app', () => ({
	authenticatedGuard: (...args: unknown[]) => mockGuard(...args)
}));

import { POST } from './route';
import { describeRefusalsPassedOn, routeRequest } from '@/test/api/refusals-passed-on';

const ROUTE = 'https://app.example.com/api/organization-team-join';

// A public route: nobody is signed in when a person asks to join a team
describeRefusalsPassedOn('POST /api/organization-team-join', mockGuard, [
	['a request to join', () => POST(routeRequest(ROUTE, 'POST')), mockPOST]
]);
