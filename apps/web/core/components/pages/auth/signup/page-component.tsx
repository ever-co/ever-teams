'use client';

import { CAPTCHA_TYPE, DEFAULT_APP_PATH, RECAPTCHA_SITE_KEY } from '@/core/constants/config/constants';
import { IStepProps, TStartMode, useAuthenticationTeam } from '@/core/hooks/auth/use-authentication-team';
import { Button } from '@/core/components/common/button';
import { SiteReCAPTCHA } from '@/core/components/duplicated-components/recaptcha';
import { AuthLayout } from '@/core/components/layouts/default-layout/auth-layout';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import SocialLogins from '@/core/components/auth/social-logins-buttons';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import Turnstile from 'react-turnstile';
import { cn } from '@/core/lib/helpers';
import { Checkbox } from '@/core/components/common/checkbox';
import { AuthReveal } from '@/core/components/auth/kit/auth-reveal';
import { ArrowLeft, Mail, User, UserAdd, Users } from '@/core/components/icons';
import { AuthHeading, AuthMark } from '@/core/components/auth/kit/auth-heading';
import { AuthField } from '@/core/components/auth/kit/auth-field';
import { AuthNotice } from '@/core/components/auth/kit/auth-notice';
import { AuthAddress, AuthState } from '@/core/components/auth/kit/auth-state';
import { playStepArrival } from '@/core/components/auth/kit/auth-step';
import { AUTH_HINT, AUTH_QUIET_LINK, AUTH_TEXT_LINK } from '@/core/components/auth/kit/auth-recipes';
import { AccountScene, InboxScene, TeamScene } from '@/core/components/auth/scenes/auth-scenes';
import { defaultTeamNameOf } from '@/core/lib/utils/default-team-name';
import type { IEverIdSignupPrefill } from '@/core/types/interfaces/auth/ever-id';

/** The Ever ID part of the sign-up form (null for the usual sign-up). */
type TEverIdSignup = {
	prefill: IEverIdSignupPrefill | null;
	loading: boolean;
	error: string | null;
	/** The name is the verified one of the Ever ID (read-only); otherwise the person enters it. */
	nameVerified: boolean;
	confirmed: boolean;
	setConfirmed: (confirmed: boolean) => void;
	termsAccepted: boolean;
	setTermsAccepted: (accepted: boolean) => void;
} | null;

const TOTAL_STEPS = 2;

const FIRST_STEP_FIELDS = ['name', 'email', 'recaptcha'] as const;

function hasFirstStepError(errors: Record<string, string> | undefined) {
	if (!errors) {
		return false;
	}
	return FIRST_STEP_FIELDS.some((field) => Boolean(errors[field]));
}

function stepNumberOf(isFirstStep: boolean) {
	if (isFirstStep) {
		return 1;
	}
	return 2;
}

