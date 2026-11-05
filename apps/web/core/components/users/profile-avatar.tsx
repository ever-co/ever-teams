/* eslint-disable no-mixed-spaces-and-tabs */
import { imgTitle } from '@/core/lib/helpers/index';
import { useAuthenticateUser, useSettings } from '@/core/hooks';
import { clsxm } from '@/core/lib/utils';
import { Button } from '@/core/components';
import { buttonVariants } from '@/core/components/duplicated-components/_button';
import Image from 'next/image';
import { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import stc from 'string-to-color';
import { useImageAssets } from '@/core/hooks/common/use-image-assets';
import { Avatar } from '../duplicated-components/avatar';

export const ProfileAvatar = () => {
	const t = useTranslations();
	const { register } = useForm();
	const [avatarBtn, setAvatarBtn] = useState(false);
	const { updateAvatar } = useSettings();
	const { createImageAssets } = useImageAssets();
	const { user } = useAuthenticateUser();

	const changeAvatarState = () => {
		if (avatarBtn) {
			setAvatarBtn(false);
		} else {
			setAvatarBtn(true);
		}
	};
	const onChangeAvatar = useCallback(
		async (e: any) => {
			if (e.target.files && user) {
				createImageAssets(e.target.files[0], 'profile_pictures_avatars')
					.then((image) => {
						updateAvatar({ imageId: image.id, id: user.id });
					})
					.finally(() => {
						setAvatarBtn(false);
					});
			}
		},
		[updateAvatar, user, createImageAssets]
	);

	const onDeleteAvatar = useCallback(async () => {
		if (user) {
			await updateAvatar({ imageId: null, id: user.id });
			setAvatarBtn(false);
		}
	}, [updateAvatar, user]);

	const hasImage = Boolean(user?.imageId);
	const showsInitials = !hasImage && Boolean(user?.name);

	return (
		<div className="flex w-full items-center gap-4 pb-4">
			<div className="relative">
				<div
					className={clsxm(
						'size-16',
						'flex justify-center items-center',
						'rounded-full text-xs text-foreground',
						'text-2xl font-medium'
					)}
					style={{
						backgroundColor: `${stc(user?.name || '')}80`
					}}
				>
					{hasImage && (
						<Avatar
							size={64}
							className="relative cursor-pointer"
							imageUrl={user?.image?.thumbUrl || user?.image?.fullUrl || user?.imageUrl}
							alt={t('common.USER_AVATAR')}
						/>
					)}
					{showsInitials && imgTitle(user?.name || '')}
				</div>

				<span
					className="absolute -bottom-0.5 -right-0.5 flex size-6 cursor-pointer items-center justify-center rounded-full border-2 border-card bg-foreground p-1 text-background"
					onClick={() => changeAvatarState()}
				>
					<Image src="/assets/svg/profile-edit.svg" alt={'user avatar'} width={'80'} height={'80'} />
				</span>
			</div>
			{avatarBtn && (
				<div className="flex items-center gap-2">
					<label className={clsxm(buttonVariants({ variant: 'outline', size: 'default' }), 'cursor-pointer')}>
						<span>{t('form.CHANGE_AVATAR')}</span>
						<input
							type="file"
							{...register('imageUrl')}
							onChange={(e) => onChangeAvatar(e)}
							className="hidden"
						/>
					</label>
					<Button variant="grey" size="default" onClick={() => onDeleteAvatar()}>
						{t('common.DELETE')}
					</Button>
				</div>
			)}
		</div>
	);
};
