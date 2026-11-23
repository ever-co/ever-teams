import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { addTaskToDailyPlanRequest, removeTaskFromPlanRequest } from '@/core/services/server/requests';
import { IDailyPlanTasksUpdate } from '@/core/types/interfaces/task/daily-plan/daily-plan';
import { NextResponse } from 'next/server';
import { refuseForeignOrigin } from '@/core/services/server/same-origin-request';
import { gauzyErrorResponse } from '@/core/services/server/gauzy-error-response';

export async function POST(req: Request, { params }: { params: Promise<{ planId: string }> }) {
	const foreign = refuseForeignOrigin(req);
	if (foreign) return foreign;
	const planId = (await params).planId;
	const res = new NextResponse();

	if (!planId) {
		return;
	}

	const { $res, user, tenantId, access_token } = await authenticatedGuard(req, res);
	if (!user) return $res('Unauthorized');

	const body = (await req.json()) as unknown as IDailyPlanTasksUpdate;

	try {
		const response = await addTaskToDailyPlanRequest({
			bearer_token: access_token,
			data: body,
			planId,
			tenantId
		});
		return $res(response.data);
	} catch (error) {
		// A refusal of the API goes back with its status and reason, as in direct mode (#5726)
		return await gauzyErrorResponse(error, 'The task could not be added to the plan.');
	}
}

export async function PUT(req: Request, { params }: { params: Promise<{ planId: string }> }) {
	const foreign = refuseForeignOrigin(req);
	if (foreign) return foreign;
	const planId = (await params).planId;
	const res = new NextResponse();

	if (!planId) {
		return;
	}

	const { $res, user, tenantId, access_token } = await authenticatedGuard(req, res);
	if (!user) return $res('Unauthorized');

	const body = (await req.json()) as unknown as IDailyPlanTasksUpdate;

	try {
		const response = await removeTaskFromPlanRequest({
			data: body,
			planId,
			tenantId,
			bearer_token: access_token
		});
		return $res(response.data);
	} catch (error) {
		// A refusal of the API goes back with its status and reason, as in direct mode (#5726)
		return await gauzyErrorResponse(error, 'The task could not be removed from the plan.');
	}
}
