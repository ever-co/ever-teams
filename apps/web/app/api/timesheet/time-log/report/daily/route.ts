import { NextRequest, NextResponse } from 'next/server';
import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { getTimeLogReportDailyRequest } from '@/core/services/server/requests/timesheet';
import { ITimeLogRequestParams, readArrayParam } from '@/core/services/server/requests/timesheet';
import { gauzyErrorResponse } from '@/core/services/server/gauzy-error-response';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
	const res = new NextResponse();

	try {
		// Authenticate before reading parameters: the guard answers 401 to a rejected token and 503 when
		// the session check could not reach Gauzy, so an outage never looks like an expired session
		const guard = await authenticatedGuard(req, res);
		if (!guard.user) return guard.deny();
		const { access_token } = guard;

		const searchParams = req.nextUrl.searchParams;

		const params: Partial<ITimeLogRequestParams> = {
			tenantId: searchParams.get('tenantId') || undefined,
			organizationId: searchParams.get('organizationId') || undefined,
			startDate: searchParams.get('startDate') || undefined,
			endDate: searchParams.get('endDate') || undefined,
			timeZone: searchParams.get('timeZone') || undefined,
			groupBy: searchParams.get('groupBy') || undefined
		};

		if (!params.tenantId || !params.organizationId || !params.startDate || !params.endDate) {
			return new Response(
				JSON.stringify({
					message:
						'Required parameters missing: tenantId, organizationId, startDate, and endDate are required'
				}),
				{
					status: 400,
					headers: {
						'Content-Type': 'application/json'
					}
				}
			);
		}

		// The same four array filters that buildTimeLogParams forwards to Gauzy
		for (const key of ['projectIds', 'employeeIds', 'taskIds', 'teamIds'] as const) {
			const values = readArrayParam(searchParams, key);
			if (values.length) params[key] = values;
		}

		if (searchParams.get('includeTimeWithoutTeam') === 'true') {
			params.includeTimeWithoutTeam = true;
		}

		if (searchParams.get('billableOnly') === 'true') {
			params.billableOnly = true;
		}

		// Gauzy answers the client rates only to a role that may read them, and 403 to anyone else
		if (searchParams.get('withClientRates') === 'true') {
			params.withClientRates = true;
		}

		const activityLevelStart = searchParams.get('activityLevel[start]');
		const activityLevelEnd = searchParams.get('activityLevel[end]');

		if (activityLevelStart && activityLevelEnd) {
			params.activityLevel = {
				start: parseInt(activityLevelStart),
				end: parseInt(activityLevelEnd)
			};
		}

		const { data } = await getTimeLogReportDailyRequest(params as ITimeLogRequestParams, access_token);

		return new Response(JSON.stringify(data), {
			status: 200,
			headers: {
				'Content-Type': 'application/json'
			}
		});
	} catch (error) {
		// Gauzy's own answer goes on (a 403 stays one); a failure without one is a 502
		return gauzyErrorResponse(error, 'The daily report could not be read');
	}
}
