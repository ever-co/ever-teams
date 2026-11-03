import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { NextResponse } from 'next/server';
import { serverFetch } from '@/core/services/server/fetch';
import { readArrayParam } from '@/core/services/server/requests/timesheet';
import { ETimeLogType } from '@/core/types/generics/enums/timer';
import type { ITimeLogReportDailyChart } from '@/core/types/interfaces/activity/activity-report';

const ARRAY_FILTERS = ['projectIds', 'employeeIds', 'taskIds', 'teamIds'] as const;

const LOG_TYPES: ReadonlyArray<string> = Object.values(ETimeLogType);

function isLogType(value: string) {
	return LOG_TYPES.includes(value);
}

function appendIndexed(query: URLSearchParams, key: string, values: ReadonlyArray<string>) {
	values.forEach((value, index) => {
		query.append(`${key}[${index}]`, value);
	});
}

export async function GET(req: Request) {
	const res = new NextResponse();
	const { searchParams } = new URL(req.url);

	// Get all required parameters from the URL
	const activityLevelStart = searchParams.get('activityLevel[start]');
	const activityLevelEnd = searchParams.get('activityLevel[end]');
	const organizationId = searchParams.get('organizationId');
	const tenantId = searchParams.get('tenantId');
	const startDate = searchParams.get('startDate');
	const endDate = searchParams.get('endDate');
	const timeZone = searchParams.get('timeZone');
	const groupBy = searchParams.get('groupBy');

	// Validate required parameters
	if (!startDate || !endDate || !organizationId || !tenantId) {
		return NextResponse.json(
			{
				error: 'Missing required parameters: startDate, endDate, organizationId, and tenantId are required'
			},
			{ status: 400 }
		);
	}

	const requestedLogTypes = readArrayParam(searchParams, 'logType');
	const hasOnlyKnownLogTypes = requestedLogTypes.every(isLogType);
	if (!hasOnlyKnownLogTypes) {
		return NextResponse.json({ error: `logType takes ${LOG_TYPES.join(', ')}` }, { status: 400 });
	}

	// Authenticate the request
	const { $res, user, access_token } = await authenticatedGuard(req, res);
	if (!user) return $res('Unauthorized');

	try {
		const activityStart = parseInt(activityLevelStart || '0');
		const activityEnd = parseInt(activityLevelEnd || '100');
		const query = new URLSearchParams({
			organizationId,
			tenantId,
			startDate,
			endDate,
			timeZone: timeZone || 'Etc/UTC',
			groupBy: groupBy || 'date'
		});
		query.append('activityLevel[start]', String(activityStart));
		query.append('activityLevel[end]', String(activityEnd));

		// The member, project, task and team filters and the log types, forwarded as the direct call sends them
		for (const key of ARRAY_FILTERS) {
			const values = readArrayParam(searchParams, key);
			appendIndexed(query, key, values);
		}
		appendIndexed(query, 'logType', requestedLogTypes);

		// Make the request to get daily chart data
		const { data } = await serverFetch<ITimeLogReportDailyChart[]>({
			path: `/timesheet/time-log/report/daily-chart?${query.toString()}`,
			method: 'GET',
			bearer_token: access_token,
			tenantId
		});

		return NextResponse.json(data);
	} catch (error) {
		console.error('Error fetching daily chart data:', error);
		return NextResponse.json({ error: 'Failed to fetch daily chart data' }, { status: 500 });
	}
}
