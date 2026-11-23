/**
 * @jest-environment node
 */
/**
 * POST and PUT /api/tasks/task-linked-issue (#5726): a refusal of the API left the handler as an unhandled rejection, and the
 * browser got an empty 500 that the app read as "Try again in a moment".
 */
const mockAuthenticatedGuard = jest.fn();
const mockPOST = jest.fn();
const mockPUT = jest.fn();

jest.mock('@/core/services/server/guards/authenticated-guard-app', () => ({
	authenticatedGuard: (...args: unknown[]) => mockAuthenticatedGuard(...args)
}));
jest.mock('@/core/services/server/requests', () => ({
	createTaskLinkedIssue: (...args: unknown[]) => mockPOST(...args),
	updateTaskLinkedIssue: (...args: unknown[]) => mockPUT(...args)
}));

import { POST, PUT } from './route';
import { describeRefusalsPassedOn, routeRequest } from '@/test/api/refusals-passed-on';

const ROUTE = 'https://app.example.com/api/tasks/task-linked-issue';

describeRefusalsPassedOn('POST and PUT /api/tasks/task-linked-issue', mockAuthenticatedGuard, [
	['a creation', () => POST(routeRequest(ROUTE, 'POST')) as Promise<Response>, mockPOST],
	['an update', () => PUT(routeRequest(ROUTE, 'PUT')) as Promise<Response>, mockPUT]
]);
