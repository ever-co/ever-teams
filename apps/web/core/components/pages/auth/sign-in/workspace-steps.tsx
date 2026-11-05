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
import { getFirstTeamId, findWorkspaceIndexByTeamId } from '@/core/lib/utils/workspace.utils';
import { useWorkspaceAnalysis } from '@/core/hooks/auth/use-workspace-analysis';
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

/** The picker, or the opening state when one workspace with one team opens by itself. */
function WorkspaceChoice({
	workspaces,
	shouldAutoSubmit,
	onSubmit,
	onBack,
	loading,
	teamsUnavailable,
	selection
}: Readonly<{
	workspaces: ISigninEmailConfirmWorkspaces[];
	shouldAutoSubmit: boolean;
	onSubmit: FormEventHandler<HTMLFormElement>;
	onBack: () => void;
	loading?: boolean;
	teamsUnavailable?: boolean;
	selection: WorkspaceSelection;
}>) {
	const t = useTranslations();
	const workspaceName = workspaceNameOf(workspaces[selection.selectedWorkspace]);

	return (
		<>
			{/* Kept mounted while it opens by itself (one workspace with one team): its Continue is clicked for the person */}
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

	const signInToWorkspace = useCallback(
		(e: FormEvent<HTMLFormElement>) => {
			if (typeof selectedWorkspace !== 'undefined') {
				form.handleWorkspaceSubmit(e, form.workspaces[selectedWorkspace].token, selectedTeam);
				rememberTeam(selectedTeam);
			}
		},
		[selectedWorkspace, selectedTeam, form]
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
			// Try to restore last selected team or use default
			const storedTeam = window.localStorage.getItem(LAST_WORKSPACE_AND_TEAM);
			const fallbackTeamId = getFirstTeamId(firstWorkspace);
			const lastSelectedTeam =
				storedTeam || lastSelectedTeamFromAPI || form.defaultTeamId || fallbackTeamId || '';

			const lastSelectedWorkspaceIndex = findWorkspaceIndexByTeamId(form.workspaces, lastSelectedTeam);

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
			shouldAutoSubmit={workspaceAnalysis.shouldAutoSubmit}
			onSubmit={signInToWorkspace}
			onBack={goBack}
			loading={form.signInWorkspaceLoading}
			teamsUnavailable={form.everIdTeamsUnavailable}
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

	const signInToWorkspace = useCallback(
		(e: FormEvent<HTMLFormElement>) => {
			if (typeof selectedWorkspace !== 'undefined') {
				form.handleWorkspaceSubmit(e, form.workspaces[selectedWorkspace].token, selectedTeam);
				rememberTeam(selectedTeam);
			}
		},
		[selectedWorkspace, selectedTeam, form]
	);

	const lastSelectedTeamFromAPI = form.getLastTeamIdWithRecentLogout();
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

	useRefreshWithToken(form.authScreen.screen === 'workspace');

	const goBack = () => {
		form.authScreen.setScreen('login');
		form.setErrors({});
	};

	return (
		<WorkspaceChoice
			workspaces={form.workspaces}
			shouldAutoSubmit={workspaceAnalysis.shouldAutoSubmit}
			onSubmit={signInToWorkspace}
			onBack={goBack}
			loading={form.signInWorkspaceLoading}
			selection={selection}
		/>
	);
}
