'use client';

import { getAccessTokenCookie } from '@app/helpers';
import { useCallback, useState } from 'react';
import { post } from '@app/services/client/axios';
import { IImageAssets } from '@app/interfaces';

export function useImageAssets() {
	const [loading, setLoading] = useState(false);

	const createImageAssets = useCallback(
		async (file: File, folder: string, tenantId: string, organizationId: string) => {
			const bearer_token = getAccessTokenCookie();
			const formData = new FormData();
			formData.append('file', file);
			formData.append('tenantId', tenantId);
			formData.append('organizationId', organizationId);
			setLoading(true);

			return post<IImageAssets>(`/image-assets/upload/${folder}`, formData, {
				headers: {
					'tenant-id': tenantId,
					Authorization: `Bearer ${bearer_token}`
				}
			})
				.then((res) => res.data)
				.finally(() => {
					setLoading(false);
				});
		},
		[]
	);

	return {
		loading,
		createImageAssets
	};
}
