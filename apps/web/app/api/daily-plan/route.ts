import { ICreateDailyPlan } from '@/core/types/interfaces/daily-plan/daily-plan';
import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { createPlanRequest, getAllDayPlans } from '@/core/services/server/requests';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
	const res = new NextResponse();
	const { $res, user, access_token: bearer_token, tenantId } = await authenticatedGuard(req, res);

	if (!user) return $res('Unauthorized');

	const body = (await req.json()) as unknown as ICreateDailyPlan;

	const response = await createPlanRequest({ data: body, bearer_token: bearer_token || '', tenantId });

	return $res(response.data);
}

export async function GET(req: NextRequest) {
	const res = new NextResponse();

	const {
		$res,
		user,
		tenantId,
		organizationId,
		teamId: organizationTeamId,
		access_token
	} = await authenticatedGuard(req, res);
	if (!user) return $res('Unauthorized');

	const response = await getAllDayPlans({
		bearer_token: access_token || '',
		organizationId: organizationId || '',
		tenantId: tenantId || '',
		organizationTeamId: organizationTeamId || ''
	});

	return $res(response.data);
}
