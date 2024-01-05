import { ITaskLinkedIssue, LinkedTaskIssue } from '@app/interfaces/ITask';
import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard-app';
import { createTaskLinkedIsssue, updateTaskLinkedIssue } from '@app/services/server/requests';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
	const res = new NextResponse();
	const { $res, user, tenantId, access_token } = await authenticatedGuard(req, res);
	if (!user) return $res('Unauthorized');

	const body = req.body as unknown as ITaskLinkedIssue;
	const response = await createTaskLinkedIsssue(body, access_token, tenantId);

	$res(response.data);
}

export async function PUT(req: Request) {
	const res = new NextResponse();
	const { $res, user, tenantId, access_token } = await authenticatedGuard(req, res);
	if (!user) return $res('Unauthorized');

	const body = req.body as unknown as LinkedTaskIssue;
	const response = await updateTaskLinkedIssue(body, access_token, tenantId);

	$res(response.data);
	return;
}
