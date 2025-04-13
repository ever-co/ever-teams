import { IOrganizationTeamEmployeeUpdate } from '@app/interfaces';
import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard-app';
import { updateOrganizationTeamEmployeeActiveTaskRequest } from '@app/services/server/requests';
import { NextResponse } from 'next/server';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
	const id = (await params).id;
	const res = new NextResponse();

	if (!id) {
		return;
	}

	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, res);

	if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

	const body = (await req.json()) as IOrganizationTeamEmployeeUpdate;

	const response = await updateOrganizationTeamEmployeeActiveTaskRequest({
		id: id,
		bearer_token: access_token,
		tenantId,
		body
	});

	return $res(response.data);
}
