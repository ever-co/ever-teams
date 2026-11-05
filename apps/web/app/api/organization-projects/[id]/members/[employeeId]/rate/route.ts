import { NextResponse } from 'next/server';
import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { gauzyErrorResponse } from '@/core/services/server/gauzy-error-response';
import { updateProjectMemberRateRequest } from '@/core/services/server/requests/rates';
import { rateRouteIdSchema, rateUpdateBodySchema } from '@/core/lib/validation/rates';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string; employeeId: string }> }) {
	const { id, employeeId } = await params;
	const parsedProjectId = rateRouteIdSchema.safeParse(id);
	const parsedEmployeeId = rateRouteIdSchema.safeParse(employeeId);
	const hasIds = parsedProjectId.success && parsedEmployeeId.success;
	if (!hasIds) {
		return NextResponse.json({ message: 'A project id and an employee id are required' }, { status: 400 });
	}

	const { $res, user, access_token, tenantId, organizationId } = await authenticatedGuard(req, new NextResponse());
	if (!user) return $res('Unauthorized');

	const body: unknown = await req.json().catch(() => null);
	const parsedBody = rateUpdateBodySchema.safeParse(body);
	if (!parsedBody.success) {
		return NextResponse.json({ message: 'A rate is a number of 0 or more, or null' }, { status: 400 });
	}

	try {
		const { data } = await updateProjectMemberRateRequest({
			projectId: parsedProjectId.data,
			employeeId: parsedEmployeeId.data,
			billRateValue: parsedBody.data.billRateValue,
			organizationId,
			bearer_token: access_token,
			tenantId
		});
		return $res(data);
	} catch (error) {
		return gauzyErrorResponse(error, "The member's rate could not be saved.");
	}
}
