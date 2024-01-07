import { IOrganizationTeamEmployeeUpdate } from '@app/interfaces';
import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard-app';
import { updateOrganizationTeamEmployeeActiveTaskRequest } from '@app/services/server/requests';
import { NextResponse } from 'next/server';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
	const res = new NextResponse();
	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, res);
	if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

	const { id } = params;
	const body = (await req.json()) as IOrganizationTeamEmployeeUpdate;

	if (id) {
		return $res(
			await updateOrganizationTeamEmployeeActiveTaskRequest({
				id: id as string,
				bearer_token: access_token,
				tenantId,
				body
			})
		);
	}
}
