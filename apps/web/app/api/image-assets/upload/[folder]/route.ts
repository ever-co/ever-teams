import { NextResponse } from 'next/server';
import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { createImageAssetsRequest } from '@/core/services/server/requests/image-assets';
import { refuseForeignOrigin } from '@/core/services/server/same-origin-request';
import { gauzyErrorResponse } from '@/core/services/server/gauzy-error-response';

export async function POST(req: Request, { params }: { params: Promise<{ folder: string }> }) {
	const foreign = refuseForeignOrigin(req);
	if (foreign) return foreign;
	const folderParam = (await params).folder;
	const res = new NextResponse();

	if (!folderParam) {
		return;
	}

	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, res);

	if (!user) return $res('Unauthorized');

	const form = await req.formData();

	try {
		const response = await createImageAssetsRequest(
			{
				tenantId: tenantId,
				bearer_token: access_token,
				folder: folderParam
			},
			form
		);

		return $res(response.data);
	} catch (error) {
		// A refusal of the API goes back with its status and reason, as in direct mode (#5726)
		return await gauzyErrorResponse(error, 'The image could not be uploaded.');
	}
}
