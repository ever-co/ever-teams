'use client';
import { cn } from '@ever-teams/toolkit-ui';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { usePasswordLoginForm, useTokenSubmission } from '@ever-teams/atoms';
import { AuthLayout } from './auth-layout';
import { LoginForm } from './login-form';
import { LoginTeamsTokenLoginForm } from './login-token-form';
import { LoadingScreen } from './loading-screen';

const NAVIGATION_DELAY = 800;

export function AuthPassword() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const returnUrl = searchParams.get('returnUrl') || '/';
	const [isNavigating, setIsNavigating] = useState(false);

	const [screen, setScreen] = useState<'login' | 'token'>('login');
	const passwordForm = usePasswordLoginForm({
		redirectHandler: handleNavigation
	});

	const tokenForm = useTokenSubmission(handleNavigation);

	function handleNavigation() {
		setIsNavigating(true);
		setTimeout(() => {
			router.push(returnUrl);
		}, NAVIGATION_DELAY);
	}

	if (isNavigating) {
		return <LoadingScreen />;
	}

	return (
		<AuthLayout title="Login to the Teams Kit Builder" description="Please enter your login information.">
			<div className="w-[98%] md:w-[550px] overflow-x-hidden">
				<div className={cn('flex flex-row transition-[transform] duration-500')}>
					{screen === 'login' && <LoginForm form={passwordForm} onSwitch={() => setScreen('token')} />}
					{screen === 'token' && (
						<LoginTeamsTokenLoginForm form={tokenForm} onSwitch={() => setScreen('login')} />
					)}
				</div>
			</div>
		</AuthLayout>
	);
}
