'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Mail, MailCheck } from 'lucide-react';
import { Button } from '@/core/components/common/button';
import { Text } from '@/core/components/common/typography';
import { AuthLayout } from '@/core/components/layouts/default-layout/auth-layout';
import { InputField } from '@/core/components/duplicated-components/_input';
import { APP_NAME, DEFAULT_APP_PATH } from '@/core/constants/config/constants';
import { ACCOUNT_DELETION_LINK_TTL_MINUTES } from '@/core/lib/auth/account-deletion';
import { useAccountDeletionRequest } from '@/core/hooks/auth/use-account-deletion';

const PRIMARY_BUTTON =
	'cursor-pointer inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow-md border-[0.5px] border-white/10 shadow-black/15 [&_svg]:drop-shadow-sm bg-primary ring-1 ring-(--ring-color) [--ring-color:color-mix(in_oklab,black_15%,var(--color-primary))] dark:border-transparent dark:[--ring-color:color-mix(in_oklab,white_15%,var(--color-primary))] text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2 w-full';
const EMAIL_INPUT =
	'dark:bg-foreground/5 ring-foreground/10 placeholder:text-muted-foreground/75 selection:bg-primary selection:text-primary-foreground flex h-9 w-full min-w-0 rounded-md border border-transparent bg-white px-3 py-1 text-base shadow-sm outline-none ring-1 transition-[color,box-shadow] md:text-sm focus-visible:border-foreground/35 focus-visible:ring-ring/25 dark:focus-visible:border-foreground/25 focus-visible:ring-[3px]';

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
		>
			<div className="overflow-x-hidden w-full overflow-y-clip p-1.5" data-testid="delete-account-request">
				{sent ? (
					<div className="flex flex-col gap-6 items-center py-4" data-testid="delete-account-request-sent">
						<div className="flex justify-center items-center w-16 h-16 rounded-full bg-primary/10">
							<MailCheck className="w-8 h-8 text-primary" />
						</div>

						<div className="flex flex-col gap-2 items-center text-center">
							<h3 className="text-lg font-semibold">{t('pages.accountDeletion.SENT_TITLE')}</h3>
							<output className="block max-w-sm text-sm lg:max-w-md text-muted-foreground">
								{t('pages.accountDeletion.SENT_MESSAGE', {
									minutes: ACCOUNT_DELETION_LINK_TTL_MINUTES
								})}
							</output>
						</div>

						<div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-muted/50 ring-1 ring-foreground/10">
							<Mail className="w-4 h-4 text-muted-foreground" />
							<span className="text-sm font-medium break-all">{email.trim()}</span>
						</div>

						<Link
							href={DEFAULT_APP_PATH}
							className="flex gap-2 items-center mt-2 text-sm font-medium text-primary hover:underline"
						>
							<ArrowLeft className="w-4 h-4" />
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
							{emptyEmail && <Text.Error className="text-xs">{t('form.EMAIL_REQUIRED')}</Text.Error>}
							{error && (
								<Text.Error className="text-xs" role="alert">
									{t('pages.accountDeletion.REQUEST_ERROR')}
								</Text.Error>
							)}
						</div>

						<div className="space-y-4">
							<Button type="submit" loading={loading} disabled={loading} className={PRIMARY_BUTTON}>
								{t('pages.accountDeletion.SEND_LINK')}
							</Button>

							<div className="mt-1 text-center">
								<Link
									href={DEFAULT_APP_PATH}
									className="inline-flex gap-2 items-center text-sm font-medium text-primary hover:underline"
								>
									<ArrowLeft className="w-4 h-4" />
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
