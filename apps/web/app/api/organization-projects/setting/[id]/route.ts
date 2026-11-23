import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';

import { editOrganizationProjectsSettingsRequest } from '@/core/services/server/requests';
import { NextResponse } from 'next/server';
import { refuseForeignOrigin } from '@/core/services/server/same-origin-request';
import { gauzyErrorResponse } from '@/core/services/server/gauzy-error-response';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
	const foreign = refuseForeignOrigin(req);
	if (foreign) return foreign;
	const res = new NextResponse();
	const id = (await params).id;
	if (!id) {
		return;
	}

	const { $res, user, access_token, tenantId, status } = await authenticatedGuard(req, res);

	if (!user) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: status ?? 401 });
	}

	const body = await req.json();

	try {
		const response = await editOrganizationProjectsSettingsRequest({
			id: id,
			bearer_token: access_token,
			datas: body,
			tenantId
		});
		return $res(response.data);
	} catch (error) {
		// A refusal of the API goes back with its status and reason, as in direct mode (#5726)
		return await gauzyErrorResponse(error, 'The setting of the project could not be updated.');
	}
}
