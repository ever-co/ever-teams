import { NextResponse } from 'next/server';
import { apiErrorStatusOf, unwrapRejection } from '@/core/services/server/fetch';
import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import {
	createEmployeeAppointmentRequest,
	getEmployeeAppointmentsRequest
} from '@/core/services/server/requests/employee-appointment';

/** Gauzy's refusal goes back with its status (403 without the availability permission, 400 for a bad time). */
async function refusalOf(error: unknown) {
	const apiError = await unwrapRejection(error);
	const apiStatus = apiErrorStatusOf(apiError);
	if (apiStatus === undefined) throw error;
	return NextResponse.json(apiError, { status: apiStatus });
}

/** The proxy-mode twin of Gauzy's `GET /employee-appointment`: the member's scheduled meetings (#5021). */
export async function GET(req: Request) {
	const { $res, user, access_token, tenantId, status } = await authenticatedGuard(req, new NextResponse());

	if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: status ?? 401 });

	try {
		const { data } = await getEmployeeAppointmentsRequest({
			query: new URL(req.url).searchParams.toString(),
			bearer_token: access_token || '',
			tenantId: tenantId || ''
		});
		return $res(data);
	} catch (error) {
		return refusalOf(error);
	}
}

/** The proxy-mode twin of Gauzy's `POST /employee-appointment`: schedules a meeting (#5021). */
export async function POST(req: Request) {
	const { $res, user, access_token, tenantId, status } = await authenticatedGuard(req, new NextResponse());

	if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: status ?? 401 });

	const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
	if (!body || typeof body !== 'object' || Array.isArray(body)) {
		return NextResponse.json({ error: 'The appointment must be a JSON object' }, { status: 400 });
	}

	try {
		const { data } = await createEmployeeAppointmentRequest({
			data: body,
			bearer_token: access_token || '',
			tenantId: tenantId || ''
		});
		return $res(data);
	} catch (error) {
		return refusalOf(error);
	}
}
