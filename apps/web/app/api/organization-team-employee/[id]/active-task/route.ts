import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { updateOrganizationTeamEmployeeActiveTaskRequest } from '@/core/services/server/requests';
import { IOrganizationTeamEmployeeUpdate } from '@/core/types/interfaces/team/organization-team-employee';
import { NextResponse } from 'next/server';
import { refuseForeignOrigin } from '@/core/services/server/same-origin-request';
import { gauzyErrorResponse } from '@/core/services/server/gauzy-error-response';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
	const foreign = refuseForeignOrigin(req);
	if (foreign) return foreign;
	const id = (await params).id;
	const res = new NextResponse();

	if (!id) {
		return;
	}

	const { $res, user, access_token, tenantId, status } = await authenticatedGuard(req, res);

	if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: status ?? 401 });

	const body = (await req.json()) as IOrganizationTeamEmployeeUpdate;

	try {
		const response = await updateOrganizationTeamEmployeeActiveTaskRequest({
			id: id,
			bearer_token: access_token || '',
			tenantId: tenantId || '',
			body
		});
		return $res(response.data);
	} catch (error) {
		// A refusal of the API goes back with its status and reason, as in direct mode (#5726)
		return await gauzyErrorResponse(error, 'The active task of the member could not be updated.');
	}
}
