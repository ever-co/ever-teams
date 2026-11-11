import { NextResponse } from 'next/server';
import { INextParams } from '@/core/types/interfaces/common/data-response';
import { apiErrorStatusOf, unwrapRejection } from '@/core/services/server/fetch';
import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { deleteEmployeeAppointmentRequest } from '@/core/services/server/requests/employee-appointment';

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
