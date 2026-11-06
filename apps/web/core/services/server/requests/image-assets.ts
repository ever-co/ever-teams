import { IImageAsset } from '@/core/types/interfaces/common/image-asset';
import { serverFetch } from '../fetch';

type Params = {
	tenantId: string;
	bearer_token: string;
	folder: string;
};

/** The form is sent as multipart; the browser's Content-Type would carry a boundary this new body does not use. */
export function createImageAssetsRequest(params: Params, body: FormData) {
	return serverFetch<IImageAsset>({
		path: '/image-assets/upload/' + params.folder,
		method: 'POST',
		body,
		bearer_token: params.bearer_token,
		tenantId: params.tenantId
	});
}
