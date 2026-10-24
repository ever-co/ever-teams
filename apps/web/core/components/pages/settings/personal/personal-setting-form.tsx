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
				className="w-full"
				autoComplete="off"
				onSubmit={(e) => {
					e.preventDefault();
					handleFullnameChange();
					handleContactChange();
				}}
			>
				<div id="general" className="flex flex-col justify-between items-center">
					<div className="w-full">
						<div>
							{/* Full name */}
							<div className="w-full py-3 first:pt-0">
								<div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-[10rem_minmax(0,1fr)] sm:items-center sm:gap-4">
									<Text className="text-sm font-medium text-muted-foreground">
										{t('common.FULL_NAME')}
									</Text>
									<div className="flex min-w-0 flex-wrap items-center gap-2">
										<InputField
											type="text"
											placeholder={t('form.FIRST_NAME_PLACEHOLDER')}
											{...register('firstName', { required: true, maxLength: 80 })}
											className={`m-0 h-9 w-full ${!editFullname ? 'disabled:bg-muted/40' : ''}`}
											disabled={!editFullname}
											wrapperClassName="mb-0 min-w-[10rem] flex-1 rounded-md"
										/>
										<InputField
											type="text"
											placeholder={t('form.LAST_NAME_PLACEHOLDER')}
											{...register('lastName', { maxLength: 80 })}
											className={`m-0 h-9 w-full ${!editFullname ? 'disabled:bg-muted/40' : ''}`}
											disabled={!editFullname}
											wrapperClassName="mb-0 min-w-[10rem] flex-1 rounded-md"
										/>
										{editFullname ? (
											<Button
												variant="primary"
												className="h-9 min-w-20 shrink-0 rounded-md px-3 text-sm font-medium"
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
												className="h-9 min-w-20 shrink-0 rounded-md px-3 text-sm font-medium"
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
							<div className="w-full border-t border-border py-3">
								<div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-[10rem_minmax(0,1fr)] sm:items-center sm:gap-4">
									<Text className="text-sm font-medium text-muted-foreground">
										{t('common.CONTACT')}
									</Text>
									<div className="flex min-w-0 flex-wrap items-center gap-2">
										<div className="relative">
											<InputField
												type="email"
												placeholder={t('form.EMAIL_PLACEHOLDER')}
												{...register('email', {
													required: true,
													pattern:
														/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
												})}
												className={`m-0 h-9 w-full ${!editContacts ? 'disabled:bg-muted/40' : ''}`}
												onChange={checkEmailValidity}
												disabled={!editContacts}
												notValidBorder={!isValid.email}
												wrapperClassName="mb-0 min-w-[10rem] flex-1 rounded-md"
											/>
											{!isValid.email && (
												<p className="absolute -bottom-5 text-xs text-red-500">
													{t('pages.settingsPersonal.emailNotValid')}
												</p>
											)}
										</div>
										<div className="relative mb-0 min-w-[10rem] flex-1">
											<InternationalPhoneInput
												name="phoneNumber"
												register={register}
												error={errors.phoneNumber}
												value={user?.phoneNumber || ''}
												onChange={handlePhoneChange}
												disabled={!editContacts}
												className={`h-9 ${!editContacts ? 'bg-muted/40' : ''}`}
												wrapperClassName="mb-0 h-9"
											/>
										</div>
										{editContacts ? (
											<Button
												variant="primary"
												className="h-9 min-w-20 shrink-0 rounded-md px-3 text-sm font-medium"
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
												className="h-9 min-w-20 shrink-0 rounded-md px-3 text-sm font-medium"
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
							<div className="w-full border-t border-border py-3">
								<div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-[10rem_minmax(0,1fr)] sm:items-center sm:gap-4">
									<Text className="text-sm font-medium text-muted-foreground">
										{t('common.THEME')}
									</Text>
									<div className="flex items-center gap-3">
										<ThemeToggler />
										<Text className="text-sm text-muted-foreground">
											{theme === 'light' ? 'Light' : 'Dark'} Mode
										</Text>
									</div>
								</div>
							</div>

							{/* Language */}
							<div className="w-full border-t border-border py-3">
								<div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-[10rem_minmax(0,1fr)] sm:items-center sm:gap-4">
									<Text className="text-sm font-medium text-muted-foreground">
										{t('common.LANGUAGE')}
									</Text>
									<div className="relative flex w-full max-w-md">
										<LanguageDropDown
											currentLanguage={currentLanguage}
											onChangeLanguage={handleChangeLanguage}
										/>
									</div>
								</div>
							</div>

							{/* Timezone */}
							<div className="w-full border-t border-border py-3">
								<div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-[10rem_minmax(0,1fr)] sm:items-center sm:gap-4">
									<Text className="text-sm font-medium text-muted-foreground">
										{t('common.TIME_ZONE')}
									</Text>
									<div className="relative flex w-full max-w-xl items-center gap-2">
										<TimezoneDropDown
											currentTimezone={currentTimezone}
											onChange={handleChangeTimezone}
											className="min-w-0 flex-1"
										/>
										<Button
											variant="grey"
											type="button"
											onClick={() => handleChangeTimezone(undefined)}
											className="h-9 shrink-0 rounded-md px-3 text-sm font-medium"
										>
											{t('common.DETECT')}
										</Button>
									</div>
								</div>
							</div>

							{/* Work schedule */}
							<div
								id="work-schedule"
								className="w-full border-t border-border py-3"
							>
								<div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-[10rem_minmax(0,1fr)] sm:items-center sm:gap-4">
									<Text className="text-sm font-medium text-muted-foreground">
										{t('pages.settingsPersonal.WORK_SCHEDULE')}
									</Text>
									<div className="flex items-center">
										<Text className="text-sm text-foreground">{t('common.NO')}</Text>
									</div>
								</div>
							</div>

							{/* Subscription */}
							<div
								id="subscription"
								className="w-full border-t border-border py-3"
							>
								<div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-[10rem_minmax(0,1fr)] sm:items-center sm:gap-4">
									<Text className="text-sm font-medium text-muted-foreground">
										{t('pages.settingsPersonal.SUBSCRIPTION')}
									</Text>
									<div className="flex items-center">
										<Text className="text-sm text-foreground">{t('common.BASIC')}</Text>
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
