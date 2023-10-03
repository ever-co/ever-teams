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
	PHONE_REGEX,
	setActiveLanguageIdCookie,
	setActiveTimezoneCookie,
	userTimezone
} from '@app/helpers';
import { useSettings } from '@app/hooks';
import { useTheme } from 'next-themes';
import { useTranslation } from 'lib/i18n';
import { EmailResetModal } from './email-reset-modal';
import validator from 'validator';

interface IValidation {
	email: boolean;
	phone: boolean;
}

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
	const [isValid, setIsValid] = useState<IValidation>({
		email: true,
		phone: true
	});
	const { trans, translations } = useTranslation('settingsPersonal');

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
					id: user.id
				});
			}
		},
		[user, setCurrentLanguage, setValue, updateAvatar]
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
				<div
					id="general"
					className="flex flex-col items-center justify-between"
				>
					<div className="w-full mt-5">
						<div className="">
							<div className="flex items-center justify-between w-full sm:gap-8 flex-col sm:flex-row">
								<div className="flex items-center justify-between w-full sm:gap-4 flex-col sm:flex-row">
									<Text className="font-normal min-w-[25%] text-gray-400 text-lg justify-center">
										{translations.common.FULL_NAME}
									</Text>
									<div className="flex w-full justify-start">
										<InputField
											type="text"
											placeholder="First Name"
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
											placeholder="Last Name"
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
							</div>

							<div className="flex items-center justify-between w-full sm:gap-8 flex-col sm:flex-row mt-8">
								<div className="flex items-center justify-between w-full sm:gap-4 flex-col sm:flex-row">
									<Text className="font-normal min-w-[25%] text-gray-400 text-lg justify-center">
										{translations.common.CONTACT}
									</Text>
									<div className="flex w-full justify-start">
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
												<p className="absolute -bottom-5  text-red-500 text-xs">
													{translations.pages.settingsPersonal.emailNotValid}
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
												<p className="absolute -bottom-5  text-red-500 text-xs">
													{translations.pages.settingsPersonal.phoneNotValid}
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
							</div>

							<div className="flex items-center justify-between w-full sm:gap-8 flex-col sm:flex-row mt-8">
								<div className="flex items-center justify-between w-full sm:gap-4 flex-col sm:flex-row">
									<Text className="font-normal min-w-[25%] text-gray-400 text-lg justify-center">
										{translations.common.THEME}
									</Text>
									<div className="flex w-full">
										<ThemeToggler />
										<Text className="text-sm font-normal text-gray-400 flex items-center ml-5">
											{theme === 'light' ? 'Light' : 'Dark'} Mode
										</Text>
									</div>
								</div>
							</div>

							<div className="flex items-center justify-between w-full sm:gap-8 flex-col sm:flex-row mt-8">
								<div className="flex items-center justify-between w-full sm:gap-4 flex-col sm:flex-row">
									<Text className="font-normal min-w-[25%] text-gray-400 text-lg justify-center">
										{translations.common.LANGUAGE}
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

							<div className="flex items-center justify-between w-full sm:gap-8 flex-col sm:flex-row mt-8">
								<div className="flex items-center justify-between w-full sm:gap-4 flex-col sm:flex-row">
									<Text className="font-normal min-w-[25%] text-gray-400 text-lg justify-center">
										{translations.common.TIME_ZONE}
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
											{translations.common.DETECT}
										</Button>
									</div>
								</div>
							</div>

							<div
								id="work-schedule"
								className="flex items-center justify-between w-full sm:gap-8 flex-col sm:flex-row mt-8"
							>
								<div className="flex items-center justify-between w-full sm:gap-4 flex-col sm:flex-row">
									<Text className="font-normal min-w-[25%] text-gray-400 text-lg justify-center">
										{trans.WORK_SCHEDULE}
									</Text>
									<div className="flex w-full">
										<Text className="text-lg font-normal">No</Text>
									</div>
								</div>
							</div>

							<div
								id="subscription"
								className="flex items-center justify-between w-full sm:gap-8 flex-col sm:flex-row mt-8"
							>
								<div className="flex items-center justify-between w-full sm:gap-4 flex-col sm:flex-row">
									<Text className="font-normal min-w-[25%] text-gray-400 text-lg justify-center">
										{trans.SUBSCRIPTION}
									</Text>
									<div className="flex w-full">
										<Text className="text-lg font-normal">Basic</Text>
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
