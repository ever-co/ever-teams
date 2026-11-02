/* eslint-disable no-mixed-spaces-and-tabs */
import { imgTitle } from '@/core/lib/helpers/index';
import { useAuthenticateUser } from '@/core/hooks';
import { clsxm } from '@/core/lib/utils';
import { Button } from '@/core/components';
import { buttonVariants } from '@/core/components/duplicated-components/_button';
import { useTheme } from 'next-themes';
import Image from 'next/image';
import { readableColor } from 'polished';
import { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import stc from 'string-to-color';
import { useImageAssets } from '@/core/hooks/common/use-image-assets';
import { Avatar } from '../duplicated-components/avatar';
import { useAtomValue } from 'jotai';
import { activeTeamState } from '@/core/stores';
import { useUpdateOrganizationTeam } from '@/core/hooks/organizations/teams/use-update-organization-team';

function fallbackSurfaceColor(theme: string | undefined) {
	if (theme === 'light') {
		return '#FFF';
	}
	return '#000';
}

export const TeamAvatar = ({ disabled, bgColor }: { disabled: boolean; bgColor?: string | null }) => {
	const t = useTranslations();
	const { register } = useForm();
	const [avatarBtn, setAvatarBtn] = useState(false);
	const activeTeam = useAtomValue(activeTeamState);
	const { updateOrganizationTeam } = useUpdateOrganizationTeam();
	const { createImageAssets } = useImageAssets();
	const { user } = useAuthenticateUser();
	const { theme } = useTheme();
	const readableColorHex = readableColor(bgColor || fallbackSurfaceColor(theme));
	const imageUrl = activeTeam?.image?.thumbUrl || activeTeam?.image?.fullUrl;
	const hasImage = Boolean(imageUrl);
	const showsInitials = !hasImage && Boolean(activeTeam?.name);
	const teamInitialsSource = activeTeam?.name || '';

	const changeAvatarState = () => {
		if (avatarBtn) {
			setAvatarBtn(false);
		} else {
			setAvatarBtn(true);
		}
	};
	const onChangeAvatar = useCallback(
		async (e: any) => {
			if (e.target.files && activeTeam && user) {
				createImageAssets(e.target.files[0], 'organization_teams_avatars')
					.then((image) => {
						updateOrganizationTeam(activeTeam, {
							...activeTeam,
							imageId: image.id,
							image: image
						});
					})
					.finally(() => {
						setAvatarBtn(false);
					});
			}
		},
		[updateOrganizationTeam, user, createImageAssets, activeTeam]
	);

	const onDeleteAvatar = useCallback(async () => {
		if (user && activeTeam) {
			updateOrganizationTeam(activeTeam, {
				...activeTeam,
				imageId: null,
				image: null
			});
			setAvatarBtn(false);
		}
	}, [updateOrganizationTeam, user, activeTeam]);

	return (
		<div className="flex flex-wrap items-center gap-4">
			<div className="relative shrink-0">
				<div
					className="flex size-14 items-center justify-center overflow-hidden rounded-lg text-xl font-medium text-foreground"
					style={{
						backgroundColor: bgColor || `${stc(activeTeam?.name || '')}80`,
						...(bgColor ? { color: readableColorHex } : {})
					}}
				>
					{hasImage && (
						<Avatar
							size={56}
							shape="square"
							className="relative cursor-pointer"
							imageUrl={imageUrl}
							alt="Team Avatar"
						/>
					)}
					{showsInitials && imgTitle(teamInitialsSource)}
				</div>

				{!disabled && (
					<span
						className="absolute -bottom-1 -right-1 flex size-6 cursor-pointer items-center justify-center rounded-full bg-primary p-1 ring-2 ring-card"
						onClick={() => changeAvatarState()}
					>
						<Image src="/assets/svg/profile-edit.svg" alt={'user avatar'} width={'80'} height={'80'} />
					</span>
				)}
			</div>
			{avatarBtn && (
				<div className="flex flex-wrap items-center gap-2">
					<label
						className={clsxm(
							buttonVariants({ variant: 'outline', size: 'default' }),
							'min-w-[140px] cursor-pointer'
						)}
					>
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
