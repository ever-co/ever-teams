'use client';

import { clsxm } from '@/core/lib/utils';
import { AuthLayout } from '@/core/components/layouts/default-layout';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { WorkSpaceComponent } from '../passcode/page-component';
import { useAuthenticationSocialLogin } from '@/core/hooks/auth/use-authentication-social-login';
import Cookies from 'js-cookie';
import { useSession } from 'next-auth/react';
import {
	APP_NAME,
	LAST_WORKSPACE_AND_TEAM,
	USER_SAW_OUTSTANDING_NOTIFICATION
} from '@/core/constants/config/constants';
import { ISigninEmailConfirmWorkspaces } from '@/core/types/interfaces/auth/auth';
import { getFirstTeamId, findWorkspaceIndexByTeamId } from '@/core/lib/utils/workspace.utils';
import { useWorkspaceAnalysis } from '@/core/hooks/auth/use-workspace-analysis';

export default function SocialLoginChooseWorspace() {
	const t = useTranslations();
	return (
		<AuthLayout
			title={t('pages.authLogin.HEADING_TITLE', { appName: APP_NAME })}
			description={'Choose your workspace'}
		>
			<div className="overflow-x-hidden w-full overflow-clip">
				<div className={clsxm('flex flex-row duration-500 transition-[transform]')}>
					<WorkSpaceScreen />
				</div>
			</div>
		</AuthLayout>
	);
}

function WorkSpaceScreen() {
	const [selectedWorkspace, setSelectedWorkspace] = useState<number>(0);
	const [selectedTeam, setSelectedTeam] = useState('');
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

	const [workspaces, setWorkspaces] = useState<ISigninEmailConfirmWorkspaces[]>([]);

	useEffect(() => {
		const loadOAuthSession = async () => {
			if (session) {
				const { access_token, confirmed_mail, organizationId, refresh_token, tenantId, userId } = session.user;
				setSigninResult({ access_token, confirmed_mail, organizationId, refresh_token, tenantId, userId });
				setWorkspaces(session.user.workspaces);
			} else {
				return;
			}
		};
		loadOAuthSession();
	}, [session]);

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
	}, [workspaces, workspaceAnalysis]);

	const signInToWorkspace = (e: any) => {
		e.preventDefault();
		updateOAuthSession();

		new Array(3).fill('').forEach((_, i) => {
			Cookies.remove(`authjs.session-token.${i}`);
		});
		window && window?.localStorage.removeItem(USER_SAW_OUTSTANDING_NOTIFICATION);
		window && window?.localStorage.setItem(LAST_WORKSPACE_AND_TEAM, selectedTeam);
	};

	const updateOAuthSession = useCallback(() => {
		form.updateOAuthSession(signinResult, workspaces, selectedWorkspace, selectedTeam);
	}, [form, selectedTeam, selectedWorkspace, signinResult, workspaces]);

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
			signInWorkspaceLoading={form.signInWorkspaceLoading}
		/>
	);
}
