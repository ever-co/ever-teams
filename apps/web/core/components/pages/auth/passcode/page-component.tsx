'use client';

import { getAccessTokenCookie, getActiveUserIdCookie } from '@/core/lib/helpers/index';
import { TAuthenticationPasscode, useAuthenticationPasscode } from '@/core/hooks/auth/use-authentication-passcode';
import { AuthLayout } from '@/core/components/layouts/default-layout/auth-layout';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { FormEvent, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import SocialLogins from '@/core/components/auth/social-logins-buttons';
import { useSession } from 'next-auth/react';
import {
	APP_NAME,
	AUTH_CODE_LENGTH,
	LAST_WORKSPACE_AND_TEAM,
	USER_SAW_OUTSTANDING_NOTIFICATION
} from '@/core/constants/config/constants';
import { Button } from '@/core/components/common/button';
import { ArrowLeft, Mail, ShieldCheck } from '@/core/components/icons';
import { getFirstTeamId, findWorkspaceIndexByTeamId } from '@/core/lib/utils/workspace.utils';
import { useWorkspaceAnalysis } from '@/core/hooks/auth/use-workspace-analysis';
import { AuthHeading, AuthMark } from '@/core/components/auth/kit/auth-heading';
import { AuthField } from '@/core/components/auth/kit/auth-field';
import { AuthCodeField, type AuthCodeStatus } from '@/core/components/auth/kit/auth-code-field';
import { AuthMethodSwitch } from '@/core/components/auth/kit/auth-method-switch';
import { AuthSteps } from '@/core/components/auth/kit/auth-step';
import { ResendCode } from '@/core/components/auth/kit/resend-code';
import { AuthState } from '@/core/components/auth/kit/auth-state';
import { AUTH_QUIET_LINK } from '@/core/components/auth/kit/auth-recipes';
import { WorkspacePicker, workspaceNameOf, type WorkspacePickerProps } from '@/core/components/auth/workspace-picker';
import { AccountScene, InboxScene, PickedWorkspaceScene } from '@/core/components/auth/scenes/auth-scenes';
import { cn } from '@/core/lib/helpers';

type Screen = TAuthenticationPasscode['authScreen']['screen'];

const SCREEN_ORDER: Record<Screen, number> = {
	email: 0,
	passcode: 1,
	workspace: 2
};

function renderAddress(chunks: ReactNode) {
	return <span className="font-medium break-all text-foreground">{chunks}</span>;
}

/** The code an e-mailed link carries (`?code=`): it fills the slots and signs in by itself. */
function codeFromAddressBar() {
	if (typeof window === 'undefined') {
		return '';
	}
	const query = new URLSearchParams(window.location.search);
	return query.get('code') ?? '';
}

function codeErrorOf(form: TAuthenticationPasscode) {
	if (form.status !== 'error') {
		return null;
	}
	const codeError = form.errors['code'] as string | undefined;
	const emailError = form.errors['email'] as string | undefined;
	return codeError || emailError || null;
}

function AuthPasscode() {
	const form = useAuthenticationPasscode();
	const t = useTranslations();
	const router = useRouter();
	const { data: session, update }: any = useSession();
	const [selectedWorkspace, setSelectedWorkspace] = useState<number>(0);
	const [selectedTeam, setSelectedTeam] = useState('');

	useEffect(() => {
		if (session) {
			router.replace('/');
		}
		update({});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [router]);

	useEffect(() => {
		const userId = getActiveUserIdCookie();
		if (userId) {
			router.replace('/');
		}
	}, [router]);

	const screen = form.authScreen.screen;
	const isWorkspaceScreen = screen === 'workspace';
	const email = form.formValues.email;

	let scene: ReactNode = (
		<AccountScene title={t('auth.scene.ACCOUNT_TITLE')} description={t('auth.scene.ACCOUNT_TEXT')} email={email} />
	);
	if (screen === 'passcode') {
		scene = (
			<InboxScene
				title={t('auth.scene.INBOX_CODE_TITLE')}
				description={t('auth.scene.INBOX_CODE_TEXT')}
				email={email}
				message="code"
			/>
		);
	}
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
		>
			<AuthSteps step={screen} order={SCREEN_ORDER[screen]}>
				{screen === 'email' && <EmailScreen form={form} />}
				{screen === 'passcode' && <PasscodeScreen form={form} />}
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

function EmailScreen({ form }: Readonly<{ form: TAuthenticationPasscode }>) {
	const t = useTranslations();
	const emailError = form.errors?.email as string | undefined;

	const handleSendCode = useCallback(
		(e: FormEvent<HTMLFormElement>) => {
			e.preventDefault();
			const sending = form.sendAuthCodeHandler();
			if (!sending) {
				return;
			}
			// The hook shows the reason of a refused send; only a code that went out opens the next screen.
			sending.then(
				() => form.authScreen.setScreen('passcode'),
				() => undefined
			);
		},
		[form]
	);

	return (
		<div className="flex flex-col">
			<AuthMethodSwitch method="code" email={form.formValues.email} />
			<AuthHeading
				mark={
					<AuthMark>
						<Mail />
					</AuthMark>
				}
				title={t('auth.signIn.TITLE', { appName: APP_NAME })}
				description={t('auth.signIn.CODE_DESCRIPTION')}
				className="mt-8 mb-7"
			/>
			<form className="flex flex-col gap-5" autoComplete="on" onSubmit={handleSendCode} noValidate>
				<AuthField
					id="passcode-email"
					type="email"
					name="email"
					label={t('auth.field.EMAIL_LABEL')}
					placeholder={t('auth.field.EMAIL_PLACEHOLDER')}
					icon={<Mail />}
					value={form.formValues.email}
					onChange={form.handleChange}
					error={emailError}
					autoComplete="email"
					inputMode="email"
					required
				/>
				<Button
					type="submit"
					loading={form.signInEmailLoading}
					disabled={form.signInEmailLoading}
					className="w-full max-sm:h-11"
				>
					{t('auth.signIn.SEND_CODE')}
				</Button>
			</form>
			<SocialLogins />
		</div>
	);
}

function PasscodeScreen({ form }: Readonly<{ form: TAuthenticationPasscode }>) {
	const t = useTranslations();
	const inputsRef = useRef<Array<HTMLInputElement>>([]);
	const formRef = useRef<HTMLFormElement>(null);
	const [codeFromLink] = useState(codeFromAddressBar);
	const email = form.formValues.email.trim();
	const isEverIdStep = Boolean(form.everIdConfirm);
	const isSubmitting = form.signInEmailConfirmLoading || form.everIdConfirmLoading;
	const codeError = codeErrorOf(form);

	const clearCode = () => {
		form.inputCodeRef.current?.clear();
	};

	const autoSubmitForm = () => {
		const submitEvent = new Event('submit', { cancelable: true, bubbles: true });
		formRef.current?.dispatchEvent(submitEvent);
	};

	const goBack = () => {
		// Leaving the Ever ID step drops its marker from the URL and empties the code
		form.leaveEverIdStep();
		form.authScreen.setScreen('email');
		form.setErrors({});
	};

	const resend = () => {
		const sending = form.sendAuthCodeHandler();
		sending?.catch(() => undefined);
	};

	let description: ReactNode = t.rich('auth.code.DESCRIPTION', {
		length: AUTH_CODE_LENGTH,
		email,
		address: renderAddress
	});
	if (isEverIdStep) {
		description = t('pages.auth.everId.CONFIRM_HINT');
	}

	const clearButton = (
		<button type="button" onClick={clearCode} className={cn(AUTH_QUIET_LINK, 'text-xs')}>
			{t('auth.code.CLEAR')}
		</button>
	);

	return (
		<div className="flex flex-col">
			<button type="button" onClick={goBack} className={cn(AUTH_QUIET_LINK, 'self-start')}>
				<ArrowLeft aria-hidden="true" />
				{t('auth.code.CHANGE_EMAIL')}
			</button>
			<AuthHeading
				mark={
					<AuthMark>
						<ShieldCheck />
					</AuthMark>
				}
				title={t('auth.code.TITLE')}
				description={description}
				className="mt-6 mb-7"
			/>
			<form
				ref={formRef}
				className="flex flex-col gap-5"
				onSubmit={form.handleCodeSubmit}
				autoComplete="off"
				noValidate
			>
				<AuthCodeField
					id="passcode-code"
					label={t('auth.code.LABEL')}
					labelAside={clearButton}
					status={form.status as AuthCodeStatus}
					error={codeError}
					codeRef={form.inputCodeRef}
					inputReference={inputsRef}
					defaultValue={form.formValues.code}
					autoComplete={codeFromLink}
					submitCode={autoSubmitForm}
					onChange={(code) => {
						form.setFormValues((values) => ({ ...values, code }));
					}}
				/>

				{!isEverIdStep && <ResendCode startLocked sending={form.signInEmailLoading} onResend={resend} />}

				<Button type="submit" loading={isSubmitting} disabled={isSubmitting} className="w-full max-sm:h-11">
					{t('auth.code.SUBMIT')}
				</Button>
			</form>
			<SocialLogins />
		</div>
	);
}

type WorkspaceSelection = {
	selectedWorkspace: number;
	setSelectedWorkspace: WorkspacePickerProps['setSelectedWorkspace'];
	selectedTeam: string;
	setSelectedTeam: WorkspacePickerProps['setSelectedTeam'];
};

function WorkSpaceScreen({
	form,
	selectedWorkspace,
	setSelectedWorkspace,
	selectedTeam,
	setSelectedTeam
}: Readonly<{ form: TAuthenticationPasscode } & WorkspaceSelection>) {
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
		// Auto-select first workspace if only one exists
		if (form.workspaces.length === 1) {
			setSelectedWorkspace(0);
		}

		const { firstWorkspace, firstWorkspaceHasTeams, firstWorkspaceTeamCount } = workspaceAnalysis;

		// Auto-select team if only one workspace with one team
		if (form.workspaces.length === 1 && firstWorkspaceTeamCount === 1 && firstWorkspaceHasTeams) {
			const firstTeamId = getFirstTeamId(firstWorkspace);
			if (firstTeamId) {
				setSelectedTeam(firstTeamId);
			}
		} else {
			// Try to restore last selected team or use default
			const storedTeam = window.localStorage.getItem(LAST_WORKSPACE_AND_TEAM);
			const fallbackTeamId = getFirstTeamId(firstWorkspace);
			const lastSelectedTeam =
				storedTeam || lastSelectedTeamFromAPI || form.defaultTeamId || fallbackTeamId || '';

			// Find workspace containing the last selected team
			const lastSelectedWorkspaceIndex = findWorkspaceIndexByTeamId(form.workspaces, lastSelectedTeam);

			// Only set selectedTeam if the team actually exists in current_teams
			if (lastSelectedWorkspaceIndex >= 0) {
				setSelectedTeam(lastSelectedTeam);
				setSelectedWorkspace(lastSelectedWorkspaceIndex);
			} else {
				// The user was removed from that team: keep the first workspace and no team, which avoids a 401
				setSelectedWorkspace(0);
				setSelectedTeam('');
			}
		}

		// Only auto-submit if shouldAutoSubmit is true (1 workspace with exactly 1 team)
		if (workspaceAnalysis.shouldAutoSubmit) {
			setTimeout(() => {
				document.getElementById('continue-to-workspace')?.click();
			}, 100);
		}
	}, [
		form.defaultTeamId,
		form.workspaces,
		lastSelectedTeamFromAPI,
		workspaceAnalysis,
		setSelectedTeam,
		setSelectedWorkspace
	]);

	useEffect(() => {
		if (form.authScreen.screen === 'workspace') {
			const accessToken = getAccessTokenCookie();
			if (accessToken && accessToken.length > 100) {
				router.refresh();
			}
		}
	}, [form.authScreen, router]);

	const { status, setStatus } = form;
	useEffect(() => {
		if (status === 'success') {
			const timeout = setTimeout(() => setStatus('idle'), 1500);
			return () => clearTimeout(timeout);
		}
	}, [status, setStatus]);

	const goBack = () => {
		form.leaveEverIdStep();
		form.authScreen.setScreen('email');
		form.setErrors({});
	};

	const workspaceName = workspaceNameOf(form.workspaces[selectedWorkspace]);

	return (
		<>
			{/* Kept mounted while it opens by itself (one workspace with one team): its Continue is clicked for the person */}
			<div className={cn('w-full', workspaceAnalysis.shouldAutoSubmit && 'hidden')}>
				<WorkspacePicker
					workspaces={form.workspaces}
					onSubmit={signInToWorkspace}
					onBackButtonClick={goBack}
					selectedWorkspace={selectedWorkspace}
					setSelectedWorkspace={setSelectedWorkspace}
					setSelectedTeam={setSelectedTeam}
					selectedTeam={selectedTeam}
					signInWorkspaceLoading={form.signInWorkspaceLoading}
					teamsUnavailable={form.everIdTeamsUnavailable}
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

/**
 * The workspace pick, kept under its former name: the password and social sign-ins import it from here.
 */
export function WorkSpaceComponent(props: Readonly<WorkspacePickerProps>) {
	return <WorkspacePicker {...props} />;
}

export default AuthPasscode;
