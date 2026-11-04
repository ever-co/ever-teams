'use client';

import { FormEvent, KeyboardEvent, useId, useRef, useState } from 'react';
import { type DottedLanguageObjectStringPaths, useTranslations } from 'next-intl';
import { AuthCodeInputField, type AuthCodeRef } from '@/core/components/auth/auth-code-input';
import { AUTH_CODE_SLOT_CLASS } from '@/core/components/auth/auth-code-recipe';
import { Input } from '@/core/components/common/input';
import { Button } from '@/core/components/duplicated-components/_button';
import { Spinner } from '@/core/components/icons';
import {
	SETTINGS_ROW,
	SETTINGS_ROW_DESCRIPTION,
	SETTINGS_ROW_LABEL
} from '@/core/components/settings/kit/settings-page';
import { AUTH_CODE_LENGTH } from '@/core/constants/config/constants';
import { useAccountEmail } from '@/core/hooks/settings/use-account-email';
import { cn } from '@/core/lib/helpers';
import { errorReasonKeyOf } from '@/core/lib/utils/error-feedback';
import { emailChangeProblemOf, EmailChangeProblem } from '@/core/lib/utils/settings-profile';
import { EmailVerificationPanel } from './email-verification-panel';

type EmailStep = 'read' | 'address' | 'code';

const CODE_CONTAINER_CLASS = 'flex w-full justify-between gap-1.5';

const CHIP_BASE = 'inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium';

function describedByOf(error: string | null, errorId: string) {
	if (!error) {
		return undefined;
	}
	return errorId;
}

function problemKeyOf(problem: EmailChangeProblem) {
	if (problem === 'same') {
		return 'settings.profile.EMAIL_SAME';
	}
	return 'settings.profile.EMAIL_INVALID';
}

function VerificationChip({ isVerified }: Readonly<{ isVerified: boolean | undefined }>) {
	const t = useTranslations();
	if (isVerified === true) {
		return (
			<span className={cn(CHIP_BASE, 'bg-success/10 text-success-foreground')}>
				{t('settings.profile.EMAIL_VERIFIED')}
			</span>
		);
	}
	if (isVerified === false) {
		return (
			<span className={cn(CHIP_BASE, 'bg-warning/10 text-warning-foreground')}>
				{t('settings.profile.EMAIL_NOT_VERIFIED')}
			</span>
		);
	}
	return null;
}

