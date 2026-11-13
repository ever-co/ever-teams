import { NextResponse } from 'next/server';
import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { gauzyErrorResponse } from '@/core/services/server/gauzy-error-response';
import { getInactiveEmployeesPageRequest } from '@/core/services/server/requests/employee';
import { inactiveEmployeesQuerySchema } from '@/core/lib/validation/member-access';
import { inactiveEmployeePageSchema } from '@/core/types/schemas/organization/inactive-employee.schema';

const UNREADABLE_MESSAGE = 'The inactive members could not be read.';

/**
 * Proxy mode: a page of the employees of the caller's organization whose work ended, cut to what the members
 * settings show. Gauzy refuses a caller without ORG_EMPLOYEES_VIEW, and its refusal is passed on.
 */
export async function GET(req: Request) {
	const { $res, user, access_token, tenantId, organizationId } = await authenticatedGuard(req, new NextResponse());
	if (!user) return $res('Unauthorized');

	const page = new URL(req.url).searchParams.get('page');
	const parsedQuery = inactiveEmployeesQuerySchema.safeParse({ page });
	if (!parsedQuery.success) {
		return NextResponse.json({ message: 'A page number from 1 is required' }, { status: 400 });
	}

	try {
		const { data } = await getInactiveEmployeesPageRequest({
			page: parsedQuery.data.page,
			organizationId,
			bearer_token: access_token,
			tenantId
		});
		const parsedPage = inactiveEmployeePageSchema.safeParse(data);
		if (!parsedPage.success) {
			return NextResponse.json({ message: UNREADABLE_MESSAGE }, { status: 502 });
		}
		return $res(parsedPage.data);
	} catch (error) {
		return gauzyErrorResponse(error, UNREADABLE_MESSAGE);
	}
}
