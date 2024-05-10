import { ICreateDailyPlan, INextParams } from '@app/interfaces';
import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard-app';
import { removeTaskFromPlanRequest } from '@app/services/server/requests';
import { NextResponse } from 'next/server';

export async function PUT(req: Request, { params }: INextParams) {
	const res = new NextResponse();

	const { planId } = params;
	if (!planId) {
		return;
	}

	const { $res, user, tenantId, organizationId, access_token } = await authenticatedGuard(req, res);
	if (!user) return $res('Unauthorized');

	const body = (await req.json()) as unknown as Partial<ICreateDailyPlan>;

	const response = await removeTaskFromPlanRequest({
		data: body,
		organizationId,
		planId,
		tenantId,
		bearer_token: access_token
	});

	return $res(response.data);
}
