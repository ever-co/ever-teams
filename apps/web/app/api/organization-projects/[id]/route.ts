import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard-app';

import { editOrganizationProjectsRequest } from '@app/services/server/requests';
import { NextResponse } from 'next/server';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
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

export async function generateStaticParams() {
	return [{ id: '' }];
}
