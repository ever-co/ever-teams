'use client';

import { getAccessTokenCookie } from '@/core/lib/helpers/index';
import { TAuthenticationPassword, useAuthenticationPassword } from '@/core/hooks';
import { IClassName } from '@/core/types/interfaces/common/class-name';
import { BackdropLoader, Button, Text } from '@/core/components';
import { AuthLayout } from '@/core/components/layouts/default-layout';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { WorkSpaceComponent } from '../passcode/page-component';
import SocialLogins from '@/core/components/auth/social-logins-buttons';
import {
	APP_NAME,
	LAST_WORKSPACE_AND_TEAM,
	USER_SAW_OUTSTANDING_NOTIFICATION
} from '@/core/constants/config/constants';
import { cn } from '@/core/lib/helpers';
import { EverCard } from '@/core/components/common/ever-card';
import { InputField } from '@/core/components/duplicated-components/_input';
import { Eye, EyeOff } from 'lucide-react';

export default function AuthPassword() {
	const t = useTranslations();
	const form = useAuthenticationPassword();

	return (
		<AuthLayout
			title={t('pages.authLogin.HEADING_TITLE', { appName: APP_NAME })}
			description={t('pages.authPassword.HEADING_DESCRIPTION')}
		>
			<div className="w-full md:w-[35rem] overflow-x-hidden overflow-y-clip">
				<div className={cn('flex flex-row duration-500 transition-[transform]')}>
					{form.authScreen.screen === 'login' && <LoginForm form={form} />}

					{form.authScreen.screen === 'workspace' && <WorkSpaceScreen form={form} className="w-full" />}
				</div>
			</div>
		</AuthLayout>
	);
}

function LoginForm({ form }: { form: TAuthenticationPassword }) {
	const t = useTranslations();
	const [showPassword, setShowPassword] = useState(false);

	const togglePasswordVisibility = useCallback(() => {
		setShowPassword(!showPassword);
	}, [showPassword]);

	return (
		<div className="w-full flex flex-col gap-4 bg-[#ffffff] dark:bg-transparent rounded-2xl">
			<EverCard className={cn('w-full dark:bg-[#25272D]')} shadow="bigger">
				<form onSubmit={form.handleSubmit} className="flex flex-col justify-between items-center">
					<Text.Heading as="h3" className="mb-10 text-center">
						{t('pages.authLogin.LOGIN_WITH_PASSWORD')}
					</Text.Heading>
					<div className="mb-8 w-full">
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
							trailingNode={
								<button
									type="button"
									className="px-4 text-xs font-normal text-gray-500 dark:text-gray-400"
									onClick={togglePasswordVisibility}
								>
									{showPassword ? (
										<Eye size={15} className="font-light" />
									) : (
										<EyeOff size={15} className="font-light" />
									)}
								</button>
							}
						/>

						<Text.Error className="justify-self-start self-start">{form.errors.loginFailed}</Text.Error>
					</div>

					<div className="flex justify-between items-center w-full">
						<div className="flex flex-col gap-2 items-start">
							<div className="flex gap-2 justify-start items-center text-sm">
								<Link href="/auth/passcode" className="text-primary dark:text-primary-light">
									{t('pages.authLogin.LOGIN_WITH_MAGIC_CODE')}.
								</Link>
							</div>

							<div className="flex gap-2 justify-start items-center text-sm">
								<span>{t('common.DONT_HAVE_ACCOUNT')}</span>
								<Link href="/auth/team" className="text-primary dark:text-primary-light">
									<span>{t('common.REGISTER')}</span>
								</Link>
							</div>
						</div>

						<Button type="submit" loading={form.signInLoading} disabled={form.signInLoading}>
							{t('common.CONTINUE')}
						</Button>
					</div>
				</form>
			</EverCard>
			<div className="bg-[#f2f2f2] dark:bg-transparent">
				<SocialLogins />
			</div>
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

	const hasMultipleTeams = useMemo(
		() => form.workspaces.some((workspace) => workspace.current_teams.length > 1),
		[form.workspaces]
	);

	useEffect(() => {
		if (form.workspaces.length === 1 && !hasMultipleTeams) {
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
			setSelectedWorkspace(
				form.workspaces.findIndex((el) => el.current_teams.find((el) => el.team_id == lastSelectedTeamId)) || 0
			);
			setSelectedTeam(lastSelectedTeamId);
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
			{/* The workspace component will be visible only if there are two or many workspaces and/or teams */}
			<div className={cn(`${form.workspaces.length === 1 && !hasMultipleTeams ? 'hidden' : ''}`, 'w-full')}>
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

			{/* If the user is a member of only one workspace and only one team, render a redirecting component */}
			{form.workspaces.length === 1 && !hasMultipleTeams && (
				<div>
					<BackdropLoader show={true} title={t('pages.authTeam.REDIRECT_TO_WORSPACE_LOADING')} />
				</div>
			)}
		</>
	);
}
