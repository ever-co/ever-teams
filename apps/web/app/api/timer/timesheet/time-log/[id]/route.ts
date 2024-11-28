import { UpdateTimesheet } from "@/app/interfaces";
import { authenticatedGuard } from "@/app/services/server/guards/authenticated-guard-app";
import { updateTimesheetRequest } from "@/app/services/server/requests";
import { NextResponse } from "next/server";

export async function PUT(req: Request) {
    const res = new NextResponse();
    const {
        $res,
        user,
        tenantId,
        organizationId,
        access_token
    } = await authenticatedGuard(req, res);
    if (!user) return $res('Unauthorized');

    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id') as string;
        const body = (await req.json()) as UpdateTimesheet;
        const { data } = await updateTimesheetRequest(
            { ...body, tenantId, organizationId, id },
            access_token
        );
        return $res(data);
    } catch (error) {
        console.error('Error updating timesheet status:', error);
        return $res({
            success: false,
            message: 'Failed to update timesheet status'
        });
    }
}