function teamNameOf(startMode: TStartMode, teamName: string, name: string) {
	if (startMode === 'team') {
		return teamName;
	}
	return defaultTeamNameOf(name);
}

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
		startMode,
		everId,
		verifyEmailSentTo
	} = useAuthenticationTeam();

	const t = useTranslations();
	const isFirstStep = step === FIRST_STEP;
	const firstStepRef = useRef<HTMLDivElement>(null);
	const secondStepRef = useRef<HTMLDivElement>(null);
	const shownStep = useRef(step);
	const [showsForm, setShowsForm] = useState(true);
	const errorList = errors as unknown as Record<string, string>;
	const sendsBackToFirstStep = !isFirstStep && hasFirstStepError(errorList);
	const isSent = Boolean(verifyEmailSentTo);

	// The API answers about the name or the address after the second step: show it where the field is
	useEffect(() => {
		if (sendsBackToFirstStep) {
			setStep(FIRST_STEP);
		}
	}, [sendsBackToFirstStep, setStep, FIRST_STEP]);

	useEffect(() => {
		if (shownStep.current === step) {
			return;
		}
		shownStep.current = step;
		if (step === FIRST_STEP) {
			playStepArrival(firstStepRef.current, 'backward');
			return;
		}
		playStepArrival(secondStepRef.current, 'forward');
	}, [step, FIRST_STEP]);

	const [seenSentTo, setSeenSentTo] = useState<string | null>(null);
	if (seenSentTo !== verifyEmailSentTo) {
		setSeenSentTo(verifyEmailSentTo);
		if (verifyEmailSentTo) {
			setShowsForm(false);
		}
	}

	const useAnotherAddress = () => {
		setShowsForm(true);
		setStep(FIRST_STEP);
	};

	const teamName = teamNameOf(startMode, formValues.team, formValues.name);
	const showsSentState = isSent && !showsForm;

	let scene: ReactNode = (
		<AccountScene
			title={t('auth.scene.ACCOUNT_TITLE')}
			description={t('auth.scene.ACCOUNT_TEXT')}
			name={formValues.name}
			email={formValues.email}
		/>
	);
	if (!isFirstStep) {
		scene = (
			<TeamScene
				title={t('auth.scene.TEAM_TITLE')}
				description={t('auth.scene.TEAM_TEXT')}
				teamName={teamName}
				name={formValues.name}
				email={formValues.email}
			/>
		);
	}
	if (showsSentState) {
		scene = (
			<InboxScene
				title={t('auth.scene.INBOX_ACTIVATE_TITLE')}
				description={t('auth.scene.INBOX_ACTIVATE_TEXT')}
				email={verifyEmailSentTo ?? ''}
				message="activate"
			/>
		);
	}

	return (
		<AuthLayout
			headerLinkPrompt={t('auth.signUp.HAVE_ACCOUNT')}
			headerLinkText={t('auth.signUp.SIGN_IN')}
			headerLinkHref={DEFAULT_APP_PATH}
			aside={scene}
			contentAlign="top"
		>
			{showsSentState && (
				<AuthState
					tone="brand"
					glyph={<Mail aria-hidden="true" />}
					title={t('auth.signUp.SENT_TITLE')}
					description={t('auth.signUp.SENT_TEXT')}
					actions={
						<>
							<Button asChild className="w-full max-sm:h-11">
								<Link href={DEFAULT_APP_PATH}>{t('auth.signUp.SIGN_IN')}</Link>
							</Button>
							<button
								type="button"
								onClick={useAnotherAddress}
								className={cn(AUTH_QUIET_LINK, 'self-center')}
							>
								{t('auth.signUp.USE_ANOTHER_EMAIL')}
							</button>
						</>
					}
				>
					<AuthAddress email={verifyEmailSentTo ?? ''} />
					<p className={AUTH_HINT}>
						<ExistingAccountHint />
					</p>
				</AuthState>
			)}

			{loading && (
				<AuthState
					tone="loading"
					title={t('auth.signUp.CREATING')}
					description={t('auth.signUp.CREATING_TEXT', { team: teamName })}
				/>
			)}

			<div className={cn((loading || showsSentState) && 'hidden')}>
				<StepCounter current={stepNumberOf(isFirstStep)} />
				<form onSubmit={handleSubmit} autoComplete="on" noValidate>
					<div>
						{/* Kept mounted on step 2: the captcha keeps its answer when the person comes back */}
						<div ref={firstStepRef} hidden={!isFirstStep}>
							<FillUserDataForm
								errors={errorList}
								handleOnChange={handleOnChange}
								form={formValues}
								loading={loading}
								everId={everId}
								showsExistingAccountHint={!verifyEmailSentTo}
							/>
						</div>
						{!isFirstStep && (
							<div ref={secondStepRef}>
								<ChooseModeForm
									errors={errorList}
									handleOnChange={handleOnChange}
									form={formValues}
									onPreviousStep={() => setStep(FIRST_STEP)}
									loading={loading}
									startMode={startMode}
									onStartModeChange={handleStartModeChange}
								/>
							</div>
						)}
					</div>
				</form>
				{isFirstStep && <SocialLogins />}
			</div>
		</AuthLayout>
	);
}

/** "Step 1 of 2" over two segments, the first filled. */
function StepCounter({ current }: Readonly<{ current: number }>) {
	const t = useTranslations();
	const segments = Array.from({ length: TOTAL_STEPS }, (_, index) => index + 1);

	return (
		<div className="mb-7 flex items-center gap-3">
			<span className="text-xs text-muted-foreground tabular-nums">
				{t('auth.signUp.STEP', { step: current, total: TOTAL_STEPS })}
			</span>
			<div aria-hidden="true" className="flex flex-1 gap-1">
				{segments.map((segment) => (
					<span
						key={segment}
						className={cn(
							'h-1 flex-1 rounded-full transition-colors duration-300',
							segment <= current && 'bg-primary',
							segment > current && 'bg-foreground/[0.08]'
						)}
					/>
				))}
			</div>
		</div>
	);
}

