import { useQuery } from '@app/hooks/useQuery';
import { getAuthenticatedUserDataAPI } from '@app/services/client/api';
import { userState } from '@app/stores';
import { BackdropLoader } from 'lib/components';
import { useTranslation } from 'lib/i18n';
import { GetServerSidePropsContext, NextPage, PreviewData } from 'next';
import { ParsedUrlQuery } from 'querystring';
import { useEffect } from 'react';
import { useRecoilState } from 'recoil';

export function withAuthentication(
	Component: NextPage<any, any>,
	{ displayName }: { displayName: string; pageTitle?: string }
) {
	const AppComponent = (props: any) => {
		const { trans } = useTranslation();
		const [user, setUser] = useRecoilState(userState);
		const { queryCall, loading } = useQuery(getAuthenticatedUserDataAPI);

		useEffect(() => {
			if (!user) {
				queryCall().then((res) => {
					setUser(res.data.user);
				});
			}
		}, [queryCall, setUser, user]);

		return (
			<>
				<Component {...props} />
				<BackdropLoader
					canCreatePortal={false}
					title={trans.common.LOADING}
					fadeIn={false}
					show={!user || loading}
				/>
			</>
		);
	};
	AppComponent.displayName = displayName;

	return AppComponent;
}

export function getAuthenticationProps(
	context: GetServerSidePropsContext<ParsedUrlQuery, PreviewData>
) {
	let user = null;
	try {
		user = JSON.parse(context.res.getHeader('x-user') as string);
	} catch (_) {
		//
	}
	return { user };
}
