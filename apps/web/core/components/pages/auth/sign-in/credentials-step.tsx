'use client';

import { useCallback, useEffect, useRef, type ChangeEvent, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import type { TAuthenticationPasscode } from '@/core/hooks/auth/use-authentication-passcode';
import type { TAuthenticationPassword } from '@/core/hooks/auth/use-authentication-password';
import { APP_NAME, IS_DEMO_MODE } from '@/core/constants/config/constants';
import { Button } from '@/core/components/common/button';
import { Lock, Mail } from '@/core/components/icons';
import SocialLogins from '@/core/components/auth/social-logins-buttons';
import { DemoAccountsSection } from '@/core/components/auth/demo-accounts-section';
import { DemoCredentialsDropdown } from '@/core/components/auth/demo-credentials-dropdown';
import { AuthHeading, AuthMark } from '@/core/components/auth/kit/auth-heading';
import { AuthField, PasswordField } from '@/core/components/auth/kit/auth-field';
import { AuthMethodSwitch, type AuthMethod } from '@/core/components/auth/kit/auth-method-switch';
import { AuthNotice } from '@/core/components/auth/kit/auth-notice';
import { AUTH_TEXT_LINK } from '@/core/components/auth/kit/auth-recipes';
import { AuthReveal, AuthSwap } from '@/core/components/auth/kit/auth-reveal';
import { logErrorInDev } from '@/core/lib/helpers/error-message';
import { cn } from '@/core/lib/helpers';

const FORM_ID = 'sign-in-credentials';

function emailOf(isCode: boolean, code: TAuthenticationPasscode, password: TAuthenticationPassword) {
	if (isCode) {
		return code.formValues.email;
	}
	return password.formValues.email;
}

function emailErrorOf(isCode: boolean, code: TAuthenticationPasscode, password: TAuthenticationPassword) {
	if (isCode) {
		return code.errors?.email as string | undefined;
	}
	return password.errors?.email as string | undefined;
}

function isLoadingFor(isCode: boolean, code: TAuthenticationPasscode, password: TAuthenticationPassword) {
	if (isCode) {
		return code.signInEmailLoading;
	}
	return password.signInLoading;
}

/**
 * The first step of sign in, for both methods. Choosing the other method changes the form in place: the mark and the
 * sentence fade into the other ones, the password row opens or closes, the button says its new action. The address
 * typed is kept, the same in both methods.
 */
export function CredentialsStep({
	method,
	onMethodChange,
	code,
	password
}: Readonly<{
	method: AuthMethod;
	onMethodChange: (method: AuthMethod) => void;
	code: TAuthenticationPasscode;
	password: TAuthenticationPassword;
}>) {
	const t = useTranslations();
	const passwordInputRef = useRef<HTMLInputElement>(null);
	const isCode = method === 'code';
	const isPassword = !isCode;
	const email = emailOf(isCode, code, password);
	const emailError = emailErrorOf(isCode, code, password);
	const isLoading = isLoadingFor(isCode, code, password);
	const loginFailure = (password.errors?.loginFailed as string | undefined) || null;
	const showsDemo = IS_DEMO_MODE && isPassword;

	const changeEmail = (event: ChangeEvent<HTMLInputElement>) => {
		code.handleChange(event);
		password.handleChange(event);
	};

	const switchMethod = (next: AuthMethod) => {
		if (next === method) {
			return;
		}
		code.setErrors({});
		password.setErrors({});
		onMethodChange(next);
	};

	// Choosing the password with the address already typed puts the cursor where the person types next
	const previousMethod = useRef(method);
	useEffect(() => {
		const switchedToPassword = previousMethod.current === 'code' && method === 'password';
		previousMethod.current = method;
		if (!switchedToPassword) {
			return;
		}
		const hasEmail = Boolean(password.formValues.email.trim());
		if (hasEmail) {
			passwordInputRef.current?.focus({ preventScroll: true });
		}
	}, [method, password.formValues.email]);

	const sendCode = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const sending = code.sendAuthCodeHandler();
		if (!sending) {
			return;
		}
		// The hook shows the reason of a refused send; only a code that went out opens the next screen.
		sending.then(
			() => code.authScreen.setScreen('passcode'),
			() => undefined
		);
	};

	const submit = (event: FormEvent<HTMLFormElement>) => {
		if (isCode) {
			sendCode(event);
			return;
		}
		password.handleSubmit(event);
	};

	/**
	 * Demo accounts: fill the form, then submit it once the values reached the DOM (an immediate submit failed the
	 * browser's "Please fill out this field" check on the first click).
	 */
	const loginWithDemo = useCallback(
		(demoEmail: string, demoPassword: string) => {
			password.setErrors({});
			password.setFormValues({ email: demoEmail, password: demoPassword });
			onMethodChange('password');
			setTimeout(() => {
				const formElement = document.getElementById(FORM_ID);
				if (!formElement) {
					logErrorInDev('Demo Auto-Login', 'Form element not found - cannot submit login form');
					return;
				}
				const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
				formElement.dispatchEvent(submitEvent);
			}, 200);
		},
		[password, onMethodChange]
	);

	const fillDemoCredentials = useCallback(
		(demoEmail: string, demoPassword: string) => {
			password.setErrors({});
			password.setFormValues({ email: demoEmail, password: demoPassword });
		},
		[password]
	);

	const forgotLink = (
		<Link href="/auth/forgot-password" className={cn(AUTH_TEXT_LINK, 'text-xs')}>
			{t('auth.signIn.FORGOT_PASSWORD')}
		</Link>
	);

	const mark = (
		<AuthMark>
			<AuthSwap kind="icon" showsFirst={isCode} first={<Mail />} second={<Lock />} />
		</AuthMark>
	);

	const description = (
		<AuthSwap
			kind="text"
			showsFirst={isCode}
			first={t('auth.signIn.CODE_DESCRIPTION')}
			second={t('auth.signIn.PASSWORD_DESCRIPTION')}
		/>
	);

	const form = (
		<div className="flex min-w-0 flex-1 flex-col">
			<AuthMethodSwitch method={method} onMethodChange={switchMethod} />
			<AuthHeading
				mark={mark}
				title={t('auth.signIn.TITLE', { appName: APP_NAME })}
				description={description}
				className="mt-8 mb-7"
			/>
			<form id={FORM_ID} className="flex flex-col" autoComplete="on" onSubmit={submit} noValidate={!showsDemo}>
				<AuthField
					id="passcode-email"
					type="email"
					name="email"
					label={t('auth.field.EMAIL_LABEL')}
					placeholder={t('auth.field.EMAIL_PLACEHOLDER')}
					icon={<Mail />}
					value={email}
					onChange={changeEmail}
					error={emailError}
					autoComplete="email"
					inputMode="email"
					required
				/>
				<AuthReveal isOpen={isPassword}>
					{showsDemo && (
						<DemoCredentialsDropdown onCredentialSelect={fillDemoCredentials} className="w-full" />
					)}
					<PasswordField
						ref={passwordInputRef}
						id="pw-password"
						name="password"
						label={t('auth.field.PASSWORD_LABEL')}
						labelAside={forgotLink}
						placeholder={t('auth.field.PASSWORD_PLACEHOLDER')}
						icon={<Lock />}
						value={password.formValues.password}
						error={password.errors?.password as string | undefined}
						onChange={password.handleChange}
						autoComplete="current-password"
						required={showsDemo}
					/>
					{loginFailure && <AuthNotice tone="error" title={loginFailure} />}
				</AuthReveal>
				<Button type="submit" loading={isLoading} disabled={isLoading} className="mt-5 w-full max-sm:h-11">
					<AuthSwap
						kind="text"
						showsFirst={isCode}
						first={t('auth.signIn.SEND_CODE')}
						second={t('auth.signIn.SUBMIT_PASSWORD')}
					/>
				</Button>
			</form>
			{!IS_DEMO_MODE && <SocialLogins />}
		</div>
	);

	if (!IS_DEMO_MODE) {
		return form;
	}

	return (
		<div className="flex flex-col gap-8 md:flex-row md:items-start">
			{form}
			<DemoAccountsSection onDemoLogin={loginWithDemo} className="md:mt-[3.75rem] md:w-60 md:shrink-0" />
		</div>
	);
}
