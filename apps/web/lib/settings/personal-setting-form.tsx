/* eslint-disable no-mixed-spaces-and-tabs */
import { Button, InputField, Text, ThemeToggler } from 'lib/components';
import { LanguageDropDown } from './language-dropdown';
import { TimezoneDropDown } from './timezone-dropdown';
import { useForm } from 'react-hook-form';
import { useCallback, useEffect, useState } from 'react';
import { userState } from '@app/stores';
import { useRecoilState } from 'recoil';
import {
	getActiveLanguageIdCookie,
	getActiveTimezoneIdCookie,
	setActiveLanguageIdCookie,
	setActiveTimezoneCookie,
	userTimezone,
} from '@app/helpers';
import { useSettings } from '@app/hooks';
import { useTheme } from 'next-themes';
import { useTranslation } from 'lib/i18n';

export const PersonalSettingForm = () => {
	const [user] = useRecoilState(userState);
	const { register, setValue, handleSubmit } = useForm();
	const [currentTimezone, setCurrentTimezone] = useState('');
	const [currentLanguage, setCurrentLanguage] = useState('');
	const { updateAvatar } = useSettings();
	const { theme } = useTheme();

	const { trans, translations } = useTranslation('settingsPersonal');

	useEffect(() => {
		setValue('firstName', user?.firstName);
		setValue('lastName', user?.lastName);
		setValue('email', user?.email);
		setValue('timeZone', user?.timeZone);
		setValue('preferredLanguage', user?.preferredLanguage);
	}, [user, currentTimezone, currentLanguage, setValue]);

	const onSubmit = useCallback(
		async (values: any) => {
			if (values && user) {
				await updateAvatar({
					firstName: values.firstName,
					lastName: values.lastName,
					email: values.email,
					id: user.id,
				});
			}
		},
		[updateAvatar, user]
	);

	useEffect(() => {
		setCurrentTimezone(user?.timeZone || getActiveTimezoneIdCookie());
		setValue('timeZone', user?.timeZone || getActiveTimezoneIdCookie());
	}, []);
	const handleChangeTimezone = useCallback(
		(newTimezone: string | undefined) => {
			setActiveTimezoneCookie(newTimezone || userTimezone());
			setCurrentTimezone(newTimezone || userTimezone());
			setValue('timeZone', newTimezone || userTimezone());
		},
		[setActiveTimezoneCookie, setCurrentTimezone, setValue]
	);
	useEffect(() => {
		if (
			user &&
			user?.timeZone &&
			currentTimezone &&
			user.timeZone !== currentTimezone
		) {
			updateAvatar({
				timeZone: currentTimezone,
				id: user.id,
			});
		}
	}, [user, user?.timeZone, updateAvatar, currentTimezone]);

	useEffect(() => {
		setCurrentLanguage(user?.preferredLanguage || getActiveLanguageIdCookie());
		setValue(
			'preferredLanguage',
			user?.preferredLanguage || getActiveLanguageIdCookie()
		);
	}, []);
	const handleChangeLanguage = useCallback(
		(newLanguage: string) => {
			console.log(newLanguage);
			setActiveLanguageIdCookie(newLanguage);
			setCurrentLanguage(newLanguage);
			setValue('preferredLanguage', newLanguage);
		},
		[setActiveLanguageIdCookie, setCurrentLanguage, setValue]
	);
	useEffect(() => {
		if (
			user &&
			user?.preferredLanguage &&
			currentLanguage &&
			user.preferredLanguage !== currentLanguage
		) {
			updateAvatar({
				preferredLanguage: currentLanguage,
				id: user.id,
			});
		}
	}, [user, user?.preferredLanguage, updateAvatar, currentLanguage]);

	return (
		<>
			<form
				className="w-[98%] md:w-[530px]"
				onSubmit={handleSubmit(onSubmit)}
				autoComplete="off"
			>
				<div className="flex flex-col items-center justify-between">
					<div className="w-full mt-5">
						<div className="">
							<div className="flex items-center justify-between w-full gap-8">
								<div className="flex items-center justify-between w-full gap-4">
									<div>
										<Text className="mb-2 font-normal text-gray-400 text-md">
											{translations.common.FULL_NAME}
										</Text>
										<InputField
											type="text"
											placeholder="First Name"
											{...register('firstName', {
												required: true,
												maxLength: 80,
											})}
											className="md:w-[220px] m-0 h-[54px]"
										/>
									</div>
									<div className="mt-[2rem]">
										<InputField
											type="text"
											placeholder="Last Name"
											{...register('lastName', {
												required: true,
												maxLength: 80,
											})}
											className="md:w-[220px] m-0  h-[54px]"
										/>
									</div>
								</div>
								<div className="mt-5">
									<Button
										variant="grey"
										className="min-w-[100px] h-[54px] rounded-[8px] font-[600]"
									>
										{translations.common.EDIT}
									</Button>
								</div>
							</div>
							<div className="flex items-center justify-between w-full gap-8 mt-8">
								<div className="flex items-center justify-between w-full gap-4">
									<div>
										<Text className="mb-2 font-normal text-gray-400 text-md">
											{translations.common.CONTACT}
										</Text>
										<InputField
											type="email"
											placeholder="Email Address"
											{...register('email', {
												required: true,
												pattern:
													/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
											})}
											className="md:w-[220px] h-[54px]"
										/>
									</div>
									<div className="mt-8">
										<InputField
											type="text"
											placeholder="Phone Number"
											className="md:w-[220px] h-[54px]"
										/>
									</div>
								</div>
								<div className="mt-5">
									<Button
										type="submit"
										className="min-w-[100px] h-[54px] rounded-[8px]  font-[600]"
									>
										{translations.common.SAVE}
									</Button>
								</div>
							</div>
							<div className="flex items-center gap-6 mt-8">
								<div className="">
									<Text className="mb-2 font-normal text-gray-400 text-md">
										{translations.common.THEME}
									</Text>
									<ThemeToggler />
								</div>
								<div className="mt-8">
									<Text className="text-sm font-normal text-gray-400">
										{theme === 'light' ? 'Light' : 'Dark'} Mode
									</Text>
								</div>
							</div>
							<div className="flex items-center justify-between w-full mt-8">
								<div className="">
									<Text className="mb-2 font-normal text-gray-400 text-md">
										{translations.common.LANGUAGE}
									</Text>
									<LanguageDropDown
										currentLanguage={currentLanguage}
										onChangeLanguage={(t: string) => {
											handleChangeLanguage(t);
										}}
									/>
								</div>
							</div>
							<div className="flex items-center justify-between w-full gap-5 mt-8">
								<div className="">
									<Text className="mb-2 font-normal text-gray-400 text-md">
										{translations.common.TIME_ZONE}
									</Text>
									<TimezoneDropDown
										currentTimezone={currentTimezone}
										onChangeTimezone={(t: string) => {
											handleChangeTimezone(t);
										}}
									/>
								</div>
								<div className="mt-8">
									<Button
										variant="grey"
										type="button"
										onClick={() => {
											handleChangeTimezone(undefined);
										}}
										className="min-w-[100px] h-[54px] rounded-[8px] font-[600]"
									>
										{translations.common.DETECT}
									</Button>
								</div>
							</div>
							<div className="flex items-center justify-between w-full mt-8">
								<div className="">
									<Text className="mb-2 font-normal text-gray-400 text-md">
										{trans.WORK_SCHEDULE}
									</Text>
									<Text className="text-md font-normal">No</Text>
								</div>
							</div>
						</div>
					</div>
				</div>
			</form>
		</>
	);
};
