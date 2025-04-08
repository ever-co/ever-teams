import { IUpdateEmployee } from "@app/interfaces";
import { authenticatedGuard } from "@app/services/server/guards/authenticated-guard-app";
import { updateEmployees } from "@app/services/server/requests";
import { NextResponse } from "next/server";

export async function PUT(req: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const res = new NextResponse();
    const { id } = params;
    if (!id) {
        return
    }
    const { $res, user, access_token } = await authenticatedGuard(req, res);
    if (!user) return $res('Unauthorized');
    const body = (await req.json()) as unknown as IUpdateEmployee;

    const response = await updateEmployees(
        {
            bearer_token: access_token,
            body,
            id
        }
    );
    return $res(response.data)
}
