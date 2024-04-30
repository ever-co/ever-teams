import { NextResponse } from 'next/server';
import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard-app';
import { ICreateDailyPlan } from '@app/interfaces/IDailyPlan';
import { createPlanRequest } from '@app/services/server/requests/daily-plan';

export async function POST(req: Request) {
	const res = new NextResponse();
	const { $res, user, access_token } = await authenticatedGuard(req, res);

	if (!user) return $res('Unauthorized');

	const body = (await req.json()) as unknown as ICreateDailyPlan;

	const response = await createPlanRequest({ data: body, bearer_token: access_token });

	return $res(response.data);
}
