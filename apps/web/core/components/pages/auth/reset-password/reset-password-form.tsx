'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useState, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button, Text } from '@/core/components';
import { AuthLayout } from '@/core/components/layouts/default-layout';
import { InputField } from '@/core/components/duplicated-components/_input';
import { authService } from '@/core/services/client/api/auth/auth.service';
import { cn } from '@/core/lib/helpers';
import { ArrowLeft, CheckCircle2, Eye, EyeOff } from 'lucide-react';

const INPUT_CLASS =
	'dark:bg-foreground/5 ring-foreground/10 placeholder:text-muted-foreground/75 selection:bg-primary selection:text-primary-foreground flex h-9 w-full min-w-0 rounded-md border border-transparent bg-white px-3 py-1 text-base shadow-sm outline-none ring-1 transition-[color,box-shadow] md:text-sm focus-visible:border-foreground/35 focus-visible:ring-ring/25 dark:focus-visible:border-foreground/25 focus-visible:ring-[3px]';

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
			<div className="w-full overflow-x-hidden overflow-y-clip p-1.5">
				{isTokenMissing ? (
					/* No token - show error */
					<div className="flex flex-col gap-6 items-center py-4">
						<div className="flex flex-col gap-2 items-center text-center">
							<h3 className="text-lg font-semibold">
								{t('pages.authResetPassword.INVALID_LINK_TITLE')}
							</h3>
							<p className="max-w-sm text-sm lg:max-w-md text-muted-foreground">
								{t('pages.authResetPassword.TOKEN_EXPIRED')}
							</p>
						</div>

						<Link
							href="/auth/forgot-password"
							className="inline-flex gap-2 items-center text-sm font-medium text-primary hover:underline"
						>
							{t('pages.authResetPassword.REQUEST_NEW_LINK')}
						</Link>
					</div>
				) : success ? (
					/* Success state */
					<div className="flex flex-col gap-6 items-center py-4">
						<div className="flex justify-center items-center w-16 h-16 bg-green-100 rounded-full dark:bg-green-900/30">
							<CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
						</div>

						<div className="flex flex-col gap-2 items-center text-center">
							<h3 className="text-lg font-semibold">
								{t('pages.authResetPassword.SUCCESS_TITLE')}
							</h3>
							<p className="max-w-sm text-sm text-muted-foreground">
								{t('pages.authResetPassword.SUCCESS_MESSAGE')}
							</p>
						</div>

						<Link
							href="/auth/password"
							className="inline-flex gap-2 items-center mt-2 text-sm font-medium text-primary hover:underline"
						>
							<ArrowLeft className="w-4 h-4" />
							{t('pages.authResetPassword.GO_TO_LOGIN')}
						</Link>
					</div>
				) : (
					/* Form state */
					<form onSubmit={handleSubmit} className="space-y-6">
						<p className="text-sm text-muted-foreground">
							{t('pages.authResetPassword.FORM_DESCRIPTION')}
						</p>

						<div className="space-y-2.5">
							<label data-slot="label" className="block text-sm font-medium leading-none select-none" htmlFor="reset-password">
								{t('pages.authResetPassword.NEW_PASSWORD')}
							</label>
							<div className="relative">
								<InputField
									id="reset-password"
									name="password"
									type={showPassword ? 'text' : 'password'}
									placeholder={t('pages.authResetPassword.NEW_PASSWORD')}
									value={password}
									onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
									autoComplete="new-password"
									noWrapper
									className={cn(INPUT_CLASS, 'pr-10')}
									required
								/>
								<button
									type="button"
									className="absolute right-3 top-1/2 transition-colors -translate-y-1/2 cursor-pointer text-muted-foreground hover:text-foreground"
									onClick={() => setShowPassword(!showPassword)}
								>
									{showPassword ? <Eye size={16} /> : <EyeOff size={16} />}
								</button>
							</div>
							{errors.password && <Text.Error className="text-xs">{errors.password}</Text.Error>}
						</div>

						<div className="space-y-2.5">
							<label data-slot="label" className="block text-sm font-medium leading-none select-none" htmlFor="reset-confirm">
								{t('pages.authResetPassword.CONFIRM_PASSWORD')}
							</label>
							<div className="relative">
								<InputField
									id="reset-confirm"
									name="confirmPassword"
									type={showConfirmPassword ? 'text' : 'password'}
									placeholder={t('pages.authResetPassword.CONFIRM_PASSWORD')}
									value={confirmPassword}
									onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
										setConfirmPassword(e.target.value)
									}
									autoComplete="new-password"
									noWrapper
									className={cn(INPUT_CLASS, 'pr-10')}
									required
								/>
								<button
									type="button"
									className="absolute right-3 top-1/2 transition-colors -translate-y-1/2 cursor-pointer text-muted-foreground hover:text-foreground"
									onClick={() => setShowConfirmPassword(!showConfirmPassword)}
								>
									{showConfirmPassword ? <Eye size={16} /> : <EyeOff size={16} />}
								</button>
							</div>
							{errors.confirmPassword && <Text.Error className="text-xs">{errors.confirmPassword}</Text.Error>}
						</div>

						{errors.form && <Text.Error className="text-xs">{errors.form}</Text.Error>}

						<div className="space-y-4">
							<Button
								type="submit"
								loading={loading}
								disabled={loading}
								className="cursor-pointer inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow-md border-[0.5px] border-white/10 shadow-black/15 [&_svg]:drop-shadow-sm bg-primary ring-1 ring-(--ring-color) [--ring-color:color-mix(in_oklab,black_15%,var(--color-primary))] dark:border-transparent dark:[--ring-color:color-mix(in_oklab,white_15%,var(--color-primary))] text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2 w-full"
							>
								{t('pages.authResetPassword.RESET_PASSWORD')}
							</Button>

							<div className="mt-1 text-center">
								<Link
									href="/auth/password"
									className="inline-flex gap-2 items-center text-sm font-medium text-primary hover:underline"
								>
									<ArrowLeft className="w-4 h-4" />
									{t('pages.authResetPassword.GO_TO_LOGIN')}
								</Link>
							</div>
						</div>
					</form>
				)}
			</div>
		</AuthLayout>
	);
}
