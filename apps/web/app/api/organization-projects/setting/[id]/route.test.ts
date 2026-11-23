/**
 * @jest-environment node
 */
/**
 * PUT /api/organization-projects/setting/:id (#5726): a refusal of the API left the handler as an unhandled rejection, and the
 * browser got an empty 500 that the app read as "Try again in a moment".
 */
const mockAuthenticatedGuard = jest.fn();
const mockPUT = jest.fn();

jest.mock('@/core/services/server/guards/authenticated-guard-app', () => ({
	authenticatedGuard: (...args: unknown[]) => mockAuthenticatedGuard(...args)
}));
jest.mock('@/core/services/server/requests', () => ({
	editOrganizationProjectsSettingsRequest: (...args: unknown[]) => mockPUT(...args)
}));

import { PUT } from './route';
import { describeRefusalsPassedOn, routeRequest } from '@/test/api/refusals-passed-on';

const ROUTE = 'https://app.example.com/api/organization-projects/setting/project-1';

const routeParams = { params: Promise.resolve({ id: 'project-1' }) } as never;

describeRefusalsPassedOn('PUT /api/organization-projects/setting/:id', mockAuthenticatedGuard, [
	['an update', () => PUT(routeRequest(ROUTE, 'PUT'), routeParams) as Promise<Response>, mockPUT]
]);
