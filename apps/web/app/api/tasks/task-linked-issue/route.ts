import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { createTaskLinkedIssue, updateTaskLinkedIssue } from '@/core/services/server/requests';
import { ITaskLinkedIssue } from '@/core/types/interfaces/task/task-linked-issue';
import { NextResponse } from 'next/server';
import { refuseForeignOrigin } from '@/core/services/server/same-origin-request';

export async function POST(req: Request) {
	const foreign = refuseForeignOrigin(req);
	if (foreign) return foreign;
	const res = new NextResponse();
	const { $res, user, tenantId, access_token } = await authenticatedGuard(req, res);
	if (!user) return $res('Unauthorized');

	const body = (await req.json()) as unknown as ITaskLinkedIssue;
	const response = await createTaskLinkedIssue(body, access_token || '', tenantId || '');

	return $res(response.data);
}

export async function PUT(req: Request) {
	const foreign = refuseForeignOrigin(req);
	if (foreign) return foreign;
	const res = new NextResponse();
	const { $res, user, tenantId, access_token } = await authenticatedGuard(req, res);
	if (!user) return $res('Unauthorized');

	const body = (await req.json()) as unknown as ITaskLinkedIssue;
	const response = await updateTaskLinkedIssue(body, access_token || '', tenantId || '');

	return $res(response.data);
}
