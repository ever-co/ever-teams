import { NextResponse } from 'next/server';
import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard-app';
import { createImageAssetsRequest } from '@app/services/server/requests/image-assets';
import { INextParams } from '@app/interfaces';

export async function POST(req: Request, props: INextParams) {
    const params = await props.params;
    const res = new NextResponse();
    const folderParam = params.folder;

    if (!folderParam) {
		return;
	}

    const { $res, user, access_token, tenantId } = await authenticatedGuard(req, res);

    if (!user) return NextResponse.json({}, { status: 401 });

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