/**
 * Step 1: who the person is (name, e-mail), the captcha of the deployment and, for an Ever ID sign-up, the
 * confirmation.
 */
function FillUserDataForm({
	form,
	errors,
	handleOnChange,
	loading,
	everId = null,
	showsExistingAccountHint = true
}: IStepProps & {
	errors: Record<string, string>;
	loading?: boolean;
	everId?: TEverIdSignup;
	showsExistingAccountHint?: boolean;
}) {
	const t = useTranslations();
	const hintUnderEmail = showsExistingAccountHint && !everId;
	const isNameLocked = Boolean(everId?.nameVerified) || Boolean(everId?.loading);
	const isEmailLocked = Boolean(everId);
	const isContinueDisabled = Boolean(loading) || Boolean(everId?.loading);

	const handleCaptchaVerify = (token: string) => {
		handleOnChange({ target: { name: 'recaptcha', value: token } });
	};

	const handleCaptchaError = () => {
		handleOnChange({ target: { name: 'recaptcha', value: '' } });
	};

	const renderCaptcha = () => {
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
		<div className="flex flex-col">
			<AuthHeading
				mark={
					<AuthMark>
						<UserAdd />
					</AuthMark>
				}
				title={t('auth.signUp.TITLE')}
				description={t('auth.signUp.DESCRIPTION')}
				className="mb-7"
			/>
			<div className="flex flex-col gap-5">
				<AuthField
					id="signup-name"
					name="name"
					label={t('auth.field.NAME_LABEL')}
					placeholder={t('auth.field.NAME_PLACEHOLDER')}
					icon={<User />}
					value={form.name}
					error={errors?.name}
					onChange={handleOnChange}
					readOnly={isNameLocked}
					autoComplete="name"
				/>
				<AuthField
					id="signup-email"
					type="email"
					name="email"
					label={t('auth.field.EMAIL_LABEL')}
					placeholder={t('auth.field.EMAIL_PLACEHOLDER')}
					icon={<Mail />}
					value={form.email}
					error={errors?.email}
					onChange={handleOnChange}
					readOnly={isEmailLocked}
					autoComplete="email"
					inputMode="email"
					hint={hintUnderEmail ? <ExistingAccountHint /> : undefined}
				/>

				{everId && <EverIdSignupConfirmation everId={everId} error={errors?.everId} />}

				{renderCaptcha()}

				<Button type="submit" disabled={isContinueDisabled} className="w-full max-sm:h-11">
					{t('common.CONTINUE')}
				</Button>
			</div>
		</div>
	);
}

/** One way to start, as a choice row: its key cap, its glyph, the title and what it means. */
function StartModeOption({
	mode,
	keyLabel,
	icon,
	title,
	description,
	isChecked,
	onChoose
}: Readonly<{
	mode: TStartMode;
	keyLabel: string;
	icon: ReactNode;
	title: string;
	description: string;
	isChecked: boolean;
	onChoose: (mode: TStartMode) => void;
}>) {
	return (
		<label
			className={cn(
				'flex cursor-pointer items-start gap-3 rounded-xl px-3 py-3 outline-none transition-colors duration-150 hairline-ring has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/25',
				isChecked && 'bg-primary/[0.06] ring-primary/30',
				!isChecked && 'ring-foreground/10 hover:bg-foreground/[0.03] dark:ring-foreground/15'
			)}
		>
			<input
				type="radio"
				name="startMode"
				value={mode}
				checked={isChecked}
				onChange={() => onChoose(mode)}
				className="sr-only"
			/>
			<span
				aria-hidden="true"
				className={cn(
					'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg [&_svg]:size-4',
					isChecked && 'chip-3d [--chip:hsl(var(--primary))]',
					!isChecked && 'keycap-3d text-muted-foreground'
				)}
			>
				{icon}
			</span>
			<span className="flex min-w-0 flex-1 flex-col gap-0.5">
				<span className="text-[13px] font-medium text-foreground">{title}</span>
				<span className="text-xs text-pretty text-muted-foreground">{description}</span>
			</span>
			<kbd className="keycap-3d mt-0.5 hidden h-5 min-w-5 items-center justify-center rounded-[5px] px-1 font-sans text-[11px] font-medium text-muted-foreground sm:inline-flex">
				{keyLabel}
			</kbd>
		</label>
	);
}

