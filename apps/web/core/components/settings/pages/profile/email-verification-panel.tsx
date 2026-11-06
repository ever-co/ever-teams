'use client';

import { FormEvent, useRef, useState } from 'react';
import { type DottedLanguageObjectStringPaths, useTranslations } from 'next-intl';
import { AuthCodeInputField, type AuthCodeRef } from '@/core/components/auth/auth-code-input';
import { AUTH_CODE_SLOT_CLASS } from '@/core/components/auth/auth-code-recipe';
import { Button } from '@/core/components/duplicated-components/_button';
import { Spinner } from '@/core/components/icons';
import { AUTH_CODE_LENGTH } from '@/core/constants/config/constants';
import { cn } from '@/core/lib/helpers';
import { errorReasonKeyOf } from '@/core/lib/utils/error-feedback';

type EmailVerificationPanelProps = {
	email: string;
	onSendCode: () => Promise<void>;
	isSendingCode: boolean;
	onVerify: (code: string) => Promise<void>;
	isVerifying: boolean;
	onVerified: (message: string) => void;
};

export function EmailVerificationPanel({
	email,
	onSendCode,
	isSendingCode,
	onVerify,
	isVerifying,
	onVerified
}: Readonly<EmailVerificationPanelProps>) {
	const t = useTranslations();
	const codeFieldRef = useRef<AuthCodeRef>(null);
	const [code, setCode] = useState('');
	const [error, setError] = useState<string | null>(null);
	const [status, setStatus] = useState('');
	const isCodeComplete = code.length >= AUTH_CODE_LENGTH;
	const canVerify = isCodeComplete && !isVerifying;

	const reasonOf = (failure: unknown) => {
		const reasonKey = errorReasonKeyOf(failure) as DottedLanguageObjectStringPaths;
		return t(reasonKey);
	};

	const verify = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!canVerify) {
			return;
		}
		setError(null);
		try {
			await onVerify(code);
			const message = t('settings.profile.VERIFY_DONE');
			onVerified(message);
		} catch (failure) {
			const reason = reasonOf(failure);
			const message = t('settings.profile.VERIFY_FAILED', { reason });
			setError(message);
		}
	};

	const sendCode = async () => {
		if (isSendingCode) {
			return;
		}
		setError(null);
		setStatus('');
		try {
			await onSendCode();
			codeFieldRef.current?.clear();
			const message = t('settings.profile.VERIFY_SENT', { email });
			setStatus(message);
		} catch (failure) {
			const reason = reasonOf(failure);
			const message = t('settings.profile.VERIFY_SEND_FAILED', { reason });
			setError(message);
		}
	};

	return (
		<div className="mx-4 mb-4 flex flex-col gap-3 rounded-lg bg-warning/[0.06] px-3.5 py-3">
			<div className="flex flex-col gap-0.5">
				<p className="text-[13px] font-medium text-foreground">{t('notifications.NOTICES.VERIFY_TITLE')}</p>
				<p className="text-xs text-pretty text-muted-foreground">
					{t('settings.profile.VERIFY_TEXT', { email })}
				</p>
			</div>
			<form onSubmit={verify} className="flex flex-col gap-2 sm:flex-row sm:items-center">
				<div className="w-full min-w-0 sm:w-80">
					<AuthCodeInputField
						ref={codeFieldRef}
						autoFocus={false}
						allowedCharacters="alphanumeric"
						length={AUTH_CODE_LENGTH}
						ariaLabel={t('settings.profile.EMAIL_CODE')}
						containerClassName="flex w-full justify-between gap-1.5"
						inputClassName={cn(AUTH_CODE_SLOT_CLASS, 'bg-card')}
						onChange={(value) => {
							setCode(value);
							setError(null);
						}}
					/>
				</div>
				<Button type="submit" variant="outline" disabled={!canVerify} className="self-end sm:self-auto">
					{isVerifying && <Spinner className="size-3.5 animate-spin" />}
					{t('settings.profile.VERIFY_ACTION')}
				</Button>
			</form>
			<div className="flex flex-wrap items-center gap-x-3 gap-y-1">
				<button
					type="button"
					onClick={sendCode}
					disabled={isSendingCode}
					className="cursor-pointer rounded-sm text-xs font-medium text-muted-foreground underline decoration-foreground/25 underline-offset-2 outline-none transition-colors hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-progress disabled:opacity-60"
				>
					{t('notifications.NOTICES.VERIFY_RESEND')}
				</button>
				{error && (
					<p role="alert" className="text-xs text-pretty text-destructive-ink">
						{error}
					</p>
				)}
				{!error && (
					<p aria-live="polite" className="text-xs text-muted-foreground">
						{status}
					</p>
				)}
			</div>
		</div>
	);
}
