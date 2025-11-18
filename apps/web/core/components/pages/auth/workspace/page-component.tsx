'use client';

import { clsxm } from '@/core/lib/utils';
import { AuthLayout } from '@/core/components/layouts/default-layout';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { hasTeams, getFirstTeamId, findWorkspaceIndexByTeamId } from '@/core/lib/utils/workspace.utils';

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

	// Memoize workspace analysis to avoid recalculations
	const workspaceAnalysis = useMemo(() => {
		const firstWorkspace = workspaces[0];
		const firstWorkspaceHasTeams = hasTeams(firstWorkspace);
		const firstWorkspaceTeamCount = firstWorkspaceHasTeams ? firstWorkspace.current_teams.length : 0;

		// Only auto-submit if user has exactly 1 workspace with exactly 1 team
		// Do NOT auto-submit if current_teams is empty (user has no teams)
		const shouldAutoSubmit =
			workspaces.length === 1 &&
			firstWorkspaceTeamCount === 1;

		return {
			firstWorkspace,
			firstWorkspaceHasTeams,
			firstWorkspaceTeamCount,
			shouldAutoSubmit
		};
	}, [workspaces]);

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
			const workspaceIndex = lastSelectedWorkspaceIndex >= 0 ? lastSelectedWorkspaceIndex : 0;

			setSelectedTeam(lastSelectedTeam);
			setSelectedWorkspace(workspaceIndex);
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
