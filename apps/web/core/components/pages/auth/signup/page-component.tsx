'use client';

import { CAPTCHA_TYPE, DEFAULT_APP_PATH, RECAPTCHA_SITE_KEY } from '@/core/constants/config/constants';
import { IStepProps, TStartMode, useAuthenticationTeam } from '@/core/hooks';
import { IClassName } from '@/core/types/interfaces/common/class-name';
import { BackButton, BackdropLoader, Button, SiteReCAPTCHA, Text } from '@/core/components';
import { AuthLayout } from '@/core/components/layouts/default-layout';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import SocialLogins from '@/core/components/auth/social-logins-buttons';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import Turnstile from 'react-turnstile';
import { InputField } from '@/core/components/duplicated-components/_input';
import { cn } from '@/core/lib/helpers';

function AuthSignup() {
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
		<AuthLayout
			title={t('pages.authTeam.HEADING_TITLE')}
			description={t('pages.authTeam.HEADING_DESCRIPTION')}
			headerLinkText={t('pages.auth.LOGIN')}
			headerLinkHref={DEFAULT_APP_PATH}
		>
			<div className="w-full overflow-x-hidden overflow-y-clip p-1.5">
				<form onSubmit={handleSubmit} autoComplete="off" className="w-full">
					<div
						className={cn(
							'w-[200%] flex flex-row transition-[transform] duration-500',
							step !== FIRST_STEP && '-translate-x-[50%]'
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
							className={cn(
								'w-1/2 transition-[visibility] ease-out duration-700',
								step === FIRST_STEP && 'invisible'
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
				{step === FIRST_STEP && <SocialLogins />}
			</div>
			<BackdropLoader show={loading} title={t('pages.authTeam.LOADING_TEXT')} />
		</AuthLayout>
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

	const INPUT_CLASS =
		'dark:bg-foreground/5 ring-foreground/10 placeholder:text-muted-foreground/75 selection:bg-primary selection:text-primary-foreground flex h-9 w-full min-w-0 rounded-md border border-transparent bg-white px-3 py-1 text-base shadow-sm outline-none ring-1 transition-[color,box-shadow] md:text-sm focus-visible:border-foreground/35 focus-visible:ring-ring/25 dark:focus-visible:border-foreground/25 focus-visible:ring-[3px]';

	return (
		<div className={cn('space-y-6 w-full', className)}>
			<div className="space-y-4">
				<div className="space-y-2.5">
					<label
						data-slot="label"
						className="block text-sm font-medium leading-none select-none"
						htmlFor="signup-name"
					>
						{t('form.NAME_PLACEHOLDER')}
					</label>
					<InputField
						id="signup-name"
						placeholder={t('form.NAME_PLACEHOLDER')}
						name="name"
						value={form.name}
						errors={errors}
						onChange={handleOnChange}
						autoComplete="off"
						noWrapper
						className={INPUT_CLASS}
					/>
					{errors?.name && <Text.Error className="text-xs">{errors.name}</Text.Error>}
				</div>

				<div className="space-y-2.5">
					<label
						data-slot="label"
						className="block text-sm font-medium leading-none select-none"
						htmlFor="signup-email"
					>
						{t('form.EMAIL_PLACEHOLDER')}
					</label>
					<InputField
						id="signup-email"
						type="email"
						placeholder={t('form.EMAIL_PLACEHOLDER')}
						name="email"
						value={form.email}
						errors={errors}
						onChange={handleOnChange}
						autoComplete="off"
						noWrapper
						className={INPUT_CLASS}
					/>
					{errors?.email && <Text.Error className="text-xs">{errors.email}</Text.Error>}
				</div>

				{renderCaptcha()}
			</div>

			{/* Submit button — template exact classes */}
			<Button
				type="submit"
				disabled={loading}
				className="cursor-pointer inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow-md border-[0.5px] border-white/10 shadow-black/15 [&_svg]:drop-shadow-sm bg-primary ring-1 ring-(--ring-color) [--ring-color:color-mix(in_oklab,black_15%,var(--color-primary))] dark:border-transparent dark:[--ring-color:color-mix(in_oklab,white_15%,var(--color-primary))] text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2 w-full"
			>
				{t('pages.authTeam.CONTINUE')}
			</Button>
		</div>
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

	const INPUT_CLASS =
		'dark:bg-foreground/5 ring-foreground/10 placeholder:text-muted-foreground/75 selection:bg-primary selection:text-primary-foreground flex h-9 w-full min-w-0 rounded-md border border-transparent bg-white px-3 py-1 text-base shadow-sm outline-none ring-1 transition-[color,box-shadow] md:text-sm focus-visible:border-foreground/35 focus-visible:ring-ring/25 dark:focus-visible:border-foreground/25 focus-visible:ring-[3px]';

	return (
		<div className={cn('space-y-6 w-full', className)}>
			<div className="space-y-3">
				{/* Solo Option */}
				<label
					className={cn(
						'flex items-start p-4 rounded-lg cursor-pointer transition-all border ring-1',
						startMode === 'solo'
							? 'border-primary ring-primary/25 bg-primary/5'
							: 'border-transparent ring-foreground/10 hover:bg-muted/50'
					)}
				>
					<input
						type="radio"
						name="startMode"
						value="solo"
						checked={startMode === 'solo'}
						onChange={() => onStartModeChange('solo')}
						className="mt-1 mr-3 w-4 h-4 accent-primary"
					/>
					<div className="flex-1">
						<span className="font-medium">{t('pages.authTeam.START_SOLO')}</span>
						<p className="mt-1 text-sm text-muted-foreground">{t('pages.authTeam.START_SOLO_NOTE')}</p>
					</div>
				</label>

				{/* Team Option */}
				<label
					className={cn(
						'flex items-start p-4 rounded-lg cursor-pointer transition-all border ring-1',
						startMode === 'team'
							? 'border-primary ring-primary/25 bg-primary/5'
							: 'border-transparent ring-foreground/10 hover:bg-muted/50'
					)}
				>
					<input
						type="radio"
						name="startMode"
						value="team"
						checked={startMode === 'team'}
						onChange={() => onStartModeChange('team')}
						className="mt-1 mr-3 w-4 h-4 accent-primary"
					/>
					<div className="flex-1">
						<span className="font-medium">{t('pages.authTeam.CREATE_TEAM_NOW')}</span>
					</div>
				</label>

				{/* Team Name Input - only shown when team mode is selected */}
				{startMode === 'team' && (
					<div className="pl-7 space-y-2.5">
						<label
							data-slot="label"
							className="block text-sm font-medium leading-none select-none"
							htmlFor="signup-team"
						>
							{t('form.TEAM_NAME_PLACEHOLDER')}
						</label>
						<InputField
							id="signup-team"
							name="team"
							value={form.team}
							errors={errors}
							onChange={handleOnChange}
							placeholder={t('form.TEAM_NAME_PLACEHOLDER')}
							autoComplete="off"
							noWrapper
							className={INPUT_CLASS}
							required
						/>
						{errors?.team && <Text.Error className="text-xs">{errors.team}</Text.Error>}
					</div>
				)}
			</div>

			<div className="flex flex-col gap-1.5 items-center w-full">
				<Button
					type="submit"
					disabled={loading}
					className="cursor-pointer inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow-md border-[0.5px] border-white/10 shadow-black/15 [&_svg]:drop-shadow-sm bg-primary ring-1 ring-(--ring-color) [--ring-color:color-mix(in_oklab,black_15%,var(--color-primary))] dark:border-transparent dark:[--ring-color:color-mix(in_oklab,white_15%,var(--color-primary))] text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2"
				>
					{t('pages.authTeam.GET_STARTED')}
				</Button>
				<BackButton onClick={onPreviousStep} />
			</div>
		</div>
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

export default AuthSignup;
