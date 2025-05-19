import {
	getActiveLanguageIdCookie,
	getActiveTimezoneIdCookie,
	setActiveLanguageIdCookie,
	setActiveTimezoneCookie,
	userTimezone
} from '@/core/lib/helpers/index';
import { useLanguage, useSettings } from '@/core/hooks';
import { userState } from '@/core/stores';
import { Button, Text, ThemeToggler } from '@/core/components';
import { useTheme } from 'next-themes';
import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import { useAtom } from 'jotai';
import validator from 'validator';
import { EmailResetModal } from '../../../features/users/email-reset-modal';
import { LanguageDropDown } from '../../../common/language-dropdown';
import { TimezoneDropDown } from '../../../settings/timezone-dropdown';
import { useRouter } from 'next/navigation';
import InternationalPhoneInput from '@/core/components/common/international-phone-Input';
import { InputField } from '@/core/components/duplicated-components/_input';

interface IValidation {
	email: boolean;
}

interface FormValues {
	firstName: string;
	lastName: string;
	email: string;
	phoneNumber: string;
	timeZone: string;
	preferredLanguage: string;
}

export const PersonalSettingForm = () => {
	const [user] = useAtom(userState);
	const { currentLanguage, changeLanguage } = useLanguage();
	const {
		register,
		setValue,
		getValues,
		setFocus,
		formState: { errors }
	} = useForm<FormValues>();
	const [currentTimezone, setCurrentTimezone] = useState('');
	const { updateAvatar } = useSettings();
	const { theme } = useTheme();
	const [editFullname, setEditFullname] = useState<boolean>(false);
	const [editContacts, setEditContacts] = useState<boolean>(false);
	const [showEmailResetModal, setShowEmailResetModal] = useState<boolean>(false);
	const [newEmail, setNewEmail] = useState<string>('');
	const [isValid, setIsValid] = useState<IValidation>({
		email: true
	});
	const t = useTranslations();
	const router = useRouter();

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

	const handleContactChange = useCallback(() => {
		const values = getValues();

		if (values.email !== user?.email && isValid.email) {
			setNewEmail(values.email || '');
			setShowEmailResetModal(true);
		}

		if (user && isValid.email) {
			updateAvatar({
				phoneNumber: values.phoneNumber,
				id: user.id
			}).then(() => {
				setEditContacts(false);
			});
		}
	}, [updateAvatar, user, getValues, isValid.email]);

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

	useEffect(() => {
		setCurrentTimezone(user?.timeZone || getActiveTimezoneIdCookie());
		setValue('timeZone', user?.timeZone || getActiveTimezoneIdCookie());
	}, [setCurrentTimezone, setValue, user, user?.timeZone]);

	useEffect(() => {
		setValue('firstName', user?.firstName || '');
		setValue('lastName', user?.lastName || '');
		setValue('email', user?.email || '');
		setValue('timeZone', user?.timeZone || '');
		setValue('preferredLanguage', user?.preferredLanguage || '');
		setValue('phoneNumber', user?.phoneNumber || '');

		/**
		 * Set Default current timezone.
		 * User can change it anytime if wants
		 */
		if (!user?.timeZone) {
			handleChangeTimezone(undefined);
		}
	}, [user, currentTimezone, currentLanguage, setValue, handleChangeTimezone]);

	useEffect(() => {
		setValue('preferredLanguage', user?.preferredLanguage || getActiveLanguageIdCookie());
	}, [user, user?.preferredLanguage, setValue]);

	const handleChangeLanguage = useCallback(
		(newLanguage: string) => {
			setActiveLanguageIdCookie(newLanguage);
			changeLanguage(newLanguage);
			setValue('preferredLanguage', newLanguage);

			if (user) {
				updateAvatar({
					preferredLanguage: newLanguage,
					id: user.id
				});
			}

			router.replace(`/${newLanguage}/settings/personal`);
		},
		[user, setValue, updateAvatar, changeLanguage, router]
	);

	const handlePhoneChange = (value: string) => {
		setValue('phoneNumber', value);
	};

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
									<div className="flex flex-col justify-start w-full gap-2 lg:flex-row">
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
											wrapperClassName={`rounded-lg w-full lg:w-[230px] mb-0 mr-5`}
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
											wrapperClassName={`rounded-lg w-full lg:w-[230px] mb-0 mr-5`}
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
									<div className="flex flex-col justify-start w-full gap-2 lg:flex-row">
										<div className="relative">
											<InputField
												type="email"
												placeholder={t('form.EMAIL_PLACEHOLDER')}
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
												wrapperClassName={`rounded-lg w-full lg:w-[230px] mb-0 mr-5 `}
											/>
											{!isValid.email && (
												<p className="absolute text-xs text-red-500 -bottom-5">
													{t('pages.settingsPersonal.emailNotValid')}
												</p>
											)}
										</div>
										<div className="lg:w-[230px] mb-0 mr-5 relative">
											<InternationalPhoneInput
												name="phoneNumber"
												register={register}
												error={errors.phoneNumber}
												value={user?.phoneNumber || ''}
												onChange={handlePhoneChange}
												disabled={!editContacts}
												className={`h-[54px] ${!editContacts ? 'bg-[#FCFCFC] dark:bg-dark--theme-light' : ''}`}
												wrapperClassName="mb-0 h-[54px]"
											/>
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
									<div className="flex items-center w-full lg:items-start">
										<ThemeToggler />
										<Text className="flex items-center ml-5 mt-2.5 text-sm font-normal text-gray-400">
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
									<div className="relative flex flex-col w-full lg:flex-row">
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
									<div className="relative flex flex-col w-full gap-2 lg:flex-row">
										<TimezoneDropDown
											currentTimezone={currentTimezone}
											onChange={(t: string) => {
												handleChangeTimezone(t);
											}}
											className="md:w-[469px] dark:bg-dark--theme-light"
										/>
										<Button
											variant="grey"
											type="button"
											onClick={() => {
												handleChangeTimezone(undefined);
											}}
											className="min-w-[100px] shrink-0 h-[54px] rounded-[8px] font-[600] ml-5"
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
