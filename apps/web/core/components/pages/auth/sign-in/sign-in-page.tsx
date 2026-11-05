'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useAuthenticationPasscode } from '@/core/hooks/auth/use-authentication-passcode';
import { useAuthenticationPassword } from '@/core/hooks/auth/use-authentication-password';
import { getActiveUserIdCookie } from '@/core/lib/helpers/index';
import { APP_NAME, IS_DEMO_MODE } from '@/core/constants/config/constants';
import { AuthLayout } from '@/core/components/layouts/default-layout/auth-layout';
import { AuthSteps } from '@/core/components/auth/kit/auth-step';
import type { AuthMethod } from '@/core/components/auth/kit/auth-method-switch';
import { AccountScene, InboxScene, PickedWorkspaceScene } from '@/core/components/auth/scenes/auth-scenes';
import { CredentialsStep } from './credentials-step';
import { CodeStep } from './code-step';
import { CodeWorkspaceStep, PasswordWorkspaceStep, type WorkspaceSelection } from './workspace-steps';

type SignInStep = 'credentials' | 'code' | 'workspace';

const STEP_ORDER: Record<SignInStep, number> = {
	credentials: 0,
	code: 1,
	workspace: 2
};

function isAuthMethod(value: string | null | undefined): value is AuthMethod {
	return value === 'code' || value === 'password';
}

function initialMethodOf(fromQuery: string | null | undefined, defaultMethod: AuthMethod) {
	if (isAuthMethod(fromQuery)) {
		return fromQuery;
	}
	return defaultMethod;
}

/** The method stays in the address bar, so a reload or a shared link opens the same form. */
function writeMethodToAddressBar(method: AuthMethod) {
	const url = new URL(window.location.href);
	url.searchParams.set('method', method);
	window.history.replaceState(null, '', url.toString());
}

function shownMethodOf(method: AuthMethod, isCodeUnderWay: boolean): AuthMethod {
	if (isCodeUnderWay) {
		return 'code';
	}
	return method;
}

function stepOf(method: AuthMethod, codeScreen: string, passwordScreen: string): SignInStep {
	if (method === 'code') {
		if (codeScreen === 'passcode') {
			return 'code';
		}
		if (codeScreen === 'workspace') {
			return 'workspace';
		}
		return 'credentials';
	}
	if (passwordScreen === 'workspace') {
		return 'workspace';
	}
	return 'credentials';
}

/**
 * Sign in, by e-mailed code or by password, on one page: `/auth/passcode` and `/auth/password` both render it and
 * only choose the method it opens with. Switching method changes the form in place, never the page.
 */
export function SignInPage({ defaultMethod }: Readonly<{ defaultMethod: AuthMethod }>) {
	const t = useTranslations();
	const router = useRouter();
	const searchParams = useSearchParams();
	const code = useAuthenticationPasscode();
	const password = useAuthenticationPassword();
	const { data: session, update } = useSession();
	const [method, setMethod] = useState<AuthMethod>(() => initialMethodOf(searchParams?.get('method'), defaultMethod));
	const [selectedWorkspace, setSelectedWorkspace] = useState<number>(0);
	const [selectedTeam, setSelectedTeam] = useState('');
	const isCodeRoute = defaultMethod === 'code';
	const emailFromLink = searchParams?.get('email') ?? '';

	// The code page has always sent a signed-in visitor home; the password page never did.
	useEffect(() => {
		if (!isCodeRoute) {
			return;
		}
		if (session) {
			router.replace('/');
		}
		update({});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [router]);

	useEffect(() => {
		if (!isCodeRoute) {
			return;
		}
		const userId = getActiveUserIdCookie();
		if (userId) {
			router.replace('/');
		}
	}, [router, isCodeRoute]);

	// The code hook reads `?email=` itself; the password form gets the same address.
	const { setFormValues: setPasswordValues } = password;
	useEffect(() => {
		if (!emailFromLink) {
			return;
		}
		setPasswordValues((values) => {
			if (values.email) {
				return values;
			}
			return { ...values, email: emailFromLink };
		});
	}, [emailFromLink, setPasswordValues]);

	const codeScreen = code.authScreen.screen;
	// A code under way (the e-mailed link, an Ever ID confirmation) always shows the code flow
	const isCodeUnderWay = codeScreen !== 'email';
	const shownMethod = shownMethodOf(method, isCodeUnderWay);
	const isCodeMethod = shownMethod === 'code';
	const step = stepOf(shownMethod, codeScreen, password.authScreen.screen);
	const isCredentialsStep = step === 'credentials';
	const isWorkspaceStep = step === 'workspace';
	const selection: WorkspaceSelection = { selectedWorkspace, setSelectedWorkspace, selectedTeam, setSelectedTeam };

	const changeMethod = (next: AuthMethod) => {
		setMethod(next);
		writeMethodToAddressBar(next);
	};

	let email = password.formValues.email;
	let workspaces = password.workspaces;
	if (isCodeMethod) {
		email = code.formValues.email;
		workspaces = code.workspaces;
	}

	let scene: ReactNode = (
		<AccountScene title={t('auth.scene.ACCOUNT_TITLE')} description={t('auth.scene.ACCOUNT_TEXT')} email={email} />
	);
	if (step === 'code') {
		scene = (
			<InboxScene
				title={t('auth.scene.INBOX_CODE_TITLE')}
				description={t('auth.scene.INBOX_CODE_TEXT')}
				email={email}
				message="code"
			/>
		);
	}
	if (isWorkspaceStep) {
		scene = (
			<PickedWorkspaceScene
				title={t('auth.scene.WORKSPACE_TITLE')}
				description={t('auth.scene.WORKSPACE_TEXT')}
				workspaces={workspaces}
				selectedWorkspace={selectedWorkspace}
				selectedTeam={selectedTeam}
			/>
		);
	}

	const showsCodeWorkspace = isWorkspaceStep && isCodeMethod;
	const showsPasswordWorkspace = isWorkspaceStep && !isCodeMethod;

	return (
		<AuthLayout
			headerLinkPrompt={t('auth.signIn.NEW_HERE', { appName: APP_NAME })}
			headerLinkText={t('auth.signIn.CREATE_ACCOUNT')}
			headerLinkHref="/auth/signup"
			showDeleteAccountLink
			aside={scene}
			wide={IS_DEMO_MODE && isCredentialsStep}
			contentAlign="top"
		>
			<AuthSteps step={step} order={STEP_ORDER[step]}>
				{isCredentialsStep && (
					<CredentialsStep
						method={shownMethod}
						onMethodChange={changeMethod}
						code={code}
						password={password}
					/>
				)}
				{step === 'code' && <CodeStep form={code} />}
				{showsCodeWorkspace && <CodeWorkspaceStep form={code} selection={selection} />}
				{showsPasswordWorkspace && <PasswordWorkspaceStep form={password} selection={selection} />}
			</AuthSteps>
		</AuthLayout>
	);
}
