import { z } from 'zod';
import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { gauzyErrorResponse } from '@/core/services/server/gauzy-error-response';
import {
	deleteOrganizationProjectRequest,
	editOrganizationProjectsRequest,
	getOrganizationProjectRequest
} from '@/core/services/server/requests';
import { NextResponse } from 'next/server';

const projectIdSchema = z.guid();

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
	const res = new NextResponse();
	const id = (await params).id;
	if (!id) {
		return;
	}

	const { $res, user, access_token, tenantId, status } = await authenticatedGuard(req, res);
	if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: status ?? 401 });

	const body = await req.json();

	const response = await editOrganizationProjectsRequest({
		bearer_token: access_token,
		id: id,
		datas: body,
		tenantId
	});

	return $res(response.data);
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
	const res = new NextResponse();
	const id = (await params).id;
	if (!id) {
		return;
	}

	const { $res, user, access_token, tenantId, status } = await authenticatedGuard(req, res);

	if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: status ?? 401 });

	const { searchParams } = new URL(req.url);

	const response = await getOrganizationProjectRequest({
		bearer_token: access_token,
		id: id,
		tenantId,
		searchParams
	});

	return $res(response.data);
}

/**
 * The web client deletes a project through this route in proxy mode; without a handler the request ended in a 405.
 * Gauzy answers 204 and decides who may delete (project managers and holders of the project permission).
 */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
	const parsedId = projectIdSchema.safeParse((await params).id);
	if (!parsedId.success) {
		return NextResponse.json({ error: 'A project id is required' }, { status: 400 });
	}

	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, new NextResponse());
	if (!user) return $res('Unauthorized');

	try {
		await deleteOrganizationProjectRequest(parsedId.data, tenantId, access_token);
		return new NextResponse(null, { status: 204 });
	} catch (error) {
		return gauzyErrorResponse(error, 'Project deletion failed');
	}
}
