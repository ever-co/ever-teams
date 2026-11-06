'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { Button } from '@/core/components/common/button';
import { AuthLayout } from '@/core/components/layouts/default-layout/auth-layout';
import { authService } from '@/core/services/client/api/auth/auth.service';
import { ArrowLeft, Key, Mail } from '@/core/components/icons';
import { AuthHeading, AuthMark } from '@/core/components/auth/kit/auth-heading';
import { AuthField } from '@/core/components/auth/kit/auth-field';
import { emailErrorOf } from '@/core/components/auth/kit/auth-email';
import { AuthAddress, AuthState } from '@/core/components/auth/kit/auth-state';
import { AuthSteps } from '@/core/components/auth/kit/auth-step';
import { AUTH_QUIET_LINK } from '@/core/components/auth/kit/auth-recipes';
import { InboxScene } from '@/core/components/auth/scenes/auth-scenes';
import { cn } from '@/core/lib/helpers';

const SIGN_IN_PATH = '/auth/password';

function stepOf(sent: boolean) {
	if (sent) {
		return { name: 'sent', order: 1 };
	}
	return { name: 'form', order: 0 };
}

export default function ForgotPasswordForm() {
	const t = useTranslations();
	const [email, setEmail] = useState('');
	const [loading, setLoading] = useState(false);
	const [sent, setSent] = useState(false);
	const [error, setError] = useState('');
	const [sentTo, setSentTo] = useState('');
	const step = stepOf(sent);
	let shownAddress = email.trim();
	if (sent) {
		shownAddress = sentTo;
	}

	const handleSubmit = useCallback(
		async (e: FormEvent<HTMLFormElement>) => {
			e.preventDefault();
			setError('');

			const address = email.trim();
			const emailError = emailErrorOf(address, t);
			if (emailError) {
				setError(emailError);
				return;
			}

			setLoading(true);
			try {
				await authService.requestPassword(address);
				setSentTo(address);
				setSent(true);
			} catch {
				setError(t('pages.authForgotPassword.ERROR_MESSAGE'));
			} finally {
				setLoading(false);
			}
		},
		[email, t]
	);

	const scene = (
		<InboxScene
			title={t('auth.scene.INBOX_RESET_TITLE')}
			description={t('auth.scene.INBOX_RESET_TEXT')}
			email={shownAddress}
			message="reset"
		/>
	);

	return (
		<AuthLayout
			aside={scene}
			// Walked signed in by the egress audit since #4942, after its UI baseline: no built-in Ever links
			operatorLinksOnly
		>
			<AuthSteps step={step.name} order={step.order}>
				{sent && (
					<AuthState
						tone="success"
						glyph={<Mail aria-hidden="true" />}
						title={t('auth.forgot.SENT_TITLE')}
						description={t('auth.forgot.SENT_TEXT')}
						actions={
							<>
								<Button asChild className="w-full max-sm:h-11">
									<Link href={SIGN_IN_PATH}>{t('auth.forgot.BACK_TO_SIGN_IN')}</Link>
								</Button>
								<button
									type="button"
									onClick={() => setSent(false)}
									className={cn(AUTH_QUIET_LINK, 'self-center')}
								>
									{t('auth.forgot.USE_ANOTHER_EMAIL')}
								</button>
							</>
						}
					>
						<AuthAddress email={sentTo} />
					</AuthState>
				)}

				{!sent && (
					<div className="flex flex-col">
						<AuthHeading
							mark={
								<AuthMark>
									<Key />
								</AuthMark>
							}
							title={t('auth.forgot.TITLE')}
							description={t('auth.forgot.DESCRIPTION')}
							className="mb-7"
						/>
						<form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
							<AuthField
								id="forgot-email"
								name="email"
								type="email"
								label={t('auth.field.EMAIL_LABEL')}
								placeholder={t('auth.field.EMAIL_PLACEHOLDER')}
								icon={<Mail />}
								value={email}
								onChange={(e) => {
									setEmail(e.target.value);
									setError('');
								}}
								error={error}
								autoComplete="email"
								inputMode="email"
								required
							/>
							<Button type="submit" loading={loading} disabled={loading} className="w-full max-sm:h-11">
								{t('auth.forgot.SUBMIT')}
							</Button>
							<Link href={SIGN_IN_PATH} className={cn(AUTH_QUIET_LINK, 'self-center')}>
								<ArrowLeft aria-hidden="true" />
								{t('auth.forgot.BACK_TO_SIGN_IN')}
							</Link>
						</form>
					</div>
				)}
			</AuthSteps>
		</AuthLayout>
	);
}
