import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';

import {
	deleteOrganizationTeamRequest,
	getOrganizationTeamRequest,
	updateOrganizationTeamRequest
} from '@/core/services/server/requests';
import { INextParams } from '@/core/types/interfaces/common/data-response';
import { NextResponse } from 'next/server';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
	const id = (await params).id;
	const res = new NextResponse();

	if (!id) {
		return;
	}

	const { $res, user, organizationId, access_token, tenantId, teamId } = await authenticatedGuard(req, res);

	if (!user) return NextResponse.json({}, { status: 400 });

	const { data } = await getOrganizationTeamRequest(
		{
			organizationId,
			tenantId,
			teamId: teamId
		},
		access_token || ''
	);

	return $res(data);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
	const id = (await params).id;
	const res = new NextResponse();

	if (!id) {
		return;
	}

	const { $res, user, organizationId, access_token, tenantId, teamId } = await authenticatedGuard(req, res);

	if (!user) return NextResponse.json({}, { status: 400 });

	const body = await req.json();

	const { data } = await getOrganizationTeamRequest(
		{
			organizationId,
			tenantId,
			teamId: teamId
		},
		access_token || ''
	);

	await updateOrganizationTeamRequest(body, access_token || '');

	return $res(data);
}

export async function DELETE(req: Request, props: INextParams) {
	const params = await props.params;
	const res = new NextResponse();

	if (!params.id) {
		return NextResponse.json({ error: 'Missing team ID' }, { status: 400 });
	}

	const { $res, user, organizationId, access_token, tenantId } = await authenticatedGuard(req, res);

	if (!user) return NextResponse.json({}, { status: 400 });

	const response = await deleteOrganizationTeamRequest({
		id: params.id,
		bearer_token: access_token || '',
		tenantId: tenantId || '',
		organizationId: organizationId || ''
	});

	return $res(response.data);
}
