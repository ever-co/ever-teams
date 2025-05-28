import { NextResponse } from 'next/server';
import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { deleteDailyPlanRequest, getDayPlansByEmployee, updatePlanRequest } from '@/core/services/server/requests';
import { IUpdateDailyPlan } from '@/core/types/interfaces/daily-plan/daily-plan';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
	const id = (await params).id;
	if (!id) {
		return NextResponse.json({ error: 'Employee ID is required' }, { status: 400 });
	}

	const {
		$res,
		user,
		tenantId,
		organizationId,
		teamId: organizationTeamId,
		access_token
	} = await authenticatedGuard(req, new NextResponse());

	if (!user) {
		return $res('Unauthorized');
	}

	const response = await getDayPlansByEmployee({
		bearer_token: access_token || '',
		employeeId: id,
		organizationId,
		tenantId,
		organizationTeamId
	});

	return $res(response.data);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
	const id = (await params).id;
	if (!id) {
		return;
	}
	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, new NextResponse());

	if (!user) return $res('Unauthorized');

	const body = (await req.json()) as unknown as IUpdateDailyPlan;

	const response = await updatePlanRequest({
		bearer_token: access_token,
		data: body,
		planId: id,
		tenantId
	});

	return $res(response.data);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
	const id = (await params).id;
	if (!id) {
		return;
	}

	const { $res, user, access_token } = await authenticatedGuard(req, new NextResponse());
	if (!user) return $res('Unauthorized');

	const response = await deleteDailyPlanRequest({
		planId: id,
		bearer_token: access_token
	});

	return $res(response.data);
}
