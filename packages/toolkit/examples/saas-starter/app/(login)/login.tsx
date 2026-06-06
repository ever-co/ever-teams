'use client';

import Link from 'next/link';
import { ReactElement, useActionState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Input, Label, ThemedButton } from '@ever-teams/toolkit-ui';
import { CircleIcon, Loader2 } from 'lucide-react';
import { signIn, signUp } from './actions';
import { ActionState } from '@/lib/auth/middleware';

export function Login({ mode = 'signin' }: { mode?: 'signin' | 'signup' }): ReactElement {
	const t = useTranslations('Login');
	const searchParams = useSearchParams();
	const redirect = searchParams.get('redirect');
	const priceId = searchParams.get('priceId');
	const inviteId = searchParams.get('inviteId');

	const [state, formAction, pending] = useActionState<ActionState, FormData>(mode === 'signin' ? signIn : signUp, {
		error: ''
	});

	// Enhanced form action that captures credentials before submission
	const enhancedFormAction = async (formData: FormData) => {
		const email = formData.get('email') as string;
		const password = formData.get('password') as string;

		// Store credentials for Teams authentication after successful login
		if (email && password) {
			// Store in sessionStorage for pickup after redirect
			sessionStorage.setItem(
				'recent-login-credentials',
				JSON.stringify({
					email,
					password,
					timestamp: Date.now()
				})
			);
		}

		// Call the original form action
		return formAction(formData);
	};

	return (
		<div className=" min-h-[100dvh] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 ">
			<div className="sm:mx-auto sm:w-full sm:max-w-md">
				<div className="flex justify-center">
					<Link href={'/'}>
						<CircleIcon className="h-12 w-12 text-blue-700" />
					</Link>
				</div>
				<h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-gray-100">
					{mode === 'signin' ? t('page_title.sign_in') : t('page_title.sign_up')}
				</h2>
			</div>

			<div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
				<form className="space-y-6" action={enhancedFormAction}>
					<input type="hidden" name="redirect" value={redirect || ''} />
					<input type="hidden" name="priceId" value={priceId || ''} />
					<input type="hidden" name="inviteId" value={inviteId || ''} />
					<div>
						<Label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
							{t('form.email_label')}
						</Label>
						<div className="mt-1">
							<Input
								id="email"
								name="email"
								type="email"
								autoComplete="email"
								defaultValue={state.email}
								required
								maxLength={50}
								className="appearance-none rounded-full relative block w-full px-3 py-2 border border-gray-500 dark:border-gray-400  focus:outline-none focus:ring-orange-500 focus:border-orange-500 focus:z-10 sm:text-sm"
								placeholder={t('form.email_placeholder')}
							/>
						</div>
					</div>

					<div>
						<Label
							htmlFor="password"
							className="block text-sm font-medium text-gray-700 dark:text-gray-300"
						>
							{t('form.password_label')}
						</Label>
						<div className="mt-1">
							<Input
								id="password"
								name="password"
								type="password"
								autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
								defaultValue={state.password}
								required
								minLength={8}
								maxLength={100}
								className="appearance-none rounded-full relative block w-full px-3 py-2 border border-gray-500 dark:border-gray-400 placeholder-gray-500  focus:outline-none focus:ring-orange-500 focus:border-orange-500 focus:z-10 sm:text-sm"
								placeholder={t('form.password_placeholder')}
							/>
						</div>
					</div>

					{state?.error && <div className="text-red-500 text-sm">{state.error}</div>}

					<div>
						<ThemedButton
							type="submit"
							className="w-full flex justify-center items-center py-2 px-4  rounded-full "
							disabled={pending}
						>
							{pending ? (
								<>
									<Loader2 className="animate-spin mr-2 h-4 w-4" />
									{t('buttons.loading')}
								</>
							) : mode === 'signin' ? (
								t('buttons.sign_in')
							) : (
								t('buttons.sign_up')
							)}
						</ThemedButton>
					</div>
				</form>

				<div className="mt-6">
					<div className="relative">
						<div className="absolute inset-0 flex items-center">
							<div className="w-full border-t border-gray-300 dark:border-gray-700" />
						</div>
						<div className="relative flex justify-center text-sm">
							<span className="px-2 bg-gray-50 dark:bg-gray-950 text-gray-500 dark:text-gray-300">
								{mode === 'signin'
									? t('navigation.new_to_platform')
									: t('navigation.already_have_account')}
							</span>
						</div>
					</div>

					<div className="mt-6">
						<Link
							href={`${mode === 'signin' ? '/sign-up' : '/sign-in'}${
								redirect ? `?redirect=${redirect}` : ''
							}${priceId ? `&priceId=${priceId}` : ''}`}
							className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-full shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
						>
							{mode === 'signin' ? t('navigation.create_account') : t('navigation.sign_in_existing')}
						</Link>
					</div>
				</div>
			</div>
		</div>
	);
}
