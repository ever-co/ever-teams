import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';

import { editOrganizationProjectsRequest, getOrganizationProjectRequest } from '@/core/services/server/requests';
import { NextResponse } from 'next/server';

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

/** Proxy mode twin of Gauzy's `DELETE /organization-projects/:id`, which answers 204 with no body on success. */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;

	// Encoded, so an id such as `../employee` stays one path segment instead of reaching another endpoint
	return forwardToGauzy(req, `/organization-projects/${encodeURIComponent(id)}`);
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
	const res = new NextResponse();
	const id = (await params).id;
	if (!id) {
		return;
	}

	const { $res, user, access_token, tenantId, status } = await authenticatedGuard(req, res);

	if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: status ?? 401 });

	const response = await getOrganizationProjectRequest({
		bearer_token: access_token,
		id: id,
		tenantId
	});

	return $res(response.data);
}