const MODE_BY_KEY: Record<string, TStartMode> = {
	'1': 'solo',
	'2': 'team'
};

function isTypingTarget(target: EventTarget | null) {
	if (!(target instanceof HTMLElement)) {
		return false;
	}
	const isTextInput = target instanceof HTMLInputElement && target.type !== 'radio';
	return isTextInput || target.isContentEditable;
}

/**
 * Gauzy allows several accounts on one address and answers a sign-up the same way whether the address is known or
 * not (no account enumeration), so the form cannot refuse an address that already has an account. The person is
 * reminded instead, before and after submitting, that signing in keeps their existing workspace.
 */
function ExistingAccountHint() {
	const t = useTranslations();

	return (
		<>
			{t('pages.auth.EXISTING_ACCOUNT_HINT')}{' '}
			<Link href={DEFAULT_APP_PATH} className={AUTH_TEXT_LINK}>
				{t('pages.auth.SIGN_IN_INSTEAD')}
			</Link>
		</>
	);
}

/**
 * Step 2: on my own (a team named after the person) or with a team named now. Keys 1 and 2 pick, the team field
 * opens under its choice.
 */
function ChooseModeForm({
	form,
	errors,
	handleOnChange,
	onPreviousStep,
	loading,
	startMode,
	onStartModeChange
}: IStepProps & {
	errors: Record<string, string>;
	onPreviousStep?: () => void;
	loading?: boolean;
	startMode: TStartMode;
	onStartModeChange: (mode: TStartMode) => void;
}) {
	const t = useTranslations();
	const isTeamMode = startMode === 'team';
	const teamFieldRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		const pickWithKey = (event: KeyboardEvent) => {
			const mode = MODE_BY_KEY[event.key];
			const hasModifier = event.metaKey || event.ctrlKey || event.altKey;
			if (!mode || hasModifier) {
				return;
			}
			if (isTypingTarget(event.target)) {
				return;
			}
			event.preventDefault();
			onStartModeChange(mode);
		};
		window.addEventListener('keydown', pickWithKey);
		return () => window.removeEventListener('keydown', pickWithKey);
	}, [onStartModeChange]);

	const chooseMode = (mode: TStartMode) => {
		onStartModeChange(mode);
		if (mode === 'team') {
			requestAnimationFrame(() => teamFieldRef.current?.focus());
		}
	};

	return (
		<div className="flex flex-col">
			<AuthHeading
				mark={
					<AuthMark>
						<Users />
					</AuthMark>
				}
				title={t('auth.signUp.MODE_TITLE')}
				description={t('auth.signUp.MODE_DESCRIPTION')}
				className="mb-7"
			/>
			<fieldset className="flex flex-col gap-2">
				<legend className="sr-only">{t('auth.signUp.MODE_TITLE')}</legend>
				<StartModeOption
					mode="solo"
					keyLabel="1"
					icon={<User />}
					title={t('auth.signUp.SOLO')}
					description={t('auth.signUp.SOLO_TEXT')}
					isChecked={startMode === 'solo'}
					onChoose={chooseMode}
				/>
				<StartModeOption
					mode="team"
					keyLabel="2"
					icon={<Users />}
					title={t('auth.signUp.TEAM')}
					description={t('auth.signUp.TEAM_TEXT')}
					isChecked={isTeamMode}
					onChoose={chooseMode}
				/>
			</fieldset>

			<AuthReveal isOpen={isTeamMode}>
				<AuthField
					ref={teamFieldRef}
					id="signup-team"
					name="team"
					label={t('auth.field.TEAM_LABEL')}
					placeholder={t('auth.field.TEAM_PLACEHOLDER')}
					icon={<Users />}
					value={form.team}
					error={errors?.team}
					onChange={handleOnChange}
					autoComplete="organization"
					required
				/>
			</AuthReveal>

			<div className="mt-7 flex items-center justify-between gap-3">
				<button type="button" onClick={onPreviousStep} className={AUTH_QUIET_LINK}>
					<ArrowLeft aria-hidden="true" />
					{t('common.BACK')}
				</button>
				<Button type="submit" disabled={loading} className="min-w-36 max-sm:h-11">
					{t('auth.signUp.GET_STARTED')}
				</Button>
			</div>
		</div>
	);
}

