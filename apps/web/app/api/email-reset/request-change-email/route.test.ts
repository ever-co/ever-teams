/**
 * @jest-environment node
 */
/**
 * POST /api/email-reset/request-change-email (#5726): a refusal of the API left the handler as an unhandled rejection, and the
 * browser got an empty 500 that the app read as "Try again in a moment".
 */
const mockAuthenticatedGuard = jest.fn();
const mockPOST = jest.fn();

jest.mock('@/core/services/server/guards/authenticated-guard-app', () => ({
	authenticatedGuard: (...args: unknown[]) => mockAuthenticatedGuard(...args)
}));
jest.mock('@/core/services/server/requests', () => ({
	emailResetRequest: (...args: unknown[]) => mockPOST(...args)
}));

import { POST } from './route';
import { describeRefusalsPassedOn, routeRequest } from '@/test/api/refusals-passed-on';

const ROUTE = 'https://app.example.com/api/email-reset/request-change-email';

describeRefusalsPassedOn('POST /api/email-reset/request-change-email', mockAuthenticatedGuard, [
	['a creation', () => POST(routeRequest(ROUTE, 'POST')) as Promise<Response>, mockPOST]
]);
