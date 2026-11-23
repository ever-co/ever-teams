/**
 * @jest-environment node
 */
/**
 * GET /api/employee/members (#5726): a refusal of the API left the handler as an unhandled rejection, and the
 * browser got an empty 500 that the app read as "Try again in a moment".
 */
const mockAuthenticatedGuard = jest.fn();
const mockGET = jest.fn();

jest.mock('@/core/services/server/guards/authenticated-guard-app', () => ({
	authenticatedGuard: (...args: unknown[]) => mockAuthenticatedGuard(...args)
}));
jest.mock('@/core/services/server/requests', () => ({
	getOrganizationEmployees: (...args: unknown[]) => mockGET(...args)
}));

import { GET } from './route';
import { NextRequest } from 'next/server';
import { describeRefusalsPassedOn } from '@/test/api/refusals-passed-on';

const ROUTE = 'https://app.example.com/api/employee/members';

describeRefusalsPassedOn('GET /api/employee/members', mockAuthenticatedGuard, [
	['a read', () => GET(new NextRequest(`${ROUTE}?organizationTeamId=team-1`)) as Promise<Response>, mockGET]
]);
