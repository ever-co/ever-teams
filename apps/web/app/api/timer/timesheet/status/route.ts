import { ID } from "@/app/interfaces";
import { authenticatedGuard } from "@/app/services/server/guards/authenticated-guard-app";
import { updateStatusTimesheetRequest } from "@/app/services/server/requests";
import { NextResponse } from "next/server";

export async function PUT(req: Request) {
    const res = new NextResponse();
    const { $res, user, tenantId, organizationId, access_token } = await authenticatedGuard(req, res);
    if (!user) return $res('Unauthorized');

    const { searchParams } = new URL(req.url);

    const { ids, status } = searchParams as unknown as {
        ids: ID[];
        status: string
    };
    const { data } = await updateStatusTimesheetRequest(
        {
            ids: ids,
            organizationId: organizationId,
            status: status,
            tenantId: tenantId

        },
        access_token
    );
    return $res(data);
}
