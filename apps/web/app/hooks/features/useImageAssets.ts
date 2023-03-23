import { getAccessTokenCookie } from '@app/helpers';
import { useCallback, useState } from 'react';
import axios, { AxiosResponse } from 'axios';

export function useImageAssets() {
	const [loading, setLoading] = useState(false);

	const createImageAssets = useCallback(
		async (
			file: File,
			folder: string,
			tenantId: string,
			organizationId: string
		) => {
			const bearer_token = getAccessTokenCookie();
			const formData = new FormData();
			formData.append('file', file);
			formData.append('tenantId', tenantId);
			formData.append('organizationId', organizationId);
			setLoading(true);

			return axios
				.post(
					process.env.NEXT_PUBLIC_GAUZY_API_SERVER_URL +
						`/api/image-assets/upload/${folder}`,
					formData,
					{
						headers: {
							'tenant-id': 'cf1977ed-40be-432e-a0af-79d7da5db23b',
							authorization: `Bearer ${bearer_token}`,
						},
					}
				)
				.then(async (res: AxiosResponse) => {
					return res.data;
				})
				.catch((e) => {
					console.log(e);
				})
				.finally(() => {
					setLoading(false);
				});
		},
		[]
	);

	return {
		loading,
		createImageAssets,
	};
}
