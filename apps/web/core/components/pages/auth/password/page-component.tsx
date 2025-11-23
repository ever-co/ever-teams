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
import { EverCard } from '@/core/components/common/ever-card';
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
		>
			<div className={cn("w-full md:min-w-[26rem] md:w-fit max-w-[450px] overflow-x-hidden overflow-y-clip", IS_DEMO_MODE && '!min-w-fit')}>
				<div className={cn('flex flex-row w-full duration-500 transition-[transform]')}>
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

function LoginFormFields({
	form,
	showPassword,
	togglePasswordVisibility,
	t,
	required = false
}: LoginFormFieldsProps) {
	return (
		<>
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
				required={required}
			/>

			<InputField
				type={showPassword ? 'text' : 'password'}
				name="password"
				placeholder={t('form.PASSWORD_PLACEHOLDER')}
				className="dark:bg-[#25272D]"
				wrapperClassName="mb-5 dark:bg-[#25272D]"
				value={form.formValues.password}
				errors={form.errors}
				onChange={form.handleChange}
				autoComplete="off"
				required={required}
				trailingNode={
					<button
						type="button"
						className="px-4 text-xs font-normal text-gray-500 dark:text-gray-400"
						onClick={togglePasswordVisibility}
					>
						{showPassword ? <Eye size={15} className="font-light" /> : <EyeOff size={15} className="font-light" />}
					</button>
				}
			/>

			<Text.Error className="justify-self-start self-start">{form.errors.loginFailed}</Text.Error>
		</>
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
		<div className="flex flex-col gap-2 items-center w-full">
			{/* Register Link - Better design with justify-between */}
			<div className="flex gap-3 justify-between items-center mb-3 w-full text-sm">
				<span>{t('common.DONT_HAVE_ACCOUNT')}</span>
				<Link href="/auth/team" className="underline whitespace-nowrap text-primary dark:text-primary-light text-nowrap">
					<span>{t('common.REGISTER')}</span>
				</Link>
			</div>

			{/* Continue Button - Full width for better UX */}
			<Button type="submit" loading={form.signInLoading} disabled={form.signInLoading} className="w-full">
				{t('common.CONTINUE')}
			</Button>

			{/* Magic Code Link - Only shown in NORMAL mode */}
			{showMagicCodeLink && (
				<div className="flex gap-2 justify-start items-center mb-2 w-full text-sm">
					<Link href={DEFAULT_APP_PATH} className="text-sm font-medium underline text-primary dark:text-primary-light">
						{t('pages.authLogin.LOGIN_WITH_MAGIC_CODE')}.
					</Link>
				</div>
			)}

		</div>
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
		<div className="flex flex-col gap-4 w-full rounded-2xl">
			{/* Demo Mode: Two-column layout */}
			{IS_DEMO_MODE ? (
				<div className="flex flex-row gap-3 justify-start items-start p-3 w-fit">
					{/* Left: Login Form with Dropdown - 65% width */}
					<div className="w-[65%] flex flex-col gap-4">
						<EverCard
							className={cn('w-full dark:bg-[#25272D] bg-[#ffffff] min-w-[360px] min-h-[388px]')}
							shadow="bigger"
						>
							<form onSubmit={form.handleSubmit} className="flex flex-col justify-between items-center">
								<div className="flex gap-3 justify-between items-start mb-3 w-full">
									<Text.Heading as="h3" className="mb-6 text-left">
										{t('pages.authLogin.LOGIN_WITH_PASSWORD')}
									</Text.Heading>

									{/* Demo Credentials Dropdown - Above form fields */}
									<DemoCredentialsDropdown
										onCredentialSelect={handleCredentialSelect}
										className="px-3 w-fit text-nowrap min-w-36"
									/>
								</div>
								<div className="mb-6 w-full">
									<LoginFormFields
										form={form}
										showPassword={showPassword}
										togglePasswordVisibility={togglePasswordVisibility}
										t={t}
										required={true}
									/>
								</div>

								<LoginFormActions form={form} t={t} showMagicCodeLink={false} />
							</form>
						</EverCard>
					</div>

					{/* Right: Demo Accounts Quick Access - 35% width */}
					<div className="w-[35%] shrink-0">
						<DemoAccountsSection onDemoLogin={handleDemoLogin} />
					</div>
				</div>
			) : (
				/* Normal Mode: Single column layout */
				<>
					<EverCard
						className={cn('w-full dark:bg-[#25272D] bg-[#ffffff] min-w-[360px] min-h-[388px]')}
						shadow="bigger"
					>
						<form onSubmit={form.handleSubmit} className="flex flex-col justify-between items-center">
							<Text.Heading as="h3" className="mb-10 text-center">
								{t('pages.authLogin.LOGIN_WITH_PASSWORD')}
							</Text.Heading>
							<div className="mb-6 w-full">
								<LoginFormFields
									form={form}
									showPassword={showPassword}
									togglePasswordVisibility={togglePasswordVisibility}
									t={t}
									required={false}
								/>
							</div>

							<LoginFormActions form={form} t={t} showMagicCodeLink={true} />
						</form>
					</EverCard>

					<div className="bg-[#f2f2f2] dark:bg-transparent">
						<SocialLogins />
					</div>
				</>
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
