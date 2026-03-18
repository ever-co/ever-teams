'use client';

import { getAccessTokenCookie } from '@/core/lib/helpers/index';
import { TAuthenticationPassword, useAuthenticationPassword } from '@/core/hooks';
import { IClassName } from '@/core/types/interfaces/common/class-name';
import { BackdropLoader, Button, Text } from '@/core/components';
import { AuthLayout } from '@/core/components/layouts/default-layout';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { WorkSpaceComponent } from '../passcode/page-component';
import SocialLogins from '@/core/components/auth/social-logins-buttons';
import {
	APP_NAME,
	DEFAULT_APP_PATH,
	IS_DEMO_MODE,
	LAST_WORKSPACE_AND_TEAM,
	USER_SAW_OUTSTANDING_NOTIFICATION
} from '@/core/constants/config/constants';
import { cn } from '@/core/lib/helpers';
import { logErrorInDev } from '@/core/lib/helpers/error-message';
import { InputField } from '@/core/components/duplicated-components/_input';
import { Eye, EyeOff } from 'lucide-react';
import { useWorkspaceAnalysis } from '@/core/hooks/auth/use-workspace-analysis';
import { DemoAccountsSection } from '@/core/components/auth/demo-accounts-section';
import { DemoCredentialsDropdown } from '@/core/components/auth/demo-credentials-dropdown';

export default function AuthPassword() {
	const t = useTranslations();
	const form = useAuthenticationPassword();

	return (
		<AuthLayout
			title={t('pages.authLogin.HEADING_TITLE', { appName: APP_NAME })}
			description={t('pages.authPassword.HEADING_DESCRIPTION')}
			headerLinkText={t('common.REGISTER')}
			headerLinkHref="/auth/signup"
		>
			<div className="overflow-x-hidden w-full p-1.5">
				<div className="w-full duration-500 transition-[transform] mb-3">
					{form.authScreen.screen === 'login' && <LoginForm form={form} />}

					{form.authScreen.screen === 'workspace' && <WorkSpaceScreen form={form} className="w-full" />}
				</div>
			</div>
		</AuthLayout>
	);
}

/**
 * LoginFormFields Component
 *
 * Reusable form fields for email and password inputs.
 * Eliminates code duplication between DEMO and NORMAL modes.
 *
 * @param form - Authentication form state and handlers
 * @param showPassword - Whether to show password in plain text
 * @param togglePasswordVisibility - Function to toggle password visibility
 * @param t - Translation function from next-intl
 * @param required - Whether fields are required (default: false)
 */
interface LoginFormFieldsProps {
	form: TAuthenticationPassword;
	showPassword: boolean;
	togglePasswordVisibility: () => void;
	t: ReturnType<typeof useTranslations>;
	required?: boolean;
}

const INPUT_CLASS =
	'dark:bg-foreground/5 ring-foreground/10 placeholder:text-muted-foreground/75 selection:bg-primary selection:text-primary-foreground flex h-9 w-full min-w-0 rounded-md border border-transparent bg-white px-3 py-1 text-base shadow-sm outline-none ring-1 transition-[color,box-shadow] md:text-sm focus-visible:border-foreground/35 focus-visible:ring-ring/25 dark:focus-visible:border-foreground/25 focus-visible:ring-[3px]';

