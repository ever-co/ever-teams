import { IApiCall, IServerError, IUser } from '@ever-teams/toolkit-types';
import { apiConfigManager } from '../config/api-config';

export function ApiCallUpload<T>({ path, method, body, init, bearer_token, tenantId, organizationId }: IApiCall) {
	const config = apiConfigManager.getConfig();
	const url = config.apiUrl;
	const headers: HeadersInit = {};

	if (bearer_token) {
		headers['authorization'] = `Bearer ${bearer_token}`;
	}

	if (tenantId) {
		headers['tenant-id'] = tenantId;
	}

	if (organizationId) {
		headers['organization-id'] = organizationId;
	}

	const datas: { body?: string | FormData } = {};
	if (body) {
		datas['body'] = body;
	}

	return fetch(url + path, {
		...datas,
		...(init || {}),
		headers: {
			...headers,
			...(init?.headers || {})
		},
		method,
		credentials: 'same-origin'
	}).then(async (res: Response) => {
		if (!res.ok) {
			// throw Promise.reject(data);
			return (await res.json()) as IServerError;
		}
		const data = (await res.json()) as T;
		return {
			data,
			response: res
		};
	});
}

export interface IImageAssetCreateInput {
	deletedAt: string | null;
	createdAt: string | null;
	updatedAt: string | null;
	createdByUserId: string | null;
	updatedByUserId: string | null;
	deletedByUserId: string | null;
	id: string;
	isActive: boolean;
	isArchived: boolean;
	archivedAt: string | null;
	tenantId: string | null;
	organizationId: string | null;
	name: string | null;
	url: string | null;
	thumb: string | null;
	width: number | null;
	height: number | null;
	size: number | null;
	isFeatured: boolean;
	fullUrl?: string;
	thumbUrl?: string;
}

export const uploadFile = async ({
	file,
	user,
	token,
	organizationId,
	folderName
}: {
	file: File | null;
	token: string;
	user: IUser | null;
	organizationId?: string;
	folderName: string;
}) => {
	try {
		if (!user) {
			throw new Error('User is not authenticated');
		}

		if (!file) {
			throw new Error('Please select file');
		}

		const formData: FormData = new FormData();
		formData.append('file', file);

		if (user.tenantId) formData.append('tenantId', user.tenantId);
		if (organizationId) formData.append('organizationId', organizationId);

		const response = await ApiCallUpload<IImageAssetCreateInput>({
			path: `/image-assets/upload/${folderName}`,
			method: 'POST',
			bearer_token: token,
			body: formData,
			tenantId: user.tenantId,
			organizationId
		});

		if ('data' in response) {
			return response.data;
		}

		if (response.error || response.message) {
			return response;
		}

		return { error: 'Unexpected response format', message: 'Unexpected response format' } as IServerError;
	} catch (error) {
		return { error: (error as Error).message, message: (error as Error).message } as IServerError;
	}
};
