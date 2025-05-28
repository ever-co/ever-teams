import { IImageAsset } from '@/core/types/interfaces/global/image-asset';
import { serverFetch } from '../fetch';

type Params = {
	tenantId: string;
	bearer_token: string;
	folder: string;
	contentType: string;
};

export function createImageAssetsRequest(params: Params, body: FormData) {
	return serverFetch<IImageAsset>({
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
