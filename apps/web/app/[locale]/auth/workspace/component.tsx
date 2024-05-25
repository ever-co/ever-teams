'use client';

import { clsxm } from '@app/utils';
import { AuthLayout } from 'lib/layout';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { WorkSpaceComponent } from '../passcode/component';
import { useAuthenticationSocialLogin } from '@app/hooks/auth/useAuthenticationSocialLogin';
import { ISigninEmailConfirmWorkspaces } from '@app/interfaces';
import Cookies from 'js-cookie';
import { useSession } from 'next-auth/react';

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

	const signInToWorkspace = (e: any) => {
		e.preventDefault();
		updateOAuthSession();

		new Array(3).fill('').forEach((_, i) => {
			Cookies.remove(`authjs.session-token.${i}`);
		});
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
