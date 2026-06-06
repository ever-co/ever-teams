'use client';

import * as React from 'react';
import { useSignUp, useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Input, ThemedButton } from '@ever-teams/toolkit-ui';
import { ArrowLeft, LoaderCircle } from 'lucide-react';
import { ClerkAPIError, OAuthStrategy, SignUpProps } from '@clerk/types';
import { isClerkAPIResponseError } from '@clerk/nextjs/errors';
import Link from 'next/link';
import { authSignUp } from '@ever-teams/api';
import { useTranslations } from 'next-intl';

export default function SignUp({ signInUrl }: SignUpProps) {
	const { isLoaded, signUp, setActive } = useSignUp();
	const { isSignedIn } = useUser();
	const [emailAddress, setEmailAddress] = React.useState('');
	const [password, setPassword] = React.useState('');
	const [fullname, setFullname] = React.useState('');
	const [verifying, setVerifying] = React.useState(false);
	const [code, setCode] = React.useState('');
	const router = useRouter();
	const [loading, setLoading] = React.useState(false);
	const [errors, setErrors] = React.useState<ClerkAPIError[]>();
	const t = useTranslations();
	const [oauthLoading, setOauthLoading] = React.useState(false);

	// Handle submission of the sign-up form
	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setErrors(undefined);
		setLoading(true);

		if (!isLoaded) return;

		// Start the sign-up process using the email and password provided
		try {
			if (password.length < 8) {
				setLoading(false);
				setErrors([
					{
						code: 'Invalid',
						message: 'Password must be at least 8 characters',
						longMessage: 'Password must be at least 8 characters'
					}
				]);
				return;
			}

			await signUp.create({
				emailAddress,
				password
			});

			// Send the user an email with the verification code
			await signUp.prepareEmailAddressVerification({
				strategy: 'email_code'
			});

			// Set 'verifying' true to display second form
			// and capture the OTP code
			setVerifying(true);
		} catch (err: any) {
			if (isClerkAPIResponseError(err)) setErrors(err.errors);
			console.error(JSON.stringify(err, null, 2));
		}
		setLoading(false);
	};

	// Handle the submission of the verification form
	const handleVerify = async (e: React.FormEvent) => {
		e.preventDefault();
		setErrors(undefined);
		setLoading(true);

		if (!isLoaded) return;

		try {
			// Use the code the user provided to attempt verification
			const signUpAttempt = await signUp.attemptEmailAddressVerification({
				code
			});

			// If verification was completed, set the session to active
			// and redirect the user
			if (signUpAttempt.status === 'complete') {
				//After Successfully Sign Up, sign up to Gauzy
				const gauzyUser = await authSignUp({
					email: emailAddress,
					fullName: fullname,
					password,
					confirmPassword: password
				});

				if (!gauzyUser || 'error' in gauzyUser || 'message' in gauzyUser) {
					setLoading(false);
					if (!gauzyUser) {
						setErrors([
							{
								code: 'teams_custom_error',
								message: 'Teams Error',
								longMessage: 'Teams Authentification Error : null'
							}
						]);
						return;
					}

					if ('error' in gauzyUser) {
						setErrors([
							{
								code: 'teams_custom_error',
								message: 'Teams Error',
								longMessage: 'Teams Authentification Error : ' + gauzyUser.error
							}
						]);
						return;
					}
					if ('message' in gauzyUser) {
						setErrors([
							{
								code: 'teams_custom_error',
								message: 'Teams Error',
								longMessage: 'Teams Authentification Error : ' + gauzyUser.message
							}
						]);
						return;
					}
				}
				await setActive({ session: signUpAttempt.createdSessionId });
				router.push(signInUrl || '/');
			} else {
				// If the status is not complete, check why. User may need to
				// complete further steps.
				console.error(JSON.stringify(signUpAttempt, null, 2));
			}
		} catch (err: any) {
			if (isClerkAPIResponseError(err)) setErrors(err.errors);
			console.error(JSON.stringify(err, null, 2));
		}
		setLoading(false);
	};

	const signUpWith = (strategy: OAuthStrategy) => {
		setOauthLoading(true);
		setErrors(undefined);

		if (!signUp) return;

		return signUp
			.authenticateWithRedirect({
				strategy,
				redirectUrl: '/sign-up/sso-callback',
				redirectUrlComplete: signInUrl || '/'
			})
			.then((res) => {
				console.log(res);
			})
			.catch((err: any) => {
				if (isClerkAPIResponseError(err)) setErrors(err.errors);
				else setErrors([{ code: 'custom', message: 'Error', longMessage: 'Error : ' + err }]);
				console.error(JSON.stringify(err, null, 2));
			})
			.finally(() => setOauthLoading(false));
	};

	React.useEffect(() => {
		if (isSignedIn) {
			router.push(signInUrl || '/');
		}
	}, [isSignedIn]);

	// Display the verification form to capture the OTP code
	if (verifying) {
		return (
			<div className=" dark:bg-black bg-white rounded-xl flex flex-col gap-3 w-[25rem] shadow-2xl p-6 ">
				<div className=" pb-4 mb-4 flex flex-col gap-4 items-start justify-center border-b text-black dark:text-white   ">
					<h1 className=" text-3xl font-bold tracking-tight">{t('VerificationCode.meta_title')}</h1>
					<p className="text-xs font-light text-gray-400">{t('VerificationCode.meta_description')}</p>
				</div>
				<form className="flex flex-col gap-4" onSubmit={handleVerify}>
					<label id="code" className="text-slate-500 dark:text-white text-sm">
						{t('VerificationCode.verification_code_prompt')}
					</label>
					<Input
						required
						placeholder={t('VerificationCode.verification_code_prompt')}
						value={code}
						id="code"
						name="code"
						onChange={(e) => setCode(e.target.value)}
					/>
					{errors && (
						<ul>
							{errors.map((el, index) => (
								<span className="text-red-500 text-xs" key={index}>
									{el.longMessage}
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
						{t('VerificationCode.verify')}
					</ThemedButton>
					{/* <p className="text-slate-500 text-xs dark:text-white">
						{t('VerificationCode.did_not_received')}{' '}
						<Link className="text-blue-500 cursor-pointer" href="/sign-in">
							{t('VerificationCode.resend_code')}
						</Link>
					</p> */}
				</form>
			</div>
		);
	}

	// Display the initial sign-up form to capture the email and password
	return (
		<form
			onSubmit={handleSubmit}
			className="dark:bg-black bg-white  rounded-xl flex flex-col gap-3 w-[25rem] shadow-2xl p-6 "
		>
			<Link href={'/'}>
				<ArrowLeft className="text-gray-400" />
			</Link>
			<div className=" pb-2 mb-2 mt-2  flex flex-col gap-4 items-start justify-center border-b text-black dark:text-white   ">
				<h1 className=" text-3xl font-bold tracking-tight">{t('SignUp.meta_title')}</h1>
				<p className="text-xs font-light text-gray-400"></p>
			</div>

			<label htmlFor="fullName" className="text-slate-500 dark:text-white text-sm">
				{t('SignUp.fullname_prompt')}
			</label>
			<Input
				required
				onChange={(e) => {
					setFullname(e.target.value);
				}}
				className="border"
				placeholder={t('SignUp.fullname_prompt')}
				value={fullname}
				size={30}
				type="text"
				name="fullName"
			/>
			<label htmlFor="email" className="text-slate-500 dark:text-white text-sm">
				{t('SignUp.email_prompt')}
			</label>
			<Input
				required
				onChange={(e) => setEmailAddress(e.target.value)}
				className="border"
				placeholder={t('SignUp.email_prompt')}
				value={emailAddress}
				size={30}
				type="email"
				name="email"
				id="email"
			/>

			<label htmlFor="password" className="text-slate-500 dark:text-white text-sm">
				{t('SignUp.password_prompt')}
			</label>
			<Input
				required
				onChange={(e) => setPassword(e.target.value)}
				className="border"
				placeholder={t('SignUp.password_prompt')}
				value={password}
				size={30}
				name="password"
				type="password"
				id="password"
			/>

			{errors && (
				<ul>
					{errors.map((el, index) => (
						<ul className="text-red-500 text-xs" key={index}>
							{el.longMessage}
						</ul>
					))}
				</ul>
			)}

			<ThemedButton type="submit" disabled={loading} className="flex gap-2">
				{loading && (
					<span className=" animate-spin ">
						<LoaderCircle />
					</span>
				)}
				{t('SignUp.meta_title').toUpperCase()}
			</ThemedButton>

			<button
				onClick={() => signUpWith('oauth_google')}
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

			<p className="text-slate-500 text-sm dark:text-white">
				{t('SignUp.have_an_account')}{' '}
				<Link className="text-blue-500 cursor-pointer" href="#">
					{t('SignIn.meta_title')}
				</Link>
			</p>
			<div id="clerk-captcha" />
		</form>
	);
}
