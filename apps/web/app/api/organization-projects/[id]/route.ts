import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard-app';

import { editOrganizationProjectsRequest, getOrganizationProjectRequest } from '@app/services/server/requests';
import { NextResponse } from 'next/server';

export async function PUT(req: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const res = new NextResponse();
    if (!params.id) {
		return;
	}

    const { $res, user, access_token, tenantId } = await authenticatedGuard(req, res);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();

    const response = await editOrganizationProjectsRequest({
		bearer_token: access_token,
		id: params.id,
		datas: body,
		tenantId
	});

    return $res(response.data);
}

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const res = new NextResponse();
    if (!params.id) {
		return;
	}

    const { $res, user, access_token, tenantId } = await authenticatedGuard(req, res);

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const response = await getOrganizationProjectRequest({
		bearer_token: access_token,
		id: params.id,
		tenantId
	});

    return $res(response.data);
}
