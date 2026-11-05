'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Mail, MailCheck } from '@/core/components/icons';
import { Button } from '@/core/components/common/button';
import { Text } from '@/core/components/common/typography';
import { AuthLayout } from '@/core/components/layouts/default-layout/auth-layout';
import { InputField } from '@/core/components/duplicated-components/_input';
import { APP_NAME, DEFAULT_APP_PATH } from '@/core/constants/config/constants';
import { ACCOUNT_DELETION_LINK_TTL_MINUTES } from '@/core/lib/auth/account-deletion';
import { useAccountDeletionRequest } from '@/core/hooks/auth/use-account-deletion';

/** iOS zooms the page into any field under 16 px on focus: auth fields stay 16 px below `md`. */
const EMAIL_INPUT = 'text-base md:text-sm';
const TEXT_LINK_CLASS =
	'inline-flex items-center gap-2 rounded-sm text-sm font-medium text-primary-ink underline-offset-4 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50';

/**
 * `/delete-account`: public, no sign-in. Asks for the e-mail address and sends a deletion link. The answer is the same
 * whether or not an account exists for the address, so the page cannot be used to find out who has an account.
 */
export default function DeleteAccountRequestForm() {
	const t = useTranslations();
	const [email, setEmail] = useState('');
	const [emptyEmail, setEmptyEmail] = useState(false);
	const { requestLink, loading, sent, error } = useAccountDeletionRequest();

	const handleSubmit = useCallback(
		async (e: React.FormEvent<HTMLFormElement>) => {
			e.preventDefault();
			setEmptyEmail(!email.trim());
			if (!email.trim()) return;
			await requestLink(email);
		},
		[email, requestLink]
	);

	return (
		<AuthLayout
			title={t('pages.accountDeletion.REQUEST_TITLE')}
			description={t('pages.accountDeletion.REQUEST_DESCRIPTION', { appName: APP_NAME })}
			headerLinkText={t('pages.accountDeletion.BACK_TO_SIGN_IN')}
			headerLinkHref={DEFAULT_APP_PATH}
			// Added after the egress audit's UI baseline: no built-in Ever links
			operatorLinksOnly
		>
			<div className="overflow-x-hidden w-full overflow-y-clip p-1.5" data-testid="delete-account-request">
				{sent ? (
					<div className="flex flex-col gap-6 items-center py-4" data-testid="delete-account-request-sent">
						<div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary-ink">
							<MailCheck className="size-5" />
						</div>

						<div className="flex flex-col gap-2 items-center text-center">
							<h3 className="text-lg font-semibold text-balance">
								{t('pages.accountDeletion.SENT_TITLE')}
							</h3>
							<output className="block max-w-sm text-sm text-balance lg:max-w-md text-muted-foreground">
								{t('pages.accountDeletion.SENT_MESSAGE', {
									minutes: ACCOUNT_DELETION_LINK_TTL_MINUTES
								})}
							</output>
						</div>

						<div className="flex items-center gap-2 rounded-lg bg-foreground/5 px-3 py-2">
							<Mail className="size-4 shrink-0 text-muted-foreground" />
							<span className="text-sm font-medium break-all">{email.trim()}</span>
						</div>

						<Link href={DEFAULT_APP_PATH} className={TEXT_LINK_CLASS}>
							<ArrowLeft className="size-4" />
							{t('pages.accountDeletion.BACK_TO_SIGN_IN')}
						</Link>
					</div>
				) : (
					<form onSubmit={handleSubmit} className="space-y-6">
						<p className="text-sm text-muted-foreground">
							{t('pages.accountDeletion.REQUEST_WHO_FOR', { appName: APP_NAME })}
						</p>

						<div className="space-y-2.5">
							<label
								data-slot="label"
								className="block text-sm font-medium leading-none select-none"
								htmlFor="delete-account-email"
							>
								{t('form.EMAIL_PLACEHOLDER')}
							</label>
							<InputField
								id="delete-account-email"
								name="email"
								type="email"
								placeholder={t('form.EMAIL_PLACEHOLDER')}
								value={email}
								onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
								autoComplete="email"
								noWrapper
								className={EMAIL_INPUT}
								required
							/>
							{emptyEmail && <Text.Error>{t('form.EMAIL_REQUIRED')}</Text.Error>}
							{error && <Text.Error role="alert">{t('pages.accountDeletion.REQUEST_ERROR')}</Text.Error>}
						</div>

						<div className="space-y-4">
							<Button type="submit" loading={loading} disabled={loading} className="w-full">
								{t('pages.accountDeletion.SEND_LINK')}
							</Button>

							<div className="text-center">
								<Link href={DEFAULT_APP_PATH} className={TEXT_LINK_CLASS}>
									<ArrowLeft className="size-4" />
									{t('pages.accountDeletion.BACK_TO_SIGN_IN')}
								</Link>
							</div>
						</div>
					</form>
				)}
			</div>
		</AuthLayout>
	);
}
