/* eslint-disable no-mixed-spaces-and-tabs */
import { imgTitle } from '@app/helpers';
import { useAuthenticateUser, useImageAssets, useOrganizationTeams } from '@app/hooks';
import { IImageAssets } from '@app/interfaces';
import { clsxm } from '@app/utils';
import { Avatar, Button } from 'lib/components';
import { useTranslation } from 'next-i18next';
import { useTheme } from 'next-themes';
import Image from 'next/image';
import { readableColor } from 'polished';
import { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import stc from 'string-to-color';

export const TeamAvatar = ({ disabled, bgColor }: { disabled: boolean; bgColor?: string }) => {
	const { t } = useTranslation();
	const { register } = useForm();
	const [avatarBtn, setAvatarBtn] = useState(false);
	const { updateOrganizationTeam, activeTeam } = useOrganizationTeams();
	const { createImageAssets } = useImageAssets();
	const { user } = useAuthenticateUser();
	const { theme } = useTheme();
	const readableColorHex = readableColor(bgColor || (theme === 'light' ? '#FFF' : '#000'));

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
				createImageAssets(
					e.target.files[0],
					'organization_teams_avatars',
					user.tenantId as string,
					user.employee.organizationId
				)
					.then((d: IImageAssets) => {
						updateOrganizationTeam(activeTeam, {
							...activeTeam,
							imageId: d.id,
							image: d
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
		<>
			<div className="flex flex-col items-center justify-between">
				<div className="w-full">
					<div className="">
						<div className="flex items-center justify-center w-full gap-8 sm:justify-between">
							<div className="relative">
								<div
									className={clsxm(
										'w-[80px] h-[80px]',
										'flex justify-center items-center',
										'rounded-full text-xs text-default dark:text-white',
										'shadow-md text-4xl font-normal',
										'mt-8'
									)}
									style={{
										backgroundColor: bgColor || `${stc(activeTeam?.name || '')}80`,
										...(bgColor ? { color: bgColor ? readableColorHex : undefined } : {})
									}}
								>
									{activeTeam?.image?.thumbUrl || activeTeam?.image?.fullUrl ? (
										<Avatar
											size={80}
											className="relative cursor-pointer"
											imageUrl={activeTeam.image.thumbUrl || activeTeam.image.fullUrl}
											alt="Team Avatar"
										/>
									) : activeTeam?.name ? (
										imgTitle(activeTeam?.name)
									) : (
										''
									)}
								</div>

								{!disabled && (
									<span
										className="absolute top-[30px] right-[-4px] bg-[#282048] w-[27px] h-[27px] rounded-full flex justify-center items-center border-[3px] border-[#F7F7F8] cursor-pointer p-1"
										onClick={() => changeAvatarState()}
									>
										<Image
											src="/assets/svg/profile-edit.svg"
											alt={'user avatar'}
											width={'80'}
											height={'80'}
										/>
									</span>
								)}
							</div>
							{avatarBtn ? (
								<div className="flex items-center w-full gap-3">
									<div className="mt-6">
										<label className="flex flex-row items-center justify-center py-3 px-4 gap-3 rounded-xl min-w-[140px] text-primary border-2 border-primary font-medium dark:text-primary-light dark:border-primary-light disabled:opacity-40 cursor-pointer">
											<span className="">{t('form.CHANGE_AVATAR')}</span>
											<input
												type="file"
												{...register('imageUrl')}
												onChange={(e) => onChangeAvatar(e)}
												className="hidden"
											/>
										</label>
									</div>
									<div className="mt-6">
										<Button variant="grey" onClick={() => onDeleteAvatar()} className="rounded-xl">
											{t('common.DELETE')}
										</Button>
									</div>
								</div>
							) : (
								<></>
							)}
						</div>
					</div>
				</div>
			</div>
		</>
	);
};
