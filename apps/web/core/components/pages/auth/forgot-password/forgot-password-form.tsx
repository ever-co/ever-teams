'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';
import Link from 'next/link';
import { Button, Text } from '@/core/components';
import { AuthLayout } from '@/core/components/layouts/default-layout';
import { EverCard } from '@/core/components/common/ever-card';
import { InputField } from '@/core/components/duplicated-components/_input';
import { authService } from '@/core/services/client/api/auth/auth.service';
import { APP_NAME } from '@/core/constants/config/constants';
import { cn } from '@/core/lib/helpers';
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
			<div className="w-full md:min-w-[26rem] md:w-fit max-w-[450px] overflow-x-hidden overflow-y-clip">
				<EverCard className="w-full dark:bg-[#25272D] bg-[#ffffff]" shadow="bigger">
					{sent ? (
						/* Success state */
						<div className="flex flex-col gap-6 items-center py-4">
							<div className="flex justify-center items-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30">
								<CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
							</div>

							<div className="flex flex-col gap-2 items-center text-center">
								<Text.Heading as="h3">
									{t('pages.authForgotPassword.SUCCESS_TITLE')}
								</Text.Heading>
								<p className="text-sm text-gray-500 dark:text-gray-400 max-w-[320px]">
									{t('pages.authForgotPassword.SUCCESS_MESSAGE')}
								</p>
							</div>

							<div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-800/50">
								<Mail className="w-4 h-4 text-gray-400" />
								<span className="text-sm font-medium text-gray-700 dark:text-gray-300">
									{email}
								</span>
							</div>

							<Link
								href="/auth/password"
								className={cn(
									'flex items-center gap-2 text-sm font-medium',
									'text-primary dark:text-primary-light hover:underline mt-2'
								)}
							>
								<ArrowLeft className="w-4 h-4" />
								{t('pages.authForgotPassword.BACK_TO_LOGIN')}
							</Link>
						</div>
					) : (
						/* Form state */
						<form onSubmit={handleSubmit} className="flex flex-col justify-between items-center">
							<Text.Heading as="h3" className="mb-2 text-center">
								{t('pages.authForgotPassword.HEADING_TITLE')}
							</Text.Heading>

							<p className="mb-8 text-sm text-center text-gray-500 dark:text-gray-400">
								{t('pages.authForgotPassword.FORM_DESCRIPTION')}
							</p>

							<div className="w-full mb-6">
								<InputField
									name="email"
									type="email"
									placeholder={t('form.EMAIL_PLACEHOLDER')}
									value={email}
									onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
									autoComplete="email"
									wrapperClassName="dark:bg-[#25272D]"
									className="dark:bg-[#25272D]"
									required
									errors={error ? { email: error } : {}}
								/>
							</div>

							<div className="flex flex-col gap-4 items-center w-full">
								<Button
									type="submit"
									loading={loading}
									disabled={loading}
									className="w-full"
								>
									{t('pages.authForgotPassword.SEND_RESET_LINK')}
								</Button>

								<Link
									href="/auth/password"
									className={cn(
										'flex items-center gap-2 text-sm font-medium',
										'text-primary dark:text-primary-light hover:underline'
									)}
								>
									<ArrowLeft className="w-4 h-4" />
									{t('pages.authForgotPassword.BACK_TO_LOGIN')}
								</Link>
							</div>
						</form>
					)}
				</EverCard>
			</div>
		</AuthLayout>
	);
}
