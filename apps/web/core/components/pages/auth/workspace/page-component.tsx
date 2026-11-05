'use client';

import { AuthLayout } from '@/core/components/layouts/default-layout/auth-layout';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { WorkSpaceComponent } from '../passcode/page-component';
import { useAuthenticationSocialLogin } from '@/core/hooks/auth/use-authentication-social-login';
import Cookies from 'js-cookie';
import { useSession } from 'next-auth/react';
import { LAST_WORKSPACE_AND_TEAM, USER_SAW_OUTSTANDING_NOTIFICATION } from '@/core/constants/config/constants';
import { ISigninEmailConfirmWorkspaces } from '@/core/types/interfaces/auth/auth';
import { getFirstTeamId, findWorkspaceIndexByTeamId } from '@/core/lib/utils/workspace.utils';
import { useWorkspaceAnalysis } from '@/core/hooks/auth/use-workspace-analysis';
import { readEverIdSession } from '@/core/lib/auth/ever-id/session';
import { readSocialSession } from '@/core/lib/auth/social-session';
import { useEverIdWorkspaceChoice } from '@/core/hooks/auth/use-ever-id-workspace-choice';
import { PickedWorkspaceScene } from '@/core/components/auth/scenes/auth-scenes';

/** The workspace pick after a social or Ever ID sign-in, with the workspace and team it opens beside it. */
export default function SocialLoginChooseWorspace() {
	const t = useTranslations();
	const [workspaces, setWorkspaces] = useState<ISigninEmailConfirmWorkspaces[]>([]);
	const [selectedWorkspace, setSelectedWorkspace] = useState<number>(0);
	const [selectedTeam, setSelectedTeam] = useState('');

	return (
		<AuthLayout
			aside={
				<PickedWorkspaceScene
					title={t('auth.scene.WORKSPACE_TITLE')}
					description={t('auth.scene.WORKSPACE_TEXT')}
					workspaces={workspaces}
					selectedWorkspace={selectedWorkspace}
					selectedTeam={selectedTeam}
				/>
			}
		>
			<WorkSpaceScreen
				workspaces={workspaces}
				setWorkspaces={setWorkspaces}
				selectedWorkspace={selectedWorkspace}
				setSelectedWorkspace={setSelectedWorkspace}
				selectedTeam={selectedTeam}
				setSelectedTeam={setSelectedTeam}
			/>
		</AuthLayout>
	);
}

type WorkspaceScreenProps = {
	workspaces: ISigninEmailConfirmWorkspaces[];
	setWorkspaces: Dispatch<SetStateAction<ISigninEmailConfirmWorkspaces[]>>;
	selectedWorkspace: number;
	setSelectedWorkspace: Dispatch<SetStateAction<number>>;
	selectedTeam: string;
	setSelectedTeam: Dispatch<SetStateAction<string>>;
};

