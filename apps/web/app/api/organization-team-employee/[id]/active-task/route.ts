import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { updateOrganizationTeamEmployeeActiveTaskRequest } from '@/core/services/server/requests';
import { IOrganizationTeamEmployeeUpdate } from '@/core/types/interfaces/team/IOrganizationTeamEmployee';
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
		bearer_token: access_token || '',
		tenantId: tenantId || '',
		body
	});

	return $res(response.data);
}
