'use client';

import { FormEvent, KeyboardEvent, useId, useState } from 'react';
import NextLink from 'next/link';
import { type DottedLanguageObjectStringPaths, useTranslations } from 'next-intl';
import { Input } from '@/core/components/common/input';
import { Button } from '@/core/components/duplicated-components/_button';
import { Spinner } from '@/core/components/icons';
import { minLengthRuleOf, PasswordChecks } from '@/core/components/auth/kit/password-checks';
import {
	SETTINGS_ROW,
	SETTINGS_ROW_DESCRIPTION,
	SETTINGS_ROW_LABEL
} from '@/core/components/settings/kit/settings-page';
import { useAccountPassword } from '@/core/hooks/settings/use-account-password';
import { cn } from '@/core/lib/helpers';
import { errorReasonKeyOf } from '@/core/lib/utils/error-feedback';
import { newPasswordProblemOf, type NewPasswordProblem } from '@/core/lib/utils/password-strength';

const FORGOT_PASSWORD_PATH = '/auth/forgot-password';

const TEXT_LINK =
	'rounded-sm font-medium text-foreground underline decoration-foreground/25 underline-offset-2 outline-none transition-colors hover:decoration-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50';

function describedByOf(error: string | null, errorId: string) {
	if (!error) {
		return undefined;
	}
	return errorId;
}

/**
 * Gauzy keeps one account, with its own password, per workspace of an address: this row sets the password of the
 * signed-in workspace's account only, and the others are reached through "Forgot password", which mails one link each.
 */
export function PasswordRow() {
	const t = useTranslations();
	const fieldId = useId();
	const passwordId = `${fieldId}-password`;
	const confirmationId = `${fieldId}-confirmation`;
	const errorId = `${fieldId}-error`;
	const { savePassword, isSavingPassword } = useAccountPassword();
	const [isEditing, setIsEditing] = useState(false);
	const [password, setPassword] = useState('');
	const [confirmation, setConfirmation] = useState('');
	const [error, setError] = useState<string | null>(null);
	const [status, setStatus] = useState('');
	const label = t('settings.profile.PASSWORD');

	const problemMessageOf = (problem: NewPasswordProblem) => {
		if (problem === 'tooShort') {
			return minLengthRuleOf(t);
		}
		return t('errors.PASSWORDS_DO_NOT_MATCH');
	};

	const reset = () => {
		setIsEditing(false);
		setPassword('');
		setConfirmation('');
		setError(null);
	};

	const startEditing = () => {
		setStatus('');
		setError(null);
		setIsEditing(true);
	};

	const save = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (isSavingPassword) {
			return;
		}
		const problem = newPasswordProblemOf(password, confirmation);
		if (problem) {
			const message = problemMessageOf(problem);
			setError(message);
			return;
		}
		setError(null);
		try {
			await savePassword(password);
			reset();
			const message = t('settings.profile.PASSWORD_SAVED');
			setStatus(message);
		} catch (failure) {
			const reasonKey = errorReasonKeyOf(failure) as DottedLanguageObjectStringPaths;
			const reason = t(reasonKey);
			const message = t('settings.profile.PASSWORD_SAVE_FAILED', { reason });
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

	const scopeLine = (
		<span className={SETTINGS_ROW_DESCRIPTION}>
			{t('settings.profile.PASSWORD_DESCRIPTION')}{' '}
			<NextLink href={FORGOT_PASSWORD_PATH} className={TEXT_LINK}>
				{t('settings.profile.PASSWORD_OTHER_WORKSPACES')}
			</NextLink>
		</span>
	);

	if (isEditing) {
		return (
			<form className={cn(SETTINGS_ROW, 'sm:items-start')} onSubmit={save} onKeyDown={cancelOnEscape}>
				<div className="flex min-w-0 flex-1 flex-col gap-0.5 sm:pt-2">
					<label htmlFor={passwordId} className={SETTINGS_ROW_LABEL}>
						{t('settings.profile.PASSWORD_NEW')}
					</label>
					{scopeLine}
				</div>
				<div className="flex w-full min-w-0 flex-col gap-2 sm:w-72">
					<Input
						id={passwordId}
						type="password"
						value={password}
						autoFocus
						autoComplete="new-password"
						aria-invalid={Boolean(error) || undefined}
						aria-describedby={describedByOf(error, errorId)}
						onChange={(event) => {
							setPassword(event.target.value);
							setError(null);
						}}
						className="h-8"
					/>
					<label htmlFor={confirmationId} className={SETTINGS_ROW_LABEL}>
						{t('settings.profile.PASSWORD_CONFIRM')}
					</label>
					<Input
						id={confirmationId}
						type="password"
						value={confirmation}
						autoComplete="new-password"
						aria-invalid={Boolean(error) || undefined}
						aria-describedby={describedByOf(error, errorId)}
						onChange={(event) => {
							setConfirmation(event.target.value);
							setError(null);
						}}
						className="h-8"
					/>
					<PasswordChecks password={password} confirmation={confirmation} />
					{error && (
						<p id={errorId} role="alert" className="text-xs text-pretty text-destructive-ink">
							{error}
						</p>
					)}
					<div className="flex justify-end gap-2">
						<Button type="button" variant="ghost" size="sm" onClick={reset} disabled={isSavingPassword}>
							{t('common.CANCEL')}
						</Button>
						<Button type="submit" size="sm" disabled={isSavingPassword}>
							{isSavingPassword && <Spinner className="size-3.5 animate-spin" />}
							{t('settings.profile.PASSWORD_SAVE')}
						</Button>
					</div>
				</div>
			</form>
		);
	}

	return (
		<div>
			<div className={SETTINGS_ROW}>
				<div className="flex min-w-0 flex-1 flex-col gap-0.5">
					<span className={SETTINGS_ROW_LABEL}>{label}</span>
					{scopeLine}
				</div>
				<div className="flex min-w-0 items-center gap-3 sm:justify-end">
					<Button type="button" variant="ghost" size="sm" onClick={startEditing}>
						{t('settings.profile.PASSWORD_SET')}
					</Button>
				</div>
			</div>
			<p aria-live="polite" className="px-4 pb-3 text-xs text-muted-foreground empty:hidden">
				{status}
			</p>
		</div>
	);
}
