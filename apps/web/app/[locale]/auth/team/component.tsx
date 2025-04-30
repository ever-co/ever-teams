'use client';

import { CAPTCHA_TYPE, RECAPTCHA_SITE_KEY } from '@/core/constants/config/constants';
import { useAuthenticationTeam, IStepProps } from '@/core/hooks';
import { IClassName } from '@/core/types/interfaces';
import { clsxm } from '@/core/lib/utils';
import { BackButton, BackdropLoader, Button, Card, InputField, SiteReCAPTCHA, Text } from '@/core/components';
import { AuthLayout } from '@/core/components/layouts/default-layout';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import SocialLogins from '../social-logins-buttons';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import Turnstile from 'react-turnstile';

function AuthTeam() {
	const {
		handleSubmit,
		step,
		FIRST_STEP,
		// SECOND_STEP,
		handleOnChange,
		setStep,
		errors,
		formValues,
		loading
	} = useAuthenticationTeam();

	const t = useTranslations();

	return (
		<>
			<AuthLayout title={t('pages.authTeam.HEADING_TITLE')} description={t('pages.authTeam.HEADING_DESCRIPTION')}>
				<div className="w-[98%] md:w-[550px] overflow-x-hidden">
					<form onSubmit={handleSubmit} autoComplete="off">
						<div
							className={clsxm(
								'w-[200%] flex flex-row transition-[transform] duration-500',
								step !== FIRST_STEP && ['-translate-x-[50%]']
							)}
						>
							<div className="w-1/2">
								<FillTeamNameForm errors={errors} handleOnChange={handleOnChange} form={formValues} />
							</div>

							<div
								className={clsxm(
									'w-1/2 transition-[visibility] ease-out duration-700',
									step === FIRST_STEP && ['invisible']
								)}
							>
								<FillUserDataForm
									errors={errors}
									handleOnChange={handleOnChange}
									form={formValues}
									onPreviousStep={() => setStep(FIRST_STEP)}
									loading={loading}
								/>
							</div>
						</div>
					</form>
					{/* Social logins */}
					<div>
						<SocialLogins />
					</div>
				</div>
				<BackdropLoader show={loading} title={t('pages.authTeam.LOADING_TEXT')} />
			</AuthLayout>
		</>
	);
}

/**
 * First step form Component
 *
 * @param param0
 * @returns
 */
function FillTeamNameForm({
	form,
	errors,
	handleOnChange,
	className
}: IStepProps & { errors: Record<string, string> } & IClassName) {
	const t = useTranslations();

	return (
		<Card className={clsxm('w-full dark:bg-[#25272D]', className)} shadow="custom">
			<div className="flex flex-col items-center justify-between">
				<Text.Heading as="h3" className="text-center mb-7">
					{t('pages.authTeam.INPUT_TEAM_NAME')}
				</Text.Heading>

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

				<div className="flex items-center justify-between w-full mt-6">
					<Text.Link href="/auth/passcode" underline variant="primary" className="font-normal">
						{t('pages.auth.LOGIN')}
					</Text.Link>

					<Button type="submit">{t('common.CONTINUE')}</Button>
				</div>
			</div>
		</Card>
	);
}

/**
 * Second step form component
 *
 * @param param0
 * @returns
 */
function FillUserDataForm({
	form,
	errors,
	handleOnChange,
	onPreviousStep,
	loading,
	className
}: IStepProps & {
	errors: Record<string, string>;
	onPreviousStep?: () => void;
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
					<>
						<HCaptcha
							sitekey={RECAPTCHA_SITE_KEY.value ?? ''}
							onVerify={(token) => handleCaptchaVerify(token)}
							onError={() => handleCaptchaError()}
						/>
					</>
				);
			case 'cloudflare':
				return (
					<>
						{/* @ts-ignore */}
						<Turnstile
							sitekey={RECAPTCHA_SITE_KEY.value ?? ''}
							onSuccess={(token) => handleCaptchaVerify(token)}
							onError={() => handleCaptchaError()}
							onLoad={() => handleOnChange({ target: { name: 'captchaToken', value: '' } })}
						/>
					</>
				);
			default:
				return <ReCAPTCHA errors={errors} handleOnChange={handleOnChange} />;
		}
	};
	return (
		<Card className={clsxm('w-full dark:bg-[#25272D]', className)} shadow="bigger">
			<div className="flex flex-col items-center justify-between h-full">
				<Text.Heading as="h3" className="mb-10 text-center">
					{t('pages.authTeam.CREATE_FIRST_TEAM')}
				</Text.Heading>

				<div className="w-full mb-8">
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

				<div className="flex items-center justify-between w-full">
					<BackButton onClick={onPreviousStep} />

					<Button type="submit" disabled={loading}>
						{t('pages.authTeam.CREATE_TEAM')}
					</Button>
				</div>
			</div>
		</Card>
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
					<Text.Error className="self-start justify-self-start">{errors['recaptcha'] || feedback}</Text.Error>
				)}
			</div>
		</div>
	);

	return content || <></>;
}

export default AuthTeam;
