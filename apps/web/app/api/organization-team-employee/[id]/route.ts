import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import {
	deleteOrganizationTeamEmployeeRequest,
	updateOrganizationTeamEmployeeRequest
} from '@/core/services/server/requests';
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

	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, res);

	if (!user) return $res('Unauthorized');

	const body = (await req.json()) as IOrganizationTeamEmployeeUpdate;

	try {
		const response = await updateOrganizationTeamEmployeeRequest({
			id: id,
			bearer_token: access_token || '',
			tenantId: tenantId || '',
			body: body
		});
		return $res(response.data);
	} catch (error) {
		// A refusal of the API goes back with its status and reason, as in direct mode (#5726)
		return await gauzyErrorResponse(error, 'The team member could not be updated');
	}
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
	const foreign = refuseForeignOrigin(req);
	if (foreign) return foreign;
	const id = (await params).id;
	const res = new NextResponse();

	if (!id) {
		return;
	}

	const { $res, user, access_token, tenantId, organizationId, teamId } = await authenticatedGuard(req, res);

	if (!user) return $res('Unauthorized');

	const { searchParams } = new URL(req.url);

	const employeeId = searchParams.get('employeeId') as string;
	// The team the page names for this membership; the active-team cookie is shared by every tab and may name
	// another team (#5737). A request without it keeps the cookie, as before.
	const namedTeamId = searchParams.get('organizationTeamId');
	const organizationTeamId = namedTeamId || teamId || '';

	try {
		const response = await deleteOrganizationTeamEmployeeRequest({
			id: id,
			bearer_token: access_token || '',
			tenantId: tenantId || '',
			organizationId: organizationId || '',
			employeeId: employeeId,
			organizationTeamId
		});
		return $res(response.data);
	} catch (error) {
		return await gauzyErrorResponse(error, 'The team member could not be removed');
	}
}
