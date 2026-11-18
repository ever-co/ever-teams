// The client's totals, against the built package: node --test test/*.test.mjs (from packages/api, after
// `rollup -c`).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '../dist/index.es.js';
import { API_URL, ME, standInApi } from './support/stand-in-api.mjs';

// What GET /timesheet/statistics/counts answers (ICountsStatistics).
const COUNTS = {
	employeesCount: 1,
	projectsCount: 2,
	todayActivities: 61.5,
	todayDuration: 5400,
	weekActivities: 58.25,
	weekDuration: 54000
};

test("today's total is the member's tracked seconds and activity today", async () => {
	const api = standInApi({ 'GET /user/me': ME, 'GET /timesheet/statistics/counts': COUNTS });
	const teams = createClient({ apiUrl: API_URL, token: 't', fetch: api.fetch });

	const today = await teams.totals.today();

	const { query, headers } = api.requests[1];
	const todayStart = new Date(query.todayStart);
	const todayEnd = new Date(query.todayEnd);
	const now = new Date();
	assert.deepEqual(today, { duration: 5400, activity: 61.5 });
	assert.deepEqual(query.employeeIds, ['employee-1']);
	assert.equal(query.tenantId, 'tenant-1');
	assert.equal(query.organizationId, 'org-1');
	assert.equal(query.timeZone, Intl.DateTimeFormat().resolvedOptions().timeZone);
	assert.equal(todayStart.getTime(), new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime());
	// The last instant before the next local midnight: a day with a daylight-saving change lasts 23 or 25 hours.
	assert.equal(todayEnd.getTime(), new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() - 1);
	assert.equal(headers.get('tenant-id'), 'tenant-1');
});

test("this week's total covers Monday to Sunday", async () => {
	const api = standInApi({ 'GET /user/me': ME, 'GET /timesheet/statistics/counts': COUNTS });
	const teams = createClient({ apiUrl: API_URL, token: 't', fetch: api.fetch });

	const week = await teams.totals.week();

	const { query } = api.requests[1];
	const start = new Date(query.startDate);
	const end = new Date(query.endDate);
	const now = Date.now();
	assert.deepEqual(week, { duration: 54000, activity: 58.25 });
	assert.equal(start.getDay(), 1);
	assert.equal(start.getHours(), 0);
	assert.equal(end.getDay(), 0);
	assert.equal(end.getHours(), 23);
	assert.ok(start.getTime() <= now && now <= end.getTime());
});
