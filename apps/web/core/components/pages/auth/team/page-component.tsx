'use client';

import { CAPTCHA_TYPE, DEFAULT_APP_PATH, RECAPTCHA_SITE_KEY } from '@/core/constants/config/constants';
import { IStepProps, TStartMode, useAuthenticationTeam } from '@/core/hooks';
import { IClassName } from '@/core/types/interfaces/common/class-name';
import { clsxm } from '@/core/lib/utils';
import { BackButton, BackdropLoader, Button, SiteReCAPTCHA, Text } from '@/core/components';
import { AuthLayout } from '@/core/components/layouts/default-layout';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import SocialLogins from '@/core/components/auth/social-logins-buttons';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import Turnstile from 'react-turnstile';
import { EverCard } from '@/core/components/common/ever-card';
import { InputField } from '@/core/components/duplicated-components/_input';

function AuthTeam() {
	const {
		handleSubmit,
		step,
		FIRST_STEP,
		handleOnChange,
		handleStartModeChange,
		setStep,
		errors,
		formValues,
		loading,
		startMode
	} = useAuthenticationTeam();

	const t = useTranslations();

	return (
		<>
			<AuthLayout title={t('pages.authTeam.HEADING_TITLE')} description={t('pages.authTeam.HEADING_DESCRIPTION')}>
				<div className="w-[98%] md:w-[550px] overflow-x-hidden overflow-y-clip max-w-[450px] mx-auto">
					<form onSubmit={handleSubmit} autoComplete="off" className="w-full">
						<div
							className={clsxm(
								'w-[200%] flex flex-row transition-[transform] duration-500',
								step !== FIRST_STEP && ['-translate-x-[50%]']
							)}
						>
							{/* Step 1: User Information (Name, Email, Captcha) */}
							<div className="w-1/2">
								<FillUserDataForm
									errors={errors}
									handleOnChange={handleOnChange}
									form={formValues}
									loading={loading}
								/>
							</div>

							{/* Step 2: Choose Mode (Solo or Team) */}
							<div
								className={clsxm(
									'w-1/2 transition-[visibility] ease-out duration-700',
									step === FIRST_STEP && ['invisible']
								)}
							>
								<ChooseModeForm
									errors={errors}
									handleOnChange={handleOnChange}
									form={formValues}
									onPreviousStep={() => setStep(FIRST_STEP)}
									loading={loading}
									startMode={startMode}
									onStartModeChange={handleStartModeChange}
								/>
							</div>
						</div>
					</form>
					{/* Social logins - only shown on step 1 */}
					{step === FIRST_STEP && (
						<div>
							<SocialLogins />
						</div>
					)}
				</div>
				<BackdropLoader show={loading} title={t('pages.authTeam.LOADING_TEXT')} />
			</AuthLayout>
		</>
	);
}

/**
 * Step 1: User Information Form (Name, Email, Captcha)
 */
function FillUserDataForm({
	form,
	errors,
	handleOnChange,
	loading,
	className
}: IStepProps & {
	errors: Record<string, string>;
	loading?: boolean;
} & IClassName) {
	const t = useTranslations();

	const renderCaptcha = () => {
		const handleCaptchaVerify = (token: string) => {
			handleOnChange({ target: { name: 'recaptcha', value: token } });
		};

		const handleCaptchaError = () => {
			handleOnChange({ target: { name: 'recaptcha', value: '' } });
		};

		switch (CAPTCHA_TYPE) {
			case 'hcaptcha':
				return (
					<HCaptcha
						sitekey={RECAPTCHA_SITE_KEY.value ?? ''}
						onVerify={(token) => handleCaptchaVerify(token)}
						onError={() => handleCaptchaError()}
					/>
				);
			case 'cloudflare':
				return (
					/* @ts-ignore */
					<Turnstile
						sitekey={RECAPTCHA_SITE_KEY.value ?? ''}
						onSuccess={(token) => handleCaptchaVerify(token)}
						onError={() => handleCaptchaError()}
						onLoad={() => handleOnChange({ target: { name: 'captchaToken', value: '' } })}
					/>
				);
			default:
				return <ReCAPTCHA errors={errors} handleOnChange={handleOnChange} />;
		}
	};

	return (
		<EverCard className={clsxm('w-full dark:bg-[#25272D]', className)} shadow="custom">
			<div className="flex flex-col justify-between items-center h-full">
				<Text.Heading as="h3" className="mb-10 text-center">
					{t('pages.authTeam.STEP_USER_INFO')}
				</Text.Heading>

				<div className="mb-6 w-full">
					<InputField
						placeholder={t('form.NAME_PLACEHOLDER')}
						name="name"
						value={form.name}
						errors={errors}
						onChange={handleOnChange}
						autoComplete="off"
						wrapperClassName="dark:bg-[#25272D]"
						className="dark:bg-[#25272D]"
					/>
					<InputField
						type="email"
						placeholder={t('form.EMAIL_PLACEHOLDER')}
						className="dark:bg-[#25272D]"
						wrapperClassName="mb-5 dark:bg-[#25272D]"
						name="email"
						value={form.email}
						errors={errors}
						onChange={handleOnChange}
						autoComplete="off"
					/>
					{renderCaptcha()}
				</div>

				<div className="flex justify-between items-center w-full">
					<Text.Link href={DEFAULT_APP_PATH} underline variant="primary" className="font-normal">
						{t('pages.auth.LOGIN')}
					</Text.Link>

					<Button type="submit" disabled={loading}>
						{t('pages.authTeam.CONTINUE')}
					</Button>
				</div>
			</div>
		</EverCard>
	);
}

