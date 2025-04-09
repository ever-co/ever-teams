import { INextParams, IRemoveTaskFromManyPlans } from "@app/interfaces";
import { authenticatedGuard } from "@app/services/server/guards/authenticated-guard-app";
import { deleteDailyPlansManyRequest } from "@app/services/server/requests";
import { NextResponse } from "next/server";

export async function PUT(req: Request, props: INextParams) {
    const params = await props.params;
    const res = new NextResponse();
    const { id } = params;
    if (!id) {
        return;
    }
    const { $res, user, access_token } = await authenticatedGuard(req, res);

    if (!user) return $res('Unauthorized');

    const body = (await req.json()) as unknown as IRemoveTaskFromManyPlans;
    const response = await deleteDailyPlansManyRequest({
        data: body,
        taskId: id,
        bearer_token: access_token,
    });
    return $res(response.data);
}
