import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';

import { editOrganizationProjectsSettingsRequest } from '@/core/services/server/requests';
import { NextResponse } from 'next/server';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
	const res = new NextResponse();
	const id = (await params).id;
	if (!id) {
		return;
	}

	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, res);

	if (!user) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	const body = await req.json();

	const response = await editOrganizationProjectsSettingsRequest({
		id: id,
		bearer_token: access_token,
		datas: body,
		tenantId
	});

	return $res(response.data);
}
