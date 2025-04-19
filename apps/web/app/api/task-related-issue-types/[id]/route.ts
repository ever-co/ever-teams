import { INextParams, ITaskRelatedIssueTypeCreate } from '@app/interfaces';
import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard-app';
import {
	deleteTaskRelatedIssueTypeRequest,
	editTaskRelatedIssueTypeRequest
} from '@app/services/server/requests/task-related-issue-type';
import { NextResponse } from 'next/server';

export async function PUT(req: Request, props: INextParams) {
    const params = await props.params;
    const res = new NextResponse();

    if (!params.id) {
		return;
	}

    const { $res, user, access_token, tenantId } = await authenticatedGuard(req, res);

    if (!user) {
		return $res('Unauthorized');
	}

    const datas = (await req.json()) as unknown as ITaskRelatedIssueTypeCreate;

    const response = await editTaskRelatedIssueTypeRequest({
		id: params.id,
		bearer_token: access_token,
		datas,
		tenantId
	});

    return $res(response.data);
}

export async function DELETE(req: Request, props: INextParams) {
    const params = await props.params;
    const res = new NextResponse();

    if (!params.id) {
		return;
	}

    const { $res, user, access_token, tenantId } = await authenticatedGuard(req, res);

    if (!user) {
		return $res('Unauthorized');
	}

    const response = await deleteTaskRelatedIssueTypeRequest({
		id: params.id,
		bearer_token: access_token,
		tenantId
	});

    return $res(response.data);
}
