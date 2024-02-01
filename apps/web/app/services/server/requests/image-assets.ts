import { IImageAssets } from '@app/interfaces';
import { serverFetch } from '../fetch';

type Params = {
	tenantId: string;
	bearer_token: string;
	folder: string;
	contentType: string;
};

export function createImageAssetsRequest(params: Params, body: FormData) {
	return serverFetch<IImageAssets>({
		path: '/image-assets/upload/' + params.folder,
		method: 'POST',
		body,
		bearer_token: params.bearer_token,
		init: {
			headers: {
				'tenant-id': params.tenantId,
				'Content-Type': params.contentType
			}
		}
	});
}
