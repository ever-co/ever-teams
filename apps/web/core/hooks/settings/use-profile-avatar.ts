'use client';

import { useCallback, useState } from 'react';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { useSettings } from '@/core/hooks/users/use-settings';
import { useImageAssets } from '@/core/hooks/common/use-image-assets';
import { PROFILE_AVATAR_FOLDER } from '@/core/lib/utils/settings-profile';

export type ProfileAvatarStatus = 'idle' | 'uploading' | 'removing';

export function useProfileAvatar() {
	const { data: user } = useUserQuery();
	const { updateAvatar } = useSettings();
	const { createImageAssets } = useImageAssets();
	const [status, setStatus] = useState<ProfileAvatarStatus>('idle');
	const userId = user?.id;

	const upload = useCallback(
		async (file: File) => {
			if (!userId) {
				return;
			}
			setStatus('uploading');
			try {
				const image = await createImageAssets(file, PROFILE_AVATAR_FOLDER);
				await updateAvatar({ imageId: image.id, id: userId });
			} finally {
				setStatus('idle');
			}
		},
		[createImageAssets, updateAvatar, userId]
	);

	const remove = useCallback(async () => {
		if (!userId) {
			return;
		}
		setStatus('removing');
		try {
			await updateAvatar({ imageId: null, id: userId });
		} finally {
			setStatus('idle');
		}
	}, [updateAvatar, userId]);

	return { user, status, upload, remove };
}
