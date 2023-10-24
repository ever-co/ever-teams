/* eslint-disable no-mixed-spaces-and-tabs */
import {
	PHONE_REGEX,
	getActiveLanguageIdCookie,
	getActiveTimezoneIdCookie,
	setActiveLanguageIdCookie,
	setActiveTimezoneCookie,
	userTimezone
} from '@app/helpers';
import { useLanguage, useSettings } from '@app/hooks';
import { userState } from '@app/stores';
import { Button, InputField, Text, ThemeToggler } from 'lib/components';
import { useTranslation } from 'next-i18next';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRecoilState } from 'recoil';
import validator from 'validator';
import { EmailResetModal } from './email-reset-modal';
import { LanguageDropDown } from './language-dropdown';
import { TimezoneDropDown } from './timezone-dropdown';

interface IValidation {
	email: boolean;
	phone: boolean;
}

export const PersonalSettingForm = () => {
	const router = useRouter();
	const [user] = useRecoilState(userState);
	const { currentLanguage, changeLanguage } = useLanguage();
	const { register, setValue, getValues, setFocus } = useForm();
	const [currentTimezone, setCurrentTimezone] = useState('');
	const { updateAvatar } = useSettings();
	const { theme } = useTheme();
	const [editFullname, setEditFullname] = useState<boolean>(false);
	const [editContacts, setEditContacts] = useState<boolean>(false);
	const [showEmailResetModal, setShowEmailResetModal] = useState<boolean>(false);
	const [newEmail, setNewEmail] = useState<string>('');
	const [isValid, setIsValid] = useState<IValidation>({
		email: true,
		phone: true
	});
	const { t } = useTranslation();

	const handleFullnameChange = useCallback(() => {
		const values = getValues();
		if (user) {
			updateAvatar({
				firstName: values.firstName,
				lastName: values.lastName,
				id: user.id
			}).then(() => {
				setEditFullname(false);
			});
		}
	}, [updateAvatar, user, getValues]);

	const checkEmailValidity = (e: React.ChangeEvent<HTMLInputElement>) => {
		const email = e.target.value;
		setIsValid({ ...isValid, email: validator.isEmail(email) });
	};

	const checkPhoneValidity = (e: React.ChangeEvent<HTMLInputElement>) => {
		const phone = e.target.value;

		phone
			? setIsValid({ ...isValid, phone: phone.match(PHONE_REGEX) !== null })
			: setIsValid({ ...isValid, phone: true });
	};

	const handleContactChange = useCallback(() => {
		const values = getValues();

		if (values.email !== user?.email && isValid.email && isValid.phone) {
			setNewEmail(values.email || '');
			setShowEmailResetModal(true);
		}

		if (user && isValid.phone && isValid.email) {
			updateAvatar({
				phoneNumber: values.phoneNumber,
				id: user.id
			}).then(() => {
				setEditContacts(false);
			});
		}
	}, [updateAvatar, user, getValues, isValid.email, isValid.phone]);

	const handleChangeTimezone = useCallback(
		(newTimezone: string | undefined) => {
			setActiveTimezoneCookie(newTimezone || userTimezone());
			setCurrentTimezone(newTimezone || userTimezone());
			setValue('timeZone', newTimezone || userTimezone());

			if (user) {
				updateAvatar({
					timeZone: newTimezone || userTimezone(),
					id: user.id
				});
			}
		},
		[setCurrentTimezone, setValue, updateAvatar, user]
	);
	// Update language in rerender
	useEffect(() => {
		changeLanguage(user?.preferredLanguage as string);
	}, [changeLanguage, user?.preferredLanguage]);
	useEffect(() => {
		setCurrentTimezone(user?.timeZone || getActiveTimezoneIdCookie());
		setValue('timeZone', user?.timeZone || getActiveTimezoneIdCookie());
	}, [setCurrentTimezone, setValue, user, user?.timeZone]);
	useEffect(() => {
		setValue('firstName', user?.firstName);
		setValue('lastName', user?.lastName);
		setValue('email', user?.email);
		setValue('timeZone', user?.timeZone);
		setValue('preferredLanguage', user?.preferredLanguage);
		setValue('phoneNumber', user?.phoneNumber);

		/**
		 * Set Default current timezone.
		 * User can change it anytime if wants
		 */
		if (!user?.timeZone) {
			handleChangeTimezone(undefined);
		}
	}, [user, currentTimezone, currentLanguage, setValue, handleChangeTimezone]);

	useEffect(() => {
		changeLanguage(user?.preferredLanguage || getActiveLanguageIdCookie());
		setValue('preferredLanguage', user?.preferredLanguage || getActiveLanguageIdCookie());
	}, [changeLanguage, user, user?.preferredLanguage, setValue]);
	const handleChangeLanguage = useCallback(
		(newLanguage: string) => {
			setActiveLanguageIdCookie(newLanguage);
			changeLanguage(newLanguage, true);
			setValue('preferredLanguage', newLanguage);

			// Navigation to force rerender
			// router.push({ pathname: router.pathname, query: router.query });
			router.push({ pathname: router.pathname, query: router.query }, undefined, { locale: newLanguage });
			if (user) {
				updateAvatar({
					preferredLanguage: newLanguage,
					id: user.id
				});
			}
		},
		[user, setValue, updateAvatar, changeLanguage]
	);

	return (
		<>
			<form
				className="w-[96%]"
				autoComplete="off"
				onSubmit={(e) => {
					e.preventDefault();
					handleFullnameChange();
					handleContactChange();
				}}
			>
				<div id="general" className="flex flex-col items-center justify-between">
					<div className="w-full mt-5">
						<div className="">
							<div className="flex flex-col items-center justify-between w-full sm:gap-8 sm:flex-row">
								<div className="flex flex-col items-center justify-between w-full sm:gap-4 sm:flex-row">
									<Text className="font-normal min-w-[25%] text-gray-400 text-lg justify-center">
										{t('common.FULL_NAME')}
									</Text>
									<div className="flex justify-start w-full">
										<InputField
											type="text"
											placeholder={t('form.FIRST_NAME_PLACEHOLDER')}
											{...register('firstName', {
												required: true,
												maxLength: 80
											})}
											className={`w-full m-0 h-[54px] ${
												!editFullname ? 'disabled:bg-[#FCFCFC]' : ''
											}`}
											disabled={!editFullname}
											wrapperClassName={`rounded-lg w-[230px] mb-0 mr-5`}
										/>
										<InputField
											type="text"
											placeholder={t('form.LAST_NAME_PLACEHOLDER')}
											{...register('lastName', {
												maxLength: 80
											})}
											className={`w-full m-0 h-[54px] ${
												!editFullname ? 'disabled:bg-[#FCFCFC]' : ''
											}`}
											disabled={!editFullname}
											wrapperClassName={`rounded-lg w-[230px] mb-0 mr-5`}
										/>

										{editFullname ? (
											<Button
												variant="primary"
												className="min-w-[100px] h-[54px] rounded-[8px] font-[600]"
												type="button"
												onClick={(e) => {
													e.preventDefault();
													handleFullnameChange();
												}}
											>
												{t('common.SAVE')}
											</Button>
										) : (
											<Button
												variant="grey"
												className="min-w-[100px] h-[54px] rounded-[8px] font-[600]"
												type="button"
												onClick={() => {
													setEditFullname(true);
												}}
											>
												{t('common.EDIT')}
											</Button>
										)}
									</div>
								</div>
							</div>

							<div className="flex flex-col items-center justify-between w-full mt-8 sm:gap-8 sm:flex-row">
								<div className="flex flex-col items-center justify-between w-full sm:gap-4 sm:flex-row">
									<Text className="font-normal min-w-[25%] text-gray-400 text-lg justify-center">
										{t('common.CONTACT')}
									</Text>
									<div className="flex justify-start w-full">
										<div className="relative">
											<InputField
												type="email"
												placeholder="Email Address"
												{...register('email', {
													required: true,
													pattern:
														/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
												})}
												className={`w-full m-0 h-[54px]  ${
													!editContacts ? 'disabled:bg-[#FCFCFC]' : ''
												}`}
												onChange={checkEmailValidity}
												disabled={!editContacts}
												notValidBorder={!isValid.email}
												wrapperClassName={`rounded-lg w-[230px] mb-0 mr-5 `}
											/>
											{!isValid.email && (
												<p className="absolute text-xs text-red-500 -bottom-5">
													{t('pages.settingsPersonal.emailNotValid')}
												</p>
											)}
										</div>
										<div className="relative">
											<InputField
												type="text"
												placeholder="Phone Number"
												{...register('phoneNumber', {
													valueAsNumber: true
												})}
												className={`w-full m-0 h-[54px] ${
													!editContacts ? 'disabled:bg-[#FCFCFC]' : ''
												}`}
												onChange={checkPhoneValidity}
												disabled={!editContacts}
												notValidBorder={!isValid.phone}
												wrapperClassName={`rounded-lg w-[230px] mb-0 mr-5`}
											/>
											{!isValid.phone && (
												<p className="absolute text-xs text-red-500 -bottom-5">
													{t('pages.settingsPersonal.phoneNotValid')}
												</p>
											)}
										</div>

										{editContacts ? (
											<Button
												variant="primary"
												className="min-w-[100px] h-[54px] rounded-[8px] font-[600]"
												type="button"
												onClick={(e) => {
													e.preventDefault();
													handleContactChange();
												}}
											>
												{t('common.SAVE')}
											</Button>
										) : (
											<Button
												variant="grey"
												className="min-w-[100px] h-[54px] rounded-[8px] font-[600]"
												type="button"
												onClick={() => {
													setEditContacts(true);
													setTimeout(() => {
														setFocus('email');
													}, 10);
												}}
											>
												{t('common.EDIT')}
											</Button>
										)}
									</div>
								</div>
							</div>

							<div className="flex flex-col items-center justify-between w-full mt-8 sm:gap-8 sm:flex-row">
								<div className="flex flex-col items-center justify-between w-full sm:gap-4 sm:flex-row">
									<Text className="font-normal min-w-[25%] text-gray-400 text-lg justify-center">
										{t('common.THEME')}
									</Text>
									<div className="flex w-full">
										<ThemeToggler />
										<Text className="flex items-center ml-5 text-sm font-normal text-gray-400">
											{theme === 'light' ? 'Light' : 'Dark'} Mode
										</Text>
									</div>
								</div>
							</div>

							<div className="flex flex-col items-center justify-between w-full mt-8 sm:gap-8 sm:flex-row">
								<div className="flex flex-col items-center justify-between w-full sm:gap-4 sm:flex-row">
									<Text className="font-normal min-w-[25%] text-gray-400 text-lg justify-center">
										{t('common.LANGUAGE')}
									</Text>
									<div className="flex w-full">
										<LanguageDropDown
											currentLanguage={currentLanguage}
											onChangeLanguage={(t: string) => {
												handleChangeLanguage(t);
											}}
										/>
									</div>
								</div>
							</div>

							<div className="flex flex-col items-center justify-between w-full mt-8 sm:gap-8 sm:flex-row">
								<div className="flex flex-col items-center justify-between w-full sm:gap-4 sm:flex-row">
									<Text className="font-normal min-w-[25%] text-gray-400 text-lg justify-center">
										{t('common.TIME_ZONE')}
									</Text>
									<div className="flex w-full">
										<TimezoneDropDown
											currentTimezone={currentTimezone}
											onChangeTimezone={(t: string) => {
												handleChangeTimezone(t);
											}}
										/>
										<Button
											variant="grey"
											type="button"
											onClick={() => {
												handleChangeTimezone(undefined);
											}}
											className="min-w-[100px] h-[54px] rounded-[8px] font-[600] ml-5"
										>
											{t('common.DETECT')}
										</Button>
									</div>
								</div>
							</div>

							<div
								id="work-schedule"
								className="flex flex-col items-center justify-between w-full mt-8 sm:gap-8 sm:flex-row"
							>
								<div className="flex flex-col items-center justify-between w-full sm:gap-4 sm:flex-row">
									<Text className="font-normal min-w-[25%] text-gray-400 text-lg justify-center">
										{t('pages.settingsPersonal.WORK_SCHEDULE')}
									</Text>
									<div className="flex w-full">
										<Text className="text-lg font-normal">{t('common.NO')}</Text>
									</div>
								</div>
							</div>

							<div
								id="subscription"
								className="flex flex-col items-center justify-between w-full mt-8 sm:gap-8 sm:flex-row"
							>
								<div className="flex flex-col items-center justify-between w-full sm:gap-4 sm:flex-row">
									<Text className="font-normal min-w-[25%] text-gray-400 text-lg justify-center">
										{t('pages.settingsPersonal.SUBSCRIPTION')}
									</Text>
									<div className="flex w-full">
										<Text className="text-lg font-normal">{t('common.BASIC')}</Text>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</form>

			<EmailResetModal
				open={showEmailResetModal}
				closeModal={() => {
					setShowEmailResetModal(false);
				}}
				email={newEmail}
			/>
		</>
	);
};
