/**
 * @jest-environment node
 */
/**
 * POST and PUT /api/daily-plan/plan/:planId (#5726): a refusal of the API left the handler as an unhandled rejection, and the browser got an
 * empty 500 that the app read as "Try again in a moment".
 */
const mockAuthenticatedGuard = jest.fn();
const mockAddTask = jest.fn();
const mockRemoveTask = jest.fn();

jest.mock('@/core/services/server/guards/authenticated-guard-app', () => ({
	authenticatedGuard: (...args: unknown[]) => mockAuthenticatedGuard(...args)
}));
jest.mock('@/core/services/server/requests', () => ({
	addTaskToDailyPlanRequest: (...args: unknown[]) => mockAddTask(...args),
	removeTaskFromPlanRequest: (...args: unknown[]) => mockRemoveTask(...args)
}));

import { POST, PUT } from './route';
import { describeRefusalsPassedOn } from '@/test/api/refusals-passed-on';

function requestOf(method: string, body?: unknown) {
	let sentBody: string | undefined = undefined;
	if (body !== undefined) {
		sentBody = JSON.stringify(body);
	}
	return new Request('https://app.example.com/api/daily-plan/plan/plan-1', {
		method,
		headers: { 'content-type': 'application/json', origin: 'https://app.example.com' },
		body: sentBody
	});
}

const routeParams = { params: Promise.resolve({ planId: 'plan-1' }) };
const addTask = () => POST(requestOf('POST', { taskId: 'task-1' }), routeParams) as Promise<Response>;
const removeTask = () => PUT(requestOf('PUT', { taskId: 'task-1' }), routeParams) as Promise<Response>;

describeRefusalsPassedOn('POST and PUT /api/daily-plan/plan/:planId', mockAuthenticatedGuard, [
	['a task added', addTask, mockAddTask],
	['a task removed', removeTask, mockRemoveTask]
]);