export function EmailRow() {
	const t = useTranslations();
	const fieldId = useId();
	const errorId = `${fieldId}-error`;
	const {
		user,
		sendChangeCode,
		isSendingChangeCode,
		confirmChange,
		isConfirmingChange,
		sendVerificationCode,
		isSendingVerificationCode,
		confirmVerification,
		isConfirmingVerification
	} = useAccountEmail();
	const [step, setStep] = useState<EmailStep>('read');
	const [draft, setDraft] = useState('');
	const [requestedEmail, setRequestedEmail] = useState('');
	const [code, setCode] = useState('');
	const [error, setError] = useState<string | null>(null);
	const [status, setStatus] = useState('');
	const codeFieldRef = useRef<AuthCodeRef>(null);
	const currentEmail = user?.email ?? '';
	const isVerified = user?.isEmailVerified;
	const showsVerificationPanel = step === 'read' && isVerified === false;
	const isCodeComplete = code.length >= AUTH_CODE_LENGTH;
	const label = t('settings.profile.EMAIL');

	const reasonOf = (failure: unknown) => {
		const reasonKey = errorReasonKeyOf(failure) as DottedLanguageObjectStringPaths;
		return t(reasonKey);
	};

	const reset = () => {
		setStep('read');
		setDraft('');
		setCode('');
		setError(null);
	};

	const startChange = () => {
		setDraft('');
		setError(null);
		setStatus('');
		setStep('address');
	};

	const requestCode = async (email: string) => {
		setError(null);
		try {
			await sendChangeCode(email);
			setRequestedEmail(email);
			setCode('');
			setStep('code');
			return true;
		} catch (failure) {
			const reason = reasonOf(failure);
			const message = t('settings.profile.EMAIL_SEND_FAILED', { reason });
			setError(message);
			return false;
		}
	};

	const submitAddress = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (isSendingChangeCode) {
			return;
		}
		const email = draft.trim();
		const problem = emailChangeProblemOf(email, currentEmail);
		if (problem) {
			const message = t(problemKeyOf(problem));
			setError(message);
			return;
		}
		await requestCode(email);
	};

	const resendCode = async () => {
		if (isSendingChangeCode) {
			return;
		}
		const isSent = await requestCode(requestedEmail);
		if (isSent) {
			codeFieldRef.current?.clear();
			const message = t('settings.profile.EMAIL_CODE_RESENT', { email: requestedEmail });
			setStatus(message);
		}
	};

	const submitCode = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!isCodeComplete) {
			return;
		}
		if (isConfirmingChange) {
			return;
		}
		setError(null);
		try {
			await confirmChange(code);
			const message = t('settings.profile.EMAIL_CHANGED', { email: requestedEmail });
			reset();
			setStatus(message);
		} catch (failure) {
			const reason = reasonOf(failure);
			const message = t('settings.profile.EMAIL_CONFIRM_FAILED', { reason });
			setError(message);
		}
	};

	const cancelOnEscape = (event: KeyboardEvent<HTMLFormElement>) => {
		if (event.key !== 'Escape') {
			return;
		}
		event.stopPropagation();
		reset();
	};

	const errorLine = error && (
		<p id={errorId} role="alert" className="text-xs text-pretty text-destructive-ink">
			{error}
		</p>
	);

	if (step === 'address') {
		return (
			<form className={cn(SETTINGS_ROW, 'sm:items-start')} onSubmit={submitAddress} onKeyDown={cancelOnEscape}>
				<div className="flex min-w-0 flex-1 flex-col gap-0.5 sm:pt-2">
					<label htmlFor={fieldId} className={SETTINGS_ROW_LABEL}>
						{t('settings.profile.EMAIL_NEW')}
					</label>
					<span className={SETTINGS_ROW_DESCRIPTION}>
						{t('settings.profile.EMAIL_CURRENT', { email: currentEmail })}
					</span>
				</div>
				<div className="flex w-full min-w-0 flex-col gap-1.5 sm:w-72">
					<Input
						id={fieldId}
						type="email"
						value={draft}
						autoFocus
						autoComplete="email"
						aria-invalid={Boolean(error) || undefined}
						aria-describedby={describedByOf(error, errorId)}
						onChange={(event) => {
							setDraft(event.target.value);
							setError(null);
						}}
						className="h-8"
					/>
					{errorLine}
					<div className="flex justify-end gap-2">
						<Button type="button" variant="ghost" size="sm" onClick={reset} disabled={isSendingChangeCode}>
							{t('common.CANCEL')}
						</Button>
						<Button type="submit" size="sm" disabled={isSendingChangeCode}>
							{isSendingChangeCode && <Spinner className="size-3.5 animate-spin" />}
							{t('common.CONTINUE')}
						</Button>
					</div>
				</div>
			</form>
		);
	}

	if (step === 'code') {
		return (
			<form className={cn(SETTINGS_ROW, 'sm:items-start')} onSubmit={submitCode} onKeyDown={cancelOnEscape}>
				<div className="flex min-w-0 flex-1 flex-col gap-0.5 sm:pt-2">
					<span className={SETTINGS_ROW_LABEL}>{label}</span>
					<span className={SETTINGS_ROW_DESCRIPTION}>
						{t('settings.profile.EMAIL_CODE_SENT', { email: requestedEmail })}
					</span>
				</div>
				<div className="flex w-full min-w-0 flex-col gap-2 sm:w-80">
					<AuthCodeInputField
						ref={codeFieldRef}
						allowedCharacters="alphanumeric"
						length={AUTH_CODE_LENGTH}
						ariaLabel={t('settings.profile.EMAIL_CODE')}
						containerClassName={CODE_CONTAINER_CLASS}
						inputClassName={AUTH_CODE_SLOT_CLASS}
						onChange={(value) => {
							setCode(value);
							setError(null);
						}}
					/>
					{errorLine}
					<div className="flex flex-wrap items-center justify-between gap-2">
						<button
							type="button"
							onClick={resendCode}
							disabled={isSendingChangeCode}
							className="cursor-pointer rounded-sm text-xs font-medium text-muted-foreground underline decoration-foreground/25 underline-offset-2 outline-none transition-colors hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-progress disabled:opacity-60"
						>
							{t('notifications.NOTICES.VERIFY_RESEND')}
						</button>
						<div className="flex gap-2">
							<Button
								type="button"
								variant="ghost"
								size="sm"
								onClick={reset}
								disabled={isConfirmingChange}
							>
								{t('common.CANCEL')}
							</Button>
							<Button type="submit" size="sm" disabled={!isCodeComplete || isConfirmingChange}>
								{isConfirmingChange && <Spinner className="size-3.5 animate-spin" />}
								{t('common.CONFIRM')}
							</Button>
						</div>
					</div>
					<p aria-live="polite" className="min-h-4 text-xs text-muted-foreground">
						{status}
					</p>
				</div>
			</form>
		);
	}

	return (
		<div>
			<div className={SETTINGS_ROW}>
				<div className="flex min-w-0 flex-1 flex-col gap-0.5">
					<span className={SETTINGS_ROW_LABEL}>{label}</span>
					<span className={SETTINGS_ROW_DESCRIPTION}>{t('settings.profile.EMAIL_DESCRIPTION')}</span>
				</div>
				<div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 sm:justify-end">
					<span className="min-w-0 truncate text-[13px] text-foreground">{currentEmail}</span>
					<VerificationChip isVerified={isVerified} />
					<Button
						type="button"
						variant="ghost"
						size="sm"
						onClick={startChange}
						aria-label={t('settings.profile.EMAIL_CHANGE_LABEL')}
					>
						{t('settings.profile.EMAIL_CHANGE')}
					</Button>
				</div>
			</div>
			{showsVerificationPanel && (
				<EmailVerificationPanel
					email={currentEmail}
					onSendCode={sendVerificationCode}
					isSendingCode={isSendingVerificationCode}
					onVerify={confirmVerification}
					isVerifying={isConfirmingVerification}
					onVerified={setStatus}
				/>
			)}
			<p aria-live="polite" className="sr-only">
				{status}
			</p>
		</div>
	);
}
