'use client';

import { useRef, useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import type { TAuthenticationPasscode } from '@/core/hooks/auth/use-authentication-passcode';
import { AUTH_CODE_LENGTH } from '@/core/constants/config/constants';
import { Button } from '@/core/components/common/button';
import { ArrowLeft, ShieldCheck } from '@/core/components/icons';
import SocialLogins from '@/core/components/auth/social-logins-buttons';
import { AuthHeading, AuthMark } from '@/core/components/auth/kit/auth-heading';
import { AuthCodeField, type AuthCodeStatus } from '@/core/components/auth/kit/auth-code-field';
import { ResendCode } from '@/core/components/auth/kit/resend-code';
import { AUTH_QUIET_LINK } from '@/core/components/auth/kit/auth-recipes';
import { cn } from '@/core/lib/helpers';

function renderAddress(chunks: ReactNode) {
	return <span className="font-medium break-all text-foreground">{chunks}</span>;
}

/** The code an e-mailed link carries (`?code=`): it fills the slots and signs in by itself. */
function codeFromAddressBar() {
	if (typeof window === 'undefined') {
		return '';
	}
	const query = new URLSearchParams(window.location.search);
	return query.get('code') ?? '';
}

function codeErrorOf(form: TAuthenticationPasscode) {
	if (form.status !== 'error') {
		return null;
	}
	const codeError = form.errors['code'] as string | undefined;
	const emailError = form.errors['email'] as string | undefined;
	return codeError || emailError || null;
}

export function CodeStep({ form }: Readonly<{ form: TAuthenticationPasscode }>) {
	const t = useTranslations();
	const inputsRef = useRef<Array<HTMLInputElement>>([]);
	const formRef = useRef<HTMLFormElement>(null);
	const [codeFromLink] = useState(codeFromAddressBar);
	const email = form.formValues.email.trim();
	const isEverIdStep = Boolean(form.everIdConfirm);
	const isSubmitting = form.signInEmailConfirmLoading || form.everIdConfirmLoading;
	const codeError = codeErrorOf(form);

	const clearCode = () => {
		form.inputCodeRef.current?.clear();
	};

	const autoSubmitForm = () => {
		const submitEvent = new Event('submit', { cancelable: true, bubbles: true });
		formRef.current?.dispatchEvent(submitEvent);
	};

	const goBack = () => {
		// Leaving the Ever ID step drops its marker from the URL and empties the code
		form.leaveEverIdStep();
		form.authScreen.setScreen('email');
		form.setErrors({});
	};

	const resend = () => {
		const sending = form.sendAuthCodeHandler();
		sending?.catch(() => undefined);
	};

	let description: ReactNode = t.rich('auth.code.DESCRIPTION', {
		length: AUTH_CODE_LENGTH,
		email,
		address: renderAddress
	});
	if (isEverIdStep) {
		description = t('pages.auth.everId.CONFIRM_HINT');
	}

	const clearButton = (
		<button type="button" onClick={clearCode} className={cn(AUTH_QUIET_LINK, 'text-xs')}>
			{t('auth.code.CLEAR')}
		</button>
	);

	return (
		<div className="flex flex-col">
			<button type="button" onClick={goBack} className={cn(AUTH_QUIET_LINK, 'self-start')}>
				<ArrowLeft aria-hidden="true" />
				{t('auth.code.CHANGE_EMAIL')}
			</button>
			<AuthHeading
				mark={
					<AuthMark>
						<ShieldCheck />
					</AuthMark>
				}
				title={t('auth.code.TITLE')}
				description={description}
				className="mt-6 mb-7"
			/>
			<form
				ref={formRef}
				className="flex flex-col gap-5"
				onSubmit={form.handleCodeSubmit}
				autoComplete="off"
				noValidate
			>
				<AuthCodeField
					id="passcode-code"
					label={t('auth.code.LABEL')}
					labelAside={clearButton}
					status={form.status as AuthCodeStatus}
					error={codeError}
					codeRef={form.inputCodeRef}
					inputReference={inputsRef}
					defaultValue={form.formValues.code}
					autoComplete={codeFromLink}
					submitCode={autoSubmitForm}
					onChange={(code) => {
						form.setFormValues((values) => ({ ...values, code }));
					}}
				/>

				{!isEverIdStep && <ResendCode startLocked sending={form.signInEmailLoading} onResend={resend} />}

				<Button type="submit" loading={isSubmitting} disabled={isSubmitting} className="w-full max-sm:h-11">
					{t('auth.code.SUBMIT')}
				</Button>
			</form>
			<SocialLogins />
		</div>
	);
}
