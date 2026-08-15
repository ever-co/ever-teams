'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';
import Link from 'next/link';
import { Button, Text } from '@/core/components';
import { AuthLayout } from '@/core/components/layouts/default-layout';
import { InputField } from '@/core/components/duplicated-components/_input';
import { authService } from '@/core/services/client/api/auth/auth.service';
import { ArrowLeft, CheckCircle2, Mail } from 'lucide-react';

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
						<div className="flex justify-center items-center w-16 h-16 bg-green-100 rounded-full dark:bg-green-900/30">
							<CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
						</div>

						<div className="flex flex-col gap-2 items-center text-center">
							<h3 className="text-lg font-semibold">
								{t('pages.authForgotPassword.SUCCESS_TITLE')}
							</h3>
							<p className="max-w-sm text-sm lg:max-w-md text-muted-foreground">
								{t('pages.authForgotPassword.SUCCESS_MESSAGE')}
							</p>
						</div>

						<div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-muted/50 ring-1 ring-foreground/10">
							<Mail className="w-4 h-4 text-muted-foreground" />
							<span className="text-sm font-medium">{email}</span>
						</div>

						<Link
							href="/auth/password"
							className="flex gap-2 items-center mt-2 text-sm font-medium text-primary hover:underline"
						>
							<ArrowLeft className="w-4 h-4" />
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
							<label data-slot="label" className="block text-sm font-medium leading-none select-none" htmlFor="forgot-email">
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
								className="dark:bg-foreground/5 ring-foreground/10 placeholder:text-muted-foreground/75 selection:bg-primary selection:text-primary-foreground flex h-9 w-full min-w-0 rounded-md border border-transparent bg-white px-3 py-1 text-base shadow-sm outline-none ring-1 transition-[color,box-shadow] md:text-sm focus-visible:border-foreground/35 focus-visible:ring-ring/25 dark:focus-visible:border-foreground/25 focus-visible:ring-[3px]"
								required
							/>
							{error && <Text.Error className="text-xs">{error}</Text.Error>}
						</div>

						<div className="space-y-4">
							<Button
								type="submit"
								loading={loading}
								disabled={loading}
								className="cursor-pointer inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow-md border-[0.5px] border-white/10 shadow-black/15 [&_svg]:drop-shadow-sm bg-primary ring-1 ring-(--ring-color) [--ring-color:color-mix(in_oklab,black_15%,var(--color-primary))] dark:border-transparent dark:[--ring-color:color-mix(in_oklab,white_15%,var(--color-primary))] text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2 w-full"
							>
								{t('pages.authForgotPassword.SEND_RESET_LINK')}
							</Button>

							<div className="mt-1 text-center">
								<Link
									href="/auth/password"
									className="inline-flex gap-2 items-center text-sm font-medium text-primary hover:underline"
								>
									<ArrowLeft className="w-4 h-4" />
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
