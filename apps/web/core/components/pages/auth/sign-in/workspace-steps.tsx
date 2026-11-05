'use client';

import {
	useCallback,
	useEffect,
	type Dispatch,
	type FormEvent,
	type FormEventHandler,
	type SetStateAction
} from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type { TAuthenticationPasscode } from '@/core/hooks/auth/use-authentication-passcode';
import type { TAuthenticationPassword } from '@/core/hooks/auth/use-authentication-password';
import { getAccessTokenCookie } from '@/core/lib/helpers/index';
import { LAST_WORKSPACE_AND_TEAM, USER_SAW_OUTSTANDING_NOTIFICATION } from '@/core/constants/config/constants';
import { getFirstTeamId } from '@/core/lib/utils/workspace.utils';
import { useWorkspaceAnalysis } from '@/core/hooks/auth/use-workspace-analysis';
import { useRememberedTeamContinue } from '@/core/hooks/auth/use-remembered-team-continue';
import { firstListedTeam } from '@/core/lib/auth/remembered-team';
import { AuthState } from '@/core/components/auth/kit/auth-state';
import { WorkspacePicker, workspaceNameOf } from '@/core/components/auth/workspace-picker';
import type { ISigninEmailConfirmWorkspaces } from '@/core/types/interfaces/auth/auth';
import { cn } from '@/core/lib/helpers';

export type WorkspaceSelection = {
	selectedWorkspace: number;
	setSelectedWorkspace: Dispatch<SetStateAction<number>>;
	selectedTeam: string;
	setSelectedTeam: Dispatch<SetStateAction<string>>;
};

/** The picker, or the opening state when a team opens by itself (the only team, or the remembered one). */
function WorkspaceChoice({
	workspaces,
	shouldAutoSubmit,
	onSubmit,
	onBack,
	loading,
	teamsUnavailable,
	notSetUpIndices,
	selection
}: Readonly<{
	workspaces: ISigninEmailConfirmWorkspaces[];
	shouldAutoSubmit: boolean;
	onSubmit: FormEventHandler<HTMLFormElement>;
	onBack: () => void;
	loading?: boolean;
	teamsUnavailable?: boolean;
	notSetUpIndices?: readonly number[];
	selection: WorkspaceSelection;
}>) {
	const t = useTranslations();
	const workspaceName = workspaceNameOf(workspaces[selection.selectedWorkspace]);

	return (
		<>
			{/* Kept mounted while a team opens by itself: its Continue is clicked for the person */}
			<div className={cn('w-full', shouldAutoSubmit && 'hidden')}>
				<WorkspacePicker
					workspaces={workspaces}
					onSubmit={onSubmit}
					onBackButtonClick={onBack}
					selectedWorkspace={selection.selectedWorkspace}
					setSelectedWorkspace={selection.setSelectedWorkspace}
					setSelectedTeam={selection.setSelectedTeam}
					selectedTeam={selection.selectedTeam}
					signInWorkspaceLoading={loading}
					teamsUnavailable={teamsUnavailable}
					notSetUpIndices={notSetUpIndices}
				/>
			</div>

			{shouldAutoSubmit && (
				<AuthState
					tone="loading"
					title={t('auth.workspace.OPENING')}
					description={t('auth.workspace.OPENING_TEXT', { workspace: workspaceName })}
				/>
			)}
		</>
	);
}

function rememberTeam(selectedTeam: string) {
	window?.localStorage.removeItem(USER_SAW_OUTSTANDING_NOTIFICATION);
	window?.localStorage.setItem(LAST_WORKSPACE_AND_TEAM, selectedTeam);
}

function useRefreshWithToken(isWorkspaceScreen: boolean) {
	const router = useRouter();
	useEffect(() => {
		if (!isWorkspaceScreen) {
			return;
		}
		const accessToken = getAccessTokenCookie();
		if (accessToken && accessToken.length > 100) {
			router.refresh();
		}
	}, [isWorkspaceScreen, router]);
}

