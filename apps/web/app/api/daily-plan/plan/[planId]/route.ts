import { IDailyPlanTasksUpdate, INextParams } from '@app/interfaces';
import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard-app';
import { addTaskToDailyPlanRequest } from '@app/services/server/requests';
import { NextResponse } from 'next/server';

export async function POST(req: Request, { params }: INextParams) {
	const res = new NextResponse();

	const { planId } = params;
	if (!planId) {
		return;
	}

	const { $res, user, tenantId, access_token } = await authenticatedGuard(req, res);
	if (!user) return $res('Unauthorized');

	const body = (await req.json()) as unknown as IDailyPlanTasksUpdate;

	const response = await addTaskToDailyPlanRequest({
		bearer_token: access_token,
		data: body,
		planId,
		tenantId
	});

	return $res(response.data);
}