function WorkSpaceScreen({
	workspaces,
	setWorkspaces,
	selectedWorkspace,
	setSelectedWorkspace,
	selectedTeam,
	setSelectedTeam
}: Readonly<WorkspaceScreenProps>) {
	const router = useRouter();
	const form = useAuthenticationSocialLogin();
	const { data: session }: any = useSession();
	const [signinResult, setSigninResult] = useState({
		access_token: '',
		confirmed_mail: '',
		organizationId: '',
		refresh_token: {
			token: '',
			decoded: undefined
		},
		tenantId: '',
		userId: ''
	});

	useEffect(() => {
		const loadOAuthSession = async () => {
			const social = readSocialSession(session);
			if (social) {
				const { access_token, confirmed_mail, organizationId, refresh_token, tenantId, userId } = social;
				setSigninResult({ access_token, confirmed_mail, organizationId, refresh_token, tenantId, userId });
				setWorkspaces(Array.isArray(social.workspaces) ? social.workspaces : []);
			} else {
				return;
			}
		};
		void loadOAuthSession();
	}, [session, setWorkspaces]);

	// Ever ID: the sign-in left the workspace list in the session (no Gauzy token yet: the workspace sign-in
	// below makes it). Runs after the effect above, so its values are the ones kept.
	const everIdSession = useMemo(() => readEverIdSession(session), [session]);
	useEffect(() => {
		if (!everIdSession) return;
		setSigninResult((current) => ({ ...current, confirmed_mail: everIdSession.confirmedEmail }));
		setWorkspaces(everIdSession.workspaces);
	}, [everIdSession, setWorkspaces]);

	// Analyze workspace structure to determine if we should show workspace selection
	// Using centralized hook to avoid code duplication across auth components
	const workspaceAnalysis = useWorkspaceAnalysis(workspaces);

	useEffect(() => {
		// Auto-select first workspace if only one exists
		if (workspaces.length === 1) {
			setSelectedWorkspace(0);
		}

		const { firstWorkspace, firstWorkspaceHasTeams, firstWorkspaceTeamCount } = workspaceAnalysis;

		// Auto-select team if only one workspace with one team
		if (workspaces.length === 1 && firstWorkspaceTeamCount === 1 && firstWorkspaceHasTeams) {
			const firstTeamId = getFirstTeamId(firstWorkspace);
			if (firstTeamId) {
				setSelectedTeam(firstTeamId);
			}
		} else {
			// Try to restore last selected team or use default
			const storedTeam = window.localStorage.getItem(LAST_WORKSPACE_AND_TEAM);
			const fallbackTeamId = getFirstTeamId(firstWorkspace);
			const lastSelectedTeam = storedTeam || fallbackTeamId || '';

			// Find workspace containing the last selected team
			const lastSelectedWorkspaceIndex = findWorkspaceIndexByTeamId(workspaces, lastSelectedTeam);

			// Only set selectedTeam if the team actually exists in current_teams
			if (lastSelectedWorkspaceIndex >= 0) {
				setSelectedTeam(lastSelectedTeam);
				setSelectedWorkspace(lastSelectedWorkspaceIndex);
			} else {
				// Team doesn't exist (user was removed from team)
				// Set workspace to first one but leave selectedTeam empty
				// This prevents 401 errors when trying to sign in with a non-existent team
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
	}, [workspaces, workspaceAnalysis, setSelectedTeam, setSelectedWorkspace]);

	// Ever ID: start on the workspace the ID token points at (when exactly one matches)
	useEffect(() => {
		if (everIdSession && everIdSession.preselectIndex >= 0 && everIdSession.preselectIndex < workspaces.length) {
			setSelectedWorkspace(everIdSession.preselectIndex);
		}
	}, [everIdSession, workspaces, setSelectedWorkspace]);

	// Ever ID: an expired workspace token starts its sign-in again; a workspace without a tenant yet is set up
	const everIdChoice = useEverIdWorkspaceChoice(everIdSession);

	const signInToWorkspace = (e: any) => {
		e.preventDefault();
		if (everIdChoice.continueChoice(selectedWorkspace, workspaces[selectedWorkspace]?.token, updateOAuthSession)) {
			return;
		}
		updateOAuthSession();

		new Array(3).fill('').forEach((_, i) => {
			Cookies.remove(`authjs.session-token.${i}`);
		});
		window && window?.localStorage.removeItem(USER_SAW_OUTSTANDING_NOTIFICATION);
		window && window?.localStorage.setItem(LAST_WORKSPACE_AND_TEAM, selectedTeam);
	};

	const { onWorkspaceSigninError } = everIdChoice;
	const updateOAuthSession = useCallback(() => {
		form.updateOAuthSession(
			signinResult,
			workspaces,
			selectedWorkspace,
			selectedTeam,
			undefined,
			onWorkspaceSigninError
		);
	}, [form, onWorkspaceSigninError, selectedTeam, selectedWorkspace, signinResult, workspaces]);

	return (
		<WorkSpaceComponent
			workspaces={workspaces}
			onSubmit={signInToWorkspace}
			onBackButtonClick={() => {
				router.back();
			}}
			selectedWorkspace={selectedWorkspace}
			setSelectedWorkspace={setSelectedWorkspace}
			setSelectedTeam={setSelectedTeam}
			selectedTeam={selectedTeam}
			signInWorkspaceLoading={form.signInWorkspaceLoading || everIdChoice.setupRunning}
			teamsUnavailable={everIdSession?.teamsUnavailable}
			notSetUpIndices={everIdSession?.tenantless}
		/>
	);
}
