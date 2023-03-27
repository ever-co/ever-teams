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
import { EmailResetModal } from './email-reset-modal';

export const PersonalSettingForm = () => {
	const [user] = useRecoilState(userState);
	const { register, setValue, getValues, setFocus } = useForm();
	const [currentTimezone, setCurrentTimezone] = useState('');
	const [currentLanguage, setCurrentLanguage] = useState('');
	const { updateAvatar } = useSettings();
	const { theme } = useTheme();
	const [editFullname, setEditFullname] = useState<boolean>(false);
	const [editContacts, setEditContacts] = useState<boolean>(false);
	const [showEmailResetModal, setShowEmailResetModal] =
		useState<boolean>(false);
	const [newEmail, setNewEmail] = useState<string>('');
	const { trans, translations } = useTranslation('settingsPersonal');

	const handleFullnameChange = useCallback(() => {
		const values = getValues();
		if (user) {
			updateAvatar({
				firstName: values.firstName,
				lastName: values.lastName,
				id: user.id,
			}).then(() => {
				setEditFullname(false);
			});
		}
	}, [updateAvatar, user, getValues]);

	const handleContactChange = useCallback(() => {
		const values = getValues();

		if (values.email !== user?.email) {
			setNewEmail(values.email || '');
			setShowEmailResetModal(true);
		}

		if (user) {
			updateAvatar({
				phoneNumber: values.phoneNumber,
				id: user.id,
			}).then(() => {
				setEditContacts(false);
			});
		}
	}, [updateAvatar, user, getValues]);

	const handleChangeTimezone = useCallback(
		(newTimezone: string | undefined) => {
			setActiveTimezoneCookie(newTimezone || userTimezone());
			setCurrentTimezone(newTimezone || userTimezone());
			setValue('timeZone', newTimezone || userTimezone());

			if (user) {
				updateAvatar({
					timeZone: newTimezone || userTimezone(),
					id: user.id,
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
		setCurrentLanguage(user?.preferredLanguage || getActiveLanguageIdCookie());
		setValue(
			'preferredLanguage',
			user?.preferredLanguage || getActiveLanguageIdCookie()
		);
	}, [setCurrentLanguage, user, user?.preferredLanguage, setValue]);
	const handleChangeLanguage = useCallback(
		(newLanguage: string) => {
			setActiveLanguageIdCookie(newLanguage);
			setCurrentLanguage(newLanguage);
			setValue('preferredLanguage', newLanguage);

			if (user) {
				updateAvatar({
					preferredLanguage: newLanguage,
					id: user.id,
				});
			}
		},
		[user, setCurrentLanguage, setValue, updateAvatar]
	);

	return (
		<>
			<form
				className="w-[98%] md:w-[530px]"
				autoComplete="off"
				onSubmit={(e) => {
					e.preventDefault();
					handleFullnameChange();
					handleContactChange();
				}}
			>
				<div className="flex flex-col items-center justify-between">
					<div className="w-full mt-5">
						<div className="">
							<div className="flex items-center justify-between w-full sm:gap-8 flex-col sm:flex-row">
								<div className="flex items-center justify-between w-full sm:gap-4 flex-col sm:flex-row">
									<div className="w-full">
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
											className={`md:w-[220px] m-0 h-[54px] ${
												!editFullname ? 'disabled:bg-[#FCFCFC]' : ''
											}`}
											disabled={!editFullname}
										/>
									</div>
									<div className="mt-[2rem] w-full">
										<InputField
											type="text"
											placeholder="Last Name"
											{...register('lastName', {
												maxLength: 80,
											})}
											className={`md:w-[220px] m-0 h-[54px] ${
												!editFullname ? 'disabled:bg-[#FCFCFC]' : ''
											}`}
											disabled={!editFullname}
										/>
									</div>
								</div>
								<div className="mt-5">
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
											{translations.common.SAVE}
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
											{translations.common.EDIT}
										</Button>
									)}
								</div>
							</div>
							<div className="flex items-center justify-between w-full sm:gap-8 mt-8 flex-col sm:flex-row">
								<div className="flex items-center justify-between w-full sm:gap-4 flex-col sm:flex-row">
									<div className="w-full">
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
											className={`md:w-[220px] m-0 h-[54px] ${
												!editContacts ? 'disabled:bg-[#FCFCFC]' : ''
											}`}
											disabled={!editContacts}
										/>
									</div>
									<div className="mt-8 w-full">
										<InputField
											type="text"
											placeholder="Phone Number"
											{...register('phoneNumber', {
												valueAsNumber: true,
											})}
											className={`md:w-[220px] m-0 h-[54px] ${
												!editContacts ? 'disabled:bg-[#FCFCFC]' : ''
											}`}
											disabled={!editContacts}
										/>
									</div>
								</div>
								<div className="mt-5">
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
											{translations.common.SAVE}
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
											{translations.common.EDIT}
										</Button>
									)}
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
							<div className="flex items-center sm:justify-between w-full gap-5 mt-8">
								<div>
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
