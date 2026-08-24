import assert from 'node:assert/strict';
import test from 'node:test';

import { isRichGlobalRead, normalizeGauzyRequest } from './normalize-gauzy-request.mjs';

const API_ORIGINS = ['https://apidev.ever.team', 'http://127.0.0.1:3988'];
const TASK_ID = '11111111-1111-4111-8111-111111111111';
const EMPLOYEE_ID = '22222222-2222-4222-8222-222222222222';

test('normalizes only Gauzy fetch/XHR requests with canonical query ordering', () => {
	const normalized = normalizeGauzyRequest(
		{
			method: 'get',
			resourceType: 'xhr',
			url:
				`https://apidev.ever.team/api/tasks/${TASK_ID}` +
				`?relations%5B1%5D=members&employeeId=${EMPLOYEE_ID}&relations%5B0%5D=tags`
		},
		{ apiOrigins: API_ORIGINS }
	);

	assert.deepEqual(normalized, {
		method: 'GET',
		path: '/api/tasks/:uuid',
		query: `employeeId=${EMPLOYEE_ID}&relations%5B%5D=members&relations%5B%5D=tags`,
		key: `GET /api/tasks/:uuid?employeeId=${EMPLOYEE_ID}` + '&relations%5B%5D=members&relations%5B%5D=tags',
		routeKey: 'GET /api/tasks/:uuid',
		richGlobalRead: false
	});
});

test('sorts repeated array values without normalizing UUID query values', () => {
	const normalized = normalizeGauzyRequest(
		{
			method: 'GET',
			resourceType: 'fetch',
			url:
				`http://127.0.0.1:3988/api/timesheet/statistics/profile-activity?employeeId=${EMPLOYEE_ID}` +
				'&include%5B%5D=daily&include%5B%5D=summary'
		},
		{ apiOrigins: API_ORIGINS }
	);

	assert.equal(
		normalized?.key,
		`GET /api/timesheet/statistics/profile-activity?employeeId=${EMPLOYEE_ID}` +
			'&include%5B%5D=daily&include%5B%5D=summary'
	);
});

test('excludes non-Gauzy, OPTIONS, non-fetch/XHR, assets, RSC, session, and health traffic', () => {
	const excluded = [
		{ method: 'GET', resourceType: 'xhr', url: 'https://example.test/api/tasks' },
		{ method: 'OPTIONS', resourceType: 'xhr', url: 'https://apidev.ever.team/api/tasks' },
		{ method: 'GET', resourceType: 'websocket', url: 'https://apidev.ever.team/api/tasks' },
		{ method: 'GET', resourceType: 'fetch', url: 'https://apidev.ever.team/api/health' },
		{ method: 'GET', resourceType: 'fetch', url: 'https://apidev.ever.team/api/auth/session' },
		{ method: 'GET', resourceType: 'xhr', url: 'https://apidev.ever.team/api/icon.svg' },
		{ method: 'GET', resourceType: 'fetch', url: 'https://apidev.ever.team/api/tasks?_rsc=fixture' }
	];

	for (const request of excluded) {
		assert.equal(normalizeGauzyRequest(request, { apiOrigins: API_ORIGINS }), null);
	}
});

test('classifies only legacy global time-log/report reads as rich', () => {
	assert.equal(isRichGlobalRead('GET', '/api/timesheet/time-log'), true);
	assert.equal(isRichGlobalRead('GET', '/api/timesheet/time-log/report/daily'), true);
	assert.equal(isRichGlobalRead('GET', '/api/timesheet/activity/report'), true);
	assert.equal(isRichGlobalRead('POST', '/api/timesheet/time-log'), false);
	assert.equal(isRichGlobalRead('GET', '/api/timesheet/time-log/time-limit'), false);
	assert.equal(isRichGlobalRead('GET', '/api/timesheet/statistics/profile-activity'), false);
});

test('preserves malformed percent-encoded path segments without aborting capture', () => {
	let normalized;
	assert.doesNotThrow(() => {
		normalized = normalizeGauzyRequest(
			{
				method: 'GET',
				resourceType: 'xhr',
				url: 'https://apidev.ever.team/api/tasks/%E0%A4%A'
			},
			{ apiOrigins: API_ORIGINS }
		);
	});

	assert.equal(normalized?.path, '/api/tasks/%E0%A4%A');
});
