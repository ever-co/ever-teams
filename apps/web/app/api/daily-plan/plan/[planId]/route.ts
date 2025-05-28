import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { addTaskToDailyPlanRequest, removeTaskFromPlanRequest } from '@/core/services/server/requests';
import { IDailyPlanTasksUpdate } from '@/core/types/interfaces/task/daily-plan/daily-plan';
import { NextResponse } from 'next/server';

export async function POST(req: Request, { params }: { params: Promise<{ planId: string }> }) {
	const planId = (await params).planId;
	const res = new NextResponse();

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

export async function PUT(req: Request, { params }: { params: Promise<{ planId: string }> }) {
	const planId = (await params).planId;
	const res = new NextResponse();

	if (!planId) {
		return;
	}

	const { $res, user, tenantId, access_token } = await authenticatedGuard(req, res);
	if (!user) return $res('Unauthorized');

	const body = (await req.json()) as unknown as IDailyPlanTasksUpdate;

	const response = await removeTaskFromPlanRequest({
		data: body,
		planId,
		tenantId,
		bearer_token: access_token
	});

	return $res(response.data);
}
