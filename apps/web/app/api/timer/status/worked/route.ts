import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { getTimerWorkedStatusRequest } from '@/core/services/server/requests';
import { NextResponse } from 'next/server';

const EMPLOYEE_IDS_PARAM = /^employeeIds(\[\d*\])?$/;

// The client serializes the ids with qs indices (employeeIds[0]=...), which searchParams.getAll would miss
function namedEmployeeIdsOf(req: Request): string[] {
	const { searchParams } = new URL(req.url);
	const entries = [...searchParams];
	const employeeIdEntries = entries.filter(([name]) => EMPLOYEE_IDS_PARAM.test(name));
	return employeeIdEntries.map(([, value]) => value);
}

export async function GET(req: Request) {
	const res = new NextResponse();
	const { $res, user, tenantId, access_token, organizationId } = await authenticatedGuard(req, res);
	if (!user) return $res('Unauthorized');

	// Teammates' last logs: Gauzy answers with the caller's own last log only, unless the caller may see theirs
	const employeeIds = namedEmployeeIdsOf(req);
	if (employeeIds.length > 0) {
		const { data } = await getTimerWorkedStatusRequest({ tenantId, organizationId, employeeIds }, access_token);
		return $res(data);
	}

	// The employee comes from the session, never from the query string. Without one there is no last log.
	const employeeId = user.employee?.id;
	if (!employeeId) return $res([]);

	const { data } = await getTimerWorkedStatusRequest({ tenantId, organizationId, employeeId }, access_token);

	return $res(data);
}
