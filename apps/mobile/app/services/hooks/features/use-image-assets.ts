import { useCallback, useState } from 'react';
import axios, { AxiosResponse } from 'axios';
import { useStores } from '../../../models';
import Config from '../../../config';

export function useImageAssets() {
	const {
		authenticationStore: { authToken, tenantId, organizationId }
	} = useStores();
	const [loading, setLoading] = useState(false);

	const createImageAssets = useCallback(async (file: any, folder: string) => {
		const formData = new FormData();
		formData.append('file', file);
		formData.append('tenantId', tenantId);
		formData.append('organizationId', organizationId);
		setLoading(true);

		return axios
			.post(Config.API_URL + `/image-assets/upload/${folder}`, formData, {
				headers: {
					'tenant-id': tenantId,
					authorization: `Bearer ${authToken}`,
					'content-type': 'multipart/form-data'
				}
			})
			.then(async (res: AxiosResponse) => {
				return res.data;
			})
			.catch((e) => {
				console.log(e);
			})
			.finally(() => {
				setLoading(false);
			});
	}, []);

	return {
		loading,
		createImageAssets
	};
}
