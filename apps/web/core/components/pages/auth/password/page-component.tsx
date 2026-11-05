'use client';

import { getAccessTokenCookie } from '@/core/lib/helpers/index';
import { TAuthenticationPassword, useAuthenticationPassword } from '@/core/hooks/auth/use-authentication-password';
import { Button } from '@/core/components/common/button';
import { AuthLayout } from '@/core/components/layouts/default-layout/auth-layout';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import { WorkSpaceComponent } from '../passcode/page-component';
import SocialLogins from '@/core/components/auth/social-logins-buttons';
import {
	APP_NAME,
	IS_DEMO_MODE,
	LAST_WORKSPACE_AND_TEAM,
	USER_SAW_OUTSTANDING_NOTIFICATION
} from '@/core/constants/config/constants';
import { cn } from '@/core/lib/helpers';
import { logErrorInDev } from '@/core/lib/helpers/error-message';
import { Lock, Mail } from '@/core/components/icons';
import { useWorkspaceAnalysis } from '@/core/hooks/auth/use-workspace-analysis';
import { DemoAccountsSection } from '@/core/components/auth/demo-accounts-section';
import { DemoCredentialsDropdown } from '@/core/components/auth/demo-credentials-dropdown';
import { AuthHeading, AuthMark } from '@/core/components/auth/kit/auth-heading';
import { AuthField, PasswordField } from '@/core/components/auth/kit/auth-field';
import { AuthMethodSwitch } from '@/core/components/auth/kit/auth-method-switch';
import { AuthNotice } from '@/core/components/auth/kit/auth-notice';
import { AuthSteps } from '@/core/components/auth/kit/auth-step';
import { AuthState } from '@/core/components/auth/kit/auth-state';
import { AUTH_TEXT_LINK } from '@/core/components/auth/kit/auth-recipes';
import { workspaceNameOf } from '@/core/components/auth/workspace-picker';
import { AccountScene, PickedWorkspaceScene } from '@/core/components/auth/scenes/auth-scenes';

type Screen = TAuthenticationPassword['authScreen']['screen'];

const SCREEN_ORDER: Record<Screen, number> = {
	login: 0,
	workspace: 1
};

const FORM_ID = 'password-sign-in';

export default function AuthPassword() {
	const t = useTranslations();
	const form = useAuthenticationPassword();
	const [selectedWorkspace, setSelectedWorkspace] = useState<number>(0);
	const [selectedTeam, setSelectedTeam] = useState('');
	const screen = form.authScreen.screen;
	const isWorkspaceScreen = screen === 'workspace';

	let scene: ReactNode = (
		<AccountScene
			title={t('auth.scene.ACCOUNT_TITLE')}
			description={t('auth.scene.ACCOUNT_TEXT')}
			email={form.formValues.email}
		/>
	);
	if (isWorkspaceScreen) {
		scene = (
			<PickedWorkspaceScene
				title={t('auth.scene.WORKSPACE_TITLE')}
				description={t('auth.scene.WORKSPACE_TEXT')}
				workspaces={form.workspaces}
				selectedWorkspace={selectedWorkspace}
				selectedTeam={selectedTeam}
			/>
		);
	}

	return (
		<AuthLayout
			headerLinkPrompt={t('auth.signIn.NEW_HERE', { appName: APP_NAME })}
			headerLinkText={t('auth.signIn.CREATE_ACCOUNT')}
			headerLinkHref="/auth/signup"
			showDeleteAccountLink
			aside={scene}
			wide={IS_DEMO_MODE && !isWorkspaceScreen}
		>
			<AuthSteps step={screen} order={SCREEN_ORDER[screen]}>
				{screen === 'login' && <LoginForm form={form} />}
				{isWorkspaceScreen && (
					<WorkSpaceScreen
						form={form}
						selectedWorkspace={selectedWorkspace}
						setSelectedWorkspace={setSelectedWorkspace}
						selectedTeam={selectedTeam}
						setSelectedTeam={setSelectedTeam}
					/>
				)}
			</AuthSteps>
		</AuthLayout>
	);
}

function loginFailureOf(form: TAuthenticationPassword) {
	const failure = form.errors?.loginFailed as string | undefined;
	return failure || null;
}

