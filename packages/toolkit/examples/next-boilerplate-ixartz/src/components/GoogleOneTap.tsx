'use client';
import { useClerk, useSignIn } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ClerkAPIError } from '@clerk/types';
import { isClerkAPIResponseError } from '@clerk/nextjs/errors';

// Add clerk to Window to avoid type errors
declare global {
	interface Window {
		google: any;
	}
}

export function GoogleOneTap({ children }: { children: React.ReactNode }) {
	const clerk = useClerk();
	const router = useRouter();
	const { signIn, isLoaded } = useSignIn();

	const [errors, setErrors] = useState<ClerkAPIError[]>();

	useEffect(() => {
		// Will show the One Tap UI after two seconds
		const timeout = setTimeout(() => oneTap(), 2000);
		return () => {
			clearTimeout(timeout);
		};
	}, []);

	const oneTap = () => {
		const { google } = window;
		if (google) {
			google.accounts.id.initialize({
				// Add your Google Client ID here.
				client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
				callback: async (response: any) => {
					// Here we call our provider with the token provided by Google
					call(response.credential);
				}
			});

			// Uncomment below to show the One Tap UI without
			// logging any notifications.
			// return google.accounts.id.prompt(); // without listening to notification

			// Display the One Tap UI, and log any errors that occur.
			return google.accounts.id.prompt((notification: any) => {
				console.log('Notification ::', notification);
				if (notification.isNotDisplayed()) {
					console.log('getNotDisplayedReason ::', notification.getNotDisplayedReason());
				} else if (notification.isSkippedMoment()) {
					console.log('getSkippedReason  ::', notification.getSkippedReason());
				} else if (notification.isDismissedMoment()) {
					console.log('getDismissedReason ::', notification.getDismissedReason());
				}
			});
		}
	};

	const call = async (token: any) => {
		try {
			const res = await clerk.authenticateWithGoogleOneTap({
				token
			});

			await clerk.handleGoogleOneTapCallback(res, {
				signInFallbackRedirectUrl: '/example-fallback-path'
			});
		} catch (error) {
			router.push('/sign-in');
		}
	};

	const handleGoogleSignIn = async () => {
		if (!isLoaded) return;
		try {
			await signIn.authenticateWithRedirect({
				strategy: 'oauth_google',
				redirectUrl: '/dashboard',
				redirectUrlComplete: '/dashboard'
			});
		} catch (err) {
			if (isClerkAPIResponseError(err)) setErrors(err.errors);
			else setErrors([{ code: 'custom', message: 'Error', longMessage: 'Error : ' + err }]);
			console.error(JSON.stringify(err, null, 2));
		}
	};

	return (
		<>
			<button onClick={handleGoogleSignIn} className="w-full bg-red-500 text-white p-2 rounded mt-4">
				{children}
			</button>
			{errors && (
				<ul>
					{errors.map((el, index) => (
						<span className="text-red-500 text-xs" key={index}>
							{el.longMessage}
						</span>
					))}
				</ul>
			)}
		</>
	);
}
