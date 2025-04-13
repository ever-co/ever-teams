import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard-app';
import {
	addEmployeeOrganizationTeamOrderRequest,
	removeEmployeeOrganizationTeamRequest
} from '@app/services/server/requests';
import { NextResponse } from 'next/server';

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
	const id = (await params).id;
	const res = new NextResponse();

	if (!id) {
		return NextResponse.json({}, { status: 405 });
	}

	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, res);

	if (!user) return NextResponse.json({}, { status: 401 });

	const response = await removeEmployeeOrganizationTeamRequest({
		bearer_token: access_token,
		tenantId,
		employeeId: id
	});

	return $res(response.data);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
	const id = (await params).id;
	const res = new NextResponse();

	if (!id) {
		return NextResponse.json({}, { status: 405 });
	}

	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, res);

	if (!user) return NextResponse.json({}, { status: 401 });

	const body = await req.json();

	const order = body.order;

	const response = await addEmployeeOrganizationTeamOrderRequest({
		bearer_token: access_token,
		employeeId: id,
		tenantId,
		order,
		organizationTeamId: body.organizationTeamId,
		organizationId: body.organizationId
	});

	return $res(response.data);
}