function LoginFields({ form, required }: Readonly<{ form: TAuthenticationPassword; required: boolean }>) {
	const t = useTranslations();
	const loginFailure = loginFailureOf(form);

	const forgotLink = (
		<Link href="/auth/forgot-password" className={cn(AUTH_TEXT_LINK, 'text-xs')}>
			{t('auth.signIn.FORGOT_PASSWORD')}
		</Link>
	);

	return (
		<div className="flex flex-col gap-5">
			<AuthField
				id="pw-email"
				name="email"
				type="email"
				label={t('auth.field.EMAIL_LABEL')}
				placeholder={t('auth.field.EMAIL_PLACEHOLDER')}
				icon={<Mail />}
				value={form.formValues.email}
				error={form.errors?.email as string | undefined}
				onChange={form.handleChange}
				autoComplete="email"
				inputMode="email"
				required={required}
			/>
			<PasswordField
				id="pw-password"
				name="password"
				label={t('auth.field.PASSWORD_LABEL')}
				labelAside={forgotLink}
				placeholder={t('auth.field.PASSWORD_PLACEHOLDER')}
				icon={<Lock />}
				value={form.formValues.password}
				error={form.errors?.password as string | undefined}
				onChange={form.handleChange}
				autoComplete="current-password"
				required={required}
			/>
			{loginFailure && <AuthNotice tone="error" title={loginFailure} />}
		</div>
	);
}

function LoginForm({ form }: Readonly<{ form: TAuthenticationPassword }>) {
	const t = useTranslations();
	const searchParams = useSearchParams();
	const emailFromLink = searchParams?.get('email') ?? '';
	const { setFormValues } = form;

	// The code sign-in hands the address it already has (method switch): the person does not type it twice.
	useEffect(() => {
		if (!emailFromLink) {
			return;
		}
		setFormValues((values) => {
			if (values.email) {
				return values;
			}
			return { ...values, email: emailFromLink };
		});
	}, [emailFromLink, setFormValues]);

	/**
	 * Demo accounts: fill the form, then submit it once the values reached the DOM (an immediate submit failed the
	 * browser's "Please fill out this field" check on the first click).
	 */
	const handleDemoLogin = useCallback(
		(email: string, password: string) => {
			form.setErrors({});
			form.setFormValues({ email, password });
			setTimeout(() => {
				const formElement = document.getElementById(FORM_ID);
				if (!formElement) {
					logErrorInDev('Demo Auto-Login', 'Form element not found - cannot submit login form');
					return;
				}
				const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
				formElement.dispatchEvent(submitEvent);
			}, 200);
		},
		[form]
	);

	/** A pick in the credentials menu only fills the form. */
	const handleCredentialSelect = useCallback(
		(email: string, password: string) => {
			form.setErrors({});
			form.setFormValues({ email, password });
		},
		[form]
	);

	const heading = (
		<AuthHeading
			mark={
				<AuthMark>
					<Lock />
				</AuthMark>
			}
			title={t('auth.signIn.TITLE', { appName: APP_NAME })}
			description={t('auth.signIn.PASSWORD_DESCRIPTION')}
			className="mt-8 mb-7"
		/>
	);

	const submitButton = (
		<Button type="submit" loading={form.signInLoading} disabled={form.signInLoading} className="w-full max-sm:h-11">
			{t('auth.signIn.SUBMIT_PASSWORD')}
		</Button>
	);

	if (IS_DEMO_MODE) {
		return (
			<div className="flex flex-col gap-8 md:flex-row md:items-start">
				<div className="flex min-w-0 flex-1 flex-col">
					<AuthMethodSwitch method="password" email={form.formValues.email} />
					{heading}
					<form id={FORM_ID} onSubmit={form.handleSubmit} className="flex flex-col gap-5">
						<DemoCredentialsDropdown onCredentialSelect={handleCredentialSelect} className="w-full" />
						<LoginFields form={form} required />
						{submitButton}
					</form>
				</div>
				<DemoAccountsSection onDemoLogin={handleDemoLogin} className="md:mt-[3.75rem] md:w-60 md:shrink-0" />
			</div>
		);
	}

	return (
		<div className="flex flex-col">
			<AuthMethodSwitch method="password" email={form.formValues.email} />
			{heading}
			<form id={FORM_ID} onSubmit={form.handleSubmit} className="flex flex-col gap-5" noValidate>
				<LoginFields form={form} required={false} />
				{submitButton}
			</form>
			<SocialLogins />
		</div>
	);
}

