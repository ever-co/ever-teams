import { Button, Text, ThemeToggler } from '@/core/components';
import InternationalPhoneInput from '@/core/components/common/international-phone-Input';
import { InputField } from '@/core/components/duplicated-components/_input';
import { useLanguage, useSettings } from '@/core/hooks';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import {
	getActiveLanguageIdCookie,
	getActiveTimezoneIdCookie,
	setActiveLanguageIdCookie,
	setActiveTimezoneCookie
} from '@/core/lib/helpers/index';
import { userTimezone } from '@/core/lib/helpers/user-timezone';
import { TranslationHooks, useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import validator from 'validator';
import { LanguageDropDown } from '../../../common/language-dropdown';
import { EmailResetModal } from '../../../features/users/email-reset-modal';
import { TimezoneDropDown } from '../../../settings/timezone-dropdown';
import { clsxm } from '@/core/lib/utils';
import {
	SETTINGS_CONTROL_CLASS,
	SETTINGS_LABEL_CLASS,
	SETTINGS_ROW_CLASS,
	SETTINGS_ROWS_CLASS
} from '../settings-section';

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

function themeModeLabel(theme: string | undefined, t: TranslationHooks) {
	if (theme === 'light') {
		return t('common.LIGHT_MODE');
	}
	return t('common.DARK_MODE');
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
				<div id="general" className={SETTINGS_ROWS_CLASS}>
					<div className={SETTINGS_ROW_CLASS}>
						<Text className={SETTINGS_LABEL_CLASS}>{t('common.FULL_NAME')}</Text>
						<div className={SETTINGS_CONTROL_CLASS}>
							<InputField
								type="text"
								placeholder={t('form.FIRST_NAME_PLACEHOLDER')}
								{...register('firstName', { required: true, maxLength: 80 })}
								className="disabled:bg-foreground/[0.03]"
								disabled={!editFullname}
								wrapperClassName="mb-0 min-w-[10rem] flex-1 rounded-md"
							/>
							<InputField
								type="text"
								placeholder={t('form.LAST_NAME_PLACEHOLDER')}
								{...register('lastName', { maxLength: 80 })}
								className="disabled:bg-foreground/[0.03]"
								disabled={!editFullname}
								wrapperClassName="mb-0 min-w-[10rem] flex-1 rounded-md"
							/>
							{editFullname && (
								<Button
									variant="primary"
									className="min-w-20 shrink-0"
									type="button"
									onClick={(e) => {
										e.preventDefault();
										handleFullnameChange();
									}}
								>
									{t('common.SAVE')}
								</Button>
							)}
							{!editFullname && (
								<Button
									variant="grey"
									className="min-w-20 shrink-0"
									type="button"
									onClick={() => setEditFullname(true)}
								>
									{t('common.EDIT')}
								</Button>
							)}
						</div>
					</div>

					<div className={SETTINGS_ROW_CLASS}>
						<Text className={SETTINGS_LABEL_CLASS}>{t('common.CONTACT')}</Text>
						<div className={SETTINGS_CONTROL_CLASS}>
							<div className="relative min-w-[10rem] flex-1">
								<InputField
									type="email"
									placeholder={t('form.EMAIL_PLACEHOLDER')}
									{...register('email', {
										required: true,
										pattern:
											/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
									})}
									className="disabled:bg-foreground/[0.03]"
									onChange={checkEmailValidity}
									disabled={!editContacts}
									notValidBorder={!isValid.email}
									wrapperClassName="mb-0 rounded-md"
								/>
								{!isValid.email && (
									<p className="absolute -bottom-5 text-xs text-destructive-ink">
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
									className={clsxm('h-9', !editContacts && 'bg-foreground/[0.03]')}
									wrapperClassName="mb-0 h-9"
								/>
							</div>
							{editContacts && (
								<Button
									variant="primary"
									className="min-w-20 shrink-0"
									type="button"
									onClick={(e) => {
										e.preventDefault();
										handleContactChange();
									}}
								>
									{t('common.SAVE')}
								</Button>
							)}
							{!editContacts && (
								<Button
									variant="grey"
									className="min-w-20 shrink-0"
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

					<div className={SETTINGS_ROW_CLASS}>
						<Text className={SETTINGS_LABEL_CLASS}>{t('common.THEME')}</Text>
						<div className="flex items-center gap-3">
							<ThemeToggler />
							<Text className="text-sm text-muted-foreground">{themeModeLabel(theme, t)}</Text>
						</div>
					</div>

					<div className={SETTINGS_ROW_CLASS}>
						<Text className={SETTINGS_LABEL_CLASS}>{t('common.LANGUAGE')}</Text>
						<div className="relative flex w-full max-w-md">
							<LanguageDropDown
								currentLanguage={currentLanguage}
								onChangeLanguage={handleChangeLanguage}
							/>
						</div>
					</div>

					<div className={SETTINGS_ROW_CLASS}>
						<Text className={SETTINGS_LABEL_CLASS}>{t('common.TIME_ZONE')}</Text>
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
								className="shrink-0"
							>
								{t('common.DETECT')}
							</Button>
						</div>
					</div>

					<div id="work-schedule" className={SETTINGS_ROW_CLASS}>
						<Text className={SETTINGS_LABEL_CLASS}>{t('pages.settingsPersonal.WORK_SCHEDULE')}</Text>
						<div className="flex items-center">
							<Text className="text-sm text-foreground">{t('common.NO')}</Text>
						</div>
					</div>

					<div id="subscription" className={SETTINGS_ROW_CLASS}>
						<Text className={SETTINGS_LABEL_CLASS}>{t('pages.settingsPersonal.SUBSCRIPTION')}</Text>
						<div className="flex items-center">
							<Text className="text-sm text-foreground">{t('common.BASIC')}</Text>
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
