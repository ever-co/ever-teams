import { getTaskTimesheetRequest } from '@/app/services/server/requests';
import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard-app';
import { NextResponse } from "next/server";

export async function GET(req: Request) {
    const res = new NextResponse();
    const { $res, user, tenantId, organizationId, access_token } = await authenticatedGuard(req, res);
    if (!user) return $res('Unauthorized');
    const { data } = await getTaskTimesheetRequest({
        tenantId,
        organizationId,
        employeeIds: []
    }, access_token)

    return $res(data)
}