type WorkspaceSelection = {
	selectedWorkspace: number;
	setSelectedWorkspace: Dispatch<SetStateAction<number>>;
	selectedTeam: string;
	setSelectedTeam: Dispatch<SetStateAction<string>>;
};

function WorkSpaceScreen({
	form,
	selectedWorkspace,
	setSelectedWorkspace,
	selectedTeam,
	setSelectedTeam
}: Readonly<{ form: TAuthenticationPassword } & WorkspaceSelection>) {
	const t = useTranslations();
	const router = useRouter();

	const signInToWorkspace = useCallback(
		(e: any) => {
			if (typeof selectedWorkspace !== 'undefined') {
				form.handleWorkspaceSubmit(e, form.workspaces[selectedWorkspace].token, selectedTeam);
				window?.localStorage.removeItem(USER_SAW_OUTSTANDING_NOTIFICATION);
				window?.localStorage.setItem(LAST_WORKSPACE_AND_TEAM, selectedTeam);
			}
		},
		[selectedWorkspace, selectedTeam, form]
	);

	const lastSelectedTeamFromAPI = form.getLastTeamIdWithRecentLogout();

	// Analyze workspace structure to determine if we should show workspace selection
	const workspaceAnalysis = useWorkspaceAnalysis(form.workspaces);

	useEffect(() => {
		// Only auto-submit if shouldAutoSubmit is true (1 workspace with exactly 1 team)
		if (workspaceAnalysis.shouldAutoSubmit) {
			setTimeout(() => {
				document.getElementById('continue-to-workspace')?.click();
			}, 100);
		}

		const currentTeams = form.workspaces.find((el) => el.current_teams && el.current_teams.length)?.current_teams;
		const lastSelectedTeamId =
			window.localStorage.getItem(LAST_WORKSPACE_AND_TEAM) || lastSelectedTeamFromAPI || form.defaultTeamId;

		if (currentTeams) {
			setSelectedWorkspace(
				form.workspaces.findIndex((el) =>
					el.current_teams.find((el) => el.team_id == currentTeams[0]?.team_id)
				) || 0
			);
			setSelectedTeam(currentTeams[0].team_id);
		}

		if (lastSelectedTeamId && lastSelectedTeamId !== 'undefined') {
			// Find workspace containing the last selected team
			const workspaceIndex = form.workspaces.findIndex((el) =>
				el.current_teams.find((el) => el.team_id == lastSelectedTeamId)
			);

			// A team the user was removed from is not restored: signing in to it answers 401
			if (workspaceIndex >= 0) {
				setSelectedWorkspace(workspaceIndex);
				setSelectedTeam(lastSelectedTeamId);
			}
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [form.workspaces]);

	useEffect(() => {
		if (form.authScreen.screen === 'workspace') {
			const accessToken = getAccessTokenCookie();
			if (accessToken && accessToken.length > 100) {
				router.refresh();
			}
		}
	}, [form.authScreen, router]);

	const workspaceName = workspaceNameOf(form.workspaces[selectedWorkspace]);

	return (
		<>
			{/* Kept mounted while it opens by itself (one workspace with one team): its Continue is clicked for the person */}
			<div className={cn('w-full', workspaceAnalysis.shouldAutoSubmit && 'hidden')}>
				<WorkSpaceComponent
					workspaces={form.workspaces}
					onSubmit={signInToWorkspace}
					onBackButtonClick={() => {
						form.authScreen.setScreen('login');
						form.setErrors({});
					}}
					selectedWorkspace={selectedWorkspace}
					setSelectedWorkspace={setSelectedWorkspace}
					setSelectedTeam={setSelectedTeam}
					selectedTeam={selectedTeam}
					signInWorkspaceLoading={form.signInWorkspaceLoading}
				/>
			</div>

			{workspaceAnalysis.shouldAutoSubmit && (
				<AuthState
					tone="loading"
					title={t('auth.workspace.OPENING')}
					description={t('auth.workspace.OPENING_TEXT', { workspace: workspaceName })}
				/>
			)}
		</>
	);
}
