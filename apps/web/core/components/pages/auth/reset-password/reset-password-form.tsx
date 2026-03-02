'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useState, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button, Text } from '@/core/components';
import { AuthLayout } from '@/core/components/layouts/default-layout';
import { EverCard } from '@/core/components/common/ever-card';
import { InputField } from '@/core/components/duplicated-components/_input';
import { authService } from '@/core/services/client/api/auth/auth.service';
import { cn } from '@/core/lib/helpers';
import { ArrowLeft, CheckCircle2, Eye, EyeOff } from 'lucide-react';

export default function ResetPasswordForm() {
	const t = useTranslations();
	const searchParams = useSearchParams();
	const token = searchParams.get('token') || '';

	const [password, setPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);
	const [loading, setLoading] = useState(false);
	const [success, setSuccess] = useState(false);
	const [errors, setErrors] = useState<Record<string, string>>({});

	const isTokenMissing = useMemo(() => !token, [token]);

	const validate = useCallback(() => {
		const errs: Record<string, string> = {};

		if (password.length < 6) {
			errs.password = t('pages.authResetPassword.PASSWORD_TOO_SHORT');
		}

		if (password !== confirmPassword) {
			errs.confirmPassword = t('pages.authResetPassword.PASSWORDS_DONT_MATCH');
		}

		return errs;
	}, [password, confirmPassword, t]);

	const handleSubmit = useCallback(
		async (e: React.FormEvent<HTMLFormElement>) => {
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
				setErrors({
					form: t('pages.authResetPassword.ERROR_MESSAGE')
				});
			} finally {
				setLoading(false);
			}
		},
		[token, password, confirmPassword, validate, t]
	);

	return (
		<AuthLayout
			title={t('pages.authResetPassword.HEADING_TITLE')}
			description={t('pages.authResetPassword.HEADING_DESCRIPTION')}
		>
			<div className="w-full md:min-w-[26rem] md:w-fit max-w-[450px] overflow-x-hidden overflow-y-clip">
				<EverCard className="w-full dark:bg-[#25272D] bg-[#ffffff]" shadow="bigger">
					{isTokenMissing ? (
						/* No token - show error */
						<div className="flex flex-col gap-6 items-center py-4">
							<div className="flex flex-col gap-2 items-center text-center">
								<Text.Heading as="h3">
									{t('pages.authResetPassword.INVALID_LINK_TITLE')}
								</Text.Heading>
								<p className="text-sm text-gray-500 dark:text-gray-400 max-w-[320px]">
									{t('pages.authResetPassword.TOKEN_EXPIRED')}
								</p>
							</div>

							<Link
								href="/auth/forgot-password"
								className={cn(
									'flex items-center gap-2 text-sm font-medium',
									'text-primary dark:text-primary-light hover:underline'
								)}
							>
								{t('pages.authResetPassword.REQUEST_NEW_LINK')}
							</Link>
						</div>
					) : success ? (
						/* Success state */
						<div className="flex flex-col gap-6 items-center py-4">
							<div className="flex justify-center items-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30">
								<CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
							</div>

							<div className="flex flex-col gap-2 items-center text-center">
								<Text.Heading as="h3">
									{t('pages.authResetPassword.SUCCESS_TITLE')}
								</Text.Heading>
								<p className="text-sm text-gray-500 dark:text-gray-400 max-w-[320px]">
									{t('pages.authResetPassword.SUCCESS_MESSAGE')}
								</p>
							</div>

							<Link
								href="/auth/password"
								className={cn(
									'flex items-center gap-2 text-sm font-medium',
									'text-primary dark:text-primary-light hover:underline mt-2'
								)}
							>
								<ArrowLeft className="w-4 h-4" />
								{t('pages.authResetPassword.GO_TO_LOGIN')}
							</Link>
						</div>
					) : (
						/* Form state */
						<form onSubmit={handleSubmit} className="flex flex-col justify-between items-center">
							<Text.Heading as="h3" className="mb-2 text-center">
								{t('pages.authResetPassword.HEADING_TITLE')}
							</Text.Heading>

							<p className="mb-8 text-sm text-center text-gray-500 dark:text-gray-400">
								{t('pages.authResetPassword.FORM_DESCRIPTION')}
							</p>

							<div className="w-full mb-4">
								<InputField
									name="password"
									type={showPassword ? 'text' : 'password'}
									placeholder={t('pages.authResetPassword.NEW_PASSWORD')}
									value={password}
									onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
									autoComplete="new-password"
									wrapperClassName="dark:bg-[#25272D]"
									className="dark:bg-[#25272D]"
									required
									errors={errors}
									trailingNode={
										<button
											type="button"
											className="px-4 text-xs font-normal text-gray-500 dark:text-gray-400"
											onClick={() => setShowPassword(!showPassword)}
										>
											{showPassword ? (
												<Eye size={15} className="font-light" />
											) : (
												<EyeOff size={15} className="font-light" />
											)}
										</button>
									}
								/>
							</div>

							<div className="w-full mb-6">
								<InputField
									name="confirmPassword"
									type={showConfirmPassword ? 'text' : 'password'}
									placeholder={t('pages.authResetPassword.CONFIRM_PASSWORD')}
									value={confirmPassword}
									onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
										setConfirmPassword(e.target.value)
									}
									autoComplete="new-password"
									wrapperClassName="dark:bg-[#25272D]"
									className="dark:bg-[#25272D]"
									required
									errors={errors}
									trailingNode={
										<button
											type="button"
											className="px-4 text-xs font-normal text-gray-500 dark:text-gray-400"
											onClick={() => setShowConfirmPassword(!showConfirmPassword)}
										>
											{showConfirmPassword ? (
												<Eye size={15} className="font-light" />
											) : (
												<EyeOff size={15} className="font-light" />
											)}
										</button>
									}
								/>
							</div>

							{errors.form && (
								<Text.Error className="mb-4">{errors.form}</Text.Error>
							)}

							<div className="flex flex-col gap-4 items-center w-full">
								<Button
									type="submit"
									loading={loading}
									disabled={loading}
									className="w-full"
								>
									{t('pages.authResetPassword.RESET_PASSWORD')}
								</Button>

								<Link
									href="/auth/password"
									className={cn(
										'flex items-center gap-2 text-sm font-medium',
										'text-primary dark:text-primary-light hover:underline'
									)}
								>
									<ArrowLeft className="w-4 h-4" />
									{t('pages.authResetPassword.GO_TO_LOGIN')}
								</Link>
							</div>
						</form>
					)}
				</EverCard>
			</div>
		</AuthLayout>
	);
}
