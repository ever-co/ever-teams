import { NextResponse } from 'next/server';
import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard-app';
import { createImageAssetsRequest } from '@app/services/server/requests/image-assets';
import { INextParams } from '@app/interfaces';

export const config = {
	api: {
		bodyParser: false
	}
};

export async function POST(req: Request, { params }: INextParams) {
	const res = new NextResponse();

	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, res);

	if (!user) return NextResponse.json({}, { status: 401 });

	const folderParam = params.folder as string;

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
