import { Button, Text, ThemeToggler } from '@/core/components';
import InternationalPhoneInput from '@/core/components/common/international-phone-Input';
import { InputField } from '@/core/components/duplicated-components/_input';
import { useLanguage, useSettings } from '@/core/hooks';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import {
	getActiveLanguageIdCookie,
	getActiveTimezoneIdCookie,
	setActiveLanguageIdCookie,
	setActiveTimezoneCookie,
	userTimezone
} from '@/core/lib/helpers/index';
import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import validator from 'validator';
import { LanguageDropDown } from '../../../common/language-dropdown';
import { EmailResetModal } from '../../../features/users/email-reset-modal';
import { TimezoneDropDown } from '../../../settings/timezone-dropdown';

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

export const PersonalSettingForm: React.FC = () => {
	const { data: user } = useUserQuery();
	const { currentLanguage, changeLanguage } = useLanguage();
	const {
		register,
		setValue,
		getValues,
		setFocus,
		formState: { errors }
	} = useForm<FormValues>();
	const [currentTimezone, setCurrentTimezone] = useState('');
	const { updateAvatar } = useSettings(); // should invalidate ['users','me'] on success
	const { theme } = useTheme();
	const [editFullname, setEditFullname] = useState(false);
	const [editContacts, setEditContacts] = useState(false);
	const [showEmailResetModal, setShowEmailResetModal] = useState(false);
	const [newEmail, setNewEmail] = useState('');
	const [isValid, setIsValid] = useState<IValidation>({ email: true });
	const t = useTranslations();
	const router = useRouter();

	const handleFullnameChange = useCallback(async () => {
		const values = getValues();
		if (!user) return;
		await updateAvatar({ firstName: values.firstName, lastName: values.lastName, id: user.id });
		setEditFullname(false);
	}, [getValues, updateAvatar, user?.id]);

	const checkEmailValidity = (e: React.ChangeEvent<HTMLInputElement>) => {
		const email = e.target.value;
		setIsValid((s) => ({ ...s, email: validator.isEmail(email) }));
	};

	const handleContactChange = useCallback(async () => {
		const values = getValues();
		if (!user || !isValid.email) return;

		if (values.email !== user.email) {
			setNewEmail(values.email || '');
			setShowEmailResetModal(true);
		}
		await updateAvatar({ phoneNumber: values.phoneNumber, id: user.id });
		setEditContacts(false);
	}, [getValues, isValid.email, updateAvatar, user?.id, user?.email]);

	// Idempotent timezone setter (manual or detect button)
	const handleChangeTimezone = useCallback(
		(newTimezone?: string) => {
			const tz = newTimezone ?? userTimezone();
			// no-op if nothing changes (prevents redundant writes/invalidations)
			if (tz === user?.timeZone && tz === currentTimezone) return;

			setActiveTimezoneCookie(tz);
			setCurrentTimezone(tz);
			setValue('timeZone', tz);

			if (user?.id && user.timeZone !== tz) {
				// write once; rely on mutation onSuccess to invalidate ['users','me']
				updateAvatar({ timeZone: tz, id: user.id });
			}
		},
		[currentTimezone, setValue, updateAvatar, user?.id, user?.timeZone]
	);

	const handleChangeLanguage = useCallback(
		(newLanguage: string) => {
			setActiveLanguageIdCookie(newLanguage);
			changeLanguage(newLanguage);
			setValue('preferredLanguage', newLanguage);

			if (user?.id && user.preferredLanguage !== newLanguage) {
				updateAvatar({ preferredLanguage: newLanguage, id: user.id });
			}
			router.replace(`/${newLanguage}/settings/personal`);
		},
		[changeLanguage, router, setValue, updateAvatar, user?.id, user?.preferredLanguage]
	);

	const handlePhoneChange = (value: string) => setValue('phoneNumber', value);

	// Initialize form fields from `user`
	useEffect(() => {
		setValue('firstName', user?.firstName ?? '');
		setValue('lastName', user?.lastName ?? '');
		setValue('email', user?.email ?? '');
		setValue('preferredLanguage', user?.preferredLanguage ?? getActiveLanguageIdCookie());
		setValue('phoneNumber', user?.phoneNumber ?? '');
		const tzFromUserOrCookie = user?.timeZone ?? getActiveTimezoneIdCookie();
		setValue('timeZone', tzFromUserOrCookie);
		setCurrentTimezone(tzFromUserOrCookie);
	}, [user, setValue]);

	// One-time auto-detect timezone if missing on first load
	const didSetTz = useRef(false);
	useEffect(() => {
		if (!user?.id || didSetTz.current) return;
		if (!user.timeZone) {
			didSetTz.current = true;
			const tz = userTimezone();
			setActiveTimezoneCookie(tz);
			setCurrentTimezone(tz);
			setValue('timeZone', tz);
			// write only if different
			updateAvatar({ timeZone: tz, id: user.id });
		}
	}, [user?.id, user?.timeZone, setValue, updateAvatar]);

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
				<div id="general" className="flex flex-col justify-between items-center">
					<div className="mt-5 w-full">
						<div>
							{/* Full name */}
							<div className="flex flex-col justify-between items-center w-full sm:gap-8 sm:flex-row">
								<div className="flex flex-col justify-between items-center w-full sm:gap-4 sm:flex-row">
									<Text className="font-normal min-w-[25%] text-gray-400 text-lg justify-center">
										{t('common.FULL_NAME')}
									</Text>
									<div className="flex flex-col gap-2 justify-start w-full lg:flex-row">
										<InputField
											type="text"
											placeholder={t('form.FIRST_NAME_PLACEHOLDER')}
											{...register('firstName', { required: true, maxLength: 80 })}
											className={`w-full m-0 h-[54px] ${!editFullname ? 'disabled:bg-[#FCFCFC]' : ''}`}
											disabled={!editFullname}
											wrapperClassName="rounded-lg w-full lg:w-[230px] mb-0 mr-5"
										/>
										<InputField
											type="text"
											placeholder={t('form.LAST_NAME_PLACEHOLDER')}
											{...register('lastName', { maxLength: 80 })}
											className={`w-full m-0 h-[54px] ${!editFullname ? 'disabled:bg-[#FCFCFC]' : ''}`}
											disabled={!editFullname}
											wrapperClassName="rounded-lg w-full lg:w-[230px] mb-0 mr-5"
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
												onClick={() => setEditFullname(true)}
											>
												{t('common.EDIT')}
											</Button>
										)}
									</div>
								</div>
							</div>

							{/* Contact */}
							<div className="flex flex-col justify-between items-center mt-8 w-full sm:gap-8 sm:flex-row">
								<div className="flex flex-col justify-between items-center w-full sm:gap-4 sm:flex-row">
									<Text className="font-normal min-w-[25%] text-gray-400 text-lg justify-center">
										{t('common.CONTACT')}
									</Text>
									<div className="flex flex-col gap-2 justify-start w-full lg:flex-row">
										<div className="relative">
											<InputField
												type="email"
												placeholder={t('form.EMAIL_PLACEHOLDER')}
												{...register('email', {
													required: true,
													pattern:
														/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
												})}
												className={`w-full m-0 h-[54px] ${!editContacts ? 'disabled:bg-[#FCFCFC]' : ''}`}
												onChange={checkEmailValidity}
												disabled={!editContacts}
												notValidBorder={!isValid.email}
												wrapperClassName="rounded-lg w-full lg:w-[230px] mb-0 mr-5 "
											/>
											{!isValid.email && (
												<p className="absolute -bottom-5 text-xs text-red-500">
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
													setTimeout(() => setFocus('email'), 10);
												}}
											>
												{t('common.EDIT')}
											</Button>
										)}
									</div>
								</div>
							</div>

							{/* Theme */}
							<div className="flex flex-col justify-between items-center mt-8 w-full sm:gap-8 sm:flex-row">
								<div className="flex flex-col justify-between items-center w-full sm:gap-4 sm:flex-row">
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

							{/* Language */}
							<div className="flex flex-col justify-between items-center mt-8 w-full sm:gap-8 sm:flex-row">
								<div className="flex flex-col justify-between items-center w-full sm:gap-4 sm:flex-row">
									<Text className="font-normal min-w-[25%] text-gray-400 text-lg justify-center">
										{t('common.LANGUAGE')}
									</Text>
									<div className="flex relative flex-col w-full lg:flex-row">
										<LanguageDropDown
											currentLanguage={currentLanguage}
											onChangeLanguage={handleChangeLanguage}
										/>
									</div>
								</div>
							</div>

							{/* Timezone */}
							<div className="flex flex-col justify-between items-center mt-8 w-full sm:gap-8 sm:flex-row">
								<div className="flex flex-col justify-between items-center w-full sm:gap-4 sm:flex-row">
									<Text className="font-normal min-w-[25%] text-gray-400 text-lg justify-center">
										{t('common.TIME_ZONE')}
									</Text>
									<div className="flex relative flex-col gap-2 w-full lg:flex-row">
										<TimezoneDropDown
											currentTimezone={currentTimezone}
											onChange={handleChangeTimezone}
											className="md:w-[469px] dark:bg-dark--theme-light"
										/>
										<Button
											variant="grey"
											type="button"
											onClick={() => handleChangeTimezone(undefined)}
											className="min-w-[100px] shrink-0 h-[54px] rounded-[8px] font-[600] ml-5"
										>
											{t('common.DETECT')}
										</Button>
									</div>
								</div>
							</div>

							{/* Work schedule */}
							<div
								id="work-schedule"
								className="flex flex-col justify-between items-center mt-8 w-full sm:gap-8 sm:flex-row"
							>
								<div className="flex flex-col justify-between items-center w-full sm:gap-4 sm:flex-row">
									<Text className="font-normal min-w-[25%] text-gray-400 text-lg justify-center">
										{t('pages.settingsPersonal.WORK_SCHEDULE')}
									</Text>
									<div className="flex w-full">
										<Text className="text-lg font-normal">{t('common.NO')}</Text>
									</div>
								</div>
							</div>

							{/* Subscription */}
							<div
								id="subscription"
								className="flex flex-col justify-between items-center mt-8 w-full sm:gap-8 sm:flex-row"
							>
								<div className="flex flex-col justify-between items-center w-full sm:gap-4 sm:flex-row">
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
				closeModal={() => setShowEmailResetModal(false)}
				email={newEmail}
			/>
		</>
	);
};
