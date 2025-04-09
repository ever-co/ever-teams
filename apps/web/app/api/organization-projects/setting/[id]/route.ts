import { INextParams } from '@app/interfaces';
import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard-app';

import { editOrganizationProjectsSettingsRequest } from '@app/services/server/requests';
import { NextResponse } from 'next/server';

export async function PUT(req: Request, props: INextParams) {
    const params = await props.params;
    const res = new NextResponse();

    if (!params.id) {
		return;
	}

    const { $res, user, access_token, tenantId } = await authenticatedGuard(req, res);

    if (!user) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

    const body = await req.json();

    const response = await editOrganizationProjectsSettingsRequest({
		id: params.id,
		bearer_token: access_token,
		datas: body,
		tenantId
	});

    return $res(response.data);
}
