import { NextResponse } from 'next/server';
import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard-app';
import { deleteDailyPlanRequest, getDayPlansByEmployee, updatePlanRequest } from '@app/services/server/requests';
import { INextParams, IUpdateDailyPlan } from '@app/interfaces';

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

export async function PUT(req: Request, { params }: INextParams) {
	const res = new NextResponse();
	const { id } = params;
	if (!id) {
		return;
	}

	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, res);

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

export async function DELETE(req: Request, { params }: INextParams) {
	const res = new NextResponse();
	const { id } = params;
	if (!id) {
		return;
	}

	const { $res, user, access_token } = await authenticatedGuard(req, res);
	if (!user) return $res('Unauthorized');

	const response = await deleteDailyPlanRequest({
		planId: id,
		bearer_token: access_token
	});

	return $res(response.data);
}
