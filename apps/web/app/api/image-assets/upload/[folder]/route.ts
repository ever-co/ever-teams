import { NextResponse } from 'next/server';
import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { createImageAssetsRequest } from '@/core/services/server/requests/image-assets';

export async function POST(req: Request, { params }: { params: Promise<{ folder: string }> }) {
	const folderParam = (await params).folder;
	const res = new NextResponse();

	if (!folderParam) {
		return;
	}

	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, res);

	if (!user) return $res('Unauthorized');

	const form = await req.formData();

	const response = await createImageAssetsRequest(
		{
			tenantId: tenantId,
			bearer_token: access_token,
			folder: folderParam,
			contentType: req.headers.get('Content-Type') as string
		},
		form
	);

	return $res(response.data);
}