/**
 * Ever ID sign-up: the e-mail address above (and the name, when the Ever ID has one) is the verified one of the
 * Ever ID (read-only), and nothing is created until the person ticks the confirmation (and accepts the documents,
 * if any) and submits. The documents are listed outside the label, so opening one never ticks the box.
 */
function EverIdSignupConfirmation({ everId, error }: Readonly<{ everId: NonNullable<TEverIdSignup>; error?: string }>) {
	const t = useTranslations();
	const { prefill } = everId;
	const message = error || everId.error;
	const hasTerms = Boolean(prefill && prefill.terms.length > 0);

	return (
		<div className="flex flex-col gap-3 rounded-xl bg-foreground/[0.03] p-3.5 text-[13px]">
			{prefill?.checkoutUrl && (
				<p className="text-muted-foreground">
					{t('pages.auth.everId.SIGNUP_CHECKOUT')}{' '}
					<a href={prefill.checkoutUrl} className={AUTH_TEXT_LINK}>
						{t('pages.auth.everId.CONTINUE_TO_CHECKOUT')}
					</a>
				</p>
			)}
			<p className={AUTH_HINT}>{t('pages.auth.everId.SIGNUP_HINT')}</p>
			<div className="flex items-start gap-2.5">
				<Checkbox
					id="ever-id-signup-confirm"
					checked={everId.confirmed}
					disabled={!prefill}
					onCheckedChange={(checked) => everId.setConfirmed(checked === true)}
					className="mt-px"
				/>
				<label htmlFor="ever-id-signup-confirm" className="cursor-pointer text-foreground">
					{t('pages.auth.everId.SIGNUP_CONFIRM')}
				</label>
			</div>
			{hasTerms && prefill && (
				<div className="flex flex-col gap-1.5">
					<div className="flex items-start gap-2.5">
						<Checkbox
							id="ever-id-signup-terms"
							checked={everId.termsAccepted}
							onCheckedChange={(checked) => everId.setTermsAccepted(checked === true)}
							className="mt-px"
						/>
						<label htmlFor="ever-id-signup-terms" className="cursor-pointer text-foreground">
							{t('pages.auth.everId.SIGNUP_TERMS')}
						</label>
					</div>
					<ul className="flex flex-col gap-1 pl-7">
						{prefill.terms.map((document) => (
							<li key={`${document.documentId}:${document.version}`} className="text-xs">
								{document.url && (
									<a href={document.url} target="_blank" rel="noreferrer" className={AUTH_TEXT_LINK}>
										{document.title || document.documentId}
									</a>
								)}
								{!document.url && (
									<span className="text-muted-foreground">
										{document.title || document.documentId}
									</span>
								)}
							</li>
						))}
					</ul>
				</div>
			)}
			{message && <AuthNotice tone="error" title={message} />}
		</div>
	);
}

function ReCAPTCHA({ handleOnChange, errors }: { handleOnChange: any; errors: any }) {
	const t = useTranslations();
	const [feedback, setFeedback] = useState<string>('');
	const message = errors['recaptcha'] || feedback;

	if (!RECAPTCHA_SITE_KEY.value) {
		return null;
	}

	return (
		<div className="flex w-full flex-col gap-2">
			<div className="origin-[0] dark:invert-[0.88] dark:hue-rotate-180">
				<SiteReCAPTCHA
					siteKey={RECAPTCHA_SITE_KEY.value}
					onChange={(res) => {
						handleOnChange({ target: { name: 'recaptcha', value: res } });
						setFeedback('');
					}}
					onErrored={() => setFeedback(t('errors.NETWORK_ISSUE'))}
				/>
			</div>
			{message && <AuthNotice tone="error" title={message} />}
		</div>
	);
}

export default AuthSignup;
