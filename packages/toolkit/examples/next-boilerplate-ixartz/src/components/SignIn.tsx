'use client';

import { useSignIn, useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { ClerkAPIError, OAuthStrategy, SignInProps } from '@clerk/types';
import { isClerkAPIResponseError } from '@clerk/nextjs/errors';
import { Input, ThemedButton } from '@ever-teams/toolkit-ui';
import { authLogin } from '@ever-teams/api';
import { ArrowLeft, LoaderCircle } from 'lucide-react';
import Link from 'next/link';
import { useTeamsContext } from '@ever-teams/atoms';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

export default function SignIn({ signInUrl }: SignInProps) {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [errors, setErrors] = useState<ClerkAPIError[]>();
	const router = useRouter();
	const [loading, setLoading] = useState(false);
	const [oauthLoading, setOauthLoading] = useState(false);
	const { setAuthenticatedUser, setToken } = useTeamsContext();
	const t = useTranslations();
	const { isLoaded, signIn, setActive } = useSignIn();
	const { isSignedIn } = useUser();

	// Handle the submission of the sign-in form

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setErrors(undefined);

		if (!isLoaded) return;

		// Start the sign-in process using the email and password provided
		try {
			const gauzyUser = await authLogin({ email, password });

			if (!gauzyUser || 'error' in gauzyUser || 'message' in gauzyUser) {
				setLoading(false);
				console.log(gauzyUser);
				if (!gauzyUser) {
					setErrors([
						{
							code: 'custom',
							message: 'Gauzy Error',
							longMessage:
								'Gauzy Authentification Error : Login/Email combination is not correct, please try again.'
						}
					]);
					return;
				}

				if ('error' in gauzyUser) {
					setErrors([
						{ code: 'custom', message: 'Gauzy Error : ' + gauzyUser.error, longMessage: gauzyUser.error }
					]);
					return;
				}
				if ('message' in gauzyUser) {
					setErrors([
						{
							code: 'custom',
							message: 'Gauzy Error',
							longMessage: 'Gauzy Authentification Error: ' + gauzyUser.message
						}
					]);
					return;
				}
			}

			const signInAttempt = await signIn.create({
				identifier: email,
				password
			});

			// If sign-in process is complete, set the created session as active
			// and redirect the user
			if (signInAttempt.status === 'complete') {
				setAuthenticatedUser({ data: gauzyUser.user, loading: false });
				setToken(gauzyUser.token);

				await setActive({ session: signInAttempt.createdSessionId });
				router.push(signInUrl || '/');
			} else {
				// If the status is not complete, check why. User may need to
				// complete further steps.
				console.error(JSON.stringify(signInAttempt, null, 2));
			}
		} catch (err) {
			if (isClerkAPIResponseError(err)) setErrors(err.errors);
			else setErrors([{ code: 'custom', message: 'Gauzy Error', longMessage: 'Gauzy Authentification Error' }]);
			console.error(JSON.stringify(err, null, 2));
		}
		setLoading(false);
	};

	// Sign in With OAuth

	const signInWith = async (strategy: OAuthStrategy) => {
		setOauthLoading(true);
		setErrors(undefined);

		if (!signIn) return;
		try {
			await signIn.authenticateWithRedirect({
				strategy,
				redirectUrl: '/sign-up/sso-callback',
				redirectUrlComplete: signInUrl || '/'
			});
		} catch (err) {
			if (isClerkAPIResponseError(err)) setErrors(err.errors);
			else setErrors([{ code: 'custom', message: 'Error', longMessage: 'Error : ' + err }]);
			console.error(JSON.stringify(err, null, 2));
		}

		setOauthLoading(false);
	};

	useEffect(() => {
		if (isSignedIn) {
			router.push(signInUrl || '/');
		}
	}, [isSignedIn]);

	if (!signIn) return null;

	// Display a form to capture the user's email and password

	return (
		<form
			onSubmit={handleSubmit}
			className="flex dark:bg-black bg-white rounded-lg flex-col gap-3 w-[25rem] shadow-2xl p-6 "
		>
			<Link href={'/'}>
				<ArrowLeft className="text-gray-400" />
			</Link>
			<div className=" pb-2 mb-2 mt-2 flex flex-col gap-4 items-start justify-center border-b text-black dark:text-white   ">
				<h1 className=" text-3xl font-bold tracking-tight">{t('SignIn.meta_title')}</h1>

				<p className="text-xs font-light text-gray-400"></p>
			</div>
			{/* <ClerkSignIn />
				<ClerkSignUp /> */}
			<label htmlFor="email" className="text-slate-500 dark:text-white text-sm">
				{t('SignIn.email_prompt')}
			</label>
			<Input
				required
				onChange={(e) => setEmail(e.target.value)}
				className="border"
				placeholder={t('SignIn.email_prompt')}
				value={email}
				size={30}
				type="email"
				name="email"
				id="email"
			/>
			<label htmlFor="password" className="text-slate-500 dark:text-white text-sm">
				{t('SignIn.password_prompt')}
			</label>
			<Input
				required
				onChange={(e) => setPassword(e.target.value)}
				className="border"
				placeholder={t('SignIn.password_prompt')}
				value={password}
				size={30}
				name="password"
				type="password"
				id="password"
			/>
			{errors && (
				<ul>
					{errors.map((el, index) => (
						<span className="text-red-500 text-xs" key={index}>
							{el.longMessage ? el.longMessage : el.message}
						</span>
					))}
				</ul>
			)}
			<ThemedButton type="submit" disabled={loading} className="flex gap-2">
				{loading && (
					<span className=" animate-spin ">
						<LoaderCircle />
					</span>
				)}
				{t('SignIn.meta_title').toUpperCase()}
			</ThemedButton>
			<button
				onClick={() => signInWith('oauth_google')}
				className=" inline-flex items-center dark:text-white justify-center rounded-md transition-all font-medium ring-offset-background  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2  disabled:opacity-50 disabled:cursor-not-allowed p-2 gap-3 hover:bg-gray-400  border text-slate-500 text-sm "
				disabled={oauthLoading}
			>
				{oauthLoading ? (
					<span className=" animate-spin ">
						<LoaderCircle />
					</span>
				) : (
					<img className="h-4 w-4" src="https://fonts.gstatic.com/s/i/productlogos/googleg/v6/24px.svg" />
				)}
				<span>{t('SignIn.continue_with', { provider: 'Google' })}</span>
			</button>
			<p className="text-slate-500 text-sm dark:text-white pt-3">
				{t('SignIn.dont_have_an_account')}{' '}
				<Link className="text-blue-500 cursor-pointer" href="/sign-up">
					{t('SignUp.meta_title')}
				</Link>
			</p>
		</form>
	);
}
