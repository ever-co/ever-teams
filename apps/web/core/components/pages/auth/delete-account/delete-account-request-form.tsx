'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { ArrowLeft, Mail, UserRemove } from '@/core/components/icons';
import { Button } from '@/core/components/common/button';
import { AuthLayout } from '@/core/components/layouts/default-layout/auth-layout';
import { APP_NAME, DEFAULT_APP_PATH } from '@/core/constants/config/constants';
import { ACCOUNT_DELETION_LINK_TTL_MINUTES } from '@/core/lib/auth/account-deletion';
import { useAccountDeletionRequest } from '@/core/hooks/auth/use-account-deletion';
import { AuthHeading, AuthMark } from '@/core/components/auth/kit/auth-heading';
import { AuthField } from '@/core/components/auth/kit/auth-field';
import { AuthNotice } from '@/core/components/auth/kit/auth-notice';
import { AuthAddress, AuthState } from '@/core/components/auth/kit/auth-state';
import { AuthSteps } from '@/core/components/auth/kit/auth-step';
import { AUTH_HINT, AUTH_QUIET_LINK } from '@/core/components/auth/kit/auth-recipes';
import { cn } from '@/core/lib/helpers';

function stepOf(sent: boolean) {
	if (sent) {
		return { name: 'sent', order: 1 };
	}
	return { name: 'form', order: 0 };
}

function emailErrorOf(emptyEmail: boolean, message: string) {
	if (emptyEmail) {
		return message;
	}
	return null;
}

/**
 * `/delete-account`: public, no sign-in. Asks for the e-mail address and sends a deletion link. The answer is the same
 * whether or not an account exists for the address, so the page cannot be used to find out who has an account.
 */
export default function DeleteAccountRequestForm() {
	const t = useTranslations();
	const [email, setEmail] = useState('');
	const [emptyEmail, setEmptyEmail] = useState(false);
	const { requestLink, loading, sent, error } = useAccountDeletionRequest();
	const step = stepOf(sent);
	const sentTo = email.trim();

	const handleSubmit = useCallback(
		async (e: FormEvent<HTMLFormElement>) => {
			e.preventDefault();
			setEmptyEmail(!email.trim());
			if (!email.trim()) return;
			await requestLink(email);
		},
		[email, requestLink]
	);

	const backToSignIn = (
		<Link href={DEFAULT_APP_PATH} className={cn(AUTH_QUIET_LINK, 'self-center')}>
			<ArrowLeft aria-hidden="true" />
			{t('pages.accountDeletion.BACK_TO_SIGN_IN')}
		</Link>
	);

	return (
		<AuthLayout
			// Added after the egress audit's UI baseline: no built-in Ever links
			operatorLinksOnly
		>
			<div data-testid="delete-account-request">
				<AuthSteps step={step.name} order={step.order}>
					{sent && (
						<div data-testid="delete-account-request-sent">
							<AuthState
								tone="brand"
								glyph={<Mail aria-hidden="true" />}
								title={t('pages.accountDeletion.SENT_TITLE')}
								description={t('pages.accountDeletion.SENT_MESSAGE', {
									minutes: ACCOUNT_DELETION_LINK_TTL_MINUTES
								})}
								actions={backToSignIn}
							>
								<AuthAddress email={sentTo} />
							</AuthState>
						</div>
					)}

					{!sent && (
						<div className="flex flex-col">
							<AuthHeading
								mark={
									<AuthMark>
										<UserRemove />
									</AuthMark>
								}
								title={t('pages.accountDeletion.REQUEST_TITLE')}
								description={t('pages.accountDeletion.REQUEST_DESCRIPTION', { appName: APP_NAME })}
								className="mb-7"
							/>
							<form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
								<p className={AUTH_HINT}>
									{t('pages.accountDeletion.REQUEST_WHO_FOR', { appName: APP_NAME })}
								</p>
								<AuthField
									id="delete-account-email"
									name="email"
									type="email"
									label={t('auth.field.EMAIL_LABEL')}
									placeholder={t('auth.field.EMAIL_PLACEHOLDER')}
									icon={<Mail />}
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									error={emailErrorOf(emptyEmail, t('form.EMAIL_REQUIRED'))}
									autoComplete="email"
									inputMode="email"
									required
								/>
								{error && <AuthNotice tone="error" title={t('pages.accountDeletion.REQUEST_ERROR')} />}
								<Button
									type="submit"
									loading={loading}
									disabled={loading}
									className="w-full max-sm:h-11"
								>
									{t('pages.accountDeletion.SEND_LINK')}
								</Button>
								{backToSignIn}
							</form>
						</div>
					)}
				</AuthSteps>
			</div>
		</AuthLayout>
	);
}