function LoginFormFields({
	form,
	showPassword,
	togglePasswordVisibility,
	t,
	required = false
}: LoginFormFieldsProps) {
	return (
		<div className="space-y-4">
			<div className="space-y-2.5">
				<label data-slot="label" className="block text-sm font-medium leading-none select-none" htmlFor="pw-email">
					{t('form.EMAIL_PLACEHOLDER')}
				</label>
				<InputField
					id="pw-email"
					name="email"
					type="email"
					placeholder={t('form.EMAIL_PLACEHOLDER')}
					value={form.formValues.email}
					errors={form.errors}
					onChange={form.handleChange}
					autoComplete="off"
					noWrapper
					className={INPUT_CLASS}
					required={required}
				/>
				{form.errors?.email && <Text.Error className="text-xs">{form.errors.email}</Text.Error>}
			</div>

			<div className="space-y-2.5">
				<label data-slot="label" className="block text-sm font-medium leading-none select-none" htmlFor="pw-password">
					{t('form.PASSWORD_PLACEHOLDER')}
				</label>
				<div className="relative">
					<InputField
						id="pw-password"
						type={showPassword ? 'text' : 'password'}
						name="password"
						placeholder={t('form.PASSWORD_PLACEHOLDER')}
						value={form.formValues.password}
						errors={form.errors}
						onChange={form.handleChange}
						autoComplete="off"
						noWrapper
						className={cn(INPUT_CLASS, 'pr-10')}
						required={required}
					/>
					<button
						type="button"
						className="absolute right-3 top-1/2 transition-colors -translate-y-1/2 cursor-pointer text-muted-foreground hover:text-foreground"
						onClick={togglePasswordVisibility}
					>
						{showPassword ? <Eye size={16} /> : <EyeOff size={16} />}
					</button>
				</div>
				{form.errors?.password && <Text.Error className="text-xs">{form.errors.password}</Text.Error>}
			</div>

			{form.errors.loginFailed && <Text.Error className="text-xs">{form.errors.loginFailed}</Text.Error>}
		</div>
	);
}

/**
 * LoginFormActions Component
 *
 * Reusable form actions section with Register link and Continue button.
 * Uses the better design from DEMO mode
 *
 * @param form - Authentication form state for loading state
 * @param t - Translation function from next-intl
 * @param showMagicCodeLink - Whether to show the "Login with Magic Code" link (default: false, hidden in DEMO mode)
 */
interface LoginFormActionsProps {
	form: TAuthenticationPassword;
	t: ReturnType<typeof useTranslations>;
	showMagicCodeLink?: boolean;
}

function LoginFormActions({ form, t, showMagicCodeLink = false }: LoginFormActionsProps) {
	return (
		<>
			{/* Continue Button — template exact classes */}
			<Button
				type="submit"
				loading={form.signInLoading}
				disabled={form.signInLoading}
				className="cursor-pointer inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow-md border-[0.5px] border-white/10 shadow-black/15 [&_svg]:drop-shadow-sm bg-primary ring-1 ring-(--ring-color) [--ring-color:color-mix(in_oklab,black_15%,var(--color-primary))] dark:border-transparent dark:[--ring-color:color-mix(in_oklab,white_15%,var(--color-primary))] text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2 w-full"
			>
				{t('common.CONTINUE')}
			</Button>

			{/* Links — after button, template mt-10 */}
			<div className="mt-3 space-y-2 text-sm text-muted-foreground">
				<div className="flex gap-2 justify-between items-center">
					<span>{t('pages.authLogin.HAVE_PASSWORD')}</span>
					<Link href="/auth/forgot-password" className="font-medium text-primary hover:underline">
						{t('pages.auth.FORGOT_PASSWORD')}
					</Link>
				</div>

				{/* Magic Code Link - Only shown in NORMAL mode */}
				{showMagicCodeLink && (
					<div className="text-center">
						<Link href={DEFAULT_APP_PATH} className="font-medium text-primary hover:underline">
							{t('pages.authLogin.LOGIN_WITH_MAGIC_CODE')}
						</Link>
					</div>
				)}
			</div>
		</>
	);
}

