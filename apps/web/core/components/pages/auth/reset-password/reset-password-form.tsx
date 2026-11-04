'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useState, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/core/components/common/button';
import { Text } from '@/core/components/common/typography';
import { AuthLayout } from '@/core/components/layouts/default-layout/auth-layout';
import { InputField } from '@/core/components/duplicated-components/_input';
import { authService } from '@/core/services/client/api/auth/auth.service';
import { cn } from '@/core/lib/helpers';
import { ArrowLeft, CheckCircle2, Eye, EyeOff } from '@/core/components/icons';

/** iOS zooms the page into any field under 16 px on focus: auth fields stay 16 px below `md`. */
const INPUT_CLASS = 'text-base md:text-sm';

const PASSWORD_TOGGLE_CLASS =
	'absolute right-2 top-1/2 flex size-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-sm text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50';

const TEXT_LINK_CLASS =
	'inline-flex items-center gap-2 rounded-sm text-sm font-medium text-primary-ink underline-offset-4 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50';

export default function ResetPasswordForm({ isTokenExpired }: Readonly<{ isTokenExpired: boolean }>) {
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

	const isTokenInvalid = useMemo(() => !token || isTokenExpired, [token, isTokenExpired]);

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
				{isTokenInvalid ? (
					/* Missing or expired token - show error */
					<div className="flex flex-col gap-6 items-center py-4">
						<div className="flex flex-col gap-2 items-center text-center">
							<h3 className="text-lg font-semibold text-balance">
								{t('pages.authResetPassword.INVALID_LINK_TITLE')}
							</h3>
							<p className="max-w-sm text-sm text-balance lg:max-w-md text-muted-foreground">
								{t('pages.authResetPassword.TOKEN_EXPIRED')}
							</p>
						</div>

						<Link href="/auth/forgot-password" className={TEXT_LINK_CLASS}>
							{t('pages.authResetPassword.REQUEST_NEW_LINK')}
						</Link>
					</div>
				) : success ? (
					/* Success state */
					<div className="flex flex-col gap-6 items-center py-4">
						<div className="flex size-10 items-center justify-center rounded-lg bg-success/10 text-success-foreground">
							<CheckCircle2 className="size-5" />
						</div>

						<div className="flex flex-col gap-2 items-center text-center">
							<h3 className="text-lg font-semibold text-balance">
								{t('pages.authResetPassword.SUCCESS_TITLE')}
							</h3>
							<p className="max-w-sm text-sm text-balance text-muted-foreground">
								{t('pages.authResetPassword.SUCCESS_MESSAGE')}
							</p>
						</div>

						<Link href="/auth/password" className={TEXT_LINK_CLASS}>
							<ArrowLeft className="size-4" />
							{t('pages.authResetPassword.GO_TO_LOGIN')}
						</Link>
					</div>
				) : (
					/* Form state */
					<form onSubmit={handleSubmit} className="space-y-6">
						<p className="text-sm text-muted-foreground">{t('pages.authResetPassword.FORM_DESCRIPTION')}</p>

						<div className="space-y-2.5">
							<label
								data-slot="label"
								className="block text-sm font-medium leading-none select-none"
								htmlFor="reset-password"
							>
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
									className={PASSWORD_TOGGLE_CLASS}
									onClick={() => setShowPassword(!showPassword)}
								>
									{showPassword && <Eye className="size-4" />}
									{!showPassword && <EyeOff className="size-4" />}
								</button>
							</div>
							{errors.password && <Text.Error>{errors.password}</Text.Error>}
						</div>

						<div className="space-y-2.5">
							<label
								data-slot="label"
								className="block text-sm font-medium leading-none select-none"
								htmlFor="reset-confirm"
							>
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
									className={PASSWORD_TOGGLE_CLASS}
									onClick={() => setShowConfirmPassword(!showConfirmPassword)}
								>
									{showConfirmPassword && <Eye className="size-4" />}
									{!showConfirmPassword && <EyeOff className="size-4" />}
								</button>
							</div>
							{errors.confirmPassword && <Text.Error>{errors.confirmPassword}</Text.Error>}
						</div>

						{errors.form && <Text.Error>{errors.form}</Text.Error>}

						<div className="space-y-4">
							<Button type="submit" loading={loading} disabled={loading} className="w-full">
								{t('pages.authResetPassword.RESET_PASSWORD')}
							</Button>

							<div className="text-center">
								<Link href="/auth/password" className={TEXT_LINK_CLASS}>
									<ArrowLeft className="size-4" />
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
