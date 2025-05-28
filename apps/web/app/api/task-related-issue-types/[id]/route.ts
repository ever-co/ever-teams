import { INextParams } from '@/core/types/interfaces/global/data-response';
import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import {
	deleteTaskRelatedIssueTypeRequest,
	editTaskRelatedIssueTypeRequest
} from '@/core/services/server/requests/task-related-issue-type';
import { NextResponse } from 'next/server';
import { ITaskRelatedIssueTypeCreate } from '@/core/types/interfaces/task/related-issue-type';

export async function PUT(req: Request, props: INextParams) {
	const params = await props.params;
	const res = new NextResponse();

	if (!params.id) {
		return NextResponse.json({ error: 'Missing team ID' }, { status: 400 });
	}

	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, res);

	if (!user) {
		return $res('Unauthorized');
	}

	const datas = (await req.json()) as unknown as ITaskRelatedIssueTypeCreate;

	const response = await editTaskRelatedIssueTypeRequest({
		id: params.id,
		bearer_token: access_token || '',
		datas,
		tenantId: tenantId || ''
	});

	return $res(response.data);
}

export async function DELETE(req: Request, props: INextParams) {
	const params = await props.params;
	const res = new NextResponse();

	if (!params.id) {
		return NextResponse.json({ error: 'Missing team ID' }, { status: 400 });
	}

	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, res);

	if (!user) {
		return $res('Unauthorized');
	}

	const response = await deleteTaskRelatedIssueTypeRequest({
		id: params.id,
		bearer_token: access_token || '',
		tenantId: tenantId || ''
	});

	return $res(response.data);
}