function LoginForm({ form }: { form: TAuthenticationPassword }) {
	const t = useTranslations();
	const [showPassword, setShowPassword] = useState(false);

	const togglePasswordVisibility = useCallback(() => {
		setShowPassword(!showPassword);
	}, [showPassword]);

	/**
	 * Handle demo account auto-login
	 * Fills the form with demo credentials and submits automatically
	 * FIX: Use functional setState to ensure values are set before submission
	 */
	const handleDemoLogin = useCallback(
		(email: string, password: string) => {
			// Clear any existing errors first
			form.setErrors({});

			// Update form values with demo credentials
			form.setFormValues({
				email,
				password
			});

			// Use a longer delay to ensure DOM is updated and validation passes
			// This fixes the "Please fill out this field" error on first click
			setTimeout(() => {
				// Trigger form submission programmatically
				// Find the form element and submit it
				const formElement = document.querySelector('form');
				if (formElement) {
					// Create a proper submit event
					const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
					formElement.dispatchEvent(submitEvent);
				} else {
					// Log error in development mode only for debugging
					logErrorInDev('Demo Auto-Login', 'Form element not found - cannot submit login form');
				}
			}, 200);
		},
		[form]
	);

	/**
	 * Handle credential selection from dropdown
	 * Only fills the form, does NOT auto-submit
	 */
	const handleCredentialSelect = useCallback(
		(email: string, password: string) => {
			// Clear any existing errors first
			form.setErrors({});

			// Update form values with selected credentials
			form.setFormValues({
				email,
				password
			});
		},
		[form]
	);

	return (
		<div className="w-full">
			{/* Demo Mode: Two-column layout */}
			{IS_DEMO_MODE ? (
				<div className="flex flex-row gap-6 justify-start items-start">
					{/* Left: Login Form with Dropdown */}
					<div className="flex-1 min-w-0">
						<form onSubmit={form.handleSubmit} className="space-y-6">
							<div className="flex gap-3 justify-between items-start">
								<DemoCredentialsDropdown
									onCredentialSelect={handleCredentialSelect}
									className="px-3 w-fit text-nowrap min-w-36"
								/>
							</div>
							<LoginFormFields
								form={form}
								showPassword={showPassword}
								togglePasswordVisibility={togglePasswordVisibility}
								t={t}
								required={true}
							/>
							<LoginFormActions form={form} t={t} showMagicCodeLink={false} />
						</form>
					</div>

					{/* Right: Demo Accounts Quick Access */}
					<div className="w-[35%] shrink-0">
						<DemoAccountsSection onDemoLogin={handleDemoLogin} />
					</div>
				</div>
			) : (
				/* Normal Mode: Single column layout */
				<div className="space-y-6">
					<form onSubmit={form.handleSubmit} className="space-y-6">
						<LoginFormFields
							form={form}
							showPassword={showPassword}
							togglePasswordVisibility={togglePasswordVisibility}
							t={t}
							required={false}
						/>
						<LoginFormActions form={form} t={t} showMagicCodeLink={true} />
					</form>

					<SocialLogins />
				</div>
			)}
		</div>
	);
}

function WorkSpaceScreen({ form, className }: { form: TAuthenticationPassword } & IClassName) {
	const t = useTranslations();
	const [selectedWorkspace, setSelectedWorkspace] = useState<number>(0);
	const [selectedTeam, setSelectedTeam] = useState('');
	const router = useRouter();

	const signInToWorkspace = useCallback(
		(e: any) => {
			if (typeof selectedWorkspace !== 'undefined') {
				form.handleWorkspaceSubmit(e, form.workspaces[selectedWorkspace].token, selectedTeam);
				window && window?.localStorage.removeItem(USER_SAW_OUTSTANDING_NOTIFICATION);
				window && window?.localStorage.setItem(LAST_WORKSPACE_AND_TEAM, selectedTeam);
			}
		},
		[selectedWorkspace, selectedTeam, form]
	);

	const lastSelectedTeamFromAPI = form.getLastTeamIdWithRecentLogout();

	// Analyze workspace structure to determine if we should show workspace selection
	// Using centralized hook to avoid code duplication across auth components
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

			// Only set selectedTeam if the team actually exists in current_teams
			if (workspaceIndex >= 0) {
				setSelectedWorkspace(workspaceIndex);
				setSelectedTeam(lastSelectedTeamId);
			}
			// If team doesn't exist (user was removed from team), don't set selectedTeam
			// This prevents 401 errors when trying to sign in with a non-existent team
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

	return (
		<>
			{/* Show workspace component unless we're auto-submitting (1 workspace with exactly 1 team) */}
			<div className={cn(`${workspaceAnalysis.shouldAutoSubmit ? 'hidden' : ''}`, 'w-full')}>
				<WorkSpaceComponent
					className={className}
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

			{/* Only show loader when auto-submitting (1 workspace with exactly 1 team) */}
			{workspaceAnalysis.shouldAutoSubmit && (
				<div>
					<BackdropLoader show={true} title={t('pages.authTeam.REDIRECT_TO_WORSPACE_LOADING')} />
				</div>
			)}
		</>
	);
}
