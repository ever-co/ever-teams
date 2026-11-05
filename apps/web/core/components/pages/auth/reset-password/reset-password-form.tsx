'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useState, type FormEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/core/components/common/button';
import { AuthLayout } from '@/core/components/layouts/default-layout/auth-layout';
import { authService } from '@/core/services/client/api/auth/auth.service';
import { ArrowLeft, Check, Link as LinkGlyph, Lock } from '@/core/components/icons';
import { AuthHeading, AuthMark } from '@/core/components/auth/kit/auth-heading';
import { PasswordField } from '@/core/components/auth/kit/auth-field';
import { AuthNotice } from '@/core/components/auth/kit/auth-notice';
import { AuthState } from '@/core/components/auth/kit/auth-state';
import { AuthSteps } from '@/core/components/auth/kit/auth-step';
import { minLengthRuleOf, PasswordChecks } from '@/core/components/auth/kit/password-checks';
import { AUTH_QUIET_LINK } from '@/core/components/auth/kit/auth-recipes';
import { meetsPasswordMinLength } from '@/core/lib/utils/password-strength';
import { cn } from '@/core/lib/helpers';

const SIGN_IN_PATH = '/auth/password';

type ResetErrors = Partial<Record<'password' | 'confirmPassword' | 'form', string>>;

type ResetStep = 'form' | 'done' | 'invalid';

function resetStepOf(isTokenInvalid: boolean, success: boolean): ResetStep {
	if (isTokenInvalid) {
		return 'invalid';
	}
	if (success) {
		return 'done';
	}
	return 'form';
}

function stepOrderOf(step: ResetStep) {
	if (step === 'form') {
		return 0;
	}
	return 1;
}

export default function ResetPasswordForm({ isTokenExpired }: Readonly<{ isTokenExpired: boolean }>) {
	const t = useTranslations();
	const searchParams = useSearchParams();
	const token = searchParams.get('token') || '';

	const [password, setPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [loading, setLoading] = useState(false);
	const [success, setSuccess] = useState(false);
	const [errors, setErrors] = useState<ResetErrors>({});

	const isTokenInvalid = !token || isTokenExpired;
	const step = resetStepOf(isTokenInvalid, success);

	const validate = useCallback(() => {
		const found: ResetErrors = {};

		if (!meetsPasswordMinLength(password)) {
			found.password = minLengthRuleOf(t);
		}

		if (password !== confirmPassword) {
			found.confirmPassword = t('pages.authResetPassword.PASSWORDS_DONT_MATCH');
		}

		return found;
	}, [password, confirmPassword, t]);

	const handleSubmit = useCallback(
		async (e: FormEvent<HTMLFormElement>) => {
			e.preventDefault();
			setErrors({});

			const validationErrors = validate();
			if (Object.keys(validationErrors).length > 0) {
				setErrors(validationErrors);
				return;
			}

			setLoading(true);
			try {
				await authService.resetPassword(token, password, confirmPassword);
				setSuccess(true);
			} catch {
				setErrors({ form: t('pages.authResetPassword.ERROR_MESSAGE') });
			} finally {
				setLoading(false);
			}
		},
		[token, password, confirmPassword, validate, t]
	);

	const backToSignIn = (
		<Link href={SIGN_IN_PATH} className={cn(AUTH_QUIET_LINK, 'self-center')}>
			<ArrowLeft aria-hidden="true" />
			{t('auth.forgot.BACK_TO_SIGN_IN')}
		</Link>
	);

	let content: ReactNode = (
		<div className="flex flex-col">
			<AuthHeading
				mark={
					<AuthMark>
						<Lock />
					</AuthMark>
				}
				title={t('auth.reset.TITLE')}
				description={t('auth.reset.DESCRIPTION')}
				className="mb-7"
			/>
			<form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
				<PasswordField
					id="reset-password"
					name="password"
					label={t('auth.reset.NEW_LABEL')}
					placeholder={t('auth.field.PASSWORD_PLACEHOLDER')}
					icon={<Lock />}
					value={password}
					onChange={(e) => setPassword(e.target.value)}
					error={errors.password}
					autoComplete="new-password"
					required
				/>
				<PasswordField
					id="reset-confirm"
					name="confirmPassword"
					label={t('auth.reset.CONFIRM_LABEL')}
					placeholder={t('auth.field.PASSWORD_PLACEHOLDER')}
					icon={<Lock />}
					value={confirmPassword}
					onChange={(e) => setConfirmPassword(e.target.value)}
					error={errors.confirmPassword}
					autoComplete="new-password"
					required
				/>
				<PasswordChecks password={password} confirmation={confirmPassword} />
				{errors.form && <AuthNotice tone="error" title={errors.form} />}
				<Button type="submit" loading={loading} disabled={loading} className="w-full max-sm:h-11">
					{t('auth.reset.SUBMIT')}
				</Button>
				{backToSignIn}
			</form>
		</div>
	);

	if (step === 'done') {
		content = (
			<AuthState
				tone="success"
				glyph={<Check aria-hidden="true" />}
				title={t('auth.reset.DONE_TITLE')}
				description={t('auth.reset.DONE_TEXT')}
				actions={
					<Button asChild className="w-full max-sm:h-11">
						<Link href={SIGN_IN_PATH}>{t('auth.signUp.SIGN_IN')}</Link>
					</Button>
				}
			/>
		);
	}

	if (step === 'invalid') {
		content = (
			<AuthState
				tone="warning"
				glyph={<LinkGlyph aria-hidden="true" />}
				title={t('auth.reset.INVALID_TITLE')}
				description={t('pages.authResetPassword.TOKEN_EXPIRED')}
				actions={
					<>
						<Button asChild className="w-full max-sm:h-11">
							<Link href="/auth/forgot-password">{t('pages.authResetPassword.REQUEST_NEW_LINK')}</Link>
						</Button>
						{backToSignIn}
					</>
				}
			/>
		);
	}

	return (
		<AuthLayout>
			<AuthSteps step={step} order={stepOrderOf(step)}>
				{content}
			</AuthSteps>
		</AuthLayout>
	);
}
