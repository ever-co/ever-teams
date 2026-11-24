import { NextResponse } from 'next/server';
import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { deleteDailyPlanRequest, getPlanByIdRequest, updatePlanRequest } from '@/core/services/server/requests';
import { IUpdateDailyPlan } from '@/core/types/interfaces/task/daily-plan/daily-plan';
import { refuseForeignOrigin } from '@/core/services/server/same-origin-request';
import { gauzyErrorResponse } from '@/core/services/server/gauzy-error-response';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
	const id = (await params).id;
	if (!id) {
		return NextResponse.json({ error: 'Plan ID is required' }, { status: 400 });
	}

	const { $res, user, tenantId, access_token } = await authenticatedGuard(req, new NextResponse());

	// The guard's own status: 401 for a refused session, 503 when Gauzy could not answer (no logout then)
	if (!user) return $res('Unauthorized');

	try {
		const response = await getPlanByIdRequest({
			planId: id,
			bearer_token: access_token,
			tenantId
		});
		return $res(response.data);
	} catch (error) {
		// A refusal of the API goes back with its status and reason, as in direct mode (#5726)
		return await gauzyErrorResponse(error, 'The plan could not be read.');
	}
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
	const foreign = refuseForeignOrigin(req);
	if (foreign) return foreign;
	const id = (await params).id;
	if (!id) {
		return;
	}
	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, new NextResponse());

	if (!user) return $res('Unauthorized');

	const body = (await req.json()) as unknown as IUpdateDailyPlan;

	try {
		const response = await updatePlanRequest({
			bearer_token: access_token,
			data: body,
			planId: id,
			tenantId
		});
		return $res(response.data);
	} catch (error) {
		// A refusal of the API goes back with its status and reason, as in direct mode (#5726)
		return await gauzyErrorResponse(error, 'The plan could not be updated.');
	}
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
	const foreign = refuseForeignOrigin(req);
	if (foreign) return foreign;
	const id = (await params).id;
	if (!id) {
		return;
	}

	const { $res, user, access_token } = await authenticatedGuard(req, new NextResponse());
	if (!user) return $res('Unauthorized');

	try {
		const response = await deleteDailyPlanRequest({
			planId: id,
			bearer_token: access_token
		});
		return $res(response.data);
	} catch (error) {
		// A refusal of the API goes back with its status and reason, as in direct mode (#5726)
		return await gauzyErrorResponse(error, 'The plan could not be deleted.');
	}
}
