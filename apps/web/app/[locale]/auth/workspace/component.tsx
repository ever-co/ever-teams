'use client';

import { getAccessTokenCookie, setAuthCookies } from '@app/helpers';
import { clsxm } from '@app/utils';
import { AuthLayout } from 'lib/layout';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { WorkSpaceComponent } from '../passcode/component';
import { useAuthenticationSocialLogin } from '@app/hooks/auth/useAuthenticationSocialLogin';
import { ISigninEmailConfirmWorkspaces } from '@app/interfaces';
import Cookies from 'js-cookie';
import { getUserOrganizationsRequest, signInWorkspaceAPI } from '@app/services/client/api/auth/invite-accept';
import { auth } from '../../../../auth';
import { getSession } from 'next-auth/react';

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
	// const [organizations, setOrganizations] = useState<PaginationResponse<IUserOrganization>>();

	const [workspaces, setWorkspaces] = useState<ISigninEmailConfirmWorkspaces[]>([]);

	useEffect(() => {
		const loadOAuthSession = async () => {
			const session: any = await getSession();
			if (session) {
				const { access_token, confirmed_mail, organizationId, refresh_token, tenantId, userId } = session.user;
				setSigninResult({ access_token, confirmed_mail, organizationId, refresh_token, tenantId, userId });
				setWorkspaces(session.user.workspaces);
			} else {
				return;
			}
		};
		loadOAuthSession();
	}, []);

	const signInToWorkspace = (e: any) => {
		e.preventDefault();
		updateOAuthSession();
		setAuthCookies({
			access_token: signinResult.access_token,
			refresh_token: signinResult.refresh_token,
			teamId: selectedTeam,
			tenantId: signinResult.tenantId,
			organizationId: signinResult.organizationId,
			languageId: 'en',
			noTeamPopup: undefined,
			userId: signinResult.userId
		});
		router.push('/');
		new Array(3).fill('').forEach((_, i) => {
			Cookies.remove(`authjs.session-token.${i}`);
		});
	};

	const updateOAuthSession = () => {
		signInWorkspaceAPI(signinResult.confirmed_mail, workspaces[selectedWorkspace].token).then(async (result) => {
			const session: any = await auth();
			const tenantId = result.user?.tenantId || '';
			const access_token = result.token;
			const userId = result.user?.id;

			const organizations = await getUserOrganizationsRequest({
				tenantId,
				userId,
				token: access_token
			});
			const organization = organizations?.data.items[0];
			if (!organization) {
				return Promise.reject({
					errors: {
						email: 'Your account is not yet ready to be used on the Ever Teams Platform'
					}
				});
			}
			if (session) {
				session.user = {
					access_token,
					refresh_token: {
						token: result.refresh_token
					},
					teamId: selectedTeam,
					tenantId,
					organizationId: organization?.organizationId,
					languageId: 'en',
					noTeamPopup: true,

					userId,
					workspaces: workspaces,
					confirmed_mail: signinResult.confirmed_mail
				};
			}
		});
	};

	useEffect(() => {
		if (workspaces.length === 1) {
			setSelectedWorkspace(0);
		}

		const currentTeams = workspaces[0]?.current_teams;

		if (workspaces.length === 1 && currentTeams?.length === 1) {
			setSelectedTeam(currentTeams[0].team_id);
		}

		if (workspaces.length === 1 && currentTeams?.length === 1) {
			setTimeout(() => {
				document.getElementById('continue-to-workspace')?.click();
				router.push('/');
			}, 100);
		}
	}, [router, workspaces]);

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
