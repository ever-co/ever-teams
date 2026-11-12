import { NextResponse } from 'next/server';
import { INextParams } from '@/core/types/interfaces/common/data-response';
import { apiErrorStatusOf, unwrapRejection } from '@/core/services/server/fetch';
import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import {
	deleteEmployeeAppointmentRequest,
	updateEmployeeAppointmentRequest
} from '@/core/services/server/requests/employee-appointment';

/** The proxy-mode twin of Gauzy's `PUT /employee-appointment/:id`: reschedules a meeting (#5021). */
export async function PUT(req: Request, props: INextParams) {
	const params = await props.params;
	if (!params.id) return NextResponse.json({}, { status: 400 });

	const { $res, user, access_token, tenantId, status } = await authenticatedGuard(req, new NextResponse());

	if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: status ?? 401 });

	const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
	if (!body || typeof body !== 'object' || Array.isArray(body)) {
		return NextResponse.json({ error: 'The appointment must be a JSON object' }, { status: 400 });
	}

	try {
		const { data } = await updateEmployeeAppointmentRequest({
			id: params.id,
			data: body,
			bearer_token: access_token || '',
			tenantId: tenantId || ''
		});
		return $res(data);
	} catch (error) {
		// Gauzy's refusal (404 for another member's appointment, 403 without the permission, 400 for a bad time)
		const apiError = await unwrapRejection(error);
		const apiStatus = apiErrorStatusOf(apiError);
		if (apiStatus === undefined) throw error;
		return NextResponse.json(apiError, { status: apiStatus });
	}
}

/** The proxy-mode twin of Gauzy's `DELETE /employee-appointment/:id`: cancels a scheduled meeting (#5021). */
export async function DELETE(req: Request, props: INextParams) {
	const params = await props.params;
	if (!params.id) return NextResponse.json({}, { status: 400 });

	const { $res, user, access_token, tenantId, status } = await authenticatedGuard(req, new NextResponse());

	if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: status ?? 401 });

	try {
		const { data } = await deleteEmployeeAppointmentRequest({
			id: params.id,
			bearer_token: access_token || '',
			tenantId: tenantId || ''
		});
		return $res(data);
	} catch (error) {
		// Gauzy's refusal (404 for another member's appointment, 403 without the permission) keeps its status
		const apiError = await unwrapRejection(error);
		const apiStatus = apiErrorStatusOf(apiError);
		if (apiStatus === undefined) throw error;
		return NextResponse.json(apiError, { status: apiStatus });
	}
}
