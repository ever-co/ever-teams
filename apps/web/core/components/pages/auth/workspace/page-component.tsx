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
import { LAST_WORKSPACE_AND_TEAM, USER_SAW_OUTSTANDING_NOTIFICATION } from '@/core/constants/config/constants';
import { ISigninEmailConfirmWorkspaces } from '@/core/types/interfaces/auth/auth';

export default function SocialLoginChooseWorspace() {
	const t = useTranslations();
	return (
		<AuthLayout title={t('pages.authLogin.HEADING_TITLE')} description={'Choose your workspace'}>
			<div className="w-full overflow-x-hidden overflow-clip">
				<div className={clsxm('flex flex-row transition-[transform] duration-500')}>
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

	useEffect(() => {
		if (workspaces.length === 1) {
			setSelectedWorkspace(0);
		}

		const currentTeams = workspaces[0]?.current_teams;

		if (workspaces.length === 1 && currentTeams?.length === 1) {
			setSelectedTeam(currentTeams[0].team_id);
		} else {
			const lastSelectedTeam = window.localStorage.getItem(LAST_WORKSPACE_AND_TEAM) || currentTeams[0].team_id;
			const lastSelectedWorkspace =
				workspaces.findIndex((workspace) =>
					workspace.current_teams.find((team) => team.team_id === lastSelectedTeam)
				) || 0;
			setSelectedTeam(lastSelectedTeam);
			setSelectedWorkspace(lastSelectedWorkspace);
		}

		if (workspaces.length === 1 && (currentTeams?.length || 0) <= 1) {
			setTimeout(() => {
				document.getElementById('continue-to-workspace')?.click();
			}, 100);
		}
	}, [workspaces]);

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
