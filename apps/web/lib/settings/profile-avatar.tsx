/* eslint-disable no-mixed-spaces-and-tabs */
import { Avatar, Button } from 'lib/components';
import { useCallback, useState } from 'react';
import { useSettings } from '@app/hooks';
import { useForm } from 'react-hook-form';
import { userState } from '@app/stores';
import { useRecoilState } from 'recoil';
import axios from 'axios';
import Image from 'next/image';

export const ProfileAvatar = () => {
	const [user] = useRecoilState(userState);
	const { register } = useForm();
	const [avatarBtn, setAvatarBtn] = useState(false);
	const { updateAvatar } = useSettings();

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
				const formData = new FormData();
				formData.append('file', e.target.files[0]);
				formData.append('folder', 'gauzy_team_user_profile');
				formData.append('context', `photo=${e.target.files[0].name}`);
				formData.append('upload_preset', 'ml_default');

				axios
					.post('https://api.cloudinary.com/v1_1/dv6ezkfxg/upload', formData)
					.then(async (res: any) => {
						const imageUrl = res.data.secure_url;
						await updateAvatar({ imageUrl, id: user.id });
					})
					.catch((e) => {
						console.log(e);
					});
			}
		},
		[updateAvatar, user]
	);

	const onDeleteAvatar = useCallback(async () => {
		if (user) {
			const imageUrl = '';
			await updateAvatar({ imageUrl, id: user.id });
		}
	}, [updateAvatar, user]);

	return (
		<>
			<div className="flex flex-col justify-between items-center">
				<div className="w-full">
					<div className="">
						<div className="flex w-full items-center sm:justify-between justify-center gap-8">
							<div className="relative">
								<Avatar
									size={80}
									className="relative cursor-pointer mt-[32px]"
									imageUrl={user?.imageUrl}
									alt="user avatar"
								/>
								<span
									className="absolute top-[30px] right-[-4px] bg-[#282048] w-[27px] h-[27px] rounded-full flex justify-center items-center border-[3px] border-white cursor-pointer"
									onClick={() => changeAvatarState()}
								>
									<Image
										src="/assets/svg/profile-edit.svg"
										alt={'user avatar'}
										width={'80'}
										height={'80'}
									/>
								</span>
							</div>
							{avatarBtn ? (
								<div className="flex w-full items-center gap-3">
									<div className="mt-6">
										<label className="flex flex-row items-center justify-center py-3 px-4 gap-3 rounded-md min-w-[140px] text-primary border-2 border-primary font-medium dark:text-primary-light dark:border-primary-light disabled:opacity-40">
											<span className="">Change Avatar</span>
											<input
												type="file"
												{...register('imageUrl')}
												onChange={(e) => onChangeAvatar(e)}
												className="hidden"
											/>
										</label>
									</div>
									<div className="mt-6">
										<Button variant="grey" onClick={() => onDeleteAvatar()}>
											Delete
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