/** The workspace pick after a code sign-in. */
export function CodeWorkspaceStep({
	form,
	selection
}: Readonly<{ form: TAuthenticationPasscode; selection: WorkspaceSelection }>) {
	const { selectedWorkspace, setSelectedWorkspace, selectedTeam, setSelectedTeam } = selection;
	const rememberedTeam = useRememberedTeamContinue({ workspaces: form.workspaces, email: form.formValues.email });
	const rememberedTeamId = rememberedTeam.rememberedPick?.teamId;
	const { onContinueFailed } = rememberedTeam;

	const signInToWorkspace = useCallback(
		(e: FormEvent<HTMLFormElement>) => {
			if (typeof selectedWorkspace !== 'undefined') {
				form.handleWorkspaceSubmit(e, form.workspaces[selectedWorkspace].token, selectedTeam, onContinueFailed);
				rememberTeam(selectedTeam);
			}
		},
		[selectedWorkspace, selectedTeam, form, onContinueFailed]
	);

	const lastSelectedTeamFromAPI = form.getLastTeamIdWithRecentLogout();
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
			const storedTeam = window.localStorage.getItem(LAST_WORKSPACE_AND_TEAM);
			const fallbackTeamId = getFirstTeamId(firstWorkspace);
			const listedTeam = firstListedTeam(form.workspaces, [
				rememberedTeamId,
				storedTeam,
				lastSelectedTeamFromAPI,
				form.defaultTeamId,
				fallbackTeamId
			]);

			if (listedTeam) {
				setSelectedTeam(listedTeam.teamId);
				setSelectedWorkspace(listedTeam.workspaceIndex);
			} else {
				// No team to sign in with: an empty team is sent instead of one Gauzy would refuse
				setSelectedWorkspace(0);
				setSelectedTeam('');
			}
		}
	}, [
		form.defaultTeamId,
		form.workspaces,
		lastSelectedTeamFromAPI,
		rememberedTeamId,
		workspaceAnalysis,
		setSelectedTeam,
		setSelectedWorkspace
	]);

	useRefreshWithToken(form.authScreen.screen === 'workspace');

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

	return (
		<WorkspaceChoice
			workspaces={form.workspaces}
			shouldAutoSubmit={rememberedTeam.autoContinue}
			onSubmit={signInToWorkspace}
			onBack={goBack}
			loading={form.signInWorkspaceLoading}
			teamsUnavailable={form.everIdTeamsUnavailable}
			notSetUpIndices={form.everIdTenantless}
			selection={selection}
		/>
	);
}

/** The workspace pick after a password sign-in (its first pick follows the password page's own rules). */
export function PasswordWorkspaceStep({
	form,
	selection
}: Readonly<{ form: TAuthenticationPassword; selection: WorkspaceSelection }>) {
	const { selectedWorkspace, setSelectedWorkspace, selectedTeam, setSelectedTeam } = selection;
	const rememberedTeam = useRememberedTeamContinue({ workspaces: form.workspaces, email: form.formValues.email });
	const rememberedTeamId = rememberedTeam.rememberedPick?.teamId;
	const { onContinueFailed } = rememberedTeam;

	const signInToWorkspace = useCallback(
		(e: FormEvent<HTMLFormElement>) => {
			if (typeof selectedWorkspace !== 'undefined') {
				form.handleWorkspaceSubmit(e, form.workspaces[selectedWorkspace].token, selectedTeam, onContinueFailed);
				rememberTeam(selectedTeam);
			}
		},
		[selectedWorkspace, selectedTeam, form, onContinueFailed]
	);

	const lastSelectedTeamFromAPI = form.getLastTeamIdWithRecentLogout();

	useEffect(() => {
		// The selection outlives this step: another account's answer must not keep an index of the last one
		setSelectedWorkspace(0);
		setSelectedTeam('');

		const currentTeams = form.workspaces.find((el) => el.current_teams && el.current_teams.length)?.current_teams;
		const firstTeamId = currentTeams?.[0]?.team_id;
		const storedTeam = window.localStorage.getItem(LAST_WORKSPACE_AND_TEAM);
		// A team the user was removed from is skipped: signing in to it answers 401
		const listedTeam = firstListedTeam(form.workspaces, [
			rememberedTeamId,
			storedTeam,
			lastSelectedTeamFromAPI,
			form.defaultTeamId,
			firstTeamId
		]);

		if (listedTeam) {
			setSelectedWorkspace(listedTeam.workspaceIndex);
			setSelectedTeam(listedTeam.teamId);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [form.workspaces]);

	useRefreshWithToken(form.authScreen.screen === 'workspace');

	const goBack = () => {
		form.authScreen.setScreen('login');
		form.setErrors({});
	};

	return (
		<WorkspaceChoice
			workspaces={form.workspaces}
			shouldAutoSubmit={rememberedTeam.autoContinue}
			onSubmit={signInToWorkspace}
			onBack={goBack}
			loading={form.signInWorkspaceLoading}
			selection={selection}
		/>
	);
}
