import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard-app';
import {
	addEmployeeOrganizationTeamOrderRequest,
	removeEmployeeOrganizationTeamRequest
} from '@app/services/server/requests';
import { NextResponse } from 'next/server';

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
	const res = new NextResponse();
	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, res);
	if (!user) return NextResponse.json({}, { status: 401 });

	const { id } = params;

	if (!id) {
		return NextResponse.json({}, { status: 405 });
	}

	return $res(
		await removeEmployeeOrganizationTeamRequest({
			bearer_token: access_token,
			tenantId,
			employeeId: id.toString()
		})
	);
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
	const res = new NextResponse();
	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, res);
	if (!user) return NextResponse.json({}, { status: 401 });

	const body = await req.json();

	const { id } = params;
	const order = body.order;

	if (!id) {
		return NextResponse.json({}, { status: 405 });
	}

	return $res(
		await addEmployeeOrganizationTeamOrderRequest({
			bearer_token: access_token,
			tenantId,
			employeeId: id.toString(),
			order,
			organizationTeamId: body.organizationTeamId,
			organizationId: body.organizationId
		})
	);
}
