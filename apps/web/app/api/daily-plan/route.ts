import { NextResponse } from 'next/server';
import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard-app';
import { ICreateDailyPlan } from '@app/interfaces';
import { createPlanRequest, getDayPlansByEmployee } from '@app/services/server/requests';
import { INextParams } from '@app/interfaces';

export async function POST(req: Request) {
	const res = new NextResponse();
	const { $res, user, access_token: bearer_token, tenantId } = await authenticatedGuard(req, res);

	if (!user) return $res('Unauthorized');

	const body = (await req.json()) as unknown as ICreateDailyPlan;

	const response = await createPlanRequest({ data: body, bearer_token, tenantId });

	return $res(response.data);
}

export async function GET(req: Request, { params }: INextParams) {
	const res = new NextResponse();
	const { id } = params;
	if (!id) {
		return;
	}

	const { $res, user, tenantId, organizationId, access_token } = await authenticatedGuard(req, res);
	if (!user) return $res('Unauthorized');

	const response = await getDayPlansByEmployee({
		bearer_token: access_token,
		employeeId: id,
		organizationId,
		tenantId
	});

	return $res(response.data);
}