/**
 * Step 2: Choose Mode Form (Solo or Team)
 */
function ChooseModeForm({
	form,
	errors,
	handleOnChange,
	onPreviousStep,
	loading,
	startMode,
	onStartModeChange,
	className
}: IStepProps & {
	errors: Record<string, string>;
	onPreviousStep?: () => void;
	loading?: boolean;
	startMode: TStartMode;
	onStartModeChange: (mode: TStartMode) => void;
} & IClassName) {
	const t = useTranslations();

	return (
		<EverCard className={clsxm('w-full dark:bg-[#25272D]', className)} shadow="bigger">
			<div className="flex flex-col justify-between items-center h-full">
				<Text.Heading as="h3" className="mb-6 text-center">
					{t('pages.authTeam.GET_STARTED_TITLE')}
				</Text.Heading>

				<div className="mb-6 w-full space-y-4">
					{/* Solo Option */}
					<label
						className={clsxm(
							'flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all',
							startMode === 'solo'
								? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20'
								: 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
						)}
					>
						<input
							type="radio"
							name="startMode"
							value="solo"
							checked={startMode === 'solo'}
							onChange={() => onStartModeChange('solo')}
							className="mt-1 mr-3 h-4 w-4 text-primary-600 focus:ring-primary-500"
						/>
						<div className="flex-1">
							<span className="font-medium text-gray-900 dark:text-white">
								{t('pages.authTeam.START_SOLO')}
							</span>
							<p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
								{t('pages.authTeam.START_SOLO_NOTE')}
							</p>
						</div>
					</label>

					{/* Team Option */}
					<label
						className={clsxm(
							'flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all',
							startMode === 'team'
								? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20'
								: 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
						)}
					>
						<input
							type="radio"
							name="startMode"
							value="team"
							checked={startMode === 'team'}
							onChange={() => onStartModeChange('team')}
							className="mt-1 mr-3 h-4 w-4 text-primary-600 focus:ring-primary-500"
						/>
						<div className="flex-1">
							<span className="font-medium text-gray-900 dark:text-white">
								{t('pages.authTeam.CREATE_TEAM_NOW')}
							</span>
						</div>
					</label>

					{/* Team Name Input - only shown when team mode is selected */}
					{startMode === 'team' && (
						<div className="mt-4 pl-7">
							<InputField
								name="team"
								value={form.team}
								errors={errors}
								onChange={handleOnChange}
								placeholder={t('form.TEAM_NAME_PLACEHOLDER')}
								autoComplete="off"
								wrapperClassName="dark:bg-[#25272D]"
								className="dark:bg-[#25272D]"
								required
							/>
						</div>
					)}
				</div>

				<div className="flex justify-between items-center w-full">
					<BackButton onClick={onPreviousStep} />

					<Button type="submit" disabled={loading}>
						{t('pages.authTeam.GET_STARTED')}
					</Button>
				</div>
			</div>
		</EverCard>
	);
}

function ReCAPTCHA({ handleOnChange, errors }: { handleOnChange: any; errors: any }) {
	const t = useTranslations();
	const [feedback, setFeedback] = useState<string>('');

	const content = RECAPTCHA_SITE_KEY.value && (
		<div className="flex w-full">
			<div className="dark:invert-[0.88] dark:hue-rotate-180 scale-[1] origin-[0]">
				<SiteReCAPTCHA
					siteKey={RECAPTCHA_SITE_KEY.value}
					onChange={(res) => {
						handleOnChange({ target: { name: 'recaptcha', value: res } });
						setFeedback('');
					}}
					onErrored={() => setFeedback(t('errors.NETWORK_ISSUE'))}
				/>
				{(errors['recaptcha'] || feedback) && (
					<Text.Error className="justify-self-start self-start">{errors['recaptcha'] || feedback}</Text.Error>
				)}
			</div>
		</div>
	);

	return content || <></>;
}

export default AuthTeam;
