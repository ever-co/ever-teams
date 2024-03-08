'use client';

import { TAuthenticationPassword, useAuthenticationPassword } from '@app/hooks';
import { IClassName } from '@app/interfaces';
import { clsxm } from '@app/utils';
import { Button, Card, InputField, Text } from 'lib/components';
import { AuthLayout } from 'lib/layout';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

export default function AuthPassword() {
	const t = useTranslations();
	const form = useAuthenticationPassword();

	return (
		<AuthLayout
			title={t('pages.authLogin.HEADING_TITLE')}
			description={t('pages.authPassword.HEADING_DESCRIPTION')}
		>
			<div className="w-[98%] md:w-[550px] overflow-x-hidden">
				<div className={clsxm('flex flex-row transition-[transform] duration-500')}>
					{form.authScreen.screen === 'login' && <LoginForm form={form} />}

					{form.authScreen.screen === 'workspace' && <WorkSpaceScreen form={form} className="w-full" />}
				</div>
			</div>
		</AuthLayout>
	);
}

function LoginForm({ form }: { form: TAuthenticationPassword }) {
	const t = useTranslations();

	return (
		<Card className={clsxm('w-full dark:bg-[#25272D]')} shadow="bigger">
			<form onSubmit={form.handleSubmit} className="flex flex-col items-center justify-between h-full w-full">
				<Text.Heading as="h3" className="mb-10 text-center">
					{t('pages.authLogin.LOGIN_WITH_PASSWORD')}
				</Text.Heading>

				<div className="w-full mb-8">
					<InputField
						name="email"
						type="email"
						placeholder={t('form.EMAIL_PLACEHOLDER')}
						value={form.formValues.email}
						errors={form.errors}
						onChange={form.handleChange}
						autoComplete="off"
						wrapperClassName="dark:bg-[#25272D]"
						className="dark:bg-[#25272D]"
					/>

					<InputField
						type="password"
						name="password"
						placeholder={t('form.PASSWORD_PLACEHOLDER')}
						className="dark:bg-[#25272D]"
						wrapperClassName="mb-5 dark:bg-[#25272D]"
						value={form.formValues.password}
						errors={form.errors}
						onChange={form.handleChange}
						autoComplete="off"
					/>
				</div>

				<div className="flex items-center justify-between w-full">
					<div className="flex flex-col items-start gap-2">
						<div className="flex items-center justify-start gap-2 text-sm">
							<Link href="/auth/passcode" className="text-primary dark:text-primary-light">
								{t('pages.authLogin.LOGIN_WITH_MAGIC_CODE')}.
							</Link>
						</div>

						<div className="flex items-center justify-start gap-2 text-sm">
							<span>{t('common.DONT_HAVE_ACCOUNT')}</span>
							<Link href="/auth/team" className="text-primary dark:text-primary-light">
								<span>{t('common.REGISTER')}</span>
							</Link>
						</div>
					</div>

					<Button type="submit" loading={form.signInLoading} disabled={form.signInLoading}>
						{t('common.CONTINUE')}
					</Button>
				</div>
			</form>
		</Card>
	);
}

function WorkSpaceScreen({ form, className }: { form: TAuthenticationPassword } & IClassName) {
	return <></>;
}
