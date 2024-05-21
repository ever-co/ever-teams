'use client';

import { getAccessTokenCookie } from '@app/helpers';
import { clsxm } from '@app/utils';
import { AuthLayout } from 'lib/layout';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { WorkSpaceComponent } from '../passcode/component';
import { useAuthenticationSocialLogin } from '@app/hooks/auth/useAuthenticationSocialLogin';
import { getSession } from 'next-auth/react';
import { ISigninEmailConfirmWorkspaces } from '@app/interfaces';

export default function SocialLoginChooseWorspace() {
	const t = useTranslations();
	return (
		<AuthLayout title={t('pages.authLogin.HEADING_TITLE')} description={'Choose your workspace'}>
			<div className="w-[98%] md:w-[550px] overflow-x-hidden">
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

	const [oAuthSession, setOAuthSession] = useState();
	const [workspaces, setWorkspaces] = useState<ISigninEmailConfirmWorkspaces[]>([]);
	const [email, setEmail] = useState('');

	const loadOAuthSession = async () => {
		const session: any = await getSession();
		if (session) {
			// const {
			// 	// access_token,
			// 	// languageId,
			// 	// noTeamPopup,
			// 	// organizationId,
			// 	// refresh_token,
			// 	// teamId,
			// 	// tenantId,
			// 	// userId,
			// 	// workspaces: sessionWorkspaces
			// } = session.user;
			setOAuthSession(session.user);
			setWorkspaces(session.user.workspaces);
			setEmail(session.user.confirmed_mail);
		} else {
			return;
		}
	};

	useEffect(() => {
		loadOAuthSession();
	}, []);

	const signInToWorkspace = useCallback(
		(e: any) => {
			if (typeof selectedWorkspace !== 'undefined') {
				form.handleWorkspaceSubmit(e, workspaces[selectedWorkspace].token, selectedTeam, email);
			}
		},
		[selectedWorkspace, form, workspaces, selectedTeam, email]
	);

	useEffect(() => {
		if (workspaces.length === 1) {
			setSelectedWorkspace(0);
		}

		const currentTeams = workspaces[0]?.current_teams;

		if (workspaces.length === 1 && currentTeams?.length === 1) {
			setSelectedTeam(currentTeams[0].team_id);
		}

		if (workspaces.length === 1 && (currentTeams?.length || 0) <= 1) {
			setTimeout(() => {
				document.getElementById('continue-to-workspace')?.click();
			}, 10000);
		}
	}, [workspaces]);

	useEffect(() => {
		const accessToken = getAccessTokenCookie();
		if (accessToken && accessToken.length > 100) {
			router.refresh();
		}
	}, [router]);

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
