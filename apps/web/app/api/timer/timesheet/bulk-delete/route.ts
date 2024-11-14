import { deleteTaskTimesheetRequest } from '@/app/services/server/requests';
import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard-app';
import { NextResponse } from "next/server";

export async function GET(req: Request) {
    const res = new NextResponse();

    const { $res, user, tenantId, organizationId, access_token, } = await authenticatedGuard(req, res);
    if (!user) return $res('Unauthorized');
    try {
        const { data } = await deleteTaskTimesheetRequest({
            tenantId,
            organizationId,
            logIds: [],
        }, access_token);

        if (!data) {
            return NextResponse.json(
                { error: 'No data found' },
                { status: 404 }
            );
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error('Error delete timesheet:', error);
        return NextResponse.json(
            { error: 'Failed to delete timesheet data' },
            { status: 500 }
        );
    }

}
