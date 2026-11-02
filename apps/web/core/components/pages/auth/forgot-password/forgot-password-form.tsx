'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/core/components/common/button';
import { Text } from '@/core/components/common/typography';
import { AuthLayout } from '@/core/components/layouts/default-layout/auth-layout';
import { InputField } from '@/core/components/duplicated-components/_input';
import { authService } from '@/core/services/client/api/auth/auth.service';
import { ArrowLeft, CheckCircle2, Mail } from '@/core/components/icons';

/** iOS zooms the page into any field under 16 px on focus: auth fields stay 16 px below `md`. */
const INPUT_CLASS = 'text-base md:text-sm';

const TEXT_LINK_CLASS =
	'inline-flex items-center gap-2 rounded-sm text-sm font-medium text-primary-ink underline-offset-4 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50';

export default function ForgotPasswordForm() {
	const t = useTranslations();
	const [email, setEmail] = useState('');
	const [loading, setLoading] = useState(false);
	const [sent, setSent] = useState(false);
	const [error, setError] = useState('');

	const handleSubmit = useCallback(
		async (e: React.FormEvent<HTMLFormElement>) => {
			e.preventDefault();
			setError('');

			if (!email.trim()) {
				setError(t('form.EMAIL_REQUIRED'));
				return;
			}

			setLoading(true);
			try {
				await authService.requestPassword(email.trim());
				setSent(true);
			} catch {
				setError(t('pages.authForgotPassword.ERROR_MESSAGE'));
			} finally {
				setLoading(false);
			}
		},
		[email, t]
	);

	return (
		<AuthLayout
			title={t('pages.authForgotPassword.HEADING_TITLE')}
			description={t('pages.authForgotPassword.HEADING_DESCRIPTION')}
		>
			<div className="overflow-x-hidden w-full overflow-y-clip p-1.5">
				{sent ? (
					/* Success state */
					<div className="flex flex-col gap-6 items-center py-4">
						<div className="flex size-10 items-center justify-center rounded-lg bg-success/10 text-success-foreground">
							<CheckCircle2 className="size-5" />
						</div>

						<div className="flex flex-col gap-2 items-center text-center">
							<h3 className="text-lg font-semibold text-balance">
								{t('pages.authForgotPassword.SUCCESS_TITLE')}
							</h3>
							<p className="max-w-sm text-sm text-balance lg:max-w-md text-muted-foreground">
								{t('pages.authForgotPassword.SUCCESS_MESSAGE')}
							</p>
						</div>

						<div className="flex items-center gap-2 rounded-lg bg-foreground/5 px-3 py-2">
							<Mail className="size-4 text-muted-foreground" />
							<span className="text-sm font-medium">{email}</span>
						</div>

						<Link href="/auth/password" className={TEXT_LINK_CLASS}>
							<ArrowLeft className="size-4" />
							{t('pages.authForgotPassword.BACK_TO_LOGIN')}
						</Link>
					</div>
				) : (
					/* Form state */
					<form onSubmit={handleSubmit} className="space-y-6">
						<p className="text-sm text-muted-foreground">
							{t('pages.authForgotPassword.FORM_DESCRIPTION')}
						</p>

						<div className="space-y-2.5">
							<label
								data-slot="label"
								className="block text-sm font-medium leading-none select-none"
								htmlFor="forgot-email"
							>
								{t('form.EMAIL_PLACEHOLDER')}
							</label>
							<InputField
								id="forgot-email"
								name="email"
								type="email"
								placeholder={t('form.EMAIL_PLACEHOLDER')}
								value={email}
								onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
								autoComplete="email"
								noWrapper
								className={INPUT_CLASS}
								required
							/>
							{error && <Text.Error>{error}</Text.Error>}
						</div>

						<div className="space-y-4">
							<Button type="submit" loading={loading} disabled={loading} className="w-full">
								{t('pages.authForgotPassword.SEND_RESET_LINK')}
							</Button>

							<div className="text-center">
								<Link href="/auth/password" className={TEXT_LINK_CLASS}>
									<ArrowLeft className="size-4" />
									{t('pages.authForgotPassword.BACK_TO_LOGIN')}
								</Link>
							</div>
						</div>
					</form>
				)}
			</div>
		</AuthLayout>
	);
}
